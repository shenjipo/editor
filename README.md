# easy-editor

基于 [Tiptap](https://tiptap.dev)（ProseMirror）的富文本编辑器，提供 **Vue 3** 与 **Vue 2.7** 两套适配层，pnpm monorepo 组织。核心包框架无关，两套适配层的 schema、命令、v-model 行为完全一致。

当前能力：

- **行内样式** — 粗体、斜体、下划线、字号、字体颜色、文本背景色
- **块级** — 正文 / H1-H3、有序列表、无序列表、代码块（带语言选择与语法高亮）
- **插入** — 链接、网络图片、本地图片（base64 或自定义上传）、表格
- **表格操作** — 光标进入表格时浮出面板：插入/删除行列、切换表头行、删除表格
- **图片操作** — 点中图片时浮出面板：宽度预设（30% / 50% / 100%）、编辑、删除；
  编辑走弹窗表单，改图片地址 / 描述 / 链接
- **提及** — `@` / `#` 等自定义触发符唤出候选列表，数据由调用方提供（可异步），
  支持键盘上下键、鼠标点击选择
- **历史** — 撤销、重做

HTML 产出对齐 [wangEditor v5](https://www.wangeditor.com/)，v-model 数据可以和它互相倒 —— 见 [wangEditor 互通](#wangeditor-互通)。

## 目录结构

```
packages/
├── core/           @easy-editor/core  框架无关：扩展装配、文档命令、编辑器状态计算
├── editor-vue3/    @easy-editor/vue3  Vue 3 适配层：编辑器组件、工具栏 UI、v-model
├── editor-vue2/    @easy-editor/vue2  Vue 2.7 适配层：与 vue3 同功能、同 v-model 语义
├── demo-vue3/      Vue 3 演示工程（private，Vite 8）
└── demo-vue2/      Vue 2.7 演示工程（private，Vite 4）
```

**依赖方向严格单向：`demo-* → editor-vue* → core`。** 核心包永不反向依赖任何框架包；两个适配层之间也互不依赖（样式与文案各自维护一份，改动时保持同步）。

## 分层契约

把编辑器的「智能」和「长相」拆到两个包里，中间用一条窄接口连接。

| | 负责 | 不负责 |
| --- | --- | --- |
| **core** | schema 装配、文档命令（设字号 / 颜色 / 切换标题 / 表格增删行列 / 改图片 / 插入提及…）、光标处格式状态与「选了哪个节点」的计算、内容序列化 | ❌ 不创建 UI 组件、❌ 不 import vue、❌ 不管实例生命周期、❌ 不碰 `FileReader` / 上传、❌ 不做 markdown 转换 |
| **editor-vue3** | 组件生命周期 ↔ Editor 实例、v-model 双向绑定、工具栏 UI、下拉与弹层、表格/图片浮动面板、图片编辑弹窗、图片上传、提及候选弹层、样式 | ❌ 不定义 schema、❌ 不直接拼 `editor.chain()` |
| **editor-vue2** | 同上；用 `@tiptap/vue-2` + Vue 2.7 Options API 实现，对外 prop / 事件语义与 vue3 对齐 | ❌ 不定义 schema、❌ 不直接拼 `editor.chain()` |

图片上传是这条边界的典型例子：核心包只负责「把图片插进文档」这个命令，
文件怎么读、传到哪去（base64 还是后端）全在 `editor-vue3/src/utils/file.ts`
和 `ImagePopover.vue` 里，换框架要重写的是那一层。

markdown 同理：`markdown → HTML` 是**调用方**的事（demo 里用 `marked` 做演示），
编辑器收的始终是 HTML。所以 `marked` 是 demo 的依赖，两个发布包都不依赖它 ——
否则等于替消费方选定了 markdown 实现，而他们可能用 markdown-it、remark 或者后端转。

### 判定规则：新功能该放哪层？

依次问三个问题，**任一命中就放框架层**：

1. 它需要渲染 DOM 组件吗？
2. 它需要知道「有哪些候选项」或其数据来源吗？
3. 把它换成 React 之后，这个功能还需要重新实现吗？

三条全是「否」→ 核心包。

按这条规则：**哪些字号可用**（值）在 core，**字号下拉里显示成 `12` 还是「小四」**（长相）在 `editor-vue3/src/labels.ts`。想接 i18n 就换那个文件，core 一行不用动。

### 为什么 Editor 实例由框架层创建

`@tiptap/vue-3` 导出的是 `class Editor extends Editor`（core 的 `Editor`），额外带 `reactiveState` / `contentComponent` / `appContext` 等字段，而 `EditorContent` 组件要的正是这个子类。所以 core 只提供 `createEasyEditorExtensions()` 负责「schema 怎么装配」，实例的创建与销毁留给框架层——那是框架相关知识。

同理，`useEasyEditor` 用的是 `@tiptap/vue-3` 的 `useEditor`，不能自己 `new @tiptap/core` 的 `Editor`。

Vue 2 适配层走的是另一条等价路径：`@tiptap/vue-2` 没有 `useEditor`，所以 `EasyEditor` 在
`mounted` 里把宿主元素交给 `new Editor({ element })`，在 `beforeDestroy` 里销毁。它不使用
`EditorContent`，也不依赖 Vue 2 的渲染器去同步编辑器 DOM——实例生命周期仍然归框架层。

## 开发

```bash
pnpm install
pnpm dev          # Vue 3 demo（http://localhost:5173）
pnpm dev:vue2     # Vue 2.7 demo（http://localhost:5174）
pnpm build        # 按拓扑序全量构建：core → editor-vue2/vue3 → demo
pnpm typecheck    # 五个包类型检查
```

两个 demo 的 Vite 配置都把 `@easy-editor/core` 和对应适配层别名到源码，所以改包里的代码立即 HMR，**不需要先 build**。
`demo-vue2` 固定使用 Vue 2.7 + Vite 4（`@vitejs/plugin-vue2`），`demo-vue3` 使用 Vue 3 + 当前 Vite。

两个 demo 的页面结构相同，都分五块：

1. **全功能演示**（工具栏、表格浮动面板、图片浮动面板、代码块语言下拉）—— 点一下里面的图片就能看到图片面板。
2. **v-model 绑定值 + `change` 快照**。
3. **wangEditor 互通** —— 左右并排 easy-editor 与 wangEditor，中间几个按钮一键互转。
4. **流式渲染** —— 模拟 AI 逐块吐 markdown，每收到一块就整体转成 HTML 重新渲染。
5. **Mention 编辑器** —— 输入 `@` / `#` 唤出两个不同的异步候选列表，演示键盘与鼠标选择。

wangEditor 和 `marked` 都只是 demo 的依赖，三个发布包本身都不依赖它们。

## 消费方式

### 在 monorepo 内（推荐：别名到源码）

```ts
// vite.config.ts
resolve: {
  alias: [
    { find: '@easy-editor/vue3/style.css', replacement: '<repo>/packages/editor-vue3/src/styles/editor.css' },
    { find: '@easy-editor/vue3', replacement: '<repo>/packages/editor-vue3/src/index.ts' },
    { find: '@easy-editor/core', replacement: '<repo>/packages/core/src/index.ts' },
  ],
  dedupe: ['vue', '@tiptap/core', '@tiptap/pm'],
}
```

Vue 2 demo 的写法相同，只是把 `@easy-editor/vue3` 换成 `@easy-editor/vue2`、目标指向
`packages/editor-vue2/src`；插件换成 `@vitejs/plugin-vue2`。

### 在外部项目（吃 dist）

```bash
pnpm add @easy-editor/vue3 @easy-editor/core vue @tiptap/core @tiptap/vue-3 @tiptap/pm
```

```ts
import { EasyEditor } from '@easy-editor/vue3'
// ⚠️ 必须手动引入样式
import '@easy-editor/vue3/style.css'
```

> **为什么要手动引 CSS**：构建走 Vite lib 模式，CSS 被提取成独立的 `dist/style.css`，JS 入口不会自动带上它。走源码别名时 Vite 会注入，所以 demo 里看不出这个差别——但 dist 消费方漏了这一行就会得到一个完全没样式的编辑器。
>
> `vue` / `@tiptap/*` 是 `@easy-editor/vue3` 的 **peerDependencies**（构建时已 external），由消费方安装，避免打进重复的 Vue 或出现两份 `@tiptap/core`（两份会导致「两个 Editor 类」的类型与运行时错误）。

### 在外部项目（Vue 2.7）

```bash
pnpm add @easy-editor/vue2 @easy-editor/core vue@2.7 @tiptap/core @tiptap/vue-2 @tiptap/pm
```

```ts
import Vue from 'vue'
import { EasyEditor } from '@easy-editor/vue2'
// ⚠️ 同样必须手动引样式
import '@easy-editor/vue2/style.css'

Vue.component('EasyEditor', EasyEditor)
```

```vue
<template>
  <EasyEditor v-model="content" placeholder="开始输入…" @change="onChange" />
</template>
```

`v-model` 的语义与 Vue 3 版一致：内部用 Vue 2 的 `model` 选项把它映射到
`modelValue` / `update:model-value`。props、`change` 事件、模板 ref 方法
（`getSnapshot()` / `focus()` / `clear()`）也与 Vue 3 版同名；通过 `$refs.editorRef.editor` 可以拿到实例。

> Vue 2 适配层依赖 `@tiptap/vue-2@3.x`（Tiptap v3 仍然提供 Vue 2 适配器），实例创建方式是
> `mounted` 里 `new Editor({ element })`，不使用 `EditorContent`。

### 组件用法

```vue
<script setup lang="ts">
import { EasyEditor } from '@easy-editor/vue3'
import type { EditorContentSnapshot } from '@easy-editor/vue3'
import { ref } from 'vue'

const content = ref('<p>初始内容</p>')

function onChange(snapshot: EditorContentSnapshot) {
  // snapshot = { json, html, text }，一次算好三种表示
  console.log(snapshot.json, snapshot.html, snapshot.text)
}
</script>

<template>
  <EasyEditor v-model="content" placeholder="开始输入…" @change="onChange" />
</template>
```

**Props**

两套适配层的 props / emits / ref 方法保持一致，下表以 Vue 3 写法为例（Vue 2 版同样适用）。

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string \| JSONContent \| null` | `null` | v-model 绑定值 |
| `outputFormat` | `'html' \| 'json'` | `'html'` | emit 出去的格式。要结构化持久化就传 `'json'` |
| `placeholder` | `string` | `''` | 空文档占位文案。**创建期选项，运行中改不生效** |
| `editable` | `boolean` | `true` | 可编辑开关，运行中可切换 |
| `autofocus` | `boolean` | `false` | 自动聚焦 |
| `showToolbar` | `boolean` | `true` | 是否显示工具栏 |
| `uploadImage` | `(file: File) => string \| Promise<string>` | — | 图片上传实现。不传则走 base64 内联 |
| `imageAccept` | `string` | `'image/*'` | 图片文件选择框的 `accept` |
| `mentionSources` | `MentionSource[]` | — | 提及触发源。**创建期选项**，不传则 schema 里没有 mention 节点 |

**图片上传**：不传 `uploadImage` 时用 `FileReader` 转 base64，开箱即用、不需要后端。
接后端时传回调即可覆盖：

```vue
<script setup lang="ts">
async function uploadImage(file: File) {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body })
  const { url } = await res.json()
  return url
}
</script>

