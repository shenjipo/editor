<script lang="ts">
import { defineComponent } from 'vue'

import ToolbarButton from './ToolbarButton.vue'
import { attachDismiss } from '../composables/dismiss'
import { readFileAsDataUrl } from '../utils/file'

import type { PropType } from 'vue'
import type { ImagePopoverLabels } from '../labels'

type Mode = 'url' | 'upload'

export default defineComponent({
  name: 'ImagePopover',
  components: { ToolbarButton },
  props: {
    labels: { type: Object as PropType<ImagePopoverLabels>, required: true },
    /** 可选的上传实现。不给就走 base64 内联。 */
    upload: {
      type: Function as PropType<(file: File) => string | Promise<string>>,
      default: undefined,
    },
    /** file input 的 accept，如 'image/*'。 */
    accept: { type: String, default: 'image/*' },
  },
  emits: ['insert'],
  data() {
    return {
      isOpen: false,
      mode: 'url' as Mode,
      url: '',
      alt: '',
      file: null as File | null,
      busy: false,
      error: '',
      detachDismiss: null as (() => void) | null,
    }
  },
  computed: {
    canApply(): boolean {
      return this.mode === 'url' ? this.url.trim().length > 0 : this.file !== null
    },
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
    reset(): void {
      this.url = ''
      this.alt = ''
      this.file = null
      this.error = ''
      this.busy = false
      const input = this.$refs.fileInput as HTMLInputElement | undefined
      if (input) input.value = ''
    },
    toggle(): void {
      this.isOpen = !this.isOpen
      if (this.isOpen) {
        this.mode = 'url'
        this.reset()
      }
    },
    pickFile(event: Event): void {
      this.file = (event.target as HTMLInputElement).files?.[0] ?? null
      this.error = ''
    },
    async apply(): Promise<void> {
      if (!this.canApply || this.busy) return

      if (this.mode === 'url') {
        this.$emit('insert', { src: this.url.trim(), alt: this.alt.trim() })
        this.isOpen = false
        return
      }

      const picked = this.file
      if (!picked) return

      this.busy = true
      this.error = ''
      try {
        // 有 upload 就走调用方给的后端；没有就退回 base64 内联，开箱即用。
        const src = this.upload ? await this.upload(picked) : await readFileAsDataUrl(picked)
        this.$emit('insert', { src, alt: this.alt.trim() })
        this.isOpen = false
      } catch {
        this.error = this.labels.readFailed
      } finally {
        this.busy = false
      }
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
          x="1.8"
          y="2.8"
          width="12.4"
          height="10.4"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
        />
        <circle cx="5.6" cy="6.2" r="1.2" fill="currentColor" />
        <path
          d="M2.6 11.4 5.9 8.4l2.2 2 2-1.7 3.3 2.9"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </ToolbarButton>

    <div
      v-if="isOpen"
      class="easy-editor-popover__panel easy-editor-popover__panel--wide"
      role="dialog"
      :aria-label="labels.trigger"
    >
      <div class="easy-editor-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="easy-editor-tabs__item"
          :class="{ 'is-active': mode === 'url' }"
          :aria-selected="mode === 'url'"
          @click="mode = 'url'"
        >
          {{ labels.urlTab }}
        </button>
        <button
          type="button"
          role="tab"
          class="easy-editor-tabs__item"
          :class="{ 'is-active': mode === 'upload' }"
          :aria-selected="mode === 'upload'"
          @click="mode = 'upload'"
        >
          {{ labels.uploadTab }}
        </button>
      </div>

      <input
        v-if="mode === 'url'"
        v-model="url"
        type="url"
        class="easy-editor-input"
        :placeholder="labels.urlPlaceholder"
        :aria-label="labels.urlTab"
        @keydown.enter.prevent="apply"
      />
      <label v-else class="easy-editor-file">
        <input ref="fileInput" type="file" :accept="accept" @change="pickFile" />
        <span class="easy-editor-file__button">{{ labels.chooseFile }}</span>
        <span class="easy-editor-file__name">{{ file?.name ?? labels.noFile }}</span>
      </label>

      <input
        v-model="alt"
        type="text"
        class="easy-editor-input"
        :placeholder="labels.altPlaceholder"
        :aria-label="labels.alt"
        @keydown.enter.prevent="apply"
      />

      <p v-if="error" class="easy-editor-popover__error">{{ error }}</p>

      <div class="easy-editor-popover__actions">
        <button
          type="button"
          class="easy-editor-popover__primary"
          :disabled="!canApply || busy"
          @click="apply"
        >
          {{ busy ? labels.uploading : labels.apply }}
        </button>
      </div>
    </div>
  </div>
</template>
