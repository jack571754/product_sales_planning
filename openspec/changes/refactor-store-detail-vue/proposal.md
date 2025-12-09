# Change: Refactor Store Detail Page to Vue with Complete Feature Parity

## Why

The current store detail page exists in two versions:
1. **Traditional Frappe Page** (`planning_system/page/store_detail/`) - Fully functional with pagination, product import/export, product addition, mechanism import, approval workflow, and batch operations
2. **Vue SPA** (`frontend/src/pages/StoreDetail.vue`) - Partially implemented with basic data display but missing critical features

This creates maintenance burden, feature inconsistency, and user confusion. The Vue version needs to achieve complete feature parity with the traditional page to enable full migration to the modern Vue architecture.

**Current gaps in Vue implementation:**
- ❌ No pagination controls (loads all data at once)
- ❌ No product import from Excel
- ❌ No product addition dialog
- ❌ No mechanism import functionality
- ❌ No mechanism application dialog
- ❌ No batch delete operations
- ❌ No approval workflow UI (submit, withdraw, approve, reject)
- ❌ No approval history viewer
- ❌ No column visibility settings
- ❌ Missing operation buttons based on approval status

## What Changes

### 1. Complete Pagination System
- ✅ Add server-side pagination support (already exists in backend API)
- ✅ Implement pagination controls component (already exists: `PaginationControls.vue`)
- ✅ Add page size selector (20/50/100/200 items per page)
- ✅ Add page navigation (first/prev/next/last/goto)
- ✅ Display pagination info (current page, total pages, total records)
- ✅ Integrate with existing `useStoreDetail` composable

### 2. Product Import/Export Features
- ✅ Add "单品导入" (Product Import) button
- ✅ Create Excel import dialog with file upload
- ✅ Implement template download functionality
- ✅ Add import progress feedback
- ✅ Display import results (success/error counts)
- ✅ Add "导出Excel" (Export Excel) button
- ✅ Implement data export with current filters

### 3. Product Addition Features
- ✅ Add "添加商品" (Add Product) button
- ✅ Create multi-select product dialog
- ✅ Integrate with Frappe's `MultiSelectDialog` pattern
- ✅ Support filtering by brand/category
- ✅ Batch insert selected products

### 4. Mechanism Features
- ✅ Add "机制导入" (Mechanism Import) button
- ✅ Create mechanism Excel import dialog
- ✅ Add mechanism template download
- ✅ Add "应用机制" (Apply Mechanism) button
- ✅ Create mechanism selection dialog
- ✅ Support multi-select mechanism application

### 5. Batch Operations
- ✅ Add checkbox column for row selection
- ✅ Implement "批量删除" (Batch Delete) button
- ✅ Show/hide batch delete button based on selection
- ✅ Add confirmation dialog for batch operations
- ✅ Display operation results

### 6. Approval Workflow UI
- ✅ Add approval status display area
- ✅ Implement "提交审批" (Submit Approval) button
- ✅ Implement "撤回" (Withdraw) button
- ✅ Implement "通过" (Approve) button
- ✅ Implement "退回上一级" (Reject to Previous) button
- ✅ Implement "退回提交人" (Reject to Submitter) button
- ✅ Add "审批历史" (Approval History) button
- ✅ Create approval history dialog
- ✅ Control button visibility based on approval state
- ✅ Lock table editing based on approval status

### 7. Column Settings
- ✅ Add column visibility toggle panel
- ✅ Implement "管理列" (Manage Columns) button
- ✅ Create checkbox list for column selection
- ✅ Add "全选/取消全选" (Select All/Deselect All)
- ✅ Persist column visibility preferences

### 8. UI/UX Enhancements
- ✅ Match traditional page layout and styling
- ✅ Add operation button toolbar
- ✅ Implement responsive button states
- ✅ Add loading states for all operations
- ✅ Improve error handling and user feedback
- ✅ Add confirmation dialogs for destructive actions

## Impact

### Affected Specs
- `store-detail-page` (new capability) - Complete specification for Vue-based store detail page

### Affected Code
- `frontend/src/pages/StoreDetail.vue` - Major refactor with new features
- `frontend/src/composables/useStoreDetail.js` - Add pagination, import/export, approval methods
- `frontend/src/components/store-detail/` - New components:
  - `ActionToolbar.vue` - Operation buttons
  - `ProductImportDialog.vue` - Excel import
  - `ProductAddDialog.vue` - Product selection
  - `MechanismImportDialog.vue` - Mechanism import
  - `MechanismApplyDialog.vue` - Mechanism selection
  - `ApprovalStatusPanel.vue` - Approval state display
  - `ApprovalHistoryDialog.vue` - Approval timeline
  - `ColumnSettingsPanel.vue` - Column visibility
  - `BatchDeleteDialog.vue` - Batch operation confirmation
- Backend APIs (no changes needed - already exist):
  - `store_detail.py` - All required APIs already implemented
  - `approval_api.py` - Approval workflow APIs already exist

### Migration Path
1. Implement all features in Vue version
2. Test feature parity with traditional page
3. Update routing to use Vue version by default
4. Keep traditional page as fallback (can be removed later)
5. Update documentation and user guides

### Breaking Changes
- **None** - This is an additive change. Traditional page remains functional.

### Performance Considerations
- Server-side pagination reduces initial load time
- Lazy loading of dialogs improves page load performance
- Batch operations use existing optimized backend APIs

### User Experience
- Consistent modern UI across all pages
- Improved performance with pagination
- Better mobile responsiveness
- Smoother interactions with Vue reactivity
