# 发布订阅模式在编辑器中的运用

## 先划清界限：两套机制，各管一段

编辑器里有两类「状态变化」，必须用两套机制，混用必出 bug：

| | 编辑器内部状态 | 跨层通知 |
|---|---|---|
| **例子** | 菜单是否激活、query 是什么、装饰区间 | 「菜单要显示了，位置在这」 |
| **机制** | ProseMirror Plugin state + Transaction meta | EventEmitter |
| **原因** | 必须跟随事务、可 undo/redo 回滚、被 `appendTransaction` 观察 | 不参与事务，只是广播 |
| **生命周期** | 随文档状态，PM 管理 | 随订阅方，需手动清理 |

**反例：** 如果用 EventEmitter 存「菜单是否打开」，那么用户按 Ctrl+Z 撤销掉触发字符时，文档回滚了但 emitter 里的标记还在——菜单悬浮在一个不存在的 `/` 上。Plugin state 不会有这个问题，因为它在 `apply()` 里跟着事务重算。

**反例：** 如果用 Plugin state 做跨层通知，Vue 层就得轮询 state 或 hook 进 `view.update`，等于把框架层塞进了 ProseMirror 生命周期。

判断标准一句话：**这个状态在 undo 时该不该回滚？** 该 → Plugin state。不该 → EventEmitter。

## EventEmitter 实现要点

```ts
export class EventEmitter<T extends Record<string, any>> {
    private callbacks: { [key: string]: Function[] } = {}

    public on<EventName extends StringKeyOf<T>>(event: EventName, fn: CallbackFunction<T, EventName>) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = []
        }
        this.callbacks[event].push(fn)

        return () => this.off(event, fn)     // ★ 返回取消函数
    }

    protected emit<EventName extends StringKeyOf<T>>(event: EventName, ...args: CallbackType<T, EventName>) {
        const callbacks = this.callbacks[event]
        if (callbacks) {
            callbacks.forEach(callback => callback.apply(this, args))
        }
    }

    public off<EventName extends StringKeyOf<T>>(event: EventName, fn?: CallbackFunction<T, EventName>) {
        // fn 省略时清空该事件的全部监听
    }
}
```

三个设计点值得照抄：

1. **`on()` 返回取消函数。** 调用方拿到的是一句 `const unsubscribe = on(...)`，卸载时一句 `unsubscribe()`。不需要保存回调引用来配对 `off`——这是最容易出错的地方。
2. **`emit` 是 `protected`。** 只有继承者能广播，外部只能订阅。防止业务方伪造事件。
3. **类型化的 `CallbackType` 推导。** 事件名和参数类型强绑定，`on('update /', cb)` 里 `cb` 的签名自动正确。

泛型参数 `T` 在实践里可以直接用 `any`（`extends EventEmitter<any>`）——因为事件名是运行时动态拼出来的（`` `update ${triggerCharacter}` ``），无法在类型层穷举。这里放弃类型安全换取动态能力是划算的。

## 动态事件名：订阅即注册

核心难点在于触发字符是运行时才知道的，事件名形如 `update /`、`update @`。如果直接暴露 `emit` / `on`，调用方得自己知道要注册哪个字符：

```ts
// ✗ 双层 API，调用方容易忘记注册
editor.suggestionMenus.addTriggerCharacter('/')
editor.suggestionMenus.on('update /', cb)
```

合并成一个：

```ts
public onUpdate(triggerCharacter: string, callback: (state: SuggestionMenuState) => void) {
    if (!this.triggerCharacters.includes(triggerCharacter)) {
        this.addTriggerCharacter(triggerCharacter)     // 幂等注册
    }
    return this.on(`update ${triggerCharacter}`, callback)
}
```

**「我关心 `/` 触发的菜单」这个声明同时完成了两件事：让核心包开始监听 `/` 键，以及订阅 `/` 的更新流。** 这是这套 API 最漂亮的地方——调用方无法表达出不一致的状态。

配套的 `handleTextInput` 里：

```ts
if (triggerCharacters.includes(text) && suggestionPluginState === undefined) {
    view.dispatch(
        view.state.tr.insertText(text).scrollIntoView().setMeta(suggestionMenuPluginKey, {
            triggerCharacter: text,
        })
    )
    return true   // 阻止默认插入
}
```

只有被订阅过的字符才会被拦截。没人在听的 `/` 就是普通斜杠，正常输入。

`removeTriggerCharacter` 目前存在但没有调用方——要真正支持动态解绑，需要在 `off` 时检查该事件是否还有监听者，无则移除。**当前实现的已知局限：注册是永久的。**

## 广播侧：从视图到订阅者

