<template>
	<div class="stats-cards grid grid-cols-1 md:grid-cols-3 gap-3">
		<Card class="p-3" v-for="card in statCards" :key="card.label">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-xs text-gray-500 mb-0.5">{{ card.label }}</div>
					<div :class="['text-xl font-bold', card.color]">
						{{ card.value }}
					</div>
				</div>
				<div :class="['w-10 h-10 rounded-full flex items-center justify-center', card.bg]">
					<FeatherIcon :name="card.icon" class="w-5 h-5" :class="card.iconColor" />
				</div>
			</div>
		</Card>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { Card, FeatherIcon } from 'frappe-ui'

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

const formatNumber = (num) => {
	if (!num) return '0'
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const statCards = computed(() => [
	{
		label: '总 SKU 数',
		value: formatNumber(props.statistics.totalSKU),
		icon: 'grid',
		color: 'text-gray-900',
		iconColor: 'text-blue-600',
		bg: 'bg-blue-50'
	},
	{
		label: '已规划 SKU',
		value: formatNumber(props.statistics.plannedSKU),
		icon: 'check-circle',
		color: 'text-green-600',
		iconColor: 'text-green-600',
		bg: 'bg-green-50'
	},
	{
		label: '总计划量',
		value: formatNumber(props.statistics.totalQuantity),
		icon: 'trending-up',
		color: 'text-purple-600',
		iconColor: 'text-purple-600',
		bg: 'bg-purple-50'
	}
])
</script>
