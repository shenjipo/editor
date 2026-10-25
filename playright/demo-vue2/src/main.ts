import Vue from 'vue'

// 消费者必须手动引入适配层样式（dist 的 JS 入口不会自动带上 CSS）
import '@shenjipo/editor-vue2/style.css'
import './style.css'

import App from './App.vue'

Vue.config.productionTip = false

new Vue({
  render: (h) => h(App),
}).$mount('#app')
