# @shenjipo/editor-vue2

基于 [Tiptap 3](https://tiptap.dev) 的可复用富文本编辑器 **Vue 2.7 适配层**：`<EasyEditor>` 组件、工具栏、表格 / 图片浮动面板、代码块语言选择、`@` 提及和 `v-model` 双向绑定。

props、emits 和模板 ref 方法与 [`@shenjipo/editor-vue3`](https://www.npmjs.com/package/@shenjipo/editor-vue3) 完全一致，迁移时只需换包名和样式入口。

## 安装

```bash
pnpm add @shenjipo/editor-vue2 vue@2.7 @tiptap/core @tiptap/vue-2 @tiptap/pm
```

`vue` 和 `@tiptap/*` 是 **peerDependencies**，不会被重复打包；`@shenjipo/editor-core` 会随本包自动安装。

## 快速开始

```ts
import Vue from 'vue'
import { EasyEditor } from '@shenjipo/editor-vue2'

// ⚠️ 样式必须手动引入，否则编辑器完全没有样式
import '@shenjipo/editor-vue2/style.css'

Vue.component('EasyEditor', EasyEditor)
```

```vue
<template>
  <EasyEditor
    v-model="content"
    placeholder="开始输入…"
    @change="onChange"
  />
</template>

<script>
export default {
  data() {
    return { content: '<p>初始内容</p>' }
  },
  methods: {
    onChange(snapshot) {
      // { json, html, text }
      console.log(snapshot.html)
    },
  },
}
</script>
```

`v-model` 通过 Vue 2 的 `model` 选项映射到 `modelValue` / `update:model-value`，用法与 Vue 3 版一致。

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

**实例访问**：

```vue
<EasyEditor ref="editorRef" v-model="content" />

<script>
export default {
  mounted() {
    this.$refs.editorRef.focus()
    const snapshot = this.$refs.editorRef.getSnapshot()
    const editor = this.$refs.editorRef.editor // Tiptap Editor 实例
  },
}
</script>
```

`getSnapshot()`、`focus()`、`clear()` 与 Vue 3 版同名。

## 图片上传

不传 `uploadImage` 时图片会转成 base64 内联；接后端时传回调：

```vue
<EasyEditor v-model="html" :upload-image="uploadImage" />
```

```js
async uploadImage(file) {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body })
  const { url } = await res.json()
  return url
}
```

## 提及（`@` / `#`）

传 `mentionSources` 即启用，每个 source 对应一个触发符；`items(query)` 可同步返回数组或返回 Promise：

```js
data() {
  return {
    content: '',
    mentionSources: [
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
        items: (query) => this.tags.filter((tag) => tag.label.includes(query)),
      },
    ],
  }
}
```

```vue
<EasyEditor v-model="content" :mention-sources="mentionSources" />
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

## 实现说明

Vue 2 没有 `useEditor` / `EditorContent`，本包在 `mounted` 中把宿主元素交给 `new Editor({ element })`，在 `beforeDestroy` 中销毁实例；实例生命周期仍由框架层管理，与 Vue 3 版行为等价。

## 配套包

- [`@shenjipo/editor-core`](https://www.npmjs.com/package/@shenjipo/editor-core) — 框架无关核心
- [`@shenjipo/editor-vue3`](https://www.npmjs.com/package/@shenjipo/editor-vue3) — Vue 3 适配层，API 与本包一致

## License

MIT
