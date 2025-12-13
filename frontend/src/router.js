import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'
import PlanningDashboard from './pages/PlanningDashboard.vue'
import StoreDetail from './pages/StoreDetail.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: PlanningDashboard,
        meta: {
          title: '计划看板'
        }
      },
      {
        path: 'store-detail/:storeId/:taskId',
        name: 'StoreDetail',
        component: StoreDetail,  // 改为直接导入，不使用懒加载
        props: true,
        meta: {
          title: '店铺详情'
        },
        // 添加路由守卫验证参数
        beforeEnter: (to, from, next) => {
          const { storeId, taskId } = to.params
          
          // 验证必需参数
          if (!storeId || !taskId) {
            console.error('路由参数缺失:', { storeId, taskId })
            next({ name: 'Dashboard' })
            return
          }
          
          // 验证参数格式
          if (typeof storeId !== 'string' || typeof taskId !== 'string') {
            console.error('路由参数格式错误:', { storeId, taskId })
            next({ name: 'Dashboard' })
            return
          }
          
          next()
        }
      }
    ],
  },
]

let router = createRouter({
  history: createWebHistory('/planning/'),
  routes,
})

// 全局错误处理
router.onError((error) => {
  console.error('Router error:', error)
  
  // 防止clipper-min.js等第三方库错误导致路由失败
  if (error.message && (
    error.message.includes('clipper') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Cannot read properties of null')
  )) {
    console.warn('检测到第三方库或模块加载错误，尝试恢复...')
    
    // 尝试重新加载页面（仅在开发环境）
    if (import.meta.env.DEV) {
      console.log('开发环境：建议刷新页面')
    }
    return
  }
})

// 全局导航守卫 - 错误处理和清理
router.beforeEach(async (to, from, next) => {
  try {
    // 移除可能导致问题的 aria-hidden 属性
    const elementsWithAriaHidden = document.querySelectorAll('[aria-hidden="true"]:focus')
    elementsWithAriaHidden.forEach(el => {
      el.blur()
    })
    
    // 清理可能残留的焦点状态
    const activeElement = document.activeElement
    if (activeElement && activeElement.hasAttribute('aria-hidden')) {
      activeElement.blur()
    }
    
    // 记录路由跳转
    console.log('路由跳转:', {
      from: from.path,
      to: to.path,
      params: to.params
    })
    
    next()
  } catch (error) {
    console.error('Navigation guard error:', error)
    // 即使出错也继续导航
    next()
  }
})

// 导航完成后的清理
router.afterEach((to, from, failure) => {
  // 清理可能残留的焦点状态
  try {
    const activeElement = document.activeElement
    if (activeElement && activeElement.hasAttribute('aria-hidden')) {
      activeElement.blur()
    }
    
    // 如果导航失败，记录错误
    if (failure) {
      console.error('Navigation failed:', failure)
    }
    
    // 更新页面标题
    if (to.meta.title) {
      document.title = `${to.meta.title} - 计划填报系统`
    }
  } catch (error) {
    console.error('After navigation cleanup error:', error)
  }
})

export default router