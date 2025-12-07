<template>
	<header class="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
		<!-- 左侧：侧边栏切换按钮 -->
		<button
			@click="$emit('toggle-sidebar')"
			class="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
		>
			<FeatherIcon name="menu" class="w-5 h-5" />
		</button>

		<!-- 右侧：用户菜单 -->
		<UserMenu @toggle-theme="$emit('toggle-theme')" />
	</header>
</template>

<script setup>
import { FeatherIcon } from 'frappe-ui'
import UserMenu from './UserMenu.vue'

defineEmits(['toggle-sidebar', 'toggle-theme'])
</script>
