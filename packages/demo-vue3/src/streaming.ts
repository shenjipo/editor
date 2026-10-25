import { marked } from 'marked'

import { SAMPLE_IMAGE_BASE64 } from './samples'

/**
 * 「AI 流式输出 + markdown 转 HTML」的演示逻辑。
 *
 * 这一层刻意放在 demo 里，不进 `core` / `editor-vue3`：
 * 把 markdown 转成 HTML 是**调用方**的事，编辑器收的还是 HTML。
 * 一旦把 marked 塞进包里，两个发布包就多了一个只服务于演示的依赖，
 * 而且等于替消费方选定了 markdown 实现（他们可能用 markdown-it、remark 或者后端转）。
 */

/**
 * 演示用的 markdown 文档。
 *
 * 写成字符串数组再 join，而不是模板字符串——文档里有代码围栏，
 * 模板字符串里每个反引号都得转义，读起来全是噪音。
 */
const STREAM_LINES = [
  '# 流式渲染演示',
  '',
  '下面这段内容是**逐块喂进来**的。每收到一块就把累计到的部分整体转一次 HTML 渲染出来，',
  '而不是等全部输出完再一次性渲染——所以已经收到的部分会立刻可见。',
  '',
  '## 要点',
  '',
  '- 转换用的第三方库是 `marked`，编辑器这边收的仍然是 HTML',
  '- 代码块会随着内容增长而变高',
  '- 表格要等分隔行收完才会成形（在那之前它就是几行普通文本）',
  '',
  '```javascript',
  'export function greet(name) {',
  '  return `hello, ${name}`',
  '}',
  '```',
  '',
  '## 和 wangEditor 对齐的数据落点',
  '',
  '| 能力 | 落在哪个属性上 |',
  '| --- | --- |',
  '| 图片链接 | `data-href` |',
  '| 图片宽度 | `style="width: 30%;"` |',
  '',
  '> 引用块也是同样的处理：收到多少就渲染多少。',
  '',
  '最后放一张图，输出完之后可以直接点它试试图片工具面板：',
  '',
  `![示例图片](${SAMPLE_IMAGE_BASE64})`,
  '',
].join('\n')

export const STREAM_DOCUMENT = STREAM_LINES

/**
 * 补掉「还没收完」的尾巴，让已经收到的部分先渲染出来。
 *
 * 实测（marked 18）之后只保留一条规则：**最后一行是没写完的表格行**就先按住不渲染。
 * `| 语言 | 用途 |` 这种收到一半的行，marked 会补一个空单元格渲染成完整的一行；
 * 随着字符继续到达，那一行会在「多一个空格子」和「正常」之间反复跳。
 * 压住最后这半行、等行尾的 `|` 到了再放出来，视觉上就只从左往右长。
 *
 * 其他「没写完」的情况不需要补，也补不了：
 * - 未闭合的代码围栏，marked 自己会补上 `</code></pre>`（实测过，别多此一举）；
 * - 未闭合的 `**粗体` / 行内码，marked 按字面渲染，收尾时再变成样式——
 *   这是流式渲染的固有现象，不是缺陷；
 * - 表格分隔行没收完时整张表只能按普通文本渲染：分隔行不到齐就认不出这是表格，
 *   没法靠补字符解决。
 */
export function repairIncompleteMarkdown(source: string): string {
  const lines = source.split('\n')
  const last = lines[lines.length - 1] ?? ''

  if (/^\s*\|/.test(last) && !/\|\s*$/.test(last)) {
    lines.pop()
  }

  return lines.join('\n')
}

/** markdown -> HTML。渲染前先补掉没收完的尾巴。 */
export function markdownToHtml(markdown: string): string {
  return marked.parse(repairIncompleteMarkdown(markdown), { async: false })
}

export interface MarkdownStreamOptions {
  /** 每次吐出多少个字符。 */
  chunkSize?: number
  /** 两块之间的间隔（毫秒）。 */
  intervalMs?: number
  /** 每收到一块回调一次，`done` 为 true 表示输出结束。 */
  onChunk: (markdown: string, done: boolean) => void
}

/**
 * 模拟 AI 的流式输出：把一整段 markdown 按小块吐出来。
 *
 * 真实实现里这些块来自 SSE 或 `fetch` 的 `ReadableStream`。这里只用 `setInterval`
 * 切字符串，但**接口形状和真实的一样**——每次回调给出「累计到现在为止的全文」+「是否结束」。
 * 换成真接口时，把定时器换成 `reader.read()` 循环即可，调用方一行不用改。
 *
 * 返回停止函数。组件卸载时必须调用，否则定时器会一直跑下去。
 */
export function streamMarkdown(source: string, options: MarkdownStreamOptions): () => void {
  const { chunkSize = 4, intervalMs = 28, onChunk } = options

  let cursor = 0
  const timer = setInterval(() => {
    cursor = Math.min(source.length, cursor + chunkSize)
    const done = cursor >= source.length
    onChunk(source.slice(0, cursor), done)
    if (done) clearInterval(timer)
  }, intervalMs)

  return () => clearInterval(timer)
}
