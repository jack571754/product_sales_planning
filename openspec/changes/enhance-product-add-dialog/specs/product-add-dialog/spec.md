# Spec: Product Add Dialog Enhancement

## Capability
Enhanced product addition dialog with improved UX, default quantity configuration, and immediate Handsontable table refresh.

## ADDED Requirements

### Requirement: Enhanced Product Search and Filtering

The product add dialog MUST provide advanced search and filtering capabilities to help users efficiently find products from large catalogs (1000+ products). The search MUST support debouncing, multi-criteria filtering (brand, category), and visual indicators for already-added products.

**Priority**: High
**Rationale**: Users need efficient ways to find products from large catalogs (1000+ products). Current search is basic and lacks advanced filtering capabilities.

#### Scenario: User searches for products by name or code
**Given** the product add dialog is open
**And** there are 1000+ products in the system
**When** the user types "iPhone" in the search box
**Then** the search should debounce for 300ms
**And** display only products matching "iPhone" in name or code
**And** show a loading indicator during search
**And** display the result count (e.g., "Found 15 products")

#### Scenario: User filters products by brand and category
**Given** the product add dialog is open
**When** the user selects "Apple" from the brand filter
**And** selects "Electronics" from the category filter
**Then** only products matching both filters should be displayed
**And** the result count should update
**And** a "Clear All Filters" button should be visible

#### Scenario: User sees already-added products
**Given** the product add dialog is open
**And** some products are already added to the current task
**When** the dialog loads the product list
**Then** already-added products should be visually marked
**And** their checkboxes should be disabled
**And** a badge should indicate "Already Added"

---

### Requirement: Pagination with Configurable Page Size

The product list MUST support pagination with configurable page sizes (20, 50, 100, 200) and provide navigation controls including "Jump to Page" functionality to handle large product catalogs efficiently.

**Priority**: High
**Rationale**: Large product lists need pagination to maintain performance and usability.

#### Scenario: User navigates through paginated product list
**Given** there are 500 products matching the current filters
**And** the page size is set to 20
**When** the user clicks "Next Page"
**Then** products 21-40 should be displayed
**And** the page indicator should show "Page 2 of 25"
**And** the "Previous Page" button should be enabled

#### Scenario: User changes page size
**Given** the user is viewing page 2 with page size 20
**When** the user changes page size to 50
**Then** the view should reset to page 1
**And** display products 1-50
**And** the page indicator should update to "Page 1 of 10"

#### Scenario: User jumps to specific page
**Given** there are 25 pages of products
**When** the user enters "15" in the "Jump to Page" input
**And** clicks the "Go" button
**Then** page 15 should be displayed
**And** the page indicator should show "Page 15 of 25"

---

### Requirement: Default Quantity Configuration

The product add dialog MUST allow users to set default quantities for selected products before adding them to the plan. The system MUST support quantity templates including "Same for all months", "Progressive increase", and "Custom per month" with input validation for positive integers only.

**Priority**: High
**Rationale**: Users should be able to set initial quantities when adding products to avoid manual entry after addition.

#### Scenario: User sets same quantity for all months
**Given** the user has selected 5 products
**And** the task has 4 months (2025-01, 2025-02, 2025-03, 2025-04)
**When** the user selects "Same for all months" template
**And** enters quantity "100"
**And** clicks "Apply to All Selected"
**Then** all 5 products should have quantity 100 for all 4 months
**And** a preview should show "5 products × 4 months = 20 records"

#### Scenario: User sets progressive increase quantities
**Given** the user has selected 3 products
**And** the task has 3 months
**When** the user selects "Progressive increase" template
**And** enters start quantity "50" and increment "10"
**Then** month 1 should have quantity 50
**And** month 2 should have quantity 60
**And** month 3 should have quantity 70
**And** the preview should reflect these values

#### Scenario: User sets custom quantity per month
**Given** the user has selected 2 products
**And** the task has 4 months
**When** the user selects "Custom per month" template  **And** enters different quantities for each month (100, 150, 200, 250)
**Then** each product should have the specified quantities for each month
**And** the preview should show the custom distribution

#### Scenario: User validates quantity input
**Given** the user is setting default quantities
**When** the user enters a negative number "-10"
**Then** an error message should display "Quantity must be a positive integer"
**And** the "Add" button should be disabled
**When** the user enters a decimal "10.5"
**Then** an error message should display "Quantity must be a whole number"

---

### Requirement: Batch Product Selection

The product add dialog MUST support batch selection operations including "Select All on This Page", "Select All (filtered products)", and "Deselect All" with a visible selected count badge to enable efficient multi-product addition.

**Priority**: Medium
**Rationale**: Users need to add multiple products efficiently without selecting them one by one.

#### Scenario: User selects all products on current page
**Given** the current page displays 20 products
**When** the user clicks "Select All on This Page"
**Then** all 20 products should be selected
**And** the selected count badge should show "20 selected"
**And** all checkboxes should be checked

