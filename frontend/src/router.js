import { createRouter, createWebHistory } from 'vue-router'
import PlanningDashboard from './pages/PlanningDashboard.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
  {
    path: '/',
    name: 'Dashboard',
    component: PlanningDashboard,
  },
  // 可以添加更多路由，例如：
  // {
  //   path: '/dashboard',
  //   name: 'Dashboard',
  //   component: () => import('@/pages/Dashboard.vue'),
  // },
]

let router = createRouter({
  history: createWebHistory('/planning/'),  // base 路径改为 /planning/
  routes,
})

export default router
