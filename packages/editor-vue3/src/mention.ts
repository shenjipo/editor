import { VueRenderer } from '@tiptap/vue-3'

import MentionPopover from './components/MentionPopover.vue'
import { MENTION_LABELS } from './labels'

import type { EasyMentionSource, MentionItem, MentionSuggestionOptions } from '@easy-editor/core'
import type { MentionLabels } from './labels'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'

/**
 * 消费方配置的提及触发源。
 *
 * 比核心包的 `EasyMentionSource` 多出两项框架相关的东西：
 * 弹层文案，以及几个不需要暴露 Suggestion 全量类型的常用开关。
 * `render` 由这里注入——核心包只拿到一个回调，不知道它是 Vue 渲染的。
 */
export interface MentionSource {
  /** 触发符号，例如 '@' 或 '#'。同一编辑器内必须唯一。 */
  char: string
  /**
   * 按输入内容取候选项。返回数组或 Promise 都行；异步期间弹层会显示 loading。
   * 通常这里是一次接口调用，query 是触发符后面已经输入的内容。
   */
  items: (query: string) => MentionItem[] | Promise<MentionItem[]>
  /** 覆盖弹层文案（标题、加载中、空列表）。 */
  labels?: Partial<MentionLabels>
  /** items() 的防抖毫秒数，默认 0（不防抖）。 */
  debounce?: number
  /** 允许 query 里带空格，默认 false。 */
  allowSpaces?: boolean
  /** 只在行首触发，默认 false。 */
  startOfLine?: boolean
  /** 其余 Suggestion 选项原样透传（如 initialItems、minQueryLength）。 */
  suggestion?: MentionSuggestionOptions
}

type MentionRender = NonNullable<SuggestionOptions<MentionItem>['render']>

/**
 * 把 Suggestion 的生命周期接到一个 Vue 组件上。
 *
 * `props.mount()` 是 @tiptap/suggestion v3 提供的受管挂载：它把元素挂到 body，
 * 用 Floating UI 跟着光标定位，并在滚动、缩放时自动更新——不需要 tippy，
 * 也不用自己监听 window。
 */
function createMentionRender(labels: MentionLabels): MentionRender {
  return () => {
    let renderer: VueRenderer | null = null
    let unmount: (() => void) | null = null

    function destroy(): void {
      unmount?.()
      unmount = null
      renderer?.destroy()
      renderer = null
    }

    function toProps(props: SuggestionProps<MentionItem>): Record<string, unknown> {
      return {
        items: props.items,
        loading: props.loading,
        labels,
        // 只把文档真正需要的字段交给 command；description 留在弹层里展示。
        command: (item: MentionItem) => props.command({ id: item.id, label: item.label }),
      }
    }

    return {
      onStart(props) {
        // 正常流程 start 前一定先 exit，这里兜底，避免旧的浮层残留。
        destroy()

        renderer = new VueRenderer(MentionPopover, {
          props: toProps(props),
          editor: props.editor,
        })

        const element = renderer.element
        if (element instanceof HTMLElement) {
          unmount = props.mount(element)
        }
      },

      onUpdate(props) {
        renderer?.updateProps(toProps(props))
      },

      onKeyDown({ event }) {
        const exposed = renderer?.ref as { onKeyDown?: (event: KeyboardEvent) => boolean } | null
        return exposed?.onKeyDown?.(event) ?? false
      },

      onExit() {
        destroy()
      },
    }
  }
}

/**
 * 框架层配置 → 核心包扩展选项。
 *
 * 核心包负责 schema 和「选中后怎么插入文档」，这里只负责「弹层长什么样、怎么交互」。
 * 数据来源（items）是消费方传进来的，两个包都不关心它具体从哪来。
 */
export function createMentionSources(sources: readonly MentionSource[]): EasyMentionSource[] {
  return sources.map((source) => {
    const labels: MentionLabels = { ...MENTION_LABELS, ...source.labels }

    return {
      char: source.char,
      items: source.items,
      render: createMentionRender(labels),
      suggestion: {
        ...source.suggestion,
        // 顶层的三个快捷开关放在最后：和 suggestion 里同名选项冲突时以它们为准。
        ...(source.debounce !== undefined ? { debounce: source.debounce } : {}),
        ...(source.allowSpaces ? { allowSpaces: true } : {}),
        ...(source.startOfLine ? { startOfLine: true } : {}),
      },
    }
  })
}
