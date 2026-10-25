<script lang="ts">
import { defineComponent } from 'vue'

import ToolbarButton from './ToolbarButton.vue'
import { attachDismiss } from '../composables/dismiss'

import type { PropType } from 'vue'
import type { LinkPopoverLabels } from '../labels'

export default defineComponent({
  name: 'LinkPopover',
  components: { ToolbarButton },
  props: {
    labels: { type: Object as PropType<LinkPopoverLabels>, required: true },
    /** 光标处已有的链接，null 表示当前不在链接上。 */
    current: { type: String as PropType<string | null>, default: null },
  },
  emits: ['apply', 'remove'],
  data() {
    return {
      isOpen: false,
      draft: '',
      detachDismiss: null as (() => void) | null,
    }
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
      if (!this.isOpen) return

      // 打开时把光标处的链接回填进去，改 URL 就不用重新敲一遍。
      this.draft = this.current ?? ''
      this.$nextTick(() => {
        const input = this.$refs.input as HTMLInputElement | undefined
        input?.select()
      })
    },
    apply(): void {
      const href = this.draft.trim()
      if (!href) return
      this.$emit('apply', href)
      this.isOpen = false
    },
    remove(): void {
      this.$emit('remove')
      this.isOpen = false
    },
  },
})
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
