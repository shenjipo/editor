# 分层契约详解：核心包 vs 框架层

## 为什么必须分层

一个富文本输入框组件，如果核心逻辑和 Vue 组件写在一起，会立刻遇到三个死结：

1. **换框架要重写全部逻辑。** Tiptap 本身是框架无关的（它只依赖 ProseMirror），把它的初始化、扩展装配、文档操作和 Vue 的 `onMounted` / `ref` 缠在一起，等于主动放弃了 Tiptap 最大的优势。
2. **UI 形态被锁死。** 候选菜单是下拉列表？分组面板？还是侧边栏？这些决策会污染到文档操作代码。
3. **无法测试。** 文档操作逻辑要跑起来必须先挂一个 Vue 实例。

分层之后，核心包是一个**纯 TS 库**：给它一个 DOM 容器和几个回调，它就能跑。Vue 包是薄薄一层胶水。

## 核心包的对外契约

核心包的全部对外接口就这些。任何新增能力都要能塞进这个形状里：

```ts
export interface MentionEditorOptions {
    element: HTMLElement                              // 挂载点
    onChange: (text: string) => void                  // 纯文本变化
    placeholder?: string
    onFileInput?: (file: File) => void                // 粘贴/拖拽文件
    content?: string                                  // 初始内容
    onMentionDelete?: (item: MentionItem) => void     // mention 被删除
    onEnter?: () => void                              // 提交（语义由 lineBreak 决定）
    lineBreak?: EnterMode                             // 'enter' | 'shift+enter'
    fetchAutocompletion?: (inputText: string) => Promise<string>  // 行内补全
}
```

注意 `fetchAutocompletion` 的形状：**核心包定义接口，调用方提供实现。** 核心包不知道数据从哪来，它只在需要时 `await` 这个函数。同理 `onFileInput` 拿到 `File` 对象后不做任何处理，直接交给宿主。

```ts
// 核心包只负责「拦截」和「转交」，不负责「处理」
const handleFile = async (file: File) => {
    this.options.onFileInput?.(file)
}
```

上传、校验、预览全部在框架层/业务层完成。这就是依赖倒置。

## 框架层的三种绑定

### 1. 生命周期绑定

```ts
onMounted(() => {
    if (editorRef.value) {
        editor.value = new MEditor({
            element: editorRef.value,
            content: props.modelValue,
            onChange: (val) => emit('update:modelValue', val),
            onFileInput: (file) => emit('fileInput', file),
            onMentionDelete: (item) => emit('deleteMention', item),
            onEnter: () => emit('enter'),
            lineBreak: props.options.lineBreak,
            fetchAutocompletion: props.options.fetchAutocompletion,
        })
    }
})
```

**必须在 `onMounted` 里建实例**，因为 `new Editor({ element })` 会往容器里写 DOM，挂载前 ref 是 `null`。

注意这里把核心包的**回调式 API 翻译成了 Vue 的事件 API**：`onChange` → `emit('update:modelValue')`，`onFileInput` → `emit('fileInput')`。核心包用回调、框架层用事件，这个翻译层是框架包存在的意义之一。

### 2. 依赖注入

用 `provide` / `inject` 把 editor 实例传给子树，避免 prop drilling：

```ts
const editor = shallowRef<MEditor>()
provide('editor', editor)
```

```ts
// 任意深度的后代组件
const editor = inject<Ref<MEditor>>('editor')
```

两个要点：

- **用 `shallowRef` 而不是 `ref`。** MEditor 实例内部持有 ProseMirror view、循环引用、DOM 节点，用 `ref` 做深度响应式代理会造成性能灾难和难以排查的 bug。
- **`inject` 的类型是 `Ref<MEditor> | undefined`**，因为注入是可选的。要显式处理 `undefined`，不要用 `!` 硬断言绕过。

### 3. 插槽布局

框架层组件固定三个插槽，把「编辑器周围长什么样」完全交给业务方：

