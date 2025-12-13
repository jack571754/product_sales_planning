<template>
	<Dialog v-model="dialogOpen" title="单品导入">
		<template #body-content>
			<div class="space-y-4">
				<Alert
					theme="blue"
					title="Excel 格式要求"
					description="第一行：产品编码 | 产品名称 | 月份列；月份格式支持 2025-01、202501、2025/01；空值或 0 将被跳过。"
				/>

				<div class="flex items-center justify-between">
					<Button
						variant="outline"
						theme="blue"
						icon-left="download"
						:loading="downloading"
						@click="downloadTemplate"
					>
						下载导入模板
					</Button>
				</div>

				<div class="border border-gray-100 rounded-lg p-4 bg-gray-50">
					<div class="flex items-center justify-between mb-2">
						<div class="text-sm font-medium text-gray-800">选择 Excel 文件</div>
						<Badge v-if="uploadedFile" theme="green" size="sm">已上传</Badge>
					</div>
					<FileUploader
						:file-types="'.xlsx,.xls'"
						:upload-args="{ private: true, folder: 'Home' }"
						@success="handleUploadSuccess"
						@failure="handleUploadFailure"
					>
						<template #default="{ openFileSelector, uploading, progress }">
							<Button
								variant="solid"
								theme="blue"
								icon-left="upload"
								:loading="uploading"
								@click="() => { uploadError = null; openFileSelector() }"
							>
								{{ uploading ? `上传中 ${progress}%` : '选择文件' }}
							</Button>
						</template>
					</FileUploader>
					<p v-if="uploadedFile" class="mt-2 text-sm text-gray-600">
						已选择：{{ uploadedFile.file_name || uploadedFile.name || '已上传文件' }}
					</p>
					<p v-if="uploadError" class="mt-2 text-sm text-red-600">
						{{ uploadError }}
					</p>
				</div>

				<div v-if="importResult" class="mt-2">
					<Alert
						:theme="importResult.success ? 'green' : 'red'"
						:title="importResult.success ? '导入成功' : '导入失败'"
						:description="importResult.message"
					/>
					<div v-if="importResult.errors && importResult.errors.length" class="mt-2 bg-red-50 border border-red-100 rounded p-3">
						<p class="text-sm font-medium text-red-800 mb-1">错误详情：</p>
						<ul class="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
							<li v-for="(error, index) in importResult.errors" :key="index">
								• {{ error }}
							</li>
						</ul>
					</div>
				</div>
			</div>
		</template>

		<template #actions>
			<Button variant="subtle" theme="gray" @click="handleClose">
				取消
			</Button>
			<Button
				variant="solid"
				theme="blue"
				icon-left="play"
				:loading="importing"
				:disabled="!uploadedFile"
				@click="handleImport"
			>
				开始导入
			</Button>
		</template>
	</Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Dialog, Button, Badge, FileUploader, Alert, toast, call } from 'frappe-ui'

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
const importing = ref(false)
const downloading = ref(false)
const uploadedFile = ref(null)
const uploadError = ref(null)
const importResult = ref(null)

const dialogOpen = computed({
	get: () => props.show,
	set: (val) => {
		if (!val) handleClose()
	}
})

// 下载导入模板
const downloadTemplate = async () => {
	downloading.value = true
	try {
		const response = await call(
			'product_sales_planning.api.v1.import_export.download_import_template',
			{ task_id: props.taskId }
		)

		if (response && response.status === 'success') {
			window.open(response.file_url, '_blank')
		} else {
			toast.error(response?.msg || '模板生成失败')
		}
	} catch (error) {
		toast.error(error.message || '模板生成失败')
	} finally {
		downloading.value = false
	}
}

const handleUploadSuccess = (data) => {
	uploadError.value = null
	uploadedFile.value = data?.message || data
	importResult.value = null
}

const handleUploadFailure = (error) => {
	uploadError.value = error?.message || '文件上传失败'
	uploadedFile.value = null
}

// 处理导入
const handleImport = async () => {
	const fileUrl = uploadedFile.value?.file_url || uploadedFile.value?.url
	if (!fileUrl) {
		toast.error('请先上传 Excel 文件')
		return
	}

	importing.value = true
	importResult.value = null

	try {
		const response = await call(
			'product_sales_planning.api.v1.import_export.import_commodity_data',
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
			toast.success(importResult.value.message)
			emit('success')
			handleClose()
		} else {
			importResult.value = {
				success: false,
				message: response?.msg || '导入失败',
				errors: response?.errors || []
			}
			toast.error(importResult.value.message)
		}
	} catch (error) {
		importResult.value = {
			success: false,
			message: error.message || '导入失败',
			errors: []
		}
		toast.error(importResult.value.message)
	} finally {
		importing.value = false
	}
}

// 关闭对话框
const handleClose = () => {
	if (importing.value) return
	uploadedFile.value = null
	uploadError.value = null
	importResult.value = null
	emit('close')
}
</script>


<style scoped>
/* 
 * 确保 Dialog 组件始终显示在最上层
 * frappe-ui Dialog 默认 z-index 约为 1050
 * 这里添加额外的保护措施
 */
:deep(.modal-container) {
	z-index: 1050 !important;
}

:deep(.modal-backdrop) {
	z-index: 1040 !important;
}

/* 确保 Dialog 内容不受外部 z-index 影响 */
:deep(.modal-content) {
	position: relative;
	z-index: 1;
}
</style>
