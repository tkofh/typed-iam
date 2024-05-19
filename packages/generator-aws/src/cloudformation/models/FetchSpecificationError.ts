import { Data, Effect } from 'effect'

export class FetchSpecificationError extends Data.TaggedError(
  'FetchSpecificationError',
)<{
  readonly message: string
}> {
  static fail(
    message: string,
  ): Effect.Effect<never, FetchSpecificationError, never> {
    return Effect.fail(new FetchSpecificationError({ message }))
  }

  static catchAll<E>(message: (error: E) => string) {
    return Effect.catchAll<E, never, FetchSpecificationError, never>((error) =>
      FetchSpecificationError.fail(message(error)),
    )
  }
}
