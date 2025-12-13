<template>
	<Card class="approval-status-card">
		<div class="card-header" @click="toggleCollapse">
			<div class="header-left">
				<FeatherIcon name="file-text" class="h-5 w-5 text-blue-600" />
				<h3 class="card-title">审批状态</h3>
				<Badge v-if="hasWorkflow" :theme="statusTheme" size="sm" class="ml-2">
					{{ statusText }}
				</Badge>
			</div>
			<div class="header-right">
				<Button
					v-if="hasWorkflow && approvalHistory.length > 0 && !isCollapsed"
					variant="ghost"
					theme="gray"
					size="sm"
					@click.stop="showHistoryDialog = true"
				>
					<template #prefix>
						<FeatherIcon name="clock" class="h-4 w-4" />
					</template>
					查看历史
				</Button>
				<Button
					variant="ghost"
					theme="gray"
					size="sm"
					class="collapse-btn"
				>
					<FeatherIcon
						:name="isCollapsed ? 'chevron-down' : 'chevron-up'"
						class="h-4 w-4"
					/>
				</Button>
			</div>
		</div>

		<Transition name="collapse">
			<div v-show="!isCollapsed" class="card-content">
			<!-- 无审批流程提示 -->
			<div v-if="!hasWorkflow" class="no-workflow-tip">
				<FeatherIcon name="info" class="h-4 w-4 text-gray-400" />
				<span class="text-sm text-gray-500">该任务未配置审批流程</span>
			</div>

			<!-- 有审批流程 -->
			<template v-else>
				<!-- 当前状态 -->
				<div class="status-section">
					<div class="status-label">当前状态</div>
					<Badge :theme="statusTheme" size="md" class="status-badge">
						{{ statusText }}
					</Badge>
				</div>

				<!-- 驳回原因 -->
				<Alert 
					v-if="rejectionReason" 
					theme="red" 
					title="驳回原因"
					class="rejection-alert"
				>
					{{ rejectionReason }}
				</Alert>

				<!-- 审批流程进度 -->
				<div v-if="workflowSteps.length > 0" class="workflow-section">
					<div class="workflow-label">审批流程</div>
					<div class="workflow-steps">
						<div 
							v-for="(step, index) in workflowSteps" 
							:key="index"
							class="workflow-step"
							:class="{
								'step-completed': index < currentStep - 1,
								'step-current': index === currentStep - 1,
								'step-pending': index > currentStep - 1
							}"
						>
							<div class="step-indicator">
								<div class="step-circle">
									<FeatherIcon 
										v-if="index < currentStep - 1" 
										name="check" 
										class="h-3 w-3"
									/>
									<span v-else class="step-number">{{ index + 1 }}</span>
								</div>
								<div v-if="index < workflowSteps.length - 1" class="step-line"></div>
							</div>
							<div class="step-content">
								<div class="step-name">{{ step.step_name }}</div>
								<div class="step-role">{{ step.approver_role }}</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 操作按钮 -->
				<div class="action-buttons">
					<!-- 提交审批 -->
					<Button
						v-if="canSubmit"
						variant="solid"
						theme="blue"
						:loading="submitting"
						@click="showSubmitDialog = true"
					>
						<template #prefix>
							<FeatherIcon name="send" class="h-4 w-4" />
						</template>
						提交审批
					</Button>

					<!-- 撤回审批 -->
					<Button
						v-if="canWithdraw"
						variant="outline"
						theme="orange"
						:loading="withdrawing"
						@click="showWithdrawDialog = true"
					>
						<template #prefix>
							<FeatherIcon name="rotate-ccw" class="h-4 w-4" />
						</template>
						撤回审批
					</Button>

					<!-- 审批通过 -->
					<Button
						v-if="canApprove"
						variant="solid"
						theme="green"
						:loading="approving"
						@click="showApproveDialog = true"
					>
						<template #prefix>
							<FeatherIcon name="check-circle" class="h-4 w-4" />
						</template>
						审批通过
					</Button>

					<!-- 驳回 -->
					<Dropdown 
						v-if="canApprove"
						:options="rejectOptions"
						placement="bottom-end"
					>
						<template #default>
							<Button
								variant="outline"
								theme="red"
								:loading="approving"
							>
								<template #prefix>
									<FeatherIcon name="x-circle" class="h-4 w-4" />
								</template>
								驳回
								<template #suffix>
									<FeatherIcon name="chevron-down" class="h-4 w-4" />
								</template>
							</Button>
						</template>
					</Dropdown>
				</div>
			</template>
			</div>
		</Transition>

		<!-- 提交审批对话框 -->
		<Dialog 
			v-model="showSubmitDialog" 
			:options="{ title: '提交审批', size: 'md' }"
		>
			<template #body-content>
				<div class="dialog-content">
					<FormControl
						label="提交说明"
						type="textarea"
						v-model="submitComment"
						placeholder="请输入提交说明（可选）"
						:rows="3"
					/>
				</div>
			</template>
			<template #actions>
				<Button variant="subtle" theme="gray" @click="showSubmitDialog = false">
					取消
				</Button>
				<Button 
					variant="solid" 
					theme="blue" 
					:loading="submitting"
					@click="handleSubmit"
				>
					确认提交
				</Button>
			</template>
		</Dialog>

		<!-- 撤回审批对话框 -->
		<Dialog 
			v-model="showWithdrawDialog" 
			:options="{ title: '撤回审批', size: 'md' }"
		>
			<template #body-content>
				<div class="dialog-content">
					<Alert theme="orange" title="确认撤回" class="mb-4">
						撤回后审批流程将重置，您可以重新编辑并提交。
					</Alert>
					<FormControl
						label="撤回原因"
						type="textarea"
						v-model="withdrawComment"
						placeholder="请输入撤回原因（可选）"
						:rows="3"
					/>
				</div>
			</template>
			<template #actions>
				<Button variant="subtle" theme="gray" @click="showWithdrawDialog = false">
					取消
				</Button>
				<Button 
					variant="solid" 
					theme="orange" 
					:loading="withdrawing"
					@click="handleWithdraw"
				>
					确认撤回
				</Button>
			</template>
		</Dialog>

		<!-- 审批通过对话框 -->
		<Dialog 
			v-model="showApproveDialog" 
			:options="{ title: '审批通过', size: 'md' }"
		>
			<template #body-content>
				<div class="dialog-content">
					<FormControl
						label="审批意见"
						type="textarea"
						v-model="approveComment"
						placeholder="请输入审批意见（可选）"
						:rows="3"
					/>
				</div>
			</template>
			<template #actions>
				<Button variant="subtle" theme="gray" @click="showApproveDialog = false">
					取消
				</Button>
				<Button 
					variant="solid" 
					theme="green" 
					:loading="approving"
					@click="handleApprove"
				>
					确认通过
				</Button>
			</template>
		</Dialog>

		<!-- 驳回对话框 -->
		<Dialog 
			v-model="showRejectDialog" 
			:options="{ title: '驳回审批', size: 'md' }"
		>
			<template #body-content>
				<div class="dialog-content">
					<Alert theme="red" title="驳回提示" class="mb-4">
						驳回后将根据您的选择退回到相应步骤。
					</Alert>
					<FormControl
						label="驳回原因"
						type="textarea"
						v-model="rejectComment"
						placeholder="请输入驳回原因（必填）"
						:rows="4"
						required
					/>
				</div>
			</template>
			<template #actions>
				<Button variant="subtle" theme="gray" @click="showRejectDialog = false">
					取消
				</Button>
				<Button 
					variant="solid" 
					theme="red" 
					:loading="approving"
					:disabled="!rejectComment.trim()"
					@click="handleReject"
				>
					确认驳回
				</Button>
			</template>
		</Dialog>

		<!-- 审批历史对话框 -->
		<Dialog 
			v-model="showHistoryDialog" 
			:options="{ title: '审批历史', size: 'lg' }"
		>
			<template #body-content>
				<div class="history-content">
					<div v-if="historyLoading" class="loading-state">
						<div class="spinner"></div>
						<span>加载中...</span>
					</div>
					<div v-else-if="approvalHistory.length === 0" class="empty-state">
						<FeatherIcon name="inbox" class="h-8 w-8 text-gray-300" />
						<span class="text-gray-500">暂无审批记录</span>
					</div>
					<div v-else class="history-timeline">
						<div 
							v-for="(record, index) in approvalHistory" 
							:key="record.name"
							class="timeline-item"
							:class="{
								'item-submit': record.action === '提交',
								'item-approve': record.action === '通过',
								'item-reject': record.action.includes('退回'),
								'item-withdraw': record.action === '撤回'
							}"
						>
							<div class="timeline-indicator">
								<div class="timeline-dot"></div>
								<div v-if="index < approvalHistory.length - 1" class="timeline-line"></div>
							</div>
							<div class="timeline-content">
								<div class="timeline-header">
									<span class="timeline-action">{{ record.action }}</span>
									<span class="timeline-time">{{ formatTime(record.action_time) }}</span>
								</div>
								<div class="timeline-details">
									<div class="detail-row">
										<span class="detail-label">操作人:</span>
										<span class="detail-value">{{ record.approver }}</span>
									</div>
									<div v-if="record.approval_step > 0" class="detail-row">
										<span class="detail-label">步骤:</span>
										<span class="detail-value">第 {{ record.approval_step }} 级</span>
									</div>
									<div class="detail-row comment-row">
										<span class="detail-label">{{ record.action.includes('退回') ? '驳回原因' : '审批意见' }}:</span>
										<span class="detail-value comment-value">{{ record.comments || '无' }}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</template>
			<template #actions>
				<Button variant="subtle" theme="gray" @click="showHistoryDialog = false">
					关闭
				</Button>
			</template>
		</Dialog>
	</Card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Card, Button, Badge, Alert, Dialog, Dropdown, FeatherIcon, FormControl } from 'frappe-ui'

