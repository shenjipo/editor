<script lang="ts">
import { defineComponent, markRaw } from 'vue'

import { EasyEditor, readFileAsDataUrl } from '@easy-editor/vue2'
import { Editor as WangEditor, Toolbar as WangToolbar } from '@wangeditor/editor-for-vue'

import { INITIAL_CONTENT, SAMPLE_FROM_EASY, SAMPLE_FROM_WANG } from './samples'
import { markdownToHtml, STREAM_DOCUMENT, streamMarkdown } from './streaming'

import type { EditorContentSnapshot, MentionItem, MentionSource } from '@easy-editor/vue2'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'

/* ------------------------------------------------------------ 提及数据 */

/** 模拟「接口返回的成员列表」。真实项目里把 items 换成 fetch 即可。 */
const MENTION_MEMBERS: MentionItem[] = [
  { id: 'u-zhang', label: '张三', description: '前端工程师 · 平台组' },
  { id: 'u-li', label: '李四', description: '产品经理 · 增长组' },
  { id: 'u-wang', label: '王五', description: '后端工程师 · 基础架构' },
  { id: 'u-zhao', label: '赵六', description: '设计师 · 品牌组' },
  { id: 'u-chen', label: '陈七', description: '数据分析师 · 增长组' },
  { id: 'u-anna', label: 'Anna', description: 'Engineering Manager' },
]

const MENTION_TOPICS: MentionItem[] = [
  { id: 't-design', label: '产品设计', description: '12 篇文档' },
  { id: 't-growth', label: '增长实验', description: '8 篇文档' },
  { id: 't-infra', label: '基础设施', description: '5 篇文档' },
  { id: 't-review', label: 'Code Review', description: '21 条讨论' },
]

/** 模拟接口延迟：300ms 后才返回过滤结果。等待期间弹层显示 loading。 */
function searchMentionItems(all: readonly MentionItem[], query: string): Promise<MentionItem[]> {
  const keyword = query.trim().toLowerCase()

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!keyword) {
        resolve([...all])
        return
      }

      resolve(
        all.filter((item) => `${item.label} ${item.description ?? ''}`.toLowerCase().includes(keyword)),
      )
    }, 300)
  })
}

const mentionSources: MentionSource[] = [
  {
    char: '@',
    labels: { title: '提及成员' },
    debounce: 150,
    items: (query) => searchMentionItems(MENTION_MEMBERS, query),
  },
  {
    char: '#',
    labels: { title: '关联标签' },
    debounce: 150,
    items: (query) => searchMentionItems(MENTION_TOPICS, query),
  },
]

/* -------------------------------------------------------- wangEditor 配置 */

const wangToolbarConfig: Partial<IToolbarConfig> = {
  // 视频要后端上传接口，演示里没有，去掉免得点了报错。
  excludeKeys: ['group-video'],
}

const wangEditorConfig: Partial<IEditorConfig> = {
  placeholder: '这里的内容可以一键送回左边的 easy-editor',
  MENU_CONF: {
    // 演示无后端：上传图片时直接转 base64，和 easy-editor 的默认行为对齐。
    uploadImage: {
      async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
        insertFn(await readFileAsDataUrl(file), file.name, '')
      },
    },
  },
}

/** 只是给下面那段展示用的代码文本，不参与运行。 */
const uploadExample = `async function uploadImage(file: File) {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body })
  const { url } = await res.json()
  return url
}

// 模板里：<EasyEditor v-model="html" :upload-image="uploadImage" />`

