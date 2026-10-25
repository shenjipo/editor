# @shenjipo/editor-vue3

基于 [Tiptap 3](https://tiptap.dev) 的可复用富文本编辑器 **Vue 3 适配层**：开箱即用的 `<EasyEditor>` 组件、工具栏、表格 / 图片浮动面板、代码块语言选择、`@` 提及和 `v-model` 双向绑定。

schema 与文档命令由 [`@shenjipo/editor-core`](https://www.npmjs.com/package/@shenjipo/editor-core) 提供，本包负责组件、UI 和实例生命周期。

## 安装

```bash
pnpm add @shenjipo/editor-vue3 vue @tiptap/core @tiptap/vue-3 @tiptap/pm
```

`vue` 和 `@tiptap/*` 是 **peerDependencies**，不会被重复打包——这能避免组件库和应用各自带一份 `@tiptap/core` 导致「两个 Editor 类」的问题。`@shenjipo/editor-core` 会随本包自动安装。

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EasyEditor } from '@shenjipo/editor-vue3'
import type { EditorContentSnapshot } from '@shenjipo/editor-vue3'

// ⚠️ 样式必须手动引入，否则编辑器完全没有样式
import '@shenjipo/editor-vue3/style.css'

const content = ref('<p>初始内容</p>')

function onChange(snapshot: EditorContentSnapshot) {
  // { json, html, text }
  console.log(snapshot.html)
}
</script>

<template>
  <EasyEditor v-model="content" placeholder="开始输入…" @change="onChange" />
</template>
```

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string \| JSONContent \| null` | `null` | v-model 绑定值 |
| `outputFormat` | `'html' \| 'json'` | `'html'` | emit 出去的格式；结构化持久化用 `'json'` |
| `placeholder` | `string` | `''` | 空文档占位文案（创建期选项，运行中修改不生效） |
| `editable` | `boolean` | `true` | 可编辑开关，运行中可切换 |
| `autofocus` | `boolean` | `false` | 自动聚焦 |
| `showToolbar` | `boolean` | `true` | 是否显示工具栏 |
| `uploadImage` | `(file: File) => string \| Promise<string>` | — | 图片上传实现；不传则用 base64 内联 |
| `imageAccept` | `string` | `'image/*'` | 图片选择框的 `accept` |
| `mentionSources` | `MentionSource[]` | — | 提及触发源（创建期选项）；不传则 schema 中没有 mention 节点 |

**Emits**：`update:modelValue`、`change(snapshot)`

**Expose**（模板 ref）：`editor`、`getSnapshot()`、`focus()`、`clear()`

## 图片上传

不传 `uploadImage` 时，图片会被 `FileReader` 转成 base64 内联，开箱即用。接后端时传一个回调：

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

## 提及（`@` / `#`）

传 `mentionSources` 即启用，每个 source 对应一个触发符；`items(query)` 可同步返回数组或返回 Promise：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EasyEditor } from '@shenjipo/editor-vue3'
import type { MentionItem, MentionSource } from '@shenjipo/editor-vue3'

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
    items: async (query) =>
      (await fetch(`/api/members?q=${encodeURIComponent(query)}`)).json(),
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

`↑` / `↓` 选择，`Enter` / `Tab` 确认，`Esc` 或点击外部关闭。同一编辑器内触发符必须唯一。

## 主题

样式挂在 `.easy-editor` 命名空间下，通过 CSS 变量换肤：

```css
.my-app .easy-editor {
  --ee-border: #d0d7de;
  --ee-toolbar-bg: #f6f8fa;
  --ee-active-bg: #dbeafe;
  --ee-active-fg: #1d4ed8;
  --ee-radius: 6px;
}
```

完整变量见 `dist/style.css` 中 `.easy-editor` 规则。

## 配套包

- [`@shenjipo/editor-core`](https://www.npmjs.com/package/@shenjipo/editor-core) — 框架无关核心
- [`@shenjipo/editor-vue2`](https://www.npmjs.com/package/@shenjipo/editor-vue2) — Vue 2.7 适配层，API 与本包一致

## License

MIT
