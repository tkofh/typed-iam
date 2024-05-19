import { Data, Effect, Option } from 'effect'
import type { TableRow } from '../../shared/html/table'
import { FetchSpecificationError } from './FetchSpecificationError'

function getRegionName(
  row: TableRow,
): Effect.Effect<string, FetchSpecificationError> {
  return row
    .findColumnOrElse(
      (column) => column.headingsInclude('Region'),
      () =>
        FetchSpecificationError.fail(
          'Cannot parse Regional Specifications table: no region column',
        ),
    )
    .pipe(Effect.map((column) => column.cell.text))
}

function getEndpoint(
  row: TableRow,
): Effect.Effect<string, FetchSpecificationError> {
  return row
    .findColumnOrElse(
      (column) => column.headingsInclude('Single file'),
      () =>
        FetchSpecificationError.fail(
          'Cannot parse Regional Specifications table: no specification url column',
        ),
    )
    .pipe(
      Effect.flatMap((column) =>
        column.cell.getChildByTagOrElse('a', () =>
          FetchSpecificationError.fail(
            'Cannot parse Regional Specifications table: no anchor in specification url column',
          ),
        ),
      ),
      Effect.flatMap((anchor) =>
        Option.match(anchor.getAttribute('href'), {
          onNone: () =>
            FetchSpecificationError.fail(
              'Cannot parse Regional Specifications table: no href attribute on the specification url anchor',
            ),
          onSome: Effect.succeed,
        }),
      ),
    )
}

export class RegionSpecificationEndpoint extends Data.TaggedClass(
  'RegionSpecificationEndpoint',
)<{
  readonly region: string
  readonly endpoint: string
}> {
  static fromTableRow(
    row: TableRow,
  ): Effect.Effect<RegionSpecificationEndpoint, FetchSpecificationError> {
    return Effect.all([getRegionName(row), getEndpoint(row)]).pipe(
      Effect.flatMap(([region, endpoint]) =>
        Effect.succeed(new RegionSpecificationEndpoint({ region, endpoint })),
      ),
    )
  }
}
