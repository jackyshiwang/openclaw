#!/bin/bash
# 运行晨思 (Chensi) MVP 示例

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 加载 API 密钥配置
if [ -f "$HOME/.moltbot/.env" ]; then
  set -a
  source "$HOME/.moltbot/.env"
  set +a
else
  echo "❌ 找不到 API 密钥配置文件: $HOME/.moltbot/.env"
  exit 1
fi

# 切换到项目目录
cd "$SCRIPT_DIR"

# 确保数据文件存在于 dist 目录
mkdir -p dist/agents/chensi
cp src/agents/chensi/data.json dist/agents/chensi/data.json

# 运行示例
echo "🚀 运行晨思 MVP..."
echo "---"
node dist/agents/examples/run-chensi.js

