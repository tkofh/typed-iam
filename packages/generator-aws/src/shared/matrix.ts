import { Array, Data, Effect } from 'effect'

export type Matrix<A> = Array.NonEmptyArray<Array.NonEmptyArray<A>>

export class TransposeError extends Data.TaggedError('TransposeError')<{
  readonly message: string
}> {}

export function transpose<A>(
  matrix: Matrix<A>,
): Effect.Effect<Matrix<A>, TransposeError> {
  return Effect.gen(function* () {
    if (matrix.length === 0) {
      return yield* Effect.fail(
        new TransposeError({ message: 'Cannot transpose an empty matrix' }),
      )
    }

    const major = matrix.length
    const minor = matrix[0].length

    for (const minorArray of matrix) {
      if (minorArray.length !== minor) {
        return yield* Effect.fail(
          new TransposeError({
            message:
              'Cannot transpose a matrix with varying minor array lengths',
          }),
        )
      }
    }

    const transposed: Matrix<A> = Array.makeBy(minor, (minorIndex) =>
      Array.makeBy(
        major,
        (majorIndex) =>
          (matrix[majorIndex] as Array.NonEmptyArray<A>)[minorIndex] as A,
      ),
    )

    return transposed
  })
}