<template>
  <EasyEditor v-model="html" :upload-image="uploadImage" />
</template>
```

### 提及（@ / # 等）

传 `mentionSources` 即启用，每个 source 对应一个触发符。数据源由调用方提供，
同步返回数组或返回 Promise 都行：

```vue
<script setup lang="ts">
import { EasyEditor } from '@easy-editor/vue3'
import type { MentionItem, MentionSource } from '@easy-editor/vue3'
import { ref } from 'vue'

const content = ref('')
const tags: MentionItem[] = [
  { id: 'design', label: '产品设计' },
  { id: 'growth', label: '增长实验' },
]

const mentionSources: MentionSource[] = [
  {
    char: '@',
    labels: { title: '提及成员' },
    debounce: 150,
    // 接口通常按 query 过滤；演示环境可以直接用 setTimeout 模拟延迟。
    items: async (query) => (await fetch(`/api/members?q=${encodeURIComponent(query)}`)).json(),
  },
  {
    char: '#',
    labels: { title: '关联标签' },
    items: (query) => tags.filter((tag) => tag.label.includes(query)),
  },
]
</script>

<template>
  <EasyEditor v-model="content" :mention-sources="mentionSources" />
</template>
```

- `items(query)` 返回 `MentionItem[]`：`id` / `label` 写进文档，`description` 只在下拉里展示。
- 触发符在同一个编辑器里必须唯一；重复会在创建时抛错。
- 交互：`↑` / `↓` 选择，`Enter` / `Tab` 确认，`Esc` 或点外部关闭，鼠标点击也可选中；异步加载期间弹层显示 loading。
- 不传 `mentionSources` 时不会注册 mention 节点，schema 和 v3 完全一致。
- 文档里的提及是 inline atom：`<span data-type="mention" data-id="…" data-label="…" data-mention-suggestion-char="@">@张三</span>`。

**Emits**：`update:modelValue`、`change(snapshot)`

**Expose**（通过模板 ref）：`editor`、`getSnapshot()`、`focus()`、`clear()`

## 主题

样式全部挂在 `.easy-editor` 命名空间下，通过 CSS 变量换肤，不需要改组件源码：

```css
.my-app .easy-editor {
  --ee-border: #d0d7de;
  --ee-toolbar-bg: #f6f8fa;
  --ee-active-bg: #dbeafe;
  --ee-active-fg: #1d4ed8;
  --ee-radius: 6px;
}
```

完整变量见 `packages/editor-vue3/src/styles/editor.css` 顶部的 `.easy-editor` 规则。

## 核心包 API

```ts
import {
  // 扩展装配
  createEasyEditorExtensions,
  createMentionExtension,
  // 块级 / 列表
  setBlockType, toggleHeading, setParagraph,
  toggleBulletList, toggleOrderedList,
  // 行内样式
  toggleBold, toggleItalic, toggleUnderline,
  setFontSize, unsetFontSize,
  setTextColor, unsetTextColor,
  setBackgroundColor, unsetBackgroundColor,
  // 代码块 / 链接 / 图片
  toggleCodeBlock, setCodeBlockLanguage,
  setLink, unsetLink,
  insertImage, updateImage, setImageWidth, deleteImage,
  // 表格
  insertTable,
  addRowBefore, addRowAfter, deleteRow,
  addColumnBefore, addColumnAfter, deleteColumn,
  deleteTable, toggleHeaderRow,
  // 文档 / 历史
  clearContent, undo, redo,
  // 状态计算
  getActiveFormats, getActiveTableRange, getActiveImage,
  snapshotContent,
  // 常量
  HEADING_LEVELS, FONT_SIZE_OPTIONS, DEFAULT_FONT_SIZE,
  TEXT_COLOR_PALETTE, BACKGROUND_COLOR_PALETTE, PARAGRAPH_VALUE,
  CODE_BLOCK_LANGUAGES, TABLE_SIZE_LIMIT, IMAGE_WIDTH_PRESETS,
} from '@easy-editor/core'

