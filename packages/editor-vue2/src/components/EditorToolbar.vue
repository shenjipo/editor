<script lang="ts">
import { defineComponent, markRaw } from 'vue'

import {
  BACKGROUND_COLOR_PALETTE,
  getActiveFormats,
  insertImage,
  insertTable,
  redo,
  setBackgroundColor,
  setBlockType,
  setCodeBlockLanguage,
  setFontSize,
  setLink,
  setTextColor,
  TEXT_COLOR_PALETTE,
  toggleBold,
  toggleBulletList,
  toggleCodeBlock,
  toggleItalic,
  toggleOrderedList,
  toggleUnderline,
  undo,
  unsetBackgroundColor,
  unsetFontSize,
  unsetLink,
  unsetTextColor,
} from '@shenjipo/editor-core'

import ColorPopover from './ColorPopover.vue'
import ImagePopover from './ImagePopover.vue'
import InsertTablePopover from './InsertTablePopover.vue'
import LinkPopover from './LinkPopover.vue'
import ToolbarButton from './ToolbarButton.vue'
import ToolbarSelect from './ToolbarSelect.vue'
import { NEUTRAL_FORMATS } from '../composables/active-formats'
import {
  BLOCK_TYPE_OPTIONS,
  CODE_BLOCK_LANGUAGE_OPTIONS,
  FONT_SIZE_SELECT_OPTIONS,
  IMAGE_POPOVER_LABELS,
  INSERT_TABLE_POPOVER_LABELS,
  LINK_POPOVER_LABELS,
  TOOLBAR_LABELS,
} from '../labels'

import type { PropType } from 'vue'
import type { ActiveFormats, BlockTypeValue, InsertImageOptions, InsertTableOptions } from '@shenjipo/editor-core'
import type { Editor } from '@tiptap/vue-2'

export default defineComponent({
  name: 'EditorToolbar',
  components: {
    ColorPopover,
    ImagePopover,
    InsertTablePopover,
    LinkPopover,
    ToolbarButton,
    ToolbarSelect,
  },
  props: {
    editor: { type: Object as PropType<Editor>, required: true },
    /** 自定义图片上传实现。不给就走 base64 内联。 */
    uploadImage: {
      type: Function as PropType<(file: File) => string | Promise<string>>,
      default: undefined,
    },
    /** 文件选择框的 accept。 */
    imageAccept: { type: String, default: 'image/*' },
  },
  data() {
    return {
      formats: { ...NEUTRAL_FORMATS } as ActiveFormats,
      // Options API 的模板访问不到模块作用域的导入，静态配置显式挂到实例上。
      labels: TOOLBAR_LABELS,
      blockTypeOptions: BLOCK_TYPE_OPTIONS,
      fontSizeOptions: FONT_SIZE_SELECT_OPTIONS,
      codeBlockLanguageOptions: CODE_BLOCK_LANGUAGE_OPTIONS,
      textColorPalette: TEXT_COLOR_PALETTE,
      backgroundColorPalette: BACKGROUND_COLOR_PALETTE,
      linkLabels: LINK_POPOVER_LABELS,
      insertTableLabels: INSERT_TABLE_POPOVER_LABELS,
      imageLabels: IMAGE_POPOVER_LABELS,
      // Editor 是带私有字段的 class：放进 data 会被 Vue 2 的 UnwrapRef 递归映射成
      // 丢掉原型方法的类型。这里用 any 存原始实例，再通过 computed 还原成 Editor。
      subscribedRaw: null as unknown,
    }
  },
  computed: {
    subscribed(): Editor | null {
      return this.subscribedRaw as Editor | null
    },
  },
  watch: {
    editor: {
      immediate: true,
      handler(editor: Editor | null): void {
        this.subscribe(editor)
      },
    },
  },
  beforeDestroy() {
    this.unsubscribe()
  },
  methods: {
    recompute(): void {
      const editor = this.subscribed
      if (editor) this.formats = getActiveFormats(editor)
    },
    subscribe(editor: Editor | null): void {
      this.unsubscribe()

      if (!editor) {
        this.formats = { ...NEUTRAL_FORMATS }
        return
      }

      // markRaw：放 data 里但别让 Vue 深度观察 Editor（内部有循环引用和 DOM）。
      this.subscribedRaw = markRaw(editor)
      editor.on('transaction', this.recompute)
      this.recompute()
    },
    unsubscribe(): void {
      const editor = this.subscribed
      if (!editor) return
      editor.off('transaction', this.recompute)
      this.subscribedRaw = null
    },

    handleUndo(): void {
      undo(this.editor)
    },
    handleRedo(): void {
      redo(this.editor)
    },
    handleBlockType(value: string): void {
      setBlockType(this.editor, value as BlockTypeValue)
    },
    /** 下拉里的空值代表「未设置」，走清除命令而不是设置命令。 */
    handleFontSize(value: string): void {
      if (value) {
        setFontSize(this.editor, value)
      } else {
        unsetFontSize(this.editor)
      }
    },
    handleBold(): void {
      toggleBold(this.editor)
    },
    handleItalic(): void {
      toggleItalic(this.editor)
    },
    handleUnderline(): void {
      toggleUnderline(this.editor)
    },
    handleTextColor(color: string): void {
      setTextColor(this.editor, color)
    },
    handleClearTextColor(): void {
      unsetTextColor(this.editor)
    },
    handleBackgroundColor(color: string): void {
      setBackgroundColor(this.editor, color)
    },
    handleClearBackgroundColor(): void {
      unsetBackgroundColor(this.editor)
    },
    handleBulletList(): void {
      toggleBulletList(this.editor)
    },
    handleOrderedList(): void {
      toggleOrderedList(this.editor)
    },
    handleLinkApply(href: string): void {
      setLink(this.editor, href)
    },
    handleLinkRemove(): void {
      unsetLink(this.editor)
    },
    handleInsertTable(options: InsertTableOptions): void {
      insertTable(this.editor, options)
    },
    handleInsertImage(payload: InsertImageOptions): void {
      insertImage(this.editor, payload)
    },
    handleCodeBlock(): void {
      toggleCodeBlock(this.editor)
    },
    handleCodeBlockLanguage(value: string): void {
      setCodeBlockLanguage(this.editor, value)
    },
  },
})
</script>