#### Scenario: User selects all filtered products across all pages
**Given** there are 150 products matching current filters across 8 pages
**When** the user clicks "Select All (150 products)"
**Then** all 150 products should be selected
**And** the selected count badge should show "150 selected"
**And** a confirmation message should display "All 150 filtered products selected"

#### Scenario: User deselects all products
**Given** 50 products are currently selected
**When** the user clicks "Deselect All"
**Then** all selections should be cleared
**And** the selected count badge should show "0 selected"
**And** all checkboxes should be unchecked

---

### Requirement: Immediate Handsontable Table Refresh

The Handsontable table MUST refresh immediately (within 500ms) after successful product addition, maintaining scroll position and active filters. The system MUST implement optimistic UI updates with rollback capability on API failures.

**Priority**: High
**Rationale**: Users need immediate visual feedback when products are added to see the results in the table.

#### Scenario: Table refreshes immediately after successful addition
**Given** the user has added 10 products with default quantities
**When** the API call succeeds
**Then** the Handsontable table should refresh within 500ms
**And** the 10 new products should appear in the table
**And** the table should maintain its current scroll position
**And** the table should maintain any active filters or sorts

#### Scenario: Optimistic UI update before API response
**Given** the user clicks "Add (10 products)"
**When** the API call is initiated
**Then** the 10 products should be immediately added to the table with a "pending" indicator
**And** the dialog should close
**When** the API call succeeds
**Then** the "pending" indicators should be removed
**And** the products should show their actual data

#### Scenario: Rollback on API failure
**Given** the user has added 10 products optimistically
**And** the API call fails with error "Network timeout"
**Then** the 10 products should be removed from the table
**And** an error message should display "Failed to add products: Network timeout"
**And** the dialog should reopen with the previous selections intact

---

### Requirement: Visual Highlighting for Newly Added Products

Newly added products MUST be visually highlighted in the Handsontable table with a green background that fades out over 5 seconds. The table MUST auto-scroll to the first newly added product with smooth animation.

**Priority**: Medium
**Rationale**: Users need clear visual feedback to identify which products were just added.

#### Scenario: Newly added rows are highlighted
**Given** the user has just added 5 products
**When** the table refreshes
**Then** the 5 new rows should have a green highlight background
**And** the highlight should fade out over 5 seconds
**And** the highlight should use CSS class "newly-added-row"

#### Scenario: Auto-scroll to first newly added product
**Given** the user has added products that are not in the current viewport
**When** the table refreshes
**Then** the table should scroll to the first newly added product
**And** the scroll should be smooth (animated)
**And** the newly added product should be centered in the viewport

#### Scenario: Highlight works with pagination
**Given** the table is paginated with 20 rows per page
**And** the user adds 5 products that appear on page 3
**When** the table refreshes
**Then** the table should navigate to page 3
**And** the 5 new rows should be highlighted
**And** the page indicator should show "Page 3"

---

### Requirement: Batch Operation Progress and Feedback

Batch product addition operations MUST display a progress modal with real-time percentage updates and detailed result reporting including success/failure breakdown with error reasons and a "Retry Failed" option.

**Priority**: Medium
**Rationale**: Users need clear feedback during long-running batch operations to understand progress and results.

#### Scenario: Progress bar during batch addition
**Given** the user is adding 100 products
**When** the batch operation starts
**Then** a progress modal should display
**And** show a progress bar with percentage (0-100%)
**And** show current status "Adding products: 25/100"
**And** update in real-time as products are added

#### Scenario: Detailed result modal after completion
**Given** the user has added 100 products
**And** 95 succeeded, 5 failed
**When** the operation completes
**Then** a result modal should display
**And** show "Successfully added 95 products"
**And** show "Failed to add 5 products"
**And** list the 5 failed products with error reasons
**And** provide a "Retry Failed" button

#### Scenario: Cancellation of batch operation
**Given** a batch operation is in progress (50/100 completed)
**When** the user clicks "Cancel"
**Then** the operation should stop immediately
**And** a confirmation should display "50 products added, 50 cancelled"
**And** the 50 added products should remain in the table
**And** the 50 cancelled products should not be added

---

### Requirement: Performance Optimization for Large Datasets

The system MUST handle large product catalogs (5000+ products) and large tables (1000+ rows) without performance degradation. Dialog load time MUST be under 1 second, table refresh under 500ms, and memory usage under 100MB with smooth 60fps scrolling.

**Priority**: High
**Rationale**: The system must handle large product catalogs (1000+ products) and large tables (1000+ rows) without performance degradation.

#### Scenario: Dialog loads quickly with large product catalog
**Given** there are 5000 products in the system
**When** the user opens the product add dialog
**Then** the dialog should load within 1 second
**And** display the first page of products (20 items)
**And** show a loading skeleton during initial load

#### Scenario: Table refreshes efficiently with large dataset
**Given** the table contains 1000 rows
**When** the user adds 50 new products
**Then** the table should refresh within 500ms
**And** use virtual scrolling to render only visible rows
**And** maintain smooth scrolling performance (60fps)

