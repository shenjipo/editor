import { NodeSelection } from '@tiptap/pm/state'

import type { Editor } from '@tiptap/core'

import { PARAGRAPH_VALUE } from './constants'
import { getActiveImage } from './image'
import type { BlockTypeValue, HeadingLevel } from './constants'

/**
 * 文档格式化命令。
 *
 * 这一层是核心包对外的「动作接口」：框架层拿到的是 `setTextColor(editor, '#f00')`
 * 这样语义明确的函数，而不是自己拼 `editor.chain().focus()...run()`——
 * 链式命令少写 `.focus()` 会丢光标、少写 `.run()` 会静默不生效，
 * 把这类陷阱收口在核心包一处。
 *
 * 每个函数都返回命令是否真正执行成功，UI 层可据此判断按钮可用性。
 */

/** 设置字号，如 '18px'。 */
export function setFontSize(editor: Editor, fontSize: string): boolean {
  return editor.chain().focus().setFontSize(fontSize).run()
}

/** 清除字号，回落到默认字号。 */
export function unsetFontSize(editor: Editor): boolean {
  return editor.chain().focus().unsetFontSize().run()
}

/** 设置字体颜色。 */
export function setTextColor(editor: Editor, color: string): boolean {
  return editor.chain().focus().setColor(color).run()
}

/** 清除字体颜色。 */
export function unsetTextColor(editor: Editor): boolean {
  return editor.chain().focus().unsetColor().run()
}

/** 设置文本背景色。 */
export function setBackgroundColor(editor: Editor, color: string): boolean {
  return editor.chain().focus().setBackgroundColor(color).run()
}

/** 清除文本背景色。 */
export function unsetBackgroundColor(editor: Editor): boolean {
  return editor.chain().focus().unsetBackgroundColor().run()
}

/** 切换标题级别。已在同一级别时会降回段落。 */
export function toggleHeading(editor: Editor, level: HeadingLevel): boolean {
  return editor.chain().focus().toggleHeading({ level }).run()
}

/** 转成普通段落。 */
export function setParagraph(editor: Editor): boolean {
  return editor.chain().focus().setParagraph().run()
}

/** 按工具栏的块类型值切换（'paragraph' 或 'h1' / 'h2' / 'h3'）。 */
export function setBlockType(editor: Editor, value: BlockTypeValue): boolean {
  if (value === PARAGRAPH_VALUE) {
    return setParagraph(editor)
  }
  return toggleHeading(editor, Number(value.slice(1)) as HeadingLevel)
}

/** 切换无序列表。 */
export function toggleBulletList(editor: Editor): boolean {
  return editor.chain().focus().toggleBulletList().run()
}

/** 切换有序列表。 */
export function toggleOrderedList(editor: Editor): boolean {
  return editor.chain().focus().toggleOrderedList().run()
}

/* ------------------------------------------------------------------ 行内样式 */

/**
 * 粗体 / 斜体 / 下划线。
 *
 * 渲染标签是 Tiptap 写死的 `<strong>` / `<em>` / `<u>`，正好和 wangEditor 一致，
 * 不用做任何替换。
 */
export function toggleBold(editor: Editor): boolean {
  return editor.chain().focus().toggleBold().run()
}

export function toggleItalic(editor: Editor): boolean {
  return editor.chain().focus().toggleItalic().run()
}

export function toggleUnderline(editor: Editor): boolean {
  return editor.chain().focus().toggleUnderline().run()
}

/* -------------------------------------------------------------------- 代码块 */

/** 切换代码块。 */
export function toggleCodeBlock(editor: Editor): boolean {
  return editor.chain().focus().toggleCodeBlock().run()
}

/**
 * 改当前代码块的语言。
 *
 * 用 updateAttributes 而不是 setCodeBlock：后者在已处于代码块时只做切换，
 * 会把整个代码块关掉——在语言下拉里选语言时那就是个 bug。
 */
export function setCodeBlockLanguage(editor: Editor, language: string): boolean {
  return editor.chain().focus().updateAttributes('codeBlock', { language: language || null }).run()
}

/* ---------------------------------------------------------------------- 链接 */

/**
 * 加链接。
 *
 * 两种情况分开处理，因为 Tiptap 的 setLink 只管 mark，不负责「选区为空」：
 * - 选区为空：把 URL 本身当链接文字插进去（wangEditor 也是这个行为）；
 * - 有选区：把链接套到选中的文字上。先 extendMarkRange 是为了让光标停在
 *   链接中间时再次修改 URL 能作用到整个链接，而不是只改光标那一段。
 */
export function setLink(editor: Editor, href: string): boolean {
  const url = href.trim()
  if (!url) return false

  if (editor.state.selection.empty) {
    return editor
      .chain()
      .focus()
      .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] })
      .run()
  }

  return editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

/** 去掉光标处的链接（保留文字）。 */
export function unsetLink(editor: Editor): boolean {
  return editor.chain().focus().extendMarkRange('link').unsetLink().run()
}

/* ---------------------------------------------------------------------- 图片 */

export interface InsertImageOptions {
  src: string
  alt?: string
}

/** 插入图片。src 可以是 http(s) URL，也可以是 base64 data URI。 */
export function insertImage(editor: Editor, options: InsertImageOptions): boolean {
  const src = options.src.trim()
  if (!src) return false
  return editor.chain().focus().setImage({ src, alt: options.alt ?? '' }).run()
}

export interface UpdateImageOptions {
  src: string
  alt?: string
  /** 图片链接，写进 HTML 的 `data-href`。 */
  href?: string
}

