# Proposal: Enhance Product Add Dialog with Handsontable Integration

## Change ID
`enhance-product-add-dialog`

## Summary
Enhance the product add dialog in the Vue SPA store-detail page (`/planning/store-detail`) to provide better user experience with improved search, filtering, pagination, and immediate Handsontable table refresh after adding products. Support batch product addition with default quantity settings.

## Problem Statement
The current `ProductAddDialog.vue` component in the Vue SPA version has the following limitations:

1. **Limited User Experience**: While the dialog has basic search and filtering, it could be more intuitive and responsive
2. **No Default Quantity Setting**: Users cannot set initial quantities when adding products, requiring manual entry after addition
3. **Table Refresh Delay**: After adding products, the Handsontable table may not immediately reflect the changes
4. **Batch Operation Feedback**: Limited visual feedback during batch product addition operations

## Proposed Solution
Enhance the existing `ProductAddDialog.vue` component and integrate it seamlessly with the Handsontable-based `CommodityTable.vue` component to provide:

1. **Improved Product Selection Dialog**:
   - Enhanced search with debouncing for better performance
   - Multi-level filtering (brand, category, product attributes)
   - Pagination with configurable page sizes
   - Visual feedback for already-added products
   - Bulk selection with "Select All" functionality

2. **Default Quantity Configuration**:
   - Allow users to set default quantities for selected products
   - Support per-month quantity configuration
   - Quick quantity templates (e.g., "Same for all months", "Progressive increase")

3. **Immediate Table Refresh**:
   - Automatically refresh Handsontable data after successful product addition
   - Highlight newly added rows in the table
   - Scroll to newly added products for visibility

4. **Enhanced Batch Operations**:
   - Progress indicator for batch additions
   - Detailed success/failure reporting
   - Rollback capability for failed operations

## Affected Components

### Frontend (Vue 3 SPA)
- `frontend/src/components/store-detail/dialogs/ProductAddDialog.vue` - Main dialog component (enhance existing)
- `frontend/src/components/store-detail/CommodityTable.vue` - Handsontable wrapper (add refresh methods)
- `frontend/src/composables/useStoreDetail.js` - Data management composable (add refresh logic)
- `frontend/src/composables/useHandsontable.js` - Handsontable integration (add data update methods)

### Backend (Python)
- `product_sales_planning/planning_system/page/store_detail/store_detail.py` - API endpoints (enhance response format)
- `product_sales_planning/services/commodity_service.py` - Business logic (add batch insert with quantities)

## Benefits
1. **Improved User Experience**: Faster and more intuitive product addition workflow
2. **Reduced Manual Work**: Default quantities eliminate repetitive data entry
3. **Better Visibility**: Immediate table updates and highlighting show results instantly
4. **Increased Efficiency**: Batch operations with progress tracking save time
5. **Error Prevention**: Visual feedback prevents duplicate additions

## Risks and Mitigation
1. **Risk**: Handsontable performance degradation with large datasets
   - **Mitigation**: Use pagination and virtual scrolling in Handsontable

2. **Risk**: Race conditions during concurrent product additions
   - **Mitigation**: Implement optimistic locking and conflict detection

3. **Risk**: Browser memory issues with large batch operations
   - **Mitigation**: Chunk large batch operations into smaller batches

## Dependencies
- Existing Handsontable integration (`useHandsontable.js`)
- Existing backend API (`bulk_insert_commodity_schedule`)
- frappe-ui components (Button, Input, Dropdown, etc.)
- Vue 3 Composition API

## Implementation Approach
1. Enhance `ProductAddDialog.vue` with improved UI/UX
2. Add default quantity configuration interface
3. Implement immediate Handsontable refresh mechanism
4. Add visual feedback for newly added products
5. Enhance backend API to support default quantities
6. Add comprehensive error handling and user feedback

## Success Criteria
1. Users can search and filter products efficiently
2. Users can set default quantities before adding products
3. Handsontable table refreshes immediately after product addition
4. Newly added products are highlighted in the table
5. Batch operations provide clear progress and result feedback
6. No performance degradation with up to 1000 products

## Timeline Estimate
- Design and specification: 1 day
- Frontend implementation: 2-3 days
- Backend enhancements: 1 day
- Testing and refinement: 1-2 days
- **Total**: 5-7 days

## Related Changes
- None (standalone enhancement)

## Open Questions
1. Should we support importing products from Excel during the add dialog?
2. Should we allow editing quantities directly in the add dialog before confirmation?
3. Should we persist user's filter preferences across sessions?

## Approval Required From
- Product Owner
- Frontend Lead
- Backend Lead
