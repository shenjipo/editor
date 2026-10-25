import { isNodeSelection, mergeAttributes } from '@tiptap/core'
import { Image } from '@tiptap/extension-image'
import { NodeSelection, Plugin } from '@tiptap/pm/state'

import type { Editor } from '@tiptap/core'

/**
 * 图片节点。
 *
 * 在 `@tiptap/extension-image` 的基础上补两件事，都是为了和 wangEditor v5 对齐
 * （已核对它的 `elemToHtml` / `parseElemHtml`）：
 *
 * - **图片链接写在 `data-href` 上。** wangEditor 不把图片包进 `<a>`，而是把链接挂在
 *   `<img>` 自己的 `data-href` 属性上。包一层 `<a>` 看着更语义化，但它反向解析时
 *   只认 `data-href`，链接会丢。
 * - **尺寸写在 `style="width: 30%;"` 里。** 父类把 width 渲染成裸的 `width="…"` 属性，
 *   而 wangEditor 是从 inline style 里取 width / height 的，裸属性会被直接丢弃。
 *
 * 这两处也是 wangEditor 反向解析时**唯一**会保留的图片信息：它的解析器只读
 * `src` / `alt` / `data-href` / `style` 里的 width、height，其余属性一律丢弃
 * （连 `class` 都不留）。所以别往图片上加自定义属性——加了就要接受它在互通时消失，
 * 想让它在 wangEditor 那边活下来是做不到的。
 */

/** 图片节点的类型名。 */
const IMAGE_NODE_NAME = 'image'

/**
 * 从 inline style 串里取一条声明。
 *
 * 刻意照抄 wangEditor 的朴素解析（先按 `;` 切、再按 `:` 切、取第二段去空白），
 * 不用 `CSSStyleDeclaration`——那边会做规范化（统一大小写、补全简写、修掉多余空格），
 * 于是同一份 HTML 两边读出的宽度字符串可能不一样，互通就没法逐字节比较了。
 */
function readStyleValue(style: string | null, property: string): string {
  for (const declaration of (style ?? '').split(';')) {
    if (!declaration) continue
    const [name, value] = declaration.split(':')
    if (name.trim() === property) return (value ?? '').trim()
  }
  return ''
}

/**
 * 把宽度写成 wangEditor 的形状：`width: 30%;`。
 *
 * 冒号后的空格和结尾的分号都照抄它的输出，为的是两边对同一张图产出逐字节相同的 HTML。
 * 宽度为空串时返回空串——但 `style` 属性本身照写（wangEditor 总是写 `style=""`）。
 */
function writeStyleWidth(width: string): string {
  return width ? `width: ${width};` : ''
}

export const EasyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      // 父类的 width / height 是裸属性，这里改成从 style 里读写。
      // renderHTML 交空对象：这两个值由下面统一输出，不走「一个属性一个属性拼」的路径。
      width: {
        default: '',
        parseHTML: (element) => readStyleValue(element.getAttribute('style'), 'width'),
        renderHTML: () => ({}),
      },
      height: {
        default: '',
        parseHTML: (element) => readStyleValue(element.getAttribute('style'), 'height'),
        renderHTML: () => ({}),
      },
      // 图片链接。HTML 里是 data-href，attrs 里仍叫 href——名字跟语义走，不跟属性名走。
      href: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-href') ?? '',
        renderHTML: () => ({}),
      },
      // 父类的 title 保留在 attrs 里——粘贴进来的 HTML 带 title 时不至于当场丢掉。
      // 但不输出：wangEditor 的图片模型里没有 title，写出去也会被它解析时丢弃，
      // 我们的图片编辑表单也没有这一项。
    }
  },

  /**
   * 属性顺序固定为 src / alt / data-href / style，和 wangEditor 的 `elemToHtml` 一致。
   *
   * `alt` 和 `style` 即使为空也照写——wangEditor 总是写它们，两边形状一致才好比较。
   * 注意这里从 `node.attrs` 取值而不是用回调给的 `HTMLAttributes`：
   * 后者已经把各属性的 renderHTML 结果合并过一遍，而我们要完全控制输出。
   */
  renderHTML({ node }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, {
        src: node.attrs.src ?? '',
        alt: node.attrs.alt ?? '',
        'data-href': node.attrs.href ?? '',
        style: writeStyleWidth(node.attrs.width ?? ''),
      }),
    ]
  },

  /**
   * 点图片 = 选中它。
   *
   * 图片是 inline 节点，ProseMirror 默认把点击理解成「在它旁边落光标」，
   * NodeSelection 建不起来，图片工具面板就没有触发时机。
   * wangEditor 的图片是点一下进入选中态、hoverbar 浮出，这里对齐它。
   */
  addProseMirrorPlugins() {
    const name = this.name

    return [
      new Plugin({
        props: {
          handleClickOn: (view, _pos, node, nodePos, _event, direct) => {
            // direct 为 false 表示落点其实在子节点上。图片没有子节点，
            // 这个判断是防止别处的点击顺带把图片选掉。
            if (!direct || node.type.name !== name) return false

            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)))
            // 返回 true 表示这次点击已经处理完，别再走默认的落光标逻辑把它覆盖掉。
            return true
          },
        },
      }),
    ]
  },
})

/** 当前选中的图片。 */
export interface ActiveImage {
  /** 图片节点在文档中的位置区间，框架层拿 `from` 去 `view.nodeDOM(from)` 定位浮动面板。 */
  from: number
  to: number
  src: string
  alt: string
  /** 图片链接，对应 HTML 的 `data-href`。 */
  href: string
  /** 宽度，如 `30%`。未设置时是空串。 */
  width: string
}

/**
 * 当前被选中的图片，没有选中图片时返回 null。
 *
 * 只认「整张图被选中」（NodeSelection）这一种情况——图片面板的触发条件正是它。
 * 光标停在图片旁边不算：那时用户是在编辑文字，不该弹图片面板。
 *
 * 和 `getActiveTableRange` 一样，「选中的是什么」是文档结构问题而非 DOM 问题，
 * 所以它在核心包；框架层只拿结果去量尺寸、定位浮层。
 */
export function getActiveImage(editor: Editor): ActiveImage | null {
  const { selection } = editor.state
  if (!isNodeSelection(selection) || selection.node.type.name !== IMAGE_NODE_NAME) return null

  const { src, alt, href, width } = selection.node.attrs
  return {
    from: selection.from,
    to: selection.to,
    src: src ?? '',
    alt: alt ?? '',
    href: href ?? '',
    width: width ?? '',
  }
}
