import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'
import PlanningDashboard from './pages/PlanningDashboard.vue'

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
        component: () => import('./pages/StoreDetail.vue'),
        props: true,
        meta: {
          title: '店铺详情'
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
  if (error.message && error.message.includes('clipper')) {
    console.warn('Clipper library error detected, continuing navigation...')
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
    
    next()
  } catch (error) {
    console.error('Navigation guard error:', error)
    next(false)
  }
})

// 导航完成后的清理
router.afterEach((to, from) => {
  // 清理可能残留的焦点状态
  try {
    const activeElement = document.activeElement
    if (activeElement && activeElement.hasAttribute('aria-hidden')) {
      activeElement.blur()
    }
  } catch (error) {
    console.error('After navigation cleanup error:', error)
  }
})

export default router