# Moltbot 快速参考指南

快速查找常用命令、配置和代码片段。

## 目录

- [命令快速参考](#命令快速参考)
- [文件结构](#文件结构)
- [核心 API](#核心-api)
- [常用配置](#常用配置)
- [调试命令](#调试命令)
- [项目快速启动](#项目快速启动)

---

## 命令快速参考

### 开发命令

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build

# 开发模式（自动重载）
pnpm gateway:watch

# 运行 CLI
pnpm moltbot [command]

# 启动 Gateway
pnpm moltbot gateway --port 18789 --verbose

# 运行 Agent
pnpm moltbot agent --message "Your message" --thinking high

# 启动 onboarding 向导
pnpm moltbot onboard

# 列出所有命令
pnpm moltbot --help
```

### 测试命令

```bash
# 运行所有测试
pnpm test

# Watch 模式
pnpm test:watch

# 特定文件测试
pnpm test src/agents/pi-embedded.test.ts

# E2E 测试
pnpm test:e2e

# 覆盖率报告
pnpm test:coverage
```

### 代码质量

```bash
# Lint
pnpm lint

# Format check
pnpm format

# Fix formatting
pnpm format:fix

# 构建检查
pnpm build
```

---

## 文件结构

### 核心目录

```
src/
├── gateway/                    # 网关服务器核心
│   ├── server.impl.ts         # 主服务器实现
│   ├── server-methods/        # RPC 方法处理
│   │   ├── chat.ts           # chat.* 方法
│   │   ├── sessions.ts       # sessions.* 方法
│   │   └── nodes.ts          # nodes.* 方法
│   ├── session-utils.ts       # 会话工具函数
│   └── server-startup.ts      # 启动逻辑
│
├── agents/                     # Agent 运行时
│   ├── pi-embedded.ts         # Embedded Agent 入口
│   ├── pi-embedded-runner.ts  # Agent 执行引擎
│   ├── pi-tools.ts            # 工具定义和注册
│   ├── tools/                 # 工具实现
│   │   ├── bash-tools.ts
│   │   ├── browser.ts
│   │   ├── canvas-host.ts
│   │   └── ...
│   └── skills/                # 技能模块
│
├── channels/                   # 多通道支持
│   ├── whatsapp/             # WhatsApp 实现
│   ├── telegram/             # Telegram 实现
│   ├── discord/              # Discord 实现
│   └── ...
│
├── config/                     # 配置管理
│   ├── config.ts             # 主配置加载
│   └── sessions.ts           # 会话配置
│
├── memory/                     # 存储和记忆
│   ├── manager.ts            # 内存管理器
│   ├── sqlite.ts             # SQLite 存储
│   └── embeddings.ts         # 向量存储
│
├── cli/                        # CLI 命令行工具
│   ├── program.ts            # 命令定义
│   └── program/              # 各种命令
│
└── auto-reply/                # 自动回复和转发
    ├── monitor.ts            # 监听和转发
    └── dispatch.ts           # 消息分发
```

### 配置文件

```
~/.moltbot/
├── openclaw.json              # 主配置文件
├── credentials/               # 认证凭证
├── data/
│   ├── sessions/             # 会话数据 (JSONL)
│   └── memory.db             # SQLite 数据库
├── logs/
│   ├── gateway.log
│   └── ...
└── workspace/                 # 默认工作区
    ├── AGENTS.md             # Agent 提示词
    ├── SOUL.md               # 灵魂定义
    └── ...
```

---

## 核心 API

### Gateway 客户端

```typescript
import type { GatewayClient } from "./gateway/client.js";

// 调用 RPC 方法
const result = await client.request("chat.send", {
  sessionKey: "main",
  message: "Hello!"
});

// 监听事件
client.on("agent.delta", (event) => {
  console.log("Agent streaming:", event.text);
});

client.on("chat.final", (event) => {
  console.log("Chat completed:", event.message);
});
```

### 运行 Agent

```typescript
import { runEmbeddedPiAgent } from "./agents/pi-embedded.js";

const result = await runEmbeddedPiAgent({
  sessionKey: "my-session",
  userMessage: "What time is it?",
  config: await loadConfig()
});

console.log(result.message);         // 最终回复
console.log(result.toolCalls);       // 工具调用列表
console.log(result.stopReason);      // 停止原因
```

### 会话管理

```typescript
import {
  loadSessionStore,
  saveSessionStore
} from "./config/sessions.js";

// 加载会话
const session = await loadSessionStore("my-session");

// 访问属性
console.log(session.messages);      // 消息列表
console.log(session.model);         // 使用的模型
console.log(session.sessionId);     // 会话 ID

// 修改会话
session.model = "anthropic/claude-opus";
await saveSessionStore("my-session", session);
```

### 工具定义

```typescript
import type { Tool } from "./agents/pi-tools.js";

const myTool: Tool = {
  name: "my_tool",
  description: "What this tool does",
  inputSchema: {
    type: "object" as const,
    properties: {
      param1: {
        type: "string",
        description: "First parameter"
      }
    },
    required: ["param1"]
  }
};
```

### 日志

```typescript
import { createSubsystemLogger } from "./logging/subsystem.js";

const log = createSubsystemLogger("my-module");

log.info("Info message", { context: "data" });
log.debug("Debug details");
log.warn("Warning");
log.error("Error", { error });
```

---

## 常用配置

### 基础配置 (~/.moltbot/openclaw.json)

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-3-5-sonnet",
      "workspace": "~/.moltbot/workspace",
      "thinkingDefault": "medium",
      "timeout": 120
    }
  },
  "channels": {
    "whatsapp": {
      "enabled": true
    },
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TOKEN"
    },
    "discord": {
      "enabled": true,
      "token": "YOUR_TOKEN"
    }
  },
  "browser": {
    "enabled": true
  },
  "logging": {
    "level": "info"
  },
  "gateway": {
    "port": 18789,
    "bind": "loopback"
  }
}
```

### 设置模型认证

```bash
# 使用环境变量
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# 或在配置中指定
# ~/.moltbot/openclaw.json
{
  "agents": {
    "defaults": {
      "authProfiles": {
        "anthropic": "your-profile-name"
      }
    }
  }
}
```

### 启用 Thinking（扩展思考）

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus",
      "thinkingDefault": "high"
    }
  }
}
```

### 启用 Sandbox 模式

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "docker": {
          "image": "node:22-alpine"
        }
      }
    }
  }
}
```

---

## 调试命令

### 启用详细日志

```bash
# Gateway 详细模式
pnpm moltbot gateway --verbose

# 设置日志级别
export LOGLEVEL=debug
pnpm moltbot gateway

# 查看实时日志
tail -f ~/.moltbot/logs/gateway.log

# 搜索错误
grep -i error ~/.moltbot/logs/gateway.log

# 追踪特定会话
grep "session-key" ~/.moltbot/logs/gateway.log
```

### 健康检查

```bash
# 检查 Gateway 健康状态
curl http://localhost:18789/health

# 诊断命令
pnpm moltbot doctor

# 列出所有会话
pnpm moltbot sessions list

# 显示会话详情
pnpm moltbot sessions show my-session
```

### 调试 Agent 执行

```bash
# 运行 Agent 并显示详细信息
pnpm moltbot agent \
  --message "Test message" \
  --thinking high \
  --verbose

# 测试工具
pnpm moltbot agent \
  --message "List files in /tmp" \
  --verbose
```

### 监听事件

```bash
# 监听 WebSocket 消息（需要另一个终端）
# 使用 wscat 或 websocat
npm install -g wscat
wscat -c ws://localhost:18789

# 然后在 Gateway 的日志中看到 WS 消息
```

---

## 项目快速启动

### 第一次设置

```bash
# 1. 克隆项目
git clone https://github.com/moltbot/moltbot.git
cd moltbot

# 2. 安装依赖（使用 pnpm）
pnpm install

# 3. 构建项目
pnpm build

# 4. 运行 onboarding 向导
pnpm moltbot onboard

# 5. 启动 Gateway
pnpm moltbot gateway --port 18789 --verbose
```

### 日常开发流程

```bash
# 1. 启动 Gateway（自动重载）
pnpm gateway:watch

# 2. 在另一个终端运行 Agent 测试
pnpm moltbot agent --message "Test" --thinking high

# 3. 修改代码，自动重新编译和重载

# 4. 查看日志
tail -f ~/.moltbot/logs/gateway.log
```

### 快速测试

```bash
# 编译最新代码
pnpm build

# 运行单个测试
pnpm test src/agents/pi-embedded.test.ts

# 运行 E2E 测试
pnpm test:e2e

# 检查代码质量
pnpm lint && pnpm format
```

---

## 常见问题快速解决

### Gateway 不能启动

```bash
# 1. 检查端口占用
lsof -i :18789

# 2. 检查配置文件
cat ~/.moltbot/openclaw.json

# 3. 启用详细日志
pnpm moltbot gateway --verbose

# 4. 重置配置
rm ~/.moltbot/openclaw.json
pnpm moltbot onboard
```

### Agent 无响应

```bash
# 1. 检查模型认证
pnpm moltbot doctor

# 2. 查看 Gateway 日志
tail -f ~/.moltbot/logs/gateway.log

# 3. 检查工具执行
# 在 Agent 消息中添加 --verbose 标志

# 4. 尝试重启 Gateway
pkill -f "gateway"
pnpm moltbot gateway --port 18789
```

### 会话数据丢失

```bash
# 备份会话数据
cp -r ~/.moltbot/data/sessions ~/backup-sessions

# 查看会话列表
pnpm moltbot sessions list

# 恢复会话
# 编辑 ~/.moltbot/data/sessions/{sessionId}.jsonl

# 查看会话内容
cat ~/.moltbot/data/sessions/my-session.jsonl
```

---

## 有用的环境变量

```bash
# 日志级别
export LOGLEVEL=debug|info|warn|error

# 跳过通道初始化（开发用）
export CLAWDBOT_SKIP_CHANNELS=1

# 指定配置文件
export CLAWDBOT_CONFIG_PATH=/path/to/config.json

# API 密钥
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# 代理设置
export HTTP_PROXY="http://proxy:8080"
export HTTPS_PROXY="http://proxy:8080"

# 诊断事件
export CLAWDBOT_DIAGNOSTIC_EVENTS=1
```

---

## 有用的工具和插件

```bash
# WebSocket 客户端
npm install -g wscat

# JSON 处理
npm install -g jq

# 监听日志变化
npm install -g tail-f

# 编辑 JSON 配置
# 使用你喜欢的编辑器，如 VS Code
code ~/.moltbot/openclaw.json
```

---

## 关键概念速览

| 概念 | 说明 |
|------|------|
| **Session** | 用户与 Agent 的对话上下文，存储消息历史 |
| **Gateway** | 中央控制平面，处理所有 RPC 请求 |
| **Agent** | Pi Agent 驱动的智能体，执行推理和工具调用 |
| **Tool** | Agent 可以调用的外部功能（浏览器、Bash 等） |
| **Channel** | 通讯通道（WhatsApp、Telegram、Discord 等） |
| **Workspace** | Agent 的工作目录，包含 AGENTS.md、技能等 |
| **Embedding** | 文本向量表示，用于语义搜索 |
| **Thinking** | 扩展思考模式（支持 Claude Opus） |

---

## 查找更多信息

```bash
# 查看帮助
pnpm moltbot --help
pnpm moltbot gateway --help
pnpm moltbot agent --help

# 阅读源代码文档
# 在 IDE 中 Cmd+Click 跳转到定义

# 查看类型定义
# 所有类型都在源代码中，TypeScript 提供智能提示

# 查看测试文件
# src/**/*.test.ts 包含实际用法示例
```

---

这份快速参考应该能帮你快速找到需要的信息！

