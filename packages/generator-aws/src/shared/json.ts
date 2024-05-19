import { Data, Effect } from 'effect'
import { dual } from 'effect/Function'

export class JsonParseError extends Data.TaggedError('JsonParseError')<{
  message: string
}> {}

export const parseJson: {
  (json: string): Effect.Effect<object, JsonParseError>
  (): (json: string) => Effect.Effect<object, JsonParseError>
} = dual(
  (args) => args.length === 1,
  (json: string) => {
    return Effect.try({
      try: () => JSON.parse(json),
      catch: () =>
        Effect.fail(new JsonParseError({ message: 'Failed to parse ' })),
    })
  },
)
