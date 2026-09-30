import './styles/editor.css'

export { default as EasyEditor } from './EasyEditor.vue'
export type { EditorValue } from './EasyEditor.vue'

export { default as EditorToolbar } from './components/EditorToolbar.vue'
export { default as ToolbarButton } from './components/ToolbarButton.vue'
export { default as ToolbarSelect } from './components/ToolbarSelect.vue'
export { default as ColorPopover } from './components/ColorPopover.vue'

export { useEasyEditor } from './composables/use-easy-editor'
export { useActiveFormats } from './composables/use-active-formats'

export { BLOCK_TYPE_OPTIONS, FONT_SIZE_SELECT_OPTIONS, TOOLBAR_LABELS, TRANSPARENT_COLOR } from './labels'

// 核心包的 API 整体转发：消费方只依赖 @easy-editor/vue3 一个包就够了。
export * from '@easy-editor/core'
