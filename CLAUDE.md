# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Frappe Framework** application for product sales planning. It manages stores, products, schedules, and commodity planning through a custom Frappe app with Vue.js frontend components.

**App Name**: `product_sales_planning`
**Module**: `planning system`
**Framework**: Frappe Framework (v15+)
**Frontend**: Frappe's Page system + Vue.js + VTable (for data grids)

## Development Commands

### Installation and Setup

```bash
# From the bench directory (typically /home/amininstors/frappe-bench)
cd /home/amininstors/frappe-bench
bench get-app /path/to/product_sales_planning --branch develop
bench install-app product_sales_planning

# Reinstall app (useful after major changes)
bench --site site1.local uninstall-app product_sales_planning --yes --force
bench --site site1.local install-app product_sales_planning
```

### Running the Application

```bash
# Start all services (from bench directory)
bench start

# Or run specific services
bench serve --port 8000  # Web server only
bench watch              # Asset watcher for JS/CSS changes
```

### Database and Cache Management

```bash
# Run migrations after DocType changes
bench migrate

# Clear cache after code changes (do this frequently during development)
bench clear-cache

# Restart bench processes
bench restart
```

### Testing

```bash
# Run all tests for this app
bench run-tests --app product_sales_planning

# Run specific test module
bench run-tests --app product_sales_planning --module product_sales_planning.planning_system.doctype.product_list.test_product_list

# Run specific test method
bench execute product_sales_planning.test_save_data.test_update_month_quantity
bench --site site1.local execute test_save_data.test_update_month_quantity
```

### Code Quality

This project uses pre-commit hooks with ruff, eslint, prettier, and pyupgrade.

```bash
# Install pre-commit hooks (one-time setup)
cd apps/product_sales_planning
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

## Architecture

### Core DocTypes

The application is built around these main DocTypes:

1. **Product List** - Master list of products with fields: `name1` (product name), `specifications`, `brand`, `category`
2. **Store List** - Store master with `shop_name` field
3. **Schedule Tasks** - Planning tasks/periods
4. **Commodity Schedule** - The main transactional DocType linking stores, products, and tasks with planned quantities
   - Fields: `store_id`, `task_id`, `code` (product code), `quantity`, `sub_date`
5. **Product Mechanism** - Predefined product bundles/templates
   - Child table: `Product Mechanism Item` with `name1` (product link) and `quantity`
   - Auto-generates `content_summary` field on save (e.g., "Product A x2，Product B x5")

### Page Architecture

The app uses Frappe's **Page** system (not standard web pages):

- **demo_page** - Dashboard/listing page
- **store_detail** - Main planning interface with VTable grid
  - Route pattern: `/app/store-detail/{store_id}/{task_id}`
  - Uses programmatic route synchronization to prevent infinite loops
  - Implements VTable with inline editing for quantity fields

### API Layer

All whitelisted API methods **must** be registered in `hooks.py` under the `api_methods` list. This is critical for external API access.

**Key API endpoints in `store_detail.py`:**
- `get_store_commodity_data` - Fetch planning data with filters, pagination, and view modes
- `bulk_insert_commodity_schedule` - Batch add products to schedule
- `batch_update_quantity` - Bulk update quantities
- `batch_delete_items` - Bulk delete records by IDs
- `batch_delete_by_codes` - Bulk delete records by product codes
- `apply_mechanisms` - Apply product mechanism templates
- `get_filter_options` - Get dropdown options for filters
- `import_commodity_data` - Import data from Excel files
- `download_import_template` - Download Excel template
- `update_month_quantity` - Update quantity for specific product/month (multi-month view)

### Frontend Integration

**JavaScript Architecture:**
- Pages use Frappe's page lifecycle: `on_page_load` (once) and `on_page_show` (every route change)
- VTable library loaded from `/assets/product_sales_planning/js/lib/`
- Element Plus CSS loaded for UI components
- Custom `StorePlanningManager` class handles state and API calls

**Route Handling Pattern:**
```javascript
// Prevent infinite loops with programmatic updates
this.is_programmatic_update = true;
await this.filter_group.set_value('store_id', storeId);
this.is_programmatic_update = false;
```

**Key Files:**
- `product_sales_planning/planning_system/page/store_detail/store_detail.js` - Frontend logic
- `product_sales_planning/planning_system/page/store_detail/store_detail.py` - Backend API

### Static Assets

- `/product_sales_planning/public/js/lib/` - Third-party libraries (VTable, Element Plus)
- `/product_sales_planning/public/vue-test/` - Standalone Vue test app (not integrated with Frappe)

## Important Patterns

### Frappe API Calls

Always use `@frappe.whitelist()` decorator for API methods and register them in `hooks.py`:

```python
@frappe.whitelist()
def my_api_method(param1, param2):
    # Handle JSON string parameters
    if isinstance(param1, str):
        param1 = json.loads(param1)

    # Use transactions
    try:
        # ... operations ...
        frappe.db.commit()
        return {"status": "success"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="Error Title", message=str(e))
        return {"status": "error", "msg": str(e)}
