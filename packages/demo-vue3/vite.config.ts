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
      { find: '@easy-editor/vue3/style.css', replacement: `${editorVue3Source}/styles/editor.css` },
      { find: '@easy-editor/vue3', replacement: `${editorVue3Source}/index.ts` },
      { find: '@easy-editor/core', replacement: `${coreSource}/index.ts` },
    ],
    // 别名指向源码后，vue 必须去重，否则 tiptap 的 vue 适配层会拿到第二份运行时。
    dedupe: ['vue', '@tiptap/core', '@tiptap/pm'],
  },
  server: {
    port: 5173,
  },
})
