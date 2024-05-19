import { Effect, Request, RequestResolver } from 'effect'
import { HttpService } from '../../services/http'
import { HtmlDocument, type HtmlElement, readTable } from '../../shared/html'
import { FetchSpecificationError } from '../models/FetchSpecificationError'
import { RegionSpecificationEndpoint } from '../models/RegionSpecificationEndpoint'

export class GetRegionalSpecificationEndpoints extends Request.TaggedClass(
  'GetRegionalSpecificationEndpoints',
)<
  ReadonlyArray<RegionSpecificationEndpoint>,
  FetchSpecificationError,
  Record<string, never>
> {
  static endpoint =
    'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-resource-specification.html'

  static resolver = RequestResolver.fromEffect(() =>
    Effect.gen(function* () {
      const http = yield* HttpService

      yield* Effect.logDebug('Fetching Regional Specification Index Page')

      const page = yield* http.fetch(GetRegionalSpecificationEndpoints.endpoint)

      yield* Effect.logDebug('Regional Specification Page Fetched')

      const document: HtmlDocument = yield* HtmlDocument.parse(page).pipe(
        FetchSpecificationError.catchAll(
          (error) =>
            `Cannot parse Region Specifications HTML document: ${error.message}`,
        ),
      )

      const table: HtmlElement = yield* document.getChildByTagOrElse(
        'table',
        () =>
          FetchSpecificationError.fail(
            'No table found in Region Specifications HTML document',
          ),
      )

      const data: ReadonlyArray<RegionSpecificationEndpoint> = yield* readTable(
        table,
        (row) => RegionSpecificationEndpoint.fromTableRow(row),
      ).pipe(FetchSpecificationError.catchAll((error) => error.message))

      yield* Effect.log('Regional Specification Data Collected')

      return data
    }).pipe(Effect.withLogSpan('GetAllSpecifications')),
  ).pipe(RequestResolver.contextFromServices(HttpService))

  static make(): Effect.Effect<
    ReadonlyArray<RegionSpecificationEndpoint>,
    FetchSpecificationError,
    HttpService
  > {
    return Effect.request(
      new GetRegionalSpecificationEndpoints({}),
      GetRegionalSpecificationEndpoints.resolver,
    )
  }
}
