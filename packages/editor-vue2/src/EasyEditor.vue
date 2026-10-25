<script lang="ts">
import { defineComponent, markRaw } from 'vue'

import { Editor } from '@tiptap/vue-2'

import { clearContent, createEasyEditorExtensions, snapshotContent } from '@shenjipo/editor-core'

import EditorToolbar from './components/EditorToolbar.vue'
import ImagePanel from './components/ImagePanel.vue'
import TablePanel from './components/TablePanel.vue'
import { createMentionSources } from './mention'

import type { PropType } from 'vue'
import type { EditorContentSnapshot } from '@shenjipo/editor-core'
import type { JSONContent } from '@tiptap/core'
import type { MentionSource } from './mention'

/** v-model 的值可以收 HTML 字符串，也可以收 Tiptap JSON。 */
export type EditorValue = string | JSONContent

/**
 * 记住我们最后一次 emit 出去的值。
 *
 * v-model 的回路是「emit → 父组件更新 prop → watch 触发」，所以每次输入都会重新灌回来。
 * 不做这个判断的话，每敲一个字都会 setContent 一次，光标会被重置到文档开头。
 */
function isSameContent(
  a: EditorValue | null | undefined,
  b: EditorValue | null | undefined,
): boolean {
  // 引用相等是常态（父组件原样回传），深比较只是兜底。
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a === 'string' || typeof b === 'string') return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export default defineComponent({
  name: 'EasyEditor',
  components: { EditorToolbar, ImagePanel, TablePanel },
  // Vue 2 的 v-model 默认监听 value/input；这里显式映射到与 Vue 3 适配层一致的 API。
  model: { prop: 'modelValue', event: 'update:model-value' },
  props: {
    modelValue: { type: [String, Object] as PropType<EditorValue | null>, default: null },
    outputFormat: { type: String as PropType<'json' | 'html'>, default: 'html' },
    placeholder: { type: String, default: '' },
    editable: { type: Boolean, default: true },
    autofocus: { type: Boolean, default: false },
    showToolbar: { type: Boolean, default: true },
    /**
     * 图片上传实现。传入时「本地上传」页签走它，返回图片地址；
     * 不传则退回 FileReader 读成 base64 内联——开箱即用，不需要后端。
     */
    uploadImage: {
      type: Function as PropType<(file: File) => string | Promise<string>>,
      default: undefined,
    },
    /** 图片文件选择框的 accept。 */
    imageAccept: { type: String, default: 'image/*' },
    /**
     * 提及触发源：每个 source 对应一个符号（@ / # …），可同时配多个。
     *
     * 不传则 schema 里没有 mention 节点。**创建期选项**——运行中改数组不会生效，
     * 因为扩展集只在编辑器创建时装配一次。
     */
    mentionSources: {
      type: Array as PropType<readonly MentionSource[]>,
      default: () => [],
    },
  },
  emits: ['update:model-value', 'change'],
  data() {
    return {
      // Editor 是带私有字段的 class：放进 data 会被 Vue 2 的 UnwrapRef 递归映射成
      // 丢掉原型方法的类型。这里用 any 存原始实例，再通过 computed 还原成 Editor。
      editorRaw: null as unknown,
      lastEmitted: null as EditorValue | null,
    }
  },
  computed: {
    editor(): Editor | null {
      return this.editorRaw as Editor | null
    },
  },
  watch: {
    // 外部改 v-model：只有内容真的不一样才写回编辑器，否则会打断正在输入的用户。
    modelValue(next: EditorValue | null): void {
      const instance = this.editor
      if (!instance || next == null) return
      if (isSameContent(next, this.lastEmitted)) return

      instance.commands.setContent(next, { emitUpdate: false })
      this.lastEmitted = next
    },
    editable(value: boolean): void {
      this.editor?.setEditable(value)
    },
  },
  mounted() {
    /**
     * Vue 2 没有 @tiptap/vue-3 的 useEditor，也不强制走 EditorContent：
     * 直接把宿主元素交给核心 Editor，Tiptap 会把 .ProseMirror 挂进去。
     * 这一步必须在 mounted 之后，ref 指向的 DOM 才存在。
     */
    const element = this.$refs.contentEl as HTMLElement

    const mentions = this.mentionSources.length
      ? createMentionSources(this.mentionSources)
      : undefined

    const instance = new Editor({
      element,
      extensions: createEasyEditorExtensions({
        placeholder: this.placeholder || undefined,
        mentions,
      }),
      content: this.modelValue ?? '',
      editable: this.editable,
      autofocus: this.autofocus,
      onUpdate: ({ editor }) => {
        const snapshot = snapshotContent(editor)
        const value: EditorValue = this.outputFormat === 'html' ? snapshot.html : snapshot.json
        this.lastEmitted = value
        this.$emit('change', snapshot)
        this.$emit('update:model-value', value)
      },
    })

    // markRaw：Editor 内部有循环引用和 DOM，不能让 Vue 深度观察它。
    this.editorRaw = markRaw(instance)
  },
  beforeDestroy() {
    this.editor?.destroy()
  },
  methods: {
    /** 编辑器实例。注意 mounted 之前是 null。 */
    getSnapshot(): EditorContentSnapshot | null {
      return this.editor ? snapshotContent(this.editor) : null
    },
    focus(): void {
      this.editor?.commands.focus()
    },
    clear(): boolean {
      return this.editor ? clearContent(this.editor) : false
    },
  },
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
      <div ref="contentEl" class="easy-editor__content"></div>
      <TablePanel v-if="editor" :editor="editor" />
      <ImagePanel v-if="editor" :editor="editor" />
    </div>
  </div>
</template>
