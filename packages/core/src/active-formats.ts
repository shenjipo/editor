import type { Editor } from '@tiptap/core'

import { HEADING_LEVELS, PARAGRAPH_VALUE } from './constants'
import type { BlockTypeValue, HeadingLevel } from './constants'
import type { ActiveFormats } from './types'

const TEXT_STYLE_MARK = 'textStyle'

function toHeadingLevel(value: unknown): HeadingLevel | null {
  return HEADING_LEVELS.includes(value as HeadingLevel) ? (value as HeadingLevel) : null
}

/**
 * 计算光标／选区处的格式状态，供工具栏高亮与回显。
 *
 * 这是核心包「算状态」职责的集中体现：框架层拿到的是一个普通对象，
 * 不关心它是怎么从 ProseMirror doc 里读出来的。
 *
 * 注意：这个函数在编辑器每次事务（transaction）后都要重算，所以只做必要的读取。
 */
export function getActiveFormats(editor: Editor): ActiveFormats {
  const headingLevel = toHeadingLevel(editor.getAttributes('heading').level)
  const textStyleAttributes = editor.getAttributes(TEXT_STYLE_MARK) as {
    fontSize?: string
    color?: string
    backgroundColor?: string
  }

  const blockType: BlockTypeValue = headingLevel ? `h${headingLevel}` : PARAGRAPH_VALUE

  return {
    blockType,
    headingLevel,
    fontSize: textStyleAttributes.fontSize ?? null,
    color: textStyleAttributes.color ?? null,
    backgroundColor: textStyleAttributes.backgroundColor ?? null,
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
  }
}
