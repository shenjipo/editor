import { FONT_SIZE_OPTIONS, HEADING_LEVELS, PARAGRAPH_VALUE } from '@easy-editor/core'

import type { BlockTypeValue } from '@easy-editor/core'

/**
 * 界面文案与下拉选项。
 *
 * 「哪些字号可用」是核心包定的（值），「字号下拉里显示成 12 还是 小四」是这里定的（长相）。
 * 想接 i18n 就替换这个文件，核心包一行不用动。
 */

export interface ToolbarOption<T extends string = string> {
  value: T
  label: string
}

export const BLOCK_TYPE_OPTIONS: readonly ToolbarOption<BlockTypeValue>[] = [
  { value: PARAGRAPH_VALUE, label: '正文' },
  ...HEADING_LEVELS.map((level) => ({ value: `h${level}` as const, label: `标题 ${level}` })),
]

/** 空字符串代表「未设置」——清除 inline style，回落到编辑器默认字号。 */
export const FONT_SIZE_SELECT_OPTIONS: readonly ToolbarOption[] = [
  { value: '', label: '默认' },
  ...FONT_SIZE_OPTIONS.map((size) => ({ value: size, label: size.replace('px', '') })),
]

export const TOOLBAR_LABELS = {
  blockType: '段落格式',
  fontSize: '字号',
  textColor: '字体颜色',
  backgroundColor: '文本背景色',
  bulletList: '无序列表',
  orderedList: '有序列表',
  clearColor: '清除颜色',
  clearBackground: '清除背景色',
  customColor: '自定义颜色',
} as const

/** 色板里的「透明」用这个值表示，点击时走清除命令而不是设置命令。 */
export const TRANSPARENT_COLOR = 'transparent'
