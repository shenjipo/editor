import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const editorVue3Source = fileURLToPath(new URL('../editor-vue3/src', import.meta.url))
const coreSource = fileURLToPath(new URL('../core/src', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // 演示工程直接吃源码：改包里的代码立即 HMR，不用先 build。
    // 更具体的子路径别名必须排在包名别名前面。
    alias: [
      { find: '@shenjipo/editor-vue3/style.css', replacement: `${editorVue3Source}/styles/editor.css` },
      { find: '@shenjipo/editor-vue3', replacement: `${editorVue3Source}/index.ts` },
      { find: '@shenjipo/editor-core', replacement: `${coreSource}/index.ts` },
    ],
    // 别名指向源码后，vue 必须去重，否则 tiptap 的 vue 适配层会拿到第二份运行时。
    dedupe: ['vue', '@tiptap/core', '@tiptap/pm'],
  },
  optimizeDeps: {
    // core 源码里的裸导入（`@tiptap/pm/<子路径>`、mention 扩展）必须和 tiptap
    // 的其它依赖走同一个预构建图，否则 Vite 会给它们单开一份 prosemirror-state：
    // 两个 Plugin 类各自生成自动 key（都是 `plugin$`），reconfigure 时就报
    // Adding different instances of a keyed plugin。
    // 列出后即使开发中新增这些依赖，也只会触发一次重新预构建，不会退化成裸 ESM。
    include: ['@tiptap/pm/state', '@tiptap/pm/history', '@tiptap/extension-mention'],
  },
  server: {
    port: 5173,
  },
})
