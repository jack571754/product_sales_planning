<template>
	<transition
		enter-active-class="transition-all duration-200 ease-out"
		enter-from-class="opacity-0 translate-y-2"
		enter-to-class="opacity-100 translate-y-0"
		leave-active-class="transition-all duration-200 ease-in"
		leave-from-class="opacity-100 translate-y-0"
		leave-to-class="opacity-0 translate-y-2"
	>
		<div
			v-if="shouldShow"
			class="save-indicator fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg"
			:class="indicatorClass"
		>
			<!-- 保存中图标 -->
			<svg
				v-if="isSaving"
				class="w-5 h-5 animate-spin"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>

			<!-- 成功图标 -->
			<svg
				v-else-if="!saveError"
				class="w-5 h-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 13l4 4L19 7"
				/>
			</svg>

			<!-- 错误图标 -->
			<svg
				v-else
				class="w-5 h-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>

			<!-- 状态文本 -->
			<span class="text-sm font-medium">
				{{ statusText }}
			</span>
		</div>
	</transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
	isSaving: {
		type: Boolean,
		default: false
	},
	saveError: {
		type: String,
		default: null
	},
	lastSaveTime: {
		type: Date,
		default: null
	}
})

// 本地状态
const shouldShow = ref(false)
const autoHideTimer = ref(null)

// 计算属性：指示器样式类
const indicatorClass = computed(() => {
	if (props.isSaving) {
		return 'bg-blue-50 text-blue-700 border border-blue-200'
	} else if (props.saveError) {
		return 'bg-red-50 text-red-700 border border-red-200'
	} else {
		return 'bg-green-50 text-green-700 border border-green-200'
	}
})

// 计算属性：状态文本
const statusText = computed(() => {
	if (props.isSaving) {
		return '正在保存...'
	} else if (props.saveError) {
		return `保存失败: ${props.saveError}`
	} else if (props.lastSaveTime) {
		return '保存成功'
	} else {
		return ''
	}
})

// 监听保存状态变化
watch(() => props.isSaving, (newValue) => {
	if (newValue) {
		// 开始保存，显示指示器
		shouldShow.value = true
		// 清除自动隐藏定时器
		if (autoHideTimer.value) {
			clearTimeout(autoHideTimer.value)
			autoHideTimer.value = null
		}
	}
})

// 监听保存完成
watch(() => props.lastSaveTime, (newValue) => {
	if (newValue && !props.isSaving) {
		// 保存成功，显示指示器
		shouldShow.value = true
		// 2秒后自动隐藏
		if (autoHideTimer.value) {
			clearTimeout(autoHideTimer.value)
		}
		autoHideTimer.value = setTimeout(() => {
			shouldShow.value = false
		}, 2000)
	}
})

// 监听保存错误
watch(() => props.saveError, (newValue) => {
	if (newValue && !props.isSaving) {
		// 保存失败，显示指示器
		shouldShow.value = true
		// 5秒后自动隐藏
		if (autoHideTimer.value) {
			clearTimeout(autoHideTimer.value)
		}
		autoHideTimer.value = setTimeout(() => {
			shouldShow.value = false
		}, 5000)
	}
})
</script>

<style scoped>
.save-indicator {
	min-width: 200px;
}
</style>
