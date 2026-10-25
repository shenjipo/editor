import { getActiveFormats } from '@easy-editor/core'

import type { ActiveFormats } from '@easy-editor/core'
import type { Editor } from '@tiptap/vue-2'

export const NEUTRAL_FORMATS: ActiveFormats = {
  blockType: 'paragraph',
  headingLevel: null,
  fontSize: null,
  color: null,
  backgroundColor: null,
  bulletList: false,
  orderedList: false,
  bold: false,
  italic: false,
  underline: false,
  codeBlock: false,
  codeBlockLanguage: null,
  link: null,
  canUndo: false,
  canRedo: false,
}

/**
 * 维护工具栏需要的「光标处格式」快照（Vue 2.7 版）。
 *
 * editor.isActive() / getAttributes() 都不是响应式的，必须每次事务主动重算。
 * `onChange` 回调把结果写回组件的 data，Vue 2 的响应式再去更新模板。
 *
 * 只订阅 'transaction'：'update' 只在内容变化时触发，光移动光标不会发；
 * 'selectionUpdate' 是 Tiptap 为同一次变化补发的重复信号，一起订阅会算两遍。
 */
export class ActiveFormatsTracker {
  private subscribed: Editor | null = null
  private readonly recompute = (): void => {
    if (this.subscribed) this.onChange(getActiveFormats(this.subscribed))
  }

  constructor(private readonly onChange: (formats: ActiveFormats) => void) {}

  subscribe(editor: Editor | null): void {
    this.unsubscribe()

    if (!editor) {
      this.onChange(NEUTRAL_FORMATS)
      return
    }

    this.subscribed = editor
    editor.on('transaction', this.recompute)
    this.recompute()
  }

  unsubscribe(): void {
    if (!this.subscribed) return
    this.subscribed.off('transaction', this.recompute)
    this.subscribed = null
  }
}
