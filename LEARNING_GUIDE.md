# Moltbot/OpenClaw Agent 系统学习指南

这是一份为想要基于 Moltbot 构建自己 Agent 的开发者准备的深度学习指南。

## 📚 目录

1. [整体架构](#整体架构)
2. [核心概念](#核心概念)
3. [Gateway 服务器](#gateway-服务器)
4. [Agent 运行时](#agent-运行时)
5. [多渠道集成](#多渠道集成)
6. [存储和记忆系统](#存储和记忆系统)
7. [实战步骤](#实战步骤)

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      外部通道 (Channels)                         │
│  WhatsApp | Telegram | Slack | Discord | Signal | iMessage etc  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Gateway WebSocket Server                      │
│                  (src/gateway/server.impl.ts)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         RPC 方法处理层 (server-methods/)                 │   │
│  │  - chat.history, chat.send, chat.abort                   │   │
│  │  - sessions.list, sessions.patch                         │   │
│  │  - nodes.invoke, browser.*, canvas.*                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         会话管理 (Session Management)                    │   │
│  │  - 会话存储和恢复                                        │   │
│  │  - 多 Agent 路由                                         │   │
│  │  - 消息历史管理                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent 运行时 (Pi Agent)                      │
│              (src/agents/pi-embedded-runner.ts)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Tool 执行层 (src/agents/tools/)                 │   │
│  │  - Browser control, Canvas, Bash, etc                    │   │
│  │  - Tool 调度和结果处理                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         模型交互 (@mariozechner/pi-*)                    │   │
│  │  - Claude/OpenAI 模型 API 调用                           │   │
│  │  - 流式响应处理                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   存储层 (Storage Layer)                        │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │   SQLite DB      │  │   Vector Store   │  │  File Sys    │   │
│  │ (Sessions)       │  │ (Embeddings)     │  │ (Workspace)  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 三层架构说明

1. **Gateway 层** (服务端控制平面)
   - WebSocket 服务器，处理所有客户端请求
   - RPC 方法层，提供统一的接口
   - 会话管理和路由

2. **Agent 运行时** (核心逻辑处理)
   - 使用 `@mariozechner/pi-*` 库的 Agent 核心
   - 工具执行框架
   - LLM 模型交互

3. **存储层** (数据持久化)
   - SQLite 存储会话和消息
   - 向量存储用于相似性搜索
   - 文件系统存储工作区文件

---

## 核心概念

### 1. Session（会话）
- **定义**: 用户与 Agent 的一个对话上下文
- **存储**: `~/.moltbot/sessions/` 下的 JSONL 文件
- **关键字段**: `sessionKey`, `sessionId`, `agentId`, `messages[]`, `model`

```typescript
// 会话结构 (from src/sessions/)
type Session = {
  sessionKey: string;        // e.g., "main" 或 "group-xyz"
  sessionId: string;         // 唯一标识
  agentId: string;          // 关联的 Agent
  messages: Message[];      // 对话消息列表
  model?: string;           // 使用的模型
  thinkingLevel?: string;   // 思考深度
};
```

### 2. Gateway（网关）
- **作用**: 中央控制平面，连接所有客户端和 Agent
- **通信**: WebSocket RPC 调用
- **位置**: `src/gateway/`

主要功能：
- WebSocket 服务器运行
- 会话路由和管理
- 多通道消息分发
- 工具调用转发

### 3. Agent（智能体）
- **核心**: Pi Agent (来自 `@mariozechner/pi-*`)
- **执行模式**:
  - `rpc` 模式: 由 Gateway 远程调用
  - `embedded` 模式: 直接嵌入进程运行
- **配置**: `~/.moltbot/openclaw.json` 中的 `agents` 部分

### 4. Channels（通道）
- **种类**: WhatsApp, Telegram, Slack, Discord, etc.
- **实现位置**: `src/[channel-name]/`
- **责任**: 监听通道消息，转发到 Gateway

### 5. Tools（工具）
- **定义**: Agent 可以调用的外部操作
- **实现**: `src/agents/tools/`
- **例子**: 浏览器控制、Canvas、Bash 命令执行

---

## Gateway 服务器

### 启动流程

位置: `src/gateway/server.impl.ts`

```typescript
export async function startGatewayServer(opts: GatewayServerOptions) {
  // 1. 加载配置
  const config = await loadConfig();

  // 2. 初始化 WebSocket 服务器
  const wss = new WebSocketServer();

  // 3. 注册 RPC 方法处理器
  // 来自 src/gateway/server-methods.ts
  const handlers = coreGatewayHandlers;

  // 4. 启动通道监听 (WhatsApp, Telegram, etc.)
  await startChannels(config);

  // 5. 启动维护定时器
  await startMaintenanceTimers();

  // 6. 准备就绪
  return gatewayServer;
}
```

### 关键 RPC 方法

位置: `src/gateway/server-methods/`

#### 1. Chat 相关方法
```typescript
// chat.history - 获取会话历史
{
  params: { sessionKey: string; limit?: number }
  returns: { messages: unknown[]; thinkingLevel?: string }
}

// chat.send - 发送消息并触发 Agent
{
  params: {
    sessionKey: string;
    message: string;
    attachments?: { ... }
  }
  returns: { runId: string }
}

// chat.abort - 中止当前运行
{
  params: { sessionKey: string; runId?: string }
  returns: { ok: boolean; aborted: boolean }
}
```

#### 2. Sessions 相关方法
```typescript
// sessions.list - 列出所有会话
{
  returns: Session[]
}

// sessions.patch - 更新会话配置
{
  params: {
    sessionKey: string;
    patch: { model?: string; thinkingLevel?: string; ... }
  }
}
```

#### 3. Nodes 相关方法
```typescript
// nodes.list - 列出已连接的设备节点
// nodes.invoke - 在节点上执行命令
```

### 消息流向

```
客户端                     Gateway              Agent Runtime       LLM
  │                          │                       │              │
  ├─ chat.send ──────────────>│                       │              │
  │                          │  runEmbeddedPiAgent   │              │
  │                          ├──────────────────────>│              │
  │                          │                       │              │
  │                          │                    (执行工具)        │
  │                          │                       │              │
  │                          │                    调用 LLM          │
  │                          │                       ├─────────────>│
  │                          │                       │<─────────────┤
  │                          │<──────────────────────┤              │
  │<──────────────────────────│                       │              │
  │  (流式响应)               │                       │              │
```

### 会话存储

位置: `src/config/sessions.ts`

```typescript
// 会话文件结构
// 文件: ~/.moltbot/data/sessions/{sessionId}.jsonl
// 格式: 每行一个 JSON 对象 (JSONL)

// 行 1: 会话头
{
  "type": "session",
  "version": "1.0",
  "id": "session-uuid",
  "timestamp": "2026-01-30T...",
  "cwd": "/path/to/workspace"
}

// 行 2+: 消息
{
  "type": "message",
  "role": "user",
  "content": "...",
  "timestamp": "..."
}
```

---

## Agent 运行时

### 运行模式

#### 1. Embedded 模式（最常用）
- Agent 在 Gateway 进程内运行
- 快速，无 IPC 开销
- 位置: `src/agents/pi-embedded-runner.ts`

```typescript
export async function runEmbeddedPiAgent(
  sessionKey: string,
  userMessage: string,
  options: RunOptions
): Promise<RunResult> {
  // 1. 加载会话上下文
  const session = loadSession(sessionKey);

  // 2. 构建系统提示和工具定义
  const systemPrompt = buildSystemPrompt(session);
  const tools = resolvePiTools(session);

  // 3. 调用 Pi Agent
  const result = await invokePiAgent({
    model: session.model,
    systemPrompt,
    tools,
    messages: session.messages,
    userMessage
  });

  // 4. 保存会话和结果
  await saveSession(sessionKey, result.messages);

  return result;
}
```

#### 2. RPC 模式
- Agent 通过 RPC 调用 Gateway
- 用于 CLI 工具或远程调用

### Pi Agent 核心

来自: `@mariozechner/pi-*` 包

```typescript
// Pi Agent 是一个通用的 LLM Agent 框架
// 支持:
// - Agentic loops (循环执行工具直到完成)
// - Streaming responses (流式响应)
// - Tool calling (工具调用)
// - Multi-turn conversations (多轮对话)

type PiAgentConfig = {
  model: string;           // "anthropic/claude-3-5-sonnet"
  systemPrompt: string;    // 系统提示词
  tools: Tool[];          // 可用工具列表
  messages: Message[];    // 对话历史
  thinking?: "enabled";   // 是否启用扩展思考
};
```

### 工具系统

位置: `src/agents/tools/`

#### 工具定义
```typescript
type Tool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: { ... };
    required: string[];
  };
};
```

#### 常用工具
- **browser** - 浏览器控制 (Playwright)
- **bash** - 执行 shell 命令
- **read** - 读取文件
- **write** - 写入文件
- **canvas** - 控制 Canvas UI
- **nodes** - 控制设备节点

#### 工具执行流程
```typescript
// 1. Agent 生成工具调用
{
  type: "tool_use",
  name: "bash",
  input: { command: "ls -la" }
}

// 2. Gateway 执行工具
const result = await executeTool("bash", { command: "ls -la" });

// 3. 返回结果给 Agent
{
  type: "tool_result",
  tool_use_id: "...",
  content: "... output ..."
}

// 4. Agent 继续推理
```

### 会话上下文管理

```typescript
// 会话上下文包含:
type SessionContext = {
  // 消息历史
  messages: Message[];

  // 模型和配置
  model: string;
  systemPrompt?: string;
  thinkingLevel?: string;

  // 工作区信息
  workspace: string;
  workspaceFiles: string[];

  // 技能和扩展
  skills: Skill[];

  // 内存和搜索
  memory?: Memory;
  vectorStore?: VectorStore;
};
```

---

## 多渠道集成

### 通道架构

每个通道实现:
```
src/[channel-name]/
├── monitor.ts          # 监听消息
├── message-context.ts  # 消息上下文
├── send.ts            # 发送消息
└── [other].ts         # 特定功能
```

### 常见通道实现

#### WhatsApp (Baileys)
```typescript
// src/whatsapp/session.ts
import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";

const socket = makeWASocket({
  auth: await useMultiFileAuthState(authDir),
  // ...
});

socket.ev.on("messages.upsert", async (m) => {
  // 转发到 Gateway
  await gatewayClient.sendMessage(m);
});
```

#### Telegram (grammY)
```typescript
// src/telegram/bot.ts
import { Bot } from "grammy";

const bot = new Bot(TELEGRAM_BOT_TOKEN);

bot.on("message", async (ctx) => {
  // 转发到 Gateway
  await gatewayClient.sendMessage(ctx.message);
});
```

#### Discord (discord.js)
```typescript
// src/discord/monitor.ts
import { Client } from "discord.js";

const client = new Client();

client.on("messageCreate", async (msg) => {
  // 转发到 Gateway
  await gatewayClient.sendMessage(msg);
});
```

### 消息标准化

所有通道消息都需要转换为标准格式:
```typescript
type InboundMessage = {
  from: string;           // 发件人 ID
  to: string;            // 接收方 ID
  text: string;          // 消息文本
  channel: "whatsapp" | "telegram" | "discord" | ...;
  threadId?: string;     // 对话线程 ID
  attachments?: Attachment[];
};
```

---

## 存储和记忆系统

### 会话存储

位置: `src/config/sessions.ts`

```typescript
// 加载会话
const session = await loadSessionStore(sessionKey);

// 保存会话
await saveSessionStore(sessionKey, updatedSession);

// 会话文件位置（根据配置自动选择）
// 优先级：
// 1. 使用环境变量 MOLTBOT_STATE_DIR 或 CLAWDBOT_STATE_DIR（如果设置）
// 2. 如果 ~/.moltbot 存在，使用 ~/.moltbot/agents/{agentId}/sessions/{sessionId}.jsonl
// 3. 否则使用默认的 ~/.clawdbot/agents/{agentId}/sessions/{sessionId}.jsonl

// 实际路径示例：
// ~/.clawdbot/agents/default/sessions/main.jsonl
// ~/.clawdbot/agents/default/sessions/session-uuid.jsonl
// ~/.moltbot/agents/default/sessions/session-uuid.jsonl
```

### 消息存储

```typescript
// 消息以 JSONL 格式存储
// 每行一个消息对象

// 格式:
{
  "role": "user" | "assistant" | "tool",
  "content": string | object[],
  "timestamp": number,
  "metadata": { ... }
}
```

### 向量存储（记忆搜索）

位置: `src/memory/`

```typescript
// 向量存储用于语义搜索旧消息
// 支持多种后端:
// - SQLite + sqlite-vec
// - Hybrid (SQLite + embeddings)

// 使用:
const memoryManager = new MemoryManager(config);

// 添加消息到向量存储
await memoryManager.addMessage(sessionKey, message);

// 搜索相似消息
const similar = await memoryManager.search(sessionKey, query);
```

### 配置存储

位置: `~/.moltbot/openclaw.json`

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-3-5-sonnet",
      "thinkingDefault": "medium"
    }
  },
  "channels": {
    "whatsapp": { "enabled": true },
    "telegram": { "botToken": "..." }
  },
  "browser": { "enabled": true },
  "logging": { "level": "info" }
}
```

---

## 实战步骤

### 第一步：理解项目结构

关键目录:
```
src/
├── gateway/           # 网关服务器 ⭐
├── agents/           # Agent 运行时系统 ⭐
├── channels/         # 多通道适配器
├── commands/         # CLI 命令
├── config/           # 配置管理
├── memory/           # 存储和记忆
├── web/              # WhatsApp Web 相关
├── cli/              # CLI 框架
└── auto-reply/       # 自动回复逻辑
```

### 第二步：本地开发环境

```bash
# 克隆项目
git clone https://github.com/moltbot/moltbot.git
cd moltbot

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 开发模式（自动重载）
pnpm gateway:watch
```

### 第三步：创建自己的 Agent 配置

编辑 `~/.moltbot/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-3-5-sonnet",
      "workspace": "~/.moltbot/workspace",
      "thinkingDefault": "high"
    },
    "custom_agent": {
      "model": "anthropic/claude-3-5-sonnet",
      "workspace": "~/.moltbot/workspaces/custom"
    }
  },
  "channels": {
    "whatsapp": { "enabled": true },
    "telegram": { "botToken": "YOUR_TOKEN" }
  }
}
```

### 第四步：实现自定义工具

创建 `src/agents/tools/my-custom-tool.ts`:

```typescript
import type { Tool } from "../pi-tools.js";

export const myCustomTool: Tool = {
  name: "my_custom_tool",
  description: "Description of what your tool does",
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

// 执行函数
export async function executeMyCustomTool(params: {
  param1: string;
}): Promise<string> {
  // 你的实现代码
  return `Result: ${params.param1}`;
}
```

### 第五步：注册自定义工具

编辑 `src/agents/pi-tools.ts`:

```typescript
import { myCustomTool, executeMyCustomTool } from "./tools/my-custom-tool.js";

export function createMoltbotTools(context: ToolContext): Tool[] {
  const tools: Tool[] = [];

  // 添加你的自定义工具
  tools.push(myCustomTool);

  // 其他工具...

  return tools;
}

// 添加执行处理
export async function invokeTool(name: string, input: unknown): Promise<string> {
  if (name === "my_custom_tool") {
    return await executeMyCustomTool(input as { param1: string });
  }

  // 其他工具处理...
}
```

### 第六步：测试你的 Agent

```bash
# 启动 Gateway
pnpm moltbot gateway --port 18789 --verbose

# 在另一个终端，运行 Agent
pnpm moltbot agent --message "Test my custom tool" --thinking high

# 查看日志输出
tail -f ~/.moltbot/logs/gateway.log
```

---

## 常见模式和最佳实践

### 1. 添加新的 RPC 方法

位置: `src/gateway/server-methods/custom.ts`

```typescript
export const customMethods: GatewayRequestHandlers = {
  "custom.myMethod": ({ params, respond, context }) => {
    try {
      const result = doSomething(params);
      respond(true, result);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  }
};
```

### 2. 订阅 Agent 事件

```typescript
import { onAgentEvent } from "../infra/agent-events.js";

onAgentEvent((event) => {
  if (event.type === "tool_use") {
    console.log(`Tool called: ${event.toolName}`);
  } else if (event.type === "final_answer") {
    console.log(`Final answer: ${event.text}`);
  }
});
```

### 3. 访问会话上下文

```typescript
import { loadSessionStore } from "../config/sessions.js";

const session = await loadSessionStore(sessionKey);
const messages = session.messages;
const model = session.model;
```

---

## 调试技巧

### 启用详细日志

```bash
# 设置日志级别
export LOGLEVEL=debug
pnpm moltbot gateway --verbose
```

### 查看日志文件

```bash
# 实时查看
tail -f ~/.moltbot/logs/gateway.log

# 搜索错误
grep -i "error" ~/.moltbot/logs/gateway.log
```

### 使用 TypeScript 调试器

```bash
# 使用 VSCode 调试
node --inspect-brk ./dist/cli/program.js gateway --port 18789
```

---

## 资源和文档

- 📖 官方文档: https://docs.molt.bot
- 🔧 配置参考: https://docs.molt.bot/gateway/configuration
- 🛠️ 工具开发: https://docs.molt.bot/tools
- 💬 Discord 社区: https://discord.gg/clawd
- 📝 API 参考: 查看 `src/gateway/server-methods/`

---

## 下一步

根据你的目标选择：

1. **添加新通道**: 查看 `src/channels/` 了解如何集成新的通讯平台
2. **自定义工具**: 查看 `src/agents/tools/` 创建新的能力
3. **修改 Agent 逻辑**: 查看 `src/agents/pi-embedded-runner.ts` 理解核心逻辑
4. **优化存储**: 查看 `src/memory/` 改进记忆和搜索
5. **扩展网关**: 查看 `src/gateway/server-methods/` 添加新功能

祝你开发愉快！如有问题，欢迎在 Discord 社区提问。