```

### DocType Controllers

Override lifecycle methods in DocType classes:

```python
class MyDocType(Document):
    def before_save(self):
        # Runs before saving
        pass

    def validate(self):
        # Validation logic
        pass
```

### Frontend-Backend Communication

```javascript
frappe.call({
    method: "product_sales_planning.module.page.my_page.my_method",
    args: { param1: value1 },
    freeze: true,
    freeze_message: "Loading...",
    callback: (r) => {
        if (r.message && r.message.status === "success") {
            // Handle success
        }
    },
    error: (err) => {
        frappe.msgprint("Error occurred");
    }
});
```

### Route Management in Pages

When working with Frappe pages that use URL parameters:
1. Use `frappe.set_route()` to update URL
2. Implement `on_page_show` to handle route changes
3. Use locking flags to prevent `set_value` → `change` → `set_route` loops
4. Pass parameters directly to data fetch functions instead of relying on UI state

## Code Style

### Python
- Use **tabs** for indentation (configured in ruff, not spaces)
- Line length: 110 characters
- Follow Frappe naming conventions: `snake_case` for functions/variables
- DocType names: Title Case with spaces (e.g., "Product List")
- Field names in DocTypes: `snake_case` (e.g., `store_id`, `task_id`, `sub_date`)
- Ruff configuration in `pyproject.toml` with specific ignores for Frappe patterns

### JavaScript
- Use ES6+ syntax
- Frappe's jQuery is available as `$` and `frappe.$`
- Use `frappe.call()` for API requests, not raw fetch/axios
- Class-based organization for complex page logic
- Prettier and ESLint configured via `.pre-commit-config.yaml`
- Exclude third-party libraries in `public/js/lib/` from linting

## Common Tasks

### Adding a New DocType

1. Create via Frappe UI or use `bench new-doctype`
2. Add fields through DocType customization
3. Create controller file: `product_sales_planning/planning_system/doctype/my_doctype/my_doctype.py`
4. Implement business logic in controller class
5. Run `bench migrate`

### Adding a New Page

1. Create via Frappe UI: Desk → Page → New
2. Files created in: `product_sales_planning/planning_system/page/my_page/`
3. Implement `on_page_load` in `.js` file
4. Add backend methods in `.py` file with `@frappe.whitelist()`
5. Register API methods in `hooks.py` if needed

### Adding a New API Endpoint

1. Add method to appropriate `.py` file with `@frappe.whitelist()` decorator
2. Register in `hooks.py` under `api_methods` list (if needed for external access)
3. Handle JSON string parameters (Frappe may pass objects as JSON strings)
4. Always use try/except with `frappe.db.commit()` and `frappe.db.rollback()`

### Debugging

```bash
# View logs
bench watch  # Shows real-time logs

# Python debugging
# Add breakpoint in code:
import pdb; pdb.set_trace()

# Check error logs in Frappe UI
# Desk → Error Log

# Clear cache when things don't update
bench clear-cache
bench restart
```

## Database Queries

Use Frappe's ORM instead of raw SQL:

```python
# Get all records
frappe.get_all("DocType Name",
    filters={"field": "value"},
    fields=["field1", "field2"],
    order_by="creation desc",
    limit_page_length=20
)

# Get single document
doc = frappe.get_doc("DocType Name", "record_name")

# Get single value
value = frappe.db.get_value("DocType Name", "record_name", "field_name")

# Check existence
exists = frappe.db.exists("DocType Name", {"field": "value"})

