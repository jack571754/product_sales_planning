# Design: Store Detail Page Vue Refactor

## Context

The store detail page is a critical component of the product sales planning system, used by planners to:
- View and edit commodity schedules for specific stores and tasks
- Import/export data in bulk via Excel
- Add products individually or via mechanisms
- Submit plans for approval and track approval status
- Manage large datasets (1000+ products) efficiently

**Current State:**
- Traditional Frappe Page: Fully functional, uses jQuery + Handsontable, ~2100 lines of JavaScript
- Vue SPA: Partially implemented, missing 80% of features, uses Vue 3 + frappe-ui

**Constraints:**
- Must maintain backward compatibility with existing backend APIs
- Must support same approval workflow as traditional page
- Must handle large datasets (1000+ products) efficiently
- Must work with existing Frappe authentication and permissions

**Stakeholders:**
- Planners: Need all features working in modern UI
- Approvers: Need approval workflow UI
- Admins: Need to maintain single codebase
- Developers: Need clean, maintainable Vue architecture

## Goals / Non-Goals

### Goals
1. **Feature Parity**: Implement 100% of traditional page features in Vue
2. **Performance**: Maintain or improve performance with server-side pagination
3. **Maintainability**: Clean component architecture, reusable composables
4. **User Experience**: Modern, responsive UI with better feedback
5. **Code Quality**: Follow Vue 3 best practices, use TypeScript-like patterns

### Non-Goals
1. **Backend Changes**: No changes to existing APIs (all APIs already exist)
2. **New Features**: No new features beyond what traditional page has
3. **Migration Tool**: No automated migration from traditional to Vue page
4. **Real-time Sync**: No WebSocket or real-time collaboration features
5. **Offline Support**: No offline editing or PWA features

## Decisions

### 1. Component Architecture

**Decision**: Use composition-based architecture with feature-specific components

**Structure:**
```
pages/
  StoreDetail.vue                    # Main page (orchestrator)
components/store-detail/
  ActionToolbar.vue                  # All operation buttons
  FilterPanel.vue                    # Store/task/search filters (exists)
  StatsCards.vue                     # Statistics display (exists)
  CommodityTable.vue                 # Handsontable wrapper (exists)
  PaginationControls.vue             # Pagination UI (exists)
  ApprovalStatusPanel.vue            # Approval state display
  ColumnSettingsPanel.vue            # Column visibility settings
  dialogs/
    ProductImportDialog.vue          # Excel import
    ProductAddDialog.vue             # Product selection
    MechanismImportDialog.vue        # Mechanism import
    MechanismApplyDialog.vue         # Mechanism selection
    ApprovalHistoryDialog.vue        # Approval timeline
    BatchDeleteDialog.vue            # Batch delete confirmation
composables/
  useStoreDetail.js                  # Main business logic (exists, needs enhancement)
  useHandsontable.js                 # Table management (exists)
  useApprovalWorkflow.js             # Approval logic (new)
  useFileOperations.js               # Import/export logic (new)
```

**Rationale:**
- Separation of concerns: Each component has single responsibility
- Reusability: Dialogs can be reused in other pages
- Testability: Small components are easier to test
- Maintainability: Clear boundaries between features

**Alternatives Considered:**
- Monolithic component: Rejected due to complexity (2000+ lines)
- Page-level components only: Rejected due to lack of reusability
- Feature modules: Rejected as overkill for current scope

### 2. Pagination Strategy

**Decision**: Server-side pagination with client-side caching

**Implementation:**
- Backend API already supports `start` and `page_length` parameters
- Client fetches one page at a time (default 20 items)
- Cache current page data in composable
- Invalidate cache on data changes (add/delete/import)

**Rationale:**
- Reduces initial load time (20 items vs 1000+ items)
- Reduces memory usage in browser
- Improves table rendering performance
- Backend API already optimized for pagination

**Alternatives Considered:**
- Client-side pagination: Rejected due to performance issues with 1000+ items
- Virtual scrolling: Rejected due to Handsontable complexity
- Infinite scroll: Rejected due to poor UX for data editing

### 3. State Management

**Decision**: Use composables with reactive state, no Vuex/Pinia

**State Structure:**
```javascript
// useStoreDetail.js
const state = reactive({
  // Data
  commodities: [],
  months: [],
  storeInfo: {},
  taskInfo: {},

  // Pagination
  pagination: {
    currentPage: 1,
    pageSize: 20,
    totalItems: 0
  },

  // Filters
  filters: {
    brand: null,
    category: null,
    searchTerm: null
  },

  // Approval
  approvalStatus: {},
  canEdit: true,

  // UI State
  loading: false,
  error: null,
  selectedRows: new Set()
})
```

**Rationale:**
- Composables provide sufficient state management for single-page scope
- No need for global state (data is page-specific)
- Simpler than Vuex/Pinia for this use case
- Better TypeScript support with composables

**Alternatives Considered:**
- Pinia store: Rejected as overkill for page-level state
- Props drilling: Rejected due to deep component tree
- Event bus: Rejected due to debugging difficulty

### 4. Dialog Management

**Decision**: Use frappe-ui Dialog component with v-if mounting

**Pattern:**
```vue
<template>
  <ProductImportDialog
    v-if="showImportDialog"
    @close="showImportDialog = false"
    @success="handleImportSuccess"
  />
</template>
```

**Rationale:**
- frappe-ui Dialog provides consistent UX with Frappe
- v-if ensures dialog is unmounted when closed (clean state)
- Event-based communication is clear and testable
- No need for dialog state management library

**Alternatives Considered:**
- Teleport + Portal: Rejected due to complexity
- Modal service: Rejected due to lack of type safety
- Always-mounted dialogs: Rejected due to memory usage

