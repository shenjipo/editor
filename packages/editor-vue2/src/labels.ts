import { CODE_BLOCK_LANGUAGES, FONT_SIZE_OPTIONS, HEADING_LEVELS, PARAGRAPH_VALUE } from '@easy-editor/core'

import type { BlockTypeValue } from '@easy-editor/core'

/*
 * 与 packages/editor-vue3/src/labels.ts 保持一致。
 * 文案和选项属于框架层，两个适配层目前共用同一套中文界面；改的时候两边一起改。
 */

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

/** 代码块语言在界面上更好看的写法。没有条目的直接用语言 id（javascript、python…）。 */
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  jsx: 'JSX',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  php: 'PHP',
  cpp: 'C++',
  csharp: 'C#',
}

/** 代码块语言下拉。空值代表「纯文本」，与 wangEditor 未选语言时一致。 */
export const CODE_BLOCK_LANGUAGE_OPTIONS: readonly ToolbarOption[] = [
  { value: '', label: '纯文本' },
  ...CODE_BLOCK_LANGUAGES.map((language) => ({
    value: language,
    label: LANGUAGE_DISPLAY_NAMES[language] ?? language,
  })),
]

/** 工具栏自己用的文案（按钮的 title / aria-label、下拉的 label）。 */
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

  bold: '粗体',
  italic: '斜体',
  underline: '下划线',
  undo: '撤销',
  redo: '重做',
  codeBlock: '代码块',
  codeBlockLanguage: '代码块语言',
} as const

/*
 * 三个弹层各自带一个完整的文案包，而不是把字符串一个个当 prop 传下去。
 * 后者会让「加一条文案」变成三处联动修改（labels.ts、组件的 props 声明、
 * 工具栏模板里的绑定），工具栏也就退化成一个纯粹的转发层。
 * 传对象则是一处改动，同时文案仍然可覆盖，i18n 的换入点没变。
 */

export const LINK_POPOVER_LABELS = {
  trigger: '链接',
  placeholder: 'https://example.com',
  apply: '确定',
  remove: '移除链接',
} as const

export const IMAGE_POPOVER_LABELS = {
  trigger: '图片',
  urlTab: '网络图片',
  uploadTab: '本地上传',
  urlPlaceholder: 'https://example.com/pic.png',
  alt: '图片描述',
  altPlaceholder: '选填，图片加载失败时会显示',
  apply: '插入',
  chooseFile: '选择文件',
  noFile: '请先选择文件',
  readFailed: '读取文件失败',
  uploading: '处理中…',
} as const

export const INSERT_TABLE_POPOVER_LABELS = {
  trigger: '插入表格',
  headerRow: '含表头行',
} as const

export const TABLE_PANEL_LABELS = {
  /** 浮动面板整体的 aria-label。注意别复用「插入表格」——这个面板不插入任何东西。 */
  title: '表格操作',
  rowBefore: '上方插入行',
  rowAfter: '下方插入行',
  columnBefore: '左侧插入列',
  columnAfter: '右侧插入列',
  deleteRow: '删除行',
  deleteColumn: '删除列',
  toggleHeaderRow: '切换表头行',
  deleteTable: '删除表格',
} as const

/**
 * 提及弹层文案。
 *
 * title 为空串时整个标题栏不渲染——多个触发源（@ 找成员、# 找标签）通常需要不同标题，
 * 由各自的 MentionSource.labels 覆盖；这里只提供兜底值和状态文案。
 */
export interface MentionLabels {
  title: string
  loading: string
  empty: string
}

export const MENTION_LABELS: MentionLabels = {
  title: '',
  loading: '加载中…',
  empty: '没有匹配的选项',
}

export const IMAGE_PANEL_LABELS = {
  /** 浮动面板整体的 aria-label。 */
  title: '图片操作',
  /** 宽度按钮的 aria-label 前缀，和预设值拼成「宽度 30%」。按钮上的文字就是预设值本身。 */
  width: '宽度',
  edit: '编辑图片',
  remove: '删除图片',
} as const

/**
 * 图片编辑弹窗。
 *
 * 三项与 wangEditor 的「编辑图片」弹窗一一对应（图片地址 / 图片描述 / 图片链接）——
 * 它的图片节点存的就是 src / alt / href，多出来的字段它反向解析时会丢掉。
 */
export const IMAGE_EDIT_DIALOG_LABELS = {
  title: '编辑图片',
  src: '图片地址',
  srcPlaceholder: 'https://example.com/pic.png',
  alt: '图片描述',
  altPlaceholder: '选填，图片加载失败时会显示',
  href: '图片链接',
  hrefPlaceholder: '选填，点击图片时跳转的地址',
  apply: '确定',
  cancel: '取消',
} as const

export type LinkPopoverLabels = typeof LINK_POPOVER_LABELS
export type ImagePopoverLabels = typeof IMAGE_POPOVER_LABELS
export type InsertTablePopoverLabels = typeof INSERT_TABLE_POPOVER_LABELS
export type TablePanelLabels = typeof TABLE_PANEL_LABELS
export type ImagePanelLabels = typeof IMAGE_PANEL_LABELS
export type ImageEditDialogLabels = typeof IMAGE_EDIT_DIALOG_LABELS

/** 色板里的「透明」用这个值表示，点击时走清除命令而不是设置命令。 */
export const TRANSPARENT_COLOR = 'transparent'
