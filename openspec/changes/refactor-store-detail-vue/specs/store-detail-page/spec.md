# Specification: Store Detail Page (Vue)

## ADDED Requirements

### Requirement: Server-Side Pagination
The store detail page SHALL implement server-side pagination to efficiently handle large datasets (1000+ products).

#### Scenario: Initial page load
- **WHEN** user navigates to store detail page with store and task selected
- **THEN** system SHALL fetch first page of data (default 20 items)
- **AND** display pagination controls showing current page, total pages, and total records

#### Scenario: Page navigation
- **WHEN** user clicks next/previous/first/last page button
- **THEN** system SHALL fetch corresponding page data from server
- **AND** update table display with new page data
- **AND** update pagination controls to reflect current page

#### Scenario: Page size change
- **WHEN** user selects different page size (20/50/100/200)
- **THEN** system SHALL fetch first page with new page size
- **AND** reset current page to 1
- **AND** update pagination controls

#### Scenario: Direct page navigation
- **WHEN** user enters page number and clicks goto button
- **THEN** system SHALL validate page number is within valid range
- **AND** fetch specified page data
- **AND** update table and pagination controls

### Requirement: Product Import from Excel
The store detail page SHALL support importing commodity schedules from Excel files.

#### Scenario: Download import template
- **WHEN** user clicks "下载导入模板" button in import dialog
- **THEN** system SHALL generate Excel template with:
  - Header row: 产品编码, 产品名称, [month columns]
  - Example data rows
  - Instructions sheet
- **AND** download template file to user's device

#### Scenario: Successful import
- **WHEN** user uploads valid Excel file with commodity data
- **THEN** system SHALL:
  - Parse Excel file and extract product codes and quantities
  - Validate product codes exist in system
  - Create or update commodity schedule records
  - Return success count and any errors
- **AND** display import results to user
- **AND** refresh table data

#### Scenario: Import with errors
- **WHEN** user uploads Excel file with invalid data
- **THEN** system SHALL:
  - Process valid rows successfully
  - Collect error messages for invalid rows
  - Return partial success with error details
- **AND** display both success count and error list to user

#### Scenario: Import validation failure
- **WHEN** user uploads file without required store/task selection
- **THEN** system SHALL display error message "请先选择店铺和计划任务"
- **AND** prevent import operation

### Requirement: Product Addition
The store detail page SHALL support adding individual products to commodity schedule.

#### Scenario: Open product selection dialog
- **WHEN** user clicks "添加商品" button
- **AND** store is selected
- **THEN** system SHALL display multi-select product dialog
- **AND** load product list with search and filter options

#### Scenario: Add selected products
- **WHEN** user selects one or more products and confirms
- **THEN** system SHALL:
  - Call bulk_insert_commodity_schedule API
  - Create commodity schedule records for selected products
  - Return success count
- **AND** display success message
- **AND** refresh table data

#### Scenario: Add products without store selection
- **WHEN** user clicks "添加商品" button without selecting store
- **THEN** system SHALL display error message "请先选择店铺"
- **AND** prevent dialog from opening

#### Scenario: Skip duplicate products
- **WHEN** user adds products that already exist in schedule
- **THEN** system SHALL skip duplicate products
- **AND** report skipped count in success message

### Requirement: Mechanism Import and Application
The store detail page SHALL support importing and applying product mechanisms.

#### Scenario: Download mechanism template
- **WHEN** user clicks "下载机制模板" button in mechanism import dialog
- **THEN** system SHALL generate Excel template for mechanism import
- **AND** download template file to user's device

#### Scenario: Import mechanism data
- **WHEN** user uploads valid mechanism Excel file
- **THEN** system SHALL:
  - Parse mechanism quantities
  - Expand mechanisms to individual products
  - Create commodity schedule records
  - Return success count
- **AND** display import results
- **AND** refresh table data

#### Scenario: Apply mechanisms directly
- **WHEN** user clicks "应用机制" button and selects mechanisms
- **THEN** system SHALL:
  - Load selected mechanism definitions
  - Add all products from mechanisms to schedule
  - Use default quantities from mechanism
  - Skip existing products
- **AND** display success and skipped counts
- **AND** refresh table data

### Requirement: Batch Delete Operations
The store detail page SHALL support batch deletion of commodity schedule records.

#### Scenario: Select rows for deletion
- **WHEN** user checks checkboxes for one or more table rows
- **THEN** system SHALL:
  - Track selected row codes
  - Display "批量删除" button with selection count
  - Enable batch delete button

#### Scenario: Batch delete confirmation
- **WHEN** user clicks "批量删除" button
- **THEN** system SHALL display confirmation dialog
- **AND** show count of items to be deleted

