/**
 * 两份「同义不同形」的样例内容，用来验证 easy-editor 与 wangEditor 的 HTML 互通。
 *
 * 它们表达的是同一个文档，但按各自编辑器的**原生序列化形状**手写：
 * easy-editor 那份带 Tiptap 的特征（`<td><p>`、`<colgroup>`），
 * wangEditor 那份带 wangEditor 的特征（单元格裸文本、`colSpan` 驼峰、`width="auto"`）。
 *
 * 表格是差异最明显的地方。**图片这一处两边已经收敛成同一个形状了**——
 * easy-editor 的图片节点主动采用了 wangEditor 的写法（链接放 `data-href`、
 * 宽度放 `style="width: 30%;"`），因为那是它反向解析时唯一会读的两个位置。
 *
 * 演示里刻意交叉投放：wangEditor 读 easy 那份、easy-editor 读 wang 那份。
 * 两边都能正常渲染，就说明 v-model 的数据确实互通。
 */

/** 自包含的示例图片，用 SVG data URI，免得演示依赖外网。 */
export const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='64'>" +
  "<rect width='180' height='64' rx='8' fill='%23dbeafe'/>" +
  "<text x='90' y='38' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%233f4ee0'>" +
  'easy-editor</text></svg>'

/**
 * 同一张图的 base64 形式。流式渲染那段 markdown 必须用这个，不能用上面那个。
 *
 * 上面那份是 `;utf8,` 后面直接跟着 `<svg …>`。这在 HTML 属性里没问题（浏览器照收），
 * 但放进 markdown 的 `![](...)` 里会被 marked 当成普通文本——它的链接目标解析到 `<` 就停了。
 * 实测过：utf8 形式原样吐回来，base64 形式才变成真正的 `<img>`。
 * 所以「AI 输出里带 data URI 图片」这件事，得让模型吐 base64。
 */
export const SAMPLE_IMAGE_BASE64 =
  'data:image/svg+xml;base64,' +
  'PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxODAnIGhl' +
  'aWdodD0nNjQnPjxyZWN0IHdpZHRoPScxODAnIGhlaWdodD0nNjQnIHJ4PSc4JyBmaWxsPScj' +
  'ZGJlYWZlJy8+PHRleHQgeD0nOTAnIHk9JzM4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJyBmb250' +
  'LWZhbWlseT0nc2Fucy1zZXJpZicgZm9udC1zaXplPScxNCcgZmlsbD0nIzNmNGVlMCc+ZWFz' +
  'eS1lZGl0b3I8L3RleHQ+PC9zdmc+'

/**
 * 图片在两边共用的形状，带宽度和链接——正好用来试 v3 的图片工具面板。
 * 属性顺序 src / alt / data-href / style 与 wangEditor 的 `elemToHtml` 一致。
 */
const SAMPLE_IMAGE_HTML = `<img src="${SAMPLE_IMAGE}" alt="示例图片" data-href="https://www.wangeditor.com/" style="width: 30%;">`

/** 文本、列表、链接、代码块这些两边形状一致，只有表格和图片有差异。 */
function buildDocument(tableHtml: string, imageHtml: string): string {
  return `
<h1>互通样例</h1>
<p>行内样式：<strong>粗体</strong>、<em>斜体</em>、<u>下划线</u>、<a href="https://www.wangeditor.com/" target="_blank">链接</a>。</p>
<ul>
  <li>无序列表项</li>
  <li>第二项</li>
</ul>
<ol>
  <li>有序列表项</li>
</ol>
<pre><code class="language-javascript">const hello = 'easy-editor'</code></pre>
${tableHtml}
<p>图片：${imageHtml}</p>
`.trim()
}

/**
 * Tiptap / easy-editor 的原生输出形状。
 *
 * 单元格里带 `<p>` 包裹、表格带 `<colgroup>`（Tiptap 拿它算列宽）、
 * 链接不带 `rel`（核心包里已经把它关掉了）。图片与 wangEditor 同形，见上。
 */
export const SAMPLE_FROM_EASY = buildDocument(
  '<table><colgroup><col style="min-width: 80px"><col style="min-width: 80px"></colgroup>' +
    '<tbody><tr><th colspan="1" rowspan="1"><p>表头一</p></th><th colspan="1" rowspan="1"><p>表头二</p></th></tr>' +
    '<tr><td colspan="1" rowspan="1"><p>单元一</p></td><td colspan="1" rowspan="1"><p>单元二</p></td></tr></tbody></table>',
  SAMPLE_IMAGE_HTML,
)

/**
 * wangEditor v5 的原生输出形状，逐字照它的 `elem-to-html` 实现写。
 *
 * 单元格是裸文本不带 `<p>`、`colSpan` / `rowSpan` 用驼峰、单元格带 `width="auto"`、
 * 表格带 `style="width: auto;"`。
 */
export const SAMPLE_FROM_WANG = buildDocument(
  '<table style="width: auto;"><tbody>' +
    '<tr><th colSpan="1" rowSpan="1" width="auto">表头一</th><th colSpan="1" rowSpan="1" width="auto">表头二</th></tr>' +
    '<tr><td colSpan="1" rowSpan="1" width="auto">单元一</td><td colSpan="1" rowSpan="1" width="auto">单元二</td></tr>' +
    '</tbody></table>',
  SAMPLE_IMAGE_HTML,
)

/** 首页主编辑器的初始内容，用 easy-editor 自己的形状。 */
export const INITIAL_CONTENT = SAMPLE_FROM_EASY
