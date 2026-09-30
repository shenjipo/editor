# ProseMirror 配方集

落地细节。每条配方都对应本仓库里的一处真实实现，附上取舍理由。配方编号在 SKILL.md 的链路追踪里被引用。

## 配方 1：插件状态机

Plugin 的 `state` 是编辑器的内部状态存储，随事务演化：

```ts
type SuggestionPluginState =
    | {
        triggerCharacter: string
        deleteTriggerCharacter: boolean
        queryStartPos: number
        query: string
        decorationId: string
        ignoreQueryLength?: boolean
    }
    | undefined        // ★ undefined = 未激活
```

**用 `undefined` 而不是 `{ active: false }`。** 好处是视图层的三态检测变得极其干净：

```ts
const started = prev === undefined && next !== undefined   // 刚打开
const stopped = prev !== undefined && next === undefined   // 刚关闭
const changed = prev !== undefined && next !== undefined   // 开着且在变
```

### apply() 的三段结构

```ts
apply(transaction, prev, _oldState, newState): SuggestionPluginState {
    const meta = transaction.getMeta(suggestionMenuPluginKey)

    // ① 打开：收到 meta 且当前未激活
    if (typeof meta === 'object' && meta !== null && prev === undefined) {
        return {
            triggerCharacter: meta.triggerCharacter,
            deleteTriggerCharacter: meta.deleteTriggerCharacter !== false,
            queryStartPos: transaction.selection?.from || newState.selection.from,
            query: '',
            decorationId: `id_${Math.floor(Math.random() * 0xffffffff)}`,   // 每会话唯一锚点
            ignoreQueryLength: meta?.ignoreQueryLength,
        }
    }

    // ② 未激活时不做任何事
    if (prev === undefined) return prev

    // ③ 关闭条件
    if (
        newState.selection.from !== newState.selection.to ||     // 有选区（用户选中了文本）
        meta === null ||                                          // 显式关闭信号
        transaction.getMeta('focus') || transaction.getMeta('blur') || transaction.getMeta('pointer') ||
        (prev.triggerCharacter !== undefined && newState.selection.from < prev.queryStartPos!)
    ) {
        return undefined
    }

    // ④ 更新 query
    const next = { ...prev }
    next.query = newState.doc.textBetween(prev.queryStartPos!, newState.selection.from)
    return next
}
```

三个要点：

- **① 用 `typeof meta === 'object' && meta !== null` 判别打开信号。** 关闭信号是 `meta === null`（由 `tr.setMeta(key, null)` 发出），打开是对象。用 `undefined`（无 meta）表示「这次事务与菜单无关」，保持原状态。三种 meta 取值对应三种语义，不要混淆。
- **③ 的 `from !== to` 关闭条件是必须的。** 用户按 Ctrl+A 或拖选文本时，`queryStartPos` 到 `selection.from` 的区间计算会失控，必须先关掉菜单。
- **④ 每次输入都重算 query，而不是增量拼接。** `doc.textBetween(start, current)` 是幂等的全量计算，用户按退格、粘贴、撤销都能正确反映。增量拼接在撤销场景会错。

### 每次编辑都新建 decorationId

`decorationId` 用随机数生成，保证每次激活的锚点 DOM 都不同。如果复用旧 id，快速关闭再打开时 `querySelector` 可能命中上一次的残留节点（React/Vue 复用 DOM 或 PM 尚未清理），拿到过期坐标。

## 配方 2：Transaction meta 作为单向通道

**命令 → 状态** 的写入路径只有一条：`tr.setMeta`。

```ts
// 写入侧：任何地方想打开菜单，都派发一个带 meta 的事务
view.dispatch(
    view.state.tr.insertText(text).scrollIntoView().setMeta(suggestionMenuPluginKey, {
        triggerCharacter: text,
    })
)
```

```ts
// 关闭侧：null 表示显式关闭
closeMenu = () => {
    this.editor.dispatch(
        this.editor._tiptapEditor.view.state.tr.setMeta(suggestionMenuPluginKey, null)
    )
}
```

为什么不让外部直接改 state？**因为 Plugin state 是事务的派生值，不是可写变量。** 绕过事务直接改会导致文档和状态不一致、undo/redo 错乱。所有变更必须经过 `apply()`，这是 ProseMirror 的核心不变式。

meta 的三种取值语义要写进注释，这是最容易搞混的地方：

| meta 值 | 含义 | apply 行为 |
|---|---|---|
| `undefined`（无 meta） | 本次事务与菜单无关 | 保持 `prev`（但要过关闭条件检查） |
| `{ triggerCharacter, ... }` | 请求打开 | 若未激活则建 state |
| `null` | 请求关闭 | 返回 `undefined` |

