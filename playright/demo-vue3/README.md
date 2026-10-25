# playright/demo-vue3

**npm 消费者验证工程**：模拟一个和本仓库毫无关系的普通 Vue 3 项目，只从 npm registry 安装并使用已经发布的组件库。

- `@shenjipo/editor-vue3@1.0.0`
- `@shenjipo/editor-core@1.0.0`

## 和仓库主工程的隔离

- 不在主仓库 `pnpm-workspace.yaml` 的 `packages/*` 里
- 本目录自带一个 `pnpm-workspace.yaml`，pnpm 会把它当作独立的 workspace 根，不再向上查找
- 没有指向 `packages/*/src` 的 Vite 别名，也没有复用根 `tsconfig`
- 依赖和 `pnpm-lock.yaml` 都落在本目录，不会复用根 `node_modules`

## 运行

```bash
cd playright/demo-vue3

# 独立安装（本目录自带 workspace 根，不会吃仓库主 workspace）
pnpm install

pnpm dev       # http://localhost:5180
pnpm build     # vue-tsc 类型检查 + vite build
pnpm preview
```

## 更新组件库版本

发布新版本后，用普通消费者的方式升级：

```bash
pnpm add @shenjipo/editor-vue3@latest @shenjipo/editor-core@latest
```

## 这个 Demo 验证了什么

- 从 npm 安装的 `dist` 能正常被 Vite 解析、构建、运行
- 样式入口 `@shenjipo/editor-vue3/style.css` 可用
- `v-model` / `change` / 暴露方法（`focus()`、`clear()`）正常
- 内置工具栏、表格 / 图片面板、代码块、撤销重做可用
- 图片默认走 base64，无需后端
- `mentionSources` 的异步候选列表与键盘 / 鼠标交互正常
- peerDependencies（`vue`、`@tiptap/*`）由消费方安装，版本与 core 内置的 Tiptap 保持一致
