<script lang="ts">
import { defineComponent, markRaw } from 'vue'

import {
  deleteImage,
  getActiveImage,
  IMAGE_WIDTH_PRESETS,
  setImageWidth,
  updateImage,
} from '@shenjipo/editor-core'

import ImageEditDialog from './ImageEditDialog.vue'
import { IMAGE_EDIT_DIALOG_LABELS, IMAGE_PANEL_LABELS } from '../labels'

import type { PropType } from 'vue'
import type { ActiveImage } from '@shenjipo/editor-core'
import type { Editor } from '@tiptap/vue-2'
import type { ImageFormValue } from './ImageEditDialog.vue'

/** 与 CSS 里 `.easy-editor-image-panel` 的高度保持一致，用来判断上方放不放得下。 */
const PANEL_HEIGHT = 34
const GAP = 6
/**
 * 面板宽度的兜底值，用来把面板横向居中并夹在编辑区内。
 * 首帧还没渲染出来、量不到实际宽度时用它，随后下一帧会按实测值再摆一次。
 */
const FALLBACK_PANEL_WIDTH = 240

export default defineComponent({
  name: 'ImagePanel',
  components: { ImageEditDialog },
  props: {
    editor: { type: Object as PropType<Editor>, required: true },
  },
  data() {
    return {
      visible: false,
      top: 0,
      left: 0,
      /** 当前选中的图片。按钮拿它的 width 回显高亮，编辑弹窗拿它的 src/alt/href 回填表单。 */
      image: null as ActiveImage | null,
      editing: false,
      labels: IMAGE_PANEL_LABELS,
      dialogLabels: IMAGE_EDIT_DIALOG_LABELS,
      widthPresets: IMAGE_WIDTH_PRESETS,
      // 内部调度字段，模板不使用。
      frame: 0,
      scrollElement: null as HTMLElement | null,
      remeasuring: false,
    }
  },
  mounted() {
    this.editor.on('transaction', this.schedule)

    // 编辑区自己会滚（.ProseMirror 上是 overflow-y: auto），面板要跟着图片走。
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
    update(): void {
      // isDestroyed 必须排在最前面：编辑器销毁后 view 是 null，
      // isEditable / 读 state 都会抛错。
      const active =
        !this.editor.isDestroyed && this.editor.isEditable ? getActiveImage(this.editor) : null
      this.image = active

      // 图片没了（被删掉、或者选区跑到别处）就把编辑弹窗一起收掉，
      // 否则它会在「没有选中图片」的状态下继续显示，点确定什么也不会发生。
      if (!active) {
        this.editing = false
        this.visible = false
        return
      }

      const element = this.editor.view.nodeDOM(active.from)
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

      // 横向居中在图片上，再夹在编辑区内——图片窄（30%）时面板会比图片宽，
      // 不做这个夹取的话靠右的图会把面板推到编辑区外面被裁掉。
      const panel = this.$refs.panel as HTMLElement | undefined
      const width = panel?.offsetWidth || FALLBACK_PANEL_WIDTH
      const centered = rect.left - hostRect.left + (rect.width - width) / 2
      this.left = Math.min(Math.max(0, centered), Math.max(0, hostRect.width - width))

      this.visible = true

      // 首帧是拿兜底宽度摆的，渲染出来之后按实测宽度再摆一次。
      // remeasuring 保证最多补一次：万一量不到宽度，也不会排出无限循环。
      if (!panel && !this.remeasuring) {
        this.remeasuring = true
        this.$nextTick(() => {
          this.remeasuring = false
          if (this.visible) this.update()
        })
      }
    },

    // 一次输入会发好几个事务，重算合并到下一帧。滚动和窗口缩放同理。
    schedule(): void {
      if (this.frame) return
      this.frame = requestAnimationFrame(() => {
        this.frame = 0
        this.update()
      })
    },

    applyEdit(value: ImageFormValue): void {
      updateImage(this.editor, value)
      this.editing = false
      // 表单在弹窗里，提交时焦点在弹窗上。把焦点还给编辑器，
      // 图片保持选中（核心包的 patchActiveImage 会把 NodeSelection 建回来），面板不闪。
      if (!this.editor.isDestroyed) this.editor.view.focus()
    },

    applyWidth(preset: string): void {
      setImageWidth(this.editor, preset)
    },

    remove(): void {
      deleteImage(this.editor)
    },
  },
})
</script>

<template>
  <div
    v-if="visible"
    ref="panel"
    class="easy-editor-image-panel"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="toolbar"
    :aria-label="labels.title"
  >
    <button
      v-for="preset in widthPresets"
      :key="preset"
      type="button"
      class="easy-editor-image-panel__button"
      :class="{ 'is-active': image?.width === preset }"
      :title="`${labels.width} ${preset}`"
      :aria-label="`${labels.width} ${preset}`"
      :aria-pressed="image?.width === preset"
      @mousedown.prevent
      @click="applyWidth(preset)"
    >
      {{ preset }}
    </button>

    <span class="easy-editor-image-panel__divider" />

    <button
      type="button"
      class="easy-editor-image-panel__button"
      :title="labels.edit"
      :aria-label="labels.edit"
      @mousedown.prevent
      @click="editing = true"
    >
      编辑
    </button>

    <button
      type="button"
      class="easy-editor-image-panel__button easy-editor-image-panel__button--danger"
      :title="labels.remove"
      :aria-label="labels.remove"
      @mousedown.prevent
      @click="remove"
    >
      删除
    </button>

    <!-- Vue 2 的模板只能有一个根节点；弹窗是 position: fixed，放在面板内部不影响工具栏布局。 -->
    <ImageEditDialog
      :open="editing"
      :labels="dialogLabels"
      :value="image"
      @apply="applyEdit"
      @close="editing = false"
    />
  </div>
</template>
