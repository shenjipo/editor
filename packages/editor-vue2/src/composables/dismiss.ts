export interface DismissOptions {
  /** 面板根元素。点击落在它内部不算「点外部」。 */
  root: () => HTMLElement | null
  /** 面板是否展开。 */
  isOpen: () => boolean
  /** 关闭面板。 */
  close: () => void
}

/**
 * 「点外部关闭 + Esc 关闭」的监听器（Vue 2.7 Options API 版）。
 *
 * 和 editor-vue3 的 useDismiss 是同一条规则，只是 Vue 2.7 的 setup 拿不到模板 ref，
 * 所以改成：调用方在 mounted 里 attach，在 beforeDestroy 里调用返回的清理函数。
 *
 * 两个实现细节保持不变：
 * - 捕获阶段监听 pointerdown，避免面板内部按钮的 click 被「点外部」抢先关掉；
 * - 监听挂在 document 上，因为点击通常发生在编辑器区域，不在面板子树里。
 */
export function attachDismiss({ root, isOpen, close }: DismissOptions): () => void {
  function handlePointerDown(event: PointerEvent): void {
    if (!isOpen()) return
    const element = root()
    if (element && !element.contains(event.target as Node)) close()
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close()
  }

  document.addEventListener('pointerdown', handlePointerDown, true)
  document.addEventListener('keydown', handleKeydown)

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true)
    document.removeEventListener('keydown', handleKeydown)
  }
}
