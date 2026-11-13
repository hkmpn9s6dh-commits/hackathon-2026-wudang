#!/usr/bin/env bash
# 一条命令，从全新 clone 走到「这就是会被评委看到的东西」。退出码即结论。

set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step "node"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
echo "node $(node -v), npm $(node -v >/dev/null; npm -v)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "需要 Node 20.19 或更新（Vite 8）。" >&2
  exit 1
fi

# 这台机器上并行 vitest worker 会抢同一个临时文件，败者 EPERM，那个文件整个不加载。
# 单 worker + 临时目录放仓库内，并数用例数兜底。
export TEMP="$PWD/.tmp"
export TMP="$PWD/.tmp"
mkdir -p "$TEMP"

step "install"
if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund
else
  echo "node_modules 已在"
fi

step "字体子集"
echo "随包字体：$(ls -la src/assets/*.woff2 | awk '{print $5" bytes"}')"

step "type check"
npx tsc --noEmit

step "unit tests"
TEST_LOG="$TEMP/vitest.log"
NO_COLOR=1 FORCE_COLOR=0 npx vitest run 2>&1 | tee "$TEST_LOG"
PASSED=$(sed -E 's/\x1b\[[0-9;]*m//g' "$TEST_LOG" | grep -Eo 'Tests +[0-9]+ passed' | grep -Eo '[0-9]+' | tail -1 || true)
if [ -z "${PASSED:-}" ] || [ "$PASSED" -lt 30 ]; then
  echo "期望至少 30 条通过的测试，数到 ${PASSED:-0} —— 大概有文件没加载" >&2
  exit 1
fi
echo "$PASSED tests passed"

step "build"
npx vite build

step "end to end in a real browser"
node scripts/e2e.mjs

step "ui measurement"
node scripts/measure-ui.mjs > /dev/null
echo "proof/ui/report.md 已更新"

step "hygiene"
if grep -rn --include='*.ts' --include='*.mjs' -E 'TODO|FIXME|XXX' src scripts test | grep -v 'no TODO'; then
  echo "上面还有 TODO/FIXME" >&2
  exit 1
fi
if grep -rIn --include='*.ts' -E 'sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}' src; then
  echo "源码里有密钥" >&2
  exit 1
fi
# 运行时不联网：除字体外不许出现外链
if grep -rIn --include='*.ts' --include='*.css' --include='*.html' -E 'https?://(?!127\.0\.0\.1)' src index.html 2>/dev/null | grep -v 'data:image'; then
  echo "出现了外部 URL" >&2
  exit 1
fi
TOTAL=$(du -sb dist | awk '{print $1}')
if [ "$TOTAL" -gt 460000 ]; then
  echo "构建产物 ${TOTAL} 字节，超过 460 KB 预算" >&2
  exit 1
fi
if ! ls dist/assets/*.woff2 > /dev/null 2>&1; then
  echo "随包字体没进构建" >&2
  exit 1
fi
echo "dist: ${TOTAL} bytes"

printf '\n\033[1;32mverify: all green\033[0m\n'
