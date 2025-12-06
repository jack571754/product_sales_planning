<template>
  <div class="p-8 max-w-5xl mx-auto space-y-8">
    
    <div class="border-b pb-4">
      <h1 class="text-3xl font-bold text-gray-900">Planning Dashboard</h1>
      <p class="text-gray-600 mt-1">Frappe-UI 组件集成测试</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 class="text-xl font-semibold mb-4">交互组件</h2>
        <div class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Button variant="solid" @click="counter++">
              点击计数: {{ counter }}
            </Button>
            <Button variant="subtle" theme="gray" @click="counter = 0">
              重置
            </Button>
            <Button variant="outline" theme="red" icon-left="alert-circle" @click="showDialog = true">
              打开弹窗
            </Button>
          </div>
          
          <div class="mt-4">
            <Input
              type="text"
              label="测试输入框"
              placeholder="输入内容..."
              v-model="inputValue"
            />
            <p class="text-sm text-gray-500 mt-1">你输入了: {{ inputValue }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">后端数据 (User List)</h2>
          <Button 
            icon-left="refresh-cw" 
            variant="ghost" 
            :loading="users.loading" 
            @click="users.reload"
          >
            刷新
          </Button>
        </div>

        <div v-if="users.loading" class="text-gray-500 py-4">
          正在加载数据...
        </div>
        
        <div v-else-if="users.error" class="text-red-500 py-4">
          {{ users.error.message }}
        </div>

        <div v-else class="space-y-2 max-h-48 overflow-y-auto">
          <div 
            v-for="user in users.data" 
            :key="user.name"
            class="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
          >
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                {{ user.full_name[0] }}
              </div>
              <div>
                <div class="font-medium text-sm">{{ user.full_name }}</div>
                <div class="text-xs text-gray-500">{{ user.email }}</div>
              </div>
            </div>
            <Badge :theme="user.enabled ? 'green' : 'gray'">
              {{ user.enabled ? 'Active' : 'Disabled' }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model="showDialog" title="测试弹窗">
      <template #body-content>
        <p class="text-gray-600">这是一个标准的 Frappe-UI 弹窗组件。</p>
        <p class="mt-2">当前的计数器值是: <strong>{{ counter }}</strong></p>
      </template>
      <template #actions>
        <Button variant="solid" @click="showDialog = false">关闭</Button>
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Button, Input, Dialog, Badge, createResource } from 'frappe-ui'

// --- 响应式状态 ---
const counter = ref(0)
const inputValue = ref('')
const showDialog = ref(false)

// --- 后端资源 (Data Fetching) ---
// 使用 createResource 直接获取系统用户列表
const users = createResource({
  url: 'frappe.client.get_list',
  params: {
    doctype: 'User',
    fields: ['name', 'full_name', 'email', 'enabled'],
    limit_page_length: 5
  },
  auto: true // 组件加载时自动请求
})
</script>