// mention 的类型
import type { EasyMentionSource, MentionItem } from '@easy-editor/core'
```

`createMentionExtension(sources)` 只装配 schema 与 Suggestion 插件：**什么时候触发、怎么把选中的项写进文档**在这里；
**弹层长什么样、候选项从哪来**由适配层和调用方决定——核心包拿到的只是一个取数函数和一个 `render` 回调。
所以原生 JS / React 接入时可以自己实现 `render`，Vue 适配层只是把它接到了 `MentionPopover.vue` 上。

`getActiveTableRange(editor)` 返回光标所在表格在文档里的位置区间（不在表格里返回 `null`）。
「光标在哪张表里」是文档结构问题，放在核心包；框架层只拿着 `from` 去 `view.nodeDOM(from)`
取 DOM、量尺寸、定位浮动面板。

`getActiveImage(editor)` 是同一套路：返回被选中图片的区间**加上**它的 `src` / `alt` / `href` / `width`
（没有选中图片时返回 `null`）。面板要的值一次给全，框架层不用自己去读节点属性。

**图片命令为什么不用 `updateAttributes`**：它内部走 `setNodeMarkup`，节点被整个替换后
ProseMirror 会把 NodeSelection 映射成光标，图片面板下一帧就因为「没有选中的图片」自己消失。
`updateImage` / `setImageWidth` 因此在一个事务里改完属性再把 NodeSelection 建回来 ——
面板原地不动，撤销栈也只记一步。（两次调用拆成两个事务会让 Ctrl+Z 要按两下。）

**为什么命令要封一层**：Tiptap 的链式命令少写 `.focus()` 会丢光标、少写 `.run()` 会静默不生效。把这类陷阱收口在核心包一处，框架层拿到的是 `setTextColor(editor, '#f00')` 这样语义明确的函数。

在非 Vue 环境（原生 JS、测试）里：

```ts
import { Editor } from '@tiptap/core'
import { createEasyEditorExtensions } from '@easy-editor/core'

