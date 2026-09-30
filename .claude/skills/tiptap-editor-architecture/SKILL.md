---
name: tiptap-editor-architecture
description: 用 Tiptap + ProseMirror + Vue 构建「核心包 / 框架层」分离的可复用富文本输入框——mention 标签、@ 或 / 触发的候选菜单、粘贴/拖拽文件、行内 AI 补全。当你要新建这类编辑器、判断某个功能该放核心包还是框架层、设计扩展之间或跨层的通信机制、或是在 pnpm monorepo 里组织多包结构时使用。
---

# Tiptap 编辑器架构：核心包 / 框架层分离

一套把 Tiptap 编辑器做成**可复用组件**的架构套路。核心思想是让编辑器的「智能」和「长相」分别住在两个包里，中间用一条窄接口连接。

参考实现见本仓库 `packages/`，下文所有代码引用都指向它。**这套套路不绑定 mention 场景**——换成 slash command、变量补全、公式插入，分层结论完全一样。

## 三条主线

| 主线 | 一句话 | 详解 |
|---|---|---|
| **分层契约** | 核心包算「在哪显示什么状态」，框架层决定「显示成什么样」 | [references/layering.md](references/layering.md) |
| **通信机制** | 编辑器内部用 Plugin state，跨层用 EventEmitter，跨出包用 options 回调 | [references/pubsub.md](references/pubsub.md) |
| **Monorepo 组织** | 依赖严格单向，一个核心包 + N 个框架适配包 | [references/monorepo.md](references/monorepo.md) |

落地配方（插件状态机、Decoration、appendTransaction、拦截输入）见 [references/prosemirror-recipes.md](references/prosemirror-recipes.md)。

---

## 一、分层契约

### 职责表

**核心包（框架无关）负责：**

- 文档模型：schema 定义（Document / Paragraph / Text / HardBreak + 自定义节点）
- 扩展装配：`new Editor({ extensions })` 的完整生命周期
- **交互检测**：哪个字符触发了菜单、当前 query 文本是什么、菜单该锚定在屏幕哪个位置
- 文档命令：插入节点、清空、遍历查询（`getAllMentionBlocks`）
- 文件粘贴/拖拽的拦截
- 键盘语义：Enter / Shift+Enter 谁是换行、谁是提交
- 纯事件出口：`onChange` / `onFileInput` / `onMentionDelete` / `onEnter`

**核心包绝不负责：**

- ❌ 不创建任何 UI 组件，不 import vue / react
- ❌ 不知道菜单长什么样、有哪些候选项、候选项从哪个接口来
- ❌ 不发网络请求

**框架层（Vue / React 适配包）负责：**

- 组件生命周期 ↔ Editor 实例生命周期绑定
- 双向绑定（`onChange` → `emit('update:modelValue')`）
- **按 triggerCharacter 分流**：订阅核心包事件，把 `/` 和 `@` 分发给不同菜单组件
- 菜单 UI、候选项数据获取、键盘导航
- 浮层定位（floating-ui）
- 依赖注入（`provide('editor', editor)`）与插槽布局

### 判定规则：这个功能该放哪层？

依次问三个问题，**任一命中就往框架层放**：

1. 它需要渲染 DOM 组件吗？
2. 它需要知道「有哪些候选项」或其数据来源吗？
3. 把它换成 React 之后，这个功能还需要重新实现吗？

三条全是「否」→ 核心包。这是唯一的分层依据。

### 解耦的支点：只传位置，不传数据

核心包向框架层投递的状态类型极窄：

```ts
export type UiElementPosition = {
    show: boolean
    referencePos: DOMRect   // ← 只有坐标，没有内容
}

export type SuggestionMenuState = UiElementPosition & {
    query: string           // ← 只有用户已输入的检索词
    ignoreQueryLength?: boolean
}
```

**核心包永远不知道候选项是什么。** 它告诉 Vue 层「菜单该出现，锚点在 (x, y, w, h)，用户输入了 `帮我`」，Vue 层自己去查数据、自己渲染。这一条是整个架构解耦的支点——想换成搜索接口、本地列表、还是远程 RAG，核心包一行不用改。

### 窄接口的回报

`SuggestionMenuController` 把菜单能力收成四个动作，业务方拿到的就是这四件事：

