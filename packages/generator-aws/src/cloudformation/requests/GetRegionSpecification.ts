import { Data, Effect, Request, RequestResolver } from 'effect'
import { HttpService } from '../../services/http'
import { parseJson } from '../../shared/json'
import type { RegionalSpecificationData } from '../models/RegionalSpecificationData'
import { Specification } from '../models/Specification'

export class GetRegionSpecificationError extends Data.TaggedError(
  'GetRegionSpecificationError',
)<{
  readonly message: string
}> {
  static fail(
    message: string,
  ): Effect.Effect<never, GetRegionSpecificationError, never> {
    return Effect.fail(new GetRegionSpecificationError({ message }))
  }

  static catchAll<E>(message: (error: E) => string) {
    return Effect.catchAll<E, never, GetRegionSpecificationError, never>(
      (error) => GetRegionSpecificationError.fail(message(error)),
    )
  }
}

export class GetRegionSpecification extends Request.TaggedClass(
  'GetRegionSpecification',
)<Specification, GetRegionSpecificationError, { region: string; url: string }> {
  static resolver = RequestResolver.fromEffect(
    (request: GetRegionSpecification) =>
      Effect.gen(function* () {
        const http = yield* HttpService

        yield* Effect.logDebug(`Fetching specification for ${request.region}`)

        const text = yield* http.fetch(request.url)
        yield* Effect.logDebug(`Specification for ${request.region} fetched`)

        const json = yield* parseJson(text)
        const specification = yield* Specification.decodeUnknown(json)

        yield* Effect.log(`Specification for \`${request.region}\` parsed`)

        return specification
      }).pipe(
        Effect.withLogSpan(
          `CloudFormation/GetRegionSpecification/${request.region}`,
        ),
        GetRegionSpecificationError.catchAll(
          (error) => `Failed to fetch specification: ${error.message}`,
        ),
      ),
  ).pipe(RequestResolver.contextFromServices(HttpService))

  static make(
    input: RegionalSpecificationData,
  ): Effect.Effect<Specification, GetRegionSpecificationError, HttpService> {
    return Effect.request(
      new GetRegionSpecification(input),
      GetRegionSpecification.resolver,
    )
  }
}
