<template>
  <div class="p-6">
    <el-page-header content="Vue + Element Plus 测试页面" @back="goBack" />
    
    <el-card class="mt-6">
      <template #header>当前用户信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户名">{{ user.full_name }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ user.name }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ user.roles.join(', ') }}</el-descriptions-item>
      </el-descriptions>
      
      <el-button type="primary" @click="callServerMethod" class="mt-4">
        调用后端方法（测试）
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const user = ref({})

onMounted(async () => {
  // 调用 frappe-boot 获取当前用户信息
  const boot = await frappe.getBootInfo?.() || await frappe.call({method: 'frappe.sessions.get_bootinfo'})
  user.value = boot.user_info[frappe.user_id] || boot.user
})

const callServerMethod = async () => {
  try {
    const r = await frappe.call({
      method: 'your_app.api.test_hello',  // 你的 Python API 方法
      args: { name: '世界' },
      freeze: true,
      freeze_message: '请求中...'
    })
    ElMessage.success(r.message.message)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

const goBack = () => {
  window.history.back()
}
</script>

<style scoped>
:deep(.el-card__header) {
  background: linear-gradient(90deg, #409eff, #79bbff);
  color: white;
}
</style>