<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3'
import { watch } from 'vue'

import { clearContent, snapshotContent } from '@shenjipo/editor-core'

import EditorToolbar from './components/EditorToolbar.vue'
import ImagePanel from './components/ImagePanel.vue'
import TablePanel from './components/TablePanel.vue'
import { useEasyEditor } from './composables/use-easy-editor'
import { createMentionSources } from './mention'

import type { EditorContentSnapshot } from '@shenjipo/editor-core'
import type { MentionSource } from './mention'
import type { JSONContent } from '@tiptap/core'

/** v-model 的值可以收 HTML 字符串，也可以收 Tiptap JSON。 */
export type EditorValue = string | JSONContent

const props = withDefaults(
  defineProps<{
    /** v-model 绑定值，类型取决于 outputFormat。 */
    modelValue?: EditorValue | null
    /** 向外 emit 的格式。默认 'html'；要结构化持久化就传 'json'。 */
    outputFormat?: 'json' | 'html'
    placeholder?: string
    editable?: boolean
    autofocus?: boolean
    showToolbar?: boolean
    /**
     * 图片上传实现。传入时「本地上传」页签走它，返回图片地址；
     * 不传则退回 FileReader 读成 base64 内联——开箱即用，不需要后端。
     */
    uploadImage?: (file: File) => string | Promise<string>
    /** 图片文件选择框的 accept。 */
    imageAccept?: string
    /**
     * 提及触发源：每个 source 对应一个符号（@ / # …），可同时配多个。
     *
     * 不传则 schema 里没有 mention 节点。**创建期选项**——运行中改数组不会生效，
     * 因为扩展集只在编辑器创建时装配一次。
     */
    mentionSources?: readonly MentionSource[]
  }>(),
  {
    modelValue: null,
    outputFormat: 'html',
    placeholder: '',
    editable: true,
    autofocus: false,
    showToolbar: true,
    imageAccept: 'image/*',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: EditorValue]
  /** 每次内容变化都给出三种序列化结果，省得调用方再取一遍。 */
  change: [snapshot: EditorContentSnapshot]
}>()

/**
 * 记住我们最后一次 emit 出去的值。
 *
 * v-model 的回路是「emit → 父组件更新 prop → watch 触发」，所以每次输入都会重新灌回来。
 * 不做这个判断的话，每敲一个字都会 setContent 一次，光标会被重置到文档开头。
 */
let lastEmitted: EditorValue | null = null

function isSameContent(a: EditorValue | null | undefined, b: EditorValue | null | undefined): boolean {
  // 引用相等是常态（父组件原样回传），深比较只是兜底。
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a === 'string' || typeof b === 'string') return false
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * 框架层配置 → 核心包认识的形式：给每个触发源注入 Vue 弹层实现。
 * 只在 setup 里算一次，和扩展集的创建周期一致。
 */
const mentions = props.mentionSources?.length ? createMentionSources(props.mentionSources) : undefined

const editor = useEasyEditor({
  content: props.modelValue ?? '',
  placeholder: props.placeholder || undefined,
  editable: props.editable,
  autofocus: props.autofocus,
  mentions,
  onChange: (snapshot) => {
    const value: EditorValue = props.outputFormat === 'html' ? snapshot.html : snapshot.json
    lastEmitted = value
    emit('change', snapshot)
    emit('update:modelValue', value)
  },
})

// 外部改 v-model：只有内容真的不一样才写回编辑器，否则会打断正在输入的用户。
watch(
  () => props.modelValue,
  (next) => {
    const instance = editor.value
    if (!instance || next == null) return
    if (isSameContent(next, lastEmitted)) return

    instance.commands.setContent(next, { emitUpdate: false })
    lastEmitted = next
  },
)

watch(
  () => props.editable,
  (value) => {
    editor.value?.setEditable(value)
  },
)

defineExpose({
  /** 编辑器实例。注意 onMounted 之前是 undefined。 */
  editor,
  getSnapshot: () => (editor.value ? snapshotContent(editor.value) : null),
  focus: () => editor.value?.commands.focus(),
  clear: () => (editor.value ? clearContent(editor.value) : false),
})
</script>

<template>
  <div class="easy-editor" :class="{ 'is-disabled': !editable }">
    <EditorToolbar
      v-if="showToolbar && editor"
      :editor="editor"
      :upload-image="uploadImage"
      :image-accept="imageAccept"
    />

    <!-- 表格和图片的浮动面板都用 absolute 定位，锚点就是这一层，所以它必须 position: relative。 -->
    <div class="easy-editor__area">
      <EditorContent v-if="editor" class="easy-editor__content" :editor="editor" />
      <TablePanel v-if="editor" :editor="editor" />
      <ImagePanel v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