```ts
const suggestionMenuProps = computed(() => ({
    editor: editor.value,
    query: state!.value?.query ?? '',
    closeMenu,      // 关掉菜单
    clearQuery,     // 抹掉「触发符 + 已输入 query」
    insertMention,  // 把选中项作为 mention 节点插入
}))
```

---

## 二、通信机制：三条通道，不要混用

| 通道 | 用途 | 实现 |
|---|---|---|
| **Plugin state + Transaction meta** | 编辑器**内部**状态机 | `tr.setMeta(pluginKey, payload)` → `state.apply()` |
| **EventEmitter（带 key 的订阅）** | 核心包 → 框架层**跨层通知** | `on('update /', cb)` |
| **Constructor options 回调** | 核心包 → **宿主业务** | `onChange` / `onFileInput` / `onEnter` |

**最常见的架构错误是拿 EventEmitter 存编辑器内部状态。** 内部状态必须走 Plugin state，因为它要参与事务、跟随 undo/redo 回滚、被 `appendTransaction` 观察。EventEmitter 只做「往外广播」，不持有状态。

### 订阅即注册

核心包把「声明我关心哪个触发字符」和「订阅回调」合并成一个 API，调用方不需要额外注册：

```ts
public onUpdate(triggerCharacter: string, callback: (state: SuggestionMenuState) => void) {
    if (!this.triggerCharacters.includes(triggerCharacter)) {
        this.addTriggerCharacter(triggerCharacter)   // 首次订阅即注册触发符
    }
    return this.on(`update ${triggerCharacter}`, callback)  // 返回 unsubscribe
}
```

`EventEmitter.on()` 返回取消函数，框架层在 `onUnmounted` / `onBeforeUnmount` 里调用——这是**唯一**正确的清理姿势，不要靠手动 `off` 传引用。

多触发符天然支持：`<SuggestionMenuController trigger-character="/">` 和 `trigger-character="@"` 各挂一份，互不干扰。

细节与边界情况见 [references/pubsub.md](references/pubsub.md)。

---

## 三、Monorepo 组织

```
packages/
├── mention-editor/     # 核心。框架无关，tsup 构建（esm + cjs + d.ts）
├── mention-vue3/       # Vue3 适配。vite lib 模式
├── mention-vue2/       # Vue2 适配。vite lib 模式
├── demo-vue3/          # 演示工程（不发布）
└── demo-vue2/
```

**依赖方向严格单向：** `demo → mention-vueX → mention-editor`。核心包永不反向依赖任何框架包。

```jsonc
// packages/mention-vue3/package.json
"dependencies": {
    "@shenjipo/mention-editor": "workspace:*",   // workspace 协议，本地符号链接
    "vue": "^3.3.0",
    "@floating-ui/vue": "^1.1.9"
}
```

构建产物必须把这三类**外部化**，否则每个消费方都会打进一份 Vue：

```ts
rollupOptions: {
    external: ['vue', '@shenjipo/mention-editor', '@floating-ui/vue'],
}
```

**构建工具按包性质选**，不要统一：

- 核心包用 **tsup**——纯 TS、无 CSS、需要 cjs + esm 双格式 + `d.ts`
- 框架包用 **vite lib 模式 + vite-plugin-dts**——要编译 `.vue`、要产出独立 CSS

**关于「要不要拆两个 Vue 包」**：拆。Vue2 和 Vue3 的共享物是**协议**（props / emits 命名、插槽名），不是代码——Vue3 用 `<script setup>` + 泛型 emits，Vue2 用 Options API + `vue-demi`，模板代码无法复用。强行共用会写出两边都别扭的代码。协议一致即可，实现各写各的。

版本号保持三包同步，发布脚本串联。完整配置见 [references/monorepo.md](references/monorepo.md)。

---

## 四、完整链路：从敲下 `/` 到菜单弹出

这条链路是整套架构的浓缩，理解它就理解了全部。以本仓库为例：

