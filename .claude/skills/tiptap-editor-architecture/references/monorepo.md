# Monorepo 组织：核心包 + N 个框架适配包

## 为什么用 monorepo

编辑器组件的天然形态是「1 个核心 + N 个框架适配」。这天然就是 monorepo：

- 改核心包时，Vue2 / Vue3 适配层能**立刻**用上，不需要 `npm link` 或发 beta 版本
- 类型定义跨包直接引用，改接口时 TS 立刻在适配层报错
- 三个包版本必须同步发布，monorepo 让这件事变成一条命令

替代方案（多仓库）的问题：核心包改动要经过「提交 → 发版 → 升级依赖 → 再提交」四步才能在适配层验证，反馈循环从秒级变成分钟级。

## 目录结构

```
MentionEditor/
├── package.json              # 只放 workspaces 配置 + 串联脚本
├── pnpm-workspace.yaml
├── tsconfig.client.json      # 共享 tsconfig 基线
└── packages/
    ├── mention-editor/       # ★ 核心包，框架无关
    │   ├── src/
    │   ├── tsup.config.ts
    │   └── package.json
    ├── mention-vue3/         # Vue3 适配
    │   ├── src/
    │   ├── vite.config.ts
    │   └── package.json
    ├── mention-vue2/         # Vue2 适配
    ├── demo-vue3/            # 演示工程，private
    └── demo-vue2/
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

**包名与目录名分离。** 目录叫 `mention-editor`，包名叫 `@shenjipo/mention-editor`。目录用短名（方便 `-F` 过滤时输入），包名带 scope（发布需要）。

## 依赖方向：严格单向

```
demo-vue3 ──┐
            ├──► mention-vue3 ──┐
demo-vue2 ──┘                   ├──► mention-editor
            ├──► mention-vue2 ──┘
