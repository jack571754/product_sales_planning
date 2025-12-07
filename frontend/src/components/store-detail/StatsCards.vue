<template>
	<div class="stats-cards grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
		<!-- 总 SKU 数 -->
		<div class="stat-card bg-white rounded-lg shadow p-4">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-sm text-gray-500 mb-1">总 SKU 数</div>
					<div class="text-2xl font-bold text-gray-900">
						{{ statistics.totalSKU }}
					</div>
				</div>
				<div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
				</div>
			</div>
		</div>

		<!-- 已规划 SKU 数 -->
		<div class="stat-card bg-white rounded-lg shadow p-4">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-sm text-gray-500 mb-1">已规划 SKU</div>
					<div class="text-2xl font-bold text-green-600">
						{{ statistics.plannedSKU }}
					</div>
				</div>
				<div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>

		<!-- 总计划量 -->
		<div class="stat-card bg-white rounded-lg shadow p-4">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-sm text-gray-500 mb-1">总计划量</div>
					<div class="text-2xl font-bold text-purple-600">
						{{ formatNumber(statistics.totalQuantity) }}
					</div>
				</div>
				<div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
					<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
					</svg>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
// Props
const props = defineProps({
	statistics: {
		type: Object,
		default: () => ({
			totalSKU: 0,
			plannedSKU: 0,
			totalQuantity: 0
		})
	}
})

// 格式化数字（添加千分位）
const formatNumber = (num) => {
	if (!num) return '0'
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.stat-card {
	transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