```
① 用户敲下 "/"
   └─ ProseMirror props.handleTextInput 拦截（triggerCharacters 命中且当前未激活）
      └─ view.dispatch(tr.insertText('/').setMeta(suggestionMenuPluginKey,
                                                 { triggerCharacter: '/' }))
      └─ return true  ── 阻止默认插入，字符由我们手动插

② Plugin state.apply 读到 meta
   └─ 建 state：{ triggerCharacter, queryStartPos, query: '', decorationId }

③ props.decorations 在触发字符上打 Decoration.inline
   └─ 带上 data-decoration-id="id_xxxx"，作为可查询的锚点

④ Plugin view.update 检测到 prev===undefined && next!==undefined（started）
   └─ querySelector(`[data-decoration-id="id_xxxx"]`).getBoundingClientRect()
   └─ emit("update /", { show: true, referencePos: DOMRect, query: '' })

⑤ Vue 层 SuggestionMenuController 的回调收到 state
   └─ useUIElementPositioning() 把 DOMRect 喂给 floating-ui
   └─ 渲染默认插槽，把 { editor, query, closeMenu, clearQuery, insertMention } 透给业务组件

⑥ 用户继续输入 "帮我"
   └─ 每次 apply() 重算：doc.textBetween(queryStartPos, selection.from)
   └─ emit 更新 → 菜单重渲染筛选结果

⑦ 用户点候选项
   └─ closeMenu()   → 通过 tr.setMeta(key, null) 关闭
   └─ clearQuery()  → 删除 [queryStartPos - triggerLength, selection.from) 区间
   └─ insertMention(item) → 插入 mention 节点 + 一个空格
```

### 两个值得抄的设计决策

**用 Decoration 当锚点，而不是自己算坐标。** ③ 在文档里打一个带 id 的装饰，④ 再按 id 查 DOM 拿 `getBoundingClientRect()`。位置计算、滚动跟随、跨行折行全部由 ProseMirror 负责，核心包只读结果。自己算坐标会在换行、滚动、缩放时全军覆没。

**用 `undefined` 表示「未激活」。** Plugin state 的 `init()` 返回 `undefined`，关闭时 `apply()` 也返回 `undefined`。于是视图层只需判断 `prev === undefined && next !== undefined` 就是「刚打开」。三态检测干净利落：

```ts
const started = prev === undefined && next !== undefined
const stopped = prev !== undefined && next === undefined
const changed = prev !== undefined && next !== undefined
```

---

## 五、从本仓库起步时的注意事项

这段代码移植自 BlockNote，留了一些**死代码和待清理项**，照抄前先判断：

- `SuggestionPlugin.ts` 里的 `findBlock`（找 `blockContainer` 节点）永远返回 `null`——本项目 schema 只有 Document / Paragraph / Text / HardBreak，没有 `blockContainer`。因此 `deleteTriggerCharacter: false` 那条 `Decoration.node` 分支是**不可达的**。class 名 `bn-suggestion-decorator` 也是 BlockNote 残留。
- `insertMention` 的实现有两份且不一致：`SuggestionMenuView.insertMention`（直接 `insertContent`）和 `MEditor.inserMentionBlock` → `api/InsertMentionBlock.ts`（同样逻辑但绕了一层）。注意后者方法名拼写是 `inserMentionBlock`，少一个 `t`，已被 Vue 层调用固化，改名属于破坏性变更。
- `src/extensions/GhostSuggestionExtension.ts` 目前**编译不过**：`handleTextInput` 里引用了未定义的 `getStorage()` 和 `fetchAutocompletion`，是从 `PromptExtension.ts` 复制后没改完。行内补全功能请以 `PromptExtension.ts` 为准。
- `src/utils/file.ts` 是空文件，`utils/dom.ts` 里的 `createElement` 无人调用。
- `MEditorVue2.vue` 的 `clear()` 里 emit 的是 `update:modelValue`，但该组件声明的是 `value` / `input`（Vue2 约定），事件名对不上。

## 六、动手前的检查清单

新增一个功能时，按序确认：

- [ ] 这个功能过「三问判定」了吗？该进核心包还是框架层？
- [ ] 核心包新增的状态，是不是只有 `{ show, referencePos, query }` 这个量级的信息量？有没有混进数据？
- [ ] 编辑器内部状态走的是 Plugin state 而不是 EventEmitter 吗？
- [ ] 新增的订阅在卸载时取消了吗？（`on()` 的返回值要调用）
- [ ] 新增的 npm 依赖在 `rollupOptions.external` 里排除了吗？
- [ ] 新包有没有引入反向依赖（核心包依赖框架包）？
