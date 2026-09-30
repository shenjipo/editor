import { Placeholder } from '@tiptap/extensions'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'

import type { Extensions } from '@tiptap/core'

import { HEADING_LEVELS } from './constants'
import type { HeadingLevel } from './constants'

export interface EasyEditorExtensionOptions {
  /** 占位文案。留空则不注册 Placeholder 扩展。 */
  placeholder?: string
  /** 要保留的标题级别，默认 [1, 2, 3]。 */
  headingLevels?: readonly HeadingLevel[]
}

/**
 * 装配 easy-editor 的扩展集。
 *
 * 「核心包负责扩展装配」——谁来创建 Editor 实例都行（Vue / React / 原生），
 * 但 schema 只有这一处定义，保证各适配层产出的文档结构完全一致。
 *
 * 当前能力：
 * - 标题 H1-H3、有序列表、无序列表  → StarterKit 内置
 * - 字号、字体颜色、文本背景色      → TextStyleKit 内置
 */
export function createEasyEditorExtensions(options: EasyEditorExtensionOptions = {}): Extensions {
  const { placeholder, headingLevels = HEADING_LEVELS } = options

  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [...headingLevels] },
    }),
    // TextStyleKit 默认还会带 FontFamily / LineHeight，本期不做，关掉以免污染 schema。
    TextStyleKit.configure({
      fontFamily: false,
      lineHeight: false,
    }),
  ]

  if (placeholder) {
    extensions.push(Placeholder.configure({ placeholder }))
  }

  return extensions
}
