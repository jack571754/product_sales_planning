# Implementation Tasks

## 1. Pagination Implementation
- [ ] 1.1 Update `useStoreDetail.js` to use server-side pagination
- [ ] 1.2 Modify API calls to include `start` and `page_length` parameters
- [ ] 1.3 Update `PaginationControls.vue` to emit page change events
- [ ] 1.4 Integrate pagination controls with data fetching
- [ ] 1.5 Add page size selector (20/50/100/200)
- [ ] 1.6 Implement goto page functionality
- [ ] 1.7 Test pagination with large datasets (1000+ records)

## 2. Product Import/Export
- [ ] 2.1 Create `ProductImportDialog.vue` component
- [ ] 2.2 Implement file upload with Frappe's file manager
- [ ] 2.3 Add template download button and API integration
- [ ] 2.4 Implement import progress feedback
- [ ] 2.5 Display import results (success/error counts)
- [ ] 2.6 Add "导出Excel" button to action toolbar
- [ ] 2.7 Implement export functionality with current filters
- [ ] 2.8 Test import with various Excel formats
- [ ] 2.9 Test export with filtered and unfiltered data

## 3. Product Addition
- [ ] 3.1 Create `ProductAddDialog.vue` component
- [ ] 3.2 Implement product search and filtering
- [ ] 3.3 Add multi-select functionality
- [ ] 3.4 Integrate with `bulk_insert_commodity_schedule` API
- [ ] 3.5 Add success/error feedback
- [ ] 3.6 Refresh data after successful addition
- [ ] 3.7 Test with various product selections

## 4. Mechanism Features
- [ ] 4.1 Create `MechanismImportDialog.vue` component
- [ ] 4.2 Implement mechanism Excel import
- [ ] 4.3 Add mechanism template download
- [ ] 4.4 Create `MechanismApplyDialog.vue` component
- [ ] 4.5 Implement mechanism search and multi-select
- [ ] 4.6 Integrate with `apply_mechanisms` API
- [ ] 4.7 Add operation feedback
- [ ] 4.8 Test mechanism import and application

## 5. Batch Operations
- [ ] 5.1 Add checkbox column to Handsontable configuration
- [ ] 5.2 Implement row selection tracking
- [ ] 5.3 Create `BatchDeleteDialog.vue` confirmation component
- [ ] 5.4 Add "批量删除" button to action toolbar
- [ ] 5.5 Show/hide button based on selection count
- [ ] 5.6 Integrate with `batch_delete_by_codes` API
- [ ] 5.7 Refresh data after successful deletion
- [ ] 5.8 Test batch delete with various selections

## 6. Approval Workflow UI
- [ ] 6.1 Create `ApprovalStatusPanel.vue` component
- [ ] 6.2 Display approval status and current step
- [ ] 6.3 Show rejection reason when applicable
- [ ] 6.4 Add "提交审批" button with comment dialog
- [ ] 6.5 Add "撤回" button with confirmation
- [ ] 6.6 Add "通过" button with comment dialog
- [ ] 6.7 Add "退回上一级" button with reason dialog
- [ ] 6.8 Add "退回提交人" button with reason dialog
- [ ] 6.9 Create `ApprovalHistoryDialog.vue` component
- [ ] 6.10 Display approval timeline with actions
- [ ] 6.11 Implement button visibility logic based on approval state
- [ ] 6.12 Lock table editing based on approval status
- [ ] 6.13 Test all approval workflow transitions

## 7. Column Settings
- [ ] 7.1 Create `ColumnSettingsPanel.vue` component
- [ ] 7.2 Generate checkbox list from table columns
- [ ] 7.3 Implement column show/hide functionality
- [ ] 7.4 Add "全选/取消全选" toggle
- [ ] 7.5 Persist settings to localStorage
- [ ] 7.6 Restore settings on page load
- [ ] 7.7 Test column visibility with various configurations

## 8. Action Toolbar
- [ ] 8.1 Create `ActionToolbar.vue` component
- [ ] 8.2 Add all operation buttons (返回/刷新/导入/导出/添加/机制/审批)
- [ ] 8.3 Implement button visibility logic based on:
  - [ ] Store/task selection status
  - [ ] Approval workflow state
  - [ ] User permissions
  - [ ] Edit permissions
- [ ] 8.4 Add loading states for all buttons
- [ ] 8.5 Implement button click handlers
- [ ] 8.6 Test button states in various scenarios

## 9. Composable Enhancements
- [ ] 9.1 Add pagination state to `useStoreDetail.js`
- [ ] 9.2 Implement `importProducts` method
- [ ] 9.3 Implement `exportProducts` method
- [ ] 9.4 Implement `addProducts` method
- [ ] 9.5 Implement `importMechanism` method
- [ ] 9.6 Implement `applyMechanisms` method
- [ ] 9.7 Implement `batchDelete` method
- [ ] 9.8 Implement `submitApproval` method
- [ ] 9.9 Implement `withdrawApproval` method
- [ ] 9.10 Implement `approveTask` method
- [ ] 9.11 Implement `rejectTask` method
- [ ] 9.12 Implement `loadApprovalHistory` method
- [ ] 9.13 Add error handling for all methods
- [ ] 9.14 Add loading states for all operations

## 10. Integration and Testing
- [ ] 10.1 Integrate all components into `StoreDetail.vue`
- [ ] 10.2 Test complete workflow: select store/task → load data → paginate
- [ ] 10.3 Test import workflow: download template → fill data → import
- [ ] 10.4 Test product addition: search → select → add
- [ ] 10.5 Test mechanism workflow: import → apply
- [ ] 10.6 Test batch operations: select rows → delete
- [ ] 10.7 Test approval workflow: submit → approve/reject → history
- [ ] 10.8 Test column settings: hide/show columns → persist
- [ ] 10.9 Test with different user roles and permissions
- [ ] 10.10 Test error scenarios and edge cases
- [ ] 10.11 Test mobile responsiveness
- [ ] 10.12 Performance test with large datasets (1000+ records)

## 11. Documentation and Cleanup
- [ ] 11.1 Update CLAUDE.md with Vue store detail page documentation
- [ ] 11.2 Add component usage examples
- [ ] 11.3 Document composable methods and parameters
- [ ] 11.4 Add inline code comments for complex logic
- [ ] 11.5 Update routing documentation
- [ ] 11.6 Create user guide for new features
- [ ] 11.7 Add migration notes for users of traditional page

## 12. Validation and Deployment
- [ ] 12.1 Run `openspec validate refactor-store-detail-vue --strict`
- [ ] 12.2 Fix any validation errors
- [ ] 12.3 Build Vue frontend: `cd frontend && yarn build`
- [ ] 12.4 Clear Frappe cache: `bench --site [site] clear-cache`
- [ ] 12.5 Test in production-like environment
- [ ] 12.6 Get user acceptance testing feedback
- [ ] 12.7 Address any issues found in UAT
- [ ] 12.8 Deploy to production
