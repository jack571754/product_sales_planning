import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'  // 可选暗黑模式
import zhCn from 'element-plus/es/locale/lang/zh-cn'  // 中文化

const app = createApp(App)

// 在 Frappe 环境中，frappe 对象是全局可用的，不需要 import
// 我们只需要确保在使用时检查它是否存在
app.config.globalProperties.$frappe = window.frappe
app.config.globalProperties.frappe = window.frappe

app.use(ElementPlus, { locale: zhCn })

// 导出初始化函数供 Frappe 页面调用
window.initVueApp = function(selector) {
  const mountElement = document.querySelector(selector)
  if (mountElement) {
    // 清空挂载点内容
    mountElement.innerHTML = '<div id="vue-app-container"></div>'
    // 挂载Vue应用
    app.mount('#vue-app-container')
  } else {
    console.error('Mount element not found:', selector)
  }
}

// 如果不是在Frappe环境中，直接挂载到默认的#app元素
if (typeof window.frappe === 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const mountElement = document.getElementById('app')
    if (mountElement) {
      app.mount('#app')
    } else {
      console.error('Default mount element #app not found')
    }
  })
}