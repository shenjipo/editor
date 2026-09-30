import type { JSONContent } from '@tiptap/core'

import type { HeadingLevel } from './constants'

/** 文档的一次完整序列化结果。三种表示一次算好，避免每处调用各取一遍。 */
export interface EditorContentSnapshot {
  json: JSONContent
  html: string
  text: string
}

/**
 * 工具栏需要显示的「当前状态」。
 *
 * 核心包负责算：光标处是什么块类型、套了什么 mark。
 * 框架层负责渲染：算出来的值长什么样、点哪个按钮。
 */
export interface ActiveFormats {
  /** 光标所在块类型，段落时为 'paragraph'。 */
  blockType: string
  /** 光标处标题级别，非标题时为 null。 */
  headingLevel: HeadingLevel | null
  /** 光标处字号，未设置时为 null（即跟随默认字号）。 */
  fontSize: string | null
  /** 光标处字体颜色，未设置时为 null。 */
  color: string | null
  /** 光标处文本背景色，未设置时为 null。 */
  backgroundColor: string | null
  /** 选区是否处于无序列表中。 */
  bulletList: boolean
  /** 选区是否处于有序列表中。 */
  orderedList: boolean
}