```ts
class SuggestionMenuView {
    update(view: EditorView, prevState: EditorState) {
        const prev = suggestionMenuPluginKey.getState(prevState)
        const next = suggestionMenuPluginKey.getState(view.state)

        const started = prev === undefined && next !== undefined
        const stopped = prev !== undefined && next === undefined
        const changed = prev !== undefined && next !== undefined

        if (!started && !changed && !stopped) return    // ① 早退

        this.pluginState = stopped ? prev : next        // ② stopped 时保留旧 state

        if (stopped || !this.editor.isEditable) {
            this.state!.show = false
            this.emitUpdate(this.pluginState!.triggerCharacter)
            return
        }

        const decorationNode = this.rootEl?.querySelector(
            `[data-decoration-id="${this.pluginState!.decorationId}"]`
        )

        if (this.editor.isEditable && decorationNode) {
            this.state = {
                show: true,
                referencePos: decorationNode.getBoundingClientRect(),
                query: this.pluginState!.query,
            }
            this.emitUpdate(this.pluginState!.triggerCharacter!)
        }
    }
}
```

三个细节：

- **① 早退必须有。** `view.update` 在每次事务后都会跑，绝大多数事务和菜单无关。没有早退会导致每个按键都广播一次，Vue 层疯狂重渲染。
- **② `stopped` 时用 `prev`。** 因为 `next` 是 `undefined`，而关闭通知里还需要 `triggerCharacter` 才知道往哪个频道发。这是 `pluginState` 这个字段存在的唯一理由。
- **位置从 DOM 反查，不从 plugin state 算。** `data-decoration-id` 是 ③ 步装饰时打上的，这里按 id 查节点拿 `getBoundingClientRect()`。坐标计算委托给 ProseMirror。

## 订阅侧：Vue 的挂载/卸载配对

```ts
let unsubscribe: any = null

onMounted(() => {
    unsubscribe = editor?.value.suggestionMenus.onUpdate(
        props.triggerCharacter,
        (newState) => { state.value = newState }
    )
})

onUnmounted(() => {
    unsubscribe?.()
})
```

**`unsubscribe` 声明在 `setup` 作用域而不是 `ref`。** 它不是响应式数据，只是回调引用，包成 `ref` 会引入不必要的代理。

**必须配对。** 菜单组件通常以 `v-if` 控制显隐，反复挂载不取消订阅会导致同一个 state 更新触发 N 次回调，且旧的组件实例被闭包引用无法回收。

## 多个订阅者互不干扰

业务方按触发字符挂载不同的菜单：

```vue
<SuggestionMenuController trigger-character="/">
    <template v-slot="menu"><SlashMenu v-bind="menu" /></template>
</SuggestionMenuController>

<SuggestionMenuController trigger-character="@">
    <template v-slot="menu"><AtMenu v-bind="menu" /></template>
</SuggestionMenuController>
```

两个控制器订阅各自的频道。敲 `/` 时只有第一个收到更新，第二个的 `state` 保持 `null`，`showDom` 为 `false`，不渲染。

`showDom` 的计算里还有一层**订阅方自己的过滤逻辑**：

```ts
const showDom = computed(() => {
    const res = state.value?.show &&
        (!props.minQueryLength ||                              // 没配最小长度就放行
            state.value.ignoreQueryLength ||                   // 核心包说忽略就放行
            (!state.value.query.startsWith(' ') &&             // 首字符是空格则不放行
                state.value.query.length >= props.minQueryLength))
    return res === undefined ? false : res
})
```

注意 `minQueryLength` 是**框架层参数**，不是核心包参数。核心包只管广播原始 state，过滤策略由订阅方决定——`/` 菜单可能要求输 1 个字符才显示，`@` 菜单可能一敲就弹出。同一个 state，不同订阅方有不同策略。这正是 pub/sub 相对配置项的优势。

`ignoreQueryLength` 是唯一的例外：它是核心包在 state 里塞的逃生舱，用于「程序化打开菜单，忽略长度限制」的场景。这类逃生舱要克制，加一个就要在文档里说清楚。

## 与其他两套机制的关系

```
                          ┌─────────────────────────────┐
   用户击键 ──► handleTextInput ──► tr.setMeta ──► Plugin state
                          └─────────────────────────────┘
                                    │              ▲
                          （编辑器内部，事务驱动）  │
                                    ▼              │
                              view.update          │
                                    │              │
                          ┌─────────▼──────────┐   │
                          │  EventEmitter.emit │   │（跨层广播）
                          └─────────┬──────────┘   │
                                    │              │
                              Vue 订阅回调 ────────┘ 调用 closeMenu/clearQuery/insertMention
                                    │              （回到编辑器，派发新事务）
                                    ▼
                            options 回调 ──► 宿主业务（onChange / onEnter / onFileInput）
```

三条通道各司其职：**meta 向内，emitter 向外，options 向宿主。** 任何一条越界都会破坏分层。
