<script setup lang="ts">
import {
  BACKGROUND_COLOR_PALETTE,
  setBackgroundColor,
  setBlockType,
  setFontSize,
  setTextColor,
  TEXT_COLOR_PALETTE,
  toggleBulletList,
  toggleOrderedList,
  unsetBackgroundColor,
  unsetFontSize,
  unsetTextColor,
} from '@easy-editor/core'

import ColorPopover from './ColorPopover.vue'
import ToolbarButton from './ToolbarButton.vue'
import ToolbarSelect from './ToolbarSelect.vue'
import { useActiveFormats } from '../composables/use-active-formats'
import { BLOCK_TYPE_OPTIONS, FONT_SIZE_SELECT_OPTIONS, TOOLBAR_LABELS } from '../labels'

import type { BlockTypeValue } from '@easy-editor/core'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{ editor: Editor }>()

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
  </div>
</template>
