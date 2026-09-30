# easy-editor

基于 [Tiptap](https://tiptap.dev)（ProseMirror）的 Vue 3 富文本编辑器，pnpm monorepo 组织。

当前能力：字号、字体颜色、文本背景色、正文 / H1-H3、有序列表、无序列表。

## 目录结构

```
packages/
├── core/           @easy-editor/core  框架无关：扩展装配、文档命令、编辑器状态计算
├── editor-vue3/    @easy-editor/vue3  Vue 3 适配层：编辑器组件、工具栏 UI、v-model
└── demo-vue3/      演示工程（private，不发布）
```

**依赖方向严格单向：`demo-vue3 → editor-vue3 → core`。** 核心包永不反向依赖任何框架包。

## 分层契约

把编辑器的「智能」和「长相」拆到两个包里，中间用一条窄接口连接。

| | 负责 | 不负责 |
| --- | --- | --- |
| **core** | schema 装配、文档命令（设字号 / 颜色 / 切换标题…）、光标处格式状态的计算、内容序列化 | ❌ 不创建 UI 组件、❌ 不 import vue、❌ 不管实例生命周期 |
| **editor-vue3** | 组件生命周期 ↔ Editor 实例、v-model 双向绑定、工具栏 UI、下拉与取色面板、样式 | ❌ 不定义 schema、❌ 不直接拼 `editor.chain()` |

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

## 开发

```bash
pnpm install
pnpm dev          # 起 demo（http://localhost:5173）
pnpm build        # 按拓扑序全量构建：core → editor-vue3 → demo
pnpm typecheck    # 三个包类型检查
```

demo 的 Vite 配置把 `@easy-editor/core` 和 `@easy-editor/vue3` 别名到源码，所以改包里的代码立即 HMR，**不需要先 build**。

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

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string \| JSONContent \| null` | `null` | v-model 绑定值 |
| `outputFormat` | `'html' \| 'json'` | `'html'` | emit 出去的格式。要结构化持久化就传 `'json'` |
| `placeholder` | `string` | `''` | 空文档占位文案。**创建期选项，运行中改不生效** |
| `editable` | `boolean` | `true` | 可编辑开关，运行中可切换 |
| `autofocus` | `boolean` | `false` | 自动聚焦 |
| `showToolbar` | `boolean` | `true` | 是否显示工具栏 |

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
  // 文档命令（都返回命令是否执行成功）
  setFontSize, unsetFontSize,
  setTextColor, unsetTextColor,
  setBackgroundColor, unsetBackgroundColor,
  setBlockType, toggleHeading, setParagraph,
  toggleBulletList, toggleOrderedList,
  // 状态计算
  getActiveFormats,
  snapshotContent,
  // 常量
  HEADING_LEVELS, FONT_SIZE_OPTIONS, DEFAULT_FONT_SIZE,
  TEXT_COLOR_PALETTE, BACKGROUND_COLOR_PALETTE, PARAGRAPH_VALUE,
} from '@easy-editor/core'
```

**为什么命令要封一层**：Tiptap 的链式命令少写 `.focus()` 会丢光标、少写 `.run()` 会静默不生效。把这类陷阱收口在核心包一处，框架层拿到的是 `setTextColor(editor, '#f00')` 这样语义明确的函数。

在非 Vue 环境（原生 JS、测试）里：

```ts
import { Editor } from '@tiptap/core'
import { createEasyEditorExtensions } from '@easy-editor/core'

const editor = new Editor({ extensions: createEasyEditorExtensions({ placeholder: '输入…' }) })
```

## 已知取舍

- **没有自动化测试**。当前只保证构建、类型、schema 装配正确，命令的实际行为靠 demo 手验。要补的话在 core 包加 jsdom 环境的 vitest 用例。
- **字号与颜色走 inline style**（Tiptap 的 `TextStyle` mark 渲染成 `<span style>`），不是 CSS class。
- **`placeholder` 是创建期选项**，运行中改这个 prop 不会生效。