export default defineComponent({
  name: 'App',
  components: { EasyEditor, WangEditor, WangToolbar },
  data() {
    return {
      /* 主编辑器 */
      content: INITIAL_CONTENT,
      snapshot: null as EditorContentSnapshot | null,
      editable: true,

      /* wangEditor 互通 */
      easySide: SAMPLE_FROM_WANG,
      wangHtml: SAMPLE_FROM_EASY,
      wangToolbarConfig,
      wangEditorConfig,
      // IDomEditor 带内部循环引用，放进 data 前必须 markRaw；再通过 computed 还原类型。
      wangEditorRaw: null as unknown,

      /* 流式渲染 */
      streamedMarkdown: '',
      streamedHtml: '',
      streaming: false,
      /** 当前这次流式输出的停止函数。重播或卸载时必须调用，否则旧定时器会继续塞字。 */
      stopStream: null as (() => void) | null,

      /* 提及 */
      mentionSources,
      mentionContent: '<p>在这里输入内容，然后用触发符试试提及功能。</p>',

      uploadExample,
    }
  },
  computed: {
    wangEditor(): IDomEditor | null {
      return this.wangEditorRaw as IDomEditor | null
    },
  },
  beforeDestroy() {
    this.haltStream()
    this.wangEditor?.destroy()
  },
  methods: {
    /* --------------------------------------------------------- 主编辑器 */

    handleChange(next: EditorContentSnapshot): void {
      this.snapshot = next
    },

    resetContent(): void {
      this.content = INITIAL_CONTENT
    },

    clearMain(): void {
      const editorRef = this.$refs.editorRef as unknown as { clear(): boolean } | undefined
      editorRef?.clear()
    },

    /* --------------------------------------------------------- wangEditor */

    handleWangCreated(editor: IDomEditor): void {
      this.wangEditorRaw = markRaw(editor)
    },

    /* ----------------------------------------------------------- 流式渲染 */

    haltStream(): void {
      this.stopStream?.()
      this.stopStream = null
      this.streaming = false
    },

    startStream(): void {
      this.haltStream()
      this.streamedMarkdown = ''
      this.streamedHtml = ''
      this.streaming = true

      this.stopStream = streamMarkdown(STREAM_DOCUMENT, {
        onChunk: (markdown, done) => {
          this.streamedMarkdown = markdown
          // 每收到一块就把累计内容整体重转一次：已经收到多少就渲染多少。
          this.streamedHtml = markdownToHtml(markdown)
          if (done) this.haltStream()
        },
      })
    },

    /* ------------------------------------------------------------- 互通 */

    pushToWang(): void {
      this.wangHtml = this.easySide
    },

    pushToEasy(): void {
      this.easySide = this.wangHtml
    },

    sendMainToWang(): void {
      this.wangHtml = this.content
    },

    sendMainToEasy(): void {
      this.easySide = this.content
    },

    loadSampleIntoBoth(html: string): void {
      this.easySide = html
      this.wangHtml = html
    },

    loadEasySample(): void {
      this.loadSampleIntoBoth(SAMPLE_FROM_EASY)
    },

    loadWangSample(): void {
      this.loadSampleIntoBoth(SAMPLE_FROM_WANG)
    },
  },
})
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">easy-editor</h1>
      <p class="page__subtitle">
        pnpm monorepo · <code>@easy-editor/core</code>（框架无关）+
        <code>@easy-editor/vue2</code>（Vue 2.7 适配层）
      </p>
    </header>

    <section class="card">
      <h2 class="section__title">v2 全功能演示</h2>
      <div class="card__actions">
        <label class="toggle">
          <input v-model="editable" type="checkbox" />
          <span>只读</span>
        </label>
        <button type="button" class="action" @click="clearMain">清空</button>
        <button type="button" class="action" @click="resetContent">重置为初始内容</button>
      </div>

      <EasyEditor
        ref="editorRef"
        v-model="content"
        placeholder="开始输入…"
        :editable="editable"
        @change="handleChange"
      />

      <p class="hint">
        光标进入表格时，表格上方会浮出操作面板（插入/删除行列、切换表头、删除表格）。
        代码块里会出现语言下拉。
        <strong>点一下下面的图片</strong>，图片上方会浮出工具面板（30% / 50% / 100%、编辑图片、删除）。
      </p>
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

    <section class="card">
      <h2 class="section__title">wangEditor v5 互通</h2>
      <p class="section__desc">
        同一份 HTML 在两边之间来回倒。<strong>初始就是交叉投放的</strong>：左边 easy-editor
        读的是 wangEditor 的 HTML，右边 wangEditor 读的是 easy-editor 的 HTML——两边都渲染正常，
        就说明 v-model 的数据互通。
      </p>

      <div class="card__actions">
        <button type="button" class="action action--primary" @click="pushToEasy">
          wangEditor → easy-editor
        </button>
        <button type="button" class="action action--primary" @click="pushToWang">
          easy-editor → wangEditor
        </button>
        <span class="divider" />
        <button type="button" class="action" @click="sendMainToEasy">主编辑器 → 左</button>
        <button type="button" class="action" @click="sendMainToWang">主编辑器 → 右</button>
        <span class="divider" />
        <button type="button" class="action" @click="loadEasySample">两边都用 easy 样例</button>
        <button type="button" class="action" @click="loadWangSample">两边都用 wang 样例</button>
      </div>

      <div class="interop">
        <div class="interop__column">
          <h3 class="interop__title">
            easy-editor
            <span class="interop__badge">Tiptap</span>
          </h3>
          <EasyEditor v-model="easySide" :show-toolbar="false" placeholder="easy-editor…" />
        </div>

        <div class="interop__column">
          <h3 class="interop__title">
            wangEditor
            <span class="interop__badge interop__badge--wang">v5</span>
          </h3>
          <div class="wang-host">
            <WangToolbar :editor="wangEditor" :default-config="wangToolbarConfig" mode="default" />
            <WangEditor
              v-model="wangHtml"
              :default-config="wangEditorConfig"
              mode="default"
              @onCreated="handleWangCreated"
            />
          </div>
        </div>
      </div>

      <div class="panels">
        <div class="panel">
          <h2 class="panel__title">左：easy-editor 的 v-model</h2>
          <pre class="panel__body">{{ easySide }}</pre>
        </div>
        <div class="panel">
          <h2 class="panel__title">右：wangEditor 的 v-model</h2>
          <pre class="panel__body">{{ wangHtml || '（wangEditor 还没产出内容）' }}</pre>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="section__title">流式渲染（AI 逐块输出 markdown）</h2>
      <p class="section__desc">
        模拟 AI 一块一块地吐 markdown：每收到一块就用 <code>marked</code> 把
        <strong>累计到目前为止</strong>的内容整体转成 HTML，再交给 easy-editor 渲染——
        不等输出完，已经收到的部分立刻可见。停止输出后编辑器转为可编辑，可以直接接着改。
      </p>

      <div class="card__actions">
        <button type="button" class="action action--primary" @click="startStream">
          {{ streaming ? '重新播放' : '开始流式输出' }}
        </button>
        <button type="button" class="action" :disabled="!streaming" @click="haltStream">停止</button>
        <span class="divider" />
        <span class="hint hint--inline">
          {{ streaming ? '输出中…（编辑器只读）' : '输出完毕，可编辑' }}
        </span>
      </div>

      <EasyEditor v-model="streamedHtml" :editable="!streaming" placeholder="点上面的按钮开始…" />

      <div class="panels">
        <div class="panel">
          <h2 class="panel__title">累计收到的 markdown（{{ streamedMarkdown.length }} 字符）</h2>
          <pre class="panel__body panel__body--muted">{{ streamedMarkdown }}</pre>
        </div>
        <div class="panel">
          <h2 class="panel__title">转换后的 HTML（{{ streamedHtml.length }} 字符）</h2>
          <pre class="panel__body">{{ streamedHtml }}</pre>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="section__title">v4 Mention 编辑器（@ / # 触发）</h2>
      <p class="section__desc">
        输入 <code>@</code> 弹出成员列表，输入 <code>#</code> 弹出标签列表。候选由
        <code>mentionSources[].items</code> 提供——这里用 <code>setTimeout</code> 模拟 300ms 的接口请求，
        等待期间弹层显示 loading。<strong>↑ / ↓ 选择，Enter / Tab 确认，Esc 关闭</strong>，鼠标点击也可以。
        两个触发符各自带标题文案，靠 <code>labels</code> 覆盖。
      </p>

      <EasyEditor
        v-model="mentionContent"
        placeholder="输入 @ 提及成员，或 # 关联标签…"
        :mention-sources="mentionSources"
      />

      <div class="panels">
        <div class="panel">
          <h2 class="panel__title">v-model 绑定值（HTML）</h2>
          <pre class="panel__body">{{ mentionContent }}</pre>
        </div>
        <div class="panel">
          <h2 class="panel__title">文档里的提及节点</h2>
          <p class="panel__body panel__body--muted">
            提及是 inline atom，HTML 形如
            <code>&lt;span data-type="mention" data-id="…" data-label="…"&gt;@张三&lt;/span&gt;</code>。
            wangEditor 没有对应概念，互通时会退化成普通文本。
          </p>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="section__title">自己传图片上传实现</h2>
      <p class="section__desc">
        默认不传 <code>uploadImage</code>，图片走 FileReader 转 base64 内联（上面的编辑器就是）。
        接后端时把回调传进去即可——下面是等价写法。
      </p>
      <pre class="panel__body panel__body--muted">{{ uploadExample }}</pre>
    </section>
  </main>
</template>