## 配方 3：拦截输入 —— handleTextInput vs handleKeyDown

两个 prop 的职责不同，选错会导致按键被吞或重复插入。

```ts
// 拦截可打印字符
handleTextInput(view, _from, _to, text) {
    const state = (this as Plugin).getState(view.state)
    if (triggerCharacters.includes(text) && state === undefined) {
        view.dispatch(view.state.tr.insertText(text).setMeta(key, { triggerCharacter: text }))
        return true     // ★ 阻止默认插入，字符已由我们手动插入
    }
    return false        // 不干预
}
```

**返回 `true` 表示「我处理了，别再做默认行为」。** 这里手动 `insertText` 之后必须返回 `true`，否则 ProseMirror 会再插一次，用户看到两个 `/`。

```ts
// 拦截功能键
handleKeyDown(view, event) {
    if (event.key !== 'Enter') return false

    const shouldCallOnEnter = (mode === 'enter' && event.shiftKey) ||
                              (mode === 'shift+enter' && !event.shiftKey)

    if (shouldCallOnEnter) {
        if (editor.suggestionMenus?.shown) return false   // ★ 菜单开着，让位
        if (onEnter) { event.preventDefault(); onEnter(); return true }
        return false
    }

    // 默认换行 —— 手动插 hard_break
    event.preventDefault()
    const { state, dispatch } = view
    const hard_break = state.schema.nodes.hard_break
    if (!hard_break) return false
    dispatch(state.tr.replaceSelectionWith(hard_break.create()).scrollIntoView())
    return true
}
```

三个要点：

- **`event.preventDefault()` 在 `handleKeyDown` 里比返回 `true` 更可靠。** 两者都做是安全的。
- **`isComposing` 必须检查。** 中文输入法组字过程中会触发 Enter，如果直接当成提交，用户输入中文时会被反复打断。见配方 8。
- **优先级让位。** 菜单打开时 Enter 应该选中候选项，`ShiftEnterPlugin` 通过 `editor.suggestionMenus?.shown` 主动让位并 `return false`，把事件交还给别的处理器。**这是插件间协作的标准姿势**：不是抢事件，而是判断该不该让。

## 配方 4：Decoration 的三种形态

Decoration 是「不改文档内容，只改渲染」的机制。三种构造方式，用途完全不同。

### `Decoration.inline` —— 给一段文本加属性

```ts
DecorationSet.create(state.doc, [
    Decoration.inline(
        queryStartPos - triggerCharacter.length,   // from：触发字符位置
        queryStartPos,                              // to
        {
            nodeName: 'span',
            class: 'bn-suggestion-decorator',
            'data-decoration-id': decorationId,     // ★ 反查用的锚点
        }
    ),
])
```

**只装饰触发字符本身，不装饰 query。** 因为 query 会随输入变长，装饰区间固定的话需要每次重算；而触发字符位置是固定的，装饰它一个字符就够了。

`data-decoration-id` 是给 `view.update` 反查用的——配方 5。

### `Decoration.node` —— 给整个块节点加属性

```ts
const blockNode = findBlock(state.selection)
if (blockNode) {
    return DecorationSet.create(state.doc, [
        Decoration.node(blockNode.pos, blockNode.pos + blockNode.node.nodeSize, {...}),
    ])
}
```

⚠️ **本仓库这段是死代码。** `findBlock` 找的是 `blockContainer` 节点（BlockNote 的 schema 概念），而本项目 schema 只有 Document / Paragraph / Text / HardBreak，永远返回 `null`。要装饰段落应该用 `findParentNode(n => n.type.name === 'paragraph')`。

### `Decoration.widget` —— 在位置插入一个 DOM 元素

用于「幽灵文本」、行内补全提示这类**不属于文档内容**的渲染：

```ts
const widget = Decoration.widget(
    state.selection.from,                     // 光标位置
    () => {
        const span = document.createElement('span')
        span.className = 'data-ghost-suggestion'
        span.textContent = pluginState.suggestion || ''
        return span
    },
    { side: 1 }                               // side: 1 = 渲染在光标右侧
)
```

widget 的第二个参数是**工厂函数**，每次渲染都会调用，所以里面创建的 DOM 不会被复用——不要在里面做副作用。

**装饰不需要存在于文档里，也不要写进文档。** 它是视图层的叠加层，用户按 Tab 接受时才用 `insertText` 真正写进文档：

```ts
if (event.key === 'Tab') {
    event.preventDefault()
    const tr = view.state.tr
        .insertText(pluginState.suggestion, view.state.selection.from)
        .setMeta(ghostSuggestionPluginKey, { suggestion: null })
    view.dispatch(tr)
    return true
}
```

## 配方 5：用 DOM 反查拿坐标

