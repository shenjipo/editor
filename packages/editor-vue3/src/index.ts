import './styles/editor.css'

export { default as EasyEditor } from './EasyEditor.vue'
export type { EditorValue } from './EasyEditor.vue'

export { default as EditorToolbar } from './components/EditorToolbar.vue'
export { default as TablePanel } from './components/TablePanel.vue'
export { default as ImagePanel } from './components/ImagePanel.vue'
export { default as ImageEditDialog } from './components/ImageEditDialog.vue'
export type { ImageFormValue } from './components/ImageEditDialog.vue'
export { default as ToolbarButton } from './components/ToolbarButton.vue'
export { default as ToolbarSelect } from './components/ToolbarSelect.vue'
export { default as ColorPopover } from './components/ColorPopover.vue'
export { default as LinkPopover } from './components/LinkPopover.vue'
export { default as ImagePopover } from './components/ImagePopover.vue'
export { default as InsertTablePopover } from './components/InsertTablePopover.vue'

export { useEasyEditor } from './composables/use-easy-editor'
export { useActiveFormats } from './composables/use-active-formats'
export { useDismiss } from './composables/use-dismiss'
export { createMentionSources } from './mention'
export type { MentionSource } from './mention'

export { readFileAsDataUrl } from './utils/file'

export {
  BLOCK_TYPE_OPTIONS,
  CODE_BLOCK_LANGUAGE_OPTIONS,
  FONT_SIZE_SELECT_OPTIONS,
  IMAGE_EDIT_DIALOG_LABELS,
  IMAGE_PANEL_LABELS,
  IMAGE_POPOVER_LABELS,
  INSERT_TABLE_POPOVER_LABELS,
  LINK_POPOVER_LABELS,
  MENTION_LABELS,
  TABLE_PANEL_LABELS,
  TOOLBAR_LABELS,
  TRANSPARENT_COLOR,
} from './labels'
export type {
  ImageEditDialogLabels,
  ImagePanelLabels,
  ImagePopoverLabels,
  InsertTablePopoverLabels,
  LinkPopoverLabels,
  MentionLabels,
  TablePanelLabels,
  ToolbarOption,
} from './labels'

// 核心包的 API 整体转发：消费方只依赖 @shenjipo/editor-vue3 一个包就够了。
export * from '@shenjipo/editor-core'
