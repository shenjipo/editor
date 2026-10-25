import { useEditor } from '@tiptap/vue-3'

import { createEasyEditorExtensions, snapshotContent } from '@easy-editor/core'

import type { Editor } from '@tiptap/vue-3'
import type { EasyMentionSource, EditorContentSnapshot } from '@easy-editor/core'
import type { JSONContent } from '@tiptap/core'
import type { ShallowRef } from 'vue'

export interface UseEasyEditorOptions {
  content?: string | JSONContent
  placeholder?: string
  editable?: boolean
  autofocus?: boolean
  /** 提及触发源；创建期选项，运行中改不生效。 */
  mentions?: readonly EasyMentionSource[]
  onChange?: (snapshot: EditorContentSnapshot) => void
}

/**
 * 创建一个绑定到当前组件生命周期的编辑器实例。
 *
 * 这里必须用 @tiptap/vue-3 的 useEditor，不能自己 new @tiptap/core 的 Editor：
 * vue-3 导出的是加了 reactiveState / contentComponent / appContext 的 Editor 子类，
 * 而 EditorContent 组件要的正是这个子类。核心包因此只负责「schema 怎么装配」
 * （createEasyEditorExtensions），实例的创建与销毁留给框架层——那是框架相关知识。
 *
 * SSR 安全是白拿的：vue-3 的 useEditor 无条件在 onMounted 里 new Editor，
 * 服务端渲染时组件走不到那个钩子，天然不会碰 DOM。
 * （v2 时代的 immediatelyRender 选项在 v3 已被移除，不要照旧文档传它。）
 */
export function useEasyEditor(options: UseEasyEditorOptions = {}): ShallowRef<Editor | undefined> {
  const { content = '', placeholder, editable = true, autofocus = false, mentions, onChange } = options

  return useEditor({
    extensions: createEasyEditorExtensions({ placeholder, mentions }),
    content,
    editable,
    autofocus,
    onUpdate: onChange ? ({ editor }) => onChange(snapshotContent(editor)) : undefined,
  })
}
