<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useDismiss } from '../composables/use-dismiss'

import type { ImageEditDialogLabels } from '../labels'

/** 表单里的三个字段，与 wangEditor 图片节点存的 src / alt / href 一一对应。 */
export interface ImageFormValue {
  src: string
  alt: string
  href: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    labels: ImageEditDialogLabels
    /** 打开时用来回填表单的当前值。 */
    value?: ImageFormValue | null
  }>(),
  { value: null },
)

const emit = defineEmits<{
  apply: [value: ImageFormValue]
  close: []
}>()

const root = ref<HTMLElement | null>(null)
const firstField = ref<HTMLInputElement | null>(null)

const src = ref('')
const alt = ref('')
const href = ref('')

const canApply = computed(() => src.value.trim().length > 0)

/**
 * 抽屉是「受控」的：开关在 ImagePanel 手里，这里只负责报告「该关了」。
 *
 * 但 useDismiss 要的是一个可写的 Ref（它靠 `isOpen.value = false` 来关）。
 * 所以包一层可写 computed：读的是 prop，写回成 emit。
 * 这样「点外部关闭 + Esc 关闭」那套监听逻辑不用为一个弹窗重写一遍。
 */
const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    if (!value) emit('close')
  },
})

useDismiss({ root, isOpen })

// 每次打开都重新回填并聚焦。不清空的话，上一次改到一半的内容会留到下一次打开。
watch(
  () => props.open,
  (open) => {
    if (!open) return

    src.value = props.value?.src ?? ''
    alt.value = props.value?.alt ?? ''
    href.value = props.value?.href ?? ''

    void nextTick(() => firstField.value?.focus())
  },
  { immediate: true },
)

function cancel(): void {
  emit('close')
}

function apply(): void {
  if (!canApply.value) return
  emit('apply', { src: src.value.trim(), alt: alt.value.trim(), href: href.value.trim() })
}
</script>

<template>
  <!--
    遮罩和卡片是两个元素，`root` 只指向卡片。
    于是「点在遮罩上」会被 useDismiss 判定为点外部并关闭，
    而卡片内部（包括输入框）的 pointerdown 落在 root 里，不会误关。

    这里没有用 Teleport：弹窗留在 .easy-editor 子树里，才能继承消费方覆盖的
    --ee-* 主题变量（teleport 到 body 就断了这层继承）。position: fixed 不受
    祖先 overflow: hidden 的裁剪，所以留在这里也不会被编辑区裁掉。
  -->
  <div v-if="open" class="easy-editor-dialog" role="presentation">
    <div
      ref="root"
      class="easy-editor-dialog__panel"
      role="dialog"
      aria-modal="true"
      :aria-label="labels.title"
    >
      <h2 class="easy-editor-dialog__title">{{ labels.title }}</h2>

      <label class="easy-editor-dialog__field">
        <span class="easy-editor-dialog__label">{{ labels.src }}</span>
        <input
          ref="firstField"
          v-model="src"
          type="text"
          class="easy-editor-input"
          :placeholder="labels.srcPlaceholder"
          @keydown.enter.prevent="apply"
        />
      </label>

      <label class="easy-editor-dialog__field">
        <span class="easy-editor-dialog__label">{{ labels.alt }}</span>
        <input
          v-model="alt"
          type="text"
          class="easy-editor-input"
          :placeholder="labels.altPlaceholder"
          @keydown.enter.prevent="apply"
        />
      </label>

      <label class="easy-editor-dialog__field">
        <span class="easy-editor-dialog__label">{{ labels.href }}</span>
        <input
          v-model="href"
          type="text"
          class="easy-editor-input"
          :placeholder="labels.hrefPlaceholder"
          @keydown.enter.prevent="apply"
        />
      </label>

      <div class="easy-editor-popover__actions">
        <button type="button" class="easy-editor-popover__ghost" @click="cancel">
          {{ labels.cancel }}
        </button>
        <button type="button" class="easy-editor-popover__primary" :disabled="!canApply" @click="apply">
          {{ labels.apply }}
        </button>
      </div>
    </div>
  </div>
</template>
