<template>
	<div class="flex h-screen overflow-hidden">
		<!-- 侧边栏 -->
		<Sidebar
			:collapsed="sidebarCollapsed"
			@toggle-collapse="toggleSidebar"
		/>

		<!-- 主内容区域 -->
		<div class="flex-1 flex flex-col overflow-hidden">
			<!-- 顶部栏 -->
			<TopBar
				@toggle-sidebar="toggleSidebar"
				@toggle-theme="toggleTheme"
			/>

			<!-- 页面内容 - 使用错误边界包裹 -->
			<main class="flex-1 overflow-auto bg-gray-50">
				<ErrorBoundary>
					<router-view v-slot="{ Component }">
						<Suspense>
							<template #default>
								<component :is="Component" />
							</template>
							<template #fallback>
								<div class="flex items-center justify-center min-h-screen">
									<div class="flex items-center gap-3 text-gray-600">
										<div class="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
										<span>加载中...</span>
									</div>
								</div>
							</template>
						</Suspense>
					</router-view>
				</ErrorBoundary>
			</main>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import TopBar from '../components/TopBar.vue'
import ErrorBoundary from '../components/ErrorBoundary.vue'

// 侧边栏折叠状态（默认展开）
const sidebarCollapsed = ref(false)

// 深色模式状态
const darkMode = ref(false)

// 初始化状态（从 localStorage 读取）
onMounted(() => {
	// 读取侧边栏折叠状态
	const savedCollapsed = localStorage.getItem('sidebarCollapsed')
	if (savedCollapsed !== null) {
		sidebarCollapsed.value = savedCollapsed === 'true'
	}

	// 读取深色模式状态
	const savedDarkMode = localStorage.getItem('darkMode')
	if (savedDarkMode !== null) {
		darkMode.value = savedDarkMode === 'true'
		applyTheme(darkMode.value)
	}
})

// 监听侧边栏折叠状态变化，持久化到 localStorage
watch(sidebarCollapsed, (newValue) => {
	localStorage.setItem('sidebarCollapsed', newValue.toString())
})

// 监听深色模式状态变化，持久化到 localStorage
watch(darkMode, (newValue) => {
	localStorage.setItem('darkMode', newValue.toString())
	applyTheme(newValue)
})

// 切换侧边栏折叠状态
const toggleSidebar = () => {
	sidebarCollapsed.value = !sidebarCollapsed.value
}

// 切换主题
const toggleTheme = () => {
	darkMode.value = !darkMode.value
}

// 应用主题
const applyTheme = (isDark) => {
	if (isDark) {
		document.documentElement.classList.add('dark')
	} else {
		document.documentElement.classList.remove('dark')
	}
}
</script>