#### Scenario: Execute batch delete
- **WHEN** user confirms batch delete
- **THEN** system SHALL:
  - Call batch_delete_by_codes API with selected codes
  - Delete all records matching selected codes for current store/task
  - Return deleted count
- **AND** display success message
- **AND** clear selection
- **AND** hide batch delete button
- **AND** refresh table data

#### Scenario: Batch delete with no selection
- **WHEN** no rows are selected
- **THEN** system SHALL hide "批量删除" button

### Requirement: Data Export to Excel
The store detail page SHALL support exporting commodity schedule data to Excel.

#### Scenario: Export current data
- **WHEN** user clicks "导出Excel" button
- **THEN** system SHALL:
  - Export all commodity data for current store/task
  - Include all months and product details
  - Generate Excel file with formatted headers
  - Return file URL
- **AND** download Excel file to user's device
- **AND** display success message with record count

#### Scenario: Export with filters
- **WHEN** user has applied brand/category filters and clicks export
- **THEN** system SHALL export only filtered data
- **AND** include filter criteria in filename

#### Scenario: Export with no data
- **WHEN** user clicks export with no data loaded
- **THEN** system SHALL display error message "没有数据可导出"

### Requirement: Approval Workflow UI
The store detail page SHALL display approval status and provide approval workflow actions.

#### Scenario: Display approval status
- **WHEN** store and task are selected with approval workflow
- **THEN** system SHALL:
  - Display approval status panel
  - Show current approval status (未开始/待审批/已通过/已驳回)
  - Show current approval step if in progress
  - Show rejection reason if rejected
- **AND** apply appropriate alert styling (info/warning/success/danger)

#### Scenario: Submit for approval
- **WHEN** user clicks "提交审批" button in draft state
- **THEN** system SHALL:
  - Display comment dialog
  - Submit approval request with optional comment
  - Update approval status to "待审批"
- **AND** refresh approval status display
- **AND** lock table for editing
- **AND** hide operation buttons

#### Scenario: Withdraw approval
- **WHEN** user clicks "撤回" button while approval is pending
- **AND** user is the submitter
- **THEN** system SHALL:
  - Display confirmation dialog
  - Withdraw approval request
  - Reset status to "未开始"
- **AND** refresh approval status display
- **AND** unlock table for editing
- **AND** show operation buttons

#### Scenario: Approve task
- **WHEN** user clicks "通过" button
- **AND** user is current approver
- **THEN** system SHALL:
  - Display comment dialog
  - Approve current step
  - Advance to next step or mark as approved
- **AND** refresh approval status display

#### Scenario: Reject to previous step
- **WHEN** user clicks "退回上一级" button
- **AND** user is current approver
- **THEN** system SHALL:
  - Display reason dialog (required)
  - Reject to previous approval step
  - Update status to "已驳回"
- **AND** refresh approval status display

#### Scenario: Reject to submitter
- **WHEN** user clicks "退回提交人" button
- **AND** user is current approver
- **THEN** system SHALL:
  - Display reason dialog (required)
  - Reject to first step (submitter)
  - Update status to "已驳回"
- **AND** refresh approval status display
- **AND** unlock table for editing

#### Scenario: View approval history
- **WHEN** user clicks "审批历史" button
- **THEN** system SHALL:
  - Display approval history dialog
  - Show timeline of all approval actions
  - Include action type, approver, timestamp, and comments
- **AND** format timeline with appropriate styling

#### Scenario: Button visibility based on state
- **WHEN** approval status changes
- **THEN** system SHALL show/hide buttons based on:
  - Draft state: Show "提交审批"
  - Pending state (submitter): Show "撤回"
  - Pending state (approver): Show "通过", "退回上一级", "退回提交人"
  - Rejected state: Show "提交审批"
  - Approved state: Hide all approval buttons

#### Scenario: Lock editing during approval
- **WHEN** approval status is "待审批" or "已通过"
- **THEN** system SHALL:
  - Set all month columns to readOnly in Handsontable
  - Hide operation buttons (添加/导入/删除)
  - Prevent data modifications

#### Scenario: No approval workflow
- **WHEN** store/task has no approval workflow configured
- **THEN** system SHALL:
  - Hide approval status panel
  - Show all operation buttons
  - Allow unrestricted editing

### Requirement: Column Visibility Settings
The store detail page SHALL allow users to show/hide table columns.

#### Scenario: Open column settings
- **WHEN** user clicks "管理列" button
- **THEN** system SHALL:
  - Display column settings panel
  - Show checkbox list of all columns
  - Indicate current visibility state for each column

#### Scenario: Toggle column visibility
- **WHEN** user checks/unchecks column checkbox
- **THEN** system SHALL:
  - Show/hide corresponding column in table
  - Update Handsontable hiddenColumns configuration
  - Re-render table