# Update value
frappe.db.set_value("DocType Name", "record_name", "field", new_value)
```

## New Features (2025-11-29)

### Excel Import Functionality

The store_detail page now supports bulk importing planning data from Excel files:

**Backend:** `import_commodity_data()` in `store_detail.py`
- Reads Excel files using `openpyxl`
- Supports multiple month columns (2025-01, 202501, 2025/01 formats)
- Creates or updates Commodity Schedule records
- Returns detailed import results with error handling

**Frontend:** `open_import_dialog()` in `store_detail.js`
- File upload dialog with format instructions
- Progress indicator during import
- Displays import results and errors

**Excel Format:**
```
Row 1: 产品编码 | 产品名称 | 2025-01 | 2025-02 | ...
Row 2+: PROD001 | Product A | 100 | 150 | ...
```

### Multi-Month View

The page now supports two view modes:

**Single Month View (default):**
- One row per record (product + month + quantity)
- Supports pagination and batch operations
- Traditional list view with all product details

**Multi-Month View:**
- One row per product with horizontal month columns
- Dynamically generates columns based on actual data
- Inline editing for each month's quantity
- Better for comparing quantities across months

**Implementation:**
- `view_mode` parameter in `get_store_commodity_data()` API
- Backend aggregates data by product code
- Frontend renders different VTable configurations
- `switch_view()` method toggles between modes

### API Methods

**update_month_quantity()** - Update quantity for specific product/month
- Creates new record if doesn't exist
- Updates existing record if found
- Used by multi-month view inline editing

**get_store_commodity_data()** - Enhanced with view_mode parameter
- Returns aggregated data for multi-month view
- Returns flat list for single-month view
- Includes months array for dynamic column generation

## Project Structure

```
product_sales_planning/
├── product_sales_planning/          # Main app directory
│   ├── planning_system/             # Module directory
│   │   ├── doctype/                 # DocType definitions
│   │   │   ├── commodity_schedule/  # Main transactional DocType
│   │   │   ├── product_list/        # Product master
│   │   │   ├── store_list/          # Store master
│   │   │   ├── schedule_tasks/      # Task/period master
│   │   │   └── product_mechanism/   # Product bundle templates
│   │   └── page/                    # Custom pages
│   │       ├── demo_page/           # Dashboard
│   │       └── store_detail/        # Main planning interface
│   ├── public/                      # Static assets
│   │   ├── js/lib/                  # Third-party JS libraries (VTable, etc.)
│   │   └── vue-test/                # Standalone Vue test app (not integrated)
│   ├── fixtures/                    # Test data generation
│   ├── api.py                       # Additional API endpoints
│   └── hooks.py                     # App configuration and API registration
├── .pre-commit-config.yaml          # Pre-commit hooks configuration
├── pyproject.toml                   # Python project configuration (ruff settings)
└── package.json                     # Node.js dependencies (if any)
```

## Important Notes

### Development Workflow
- **Never commit directly to main/master** - use `develop` branch
- **Always test migrations** before committing DocType JSON changes
- **Frappe caching** is aggressive - run `bench clear-cache` and `bench restart` frequently during development
- After modifying DocType JSON files, always run `bench migrate`
- After modifying Python code, restart bench or use `bench watch` for auto-reload

### Architecture Constraints
- **VTable library** is loaded dynamically - ensure scripts load in correct order in `store_detail.js`
- **Route parameters** in store_detail page must handle `undefined` and `null` strings explicitly
- The `product_sales_planning/public/vue-test/` directory is a standalone Vue app for testing, **not integrated** with the main Frappe app
- **Excel imports** require `openpyxl` Python package (should be included in Frappe by default)
- **Multi-month view** performance depends on number of products and months - recommend limiting to 12 months

### DocType Naming Convention
- **Commodity Schedule** uses auto-naming: `{task_id}-{sub_date}-{store_id}-{code}`
- This ensures unique records per store/task/product/date combination
- When querying, use the `name` field for the full auto-generated ID

### API Registration
- All `@frappe.whitelist()` methods intended for external/frontend access **must** be registered in `hooks.py` under `api_methods`
- Methods not registered will only be accessible within the same module

### CI/CD
- GitHub Actions configured for:
  - **CI workflow**: Runs tests on every push to `develop` branch
  - **Linters workflow**: Runs Frappe Semgrep rules and pip-audit on pull requests
- Pre-commit hooks run automatically before each commit (ruff, eslint, prettier, pyupgrade)