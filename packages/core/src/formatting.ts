import type { Editor } from '@tiptap/core'

import { PARAGRAPH_VALUE } from './constants'
import type { BlockTypeValue, HeadingLevel } from './constants'

/**
 * 文档格式化命令。
 *
 * 这一层是核心包对外的「动作接口」：框架层拿到的是 `setTextColor(editor, '#f00')`
 * 这样语义明确的函数，而不是自己拼 `editor.chain().focus()...run()`——
 * 链式命令少写 `.focus()` 会丢光标、少写 `.run()` 会静默不生效，
 * 把这类陷阱收口在核心包一处。
 *
 * 每个函数都返回命令是否真正执行成功，UI 层可据此判断按钮可用性。
 */

/** 设置字号，如 '18px'。 */
export function setFontSize(editor: Editor, fontSize: string): boolean {
  return editor.chain().focus().setFontSize(fontSize).run()
}

/** 清除字号，回落到默认字号。 */
export function unsetFontSize(editor: Editor): boolean {
  return editor.chain().focus().unsetFontSize().run()
}

/** 设置字体颜色。 */
export function setTextColor(editor: Editor, color: string): boolean {
  return editor.chain().focus().setColor(color).run()
}

/** 清除字体颜色。 */
export function unsetTextColor(editor: Editor): boolean {
  return editor.chain().focus().unsetColor().run()
}

/** 设置文本背景色。 */
export function setBackgroundColor(editor: Editor, color: string): boolean {
  return editor.chain().focus().setBackgroundColor(color).run()
}

/** 清除文本背景色。 */
export function unsetBackgroundColor(editor: Editor): boolean {
  return editor.chain().focus().unsetBackgroundColor().run()
}

/** 切换标题级别。已在同一级别时会降回段落。 */
export function toggleHeading(editor: Editor, level: HeadingLevel): boolean {
  return editor.chain().focus().toggleHeading({ level }).run()
}

/** 转成普通段落。 */
export function setParagraph(editor: Editor): boolean {
  return editor.chain().focus().setParagraph().run()
}

/** 按工具栏的块类型值切换（'paragraph' 或 'h1' / 'h2' / 'h3'）。 */
export function setBlockType(editor: Editor, value: BlockTypeValue): boolean {
  if (value === PARAGRAPH_VALUE) {
    return setParagraph(editor)
  }
  return toggleHeading(editor, Number(value.slice(1)) as HeadingLevel)
}

/** 切换无序列表。 */
export function toggleBulletList(editor: Editor): boolean {
  return editor.chain().focus().toggleBulletList().run()
}

/** 切换有序列表。 */
export function toggleOrderedList(editor: Editor): boolean {
  return editor.chain().focus().toggleOrderedList().run()
}
