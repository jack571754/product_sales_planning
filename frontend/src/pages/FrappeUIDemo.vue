<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8">
    <!-- 页面标题 -->
    <div class="border-b pb-4">
      <h1 class="text-3xl font-bold text-gray-900">Frappe-UI 组件演示</h1>
      <p class="text-gray-600 mt-2">展示项目中常用的 frappe-ui 组件及其用法</p>
      <Button variant="subtle" class="mt-3" @click="router.push('/')">
        <FeatherIcon name="arrow-left" class="w-4 h-4 mr-1" />
        返回看板
      </Button>
    </div>

    <!-- 组件演示网格 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- 1. Button 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">1. Button 按钮</h2>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-600 mb-2">不同 variant：</p>
            <div class="flex flex-wrap gap-2">
              <Button variant="solid">Solid</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-2">不同 theme：</p>
            <div class="flex flex-wrap gap-2">
              <Button theme="gray">Gray</Button>
              <Button theme="blue">Blue</Button>
              <Button theme="green">Green</Button>
              <Button theme="red">Red</Button>
            </div>
          </div>
        </div>
      </Card>

      <!-- 2. Input 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">2. Input 输入框</h2>
        <div class="space-y-3">
          <Input
            type="text"
            label="基础输入框"
            placeholder="请输入内容..."
            v-model="demoInput"
          />
          <Input
            type="text"
            placeholder="带前缀图标"
            v-model="demoSearch"
          >
            <template #prefix>
              <FeatherIcon name="search" class="w-4 h-4 text-gray-400" />
            </template>
          </Input>
          <p class="text-sm text-gray-500">输入值: {{ demoInput || '(空)' }}</p>
        </div>
      </Card>

      <!-- 3. Select 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">3. Select 单选下拉</h2>
        <div class="space-y-3">
          <Select
            v-model="selectedFruit"
            :options="fruitOptions"
            placeholder="选择水果"
          />
          <p class="text-sm text-gray-500">选中: {{ selectedFruit || '(未选择)' }}</p>
        </div>
      </Card>

      <!-- 4. MultiSelect 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">4. MultiSelect 多选下拉</h2>
        <div class="space-y-3">
          <MultiSelect
            v-model="selectedColors"
            :options="colorOptions"
            placeholder="选择颜色（可多选）"
          />
          <p class="text-sm text-gray-500">已选: {{ selectedColors.length }} 项</p>
        </div>
      </Card>

      <!-- 5. Badge 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">5. Badge 标签</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-600 mb-2">不同颜色主题：</p>
            <div class="flex flex-wrap gap-2">
              <Badge theme="gray">Gray</Badge>
              <Badge theme="blue">Blue</Badge>
              <Badge theme="green">Green</Badge>
              <Badge theme="red">Red</Badge>
              <Badge theme="yellow">Yellow</Badge>
              <Badge theme="orange">Orange</Badge>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-2">不同尺寸：</p>
            <div class="flex flex-wrap items-center gap-2">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
            </div>
          </div>
        </div>
      </Card>

      <!-- 6. Avatar 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">6. Avatar 头像</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-600 mb-2">不同尺寸：</p>
            <div class="flex items-center gap-3">
              <Avatar label="张三" size="sm" />
              <Avatar label="李四" size="md" />
              <Avatar label="王五" size="lg" />
              <Avatar label="赵六" size="xl" />
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-2">带图片：</p>
            <Avatar
              :image="demoAvatar"
              label="用户"
              size="lg"
            />
          </div>
        </div>
      </Card>

      <!-- 7. FeatherIcon 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">7. FeatherIcon 图标</h2>
        <div class="space-y-3">
          <p class="text-sm text-gray-600 mb-2">常用图标：</p>
          <div class="grid grid-cols-6 gap-4">
            <div class="flex flex-col items-center gap-1">
              <FeatherIcon name="home" class="w-6 h-6 text-gray-700" />
              <span class="text-xs text-gray-500">home</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <FeatherIcon name="user" class="w-6 h-6 text-gray-700" />
              <span class="text-xs text-gray-500">user</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <FeatherIcon name="search" class="w-6 h-6 text-gray-700" />
              <span class="text-xs text-gray-500">search</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <FeatherIcon name="calendar" class="w-6 h-6 text-gray-700" />
              <span class="text-xs text-gray-500">calendar</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <FeatherIcon name="check-square" class="w-6 h-6 text-gray-700" />
              <span class="text-xs text-gray-500">check</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <FeatherIcon name="folder" class="w-6 h-6 text-gray-700" />
              <span class="text-xs text-gray-500">folder</span>
            </div>
          </div>
        </div>
      </Card>

      <!-- 8. Checkbox 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">8. Checkbox 复选框</h2>
        <div class="space-y-3">
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox v-model="checkboxes" value="option1" />
              <span class="text-sm">选项 1</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox v-model="checkboxes" value="option2" />
              <span class="text-sm">选项 2</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox v-model="checkboxes" value="option3" />
              <span class="text-sm">选项 3</span>
            </label>
          </div>
          <p class="text-sm text-gray-500">已选: {{ checkboxes.join(', ') || '(无)' }}</p>
        </div>
      </Card>

      <!-- 9. Dialog 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">9. Dialog 弹窗</h2>
        <div class="space-y-3">
          <Button @click="showDialog = true">打开弹窗</Button>
          <Dialog v-model="showDialog" title="示例弹窗">
            <template #body-content>
              <p class="text-gray-600">这是一个标准的 Frappe-UI 弹窗组件。</p>
              <p class="mt-2 text-gray-600">可以在这里放置任何内容。</p>
            </template>
            <template #actions>
              <Button variant="subtle" @click="showDialog = false">取消</Button>
              <Button variant="solid" @click="showDialog = false">确定</Button>
            </template>
          </Dialog>
        </div>
      </Card>

      <!-- 10. Textarea 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">10. Textarea 多行文本</h2>
        <div class="space-y-3">
          <Textarea
            v-model="demoTextarea"
            placeholder="输入多行文本..."
            rows="4"
          />
          <p class="text-sm text-gray-500">字符数: {{ demoTextarea.length }}</p>
        </div>
      </Card>

      <!-- 11. createResource 数据获取 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">11. createResource 数据获取</h2>
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Button
              variant="solid"
              :loading="users.loading"
              @click="users.reload()"
            >
              <FeatherIcon name="refresh-cw" class="w-4 h-4 mr-1" />
              刷新用户列表
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
              v-for="user in users.data?.slice(0, 5)"
              :key="user.name"
              class="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100"
            >
              <div class="flex items-center gap-2">
                <Avatar :label="user.full_name" size="sm" />
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
      </Card>

      <!-- 12. Card 组件 -->
      <Card class="p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-900">12. Card 卡片</h2>
        <div class="space-y-3">
          <p class="text-sm text-gray-600">Card 是一个容器组件，用于包裹内容。</p>
          <Card class="p-4 bg-gray-50">
            <div class="flex items-center gap-3">
              <FeatherIcon name="info" class="w-5 h-5 text-blue-600" />
              <div>
                <div class="font-medium text-sm">提示信息</div>
                <div class="text-xs text-gray-600">这是一个嵌套的卡片示例</div>
              </div>
            </div>
          </Card>
        </div>
      </Card>

    </div>

    <!-- 代码示例说明 -->
    <Card class="p-6 bg-blue-50 border-blue-200">
      <h3 class="text-lg font-semibold mb-3 text-blue-900">使用说明</h3>
      <div class="space-y-2 text-sm text-blue-800">
        <p>• 所有组件都从 'frappe-ui' 导入</p>
        <p>• 使用 createResource 管理数据获取和状态</p>
        <p>• 组件支持多种 props 和插槽自定义</p>
        <p>• 详细文档: <a href="https://ui.frappe.io" target="_blank" class="underline">https://ui.frappe.io</a></p>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button,
  Input,
  Select,
  MultiSelect,
  Card,
  Badge,
  Avatar,
  FeatherIcon,
  Dialog,
  Checkbox,
  Textarea,
  createResource
} from 'frappe-ui'

const router = useRouter()

// 演示数据
const demoInput = ref('')
const demoSearch = ref('')
const demoTextarea = ref('')
const selectedFruit = ref('')
const selectedColors = ref([])
const checkboxes = ref([])
const showDialog = ref(false)

const demoAvatar = "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=100&h=100&fit=crop"

const fruitOptions = [
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
  { label: '葡萄', value: 'grape' },
]

const colorOptions = [
  { label: '红色', value: 'red' },
  { label: '蓝色', value: 'blue' },
  { label: '绿色', value: 'green' },
  { label: '黄色', value: 'yellow' },
  { label: '紫色', value: 'purple' },
]

// 使用 createResource 获取用户列表
const users = createResource({
  url: 'frappe.client.get_list',
  params: {
    doctype: 'User',
    fields: ['name', 'full_name', 'email', 'enabled'],
    limit_page_length: 10
  },
  auto: true
})
</script>