<template>
  <div class="easy-editor-toolbar" role="toolbar" :aria-label="labels.blockType">
    <ToolbarButton :label="labels.undo" :disabled="!formats.canUndo" @click="handleUndo">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M3.4 7.4h6a3.1 3.1 0 0 1 0 6.2H7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
        <path
          d="m6.2 4.4-3 3 3 3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </ToolbarButton>

    <ToolbarButton :label="labels.redo" :disabled="!formats.canRedo" @click="handleRedo">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M12.6 7.4h-6a3.1 3.1 0 0 0 0 6.2H9"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
        <path
          d="m9.8 4.4 3 3-3 3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </ToolbarButton>

    <span class="easy-editor-toolbar__divider" />

    <ToolbarSelect
      :model-value="formats.blockType"
      :options="blockTypeOptions"
      :label="labels.blockType"
      @update:model-value="handleBlockType"
    />

    <ToolbarSelect
      :model-value="formats.fontSize ?? ''"
      :options="fontSizeOptions"
      :label="labels.fontSize"
      @update:model-value="handleFontSize"
    />

    <span class="easy-editor-toolbar__divider" />

    <ToolbarButton :label="labels.bold" :active="formats.bold" @click="handleBold">
      <span class="easy-editor-glyph easy-editor-glyph--bold">B</span>
    </ToolbarButton>

    <ToolbarButton :label="labels.italic" :active="formats.italic" @click="handleItalic">
      <span class="easy-editor-glyph easy-editor-glyph--italic">I</span>
    </ToolbarButton>

    <ToolbarButton :label="labels.underline" :active="formats.underline" @click="handleUnderline">
      <span class="easy-editor-glyph easy-editor-glyph--underline">U</span>
    </ToolbarButton>

    <span class="easy-editor-toolbar__divider" />

    <ColorPopover
      variant="text"
      :label="labels.textColor"
      :clear-label="labels.clearColor"
      :custom-label="labels.customColor"
      :model-value="formats.color"
      :palette="textColorPalette"
      @select="handleTextColor"
      @clear="handleClearTextColor"
    />

    <ColorPopover
      variant="background"
      :label="labels.backgroundColor"
      :clear-label="labels.clearBackground"
      :custom-label="labels.customColor"
      :model-value="formats.backgroundColor"
      :palette="backgroundColorPalette"
      @select="handleBackgroundColor"
      @clear="handleClearBackgroundColor"
    />

    <span class="easy-editor-toolbar__divider" />

    <ToolbarButton
      :label="labels.bulletList"
      :active="formats.bulletList"
      @click="handleBulletList"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="2.4" cy="4" r="1.3" fill="currentColor" />
        <circle cx="2.4" cy="8" r="1.3" fill="currentColor" />
        <circle cx="2.4" cy="12" r="1.3" fill="currentColor" />
        <rect x="5.6" y="3.2" width="9" height="1.6" rx="0.8" fill="currentColor" />
        <rect x="5.6" y="7.2" width="9" height="1.6" rx="0.8" fill="currentColor" />
        <rect x="5.6" y="11.2" width="9" height="1.6" rx="0.8" fill="currentColor" />
      </svg>
    </ToolbarButton>

    <ToolbarButton
      :label="labels.orderedList"
      :active="formats.orderedList"
      @click="handleOrderedList"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <g fill="currentColor" font-size="5" font-family="ui-sans-serif, system-ui, sans-serif">
          <text x="0" y="5">1</text>
          <text x="0" y="9.6">2</text>
          <text x="0" y="14.2">3</text>
        </g>
        <rect x="5.2" y="3.2" width="9.4" height="1.6" rx="0.8" fill="currentColor" />
        <rect x="5.2" y="7.2" width="9.4" height="1.6" rx="0.8" fill="currentColor" />
        <rect x="5.2" y="11.2" width="9.4" height="1.6" rx="0.8" fill="currentColor" />
      </svg>
    </ToolbarButton>

    <span class="easy-editor-toolbar__divider" />

    <LinkPopover
      :labels="linkLabels"
      :current="formats.link"
      @apply="handleLinkApply"
      @remove="handleLinkRemove"
    />

    <InsertTablePopover :labels="insertTableLabels" @insert="handleInsertTable" />

    <ImagePopover
      :labels="imageLabels"
      :upload="uploadImage"
      :accept="imageAccept"
      @insert="handleInsertImage"
    />

    <ToolbarButton :label="labels.codeBlock" :active="formats.codeBlock" @click="handleCodeBlock">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="m5.4 4.6-3 3.4 3 3.4M10.6 4.6l3 3.4-3 3.4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </ToolbarButton>

    <!-- 语言下拉只在代码块里出现，和 wangEditor 一致：不在代码块里选语言没有意义。 -->
    <ToolbarSelect
      v-if="formats.codeBlock"
      :model-value="formats.codeBlockLanguage ?? ''"
      :options="codeBlockLanguageOptions"
      :label="labels.codeBlockLanguage"
      @update:model-value="handleCodeBlockLanguage"
    />
  </div>
</template>