// Props
const props = defineProps({
	hasWorkflow: { type: Boolean, default: false },
	currentStatus: { type: String, default: null },
	statusText: { type: String, default: '' },
	statusTheme: { type: String, default: 'gray' },
	canSubmit: { type: Boolean, default: false },
	canWithdraw: { type: Boolean, default: false },
	canApprove: { type: Boolean, default: false },
	currentStep: { type: Number, default: 0 },
	workflowSteps: { type: Array, default: () => [] },
	rejectionReason: { type: String, default: null },
	approvalHistory: { type: Array, default: () => [] },
	historyLoading: { type: Boolean, default: false },
	submitting: { type: Boolean, default: false },
	withdrawing: { type: Boolean, default: false },
	approving: { type: Boolean, default: false }
})

// Emits
const emit = defineEmits(['submit', 'withdraw', 'approve', 'refresh-history'])

// 折叠状态
const isCollapsed = ref(false)

// 从 localStorage 加载折叠状态
const COLLAPSE_KEY = 'approval_card_collapsed'
onMounted(() => {
	try {
		const saved = localStorage.getItem(COLLAPSE_KEY)
		if (saved !== null) {
			isCollapsed.value = saved === 'true'
		}
	} catch (e) {
		console.error('Failed to load collapse state:', e)
	}
})

