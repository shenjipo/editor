import vue from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'

// 普通 Vue 2.7 用户配置：没有 monorepo 源码别名，
// @shenjipo/* 全部从 node_modules 里安装好的 dist 解析。
export default defineConfig({
  plugins: [vue()],
  server: { port: 5181 },
  preview: { port: 5181 },
})
