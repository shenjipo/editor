<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  getActiveTableRange,
  toggleHeaderRow,
} from '@shenjipo/editor-core'

import { TABLE_PANEL_LABELS } from '../labels'

import type { Editor } from '@tiptap/vue-3'

/**
 * 光标进入表格时浮在表格上方的操作面板。
 *
 * 这是 wangEditor 的交互形态，也是任务里「选中表格时的操作」所指的东西——
 * 表格的操作按钮放在工具栏上，光标在表格里时还要跑去工具栏找，很别扭。
 *
 * 分工：**「光标在哪张表里」由核心包的 `getActiveTableRange` 回答**，
 * 这里只做剩下那半截纯 DOM 的活——取元素、量尺寸、决定浮在表格上方还是下方。
 * 表格上方放不下（表格贴着编辑区顶部）时改放到表格下方，
 * 否则面板会被 `.easy-editor` 的 `overflow: hidden` 裁掉。
 */
const props = defineProps<{ editor: Editor }>()

/** 与 CSS 里 `.easy-editor-table-panel` 的高度保持一致，用来判断上方放不放得下。 */
const PANEL_HEIGHT = 34
const GAP = 6

const visible = ref(false)
const top = ref(0)
const left = ref(0)

function update(): void {
  const { editor } = props
  // isDestroyed 必须排在最前面：编辑器销毁后 view 是 null，
  // isEditable / isActive 都会去读 view 而抛错。
  const range = !editor.isDestroyed && editor.isEditable ? getActiveTableRange(editor) : null
  const element = range ? editor.view.nodeDOM(range.from) : null
  const host = element instanceof HTMLElement ? element.closest('.easy-editor__area') : null

  if (!(element instanceof HTMLElement) || !(host instanceof HTMLElement)) {
    visible.value = false
    return
  }

  const rect = element.getBoundingClientRect()
  const hostRect = host.getBoundingClientRect()
  const roomAbove = rect.top - hostRect.top
  const placeAbove = roomAbove >= PANEL_HEIGHT + GAP

  top.value = placeAbove ? roomAbove - PANEL_HEIGHT - GAP : rect.bottom - hostRect.top + GAP
  left.value = Math.max(0, rect.left - hostRect.left)
  visible.value = true
}

// 一次输入会发好几个事务，重算合并到下一帧。滚动和窗口缩放同理。
let frame = 0

function schedule(): void {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    update()
  })
}

let scrollElement: HTMLElement | null = null

onMounted(() => {
  const { editor } = props
  // 只订阅 'transaction'：光标的每一次移动、内容的每一次变化都会发它，
  // 'selectionUpdate' 是 Tiptap 为同一次变化补发的重复信号。
  editor.on('transaction', schedule)

  // 编辑区自己会滚（.ProseMirror 上是 overflow-y: auto），面板要跟着表格走。
  scrollElement = editor.view.dom as HTMLElement
  scrollElement.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)

  schedule()
})

onBeforeUnmount(() => {
  props.editor.off('transaction', schedule)
  scrollElement?.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  if (frame) cancelAnimationFrame(frame)
})

/**
 * 面板上的按钮都在编辑区外，按下会把焦点从编辑器抢走。
 * 用 mousedown.prevent 挡掉这次焦点转移，光标留在原处，click 照常触发。
 */
const actions = [
  { label: TABLE_PANEL_LABELS.rowBefore, text: '↑行', run: addRowBefore },
  { label: TABLE_PANEL_LABELS.rowAfter, text: '↓行', run: addRowAfter },
  { label: TABLE_PANEL_LABELS.columnBefore, text: '←列', run: addColumnBefore },
  { label: TABLE_PANEL_LABELS.columnAfter, text: '→列', run: addColumnAfter },
  { label: TABLE_PANEL_LABELS.deleteRow, text: '删行', run: deleteRow },
  { label: TABLE_PANEL_LABELS.deleteColumn, text: '删列', run: deleteColumn },
  { label: TABLE_PANEL_LABELS.toggleHeaderRow, text: '表头', run: toggleHeaderRow },
  { label: TABLE_PANEL_LABELS.deleteTable, text: '删表', run: deleteTable },
] as const
</script>

<template>
  <div
    v-if="visible"
    class="easy-editor-table-panel"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="toolbar"
    :aria-label="TABLE_PANEL_LABELS.title"
  >
    <button
      v-for="action in actions"
      :key="action.label"
      type="button"
      class="easy-editor-table-panel__button"
      :title="action.label"
      :aria-label="action.label"
      @mousedown.prevent
      @click="action.run(props.editor)"
    >
      {{ action.text }}
    </button>
  </div>
</template>