// 切换折叠状态
const toggleCollapse = () => {
	isCollapsed.value = !isCollapsed.value
	try {
		localStorage.setItem(COLLAPSE_KEY, String(isCollapsed.value))
	} catch (e) {
		console.error('Failed to save collapse state:', e)
	}
}

// 对话框状态
const showSubmitDialog = ref(false)
const showWithdrawDialog = ref(false)
const showApproveDialog = ref(false)
const showRejectDialog = ref(false)
const showHistoryDialog = ref(false)

// 表单数据
const submitComment = ref('')
const withdrawComment = ref('')
const approveComment = ref('')
const rejectComment = ref('')
const rejectAction = ref('reject_to_submitter')

// 驳回选项
const rejectOptions = computed(() => [
	{
		label: '退回上一级',
		icon: 'corner-up-left',
		onClick: () => {
			rejectAction.value = 'reject_to_previous'
			showRejectDialog.value = true
		}
	},
	{
		label: '退回提交人',
		icon: 'corner-down-left',
		onClick: () => {
			rejectAction.value = 'reject_to_submitter'
			showRejectDialog.value = true
		}
	}
])

// 事件处理
const handleSubmit = () => {
	emit('submit', submitComment.value)
	showSubmitDialog.value = false
	submitComment.value = ''
}

const handleWithdraw = () => {
	emit('withdraw', withdrawComment.value)
	showWithdrawDialog.value = false
	withdrawComment.value = ''
}

const handleApprove = () => {
	emit('approve', 'approve', approveComment.value)
	showApproveDialog.value = false
	approveComment.value = ''
}

const handleReject = () => {
	if (!rejectComment.value.trim()) return
	emit('approve', rejectAction.value, rejectComment.value)
	showRejectDialog.value = false
	rejectComment.value = ''
}

// 格式化时间
const formatTime = (timeStr) => {
	if (!timeStr) return ''
	try {
		const date = new Date(timeStr)
		const now = new Date()
		const diff = now - date
		const minutes = Math.floor(diff / 60000)
		const hours = Math.floor(diff / 3600000)
		const days = Math.floor(diff / 86400000)

		if (minutes < 1) return '刚刚'
		if (minutes < 60) return `${minutes}分钟前`
		if (hours < 24) return `${hours}小时前`
		if (days < 7) return `${days}天前`
		
		return date.toLocaleString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		})
	} catch {
		return timeStr
	}
}
</script>

