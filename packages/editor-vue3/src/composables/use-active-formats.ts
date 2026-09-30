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
    subscribed.off('selectionUpdate', recompute)
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
    next.on('selectionUpdate', recompute)
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
