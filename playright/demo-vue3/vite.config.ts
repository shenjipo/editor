import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 刻意保持"普通用户"配置：没有 monorepo 源码别名，没有 dedupe，
// 所有 @shenjipo/* 都从 node_modules 里安装好的 dist 解析。
export default defineConfig({
  plugins: [vue()],
  server: { port: 5180 },
  preview: { port: 5180 },
})
