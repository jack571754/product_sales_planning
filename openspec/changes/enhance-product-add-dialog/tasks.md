# Tasks: Enhance Product Add Dialog with Handsontable Integration

## Overview
This document outlines the implementation tasks for enhancing the product add dialog in the Vue SPA store-detail page with improved UX and Handsontable integration.

## Task Breakdown

### Phase 1: Frontend Dialog Enhancement (2-3 days)

#### Task 1.1: Enhance ProductAddDialog Search and Filtering
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: None

**Subtasks**:
- [ ] Add debounced search input with loading indicator
- [ ] Implement multi-select filters for brand and category
- [ ] Add "Clear All Filters" button
- [ ] Show filter result count
- [ ] Add visual indicator for already-added products (disabled checkbox + badge)

**Validation**:
- Search responds within 300ms of last keystroke
- Filters can be combined (AND logic)
- Already-added products are clearly marked

---

#### Task 1.2: Improve Pagination and Product List Display
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Add configurable page size selector (20, 50, 100, 200)
- [ ] Implement "Jump to Page" functionality
- [ ] Add product thumbnail images (if available)
- [ ] Show product stock status (if applicable)
- [ ] Improve product card layout with better spacing

**Validation**:
- Pagination works smoothly with large datasets (1000+ products)
- Page size changes preserve current selection
- Product information is clearly displayed

---

#### Task 1.3: Add Default Quantity Configuration Interface
**Priority**: High
**Estimated Time**: 6 hours
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Add "Set Default Quantity" section in dialog
- [ ] Implement quantity input for each month column
- [ ] Add quick templates dropdown:
  - "Same for all months"
  - "Progressive increase"
  - "Custom per month"
- [ ] Add "Apply to All Selected" button
- [ ] Show quantity preview before confirmation

**Validation**:
- Users can set quantities before adding products
- Templates apply correctly to all selected products
- Quantity values are validated (positive integers only)

---

#### Task 1.4: Enhance Batch Selection and Feedback
**Priority**: Medium
**Estimated Time**: 3 hours
**Dependencies**: Task 1.1

**Subtasks**:
- [ ] Improve "Select All" to work across all pages
- [ ] Add "Select All on This Page" option
- [ ] Show selected count badge in dialog header
- [ ] Add progress bar for batch operations
- [ ] Implement detailed result modal (success/failure breakdown)

**Validation**:
- "Select All" correctly selects all filtered products
- Progress bar updates in real-time
- Result modal shows clear success/failure details

---

### Phase 2: Handsontable Integration (1-2 days)

#### Task 2.1: Implement Immediate Table Refresh
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: Task 1.3

**Subtasks**:
- [ ] Add `refreshData()` method to `useStoreDetail.js`
- [ ] Implement optimistic UI update (add rows immediately)
- [ ] Add server-side data sync after successful API call
- [ ] Handle refresh failures with rollback mechanism
- [ ] Preserve table scroll position and selection state

**Validation**:
- Table updates within 500ms of successful addition
- No flickering or layout shifts during refresh
- Failed additions are rolled back gracefully

---

#### Task 2.2: Add Visual Highlighting for New Products
**Priority**: Medium
**Estimated Time**: 3 hours
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Add CSS class for newly added rows in Handsontable
- [ ] Implement fade-in animation for new rows
- [ ] Auto-scroll to first newly added product
- [ ] Add temporary highlight (3-5 seconds) that fades out
- [ ] Ensure highlight works with pagination

**Validation**:
- New rows are clearly highlighted
- Highlight fades out smoothly after 5 seconds
- Auto-scroll works correctly

---

#### Task 2.3: Optimize Handsontable Performance
**Priority**: Medium
**Estimated Time**: 3 hours
**Dependencies**: Task 2.1

**Subtasks**:
- [ ] Implement virtual scrolling for large datasets
- [ ] Add row rendering optimization (render visible rows only)
- [ ] Optimize column width calculations
- [ ] Add loading skeleton for table refresh
- [ ] Implement incremental data loading

**Validation**:
- Table renders smoothly with 1000+ rows
- Scroll performance is smooth (60fps)
- Memory usage stays under 100MB

---

### Phase 3: Backend Enhancements (1 day)

#### Task 3.1: Enhance bulk_insert_commodity_schedule API
**Priority**: High
**Estimated Time**: 3 hours
**Dependencies**: None

**Subtasks**:
- [ ] Add `default_quantities` parameter (JSON object with month->quantity mapping)
- [ ] Validate quantity values (positive integers)
- [ ] Apply default quantities to newly created records
- [ ] Return detailed response with inserted record IDs
- [ ] Add transaction rollback on partial failures

**Validation**:
- API accepts and applies default quantities correctly
- Invalid quantities are rejected with clear error messages
- Partial failures are handled gracefully

---

#### Task 3.2: Optimize CommodityScheduleService.bulk_insert
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 3.1