```vue
<div class="mention-editor-wrapper">
    <slot name="header"></slot>          <!-- 例：已上传图片的缩略图条 -->
    <div ref="editorRef" class="mention-editor">
        <slot v-if="editor"></slot>       <!-- 例：SuggestionMenuController 浮层 -->
    </div>
    <slot name="footer"></slot>           <!-- 例：操作按钮、字数统计 -->
</div>
```

默认插槽的 `v-if="editor"` 不能省——浮层组件在 `onMounted` 里 `inject` 并调用 `editor.suggestionMenus.onUpdate()`，editor 未就绪时会崩。

## 边界判定：常见误判

| 需求 | 错误做法 | 正确做法 |
|---|---|---|
| 候选菜单要显示头像和描述 | 往核心包传候选项数据 | 核心包只传 `query`，Vue 层按 query 查数据并渲染 |
| 粘贴图片后先压缩再上传 | 核心包里写压缩逻辑 | 核心包 `onFileInput(file)` 转交，业务层处理 |
| 不同触发符弹出不同菜单 | 核心包加 `menuType` 参数 | 核心包按 `triggerCharacter` 分频道广播，Vue 层订阅各自关心的那个 |
| 菜单打开时要禁用某个快捷键 | 核心包加 `isMenuOpen` 配置项 | 核心包内部已有 `suggestionMenus.shown`，插件间直接读 |
| 空内容时显示不同 placeholder | 核心包判断业务状态 | `Placeholder.configure({ placeholder })` 由调用方配置 |

最后一行值得展开：`ShiftEnterPlugin` 需要知道「菜单开着没」才能决定 Enter 该不该被菜单吃掉。它**没有**通过 options 传参，而是直接读兄弟插件的公开状态：

```ts
// suggestion 打开时，让 suggestion 处理
if (editor.suggestionMenus?.shown) {
    return false
}
```

**插件之间通过实例上的只读访问器协作，而不是通过配置项。** 配置项是给外部调用方的，插件间通信走内部引用。

## 核心包内部的模块划分

即便是核心包内部，也保持同样的分离习惯：

```
src/
├── editor.ts                 # 唯一入口类 MEditor：组装扩展、暴露公开方法
├── schema/base.ts            # 纯 schema 定义，一个数组导出
├── blocks/MentionBlock.ts    # 自定义节点定义（无副作用）
├── extensions/               # 每个扩展一个目录
│   ├── SuggestionMenu/
│   │   ├── SuggestionPlugin.ts   # 实现
│   │   └── types.ts              # 该扩展的类型契约
│   ├── FileInput/
│   ├── MentionDeletePlugin/
│   ├── ShiftEnterPlugin/
│   └── PromptExtension.ts
├── api/                      # 对外的命令式操作
│   └── InsertMentionBlock.ts
└── utils/                    # 无业务语义的纯工具
    ├── EventEmitter.ts
    └── dom.ts
```

规则：

- **每个扩展一个目录，实现和类型分文件。** 跨扩展复用的类型（如 `UiElementPosition`）提到 `extensions-shared/`。
- **`editor.ts` 是唯一知道全部扩展的地方。** 扩展之间不互相 import 实现，只 import 类型。装配顺序在 `MEditor` 构造函数里一刀切。
- **`api/` 放命令式操作**，供宿主主动调用（插入 mention、清空）。这类操作和扩展的区别是：扩展响应编辑器内部事件，`api/` 响应外部调用。

```ts
// editor.ts —— 组装点
const MEditorUIExtension = Extension.create({
    name: 'MEditorUIExtension',
    addProseMirrorPlugins: () => [
        this.suggestionMenus.plugin,
        this.mentionDeletePlugin.plugin,
        this.shiftEnterPlugin.plugin,
    ],
})
```

用一个匿名 `Extension.create` 把多个 `new Plugin()` 打包塞进 Tiptap 的扩展数组——因为 Tiptap 的 `extensions` 只接受 `Extension` 实例，而我们需要的是多个共享 `MEditor` 引用的有状态插件实例。这些插件需要 `editor` 引用（读 options、读兄弟插件状态、派发事务），所以必须在 `MEditor` 构造时 `new` 出来而不是用 `Extension.create()` 的静态工厂。