#### Scenario: Select all columns
- **WHEN** user clicks "全选/取消全选" checkbox
- **THEN** system SHALL:
  - Check/uncheck all column checkboxes
  - Show/hide all columns accordingly
  - Update table display

#### Scenario: Persist column settings
- **WHEN** user changes column visibility
- **THEN** system SHALL save settings to localStorage
- **AND** restore settings on next page load

### Requirement: Action Toolbar
The store detail page SHALL provide an action toolbar with context-aware operation buttons.

#### Scenario: Display toolbar buttons
- **WHEN** page loads
- **THEN** system SHALL display action toolbar with buttons:
  - 返回 (always visible)
  - 刷新 (always visible)
  - 批量删除 (conditional)
  - 单品导入 (conditional)
  - 机制导入 (conditional)
  - 添加商品 (conditional)
  - 应用机制 (conditional)
  - 导出Excel (always visible)
  - 管理列 (always visible)
  - Approval buttons (conditional)

#### Scenario: Button visibility without store/task
- **WHEN** no store or task is selected
- **THEN** system SHALL:
  - Show 返回, 刷新 buttons
  - Hide all operation buttons
  - Hide approval buttons

#### Scenario: Button visibility in editable state
- **WHEN** store/task selected and can edit (no approval or rejected)
- **THEN** system SHALL:
  - Show all operation buttons
  - Show "提交审批" if workflow exists
  - Hide other approval buttons

#### Scenario: Button visibility during approval
- **WHEN** approval is pending
- **THEN** system SHALL:
  - Hide all operation buttons
  - Show approval buttons based on user role
  - Show "审批历史" button

#### Scenario: Button loading states
- **WHEN** user clicks any operation button
- **THEN** system SHALL:
  - Disable button during operation
  - Show loading indicator
  - Re-enable button after operation completes

### Requirement: Error Handling and User Feedback
The store detail page SHALL provide clear error messages and operation feedback.

#### Scenario: API error handling
- **WHEN** any API call fails
- **THEN** system SHALL:
  - Display error message to user
  - Log error details to console
  - Maintain page state (no data loss)
  - Allow user to retry operation

#### Scenario: Success feedback
- **WHEN** operation completes successfully
- **THEN** system SHALL:
  - Display success toast message
  - Include operation details (e.g., "成功导入 50 条记录")
  - Auto-dismiss after 3 seconds

#### Scenario: Validation errors
- **WHEN** user attempts invalid operation
- **THEN** system SHALL:
  - Display validation error message
  - Prevent operation from executing
  - Highlight invalid fields if applicable

#### Scenario: Loading states
- **WHEN** data is being fetched or operation is in progress
- **THEN** system SHALL:
  - Display loading indicator
  - Disable interactive elements
  - Show operation description (e.g., "正在导入数据...")

### Requirement: Responsive Layout
The store detail page SHALL adapt to different screen sizes.

#### Scenario: Desktop layout
- **WHEN** page is viewed on desktop (>1024px width)
- **THEN** system SHALL:
  - Display full action toolbar with all buttons
  - Show table with all columns visible
  - Use horizontal layout for filters

#### Scenario: Tablet layout
- **WHEN** page is viewed on tablet (768px-1024px width)
- **THEN** system SHALL:
  - Wrap action toolbar buttons to multiple rows
  - Enable horizontal scrolling for table
  - Stack filter fields vertically

#### Scenario: Mobile layout
- **WHEN** page is viewed on mobile (<768px width)
- **THEN** system SHALL:
  - Show compact action toolbar with dropdown menu
  - Enable horizontal scrolling for table
  - Stack all elements vertically
  - Increase touch target sizes

### Requirement: Performance Optimization
The store detail page SHALL maintain good performance with large datasets.

#### Scenario: Large dataset handling
- **WHEN** commodity schedule has 1000+ products
- **THEN** system SHALL:
  - Use server-side pagination (max 200 items per page)
  - Load data incrementally
  - Maintain responsive UI (<100ms interaction latency)

#### Scenario: Table rendering optimization
- **WHEN** table is displayed
- **THEN** system SHALL:
  - Use Handsontable's renderAllRows: false
  - Use fixed table height
  - Enable column virtualization
  - Debounce cell edit events

#### Scenario: Memory management
- **WHEN** user navigates between pages
- **THEN** system SHALL:
  - Unmount dialogs when closed (v-if)
  - Clear unused data from memory
  - Avoid memory leaks in event listeners

## MODIFIED Requirements

None - This is a new capability.

## REMOVED Requirements

None - This is a new capability.

## RENAMED Requirements

None - This is a new capability.
