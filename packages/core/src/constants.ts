/**
 * 核心包常量。
 *
 * 这里放的是「值」——编辑器支持哪些字号、哪些标题级别、默认色板有哪些颜色。
 * 它们属于文档模型的能力边界，所有框架适配层共用同一套，保证 Vue / React 表现一致。
 *
 * 「标签文案」「布局」「样式」不放这里，那些属于框架层的职责。
 */

/** 支持的标题级别。StarterKit 的 Heading 会按这个数组裁剪 schema。 */
export const HEADING_LEVELS = [1, 2, 3] as const

export type HeadingLevel = (typeof HEADING_LEVELS)[number]

/** 段落（非标题）的表示值，用于工具栏「正文 / 标题」选择器。 */
export const PARAGRAPH_VALUE = 'paragraph'

export type BlockTypeValue = typeof PARAGRAPH_VALUE | `h${HeadingLevel}`

/** 可选字号，与 FontSize 扩展写入 textStyle mark 的 inline style 一致。 */
export const FONT_SIZE_OPTIONS = ['12px', '14px', '15px', '16px', '18px', '20px', '24px', '30px'] as const

export type FontSizeValue = (typeof FONT_SIZE_OPTIONS)[number]

/** 新文档的默认字号。与 FONT_SIZE_OPTIONS 中「不写 inline style」的那一档保持一致。 */
export const DEFAULT_FONT_SIZE: FontSizeValue = '16px'

/** 字体颜色默认色板。 */
export const TEXT_COLOR_PALETTE = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#d9d9d9',
  '#efefef',
  '#ffffff',
  '#e60000',
  '#ff9900',
  '#ffff00',
  '#008a00',
  '#0066cc',
  '#9933ff',
  '#facccc',
  '#f06666',
] as const

/** 文本背景色默认色板。 */
export const BACKGROUND_COLOR_PALETTE = [
  'transparent',
  '#fce8b3',
  '#fde2e2',
  '#e6f4ea',
  '#e8f0fe',
  '#f3e8fd',
  '#e0f7fa',
  '#f5f5f5',
  '#fff2cc',
  '#ffd966',
  '#d9ead3',
  '#c9daf8',
  '#d9d2e9',
  '#f4cccc',
  '#ead1dc',
  '#ffffff',
] as const

/** ProseMirror 根节点 class，编辑器样式全部挂在这个 class 下。 */
export const EDITOR_ROOT_CLASS = 'easy-editor'
