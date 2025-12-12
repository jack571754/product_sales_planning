<template>
	<FrappeUIProvider>
		<router-view />
	</FrappeUIProvider>
</template>

<script setup>
import { onMounted } from 'vue'
import { call, FrappeUIProvider } from 'frappe-ui'

onMounted(async () => {
	// 检查用户是否登录
	try {
		const response = await call('frappe.auth.get_logged_user')
		console.log('User check response:', response)
		if (!response || response === 'Guest') {
			// 未登录则重定向到登录页，登录后返回当前页面
			console.warn('User not logged in, redirecting to login')
			window.location.href = '/login?redirect-to=/planning'
		} else {
			console.log('User is logged in:', response)
		}
	} catch (error) {
		// 如果调用失败，也重定向到登录页
		console.error('Failed to check user login status:', error)
		window.location.href = '/login?redirect-to=/planning'
	}
})
</script>
