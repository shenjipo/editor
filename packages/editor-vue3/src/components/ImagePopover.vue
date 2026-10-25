<script setup lang="ts">
import { computed, ref } from 'vue'

import ToolbarButton from './ToolbarButton.vue'
import { useDismiss } from '../composables/use-dismiss'
import { readFileAsDataUrl } from '../utils/file'

import type { ImagePopoverLabels } from '../labels'

const props = withDefaults(
  defineProps<{
    labels: ImagePopoverLabels
    /** 可选的上传实现。不给就走 base64 内联。 */
    upload?: (file: File) => string | Promise<string>
    /** file input 的 accept，如 'image/*'。 */
    accept?: string
  }>(),
  { upload: undefined, accept: 'image/*' },
)

const emit = defineEmits<{
  insert: [payload: { src: string; alt: string }]
}>()

type Mode = 'url' | 'upload'

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const mode = ref<Mode>('url')
const url = ref('')
const alt = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')

const { close } = useDismiss({ root, isOpen })

function reset(): void {
  url.value = ''
  alt.value = ''
  file.value = null
  error.value = ''
  busy.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function toggle(): void {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    mode.value = 'url'
    reset()
  }
}

function pickFile(event: Event): void {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  error.value = ''
}

const canApply = computed(() => (mode.value === 'url' ? url.value.trim().length > 0 : file.value !== null))

async function apply(): Promise<void> {
  if (!canApply.value || busy.value) return

  if (mode.value === 'url') {
    emit('insert', { src: url.value.trim(), alt: alt.value.trim() })
    close()
    return
  }

  const picked = file.value
  if (!picked) return

  busy.value = true
  error.value = ''
  try {
    // 有 upload 就走调用方给的后端；没有就退回 base64 内联，开箱即用。
    const src = props.upload ? await props.upload(picked) : await readFileAsDataUrl(picked)
    emit('insert', { src, alt: alt.value.trim() })
    close()
  } catch {
    error.value = props.labels.readFailed
  } finally {
    busy.value = false
  }
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
