import { defineConfig } from 'tsup'

// 核心包：纯 TS、无 CSS、无框架依赖，产出 esm + cjs + d.ts。
// 所有 @tiptap/* 依赖都必须 external，否则每个消费方都会打进一份 ProseMirror。
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  external: [/^@tiptap\//],
})
