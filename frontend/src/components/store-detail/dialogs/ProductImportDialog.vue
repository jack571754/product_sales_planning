<template>
	<div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
		<!-- 背景遮罩 -->
		<div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="handleClose"></div>

		<!-- 对话框内容 -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
				<!-- 头部 -->
				<div class="flex items-center justify-between p-6 border-b">
					<h3 class="text-lg font-semibold text-gray-900">单品导入</h3>
					<button
						@click="handleClose"
						class="text-gray-400 hover:text-gray-500 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- 内容 -->
				<div class="p-6 space-y-4">
					<!-- 说明信息 -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<h4 class="font-medium text-blue-900 mb-2">Excel格式要求：</h4>
						<ul class="text-sm text-blue-800 space-y-1">
							<li>• 第一行：表头（产品编码 | 产品名称 | 2025-01 | 2025-02 | ...）</li>
							<li>• 数据行：产品编码 | 产品名称 | 数量1 | 数量2 | ...</li>
							<li>• 月份格式支持：2025-01、202501、2025/01</li>
							<li>• 空值或0将被跳过</li>
						</ul>
						<button
							@click="downloadTemplate"
							:disabled="downloading"
							class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<span v-if="downloading">正在生成模板...</span>
							<span v-else>
								<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
								</svg>
								下载导入模板
							</span>
						</button>
					</div>

					<!-- 文件上传 -->
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							选择Excel文件 <span class="text-red-500">*</span>
						</label>
						<div class="flex items-center gap-3">
							<input
								ref="fileInput"
								type="file"
								accept=".xlsx,.xls"
								@change="handleFileSelect"
								class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
							/>
						</div>
						<p v-if="selectedFile" class="mt-2 text-sm text-gray-600">
							已选择：{{ selectedFile.name }}
						</p>
					</div>

					<!-- 导入结果 -->
					<div v-if="importResult" class="mt-4">
						<div
							:class="[
								'rounded-lg p-4',
								importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
							]"
						>
							<h4
								:class="[
									'font-medium mb-2',
									importResult.success ? 'text-green-900' : 'text-red-900'
								]"
							>
								{{ importResult.success ? '导入成功' : '导入失败' }}
							</h4>
							<p
								:class="[
									'text-sm',
									importResult.success ? 'text-green-800' : 'text-red-800'
								]"
							>
								{{ importResult.message }}
							</p>
							<div v-if="importResult.errors && importResult.errors.length > 0" class="mt-3">
								<p class="text-sm font-medium text-red-900 mb-1">错误详情：</p>
								<ul class="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
									<li v-for="(error, index) in importResult.errors" :key="index">
										• {{ error }}
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- 底部按钮 -->
				<div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
					<button
						@click="handleClose"
						class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						取消
					</button>
					<button
						@click="handleImport"
						:disabled="!selectedFile || importing"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<span v-if="importing">正在导入...</span>
						<span v-else>开始导入</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue'
import { call } from 'frappe-ui'

// Props
const props = defineProps({
	show: {
		type: Boolean,
		default: false
	},
	storeId: {
		type: String,
		required: true
	},
	taskId: {
		type: String,
		required: true
	}
})

// Emits
const emit = defineEmits(['close', 'success'])

// State
const fileInput = ref(null)
const selectedFile = ref(null)
const importing = ref(false)
const downloading = ref(false)
const importResult = ref(null)

// 处理文件选择
const handleFileSelect = (event) => {
	const file = event.target.files[0]
	if (file) {
		selectedFile.value = file
		importResult.value = null
	}
}

// 下载导入模板
const downloadTemplate = async () => {
	downloading.value = true
	try {
		const response = await call(
			'product_sales_planning.planning_system.page.store_detail.store_detail.download_import_template'
		)

		if (response && response.status === 'success') {
			// 打开下载链接
			window.open(response.file_url, '_blank')
		} else {
			alert(response?.msg || '模板生成失败')
		}
	} catch (error) {
		console.error('下载模板失败:', error)
		alert('模板生成失败：' + error.message)
	} finally {
		downloading.value = false
	}
}

// 处理导入
const handleImport = async () => {
	if (!selectedFile.value) {
		alert('请选择Excel文件')
		return
	}

	importing.value = true
	importResult.value = null

	try {
		// 上传文件到 Frappe
		const formData = new FormData()
		formData.append('file', selectedFile.value)
		formData.append('is_private', 1)
		formData.append('folder', 'Home')

		const uploadResponse = await fetch('/api/method/upload_file', {
			method: 'POST',
			headers: {
				'X-Frappe-CSRF-Token': window.csrf_token
			},
			body: formData
		})

		const uploadData = await uploadResponse.json()

		if (!uploadData.message || !uploadData.message.file_url) {
			throw new Error('文件上传失败')
		}

		const fileUrl = uploadData.message.file_url

		// 调用导入 API
		const response = await call(
			'product_sales_planning.planning_system.page.store_detail.store_detail.import_commodity_data',
			{
				store_id: props.storeId,
				task_id: props.taskId,
				file_url: fileUrl
			}
		)

		if (response && response.status === 'success') {
			importResult.value = {
				success: true,
				message: response.msg || '导入成功',
				errors: response.errors || []
			}

			// 延迟关闭对话框并触发成功事件
			setTimeout(() => {
				emit('success')
				handleClose()
			}, 2000)
		} else {
			importResult.value = {
				success: false,
				message: response?.msg || '导入失败',
				errors: response?.errors || []
			}
		}
	} catch (error) {
		console.error('导入失败:', error)
		importResult.value = {
			success: false,
			message: '导入失败：' + error.message,
			errors: []
		}
	} finally {
		importing.value = false
	}
}

// 关闭对话框
const handleClose = () => {
	if (!importing.value) {
		selectedFile.value = null
		importResult.value = null
		if (fileInput.value) {
			fileInput.value.value = ''
		}
		emit('close')
	}
}
</script>

<style scoped>
/* 自定义样式 */
</style>
