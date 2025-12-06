import { createRouter, createWebHistory } from 'vue-router'
import PlanningDashboard from './pages/PlanningDashboard.vue'

const routes = [
  // 1. 删除或注释掉旧的 Home 路由
  // {
  //   path: '/',
  //   name: 'Home',
  //   component: () => import('@/pages/Home.vue'),
  // },

  // 2. 这里的 path: '/' 现在是唯一的，Vue 会正确加载它
  {
    path: '/',
    name: 'Dashboard',
    component: PlanningDashboard,
  },
]

let router = createRouter({
  history: createWebHistory('/planning/'),
  routes,
})

export default router