```

**核心包永不反向依赖任何框架包。** 这条规则一旦破例（哪怕只是「引个 vue 的类型」），核心包就失去了框架无关性，另一个框架的适配包会被迫拖入不需要的依赖。

用 `workspace:*` 协议声明内部依赖：

```jsonc
// packages/mention-vue3/package.json
"dependencies": {
    "@shenjipo/mention-editor": "workspace:*",
    "@floating-ui/vue": "^1.1.9",
    "vue": "^3.3.0"
}
```

`workspace:*` 在本地解析为符号链接（改核心包源码立即可见），发布时 pnpm 自动替换为实际版本号。

**注意 `vue` 既是 `dependencies` 又是 `external`。** 这不矛盾：`dependencies` 声明「我需要 vue 存在」，`external` 声明「打我的包时不要包含 vue」。前者是运行时契约，后者是构建指令。

## 两种构建工具，按包性质选

### 核心包：tsup

```ts
// packages/mention-editor/tsup.config.ts
export default defineConfig([{
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],      // 双格式，兼容 ESM / CJS 消费方
    dts: true,                   // 产出 .d.ts
    sourcemap: true,
    bundle: true,
    minify: true,
    splitting: false,            // ★ 库模式必须关，否则产出多个 chunk
    target: 'es2018',
    clean: true,
}])
```

选 tsup 的理由：核心包是**纯 TS、零 CSS、零静态资源**。tsup 基于 esbuild，编译快，配置只有几行，`dts: true` 一行搞定类型产出。

`splitting: false` 是关键：库模式开启代码分割会产出多个入口 chunk，消费方的打包器要额外处理，得不偿失。

### 框架包：vite lib 模式

```ts
// packages/mention-vue3/vite.config.ts
export default defineConfig({
    plugins: [
        vue(),
        dts({
            entryRoot: 'src',
            outDir: 'dist',
            cleanVueFileName: true,
            insertTypesEntry: true,   // 自动生成 dist/index.d.ts
            copyDtsFiles: true,
        }),
    ],
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'index.esm.js',
        },
        rollupOptions: {
            external: ['vue', '@shenjipo/mention-editor', '@floating-ui/vue'],
        },
        cssCodeSplit: true,           // ★ 产出独立的 index.css
        emptyOutDir: true,
    },
})
```

选 vite 的理由：要编译 `.vue` 单文件组件，要处理 `<style>` 块并产出独立 CSS，要 `@` 路径别名。这些 tsup 都做不了（或要装一堆插件）。

Vue3 包只发 ESM（`formats: ['es']`），因为 Vue3 + Vite 生态本来就只有 ESM。Vue2 包要双格式——Vue2 项目大量是 webpack + CJS。

```jsonc
// packages/mention-vue2/package.json —— 双格式的 exports 写法
"main": "dist/index.cjs.js",
"module": "dist/index.esm.js",
"types": "dist/index.d.ts",
"style": "dist/index.css",
"exports": {
    ".": {
        "import": "./dist/index.esm.js",
        "require": "./dist/index.cjs.js",
        "types": "./dist/index.d.ts"
    },
    "./dist/index.css": "./dist/index.css"
}
```

**CSS 必须单独导出。** `index.ts` 里 `import './assets/index.scss'` 只是让构建把样式收集进 `index.css`，消费方要显式 `import '@shenjipo/mention-vue3/dist/index.css'`。库不应该强制注入样式——宿主可能想用 Tailwind 覆盖。

## 根 package.json：只有脚本和 workspaces

```jsonc
{
    "name": "mention-editor",          // 根包名，private 概念
    "scripts": {
        "dev2": "pnpm -F demo-vue2 dev",
        "dev3": "pnpm -F demo-vue3 dev",
        "build:core": "pnpm -F @shenjipo/mention-editor run build:watch",
        "build:vue3": "pnpm -F @shenjipo/mention-vue3 build:watch",
        "build": "pnpm -F @shenjipo/mention-editor run build && pnpm -F @shenjipo/mention-vue2 build && pnpm -F @shenjipo/mention-vue3 build",
        "pub": "pnpm publish -F @shenjipo/mention-editor",
        "pub2": "pnpm publish --recursive -F @shenjipo/mention-vue2",
        "pub3": "pnpm publish --recursive -F @shenjipo/mention-vue3"
    }
}
```

`-F` 是 pnpm 的 `--filter`，按包名（或目录名）定位子包。

**开发工作流**：开两个终端，一个跑 `pnpm build:core`（`tsup --watch`），一个跑 `pnpm dev3`（Vite HMR）。核心包一改，watch 重新产出 `dist`，Vite 通过符号链接感知到变化并热更新。这是 monorepo 的核心体验——**改核心包不用重启任何东西**。

**发布顺序**：核心包先行，适配包 `--recursive` 跟随。适配包的 `dependencies` 里 `workspace:*` 会在 `pnpm publish` 时自动替换成核心包的实际版本号。三个包版本号保持同步（如都用 `2.9.0`），避免消费方组合出未测试过的版本对。

## 共享配置

`tsconfig.client.json` 放基线，各包 `extends` 它：

```jsonc
// tsconfig.client.json —— 面向 bundler 的 TS 配置
{
    "compilerOptions": {
        "target": "ES2020",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "isolatedModules": true,
        "noEmit": true,           // 类型检查交给 tsc，产物交给 bundler
        "strict": false
    }
}
```

```jsonc
// packages/mention-editor/tsconfig.json
{ "extends": "../../tsconfig.client.json", "include": ["src/**/*"] }
```

`moduleResolution: "bundler"` 是现代前端的正确选择——允许省略扩展名、支持 `exports` 字段的条件导出。

`strict: false` 是这个项目的实际选择，但**新项目建议开 `strict: true`**。核心包里大量使用 `!` 非空断言和 `any`（`EventEmitter<any>`、`this.pluginState!.queryStartPos!`），是在 `strict` 关闭的前提下写的，迁移成本不低。

## 关于「拆几个框架包」的决策

**结论：一个框架一个包，不共用代码。**

理由：Vue2 和 Vue3 的组件写法差异是**结构性**的，不是语法糖层面的。

| | Vue3 | Vue2 |
|---|---|---|
| 组件定义 | `<script setup>` | Options API |
| props | `withDefaults(defineProps<{...}>(), {...})` | `props: { value: { type: String } }` |
| 双向绑定 | `modelValue` / `update:modelValue` | `value` / `input` |
| emits | `defineEmits<{...}>()` 泛型 | `emits: ['input']` 数组 |
| 组合式 API | 原生 | 需 `vue-demi` 兼容层 |
| 浮层定位 | `@floating-ui/vue` | `@floating-ui/dom` |

强行共用会得到一份充满 `if (isVue3)` 分支的代码，两边都难读。

**共享的是「协议」，不是代码**：三个插槽名（`header` / `default` / `footer`）、事件名（`update:modelValue` vs `input` 除外，这是框架约定）、`SuggestionMenuProps` 的形状（`editor` / `query` / `closeMenu` / `clearQuery` / `insertMention`）。业务方从 Vue2 迁到 Vue3 时，只需要改模板语法，菜单组件的 props 结构一模一样。

两个包里的 `SuggestionMenuController.vue` 是这种「协议相同、实现各写」的典型：模板和作用几乎一致，但 Vue2 版用 `defineComponent` + `props` 选项 + `vue-demi` 的 `ref`/`computed`，Vue3 版用 `<script setup>` + 泛型 props。

## 常见坑

| 坑 | 现象 | 解法 |
|---|---|---|
| 忘记 `external` 框架依赖 | 产物体积暴涨，宿主出现两份 Vue，`provide/inject` 失效 | 每个 `dependencies` 里的框架/浮层库都加进 `rollupOptions.external` |
| `splitting: true` | 库产出多 chunk，消费方报模块找不到 | tsup 配置 `splitting: false` |
| CSS 没导出 | 样式全丢，组件裸奔 | `package.json` 加 `"style"` 字段 + `exports` 里暴露 css 路径 |
| 核心包 watch 修改了 `dist` 但 Vite 没反应 | demo 看到旧代码 | Vite 需要配置 `optimizeDeps.exclude` 或清 `.vite` 缓存 |
| `"files"` 漏了 `src` | 发布后 sourcemap 指向的源码不存在，调试断点失效 | `"files": ["dist", "src"]` |
| tsconfig 里 `noEmit` 与 bundler 冲突 | —— | 类型检查归 `tsc --noEmit`，产物归 bundler，两者职责分开 |
