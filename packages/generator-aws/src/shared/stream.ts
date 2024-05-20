import { type Chunk, List, Option, Stream } from 'effect'

export function unfoldTree<A, B>(
  initial: List.List<A>,
  self: (item: A) => B,
  more: (item: A) => Iterable<A>,
  order: 'depth' | 'breadth' = 'depth',
) {
  return Stream.unfold(
    initial,
    unfoldReducer(self, treeOrderConcat(more, order)),
  )
}

export function unfoldTreeChunk<A, B>(
  initial: List.List<A>,
  self: (item: A) => Chunk.Chunk<B>,
  more: (item: A) => Iterable<A>,
  order: 'depth' | 'breadth' = 'depth',
) {
  return Stream.unfoldChunk(
    initial,
    unfoldReducer(self, treeOrderConcat(more, order)),
  )
}

function treeOrderConcat<A>(
  more: (node: A) => Iterable<A>,
  order: 'depth' | 'breadth',
) {
  return (remaining: List.List<A>, node: A) =>
    order === 'depth'
      ? List.prependAll(remaining, List.fromIterable(more(node)))
      : List.appendAll(remaining, List.fromIterable(more(node)))
}

function unfoldReducer<A, B>(
  self: (item: A) => B,
  more: (remaining: List.List<A>, item: A) => List.List<A>,
) {
  return (remaining: List.List<A>): Option.Option<[B, List.List<A>]> =>
    Option.match(List.head(remaining), {
      onNone: Option.none,
      onSome: (node) => {
        return Option.some([self(node), more(List.drop(remaining, 1), node)])
      },
    })
}
