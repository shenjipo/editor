import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'

import type { Extensions } from '@tiptap/core'

import { HEADING_LEVELS } from './constants'
import { EasyImage } from './image'
import { createMentionExtension } from './mention'
import type { HeadingLevel } from './constants'
import type { EasyMentionSource } from './mention'

export interface EasyEditorExtensionOptions {
  /** 占位文案。留空则不注册 Placeholder 扩展。 */
  placeholder?: string
  /** 要保留的标题级别，默认 [1, 2, 3]。 */
  headingLevels?: readonly HeadingLevel[]
  /**
   * 提及触发源。每个 source 对应一个符号（@ / # …），可同时配置多个。
   *
   * 不传时 schema 里没有 mention 节点——不需要提及功能的编辑器，
   * 文档模型和 v3 完全一致，不会凭空多出一个节点类型。
   */
  mentions?: readonly EasyMentionSource[]
}

/**
 * 代码高亮引擎。`common` 是 highlight.js 的常用语言集（37 种），
 * 在模块作用域建一次即可——它只是个语言注册表，无状态、可共享。
 */
const lowlight = createLowlight(common)

/**
 * 装配 easy-editor 的扩展集。
 *
 * 「核心包负责扩展装配」——谁来创建 Editor 实例都行（Vue / React / 原生），
 * 但 schema 只有这一处定义，保证各适配层产出的文档结构完全一致。
 *
 * 当前能力：
 * - 标题 H1-H3、有序列表、无序列表  → StarterKit 内置
 * - 粗体 / 斜体 / 下划线            → StarterKit 内置（strong / em / u）
 * - 撤销 / 重做                     → StarterKit 内置的 UndoRedo
 * - 字号、字体颜色、文本背景色      → TextStyleKit 内置
 * - 链接                            → StarterKit 内置的 Link
 * - 代码块 + 语法高亮               → CodeBlockLowlight（替掉 StarterKit 的 codeBlock）
 * - 图片（网络图 / base64 / 链接 / 宽度） → EasyImage
 * - 表格                            → TableKit
 * - 提及（@ / # 等自定义触发符）     → Mention（仅当传入 mentions 时注册）
 *
 * ## 关于 wangEditor v5 对齐
 *
 * 下面几处不是随手选的，是为了让 `getHTML()` 的产出能直接喂给 wangEditor v5
 * （它按 Slate 的模型解析 HTML，只认几种固定形状）：
 *
 * - **Link 去掉 `rel`**：Tiptap 默认写 `rel="noopener noreferrer nofollow"`，
 *   wangEditor 只写 `<a href target="_blank">`。取舍是显式的：为了对齐，放弃
 *   `noopener` 这层防护。这条 HTML 是编辑器里的「内容」，不是站点的导航链接。
 * - **图片 `inline: true`**：wangEditor 的图片是行内节点，产出 `<p><img></p>`。
 *   Tiptap 默认是块级，产出裸 `<img>`，反向解析时会被塞进段落里。行内模式两边对称。
 *   图片节点本身还替换成了 `EasyImage`（见 `./image`）——链接写 `data-href`、
 *   尺寸写 `style="width: 30%;"`，都是 wangEditor 的取数位置。
 * - **表格 `allowTableNodeSelection`**：让整张表可以被选中，工具栏据此判断
 *   「光标在表格里 / 表格被选中」——这正是 wangEditor 表格面板的触发条件。
 *
 * 不需要额外配置的两处（已核对 wangEditor 的解析源码，见 README「wangEditor 互通」）：
 * 单元格和列表项里的 `<p>` 包裹会被 wangEditor 过滤掉并回退到取纯文本，正文不丢；
 * 表格里的 `<colgroup>` 被它忽略。
 */
export function createEasyEditorExtensions(options: EasyEditorExtensionOptions = {}): Extensions {
  const { placeholder, headingLevels = HEADING_LEVELS, mentions } = options

  return [
    StarterKit.configure({
      heading: { levels: [...headingLevels] },
      // 交给 CodeBlockLowlight，避免同名的 codeBlock 注册两次。
      codeBlock: false,
      link: {
        // 编辑态点链接不该跳转——留在这里让用户改文字。wangEditor 也是这个行为。
        openOnClick: false,
        // 与 wangEditor 一致：只留 href 和 target。
        HTMLAttributes: { target: '_blank', rel: null, class: null },
      },
    }),
    // TextStyleKit 默认还会带 FontFamily / LineHeight，本期不做，关掉以免污染 schema。
    TextStyleKit.configure({
      fontFamily: false,
      lineHeight: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
      // 与 wangEditor 的 `class="language-xxx"` 同名同形。
      languageClassPrefix: 'language-',
      enableTabIndentation: true,
      tabSize: 2,
    }),
    EasyImage.configure({
      inline: true,
      // 默认的上传路径是 FileReader 转 base64，不开这个选项图片根本插不进去。
      allowBase64: true,
    }),
    TableKit.configure({
      table: {
        // 「宽度自适应」：不挂列宽拖拽手柄，列宽交给浏览器按内容算。
        resizable: false,
        allowTableNodeSelection: true,
      },
    }),
    ...(mentions?.length ? [createMentionExtension(mentions)] : []),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ]
}
