import type { Editor } from '@tiptap/core'

import type { EditorContentSnapshot } from './types'

/**
 * 把文档序列化成三种表示。
 *
 * 框架无关，也不持有任何状态——所以它在核心包里，而不是在某个适配层里。
 * Vue 适配层的 `change` 事件、持久化逻辑、日志，都从这里取同一份结果。
 */
export function snapshotContent(editor: Editor): EditorContentSnapshot {
  return {
    json: editor.getJSON(),
    html: editor.getHTML(),
    text: editor.getText({ blockSeparator: '\n\n' }),
  }
}
