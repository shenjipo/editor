export {
  BACKGROUND_COLOR_PALETTE,
  DEFAULT_FONT_SIZE,
  EDITOR_ROOT_CLASS,
  FONT_SIZE_OPTIONS,
  HEADING_LEVELS,
  PARAGRAPH_VALUE,
  TEXT_COLOR_PALETTE,
} from './constants'
export type { BlockTypeValue, FontSizeValue, HeadingLevel } from './constants'

export { getActiveFormats } from './active-formats'
export { snapshotContent } from './snapshot'
export { createEasyEditorExtensions } from './extensions'
export type { EasyEditorExtensionOptions } from './extensions'

export {
  setBackgroundColor,
  setBlockType,
  setFontSize,
  setParagraph,
  setTextColor,
  toggleBulletList,
  toggleHeading,
  toggleOrderedList,
  unsetBackgroundColor,
  unsetFontSize,
  unsetTextColor,
} from './formatting'

export type { ActiveFormats, EditorContentSnapshot } from './types'
