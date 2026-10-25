import { fileURLToPath, URL } from 'node:url'

import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'

// Vue 2.7 适配层：与 editor-vue3 同一套分层约定——vite lib 模式编译 .vue、产出独立 CSS，
// 类型声明交给 vue-tsc（vueCompilerOptions.target = 2.7）。
export default defineConfig({
  plugins: [vue2()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    // Vite 4 的 lib 模式 CSS 固定输出为 style.css，正好对上 package.json 的 exports。
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: ['vue', /^@tiptap\//, '@shenjipo/editor-core'],
    },
  },
})
