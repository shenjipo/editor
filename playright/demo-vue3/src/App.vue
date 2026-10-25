<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { EasyEditor } from '@shenjipo/editor-vue3'
import type { EditorContentSnapshot, MentionItem, MentionSource } from '@shenjipo/editor-vue3'
import editorVue3Pkg from '@shenjipo/editor-vue3/package.json'
import editorCorePkg from '@shenjipo/editor-core/package.json'

const initialHtml = `
<h1>从 npm 安装的 easy-editor</h1>
<p>这个页面没有任何 monorepo 别名，<strong>@shenjipo/editor-vue3</strong> 与
<strong>@shenjipo/editor-core</strong> 全部来自 registry 上的 <code>dist</code> 构建。</p>
<h2>可以试试</h2>
<ul>
  <li>选中文字，修改字号、颜色、背景色</li>
  <li>插入链接、网络图片、表格</li>
  <li>输入 <code>@</code> 或 <code>#</code> 唤出提及列表</li>
  <li>撤销 / 重做、切换代码块语言</li>
</ul>
<blockquote><p>右侧面板会实时显示 v-model 与 change 事件的结果。</p></blockquote>
`.trim()

const content = ref(initialHtml)
const snapshot = ref<EditorContentSnapshot | null>(null)
const editorRef = ref<InstanceType<typeof EasyEditor> | null>(null)

const view = ref<'html' | 'json' | 'text'>('html')
const tabs = [
  { key: 'html', label: 'HTML' },
  { key: 'json', label: 'JSON' },
  { key: 'text', label: 'Text' },
] as const

const copied = ref(false)

function onChange(next: EditorContentSnapshot) {
  snapshot.value = next
}

// 首次进入时用暴露的 getSnapshot() 初始化输出面板，顺便验证 defineExpose 可用。
onMounted(() => {
  snapshot.value = editorRef.value?.getSnapshot() ?? null
})

function focusEditor() {
  editorRef.value?.focus()
}

function loadSample() {
  content.value = initialHtml
}

function clearEditor() {
  editorRef.value?.clear()
}

const displayed = computed(() => {
  if (!snapshot.value) return ''
  return view.value === 'json'
    ? JSON.stringify(snapshot.value.json, null, 2)
    : snapshot.value[view.value]
})

async function copy() {
  if (!displayed.value) return
  await navigator.clipboard.writeText(displayed.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1200)
}

const members: MentionItem[] = [
  { id: 'zhangsan', label: '张三', description: '产品部' },
  { id: 'lisi', label: '李四', description: '设计部' },
  { id: 'wangwu', label: '王五', description: '研发部' },
]

const tags: MentionItem[] = [
  { id: 'design', label: '产品设计' },
  { id: 'growth', label: '增长实验' },
  { id: 'tech', label: '技术方案' },
]

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 消费者只需提供数据源；弹层、键盘交互、写回文档都由组件库处理。
const mentionSources: MentionSource[] = [
  {
    char: '@',
    labels: { title: '提及成员' },
    debounce: 150,
    items: async (query) => {
      await delay(250) // 模拟接口延迟，弹层会显示 loading
      return members.filter((item) => item.label.includes(query))
    },
  },
  {
    char: '#',
    labels: { title: '关联标签' },
    items: (query) => tags.filter((item) => item.label.includes(query)),
  },
]
</script>

<template>
  <main class="page">
    <header class="hero">
      <div>
        <h1>easy-editor · npm 消费者 Demo</h1>
        <p class="sub">
          通过 <code>pnpm install</code> 使用
          <code>@shenjipo/editor-vue3@{{ editorVue3Pkg.version }}</code> 和
          <code>@shenjipo/editor-core@{{ editorCorePkg.version }}</code>，没有使用源码别名。
        </p>
      </div>
      <span class="badge">playright/demo-vue3</span>
    </header>

    <div class="grid">
      <section class="card">
        <EasyEditor
          ref="editorRef"
          v-model="content"
          :mention-sources="mentionSources"
          placeholder="开始输入… 试试 @ 或 #"
          @change="onChange"
        />

        <div class="actions">
          <button type="button" @click="focusEditor">聚焦</button>
          <button type="button" @click="loadSample">重置示例</button>
          <button type="button" @click="clearEditor">清空</button>
        </div>

        <p class="hint">
          没有传 <code>upload-image</code>：插入的图片会以 base64 内联，不需要后端。
        </p>
      </section>

      <aside class="card output">
        <div class="output-head">
          <div class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              :class="{ active: view === tab.key }"
              @click="view = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
          <button type="button" class="copy" :disabled="!displayed" @click="copy">
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>

        <pre v-if="displayed">{{ displayed }}</pre>
        <p v-else class="empty">在左侧编辑内容，这里会实时显示 v-model / change 的输出。</p>

        <p v-if="snapshot" class="meta">字符数：{{ snapshot.text.length }}</p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 20px 80px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

h1 {
  margin: 0 0 8px;
  font-size: 24px;
  letter-spacing: -0.01em;
}

.sub {
  margin: 0;
  color: #59636e;
  line-height: 1.7;
  font-size: 14px;
}

.badge {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e8f0fe;
  color: #1d4ed8;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.card {
  padding: 16px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(31 35 40 / 4%);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.actions button,
.copy {
  padding: 6px 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #f6f8fa;
  color: #1f2328;
  font-size: 13px;
  cursor: pointer;
}

.actions button:hover,
.copy:hover:not(:disabled) {
  background: #eef1f4;
}

.hint {
  margin: 10px 0 0;
  color: #6e7781;
  font-size: 12px;
}

.output {
  position: sticky;
  top: 20px;
}

.output-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tabs button {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #59636e;
  font-size: 13px;
  cursor: pointer;
}

.tabs button.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 600;
}

.copy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

pre {
  margin: 0;
  max-height: 520px;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: #0d1117;
  color: #e6edf3;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty {
  margin: 0;
  padding: 24px 12px;
  color: #8b949e;
  font-size: 13px;
  text-align: center;
}

.meta {
  margin: 10px 0 0;
  color: #6e7781;
  font-size: 12px;
}
</style>