核心包不计算坐标，而是让 ProseMirror 算，自己按 id 查：

```ts
const decorationNode = this.rootEl?.querySelector(
    `[data-decoration-id="${this.pluginState!.decorationId}"]`
)

if (this.editor.isEditable && decorationNode) {
    this.state = {
        show: true,
        referencePos: decorationNode.getBoundingClientRect(),   // ★ 真实屏幕坐标
        query: this.pluginState!.query,
    }
}
```

**`this.rootEl` 要延迟获取**，因为构造函数执行时 view 还没建好：

```ts
setTimeout(() => {
    this.rootEl = this.editor._tiptapEditor.view.root
})
```

`view.root` 而不是 `document`——为了支持 Shadow DOM 场景。用 `document.querySelector` 在多实例或 shadow root 里会选错元素。

坐标交给浏览器算的好处：换行、滚动、缩放、flex 布局全都不需要自己处理。

## 配方 6：appendTransaction 观察文档差异

「某个节点被删除了」这类事件 ProseMirror 没有直接回调，用 `appendTransaction` 对比前后文档推导：

```ts
appendTransaction(transactions, oldState, newState) {
    if (!transactions.some(tr => tr.docChanged)) return null   // ① 没有文档变更直接跳过

    const oldMentions = new Map<string, any>()
    const newMentionIds = new Set<string>()

    oldState.doc.descendants(node => {
        if (node.type.name === 'mention' && node.attrs.id) {
            oldMentions.set(node.attrs.id, node.attrs)
        }
    })

    newState.doc.descendants(node => {
        if (node.type.name === 'mention' && node.attrs.id) {
            newMentionIds.add(node.attrs.id)
        }
    })

    for (const [id, attrs] of oldMentions.entries()) {
        if (!newMentionIds.has(id)) {
            onMentionDelete?.({ id: attrs.id, label: attrs.label })
        }
    }

    return null    // ★ 只观察，不修改文档
}
```

四个要点：

- **① 早退必须有。** `appendTransaction` 在每次事务后都会跑，选区移动等非文档变更的事务要先过滤掉，否则每次都做全文档遍历。
- **用 id 而不是位置做对比。** 位置在编辑后会变，id 是稳定的。这也是 mention 节点必须有 `id` 属性的原因。
- **返回 `null` 表示不追加事务。** 这里只做副作用（通知外部），不修改文档。`appendTransaction` 也可以返回新事务来修正文档，但那会引入递归风险。
- **性能意识。** 每次编辑都全文档遍历，文档很大时是 O(n)。优化方向：把 mention 位置缓存在 plugin state 里增量维护，而不是每次重扫。

## 配方 7：自定义原子节点

mention 是「不可编辑、不可拆分」的内联节点：

```ts
export const MentionBlock = Node.create({
    name: 'mention',
    inline: true,        // 内联节点（和文本同级）
    group: 'inline',     // 归入 inline group，可出现在段落里
    atom: true,          // ★ 原子节点：整体选中、整体删除、内部不可编辑
    selectable: false,   // 不可单独选中（避免点击时出现选区）

    addAttributes() {
        return {
            id: { default: null },
            label: { default: null },
        }
    },

    parseHTML() {
        return [{ tag: 'span[data-type="mention"]' }]
    },

    renderHTML({ node }) {
        return [
            'span',
            {
                class: 'mention',
                'data-type': 'mention',
                'data-id': node.attrs.id,
                'data-label': node.attrs.label,
                contenteditable: 'false',    // ★ 浏览器层面禁止编辑
            },
            node.attrs.label,                 // 显示文本
        ]
    },

    renderText({ node }) {
        return ''                            // ★ 文本序列化时为空
    },
})
```

三个属性的取舍：

- **`atom: true`** 是必须的。否则用户可以把光标移进 mention 中间，破坏数据结构。
- **`contenteditable: 'false'`** 双保险。`atom` 是 ProseMirror 逻辑层的，这个属性是浏览器 DOM 层的。
- **`renderText` 返回空串**，所以 `editor.getText()` 不会包含 mention 的 label。**这是当前实现的一个设计缺陷**——`onChange` 收到的文本丢失了 mention 信息，宿主如果只存 `getText()` 的结果，mention 就永久丢了。正确做法是返回 `node.attrs.label`，或者让宿主用 `getAllMentionBlocks()` 单独取。**新项目别抄这条。**

`renderHTML` 里 `data-*` 属性和 `parseHTML` 的 `tag` 选择器必须对应，否则复制粘贴或 `setContent()` 时 mention 会退化成普通文本。

## 配方 8：异步补全与中文输入法

行内 AI 补全涉及防抖、异步竞态、输入法三个坑。

