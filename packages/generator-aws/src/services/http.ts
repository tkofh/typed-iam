import { client, request, response } from '@effect/platform/HttpClient'
import { Context, Data, Effect, Layer, Schedule } from 'effect'

export class FetchError extends Data.TaggedError('FetchError')<{
  readonly message: string
}> {}

export class HttpService extends Context.Tag('Http')<
  HttpService,
  {
    readonly fetch: (
      url: string,
    ) => Effect.Effect<string, FetchError, HttpService>
  }
>() {
  static LIVE = Layer.effect(
    this,
    Effect.succeed({
      fetch: (url: string) =>
        response.text(client.fetchOk(request.get(url))).pipe(
          Effect.timeout('10 seconds'),
          Effect.retry(
            Schedule.exponential(1000).pipe(
              Schedule.jittered,
              Schedule.compose(Schedule.recurs(3)),
            ),
          ),
          Effect.catchAll((e) =>
            Effect.fail(new FetchError({ message: e.message })),
          ),
        ),
    }),
  )

  // static CACHE = Layer.effect(
  //   this,
  //   Effect.succeed({
  //     fetch: (url: string) =>
  //       FileSystem.pipe(
  //         Effect.flatMap((fs) =>
  //           fs.readFileString(
  //             join(
  //               dirname(withoutProtocol(import.meta.url)),
  //               './cache',
  //               withoutProtocol(url),
  //             ),
  //           ),
  //         ),
  //         Effect.catchAll((e) => new FetchError({ message: e.message })),
  //       ).pipe(Effect.provide(NodeFileSystem.layer)),
  //   }),
  // )
}