<style scoped>
.approval-status-card {
	background: white;
	border-radius: 0.5rem;
	box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	border-bottom: 1px solid #f3f4f6;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.card-title {
	font-size: 1rem;
	font-weight: 600;
	color: #111827;
	margin: 0;
}

.card-content {
	padding: 1rem;
}

.no-workflow-tip {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem;
	background: #f9fafb;
	border-radius: 0.375rem;
}

.status-section {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-bottom: 1rem;
}

.status-label {
	font-size: 0.875rem;
	font-weight: 500;
	color: #6b7280;
}

.status-badge {
	font-weight: 600;
}

.rejection-alert {
	margin-bottom: 1rem;
}

.workflow-section {
	margin-bottom: 1.5rem;
}

.workflow-label {
	font-size: 0.875rem;
	font-weight: 500;
	color: #6b7280;
	margin-bottom: 0.75rem;
}

.workflow-steps {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.workflow-step {
	display: flex;
	gap: 0.75rem;
}

.step-indicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
}

.step-circle {
	width: 2rem;
	height: 2rem;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.875rem;
	font-weight: 600;
	transition: all 0.2s;
}

.step-completed .step-circle {
	background: #10b981;
	color: white;
}

.step-current .step-circle {
	background: #3b82f6;
	color: white;
}

.step-pending .step-circle {
	background: #e5e7eb;
	color: #9ca3af;
}

.step-line {
	width: 2px;
	flex: 1;
	min-height: 1.5rem;
	transition: all 0.2s;
}

.step-completed .step-line {
	background: #10b981;
}

.step-current .step-line,
.step-pending .step-line {
	background: #e5e7eb;
}

.step-content {
	flex: 1;
	padding: 0.25rem 0;
}

.step-name {
	font-size: 0.875rem;
	font-weight: 500;
	color: #111827;
	margin-bottom: 0.125rem;
}

.step-role {
	font-size: 0.75rem;
	color: #6b7280;
}

.action-buttons {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.dialog-content {
	padding: 1rem;
}

.history-content {
	padding: 1rem;
	max-height: 60vh;
	overflow-y: auto;
}

.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem;
	gap: 0.75rem;
	color: #6b7280;
}

.spinner {
	width: 2rem;
	height: 2rem;
	border: 3px solid #e5e7eb;
	border-top-color: #3b82f6;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.history-timeline {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.timeline-item {
	display: flex;
	gap: 0.75rem;
}

.timeline-indicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
}

.timeline-dot {
	width: 0.75rem;
	height: 0.75rem;
	border-radius: 50%;
	border: 2px solid;
}

.item-submit .timeline-dot {
	background: #3b82f6;
	border-color: #3b82f6;
}

.item-approve .timeline-dot {
	background: #10b981;
	border-color: #10b981;
}

.item-reject .timeline-dot {
	background: #ef4444;
	border-color: #ef4444;
}

.item-withdraw .timeline-dot {
	background: #f59e0b;
	border-color: #f59e0b;
}

.timeline-line {
	width: 2px;
	flex: 1;
	background: #e5e7eb;
	min-height: 1rem;
}

.timeline-content {
	flex: 1;
	padding-bottom: 0.5rem;
}

.timeline-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.timeline-action {
	font-weight: 600;
	font-size: 0.875rem;
}

.item-submit .timeline-action {
	color: #3b82f6;
}

.item-approve .timeline-action {
	color: #10b981;
}

.item-reject .timeline-action {
	color: #ef4444;
}

.item-withdraw .timeline-action {
	color: #f59e0b;
}

.timeline-time {
	font-size: 0.75rem;
	color: #9ca3af;
}

.timeline-details {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.detail-row {
	display: flex;
	gap: 0.5rem;
	font-size: 0.875rem;
}

.detail-label {
	color: #6b7280;
	flex-shrink: 0;
}

.detail-value {
	color: #111827;
	flex: 1;
}

.comment-row {
	margin-top: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid #f3f4f6;
}

.comment-row .detail-label {
	font-weight: 500;
	color: #374151;
}

.comment-value {
	background: #f9fafb;
	padding: 0.5rem;
	border-radius: 0.375rem;
	border-left: 3px solid #3b82f6;
	font-style: italic;
	color: #374151;
	white-space: pre-wrap;
	word-break: break-word;
}

.item-reject .comment-value {
	border-left-color: #ef4444;
	background: #fef2f2;
}

@media (max-width: 768px) {
	.action-buttons {
		flex-direction: column;
	}
	
	.action-buttons > * {
		width: 100%;
	}
}
</style>