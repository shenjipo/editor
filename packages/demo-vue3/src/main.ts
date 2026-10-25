import { createApp } from 'vue'

import App from './App.vue'

// 适配包产出的 CSS 必须显式引入。
// lib 模式下 Vite 会把 CSS 提取成独立文件，JS 入口不会自动带上它 —— dist 消费方同理。
// 这里走 vite.config.ts 里的别名，实际吃的是 ../editor-vue3/src/styles/editor.css，改样式即时 HMR。
import '@shenjipo/editor-vue3/style.css'
// wangEditor 的样式是全局的，只在互通演示那一块用得上，但没法按需拆分。
import '@wangeditor/editor/dist/css/style.css'
import './styles.css'

createApp(App).mount('#app')
