<script setup lang="ts">
import {
  BACKGROUND_COLOR_PALETTE,
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
import { useActiveFormats } from '../composables/use-active-formats'
import {
  BLOCK_TYPE_OPTIONS,
  CODE_BLOCK_LANGUAGE_OPTIONS,
  FONT_SIZE_SELECT_OPTIONS,
  IMAGE_POPOVER_LABELS,
  INSERT_TABLE_POPOVER_LABELS,
  LINK_POPOVER_LABELS,
  TOOLBAR_LABELS,
} from '../labels'

import type { BlockTypeValue } from '@shenjipo/editor-core'
import type { Editor } from '@tiptap/vue-3'

const props = withDefaults(
  defineProps<{
    editor: Editor
    /** 自定义图片上传实现。不给就走 base64 内联。 */
    uploadImage?: (file: File) => string | Promise<string>
    /** 文件选择框的 accept。 */
    imageAccept?: string
  }>(),
  { uploadImage: undefined, imageAccept: 'image/*' },
)

const formats = useActiveFormats(() => props.editor)

function handleBlockType(value: string): void {
  setBlockType(props.editor, value as BlockTypeValue)
}

/** 下拉里的空值代表「未设置」，走清除命令而不是设置命令。 */
function handleFontSize(value: string): void {
  if (value) {
    setFontSize(props.editor, value)
  } else {
    unsetFontSize(props.editor)
  }
}
</script>

<template>
  <div class="easy-editor-toolbar" role="toolbar" :aria-label="TOOLBAR_LABELS.blockType">
    <ToolbarButton
      :label="TOOLBAR_LABELS.undo"
      :disabled="!formats.canUndo"
      @click="undo(props.editor)"
    >
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

    <ToolbarButton
      :label="TOOLBAR_LABELS.redo"
      :disabled="!formats.canRedo"
      @click="redo(props.editor)"
    >
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
      :options="BLOCK_TYPE_OPTIONS"
      :label="TOOLBAR_LABELS.blockType"
      @update:model-value="handleBlockType"
    />

    <ToolbarSelect
      :model-value="formats.fontSize ?? ''"
      :options="FONT_SIZE_SELECT_OPTIONS"
      :label="TOOLBAR_LABELS.fontSize"
      @update:model-value="handleFontSize"
    />

    <span class="easy-editor-toolbar__divider" />

    <ToolbarButton :label="TOOLBAR_LABELS.bold" :active="formats.bold" @click="toggleBold(props.editor)">
      <span class="easy-editor-glyph easy-editor-glyph--bold">B</span>
    </ToolbarButton>

    <ToolbarButton :label="TOOLBAR_LABELS.italic" :active="formats.italic" @click="toggleItalic(props.editor)">
      <span class="easy-editor-glyph easy-editor-glyph--italic">I</span>
    </ToolbarButton>

    <ToolbarButton
      :label="TOOLBAR_LABELS.underline"
      :active="formats.underline"
      @click="toggleUnderline(props.editor)"
    >
      <span class="easy-editor-glyph easy-editor-glyph--underline">U</span>
    </ToolbarButton>

    <span class="easy-editor-toolbar__divider" />

    <ColorPopover
      variant="text"
      :label="TOOLBAR_LABELS.textColor"
      :clear-label="TOOLBAR_LABELS.clearColor"
      :custom-label="TOOLBAR_LABELS.customColor"
      :model-value="formats.color"
      :palette="TEXT_COLOR_PALETTE"
      @select="(color) => setTextColor(props.editor, color)"
      @clear="unsetTextColor(props.editor)"
    />

    <ColorPopover
      variant="background"
      :label="TOOLBAR_LABELS.backgroundColor"
      :clear-label="TOOLBAR_LABELS.clearBackground"
      :custom-label="TOOLBAR_LABELS.customColor"
      :model-value="formats.backgroundColor"
      :palette="BACKGROUND_COLOR_PALETTE"
      @select="(color) => setBackgroundColor(props.editor, color)"
      @clear="unsetBackgroundColor(props.editor)"
    />

    <span class="easy-editor-toolbar__divider" />

    <ToolbarButton
      :label="TOOLBAR_LABELS.bulletList"
      :active="formats.bulletList"
      @click="toggleBulletList(props.editor)"
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
      :label="TOOLBAR_LABELS.orderedList"
      :active="formats.orderedList"
      @click="toggleOrderedList(props.editor)"
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
      :labels="LINK_POPOVER_LABELS"
      :current="formats.link"
      @apply="(href) => setLink(props.editor, href)"
      @remove="unsetLink(props.editor)"
    />

    <InsertTablePopover
      :labels="INSERT_TABLE_POPOVER_LABELS"
      @insert="(options) => insertTable(props.editor, options)"
    />

    <ImagePopover
      :labels="IMAGE_POPOVER_LABELS"
      :upload="uploadImage"
      :accept="imageAccept"
      @insert="(payload) => insertImage(props.editor, payload)"
    />

    <ToolbarButton
      :label="TOOLBAR_LABELS.codeBlock"
      :active="formats.codeBlock"
      @click="toggleCodeBlock(props.editor)"
    >
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
      :options="CODE_BLOCK_LANGUAGE_OPTIONS"
      :label="TOOLBAR_LABELS.codeBlockLanguage"
      @update:model-value="(value) => setCodeBlockLanguage(props.editor, value)"
    />
  </div>
</template>
