<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { deleteImage, getActiveImage, IMAGE_WIDTH_PRESETS, setImageWidth, updateImage } from '@shenjipo/editor-core'

import ImageEditDialog from './ImageEditDialog.vue'
import { IMAGE_EDIT_DIALOG_LABELS, IMAGE_PANEL_LABELS } from '../labels'

import type { ActiveImage } from '@shenjipo/editor-core'
import type { ImageFormValue } from './ImageEditDialog.vue'
import type { Editor } from '@tiptap/vue-3'

/**
 * 图片被选中时浮在图片上方的操作面板：宽度预设、编辑、删除。
 *
 * 交互形态照 wangEditor 的图片 hoverbar（它的菜单是 imageWidth30/50/100 +
 * editImage + deleteImage，这里一一对应，只把 viewImageLink 换成了编辑表单里的链接字段）。
 *
 * 分工和 TablePanel 一样：**「哪张图被选中、它的属性是什么」由核心包的 `getActiveImage` 回答**，
 * 这里只做剩下那半截纯 DOM 的活——取元素、量尺寸、决定浮在图片上方还是下方。
 *
 * 图片上方放不下时改放到下方，否则面板会被 `.easy-editor` 的 `overflow: hidden` 裁掉。
 */
const props = defineProps<{ editor: Editor }>()

/** 与 CSS 里 `.easy-editor-image-panel` 的高度保持一致，用来判断上方放不放得下。 */
const PANEL_HEIGHT = 34
const GAP = 6
/**
 * 面板宽度的兜底值，用来把面板横向居中并夹在编辑区内。
 * 首帧还没渲染出来、量不到实际宽度时用它，随后下一帧会按实测值再摆一次。
 */
const FALLBACK_PANEL_WIDTH = 240

const visible = ref(false)
const top = ref(0)
const left = ref(0)
/** 当前选中的图片。按钮拿它的 width 回显高亮，编辑弹窗拿它的 src/alt/href 回填表单。 */
const image = ref<ActiveImage | null>(null)
const editing = ref(false)
const panel = ref<HTMLElement | null>(null)
/** 已经排了一次「按实测宽度重摆」的补测，防止量不到宽度时无限排下去。 */
let remeasuring = false

function update(): void {
  const { editor } = props
  // isDestroyed 必须排在最前面：编辑器销毁后 view 是 null，
  // isEditable / 读 state 都会抛错。
  const active = !editor.isDestroyed && editor.isEditable ? getActiveImage(editor) : null
  image.value = active

  // 图片没了（被删掉、或者选区跑到别处）就把编辑弹窗一起收掉，
  // 否则它会在「没有选中图片」的状态下继续显示，点确定什么也不会发生。
  if (!active) {
    editing.value = false
    visible.value = false
    return
  }

  const element = editor.view.nodeDOM(active.from)
  const host = element instanceof HTMLElement ? element.closest('.easy-editor__area') : null

  if (!(element instanceof HTMLElement) || !(host instanceof HTMLElement)) {
    visible.value = false
    return
  }

  const rect = element.getBoundingClientRect()
  const hostRect = host.getBoundingClientRect()
  const roomAbove = rect.top - hostRect.top
  const placeAbove = roomAbove >= PANEL_HEIGHT + GAP

  top.value = placeAbove ? roomAbove - PANEL_HEIGHT - GAP : rect.bottom - hostRect.top + GAP

  // 横向居中在图片上，再夹在编辑区内——图片窄（30%）时面板会比图片宽，
  // 不做这个夹取的话靠右的图会把面板推到编辑区外面被裁掉。
  const width = panel.value?.offsetWidth || FALLBACK_PANEL_WIDTH
  const centered = rect.left - hostRect.left + (rect.width - width) / 2
  left.value = Math.min(Math.max(0, centered), Math.max(0, hostRect.width - width))

  visible.value = true

  // 首帧是拿兜底宽度摆的，渲染出来之后按实测宽度再摆一次。
  // remeasuring 保证最多补一次：万一量不到宽度，也不会在这里排出一个无限循环。
  if (!panel.value && !remeasuring) {
    remeasuring = true
    void nextTick(() => {
      remeasuring = false
      if (visible.value) update()
    })
  }
}

// 一次输入会发好几个事务，重算合并到下一帧。滚动和窗口缩放同理。
let frame = 0

function schedule(): void {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    update()
  })
}

let scrollElement: HTMLElement | null = null

onMounted(() => {
  const { editor } = props
  // 只订阅 'transaction'：光标的每一次移动、内容的每一次变化都会发它。
  // 'selectionUpdate' 是 Tiptap 为同一次变化补发的重复信号。
  editor.on('transaction', schedule)

  // 编辑区自己会滚（.ProseMirror 上是 overflow-y: auto），面板要跟着图片走。
  scrollElement = editor.view.dom as HTMLElement
  scrollElement.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)

  schedule()
})

onBeforeUnmount(() => {
  props.editor.off('transaction', schedule)
  scrollElement?.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  if (frame) cancelAnimationFrame(frame)
})

/**
 * 面板上的按钮都在编辑区外，按下会把焦点从编辑器抢走。
 * 用 mousedown.prevent 挡掉这次焦点转移，光标留在原处，click 照常触发。
 * 图片的 NodeSelection 也是这样才保得住——丢了它面板就自己关了。
 */
function applyEdit(value: ImageFormValue): void {
  updateImage(props.editor, value)
  editing.value = false
  // 表单在弹窗里，提交时焦点在弹窗上。把焦点还给编辑器，
  // 图片保持选中（核心包的 patchActiveImage 会把 NodeSelection 建回来），面板不闪。
  // 先判 isDestroyed：编辑器已经销毁时 view 是 null，直接读会抛。
  if (!props.editor.isDestroyed) props.editor.view.focus()
}

function remove(): void {
  deleteImage(props.editor)
}
</script>

<template>
  <div
    v-if="visible"
    ref="panel"
    class="easy-editor-image-panel"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="toolbar"
    :aria-label="IMAGE_PANEL_LABELS.title"
  >
    <button
      v-for="preset in IMAGE_WIDTH_PRESETS"
      :key="preset"
      type="button"
      class="easy-editor-image-panel__button"
      :class="{ 'is-active': image?.width === preset }"
      :title="`${IMAGE_PANEL_LABELS.width} ${preset}`"
      :aria-label="`${IMAGE_PANEL_LABELS.width} ${preset}`"
      :aria-pressed="image?.width === preset"
      @mousedown.prevent
      @click="setImageWidth(props.editor, preset)"
    >
      {{ preset }}
    </button>

    <span class="easy-editor-image-panel__divider" />

    <button
      type="button"
      class="easy-editor-image-panel__button"
      :title="IMAGE_PANEL_LABELS.edit"
      :aria-label="IMAGE_PANEL_LABELS.edit"
      @mousedown.prevent
      @click="editing = true"
    >
      编辑
    </button>

    <button
      type="button"
      class="easy-editor-image-panel__button easy-editor-image-panel__button--danger"
      :title="IMAGE_PANEL_LABELS.remove"
      :aria-label="IMAGE_PANEL_LABELS.remove"
      @mousedown.prevent
      @click="remove"
    >
      删除
    </button>
  </div>

  <ImageEditDialog
    :open="editing"
    :labels="IMAGE_EDIT_DIALOG_LABELS"
    :value="image"
    @apply="applyEdit"
    @close="editing = false"
  />
</template>
