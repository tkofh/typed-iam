import { Data } from 'effect'
import type { HtmlElement } from './element'

export class HtmlText extends Data.TaggedClass('HtmlText')<{
  parent: HtmlElement
  text: string
}> {
  selector(from?: string | HtmlElement): string {
    const prefix = this.parent.selector(from)

    const index = this.parent.children.indexOf(this) as number
    const selector = `#text:nth-child(${index + 1})`

    return prefix !== '' ? `${prefix} > ${selector}` : selector
  }

  prettyPrint(indent = 0) {
    const prefix = ' '.repeat(indent)
    return this.text
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n')
  }
}
