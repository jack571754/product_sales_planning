<template>
  <div v-if="hasError" class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div class="max-w-md w-full">
      <Card class="p-6">
        <div class="text-center space-y-4">
          <div class="flex justify-center">
            <div class="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <FeatherIcon name="alert-triangle" class="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">页面加载失败</h2>
            <p class="text-sm text-gray-600">{{ errorMessage }}</p>
          </div>
          
          <div v-if="errorDetails" class="p-3 bg-gray-50 rounded-lg text-left">
            <p class="text-xs text-gray-500 font-mono break-all">{{ errorDetails }}</p>
          </div>
          
          <div class="flex gap-3 justify-center">
            <Button variant="solid" theme="blue" @click="retry">
              <template #prefix>
                <FeatherIcon name="refresh-cw" class="h-4 w-4" />
              </template>
              重试
            </Button>
            
            <Button variant="outline" theme="gray" @click="goHome">
              <template #prefix>
                <FeatherIcon name="home" class="h-4 w-4" />
              </template>
              返回首页
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card, FeatherIcon } from 'frappe-ui'

const router = useRouter()

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')

// 捕获子组件错误
onErrorCaptured((err, instance, info) => {
  console.error('组件错误捕获:', err, info)
  
  hasError.value = true
  errorMessage.value = '组件加载或渲染时发生错误'
  
  // 提取错误详情
  if (err.message) {
    errorDetails.value = err.message
  }
  
  // 阻止错误继续传播
  return false
})

const retry = () => {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  
  // 刷新当前路由
  router.go(0)
}

const goHome = () => {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  
  router.push({ name: 'Dashboard' })
}
</script>