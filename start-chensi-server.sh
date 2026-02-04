#!/bin/bash
# 启动晨思 API Server

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载 API 密钥配置
if [ -f "$HOME/.moltbot/.env" ]; then
  set -a
  source "$HOME/.moltbot/.env"
  set +a
  echo "✅ 已加载 API 密钥配置"
else
  echo "❌ 找不到 API 密钥配置文件: $HOME/.moltbot/.env"
  exit 1
fi

# 切换到项目目录
cd "$SCRIPT_DIR"

# 确保数据文件存在于 dist 目录
mkdir -p dist/agents/chensi
cp src/agents/chensi/data.json dist/agents/chensi/data.json

# 编译项目 (如果需要)
# pnpm build

# 运行服务器 (使用 tsx 直接运行 TypeScript，方便开发)
echo "🚀 启动晨思 API Server (Port 3000)..."
npx tsx src/server/chensi-api.ts

