# @shenjipo/editor-core

基于 [Tiptap 3](https://tiptap.dev)（ProseMirror）的**框架无关**富文本编辑器核心包。

负责 schema 装配、文档命令、光标状态计算和内容序列化；不依赖 Vue / React，也不创建 Editor 实例——实例生命周期由框架层或调用方负责。

## 安装

```bash
pnpm add @shenjipo/editor-core
```

如果要在非 Vue 环境里直接使用 Tiptap 的 `Editor`，再显式安装：

```bash
pnpm add @tiptap/core @tiptap/pm
```

## 使用

```ts
import { Editor } from '@tiptap/core'
import {
  createEasyEditorExtensions,
  setTextColor,
  toggleBold,
  snapshotContent,
} from '@shenjipo/editor-core'

const editor = new Editor({
  element: document.querySelector('#editor')!,
  extensions: createEasyEditorExtensions({ placeholder: '开始输入…' }),
})

toggleBold(editor)
setTextColor(editor, '#2563eb')
console.log(snapshotContent(editor)) // { json, html, text }
```

## 能力

- **扩展装配**：`createEasyEditorExtensions(options)`、`createMentionExtension(sources)`
- **块级 / 列表**：`setBlockType`、`toggleHeading`、`setParagraph`、`toggleBulletList`、`toggleOrderedList`
- **行内样式**：`toggleBold`、`toggleItalic`、`toggleUnderline`、`setFontSize`、`setTextColor`、`setBackgroundColor` 及对应的 `unset*`
- **代码块 / 链接 / 图片**：`toggleCodeBlock`、`setCodeBlockLanguage`、`setLink`、`unsetLink`、`insertImage`、`updateImage`、`setImageWidth`、`deleteImage`
- **表格**：`insertTable`、`addRowBefore/After`、`deleteRow`、`addColumnBefore/After`、`deleteColumn`、`deleteTable`、`toggleHeaderRow`
- **文档 / 历史**：`clearContent`、`undo`、`redo`
- **状态计算**：`getActiveFormats`、`getActiveTableRange`、`getActiveImage`、`snapshotContent`
- **常量**：`HEADING_LEVELS`、`FONT_SIZE_OPTIONS`、`DEFAULT_FONT_SIZE`、`TEXT_COLOR_PALETTE`、`BACKGROUND_COLOR_PALETTE`、`PARAGRAPH_VALUE`、`CODE_BLOCK_LANGUAGES`、`TABLE_SIZE_LIMIT`、`IMAGE_WIDTH_PRESETS`

完整列表见包入口的类型声明。

## 设计约定

- **命令封一层**：替调用方处理 Tiptap 链式命令的 `.focus()` / `.run()` 陷阱，避免丢光标或静默不生效。
- **只给值、不给长相**：字号、颜色等取值和文档命令在 core；下拉里显示什么文案、弹层长什么样，属于框架层。
- **不碰 DOM 与 IO**：图片上传、markdown 转换、文件读取都不在核心包，由调用方决定。
- **mention 只装配 schema 和 Suggestion 插件**：候选项来源与弹层渲染由适配层 / 调用方提供。

## 配套包

- [`@shenjipo/editor-vue3`](https://www.npmjs.com/package/@shenjipo/editor-vue3) — Vue 3 适配层（组件、工具栏、v-model）
- [`@shenjipo/editor-vue2`](https://www.npmjs.com/package/@shenjipo/editor-vue2) — Vue 2.7 适配层，props / emits / ref 方法与 Vue 3 版一致

## License

MIT
