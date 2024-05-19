import { Data, Effect, Request, RequestResolver } from 'effect'
import { HttpService } from '../../services/http'
import { HtmlDocument, type HtmlElement, readTable } from '../../shared/html'
import { RegionalSpecificationData } from '../models/RegionalSpecificationData'

export class GetRegionalSpecificationDataError extends Data.TaggedError(
  'GetRegionalSpecificationDataError',
)<{
  readonly message: string
}> {
  static fail(
    message: string,
  ): Effect.Effect<never, GetRegionalSpecificationDataError, never> {
    return Effect.fail(new GetRegionalSpecificationDataError({ message }))
  }

  static catchAll<E>(message: (error: E) => string) {
    return Effect.catchAll<E, never, GetRegionalSpecificationDataError, never>(
      (error) => GetRegionalSpecificationDataError.fail(message(error)),
    )
  }
}

export class GetRegionalSpecificationData extends Request.TaggedClass(
  'GetRegionalSpecificationData',
)<
  ReadonlyArray<RegionalSpecificationData>,
  GetRegionalSpecificationDataError,
  Record<string, never>
> {
  static endpoint =
    'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-resource-specification.html'

  static resolver = RequestResolver.fromEffect(() =>
    Effect.gen(function* () {
      const http = yield* HttpService

      yield* Effect.logDebug('Fetching Regional Specification Index Page')

      const page = yield* http.fetch(GetRegionalSpecificationData.endpoint)

      yield* Effect.logDebug('Regional Specification Page Fetched')

      const document: HtmlDocument = yield* HtmlDocument.parse(page).pipe(
        GetRegionalSpecificationDataError.catchAll(
          (error) => `Unable to parse document: ${error.message}`,
        ),
      )

      const table: HtmlElement = yield* document.getChildByTagOrElse(
        'table',
        () =>
          GetRegionalSpecificationDataError.fail('No table found in document'),
      )

      const data: ReadonlyArray<RegionalSpecificationData> = yield* readTable(
        table,
        (row) => RegionalSpecificationData.fromTableRow(row),
      ).pipe(
        GetRegionalSpecificationDataError.catchAll((error) => error.message),
      )

      yield* Effect.log('Regional Specification Data Collected')

      return data
    }).pipe(Effect.withLogSpan('CloudFormation/GetAllSpecifications')),
  ).pipe(RequestResolver.contextFromServices(HttpService))

  static make(): Effect.Effect<
    ReadonlyArray<RegionalSpecificationData>,
    GetRegionalSpecificationDataError,
    HttpService
  > {
    return Effect.request(
      new GetRegionalSpecificationData({}),
      GetRegionalSpecificationData.resolver,
    )
  }
}