#### Scenario: Memory usage stays within limits
**Given** the user has added 1000 products to the table
**When** monitoring browser memory usage
**Then** total memory usage should not exceed 100MB
**And** no memory leaks should occur after multiple add operations
**And** garbage collection should reclaim unused memory

---

## MODIFIED Requirements

### Requirement: Product List API Response Format

The Product List API response MUST include additional metadata fields (is_added, thumbnail_url, stock_status) and pagination metadata (total_count, page, page_size) to support the enhanced dialog functionality.

**Priority**: Medium
**Rationale**: The API response needs to include additional metadata for the enhanced dialog.

#### Scenario: API returns product list with metadata
**Given** a request to `frappe.client.get_list` for Product List
**When** the API responds
**Then** each product should include:
- `name` (product ID)
- `commodity_code` (product code)
- `commodity_name` (product name)
- `brand` (brand name)
- `category` (category name)
- `is_added` (boolean indicating if already added to current task)
- `thumbnail_url` (optional product image URL)
- `stock_status` (optional: "In Stock", "Low Stock", "Out of Stock")

**And** the response should include pagination metadata:
- `total_count` (total number of products)
- `page` (current page number)
- `page_size` (items per page)

---

### Requirement: Bulk Insert API Enhancement

The bulk_insert_commodity_schedule API MUST accept a default_quantities parameter (JSON object mapping months to quantities) and return detailed results including inserted record IDs, success/failure counts, and error details for partial failures.

**Priority**: High
**Rationale**: The bulk insert API needs to support default quantities and return detailed results.

#### Scenario: API accepts default quantities parameter
**Given** a request to `bulk_insert_commodity_schedule`
**When** the request includes `default_quantities` parameter:
```json
{
  "store_id": "STORE-001",
  "task_id": "TASK-001",
  "product_codes": ["PROD-001", "PROD-002"],
  "default_quantities": {
    "2025-01": 100,
    "2025-02": 150,
    "2025-03": 200
  }
}
```
**Then** the API should create records with the specified quantities
**And** return detailed response:
```json
{
  "status": "success",
  "inserted_count": 2,
  "skipped_count": 0,
  "failed_count": 0,
  "inserted_records": [
    {"name": "CS-001", "code": "PROD-001", "quantity": 100, "month": "2025-01"},
    {"name": "CS-002", "code": "PROD-001", "quantity": 150, "month": "2025-02"},
    ...
  ],
  "errors": []
}
```

#### Scenario: API handles partial failures gracefully
**Given** a request to add 10 products
**And** 2 products fail validation (invalid product codes)
**When** the API processes the request
**Then** 8 products should be inserted successfully
**And** 2 products should fail with detailed error messages
**And** the response should include:
```json
{
  "status": "partial_success",
  "inserted_count": 8,
  "failed_count": 2,
  "errors": [
    {"code": "PROD-999", "error": "Product not found"},
    {"code": "PROD-888", "error": "Product is inactive"}
  ]
}
```
**And** the database transaction should commit the 8 successful insertions

---

## REMOVED Requirements

None. This is a new feature enhancement with no removed requirements.

---

## Non-Functional Requirements

### Performance
- Dialog load time: < 1 second
- Search debounce delay: 300ms
- Table refresh time: < 500ms
- Batch insertion (100 products): < 5 seconds
- Memory usage: < 100MB
- Scroll performance: 60fps

### Usability
- All actions should provide immediate visual feedback
- Error messages should be clear and actionable
- Loading states should be shown for all async operations
- Keyboard shortcuts should be supported (Enter to confirm, Esc to cancel)

### Accessibility
- All interactive elements should be keyboard accessible
- ARIA labels should be provided for screen readers
- Color contrast should meet WCAG AA standards
- Focus indicators should be clearly visible

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Security
- All API calls should include CSRF token
- Input validation should prevent XSS attacks
- SQL injection prevention in backend queries

---

## Technical Constraints

1. **Handsontable License**: Must use non-commercial license key
2. **Vue 3 Composition API**: All components must use `<script setup>` syntax
3. **frappe-ui Components**: Prefer frappe-ui components over custom implementations
4. **Tab Indentation**: All code must use Tab indentation (Frappe standard)
5. **No External Dependencies**: Cannot add new npm packages without approval

---

## Testing Requirements

### Unit Tests
- ProductAddDialog component methods
- Quantity validation logic
- Filter and search logic
- Handsontable refresh methods

### Integration Tests
- End-to-end product addition flow
- API integration with backend
- Table refresh after addition
- Error handling scenarios

### Performance Tests
- Load time with 5000 products
- Table refresh with 1000 rows
- Memory usage monitoring
- Scroll performance testing

### User Acceptance Tests
- Product owner approval
- Real user workflow testing
- Feedback collection and incorporation

---

## Documentation Requirements

1. **User Guide**: How to use the enhanced product add dialog
2. **Developer Guide**: How to extend or modify the dialog
3. **API Documentation**: Updated API endpoint documentation
4. **Code Comments**: Inline comments for complex logic
5. **Changelog**: Document all changes in CHANGELOG.md
