<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.
<!-- OPENSPEC:END -->

# Repository Guidelines

## Project Structure & Modules

- Backend (Frappe app): `product_sales_planning/` (Python package). API endpoints live in `product_sales_planning/api/v1/`.
- Frontend (Vite + Vue + frappe-ui): `frontend/` with source in `frontend/src/`. Production build outputs to `product_sales_planning/public/planning/`.
- Tests: `product_sales_planning/tests/` (API test suite: `product_sales_planning/tests/api_test_suite.py`).
- Documentation: top-level Markdown files (e.g. `PROJECT_SUMMARY.md`, `API_QUICK_REFERENCE.md`) and `product_sales_planning/docs/`.

## Build, Test, and Development Commands

Run bench-related commands from the bench root (`/home/amininstors/frappe-bench`):

- Install app: `bench get-app <repo_url> --branch develop` then `bench --site <site> install-app product_sales_planning`
- Apply migrations: `bench --site <site> migrate`
- Clear caches: `bench --site <site> clear-cache`
- Run API tests: `bench --site <site> execute product_sales_planning.tests.api_test_suite.run_api_tests`

Frontend (from `apps/product_sales_planning/frontend`):

- Dev server: `yarn dev`
- Build: `yarn build`

Optional helper (from app root): `bash scripts/init_dev.sh --site <site>`

## Coding Style & Naming Conventions

- Python: formatted/linted via `ruff` (see `pyproject.toml`: tabs, double quotes, line length 110).
- Frontend: ESLint (`.eslintrc`) + Prettier (`frontend/.prettierrc.json`).
- Enable pre-commit hooks: `pre-commit install` (tooling configured in `.pre-commit-config.yaml`).
- Keep new APIs under `product_sales_planning/api/v1/` and expose via `@frappe.whitelist()`.

## Testing Guidelines

- Add/extend tests in `product_sales_planning/tests/`. Prefer covering new endpoints in the existing API test suite.
- Ensure tests are runnable via the `bench execute ...run_api_tests` command above.

## Commit & Pull Request Guidelines

- History is mixed-language; use a consistent, short subject line. Recommended prefixes: `feat:`, `fix:`, `docs:`, `chore:`.
- PRs should include: summary, steps to verify, and screenshots/GIFs for UI changes. Update docs when behavior changes.

## Configuration & Security Tips

- Vite proxy reads `sites/common_site_config.json` for `webserver_port`; ensure your bench config is present.
- For Vite dev, if you hit CSRF issues, set `"ignore_csrf": 1` in the target site’s `site_config.json` (dev only; don’t ship to prod).
