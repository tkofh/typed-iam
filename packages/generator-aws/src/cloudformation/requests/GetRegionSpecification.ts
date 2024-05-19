import { Effect, Request, RequestResolver } from 'effect'
import { HttpService } from '../../services/http'
import { parseJson } from '../../shared/json'
import { FetchSpecificationError } from '../models/FetchSpecificationError'
import type { RegionSpecificationEndpoint } from '../models/RegionSpecificationEndpoint'
import { Specification } from '../models/Specification'

export class GetRegionSpecification extends Request.TaggedClass(
  'GetRegionSpecification',
)<
  Specification,
  FetchSpecificationError,
  { region: string; endpoint: string }
> {
  static resolver = RequestResolver.fromEffect(
    (request: GetRegionSpecification) =>
      Effect.gen(function* () {
        const http = yield* HttpService

        yield* Effect.logDebug(`Fetching ${request.region} specification`)

        const text = yield* http.fetch(request.endpoint)
        yield* Effect.logDebug(`${request.region} specification fetched`)

        const json = yield* parseJson(text)
        const specification = yield* Specification.decodeUnknown(json)

        yield* Effect.log(`${request.region} specification decoded`)

        return specification
      }).pipe(
        Effect.withLogSpan(`GetRegionSpecification/${request.region}`),
        FetchSpecificationError.catchAll(
          (error) => `Failed to fetch region specification: ${error.message}`,
        ),
      ),
  ).pipe(RequestResolver.contextFromServices(HttpService))

  static make(
    input: RegionSpecificationEndpoint,
  ): Effect.Effect<Specification, FetchSpecificationError, HttpService> {
    return Effect.request(
      new GetRegionSpecification(input),
      GetRegionSpecification.resolver,
    )
  }
}
