import { Array, Data, Effect, Option, Queue, Ref } from 'effect'
import { type Matrix, transpose } from '../matrix'
import { dequeueOrElse, takeAllToNonEmptyArrayOrElse } from '../queue'
import type { HtmlElement } from './element'

type HtmlElementEnqueue = Queue.Enqueue<HtmlElement>
type HtmlElementQueue = Queue.Queue<HtmlElement>

export class TableReadError extends Data.TaggedError('TableReadError')<{
  readonly message: string
}> {
  static createFailure(
    message: string,
  ): Effect.Effect<never, TableReadError, never> {
    return Effect.fail(new TableReadError({ message }))
  }
}

const CELL_TAGS = ['th', 'td'] as const

function countColumns(table: HtmlElement): Effect.Effect<number> {
  return table
    .getChildrenByTag('tr')
    .pipe(
      Effect.flatMap((rows) =>
        Effect.all(
          Array.map(rows, (row) =>
            row.getChildrenByTag(CELL_TAGS).pipe(Effect.map(Array.length)),
          ),
        ).pipe(Effect.map((counts) => Math.max(...counts))),
      ),
    )
}

function createRowCellQueue(
  row: HtmlElement,
  size: number,
): Effect.Effect<HtmlElementQueue> {
  return Effect.gen(function* () {
    const cells = yield* row.getChildrenByTag(CELL_TAGS)
    const queue = yield* Queue.dropping<HtmlElement>(size)

    for (const cell of cells) {
      yield* Queue.offer(queue, cell).pipe(
        Effect.repeatN(
          Math.max(
            0,
            Option.getOrElse(cell.getNumericAttribute('colspan'), () => 1) - 1,
          ),
        ),
      )
    }
    return queue
  })
}

function takeRowCell(
  row: HtmlElementQueue,
): Effect.Effect<HtmlElement, TableReadError> {
  return dequeueOrElse(row, () =>
    TableReadError.createFailure('Row has fewer cells than needed'),
  )
}

function takeUniqueRowCell(
  row: HtmlElementQueue,
  current: HtmlElement,
): Effect.Effect<HtmlElement, TableReadError> {
  return Effect.gen(function* () {
    let cell = yield* takeRowCell(row)

    while (cell === current) {
      cell = yield* takeRowCell(row)
    }

    return cell
  })
}

function applyRowToColumns(
  row: HtmlElementQueue,
  threshold: number,
  columns: ReadonlyArray<HtmlElementEnqueue>,
): Effect.Effect<void, TableReadError, never> {
  return Effect.gen(function* () {
    const current: Ref.Ref<HtmlElement> = yield* Ref.make(
      yield* takeRowCell(row),
    )

    for (const [index, column] of columns.entries()) {
      const sizeDifference = (yield* Queue.size(column)) - threshold

      const shouldAdvance = index < columns.length - 1

      if (sizeDifference === 0) {
        const cell: HtmlElement = yield* Ref.get(current)
        const rowSpan = Math.max(
          0,
          Option.getOrElse(cell.getNumericAttribute('rowSpan'), () => 1),
        )
        yield* Queue.offer(column, cell).pipe(Effect.repeatN(rowSpan - 1))

        if (shouldAdvance) {
          yield* Ref.set(current, yield* takeRowCell(row))
        }
      } else if (shouldAdvance) {
        yield* Ref.set(
          current,
          yield* takeUniqueRowCell(row, yield* Ref.get(current)),
        )
      }
    }
  })
}

function createColumnCellQueues(
  parent: HtmlElement,
  size: number,
): Effect.Effect<
  Array.NonEmptyReadonlyArray<HtmlElementQueue>,
  TableReadError,
  never
