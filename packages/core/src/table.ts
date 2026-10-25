import { findParentNodeClosestToPos, isNodeSelection } from '@tiptap/core'

import type { Editor } from '@tiptap/core'
// 注意从 @tiptap/pm/model 拿 Node，别从 @tiptap/core——后者会被 lib.dom 的 DOM `Node` 抢走。
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/** 一段在文档中的位置区间。 */
export interface NodeRange {
  /** 区间起点，也就是节点在父节点里的位置。 */
  from: number
  /** 区间终点（`from + nodeSize`）。 */
  to: number
}

function isTableNode(node: ProseMirrorNode): boolean {
  return node.type.name === 'table'
}

/**
 * 光标／选区所在表格在文档中的位置区间，不在表格里时返回 null。
 *
 * 「光标在哪张表里」是文档结构问题，不是 DOM 问题——所以它在核心包，不在 Vue 层。
 * 框架层只拿着这个 `from` 去 `view.nodeDOM(from)` 取 DOM、量尺寸、定位浮层。
 *
 * 两种命中方式都要处理：
 * - 光标停在某个单元格里 —— 从选区起点往上找最近的 table 祖先；
 * - 整张表被选中（TableKit 的 `allowTableNodeSelection`）—— 选区本身就是一个 table 节点，
 *   这时往上找是找不到的，因为 `from` 已经指向 table 的**前面**。
 */
export function getActiveTableRange(editor: Editor): NodeRange | null {
  const { selection } = editor.state

  if (isNodeSelection(selection) && isTableNode(selection.node)) {
    return { from: selection.from, to: selection.to }
  }

  const found = findParentNodeClosestToPos(editor.state.doc.resolve(selection.from), isTableNode)
  if (!found) return null

  return { from: found.pos, to: found.pos + found.node.nodeSize }
}