```ts
handleTextInput(view, _, __, text) {
    const { $from } = view.state.selection
    const node = $from.parent
    const [from, to] = [$from.start() - 1, $from.end() + 2]     // ① 整个段落节点范围
    const existingText = node.textContent

    if (existingText) {
        const storage = getStorage()
        if (storage.data.timer) clearTimeout(storage.data.timer)  // ② 防抖

        storage.data.timer = setTimeout(() => {
            fetchAutocompletion(existingText + text).then((res) => {   // ③ 异步
                storage.data.currentSuggestion = res
                storage.data.nodeDetails = { from, to }
                storage.data.timer = null
                view.dispatch(view.state.tr.setMeta('addToHistory', false))   // ④ 触发重渲染
            })
        }, 500)
    }
    return false     // ★ 不拦截，用户输入照常
}
```

- **① `$from.start() - 1` / `$from.end() + 2`** 是为了覆盖段落节点的完整范围（含开闭标记），用于后续 `Decoration.node` 装饰。硬编码的 ±1/+2 是 ProseMirror 的节点边界约定，脆弱但常见。
- **② `clearTimeout` 防抖 500ms。** 每次击键都请求会打爆接口。
- **③ 异步竞态未处理。** 连续两次请求如果返回顺序颠倒，会显示旧结果。修法：请求前记录一个递增的 token，回调里比对 token 是否仍是最新。
- **④ `setMeta('addToHistory', false)`** 是最小副作用的重渲染触发手段——派发一个空事务，标记不进历史，让 plugin 的 `apply()` 重算 decoration。
- **`return false`**：补全提示不能拦截输入，用户是在正常打字。

### 中文输入法的处理

`useSuggestionMenuKeyboardNavigation` 里：

```ts
if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    if (items.value.length) onItemClick?.(items.value[selectedIndex.value])
    return true
}
```

**`!event.isComposing` 不能省。** 中文/日文输入法组字时按 Enter 是「确认候选词」，不是「提交」。不判断会导致用户每敲一个词就被提交一次。

注意 `ShiftEnterPlugin` 里的 Enter 处理**没有**做这个判断——它拦截了 Enter 但没检查 `isComposing`。这是本仓库的一个 bug，在中文输入法下用 `shift+enter` 模式会误触发 `onEnter`。

## 配方 9：在编辑器 DOM 上挂原生事件

菜单键盘导航（↑↓ 选择、Enter 确认）不用 ProseMirror 的 `handleKeyDown`，而是直接监听编辑器 DOM：

```ts
onMounted(() => {
    editor.domElement.addEventListener('keydown', handleMenuNavigationKeys, true)
})
onBeforeUnmount(() => {
    editor.domElement.removeEventListener('keydown', handleMenuNavigationKeys, true)
})
```

第三个参数 `true` 是**捕获阶段**，这是关键：

- 菜单是浮层，焦点始终在编辑器里，按键先经过编辑器 DOM
- 用捕获阶段能在 ProseMirror 的 `handleKeyDown` 之前拿到事件
- 如果放在冒泡阶段，ProseMirror 可能已经把 ↑↓ 处理成光标的行间移动了

这样分层的意义是：**核心包负责「编辑器自身」的按键语义，框架层负责「浮层 UI」的按键语义。** 菜单导航是 UI 行为，不该进核心包。

代价是要自己管生命周期——`onBeforeUnmount` 里的 `removeEventListener` 必须和 `addEventListener` 的参数完全一致（同一个函数引用、同样的 `true`），否则移除不掉。

## 配方 10：存储区放非响应式数据

Tiptap 的 `addStorage()` 提供一块跟着扩展实例走的存储：

```ts
addStorage() {
    return { data: {} as { currentSuggestion?: string; nodeDetails?: {from:number;to:number}; timer?: number|null } }
}
```

用它放**防抖定时器、当前建议文本、装饰区间**这类临时数据：

```ts
const storage = getStorage()
storage.data.currentSuggestion = res
```

要点：

- **不要在闭包变量里存。** 扩展实例可能被 Tiptap 重建，闭包变量会跨实例泄漏。
- **`timer` 的类型是 `number | null`**，因为浏览器里 `setTimeout` 返回 number（Node 环境是 Timeout 对象，类型不同）。
- **这些数据不参与 ProseMirror 事务**，所以不能触发重渲染。要更新视图必须显式 `view.dispatch(view.state.tr.setMeta('addToHistory', false))`。

⚠️ 本仓库 `GhostSuggestionExtension.ts` 里 `getStorage()` 和 `fetchAutocompletion` 都**未定义**——是从 `PromptExtension.ts` 复制后没改完的残骸，该文件目前编译不过。行内补全请以 `PromptExtension.ts` 为准。
