import { Data, Effect, Option } from 'effect'
import type { HtmlElement } from '../../shared/html'
import type { TableRow } from '../../shared/html/table'

export class RegionalSpecificationParseError extends Data.TaggedError(
  'RegionalSpecificationParseError',
)<{
  readonly message: string
}> {
  static fail(
    message: string,
  ): Effect.Effect<never, RegionalSpecificationParseError, never> {
    return Effect.fail(new RegionalSpecificationParseError({ message }))
  }
}

export class RegionalSpecificationData extends Data.TaggedClass(
  'RegionalSpecificationData',
)<{
  readonly region: string
  readonly url: string
}> {
  static fromTableRow(
    row: TableRow,
  ): Effect.Effect<RegionalSpecificationData, RegionalSpecificationParseError> {
    return Effect.gen(function* () {
      const regionName: HtmlElement = yield* row
        .findColumnOrElse(
          (column) => column.headingsInclude('Region'),
          () => RegionalSpecificationParseError.fail('No region column'),
        )
        .pipe(Effect.map((column) => column.cell))

      const specificationAnchor: HtmlElement = yield* row
        .findColumnOrElse(
          (column) => column.headingsInclude('Single file'),
          () => RegionalSpecificationParseError.fail('No specification column'),
        )
        .pipe(
          Effect.flatMap((column) =>
            column.cell.getChildByTagOrElse('a', () =>
              RegionalSpecificationParseError.fail(
                'No anchor in specification url column',
              ),
            ),
          ),
        )

      const specificationHref = specificationAnchor.getAttribute('href')
      if (Option.isNone(specificationHref)) {
        return yield* RegionalSpecificationParseError.fail(
          'No href in specification url column',
        )
      }

      return new RegionalSpecificationData({
        region: regionName.text,
        url: specificationHref.value,
      })
    })
  }
}
