import { Effect, Queue, Ref } from 'effect'
import type { HttpService } from '../services/http'
import type { FetchSpecificationError } from './models/FetchSpecificationError'
import { Specification } from './models/Specification'
import { GetRegionSpecification } from './requests/GetRegionSpecification'
import { GetRegionalSpecificationEndpoints } from './requests/GetRegionalSpecificationEndpoints'

type MergeQueueItem = {
  specification: Specification
  region: string
}

export const GetGlobalSpecification: Effect.Effect<
  Specification,
  FetchSpecificationError,
  HttpService
> = Effect.scoped(
  Effect.gen(function* () {
    const endpoints = yield* GetRegionalSpecificationEndpoints.make()

    const mergeQueue = yield* Queue.unbounded<MergeQueueItem>()
    const merged = yield* Ref.make(Specification.empty)

    yield* Effect.fork(
      Effect.forever(
        Effect.gen(function* () {
          const current = yield* Ref.get(merged)
          const { specification: next, region } = yield* Queue.take(mergeQueue)
          yield* Ref.set(merged, Specification.merge(current, next))
          yield* Effect.log(`Merged ${region}`)
        }),
      ),
    )

    yield* Effect.forEach(
      endpoints,
      (endpoint) =>
        GetRegionSpecification.make(endpoint).pipe(
          Effect.andThen((specification) =>
            Queue.offer(mergeQueue, { specification, region: endpoint.region }),
          ),
        ),
      { concurrency: 'unbounded' },
    )

    return yield* Ref.get(merged)
  }).pipe(Effect.withLogSpan('CloudFormation')),
)
