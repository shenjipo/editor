<script setup lang="ts">
import { EasyEditor } from '@easy-editor/vue3'
import { ref, shallowRef } from 'vue'

import type { EditorContentSnapshot } from '@easy-editor/vue3'

const INITIAL_HTML = `
<h1>easy-editor</h1>
<p>基于 Tiptap 的 Vue 3 富文本编辑器。试试工具栏上的：<span style="font-size: 20px">字号</span>、<span style="color: #e60000">字体颜色</span>、<span style="background-color: #fff2cc">文本背景色</span>。</p>
<h2>支持的段落格式</h2>
<ul>
  <li>正文 / 标题 1 / 标题 2 / 标题 3</li>
  <li>无序列表、有序列表</li>
</ul>
<h3>序列化</h3>
<ol>
  <li>下方实时显示 v-model 收到的 HTML</li>
  <li>以及一次完整快照（JSON / HTML / 纯文本）</li>
</ol>
`

const content = ref(INITIAL_HTML)
const snapshot = shallowRef<EditorContentSnapshot | null>(null)
const editable = ref(true)
const editorRef = ref<InstanceType<typeof EasyEditor> | null>(null)

function handleChange(next: EditorContentSnapshot): void {
  snapshot.value = next
}

function resetContent(): void {
  content.value = INITIAL_HTML
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">easy-editor</h1>
      <p class="page__subtitle">
        pnpm monorepo · <code>@easy-editor/core</code>（框架无关）+ <code>@easy-editor/vue3</code>（适配层）
      </p>
    </header>

    <section class="card">
      <div class="card__actions">
        <label class="toggle">
          <input v-model="editable" type="checkbox" />
          <span>只读</span>
        </label>
        <button type="button" class="action" @click="editorRef?.clear()">清空</button>
        <button type="button" class="action" @click="resetContent">重置为初始内容</button>
      </div>

      <EasyEditor
        ref="editorRef"
        v-model="content"
        placeholder="开始输入…"
        :editable="editable"
        @change="handleChange"
      />
    </section>

    <section class="panels">
      <div class="panel">
        <h2 class="panel__title">v-model 绑定值（HTML）</h2>
        <pre class="panel__body">{{ content }}</pre>
      </div>

      <div class="panel">
        <h2 class="panel__title">change 事件快照</h2>
        <dl class="meta">
          <dt>纯文本字数</dt>
          <dd>{{ snapshot?.text.length ?? 0 }}</dd>
          <dt>HTML 字节数</dt>
          <dd>{{ snapshot?.html.length ?? 0 }}</dd>
          <dt>顶层节点数</dt>
          <dd>{{ snapshot?.json.content?.length ?? 0 }}</dd>
        </dl>
        <pre class="panel__body panel__body--muted">{{ snapshot?.text || '（还没有输入）' }}</pre>
      </div>
    </section>
  </main>
</template>
