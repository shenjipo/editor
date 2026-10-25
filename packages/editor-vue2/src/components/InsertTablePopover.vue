<script lang="ts">
import { defineComponent } from 'vue'

import { TABLE_SIZE_LIMIT } from '@easy-editor/core'

import ToolbarButton from './ToolbarButton.vue'
import { attachDismiss } from '../composables/dismiss'

import type { PropType } from 'vue'
import type { InsertTablePopoverLabels } from '../labels'

interface GridCell {
  key: string
  row: number
  col: number
}

export default defineComponent({
  name: 'InsertTablePopover',
  components: { ToolbarButton },
  props: {
    labels: { type: Object as PropType<InsertTablePopoverLabels>, required: true },
  },
  emits: ['insert'],
  data() {
    return {
      isOpen: false,
      withHeaderRow: true,
      /** 悬停到第几行第几列，null 表示鼠标不在网格上。 */
      hovered: null as { rows: number; cols: number } | null,
      detachDismiss: null as (() => void) | null,
      // Vue 2 的 <template v-for> 不能稳定挂 key，这里摊平成一维格子列表。
      cells: [] as GridCell[],
    }
  },
  created() {
    const cells: GridCell[] = []
    for (let row = 1; row <= TABLE_SIZE_LIMIT.rows; row += 1) {
      for (let col = 1; col <= TABLE_SIZE_LIMIT.cols; col += 1) {
        cells.push({ key: `${row}-${col}`, row, col })
      }
    }
    this.cells = cells
  },
  mounted() {
    this.detachDismiss = attachDismiss({
      root: () => this.$refs.root as unknown as HTMLElement,
      isOpen: () => this.isOpen,
      close: () => {
        this.isOpen = false
      },
    })
  },
  beforeDestroy() {
    this.detachDismiss?.()
  },
  methods: {
    toggle(): void {
      this.isOpen = !this.isOpen
      if (this.isOpen) this.hovered = null
    },
    isActive(row: number, col: number): boolean {
      const target = this.hovered
      return target !== null && row <= target.rows && col <= target.cols
    },
    pick(): void {
      const target = this.hovered
      if (!target) return
      this.$emit('insert', {
        rows: target.rows,
        cols: target.cols,
        withHeaderRow: this.withHeaderRow,
      })
      this.isOpen = false
    },
  },
})
</script>

<template>
  <div ref="root" class="easy-editor-popover">
    <ToolbarButton
      :label="labels.trigger"
      :class="{ 'is-open': isOpen }"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <rect
          x="2"
          y="2.6"
          width="12"
          height="10.8"
          rx="1.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
        />
        <path
          d="M2 6.2h12M2 9.8h12M6 2.6v10.8M10 2.6v10.8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.1"
        />
      </svg>
    </ToolbarButton>

    <div v-if="isOpen" class="easy-editor-popover__panel" role="dialog" :aria-label="labels.trigger">
      <div class="easy-editor-table-grid" @mouseleave="hovered = null">
        <button
          v-for="cell in cells"
          :key="cell.key"
          type="button"
          class="easy-editor-table-grid__cell"
          :class="{ 'is-active': isActive(cell.row, cell.col) }"
          :aria-label="`${cell.row} × ${cell.col}`"
          @mouseenter="hovered = { rows: cell.row, cols: cell.col }"
          @click="pick"
        />
      </div>

      <p class="easy-editor-table-grid__readout">
        {{ hovered ? `${hovered.rows} × ${hovered.cols}` : labels.trigger }}
      </p>

      <label class="easy-editor-checkbox">
        <input v-model="withHeaderRow" type="checkbox" />
        <span>{{ labels.headerRow }}</span>
      </label>
    </div>
  </div>
</template>
