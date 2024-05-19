import { Array, Data, Effect, List, type Option, Queue, Stream } from 'effect'
import { type DefaultTreeAdapterMap, parse } from 'parse5'
import { iterateQueue, reduceQueue } from '../queue'
import { HtmlElement } from './element'
import {
  getChildByTag,
  getChildByTagOrElse,
  getChildrenByTag,
  getSomeChildrenByTagOrElse,
} from './internal'
import { HtmlText } from './text'
import type {
  ChildSelection,
  HtmlChild,
  HtmlTagName,
  MaybeArray,
} from './types'

type AstNode = DefaultTreeAdapterMap['node']

type AstText = DefaultTreeAdapterMap['textNode']
type AstElement = DefaultTreeAdapterMap['element']

type AstChild = AstText | AstElement

type ParseQueueItem = {
  node: AstChild
  parent: HtmlDocument | HtmlElement
}

function createAttributesRecord(node: AstNode) {
  if ('attrs' in node) {
    return Object.fromEntries(
      node.attrs.map((attr) => [
        `${attr.prefix ?? ''}${attr.name}`,
        attr.value,
      ]),
    )
  }
  return {}
}

function shouldIncludeNode(node: AstNode): node is AstElement | AstText {
  if (node.nodeName === '#text') {
    if ((node as AstText).value.trim() !== '') {
      return true
    }
  }

  return node.nodeName === '#document' || !node.nodeName.startsWith('#')
}

function getValidChildren(parent: HtmlDocument | HtmlElement, node: AstNode) {
  return Effect.gen(function* () {
    const queue = yield* Queue.unbounded<AstNode>()

    yield* Queue.offer(queue, node)

    return yield* reduceQueue(
      queue,
      List.empty<ParseQueueItem>(),
      (children, current, queue) => {
        if (shouldIncludeNode(current) && current !== node) {
          return Effect.succeed(
            List.append(children, { parent, node: current }),
          )
        }

        if ('childNodes' in current) {
          return Queue.offerAll(queue, current.childNodes).pipe(
            Effect.map(() => children),
          )
        }

        return Effect.succeed(children)
      },
    )
  })
}

export class HtmlParseError extends Data.TaggedError('HtmlParseError')<{
  message: string
}> {}

export class HtmlDocument extends Data.TaggedClass('HtmlDocument')<{
  children: Array<HtmlElement>
}> {
  static parse(html: string) {
    return Effect.gen(function* () {
      const document = new HtmlDocument({ children: [] })
      const root = yield* Effect.try({
        try: () => parse(html),
        catch: (error) =>
          new HtmlParseError({
            message:
              error instanceof Error ? error.message : 'Unknown parse error',
          }),
      })

      const queue = yield* Queue.unbounded<ParseQueueItem>()
      yield* Queue.offerAll(queue, yield* getValidChildren(document, root))

      yield* iterateQueue(queue, ({ node, parent }, queue) =>
        Effect.gen(function* () {
          if (node.nodeName === '#text') {
            if (parent instanceof HtmlElement) {
              const text = new HtmlText({
                parent,
                text: (node as AstText).value.trim(),
              })
              parent.children.push(text)
            }
          } else {
            const element = new HtmlElement({
              parent,
              attributes: createAttributesRecord(node),
              tag: (node as AstElement).tagName as HtmlTagName,
              children: [],
            })

            parent.children.push(element)

            yield* Queue.offerAll(queue, yield* getValidChildren(element, node))
          }
        }),
      )

      return document
    })
  }

  prettyPrint() {
    return this.children.map((child) => child.prettyPrint()).join('\n')
  }

  getChildByTag(
    tag: MaybeArray<HtmlTagName>,
    select: ChildSelection = 'first',
  ): Effect.Effect<Option.Option<HtmlElement>> {
    return getChildByTag(tag, select, this.toStream())
  }

  getChildByTagOrElse<A, E, R>(
    tag: MaybeArray<HtmlTagName>,
    orElse: () => Effect.Effect<A, E, R>,
    select: ChildSelection = 'first',
  ): Effect.Effect<HtmlElement | A, E, R> {
    return getChildByTagOrElse(tag, orElse, select, this.toStream())
  }

  getChildrenByTag(
    tag: MaybeArray<HtmlTagName>,
  ): Effect.Effect<ReadonlyArray<HtmlElement>> {
    return getChildrenByTag(tag, this.toStream())
  }

  getSomeChildrenByTagOrElse<A, E, R>(
    tag: MaybeArray<HtmlTagName>,
    orElse: () => Effect.Effect<A, E, R>,
  ): Effect.Effect<Array.NonEmptyReadonlyArray<HtmlElement> | A, E, R> {
    return getSomeChildrenByTagOrElse(tag, orElse, this.toStream())
  }

  toStream(): Stream.Stream<HtmlChild> {
    return Array.reduce(
      this.children,
      Stream.empty as Stream.Stream<HtmlChild>,
      (stream, child) => Stream.concat(stream, child.toStream()),
    )
  }
}