const editor = new Editor({ extensions: createEasyEditorExtensions({ placeholder: '输入…' }) })
```

## wangEditor 互通

目标：easy-editor 的 v-model HTML 能和 [wangEditor v5](https://www.wangeditor.com/) 互相倒。
demo 里「wangEditor 互通」那一块就是干这个的 —— 左右并排两个编辑器，初始内容**交叉投放**
（easy-editor 读 wangEditor 的 HTML，wangEditor 读 easy-editor 的 HTML），两边都能正常渲染。

### 已经对齐的地方

| 能力 | wangEditor v5 的产出 | easy-editor 的产出 |
| --- | --- | --- |
| 粗体 / 斜体 / 下划线 | `<strong>` / `<em>` / `<u>` | 同左（Tiptap 默认就是这三个标签） |
| 链接 | `<a href target="_blank">`，**无 `rel`** | 同左（`link.HTMLAttributes.rel = null`） |
| 代码块 | `<pre><code class="language-x">` | 同左 |
| 颜色 / 字号 | `<span style="…">` | 同左（值是 hex 还是 `rgb()` 有差异，两边都能读） |
| 图片 | `<img src alt data-href style="width: 30%;">` | **同左**（`EasyImage` 主动采用了它的写法，见下） |
| 表格 | `<table style="width: auto;"><tbody><tr><th>` | `<table style="min-width:…"><colgroup>…<tbody><tr><th>` |

### 图片：属性布局就是契约

图片是唯一一个**完全照抄 wangEditor 写法**的节点，因为它的解析器只认四个位置：

```html
<img src="…" alt="…" data-href="…" style="width: 30%;">
```

- **链接放在 `data-href`**，不是包一层 `<a>`。wangEditor 把链接挂在 `<img>` 自己身上；
  包 `<a>` 看着更语义化，但它反向解析时读不到，链接会丢。
- **宽度放在 inline style 里**（`style="width: 30%;"`），不是裸的 `width="…"` 属性。
  它的解析器只从 `style` 里取 `width` / `height`。
- `alt` 和 `style` **即使为空也照写**——wangEditor 总是写它们，两边形状一致才好比较。

反过来要知道的：wangEditor 的 `parseElemHtml` **只读这四个位置，其余属性一律丢弃**
（连 `class` 都不留）。所以别往图片上加自定义属性——加了就要接受它在互通时消失。
要存额外信息，请存在**文档外部**（按图片 id 索引一份 side table），不要指望 HTML 带过去。

字体宽度预设的取值（`30%` / `50%` / `100%`）也在 core 的 `IMAGE_WIDTH_PRESETS`，
与它的 `imageWidth30/50/100` 菜单一一对应。

### 结构差异（不影响互通）

两边的文档模型不同，产出必然有差异。以下三处**已经实测确认能互换**，不是猜的：

1. **单元格内容**：Tiptap 是 `<td><p>文本</p></td>`，wangEditor 是 `<td>文本</td>`。
   wangEditor 的单元格解析器会把子元素过滤成「文本 + 行内元素」，`<p>` 被丢掉，
   然后回退到取整个单元格的 `textContent` —— **正文不丢**，只是单元格内的分段会被合并。
2. **列表项内容**：同理，`<li><p>文本</p></li>` 进 wangEditor 变成 `<li>文本</li>`；
   反向 `<li>文本</li>` 进 Tiptap 会被自动补上 `<p>` 包裹（schema 要求 `block+`）。
3. **`<colgroup>`**：Tiptap 靠它算列宽，wangEditor 的表格解析只看 `<tr>`，会直接忽略。

`colSpan` / `rowSpan` 的驼峰写法看着别扭，但 HTML 属性名在浏览器里大小写不敏感，
`getAttribute('colSpan')` 能读到 `colspan="1"`，所以也没问题。

### 为对齐付出的代价

- **Link 不写 `rel`**。Tiptap 默认给 `<a target="_blank">` 加
  `rel="noopener noreferrer nofollow"`，为了和 wangEditor 一致把它关掉了。
  代价是少了 `noopener` 这层防护 —— 这条 HTML 是编辑器里的「内容」，
  真要渲染成站点链接，建议在渲染侧自己补 `rel`。
- **图片是行内节点**（`EasyImage.configure({ inline: true })`）。wangEditor 的图片也是行内的，
  两边都产出 `<p><img></p>`，反向解析才对称。代价是 Tiptap 里行内图片的编辑手感
  和块级图片略不同。
- **图片不能带自定义属性**。见上面「图片：属性布局就是契约」——多写的属性在 wangEditor
  那边会被丢掉，别把它当数据通道。
- **点图片会选中整张图**（`EasyImage` 注册了一个 `handleClickOn`）。不这么做的话
  ProseMirror 默认把点击理解成「在图片旁边落光标」，NodeSelection 建不起来，
  图片面板就没有触发时机。wangEditor 也是点一下选中。
- **单元格内多段落会合并**。见上面第 1 条，wangEditor 的单元格模型装不下多个段落。

## 已知取舍

- **仓库里没有自动化测试**。当前只保证构建、类型、schema 装配正确，命令的实际行为靠 demo 手验。
  （上面「wangEditor 互通」的结论不是推测：是把 core 和 wangEditor 本体都塞进 jsdom 跑通验证的。
  v3 的图片契约也照这个办法验过一遍——`<img>` 从 wangEditor 的 `/>` 形式进来、
  再从 easy-editor 出去，四个属性逐字节一致；`updateImage` / `setImageWidth` 之后
  NodeSelection 仍在（就是上面那个坑的回归用例）；以及流式渲染的**每一个前缀**都能转成
  HTML 并渲染，不抛错、不塌成空白。验证脚本是一次性的，没留在仓库里。
  要常驻的话，在 core 包加 jsdom 环境的 vitest 用例即可。)
- **字号与颜色走 inline style**（Tiptap 的 `TextStyle` mark 渲染成 `<span style>`），不是 CSS class。
- **`placeholder` 和 `mentionSources` 是创建期选项**，运行中改对应的 prop 不会生效。
- **Vue 2 适配层的 v-model 事件名是 `update:model-value`**（kebab-case）。用 `v-model` 时无感知；
  手动监听时要写 `@update:model-value="..."`，与 Vue 3 适配层的 `update:modelValue` 不同。
- **Vue 2 模板只能有一个根节点**。`ImagePanel` 因此把图片编辑弹窗放在浮动面板元素内部
  （弹窗是 `position: fixed`，不影响面板布局）。
- **两个适配层的样式和中文文案各存一份**（`editor-vue2/src/styles/editor.css`、`labels.ts`），
  不共享包是为了让两者互不依赖；改样式/文案时需要同步两边，文件头有注释提醒。
- **提及没有 wangEditor 对应物**。mention 节点序列化成 `span[data-type="mention"]`，
  wangEditor 不认识这个结构，互通时不保证保留提及语义（文字内容是否保留取决于它的解析器）。
  需要互通的内容建议不要使用提及。
- **提及候选弹层挂在 `body` 上**，由 `@tiptap/suggestion` 的受管挂载跟着光标定位。
  因此它不继承 `.easy-editor` 上的 `--ee-*` 主题变量；弹层样式自带兜底值，
  要换肤就在 `:root` / `body` 上设置同名变量。
- **表格列宽不可拖拽**。`resizable: false`，列宽由浏览器按内容自适应（对齐 wangEditor 的
  `width: auto`）。要拖拽调宽得打开 `TableKit` 的 `resizable`，同时会多出 `<colgroup>` 的列宽属性。
- **表格内的「回车」**：与 wangEditor 一致，单元格里回车是换行（Tiptap 里是新建一个段落），
  **不会**新增一行。增删行请用浮动面板。表格尾部靠 StarterKit 的 `trailingNode`
  保证有一个空段落可以落脚，不会困在表格里。
