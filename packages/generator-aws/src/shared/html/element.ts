import { type Array, Data, type Effect, Option, type Stream } from 'effect'
import { HtmlDocument } from './document'
import {
  createElementStream,
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

export class HtmlElement extends Data.TaggedClass('HtmlElement')<{
  parent: HtmlElement | HtmlDocument
  attributes: Record<string, string>
  tag: HtmlTagName | (string & unknown)
  children: Array<HtmlElement | HtmlText>
}> {
  get text(): string {
    return this.children
      .map((child) => {
        if (child instanceof HtmlText) {
          return child.text
        }
        return child.text
      })
      .join(' ')
  }

  selector(from?: string | HtmlElement): string {
    if (from === this || from === this.tag) {
      return this.tag
    }

    if (this.parent instanceof HtmlDocument) {
      return this.tag
    }

    const prefix = this.parent.selector(from)
    const index = this.parent.children.indexOf(this) as number

    const selector = `${this.tag}:nth-child(${index + 1})`

    return `${prefix} > ${selector}`
  }

  prettyPrint(indent = 0): string {
    const prefix = ' '.repeat(indent)

    const attributes = this.#prettyPrintAttributes()

    if (this.children.length === 0) {
      return `${prefix}<${this.tag}${attributes} />`
    }

    return [
      `${prefix}<${this.tag}${attributes}>`,
      ...this.children.map((child) => child.prettyPrint(indent + 2)),
      `${prefix}</${this.tag}>`,
    ].join('\n')
  }

  getAttribute(name: string): Option.Option<string> {
    return Option.fromNullable(this.attributes[name])
  }

  getNumericAttribute(name: string): Option.Option<number> {
    return this.getAttribute(name).pipe(
      Option.map((value) => Number.parseInt(value)),
      Option.flatMap((value) =>
        Number.isNaN(value) ? Option.none() : Option.some(value),
      ),
    )
  }

  toStream(): Stream.Stream<HtmlChild> {
    return createElementStream(this)
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

  #prettyPrintAttributes() {
    const attributesString = Object.entries(this.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')

    return attributesString.length === 0 ? '' : ` ${attributesString}`
  }
}