**Subtasks**:
- [ ] Add batch size configuration (default 100 records per batch)
- [ ] Implement chunked insertion for large batches
- [ ] Add progress callback for long-running operations
- [ ] Optimize database queries (use bulk insert)
- [ ] Add duplicate detection before insertion

**Validation**:
- Batch insertion completes within 5 seconds for 100 products
- No database deadlocks or timeouts
- Duplicate products are skipped correctly

---

#### Task 3.3: Enhance API Response Format
**Priority**: Low
**Estimated Time**: 2 hours
**Dependencies**: Task 3.1

**Subtasks**:
- [ ] Return list of inserted record IDs
- [ ] Include detailed error messages for failed insertions
- [ ] Add statistics (total, inserted, skipped, failed)
- [ ] Return newly inserted records with full data
- [ ] Add execution time metrics

**Validation**:
- Response includes all required information
- Frontend can use response to update UI immediately
- Error messages are user-friendly

---

### Phase 4: Testing and Refinement (1-2 days)

#### Task 4.1: Unit Testing
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: All previous tasks

**Subtasks**:
- [ ] Write unit tests for ProductAddDialog component
- [ ] Test quantity validation logic
- [ ] Test filter and search functionality
- [ ] Test Handsontable refresh methods
- [ ] Test backend API with various inputs

**Validation**:
- All unit tests pass
- Code coverage > 80%

---

#### Task 4.2: Integration Testing
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: Task 4.1

**Subtasks**:
- [ ] Test end-to-end product addition flow
- [ ] Test with large datasets (1000+ products)
- [ ] Test concurrent user operations
- [ ] Test error scenarios (network failures, validation errors)
- [ ] Test browser compatibility (Chrome, Firefox, Safari)

**Validation**:
- All integration tests pass
- No regressions in existing functionality

---

#### Task 4.3: Performance Testing
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 4.2

**Subtasks**:
- [ ] Measure dialog load time
- [ ] Measure table refresh time
- [ ] Measure batch insertion time
- [ ] Profile memory usage
- [ ] Identify and fix performance bottlenecks

**Validation**:
- Dialog loads in < 1 second
- Table refreshes in < 500ms
- Batch insertion (100 products) completes in < 5 seconds

---

#### Task 4.4: User Acceptance Testing
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: Task 4.2

**Subtasks**:
- [ ] Conduct UAT with product owner
- [ ] Gather feedback on UX improvements
- [ ] Test with real user workflows
- [ ] Document known issues and limitations
- [ ] Create user guide/documentation

**Validation**:
- Product owner approves the implementation
- No critical bugs found
- User guide is complete

---

## Task Dependencies Graph

```
Task 1.1 (Search & Filtering)
  ├─> Task 1.2 (Pagination)
  ├─> Task 1.3 (Default Quantity)
  │     └─> Task 2.1 (Table Refresh)
  │           ├─> Task 2.2 (Visual Highlighting)
  │           └─> Task 2.3 (Performance Optimization)
  └─> Task 1.4 (Batch Selection)

Task 3.1 (API Enhancement)
  └─> Task 3.2 (Service Optimization)
        └─> Task 3.3 (Response Format)

All Tasks
  └─> Task 4.1 (Unit Testing)
        └─> Task 4.2 (Integration Testing)
              ├─> Task 4.3 (Performance Testing)
              └─> Task 4.4 (UAT)
```

## Parallel Work Opportunities

The following tasks can be worked on in parallel:
- **Frontend Team**: Tasks 1.1, 1.2, 1.3, 1.4 (can be parallelized across developers)
- **Backend Team**: Tasks 3.1, 3.2, 3.3 (can start immediately)
- **Frontend + Backend**: Task 2.1 requires coordination but can overlap with backend work

## Risk Mitigation Tasks

### Risk 1: Handsontable Performance Issues
- **Mitigation Task**: Task 2.3 (Performance Optimization)
- **Fallback**: Implement server-side pagination if client-side performance is insufficient

### Risk 2: Race Conditions
- **Mitigation Task**: Add optimistic locking in Task 3.1
- **Fallback**: Implement queue-based batch processing

### Risk 3: Browser Compatibility
- **Mitigation Task**: Task 4.2 includes cross-browser testing
- **Fallback**: Provide fallback UI for unsupported browsers

## Definition of Done

A task is considered complete when:
1. All subtasks are checked off
2. Code is reviewed and approved
3. Unit tests are written and passing
4. Integration tests are passing
5. Documentation is updated
6. No critical bugs remain
7. Performance meets acceptance criteria

## Notes

- All tasks should follow the project's coding standards (see `CLAUDE.md`)
- Use Tab indentation for all code
- Follow Vue 3 Composition API with `<script setup>` syntax
- Use frappe-ui components where possible
- Ensure all API calls use proper error handling
- Add loading states for all async operations
