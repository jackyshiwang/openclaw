#!/bin/bash
# 运行 Moltbot Hello World 示例
# 该脚本自动加载 API 密钥并运行示例

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

# 检查编译产物
if [ ! -f "dist/agents/examples/hello-world.js" ]; then
  echo "⚠️  编译产物不存在，正在构建..."
  pnpm build
fi

# 运行示例
echo "🚀 运行 Moltbot Hello World 示例..."
echo "---"
node dist/agents/examples/hello-world.js

