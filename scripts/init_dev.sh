#!/usr/bin/env bash
set -euo pipefail

usage() {
	cat <<'EOF'
用法：
  bash scripts/init_dev.sh [--site <站点>] [--skip-frontend] [--skip-precommit]

说明：
  - 该脚本只在当前 app 目录内执行（不会自动修改 bench 目录/站点配置）。
  - 会可选安装前端依赖、安装 pre-commit hooks，并输出 bench 侧的安装/启动命令。

参数：
  --site <站点>        用于输出 bench 命令（例如 mysite.local）
  --skip-frontend      跳过 frontend 的依赖安装
  --skip-precommit     跳过 pre-commit hooks 安装
  -h, --help           显示帮助
EOF
}

site_name=""
skip_frontend="0"
skip_precommit="0"

while [[ $# -gt 0 ]]; do
	case "$1" in
		--site)
			site_name="${2:-}"
			shift 2
			;;
		--skip-frontend)
			skip_frontend="1"
			shift
			;;
		--skip-precommit)
			skip_precommit="1"
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "未知参数：$1" >&2
			usage >&2
			exit 2
			;;
	esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
app_dir="$(cd "$script_dir/.." && pwd)"
bench_dir="$(cd "$app_dir/../.." && pwd)"

echo "== 基本信息 =="
echo "App 目录：$app_dir"
echo "Bench 目录（推断）：$bench_dir"
echo

echo "== 环境检查 =="
python3 --version || true
node --version || true
yarn --version || true
echo

if [[ "$skip_precommit" != "1" ]]; then
	echo "== pre-commit（可选） =="
	if command -v pre-commit >/dev/null 2>&1; then
		(
			cd "$app_dir"
			pre-commit install
		)
		echo "已安装 git hooks：pre-commit"
	else
		echo "未检测到 pre-commit：可执行 'pip install pre-commit' 后再运行本脚本。"
	fi
	echo
fi

if [[ "$skip_frontend" != "1" ]]; then
	echo "== 前端依赖（frontend） =="
	if [[ -f "$app_dir/frontend/package.json" ]]; then
		(
			cd "$app_dir/frontend"
			yarn install --frozen-lockfile
		)
		echo "frontend 依赖安装完成"
	else
		echo "未找到 frontend/package.json，跳过。"
	fi
	echo
fi

echo "== Bench 安装/启动（请在 bench 根目录执行）=="
echo "cd \"$bench_dir\""
if [[ -n "$site_name" ]]; then
	echo "bench --site \"$site_name\" install-app product_sales_planning"
	echo "bench --site \"$site_name\" migrate"
	echo "bench --site \"$site_name\" clear-cache"
else
	echo "bench --site <你的站点> install-app product_sales_planning"
	echo "bench --site <你的站点> migrate"
	echo "bench --site <你的站点> clear-cache"
fi
echo
echo "开发："
echo "  - 后端：bench start   （或 bench restart）"
echo "  - 前端：cd apps/product_sales_planning/frontend && yarn dev"
echo
echo "提示：使用 Vite 开发服务器时，如遇 CSRFToken 报错，可按 frontend/README.md 配置 site_config.json 的 ignore_csrf。"

