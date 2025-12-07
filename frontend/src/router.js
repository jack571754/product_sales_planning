import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'
import PlanningDashboard from './pages/PlanningDashboard.vue'
import FrappeUIDemo from './pages/FrappeUIDemo.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: PlanningDashboard,
      },
      {
        path: 'demo',
        name: 'Demo',
        component: FrappeUIDemo,
      },
    ],
  },
]

let router = createRouter({
  history: createWebHistory('/planning/'),
  routes,
})

export default router