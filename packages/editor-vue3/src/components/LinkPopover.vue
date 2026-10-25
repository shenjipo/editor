<script setup lang="ts">
import { nextTick, ref } from 'vue'

import ToolbarButton from './ToolbarButton.vue'
import { useDismiss } from '../composables/use-dismiss'

import type { LinkPopoverLabels } from '../labels'

const props = defineProps<{
  labels: LinkPopoverLabels
  /** 光标处已有的链接，null 表示当前不在链接上。 */
  current: string | null
}>()

const emit = defineEmits<{
  apply: [href: string]
  remove: []
}>()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const draft = ref('')

const { close } = useDismiss({ root, isOpen })

function toggle(): void {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return

  // 打开时把光标处的链接回填进去，改 URL 就不用重新敲一遍。
  draft.value = props.current ?? ''
  void nextTick(() => input.value?.select())
}

function apply(): void {
  const href = draft.value.trim()
  if (!href) return
  emit('apply', href)
  close()
}

function remove(): void {
  emit('remove')
  close()
}
</script>

<template>
  <div ref="root" class="easy-editor-popover">
    <ToolbarButton
      :label="labels.trigger"
      :active="current !== null"
      :class="{ 'is-open': isOpen }"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.3-2.3a2.6 2.6 0 0 0-3.7-3.7l-1 1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
        <path
          d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.4 8.9a2.6 2.6 0 0 0 3.7 3.7l1-1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
    </ToolbarButton>

    <div v-if="isOpen" class="easy-editor-popover__panel" role="dialog" :aria-label="labels.trigger">
      <input
        ref="input"
        v-model="draft"
        type="url"
        class="easy-editor-input"
        :placeholder="labels.placeholder"
        :aria-label="labels.trigger"
        @keydown.enter.prevent="apply"
      />
      <div class="easy-editor-popover__actions">
        <button type="button" class="easy-editor-popover__primary" @click="apply">
          {{ labels.apply }}
        </button>
        <button v-if="current" type="button" class="easy-editor-popover__ghost" @click="remove">
          {{ labels.remove }}
        </button>
      </div>
    </div>
  </div>
</template>
