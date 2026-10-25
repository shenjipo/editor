import { onBeforeUnmount, onMounted } from 'vue'

import type { Ref } from 'vue'

export interface UseDismissOptions {
  /** 面板根元素，用来判断点击是否落在面板内部。 */
  root: Ref<HTMLElement | null>
  /** 面板是否展开。 */
  isOpen: Ref<boolean>
}

/**
 * 「点外部关闭 + Esc 关闭」。
 *
 * 工具栏上现在有四个弹层（取色、链接、图片、插入表格），这套监听逻辑本来要在
 * 每个组件里抄一遍，所以提到这里。ColorPopover 也用它。
 *
 * 两个实现细节：
 * - 用**捕获阶段**监听 pointerdown。冒泡阶段被面板内部按钮的 click 抢先，
 *   会出现「点了面板里的按钮，面板先被判定为点外部关掉，按钮的 click 落空」。
 * - 挂在 document 上而不是面板上，因为点击往往发生在编辑器区域，不在面板子树里。
 *
 * 触发器本身也在 root 里，所以点触发器不会被判定成「点外部」——
 * 开合交给各组件自己的 toggle()。
 */
export function useDismiss({ root, isOpen }: UseDismissOptions): { close: () => void } {
  function close(): void {
    isOpen.value = false
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!isOpen.value) return
    if (root.value && !root.value.contains(event.target as Node)) close()
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close()
  }

  onMounted(() => {
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', handlePointerDown, true)
    document.removeEventListener('keydown', handleKeydown)
  })

  return { close }
}