/**
 * 改被选中图片的属性，并且把「图片被选中」这个状态保住。
 *
 * 这里没有用 `updateAttributes`，也没有用 `chain()`——两个都是踩过的坑：
 *
 * - `updateAttributes` 内部走 `setNodeMarkup`，把节点整个换掉。ProseMirror 映射选区时
 *   NodeSelection 会退化成光标，于是图片面板下一帧就因为「没有选中的图片」自己消失，
 *   用户点一下 30% 面板就没了。
 * - 「先 updateAttributes 再 setNodeSelection」两段式能修好面板，但那是两个事务、
 *   撤消栈里两步，Ctrl+Z 要按两下才回到原样。
 *
 * 所以在一个事务里改完属性、再把 NodeSelection 建回来：面板原地不动，撤销也只记一步。
 * 属性没变时 `setNodeMarkup` 不产生步骤，事务退化成纯选区变更，不会污染撤销栈。
 */
function patchActiveImage(editor: Editor, attributes: Record<string, unknown>): boolean {
  const image = getActiveImage(editor)
  if (!image) return false

  const { state, view } = editor
  const node = state.doc.nodeAt(image.from)
  if (!node) return false

  const tr = state.tr
  tr.setNodeMarkup(image.from, undefined, { ...node.attrs, ...attributes })
  // 用改完之后的新 doc 建选区：只改属性，节点尺寸不变，image.from 仍然有效。
  tr.setSelection(NodeSelection.create(tr.doc, image.from))
  view.dispatch(tr)
  return true
}

/**
 * 改被选中图片的地址 / 描述 / 链接。
 *
 * 用「改属性」而不是「删掉再插一张」：撤销栈里是一步，用户的 Ctrl+Z 才符合直觉。
 */
export function updateImage(editor: Editor, options: UpdateImageOptions): boolean {
  const src = options.src.trim()
  // 地址是图片的立身之本，空了就整体不生效，免得把图改成破图、还顺手清掉链接和描述。
  if (!src) return false

  return patchActiveImage(editor, {
    src,
    alt: options.alt?.trim() ?? '',
    href: options.href?.trim() ?? '',
  })
}

/**
 * 设置被选中图片的宽度，如 `'30%'`。
 *
 * 接受任意 CSS 宽度串而不只是预设值：wangEditor 拖拽改尺寸时存的是 `'123.45px'`，
 * 将来这个编辑器加上拖拽手柄，值就直接是 px 了，接口不用改。
 */
export function setImageWidth(editor: Editor, width: string): boolean {
  return patchActiveImage(editor, { width })
}

/**
 * 删除被选中的图片。
 *
 * 没用 `deleteSelection`：那个命令依赖「当前选区恰好是被选中的那个节点」这个隐含前提，
 * 调用链里只要有人动过选区，它就会静默删掉别的东西。这里拿 `getActiveImage` 的区间显式删，
 * 没有选中图片时直接返回 false，调用方也能据此判断按钮该不该亮。
 */
export function deleteImage(editor: Editor): boolean {
  const image = getActiveImage(editor)
  if (!image) return false

  return editor.chain().focus().deleteRange({ from: image.from, to: image.to }).run()
}

/* ---------------------------------------------------------------------- 表格 */

export interface InsertTableOptions {
  rows?: number
  cols?: number
  withHeaderRow?: boolean
}

/** 插入表格。 */
export function insertTable(editor: Editor, options: InsertTableOptions = {}): boolean {
  return editor.chain().focus().insertTable(options).run()
}

/* 行列操作。光标在哪个单元格就以哪个为准，语义由 Tiptap 的表格命令定义。 */

export function addRowBefore(editor: Editor): boolean {
  return editor.chain().focus().addRowBefore().run()
}

export function addRowAfter(editor: Editor): boolean {
  return editor.chain().focus().addRowAfter().run()
}

export function deleteRow(editor: Editor): boolean {
  return editor.chain().focus().deleteRow().run()
}

export function addColumnBefore(editor: Editor): boolean {
  return editor.chain().focus().addColumnBefore().run()
}

export function addColumnAfter(editor: Editor): boolean {
  return editor.chain().focus().addColumnAfter().run()
}

export function deleteColumn(editor: Editor): boolean {
  return editor.chain().focus().deleteColumn().run()
}

/** 删除整张表。 */
export function deleteTable(editor: Editor): boolean {
  return editor.chain().focus().deleteTable().run()
}

/** 切换首行是否为表头（`<th>` / `<td>`）。 */
export function toggleHeaderRow(editor: Editor): boolean {
  return editor.chain().focus().toggleHeaderRow().run()
}

/* ------------------------------------------------------------------------ 文档 */

/**
 * 清空文档。
 *
 * 存在的意义是让框架层不必碰 `editor.chain()`：在 EasyEditor.vue 里直接拼
 * `chain().focus().clearContent(true).run()` 一样能跑，但那会绕开这层「动作接口」，
 * 也让「链式命令的坑收口在一处」这条约定出现例外。
 */
export function clearContent(editor: Editor): boolean {
  // 传 true 让它保留一个空段落——全空文档在 ProseMirror 里没法落光标。
  return editor.chain().focus().clearContent(true).run()
}

/* ------------------------------------------------------------------ 撤销重做 */

export function undo(editor: Editor): boolean {
  return editor.chain().focus().undo().run()
}

export function redo(editor: Editor): boolean {
  return editor.chain().focus().redo().run()
}
