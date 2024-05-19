import type { HtmlDocument } from './document'
import type { HtmlElement } from './element'
import type { HtmlText } from './text'

export type HtmlChild = HtmlText | HtmlElement
export type HtmlParent = HtmlElement | HtmlDocument
export type HtmlNode = HtmlDocument | HtmlElement | HtmlText

export type HtmlTagName = keyof HTMLElementTagNameMap

export type ChildSelection =
  | 'first'
  | 'last'
  | number
  | ((element: HtmlElement) => boolean)

export type MaybeArray<T> = T | ReadonlyArray<T>
