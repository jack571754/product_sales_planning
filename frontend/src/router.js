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
      },
      {
        path: 'handsontable-demo',
        name: 'HandsontableDemo',
        component: () => import('./pages/HandsontableDemo.vue'),
        meta: {
          title: 'Handsontable示例'
        }
      },
    ],
  },
]

let router = createRouter({
  history: createWebHistory('/planning/'),
  routes,
})

export default router