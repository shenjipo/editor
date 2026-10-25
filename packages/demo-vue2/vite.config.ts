import { fileURLToPath, URL } from 'node:url'

import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'

const editorVue2Source = fileURLToPath(new URL('../editor-vue2/src', import.meta.url))
const coreSource = fileURLToPath(new URL('../core/src', import.meta.url))

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    // 演示工程直接吃源码：改包里的代码立即 HMR，不用先 build。
    // 更具体的子路径别名必须排在包名别名前面。
    alias: [
      { find: '@easy-editor/vue2/style.css', replacement: `${editorVue2Source}/styles/editor.css` },
      { find: '@easy-editor/vue2', replacement: `${editorVue2Source}/index.ts` },
      { find: '@easy-editor/core', replacement: `${coreSource}/index.ts` },
    ],
    // 别名指向源码后，vue 必须去重，否则 tiptap 的 vue 适配层会拿到第二份运行时。
    dedupe: ['vue', '@tiptap/core', '@tiptap/pm'],
  },
  optimizeDeps: {
    // core / 适配层源码里的裸导入必须和 tiptap 的其它依赖走同一个预构建图，
    // 否则 Vite 会给它们单开一份 prosemirror-state（两个 Plugin 类各自生成
    // `plugin$` 自动 key，reconfigure 时报 Adding different instances of a keyed plugin）。
    include: [
      '@tiptap/pm/state',
      '@tiptap/pm/history',
      '@tiptap/extension-mention',
      '@tiptap/vue-2',
    ],
  },
  server: {
    port: 5174,
  },
})
