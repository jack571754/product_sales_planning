# Project Context

## Purpose
Product Sales Planning System - A comprehensive sales planning and approval management system built on Frappe Framework v15. The system manages:
- Monthly regular commodity plans (MON)
- Special promotional activities (PRO)
- Multi-level approval workflows
- Store-based commodity allocation
- Real-time planning dashboards and data views

**Key Goals:**
- Streamline commodity planning across multiple stores
- Implement flexible multi-level approval workflows
- Provide intuitive interfaces for planners and approvers
- Support both traditional Frappe UI and modern Vue 3 SPA experiences

## Tech Stack

### Backend
- **Frappe Framework v15** - Core application framework
- **Python 3.10+** - Backend language
- **MariaDB** - Database
- **Frappe ORM** - Database abstraction layer

### Frontend (Dual Architecture)
- **Traditional Frappe Pages** - Built-in Frappe page system with jQuery
  - Handsontable - For large data grid editing
  - Frappe UI components - Native Frappe widgets
- **Vue 3 SPA** - Modern single-page application
  - Vue 3 (Composition API with `<script setup>`)
  - frappe-ui - Official Frappe UI component library
  - Vue Router - Client-side routing
  - Vite - Build tool and dev server
  - Tailwind CSS - Utility-first CSS framework
  - Feather Icons - Icon system (via frappe-ui)

### Development Tools
- **ruff** - Python linter and formatter
- **ESLint** - JavaScript linter
- **Prettier** - Code formatter
- **pre-commit** - Git hooks for code quality
- **pyupgrade** - Python syntax modernizer

## Project Conventions

### Code Style

**Python:**
- Use **Tab indentation** (Frappe standard, not spaces)
- Line length: 110 characters maximum
- Naming conventions:
  - Variables/functions: `snake_case`
  - DocTypes: `Title Case with Spaces`
  - Classes: `PascalCase`
- Use type hints where beneficial
- Docstrings for all public functions

**JavaScript/Vue:**
- Use **Tab indentation**
- ES6+ syntax required
- Vue 3 Composition API with `<script setup>` syntax
- Component naming: `PascalCase.vue`
- Props/emits: Use `defineProps()` and `defineEmits()`

**CSS:**
- Prefer Tailwind utility classes over custom CSS
- Use frappe-ui design tokens for consistency
- Custom CSS only when necessary

### Architecture Patterns

**1. Dual Frontend Architecture:**
- Traditional Frappe Pages for Frappe Desk integration (`planning_system/page/`)
- Vue 3 SPA for modern user experiences (`frontend/`)
- Both share the same backend API layer

**2. Service Layer Pattern:**
- Complex business logic in `services/` directory
- Keeps API endpoints thin and focused
- Example: `CommodityScheduleService` handles commodity operations

**3. Utility Layer:**
- Reusable utilities in `utils/` directory
- `response_utils.py` - Standardized API responses
- `validation_utils.py` - Parameter validation
- `date_utils.py` - Date handling

**4. Child Table Relationships:**
- Parent-child relationships via Frappe's child table mechanism
- Example: `Schedule Tasks` → `Tasks Store` (one-to-many)

**5. Approval Workflow System:**
- Configurable multi-level approval flows
- Role-based, store-attribute-based, or store-range-based assignment
- State machine: Draft → Pending → Approved/Rejected

**6. Vue Component Architecture:**
- Layout components (`layouts/`) - Page structure
- Reusable components (`components/`) - Shared UI elements
- Page components (`pages/`) - Business pages
- Nested routing with shared layouts

### Testing Strategy

**Unit Tests:**
- Test files alongside DocType definitions
- Naming: `test_<doctype_name>.py`
- Run with: `bench --site [site-name] test product_sales_planning`

**Test Data Generation:**
- Fixtures in `fixtures/` directory
- Scripts for generating test data, workflows, and assignments
- Use for development and testing environments

**Manual Testing:**
- Test approval workflows with different user roles
- Verify permissions and access control
- Test both Frappe Page and Vue SPA interfaces

### Git Workflow

**Branch Strategy:**
- `master` - Production-ready code
- `develop` - Integration branch for features
- `feature/<name>` - New features (branch from `develop`)
- `fix/<description>` - Bug fixes (branch from `develop`)

**Commit Conventions:**
- Use descriptive commit messages
- Pre-commit hooks automatically run:
  - ruff (Python linting/formatting)
  - ESLint (JavaScript linting)
  - Prettier (code formatting)
  - pyupgrade (Python syntax modernization)

**Ignored Files:**
- `product_sales_planning/public/planning/assets/*` - Vue build output
- `product_sales_planning/public/planning/.vite/` - Vite cache
- `frontend/node_modules/` - Node dependencies
- `frontend/dist/` - Temporary build directory

## Domain Context

**Business Domain: Retail Sales Planning**

**Key Concepts:**
- **Commodity Schedule** - Specific product planning data for a store
- **Schedule Tasks** - Parent planning task (MON or PRO type)
- **Store Assignment** - Linking tasks to specific stores
- **Approval Workflow** - Multi-level approval process
- **Task Types:**
  - MON (Monthly Regular) - Recurring monthly plans
  - PRO (Promotional) - Special promotional activities

**User Roles:**
- **Planner** - Creates and submits commodity plans
- **Approver** - Reviews and approves/rejects plans (multiple levels)
- **Admin** - Configures workflows and system settings

**Business Rules:**
- Plans must be approved before execution
- Approved plans cannot be edited (immutable)
- Rejected plans can be revised and resubmitted
- Approval hierarchy based on store attributes or ranges

## Important Constraints

**Technical Constraints:**
1. **Frappe Framework v15 Only** - No backward compatibility code
2. **Tab Indentation Required** - Frappe standard, enforced by pre-commit
3. **MariaDB Database** - No PostgreSQL support
4. **Single Tenant per Site** - Frappe's multi-tenancy model

**Performance Constraints:**
1. Large datasets (10,000+ commodities per task)
2. Batch operations must use SQL for performance
3. Avoid N+1 queries - use bulk fetching
4. Index on `task_id + store_id` for commodity schedules

**Security Constraints:**
1. All APIs check permissions by default (`ignore_permissions=False`)
2. CSRF token required for all POST requests
3. Role-based access control (RBAC) enforced
4. Approval permissions validated at each step

**Business Constraints:**
1. Approved data is immutable
2. Only submitters can withdraw pending approvals
3. Approval sequence must be followed in order
4. Store assignments cannot be changed after approval starts

## External Dependencies

**Core Framework:**
- **Frappe Framework v15** - Application framework
  - Provides ORM, authentication, permissions, UI components
  - Handles routing, caching, background jobs

**Frontend Libraries:**
- **frappe-ui** - Official Frappe UI component library
  - Provides Button, Card, Input, Dropdown, Avatar, etc.
  - Includes `createResource` for declarative data fetching
  - Includes `call()` for API requests
- **Vue Router** - Client-side routing for SPA
- **Tailwind CSS** - Utility-first CSS framework
- **Feather Icons** - Icon system (bundled with frappe-ui)

**Development Dependencies:**
- **Vite** - Frontend build tool and dev server
- **Handsontable** - Data grid for traditional pages
- **ruff** - Python linting/formatting
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting

**System Dependencies:**
- **Node.js 16+** - For frontend build tools
- **Yarn or npm** - Package manager
- **Python 3.10+** - Backend runtime
- **Redis** - Caching and background jobs (via Frappe)
- **Nginx** - Web server (production)

**No External APIs:**
- System is self-contained
- No third-party API integrations currently
- All data stored in local MariaDB database