> {
  return Effect.gen(function* () {
    const rows: ReadonlyArray<HtmlElementQueue> = yield* Effect.all(
      Array.map(
        yield* parent.getSomeChildrenByTagOrElse('tr', () =>
          TableReadError.createFailure(`No rows inside ${parent.tag}`),
        ),
        (row) => createRowCellQueue(row, size),
      ),
    )

    const columns: Array.NonEmptyReadonlyArray<Queue.Queue<HtmlElement>> =
      yield* Effect.all(
        Array.makeBy(size, () => Queue.dropping<HtmlElement>(rows.length)),
      )

    yield* Effect.all(
      Array.map(rows, (row, y) => applyRowToColumns(row, y, columns)),
    )

    return columns
  })
}

function createCellMatrix(
  parent: HtmlElement,
  size: number,
  major: 'row' | 'column',
): Effect.Effect<Matrix<HtmlElement>, TableReadError> {
  const output = createColumnCellQueues(parent, size).pipe(
    Effect.flatMap(
      (queues) =>
        Effect.all(
          Array.map(queues, (queue, index) =>
            takeAllToNonEmptyArrayOrElse(queue, () =>
              TableReadError.createFailure(
                `Table ${parent.tag} has no cells in column ${index}`,
              ),
            ),
          ),
        ) as Effect.Effect<Matrix<HtmlElement>, TableReadError>,
    ),
  )

  if (major === 'column') {
    return output
  }

  return output.pipe(
    Effect.flatMap((matrix: Matrix<HtmlElement>) =>
      Effect.orDie(transpose(matrix)),
    ),
  )
}

export class TableColumnElements extends Data.TaggedClass(
  'TableColumnElements',
)<{
  readonly headings: Array.NonEmptyReadonlyArray<HtmlElement>
  readonly cell: HtmlElement
}> {
  headingsInclude(text: string): boolean {
    return Array.some(this.headings, (heading) => heading.text === text)
  }
}

export class TableRow extends Data.TaggedClass('TableRow')<{
  readonly columns: Array.NonEmptyReadonlyArray<TableColumnElements>
}> {
  findColumn(
    predicate: (column: TableColumnElements) => boolean,
  ): Effect.Effect<Option.Option<TableColumnElements>> {
    return Effect.succeed(Array.findFirst(this.columns, predicate))
  }

  findColumnOrElse<A, E, R>(
    predicate: (column: TableColumnElements) => boolean,
    orElse: () => Effect.Effect<A, E, R>,
  ): Effect.Effect<TableColumnElements | A, E, R> {
    return this.findColumn(predicate).pipe(
      Effect.flatMap(
        (column) =>
          Option.match(column, {
            onNone: orElse,
            onSome: (column) => Effect.succeed(column),
          }) as Effect.Effect<TableColumnElements | A, E, R>,
      ),
    )
  }
}

export type RowProcessor<A, E, R> = (
  row: TableRow,
  index: number,
) => Effect.Effect<A, E, R>

export function readTable<A, E, R>(
  table: HtmlElement,
  processRow: RowProcessor<A, E, R>,
): Effect.Effect<ReadonlyArray<A>, TableReadError | E, R> {
  return Effect.gen(function* () {
    const size = yield* countColumns(table)

    if (size === 0) {
      return yield* Effect.fail(
        new TableReadError({ message: 'no columns in table' }),
      )
    }

    const columnsMatrix: Matrix<HtmlElement> = yield* createCellMatrix(
      yield* table.getChildByTagOrElse(
        'thead',
        () => new TableReadError({ message: 'Table must have a thead' }),
      ),
      size,
      'column',
    )

    const rowsMatrix: Matrix<HtmlElement> = yield* createCellMatrix(
      yield* table.getChildByTagOrElse(
        'tbody',
        () => new TableReadError({ message: 'Table must have a tbody' }),
      ),
      size,
      'row',
    )

    const rows: ReadonlyArray<TableRow> = Array.map(
      rowsMatrix,
      (row) =>
        new TableRow({
          columns: Array.map(
            Array.zip(columnsMatrix, row),
            ([headings, cell]) => new TableColumnElements({ headings, cell }),
          ),
        }),
    )

    const data: ReadonlyArray<A> = yield* Effect.all(
      Array.map(rows, (row, index) => processRow(row, index)),
    )

    return data
  })
}
