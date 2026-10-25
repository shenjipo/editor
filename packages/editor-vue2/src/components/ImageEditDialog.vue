<script lang="ts">
import { defineComponent } from 'vue'

import { attachDismiss } from '../composables/dismiss'

import type { PropType } from 'vue'
import type { ImageEditDialogLabels } from '../labels'

/** 表单里的三个字段，与 wangEditor 图片节点存的 src / alt / href 一一对应。 */
export interface ImageFormValue {
  src: string
  alt: string
  href: string
}

export default defineComponent({
  name: 'ImageEditDialog',
  props: {
    open: { type: Boolean, default: false },
    labels: { type: Object as PropType<ImageEditDialogLabels>, required: true },
    /** 打开时用来回填表单的当前值。 */
    value: { type: Object as PropType<ImageFormValue | null>, default: null },
  },
  emits: ['apply', 'close'],
  data() {
    return {
      src: '',
      alt: '',
      href: '',
      detachDismiss: null as (() => void) | null,
    }
  },
  computed: {
    canApply(): boolean {
      return this.src.trim().length > 0
    },
  },
  watch: {
    // 每次打开都重新回填并聚焦。不清空的话，上一次改到一半的内容会留到下一次打开。
    open: {
      immediate: true,
      handler(open: boolean): void {
        if (!open) return

        this.src = this.value?.src ?? ''
        this.alt = this.value?.alt ?? ''
        this.href = this.value?.href ?? ''

        this.$nextTick(() => {
          const input = this.$refs.firstField as HTMLInputElement | undefined
          input?.focus()
        })
      },
    },
  },
  mounted() {
    this.detachDismiss = attachDismiss({
      root: () => this.$refs.root as unknown as HTMLElement,
      isOpen: () => this.open,
      close: () => {
        this.$emit('close')
      },
    })
  },
  beforeDestroy() {
    this.detachDismiss?.()
  },
  methods: {
    cancel(): void {
      this.$emit('close')
    },
    apply(): void {
      if (!this.canApply) return
      this.$emit('apply', {
        src: this.src.trim(),
        alt: this.alt.trim(),
        href: this.href.trim(),
      })
    },
  },
})
</script>

<template>
  <!--
    遮罩和卡片是两个元素，`root` 只指向卡片。
    于是「点在遮罩上」会被判定为点外部并关闭，
    而卡片内部（包括输入框）的 pointerdown 落在 root 里，不会误关。

    弹窗留在 .easy-editor 子树里，才能继承消费方覆盖的 --ee-* 主题变量；
    position: fixed 不受祖先 overflow: hidden 的裁剪。
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
        <button
          type="button"
          class="easy-editor-popover__primary"
          :disabled="!canApply"
          @click="apply"
        >
          {{ labels.apply }}
        </button>
      </div>
    </div>
  </div>
</template>
