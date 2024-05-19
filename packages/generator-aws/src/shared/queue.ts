import { Array, Effect, Option, Queue, SynchronizedRef } from 'effect'
import { dual } from 'effect/Function'

export function dequeueOrElse<A1, A, E, R>(
  queue: Queue.Dequeue<A1>,
  orElse: () => Effect.Effect<A, E, R>,
): Effect.Effect<A1 | A, E, R> {
  return Queue.poll(queue).pipe(
    Effect.flatMap(
      (option): Effect.Effect<A1 | A, E, R> =>
        Option.match(option, {
          onNone: orElse,
          onSome: (a) => Effect.succeed(a),
        }),
    ),
  )
}

export function takeAllToNonEmptyArrayOrElse<A1, A, E, R>(
  queue: Queue.Dequeue<A1>,
  orElse: () => Effect.Effect<A, E, R>,
): Effect.Effect<Array.NonEmptyReadonlyArray<A1> | A, E, R> {
  return Queue.takeAll(queue).pipe(
    Effect.map((chunk) => Array.fromIterable(chunk)),
    Effect.flatMap(
      (array) =>
        (Array.isNonEmptyReadonlyArray(array)
          ? Effect.succeed(array)
          : orElse()) as Effect.Effect<
          Array.NonEmptyReadonlyArray<A1> | A,
          E,
          R
        >,
    ),
  )
}

export const iterateQueue: {
  <A, O, E, R>(
    queue: Queue.Dequeue<A>,
    f: (item: A, queue: Queue.Enqueue<A>) => Effect.Effect<O, E, R>,
  ): Effect.Effect<void, E, R>
  <A, O, E, R>(
    f: (item: A, queue: Queue.Enqueue<A>) => Effect.Effect<O, E, R>,
  ): (queue: Queue.Dequeue<A>) => Effect.Effect<void, E, R>
} = dual(
  (args) => Queue.isQueue(args[0]),
  <A, O, E, R>(
    queue: Queue.Dequeue<A>,
    f: (item: A, queue: Queue.Enqueue<A>) => Effect.Effect<O, E, R>,
  ): Effect.Effect<void, E, R> =>
    Effect.gen(function* () {
      let size = yield* Queue.size(queue)
      while (size > 0) {
        const item = yield* dequeueOrElse(queue, () => Effect.die('impossible'))

        yield* f(item, queue as unknown as Queue.Enqueue<A>)
        size = yield* Queue.size(queue)
      }
    }),
)
export const reduceQueue: {
  <A, O, E, R>(
    queue: Queue.Dequeue<A>,
    initial: O,
    reducer: (
      acc: O,
      item: A,
      queue: Queue.Enqueue<A>,
    ) => Effect.Effect<O, E, R>,
  ): Effect.Effect<O, E, R>
  <A, O, E, R>(
    initial: O,
    reducer: (
      acc: O,
      item: A,
      queue: Queue.Enqueue<A>,
    ) => Effect.Effect<O, E, R>,
  ): (queue: Queue.Dequeue<A>) => Effect.Effect<O, E, R>
} = dual(
  (args) => Queue.isQueue(args[0]),
  <A, O, E, R>(
    queue: Queue.Dequeue<A>,
    initial: O,
    reducer: (
      acc: O,
      item: A,
      queue: Queue.Enqueue<A>,
    ) => Effect.Effect<O, E, R>,
  ): Effect.Effect<O, E, R> => {
    return Effect.gen(function* () {
      const acc = yield* SynchronizedRef.make(initial)

      yield* iterateQueue(queue, (item, queue) =>
        SynchronizedRef.getAndUpdateEffect(acc, (acc) =>
          reducer(acc, item, queue),
        ),
      )

      return yield* SynchronizedRef.get(acc)
    })
  },
)
