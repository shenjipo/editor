<script setup lang="ts">
import { ref } from 'vue'

import { TABLE_SIZE_LIMIT } from '@easy-editor/core'

import ToolbarButton from './ToolbarButton.vue'
import { useDismiss } from '../composables/use-dismiss'

import type { InsertTablePopoverLabels } from '../labels'

defineProps<{ labels: InsertTablePopoverLabels }>()

const emit = defineEmits<{
  insert: [payload: { rows: number; cols: number; withHeaderRow: boolean }]
}>()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const withHeaderRow = ref(true)
/** 悬停到第几行第几列，null 表示鼠标不在网格上。 */
const hovered = ref<{ rows: number; cols: number } | null>(null)

const { close } = useDismiss({ root, isOpen })

const rows = TABLE_SIZE_LIMIT.rows
const cols = TABLE_SIZE_LIMIT.cols

function toggle(): void {
  isOpen.value = !isOpen.value
  if (isOpen.value) hovered.value = null
}

function isActive(row: number, col: number): boolean {
  const target = hovered.value
  return target !== null && row <= target.rows && col <= target.cols
}

function pick(): void {
  const target = hovered.value
  if (!target) return
  emit('insert', { rows: target.rows, cols: target.cols, withHeaderRow: withHeaderRow.value })
  close()
}
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
        <template v-for="row in rows" :key="row">
          <button
            v-for="col in cols"
            :key="col"
            type="button"
            class="easy-editor-table-grid__cell"
            :class="{ 'is-active': isActive(row, col) }"
            :aria-label="`${row} × ${col}`"
            @mouseenter="hovered = { rows: row, cols: col }"
            @click="pick"
          />
        </template>
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
