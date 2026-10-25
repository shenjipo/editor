# easy-editor富文本编辑器设计文档
## v1版本功能
1.目录结构采用monorepo结构，包含core、demo-vue3、editor-vue3
2.包管理工具使用pnpm
3.文本编辑器核心基于tiptap
4.暂时先做vue3版本的，先完成编辑器最基本的功能，如下
* 字体大小
* 字体颜色
* 文本背景色
* 段落 h1 h2 h3
* 有序列表
* 无序列表

## v2本版本功能
增加富文本的如下功能
* 粗体
* 下划线
* 斜体
* 插入表格（包括选中表格时的操作，宽度自适应，插入行，插入列，删除列，删除行，删除表格，回车）
* 插入链接
* 网络图片
* 插入图片
* 撤销
* 重做
* 代码块
以上所有的功能尽量参考wangEditorv5，做的时候考虑v-model绑定的编辑器数据，能够完美适配到wangEditor
wangeditor官网 https://www.wangeditor.com/
安装指令
> pnpm install @wangeditor/editor
pnpm install @wangeditor/editor-for-vue@next

## demo-vue3
提供所有基础功能的演示，以及v-model绑定的数据直接适配到wangEditor的演示

## v3版本功能
1. 增加图片选中时的工具面板，包含30%，50% ，100%，编辑图片，删除功能，点击编辑图片，弹出一个表单弹窗，包含图片地址，图片描述，图片链接
2. 增加流式响应接收的功能，AI响应逐个输出md格式的文本，先用第三方工具把md转html，然后给到easy-editor去渲染，当数据没有输出完整时，可以尽量渲染能够渲染的部分，实际不需要去掉AI真实的接口，在demo-vue3里面去模拟流式输出即可（例如使用setTimeout或者setInterval）

## v4
新增一个mentioneditor功能，用户可以通过自定义符号例如@ 或者 #触发一个弹窗，在弹窗内部是一个列表（列表数据也由用户提供，通常是通过接口获取的，你可以使用setTimeout模拟），通过键盘上下键或者鼠标点击，可以选择对应的选项，并且在demo-vue3中增加对应的demo

## v5
新增demo-vue2 demo文件夹我已经建好，使用vue2.7，vite4.0，demo功能和demo-vue3类似

## v6
在playright中demo-vue3，使用pnpm i @shenjipo/editor-core 和 pnpm i @shenjipo/editor-vue3，模拟一个普通项目使用npm上发布的组件库来写一个这个editor的demo，不要和此项目下的依赖和文件产生任何的关系，模拟真实的用户使用是否正常

## v7
在playright中demo-vue2，使用pnpm i @shenjipo/editor-core 和 pnpm i @shenjipo/editor-vue2，模拟一个普通项目使用npm上发布的组件库来写一个这个editor的demo，不要和此项目下的依赖和文件产生任何的关系，模拟真实的用户使用是否正常