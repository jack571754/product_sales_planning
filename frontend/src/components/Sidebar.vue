<template>
    <div
        :class="[
            'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300',
            collapsed ? 'w-16' : 'w-64'
        ]"
    >
        <div class="flex items-center justify-center h-16 border-b border-gray-200 px-4">
            <div v-if="!collapsed" class="flex items-center gap-2">
                <FeatherIcon name="package" class="w-6 h-6 text-blue-600" />
                <span class="text-lg font-bold text-gray-900">计划管理</span>
            </div>
            <FeatherIcon v-else name="package" class="w-6 h-6 text-blue-600" />
        </div>

        <nav class="flex-1 overflow-y-auto py-4">
            <div class="space-y-1 px-2">
                <router-link
                    v-for="item in menuItems"
                    :key="item.path"
                    :to="item.path"
                    custom
                    v-slot="{ isActive, isExactActive, navigate }"
                >
                    <div
                        @click="navigate"
                        :class="[
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                            /* 关键修复：如果是根路径 '/'，必须使用 isExactActive (精确匹配)，否则使用 isActive */
                            (item.path === '/' ? isExactActive : isActive)
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        ]"
                    >
                        <FeatherIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
                        <span v-if="!collapsed" class="text-sm">{{ item.label }}</span>
                    </div>
                </router-link>
            </div>
        </nav>

        <div class="border-t border-gray-200 p-2">
            <button
                @click="$emit('toggle-collapse')"
                class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
                <FeatherIcon
                    :name="collapsed ? 'chevron-right' : 'chevron-left'"
                    class="w-5 h-5"
                />
                <span v-if="!collapsed" class="text-sm font-medium">收起</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { FeatherIcon } from 'frappe-ui'
// 不需要 import useRouter 了，因为 router-link 的 custom slot 提供了 navigate

defineProps({
    collapsed: {
        type: Boolean,
        default: false
    }
})

defineEmits(['toggle-collapse'])

// 导航菜单项
const menuItems = [
    {
        path: '/',
        label: '计划看板',
        icon: 'layout'
    },
    {
        path: '/demo',
        label: '组件演示',
        icon: 'grid'
    }
]
</script>

<style scoped>
/* 自定义滚动条样式 */
nav::-webkit-scrollbar {
    width: 4px;
}

nav::-webkit-scrollbar-track {
    background: transparent;
}

nav::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 2px;
}

nav::-webkit-scrollbar-thumb:hover {
    background: #d1d5db;
}
</style>