### 5. File Upload/Download

**Decision**: Use Frappe's file manager API directly

**APIs:**
- Upload: `frappe.utils.file_manager.save_file()`
- Download: Direct link to file URL
- Template generation: Server-side with openpyxl

**Rationale:**
- Frappe's file manager handles authentication, permissions, storage
- No need to implement custom file handling
- Consistent with rest of Frappe ecosystem
- Backend APIs already implemented

**Alternatives Considered:**
- Direct S3 upload: Rejected due to complexity
- Base64 encoding: Rejected due to size limits
- Custom file API: Rejected due to duplication

### 6. Approval Workflow Integration

**Decision**: Reuse existing approval_api.py methods, add UI layer only

**Workflow:**
```
Draft → Submit → Pending → Approve/Reject → Approved/Rejected
         ↓                    ↓
      Withdraw            Reject to Previous
```

**UI Components:**
- `ApprovalStatusPanel`: Shows current state, step, reason
- Action buttons: Submit/Withdraw/Approve/Reject (conditional visibility)
- `ApprovalHistoryDialog`: Timeline view of all actions

**Rationale:**
- Backend workflow logic is complex and well-tested
- No need to duplicate logic in frontend
- UI only needs to call APIs and display state
- Consistent with traditional page behavior

**Alternatives Considered:**
- Client-side workflow state machine: Rejected due to complexity
- Optimistic UI updates: Rejected due to approval criticality
- Real-time status updates: Rejected as out of scope

### 7. Error Handling

**Decision**: Three-tier error handling strategy

**Tiers:**
1. **API Level**: Catch errors in composable methods, return `{ success, message, data }`
2. **Component Level**: Display errors in UI (toast, inline message, dialog)
3. **Global Level**: Log errors to console, optionally send to error tracking

**Example:**
```javascript
// Composable
async function importProducts(file) {
  try {
    const result = await call('...import_commodity_data', { file })
    if (result.status === 'success') {
      return { success: true, data: result }
    } else {
      return { success: false, message: result.message }
    }
  } catch (error) {
    console.error('Import failed:', error)
    return { success: false, message: error.message }
  }
}

// Component
const result = await importProducts(file)
if (result.success) {
  showToast('导入成功', 'success')
} else {
  showToast(result.message, 'error')
}
```

**Rationale:**
- Clear error boundaries at each level
- User-friendly error messages
- Debugging information preserved in console
- No silent failures

**Alternatives Considered:**
- Global error handler only: Rejected due to lack of context
- Try-catch in every component: Rejected due to code duplication
- Error boundary component: Rejected as Vue 3 doesn't support it well

## Risks / Trade-offs

### Risk 1: Handsontable Performance with Large Datasets
**Mitigation:**
- Use server-side pagination (max 200 items per page)
- Enable Handsontable's `renderAllRows: false` optimization
- Use fixed table height to avoid layout thrashing
- Test with 1000+ product datasets

### Risk 2: Feature Parity Validation
**Mitigation:**
- Create feature checklist comparing traditional vs Vue page
- Manual testing of all workflows
- User acceptance testing with actual planners
- Keep traditional page as fallback during transition

### Risk 3: Approval Workflow Edge Cases
**Mitigation:**
- Reuse existing backend logic (no new logic in frontend)
- Test all approval state transitions
- Add comprehensive error messages
- Document approval workflow in user guide

### Risk 4: Browser Compatibility
**Mitigation:**
- Test on Chrome, Firefox, Safari, Edge
- Use Vite's browser target configuration
- Polyfill if needed (unlikely with modern browsers)
- Document minimum browser versions

### Trade-off 1: Component Granularity
**Decision**: Favor smaller components over fewer large ones
**Trade-off**: More files to maintain vs easier testing and reusability
**Justification**: Easier maintenance and testing outweigh file count

### Trade-off 2: Client-side vs Server-side Filtering
**Decision**: Use server-side filtering for brand/category, client-side for search
**Trade-off**: More API calls vs better performance
**Justification**: Server-side filtering reduces data transfer, search is fast enough client-side

### Trade-off 3: Optimistic UI Updates
**Decision**: No optimistic updates for critical operations (approval, delete)
**Trade-off**: Slower perceived performance vs data consistency
**Justification**: Data consistency is critical for approval workflow

## Migration Plan

### Phase 1: Implementation (Week 1-2)
1. Implement pagination and basic operations
2. Add import/export dialogs
3. Implement approval workflow UI
4. Add batch operations

### Phase 2: Testing (Week 3)
1. Feature parity testing
2. Performance testing with large datasets
3. User acceptance testing
4. Bug fixes

### Phase 3: Deployment (Week 4)
1. Deploy to staging environment
2. Parallel run with traditional page
3. Collect user feedback
4. Deploy to production

### Phase 4: Cleanup (Week 5)
1. Update documentation
2. Archive OpenSpec change
3. Optional: Remove traditional page (if no issues)

### Rollback Plan
- Traditional page remains functional
- Can switch back via routing configuration
- No data migration needed (both use same backend)

## Open Questions

1. **Q: Should we add keyboard shortcuts for common operations?**
   - A: Out of scope for initial implementation, can add later

2. **Q: Should we support drag-and-drop for Excel import?**
   - A: Nice to have, but not critical. Use standard file input first.

3. **Q: Should we add undo/redo for table edits?**
   - A: Handsontable has built-in undo/redo, should work automatically

4. **Q: Should we add real-time collaboration features?**
   - A: Out of scope. Would require WebSocket infrastructure.

5. **Q: Should we migrate traditional page users automatically?**
   - A: No. Let users discover Vue version naturally. Both can coexist.
