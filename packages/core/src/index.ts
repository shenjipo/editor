export {
  BACKGROUND_COLOR_PALETTE,
  CODE_BLOCK_LANGUAGES,
  DEFAULT_FONT_SIZE,
  EDITOR_ROOT_CLASS,
  FONT_SIZE_OPTIONS,
  HEADING_LEVELS,
  IMAGE_WIDTH_PRESETS,
  PARAGRAPH_VALUE,
  TABLE_SIZE_LIMIT,
  TEXT_COLOR_PALETTE,
} from './constants'
export type {
  BlockTypeValue,
  CodeBlockLanguage,
  FontSizeValue,
  HeadingLevel,
  ImageWidthPreset,
} from './constants'

export { getActiveFormats } from './active-formats'
export { getActiveImage } from './image'
export type { ActiveImage } from './image'
export { getActiveTableRange } from './table'
export type { NodeRange } from './table'
export { snapshotContent } from './snapshot'
export { createEasyEditorExtensions } from './extensions'
export type { EasyEditorExtensionOptions } from './extensions'
export { createMentionExtension } from './mention'
export type {
  EasyMentionSource,
  MentionItem,
  MentionItemsProvider,
  MentionSuggestionOptions,
} from './mention'

export {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  clearContent,
  deleteColumn,
  deleteImage,
  deleteRow,
  deleteTable,
  insertImage,
  insertTable,
  redo,
  setBackgroundColor,
  setBlockType,
  setCodeBlockLanguage,
  setFontSize,
  setImageWidth,
  setLink,
  setParagraph,
  setTextColor,
  toggleBold,
  toggleBulletList,
  toggleCodeBlock,
  toggleHeaderRow,
  toggleHeading,
  toggleItalic,
  toggleOrderedList,
  toggleUnderline,
  undo,
  unsetBackgroundColor,
  unsetFontSize,
  unsetLink,
  unsetTextColor,
  updateImage,
} from './formatting'
export type { InsertImageOptions, InsertTableOptions, UpdateImageOptions } from './formatting'

export type { ActiveFormats, EditorContentSnapshot } from './types'
