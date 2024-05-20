import { Effect, Queue } from 'effect'
import type { HttpService } from '../services/http'
import type { FetchSpecificationError } from './models/FetchSpecificationError'
import type { Specification } from './models/Specification'
import { GetRegionSpecification } from './requests/GetRegionSpecification'
import { GetRegionalSpecificationEndpoints } from './requests/GetRegionalSpecificationEndpoints'

type MergeQueueItem = {
  specification: Specification
  region: string
}

export function getUniqueProperties<A, E, R>(
  processProperty: (property: string) => Effect.Effect<A, E, R>,
): Effect.Effect<void, FetchSpecificationError | E, HttpService | R> {
  return Effect.scoped(
    Effect.gen(function* () {
      const endpoints = yield* GetRegionalSpecificationEndpoints.make()

      const properties = yield* Queue.unbounded<string>()
      yield* Effect.fork(
        Effect.forever(
          Effect.gen(function* () {
            const property = yield* Queue.take(properties)
            yield* processProperty(property)
          }),
        ),
      )

      const specifications = yield* Queue.unbounded<MergeQueueItem>()
      // const seen = new Set<string>()
      yield* Effect.fork(
        Effect.forever(
          Effect.gen(function* () {
            const { specification, region } = yield* Queue.take(specifications)

            console.log(Object.keys(specification.PropertyTypes).length)
            // yield* Effect.forEach(specification.getProperties(), (property) => {
            //   if (!seen.has(property)) {
            //     seen.add(property)
            //     return Queue.offer(properties, property).pipe(
            //       Effect.as(Effect.void),
            //     )
            //   }
            //   return Effect.void
            // })
            yield* Effect.log(`Processed ${region}`)
          }),
        ),
      )

      yield* Effect.forEach(
        endpoints,
        (endpoint) =>
          GetRegionSpecification.make(endpoint).pipe(
            Effect.andThen((specification) =>
              Queue.offer(specifications, {
                specification,
                region: endpoint.region,
              }),
            ),
          ),
        { concurrency: 'unbounded' },
      )
    }).pipe(Effect.withLogSpan('CloudFormation')),
  )
}

export const LogUniqueProperties = getUniqueProperties((property) => {
  return Effect.log(property)
})
