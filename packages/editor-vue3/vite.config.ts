import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 框架包：vite lib 模式，要编译 .vue、要产出独立 CSS。
// 类型声明不在这里生成 —— dts 插件对 .vue 支持不好，交给 vue-tsc 单独跑（见 build 脚本）。
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
      // 不指定的话会按包名产成 vue3.css，public API 就成了 @easy-editor/vue3/vue3.css。
      cssFileName: 'style',
    },
    // 所有 CSS 合并成一个文件，消费方一行 import 就够。
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      // 必须 external：否则每个消费方都会打进一份 vue / tiptap / 核心包。
      external: ['vue', /^@tiptap\//, '@easy-editor/core'],
    },
  },
})
