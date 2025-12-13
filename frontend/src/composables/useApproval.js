/**
 * 审批管理 Composable
 * 管理店铺详情页面的审批流程相关功能
 * 
 * 功能包括：
 * - 获取审批状态和历史
 * - 提交审批
 * - 撤回审批
 * - 审批操作（通过/驳回）
 * - 权限判断
 */

import { ref, computed } from 'vue'
import { call } from 'frappe-ui'

/**
 * 审批管理主函数
 * @param {string} storeId - 店铺ID
 * @param {string} taskId - 任务ID
 * @returns {Object} 包含所有审批相关状态、计算属性和方法的对象
 */
export function useApproval(storeId, taskId) {
	// ==================== 状态管理 ====================
	
	/**
	 * 审批状态数据
	 */
	const approvalStatus = ref(null)
	
	/**
	 * 审批历史记录
	 */
	const approvalHistory = ref([])
	
	/**
	 * 加载状态
	 */
	const statusLoading = ref(false)
	const historyLoading = ref(false)
	
	/**
	 * 操作状态
	 */
	const submitting = ref(false)
	const withdrawing = ref(false)
	const approving = ref(false)
	
	/**
	 * 错误状态
	 */
	const statusError = ref(null)
	const historyError = ref(null)
	
	// ==================== 计算属性 ====================
	
	/**
	 * 是否有审批流程
	 */
	const hasWorkflow = computed(() => {
		return approvalStatus.value?.workflow?.has_workflow || false
	})
	
	/**
	 * 当前审批状态
	 */
	const currentStatus = computed(() => {
		if (!hasWorkflow.value) return null
		return approvalStatus.value?.workflow?.current_state?.approval_status || '未开始'
	})
	
	/**
	 * 当前步骤
	 */
	const currentStep = computed(() => {
		if (!hasWorkflow.value) return 0
		return approvalStatus.value?.workflow?.current_state?.current_step || 0
	})
	
	/**
	 * 工作流步骤列表
	 */
	const workflowSteps = computed(() => {
		if (!hasWorkflow.value) return []
		return approvalStatus.value?.workflow?.workflow?.steps || []
	})
	
	/**
	 * 驳回原因
	 */
	const rejectionReason = computed(() => {
		if (!hasWorkflow.value) return null
		return approvalStatus.value?.workflow?.current_state?.rejection_reason || null
	})
	
	/**
	 * 是否可以提交审批
	 */
	const canSubmit = computed(() => {
		if (!hasWorkflow.value) return false
		
		const state = approvalStatus.value?.workflow?.current_state
		const canEdit = approvalStatus.value?.can_edit || false
		
		// 状态为"未开始"或"已驳回"且有编辑权限时可以提交
		return canEdit && (
			state?.status === '未开始' || 
			state?.approval_status === '已驳回'
		)
	})
	
	/**
	 * 是否可以撤回审批
	 */
	const canWithdraw = computed(() => {
		if (!hasWorkflow.value) return false
		
		const state = approvalStatus.value?.workflow?.current_state
		const canEdit = approvalStatus.value?.can_edit || false
		
		// 状态为"已提交"且审批状态为"待审批"时可以撤回
		return canEdit && 
			state?.status === '已提交' && 
			state?.approval_status === '待审批'
	})
	
	/**
	 * 是否可以审批
	 */
	const canApprove = computed(() => {
		if (!hasWorkflow.value) return false
		return approvalStatus.value?.can_approve || false
	})
	
	/**
	 * 用户角色列表
	 */
	const userRoles = computed(() => {
		return approvalStatus.value?.user_roles || []
	})
	
	/**
	 * 是否应该显示审批卡片
	 * 只有在以下情况下显示：
	 * 1. 有审批流程配置
	 * 2. 且满足以下任一条件：
	 *    - 可以提交审批（有数据且未提交）
	 *    - 可以撤回审批（已提交待审批）
	 *    - 可以审批（当前用户是审批人）
	 *    - 已经有审批历史（曾经提交过）
	 */
	const shouldShowApprovalCard = computed(() => {
		if (!hasWorkflow.value) return false
		
		// 如果有审批历史，说明曾经提交过，应该显示
		if (approvalHistory.value && approvalHistory.value.length > 0) return true
		
		// 如果可以进行任何审批操作，应该显示
		if (canSubmit.value || canWithdraw.value || canApprove.value) return true
		
		// 如果当前状态不是"未开始"，说明已经进入审批流程，应该显示
		const state = approvalStatus.value?.workflow?.current_state
		if (state && state.status !== '未开始') return true
		
		// 其他情况不显示
		return false
	})
	
	/**
	 * 当前状态的显示文本
	 */
	const statusText = computed(() => {
		const status = currentStatus.value
		const statusMap = {
			'未开始': '未提交',
			'待审批': '待审批',
			'已通过': '已通过',
			'已驳回': '已驳回'
		}
		return statusMap[status] || status
	})
	
	/**
	 * 当前状态的主题色
	 */
	const statusTheme = computed(() => {
		const status = currentStatus.value
		const themeMap = {
			'未开始': 'gray',
			'待审批': 'blue',
			'已通过': 'green',
			'已驳回': 'red'
		}
		return themeMap[status] || 'gray'
	})
	
	// ==================== API 方法 ====================
	
	/**
	 * 获取审批状态
	 */
	const fetchApprovalStatus = async () => {
		statusLoading.value = true
		statusError.value = null
		
		try {
			const response = await call(
				'product_sales_planning.api.v1.approval.get_approval_status',
				{
					task_id: taskId,
					store_id: storeId
				}
			)
			
			if (response?.status === 'success') {
				approvalStatus.value = response.data
				return {
					success: true,
					data: response.data
				}
			}
			
			statusError.value = response?.message || '获取审批状态失败'
			return {
				success: false,
				message: statusError.value
			}
		} catch (error) {
			console.error('获取审批状态失败:', error)
			statusError.value = error.message || '获取审批状态失败'
			return {
				success: false,
				message: statusError.value
			}
		} finally {
			statusLoading.value = false
		}
	}
	
	/**
	 * 获取审批历史
	 */
	const fetchApprovalHistory = async () => {
		historyLoading.value = true
		historyError.value = null
		
		try {
			const response = await call(
				'product_sales_planning.api.v1.approval.get_approval_history',
				{
					task_id: taskId,
					store_id: storeId
				}
			)
			
			if (response?.status === 'success') {
				approvalHistory.value = response.data || []
				return {
					success: true,
					data: response.data
				}
			}
			
			historyError.value = response?.message || '获取审批历史失败'
			return {
				success: false,
				message: historyError.value
			}
		} catch (error) {
			console.error('获取审批历史失败:', error)
			historyError.value = error.message || '获取审批历史失败'
			return {
				success: false,
				message: historyError.value
			}
		} finally {
			historyLoading.value = false
		}
	}
	
	/**
	 * 提交审批
	 * @param {string} comment - 提交说明
	 */
	const submitForApproval = async (comment = '') => {
		submitting.value = true
		
		try {
			const response = await call(
				'product_sales_planning.api.v1.approval.submit_for_approval',
				{
					task_id: taskId,
					store_id: storeId,
					comment: comment
				}
			)
			
			if (response?.status === 'success') {
				// 刷新审批状态和历史
				await Promise.all([
					fetchApprovalStatus(),
					fetchApprovalHistory()
				])
				
				return {
					success: true,
					message: response.message || '提交成功'
				}
			}
			
			return {
				success: false,
				message: response?.message || '提交失败'
			}
		} catch (error) {
			console.error('提交审批失败:', error)
			return {
				success: false,
				message: error.message || '提交失败'
			}
		} finally {
			submitting.value = false
		}
	}
	
	/**
	 * 撤回审批
	 * @param {string} comment - 撤回原因
	 */
	const withdrawApproval = async (comment = '') => {
		withdrawing.value = true
		
		try {
			const response = await call(
				'product_sales_planning.api.v1.approval.withdraw_approval',
				{
					task_id: taskId,
					store_id: storeId,
					comment: comment
				}
			)
			
			if (response?.status === 'success') {
				// 刷新审批状态和历史
				await Promise.all([
					fetchApprovalStatus(),
					fetchApprovalHistory()
				])
				
				return {
					success: true,
					message: response.message || '撤回成功'
				}
			}
			
			return {
				success: false,
				message: response?.message || '撤回失败'
			}
		} catch (error) {
			console.error('撤回审批失败:', error)
			return {
				success: false,
				message: error.message || '撤回失败'
			}
		} finally {
			withdrawing.value = false
		}
	}
	
	/**
	 * 审批操作
	 * @param {string} action - 操作类型: 'approve' | 'reject_to_previous' | 'reject_to_submitter'
	 * @param {string} comment - 审批意见/驳回原因
	 */
	const approveTask = async (action, comment = '') => {
		approving.value = true
		
		try {
			const response = await call(
				'product_sales_planning.api.v1.approval.approve_task_store',
				{
					task_id: taskId,
					store_id: storeId,
					action: action,
					comments: comment
				}
			)
			
			if (response?.status === 'success') {
				// 刷新审批状态和历史
				await Promise.all([
					fetchApprovalStatus(),
					fetchApprovalHistory()
				])
				
				return {
					success: true,
					message: response.message || '操作成功'
				}
			}
			
			return {
				success: false,
				message: response?.message || '操作失败'
			}
		} catch (error) {
			console.error('审批操作失败:', error)
			return {
				success: false,
				message: error.message || '操作失败'
			}
		} finally {
			approving.value = false
		}
	}
	
	/**
	 * 刷新所有审批数据
	 */
	const refreshApprovalData = async () => {
		const results = await Promise.all([
			fetchApprovalStatus(),
			fetchApprovalHistory()
		])
		
		const allSuccess = results.every(r => r.success)
		return {
			success: allSuccess,
			message: allSuccess ? '刷新成功' : '部分数据刷新失败'
		}
	}
	
	// ==================== 返回 ====================
	
	return {
		// 状态
		approvalStatus,
		approvalHistory,
		statusLoading,
		historyLoading,
		submitting,
		withdrawing,
		approving,
		statusError,
		historyError,
		
		// 计算属性
		hasWorkflow,
		shouldShowApprovalCard,
		currentStatus,
		currentStep,
		workflowSteps,
		rejectionReason,
		canSubmit,
		canWithdraw,
		canApprove,
		userRoles,
		statusText,
		statusTheme,
		
		// 方法
		fetchApprovalStatus,
		fetchApprovalHistory,
		submitForApproval,
		withdrawApproval,
		approveTask,
		refreshApprovalData
	}
}