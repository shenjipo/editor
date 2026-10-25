<script lang="ts">
import { defineComponent, markRaw } from 'vue'

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

import type { PropType } from 'vue'
import type { Editor } from '@tiptap/vue-2'

type TableCommand = (editor: Editor) => boolean

/** 与 CSS 里 `.easy-editor-table-panel` 的高度保持一致，用来判断上方放不放得下。 */
const PANEL_HEIGHT = 34
const GAP = 6

export default defineComponent({
  name: 'TablePanel',
  props: {
    editor: { type: Object as PropType<Editor>, required: true },
  },
  data() {
    return {
      visible: false,
      top: 0,
      left: 0,
      labels: TABLE_PANEL_LABELS,
      // 下面两个只给方法用，模板不依赖；scrollElement 用 markRaw 赋值避免 Vue 观察 DOM。
      frame: 0,
      scrollElement: null as HTMLElement | null,
    }
  },
  computed: {
    actions(): { label: string; text: string; run: TableCommand }[] {
      return [
        { label: TABLE_PANEL_LABELS.rowBefore, text: '↑行', run: addRowBefore },
        { label: TABLE_PANEL_LABELS.rowAfter, text: '↓行', run: addRowAfter },
        { label: TABLE_PANEL_LABELS.columnBefore, text: '←列', run: addColumnBefore },
        { label: TABLE_PANEL_LABELS.columnAfter, text: '→列', run: addColumnAfter },
        { label: TABLE_PANEL_LABELS.deleteRow, text: '删行', run: deleteRow },
        { label: TABLE_PANEL_LABELS.deleteColumn, text: '删列', run: deleteColumn },
        { label: TABLE_PANEL_LABELS.toggleHeaderRow, text: '表头', run: toggleHeaderRow },
        { label: TABLE_PANEL_LABELS.deleteTable, text: '删表', run: deleteTable },
      ]
    },
  },
  mounted() {
    this.editor.on('transaction', this.schedule)

    // 编辑区自己会滚（.ProseMirror 上是 overflow-y: auto），面板要跟着表格走。
    this.scrollElement = markRaw(this.editor.view.dom as HTMLElement)
    this.scrollElement.addEventListener('scroll', this.schedule, { passive: true })
    window.addEventListener('resize', this.schedule)

    this.schedule()
  },
  beforeDestroy() {
    this.editor.off('transaction', this.schedule)
    this.scrollElement?.removeEventListener('scroll', this.schedule)
    window.removeEventListener('resize', this.schedule)
    if (this.frame) cancelAnimationFrame(this.frame)
  },
  methods: {
    run(command: TableCommand): void {
      command(this.editor)
    },

    update(): void {
      // isDestroyed 必须排在最前面：编辑器销毁后 view 是 null，
      // isEditable / isActive 都会去读 view 而抛错。
      const range =
        !this.editor.isDestroyed && this.editor.isEditable ? getActiveTableRange(this.editor) : null
      const element = range ? this.editor.view.nodeDOM(range.from) : null
      const host = element instanceof HTMLElement ? element.closest('.easy-editor__area') : null

      if (!(element instanceof HTMLElement) || !(host instanceof HTMLElement)) {
        this.visible = false
        return
      }

      const rect = element.getBoundingClientRect()
      const hostRect = host.getBoundingClientRect()
      const roomAbove = rect.top - hostRect.top
      const placeAbove = roomAbove >= PANEL_HEIGHT + GAP

      this.top = placeAbove ? roomAbove - PANEL_HEIGHT - GAP : rect.bottom - hostRect.top + GAP
      this.left = Math.max(0, rect.left - hostRect.left)
      this.visible = true
    },

    // 一次输入会发好几个事务，重算合并到下一帧。滚动和窗口缩放同理。
    schedule(): void {
      if (this.frame) return
      this.frame = requestAnimationFrame(() => {
        this.frame = 0
        this.update()
      })
    },
  },
})
</script>

<template>
  <div
    v-if="visible"
    class="easy-editor-table-panel"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="toolbar"
    :aria-label="labels.title"
  >
    <button
      v-for="action in actions"
      :key="action.label"
      type="button"
      class="easy-editor-table-panel__button"
      :title="action.label"
      :aria-label="action.label"
      @mousedown.prevent
      @click="run(action.run)"
    >
      {{ action.text }}
    </button>
  </div>
</template>
