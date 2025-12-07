<template>
	<Dropdown :options="dropdownOptions" placement="bottom-end">
		<template #default="{ open }">
			<button
				:class="[
					'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
					open ? 'bg-gray-100' : 'hover:bg-gray-50'
				]"
			>
				<Avatar
					v-if="userInfo.data"
					:label="userInfo.data.full_name || userInfo.data.name"
					:image="userInfo.data.user_image"
					size="sm"
				/>
				<Avatar v-else label="U" size="sm" />
				<div class="hidden md:block text-left">
					<div class="text-sm font-medium text-gray-900">
						{{ userInfo.data?.full_name || userInfo.data?.name || '加载中...' }}
					</div>
					<div class="text-xs text-gray-500">
						{{ userInfo.data?.email || '' }}
					</div>
				</div>
				<FeatherIcon name="chevron-down" class="w-4 h-4 text-gray-500" />
			</button>
		</template>
	</Dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { Dropdown, Avatar, FeatherIcon, createResource, call } from 'frappe-ui'

const emit = defineEmits(['toggle-theme'])

// 获取当前登录用户信息
const userInfo = createResource({
	url: 'frappe.client.get',
	params: {
		doctype: 'User',
		name: window.boot?.user || 'Guest'
	},
	auto: true
})

// 登出功能
const logout = async () => {
	try {
		await call('frappe.auth.logout')
		window.location.href = '/login'
	} catch (error) {
		console.error('Logout failed:', error)
		alert('登出失败，请重试')
	}
}

// 跳转到用户设置页面
const goToUserSettings = () => {
	const username = userInfo.data?.name || window.boot?.user
	if (username) {
		window.location.href = `/app/user/${username}`
	}
}

// 切换主题
const toggleTheme = () => {
	emit('toggle-theme')
}

// 下拉菜单选项
const dropdownOptions = computed(() => [
	{
		label: '用户设置',
		icon: 'settings',
		onClick: goToUserSettings
	},
	{
		label: '切换主题',
		icon: 'moon',
		onClick: toggleTheme
	},
	{
		label: '登出',
		icon: 'log-out',
		onClick: logout
	}
])
</script>
