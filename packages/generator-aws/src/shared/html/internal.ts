import { Array, Effect, List, Option, Stream } from 'effect'
import { unfoldTree } from '../stream'
import { HtmlElement } from './element'
import type {
  ChildSelection,
  HtmlChild,
  HtmlTagName,
  MaybeArray,
} from './types'

export function createElementStream(
  element: HtmlElement,
): Stream.Stream<HtmlChild> {
  return unfoldTree(
    List.of<HtmlChild>(element),
    (node) => node,
    (node) => ('children' in node ? node.children : []),
    'depth',
  )
  // return Stream.unfold<List.List<HtmlChild>, HtmlChild>(
  //   List.of(element),
  //   (remaining) =>
  //     Option.match(List.head(remaining), {
  //       onNone: () => Option.none(),
  //       onSome: (node) =>
  //         Option.some([
  //           node,
  //           List.drop(remaining, 1).pipe(
  //             List.prependAll(
  //               'children' in node
  //                 ? List.fromIterable(node.children)
  //                 : List.nil<HtmlChild>(),
  //             ),
  //           ),
  //         ] as const),
  //     }),
  // )
}

function toTagSet<T>(tag: MaybeArray<T>) {
  return new Set(Array.isArray(tag) ? tag : [tag]) as ReadonlySet<T>
}

export function getChildByTag(
  tag: MaybeArray<HtmlTagName>,
  select: ChildSelection,
  children: Stream.Stream<HtmlChild>,
): Effect.Effect<Option.Option<HtmlElement>> {
  const tagSet = toTagSet<string>(tag)

  const base = children.pipe(
    Stream.filter(
      (child): child is HtmlElement =>
        child instanceof HtmlElement && tagSet.has(child.tag),
    ),
  )

  if (select === 'first' || select === 0) {
    return base.pipe(Stream.runHead)
  }

  if (select === 'last') {
    return base.pipe(Stream.runLast)
  }

  if (typeof select === 'number') {
    return base.pipe(Stream.take(select), Stream.runLast)
  }

  return base.pipe(Stream.filter(select), Stream.runHead)
}

export function getChildByTagOrElse<A, E, R>(
  tag: MaybeArray<HtmlTagName>,
  orElse: () => Effect.Effect<A, E, R>,
  select: ChildSelection,
  children: Stream.Stream<HtmlChild>,
): Effect.Effect<HtmlElement | A, E, R> {
  return getChildByTag(tag, select, children).pipe(
    Effect.flatMap(
      (option) =>
        Option.match(option, {
          onNone: orElse,
          onSome: (element) => Effect.succeed(element),
        }) as Effect.Effect<HtmlElement | A, E, R>,
    ),
  )
}

export function getChildrenByTag(
  tag: MaybeArray<HtmlTagName>,
  children: Stream.Stream<HtmlChild>,
): Effect.Effect<ReadonlyArray<HtmlElement>> {
  const tagSet = toTagSet<string>(tag)

  return children.pipe(
    Stream.filter(
      (child): child is HtmlElement =>
        child instanceof HtmlElement && tagSet.has(child.tag),
    ),
    Stream.runCollect,
    Effect.map(Array.fromIterable),
  )
}

export function getSomeChildrenByTagOrElse<A, E, R>(
  tag: MaybeArray<HtmlTagName>,
  orElse: () => Effect.Effect<A, E, R>,
  children: Stream.Stream<HtmlChild>,
): Effect.Effect<Array.NonEmptyReadonlyArray<HtmlElement> | A, E, R> {
  return getChildrenByTag(tag, children).pipe(
    Effect.flatMap(
      (elements) =>
        (Array.isNonEmptyReadonlyArray(elements)
          ? Effect.succeed(elements)
          : orElse()) as Effect.Effect<
          Array.NonEmptyReadonlyArray<HtmlElement> | A,
          E,
          R
        >,
    ),
  )
}
