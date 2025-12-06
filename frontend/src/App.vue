<template>
  <div>
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { call } from 'frappe-ui'

onMounted(async () => {
  // 检查用户是否登录
  try {
    const response = await call('frappe.auth.get_logged_user')
    if (!response || response === 'Guest') {
      // 未登录则重定向到登录页，登录后返回当前页面
      window.location.href = '/login?redirect-to=/planning'
    }
  } catch (error) {
    // 如果调用失败，也重定向到登录页
    window.location.href = '/login?redirect-to=/planning'
  }
})
</script>
