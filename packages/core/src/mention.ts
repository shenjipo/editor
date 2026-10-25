import Mention from '@tiptap/extension-mention'

import type { SuggestionOptions } from '@tiptap/suggestion'

/**
 * 一条提及候选项。
 *
 * 只有 id / label 会写进文档（`data-id` / `data-label` 和正文里的 `@label`）；
 * description 只是下拉列表里的补充说明，不参与序列化——把它塞进节点属性，
 * wangEditor 之类的消费方解析时也会直接丢掉。
 */
export interface MentionItem {
  id: string
  label: string
  /** 只在下拉里展示的补充说明（部门、职位、文档数…）。 */
  description?: string
}

/**
 * 按输入内容取候选项。
 *
 * 同步返回数组或返回 Promise 都可以；异步时 Suggestion 会在等待期间保持弹层打开，
 * 并把 `loading` 传给渲染层（见 `@tiptap/suggestion` 的 `SuggestionProps`）。
 */
export type MentionItemsProvider = (query: string) => MentionItem[] | Promise<MentionItem[]>

/** 与「查什么」无关、可以原样透传给 Suggestion 的选项。 */
export type MentionSuggestionOptions = Omit<
  SuggestionOptions<MentionItem>,
  'editor' | 'char' | 'items' | 'render' | 'command'
>

/**
 * 一个触发源。
 *
 * `render` 是框架相关的（Vue 适配层用 VueRenderer 渲染弹层），由适配层注入；
 * 核心包只负责把它交给 Suggestion 插件，不 import 任何 UI 框架。
 */
export interface EasyMentionSource {
  /** 触发符号，例如 '@' 或 '#'。同一个编辑器里必须唯一。 */
  char: string
  /** 候选项来源。通常是一次接口调用，可以异步。 */
  items: MentionItemsProvider
  /** 框架层注入的弹层实现。 */
  render?: SuggestionOptions<MentionItem>['render']
  /** 其余 Suggestion 选项（防抖、空格、行首触发…）。 */
  suggestion?: MentionSuggestionOptions
}

/**
 * 装配 mention 扩展。
 *
 * 一个编辑器只注册一个 mention 节点类型，多个触发符号（@ / #）共用它，
 * 靠 `mentionSuggestionChar` 属性区分。这样 schema 里只有 `mention` 一个节点，
 * HTML 也统一是 `<span data-type="mention" …>`，不会因为触发了几个符号就多出几种节点。
 *
 * 触发符必须在编辑器内唯一：同一个字符挂两个 Suggestion 插件会弹出两个列表。
 */
export function createMentionExtension(sources: readonly EasyMentionSource[]) {
  if (sources.length === 0) {
    throw new Error('[easy-editor] createMentionExtension 至少需要一个触发源')
  }

  const seen = new Set<string>()

  for (const source of sources) {
    if (!source.char) {
      throw new Error('[easy-editor] mention 触发符（char）不能为空字符串')
    }
    if (seen.has(source.char)) {
      throw new Error(`[easy-editor] mention 触发符重复：${source.char}`)
    }
    seen.add(source.char)
  }

  return Mention.configure({
    HTMLAttributes: { class: 'easy-editor-mention' },
    // 光标紧贴 mention 时按退格，整个节点删掉。默认行为是把它还原成触发符，
    // 那会让「一个整体」变得像普通文本，和图片/其他原子节点的直觉不一致。
    deleteTriggerWithBackspace: true,
    suggestions: sources.map((source) => ({
      // 中文里 @ 常常紧跟在汉字后面（「你好@」），默认只认空格前缀会漏触发。
      // 需要更严格的行为时，调用方可以在 suggestion 里覆盖回 [' ']。
      allowedPrefixes: null,
      decorationClass: 'easy-editor-mention-trigger',
      ...source.suggestion,
      char: source.char,
      items: ({ query }) => source.items(query),
      render: source.render,
    })),
  })
}
