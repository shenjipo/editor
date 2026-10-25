import { onBeforeUnmount, ref, toValue, watch } from 'vue'

import { getActiveFormats } from '@easy-editor/core'

import type { ActiveFormats } from '@easy-editor/core'
import type { Editor } from '@tiptap/vue-3'
import type { MaybeRefOrGetter, Ref } from 'vue'

const NEUTRAL_FORMATS: ActiveFormats = {
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
 * 工具栏的响应式状态。
 *
 * `editor.isActive()` / `getAttributes()` 都不是响应式的，必须在每次事务里主动重算。
 * 这里只有「什么时候重算」这一件事：订阅编辑器事件 → 调核心包的 getActiveFormats() → 写进 ref。
 * 「怎么算」在核心包，框架层不碰 ProseMirror 的读取逻辑。
 *
 * 注意用的是 'transaction' 而不是 'update'：'update' 只在文档内容变化时触发，
 * 光移动光标或切换 mark 不会发。'transaction' 覆盖全部情况。
 *
 * 也不要再订阅 'selectionUpdate'：Tiptap 在 dispatch 里先发 'transaction'，
 * 紧接着为同一次选区变化补发 'selectionUpdate'，两个事件带的是同一个 state。
 * 一起订阅等于每次移动光标算两遍，而重算一次要跑十几项 isActive / getAttributes。
 */
export function useActiveFormats(editor: MaybeRefOrGetter<Editor | undefined>): Ref<ActiveFormats> {
  const formats = ref<ActiveFormats>(NEUTRAL_FORMATS)
  let subscribed: Editor | undefined

  function recompute(): void {
    if (subscribed) {
      formats.value = getActiveFormats(subscribed)
    }
  }

  function unsubscribe(): void {
    if (!subscribed) return
    subscribed.off('transaction', recompute)
    subscribed = undefined
  }

  function subscribe(next: Editor | undefined): void {
    unsubscribe()

    if (!next) {
      formats.value = NEUTRAL_FORMATS
      return
    }

    subscribed = next
    next.on('transaction', recompute)
    recompute()
  }

  // editor 在 onMounted 里才被赋值，所以要 watch 它从无到有、从有到无。
  watch(
    () => toValue(editor),
    (next) => subscribe(next),
    { immediate: true },
  )

  onBeforeUnmount(unsubscribe)

  return formats
}
