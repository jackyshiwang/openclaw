# Moltbot Agent 实战示例

这份文档提供了一些可以直接运行的代码示例，帮助你快速上手 Moltbot 的 Agent 开发。

## 目录

1. [基础 - Hello World Agent](#基础---hello-world-agent)
2. [工具调用示例](#工具调用示例)
3. [多轮对话](#多轮对话)
4. [自定义工具](#自定义工具)
5. [处理多通道消息](#处理多通道消息)
6. [记忆和搜索](#记忆和搜索)

---

## 基础 - Hello World Agent

### 最简单的 Agent

```typescript
// 文件: src/agents/examples/hello-world.ts

import { runEmbeddedPiAgent } from "../pi-embedded.js";
import { loadConfig } from "../../config/config.js";

async function runHelloWorldAgent() {
  // 1. 加载配置
  const config = await loadConfig();

  // 2. 运行 Agent
  const result = await runEmbeddedPiAgent({
    sessionKey: "hello-world",
    userMessage: "Hello! What is your name?",
    config
  });

  // 3. 处理结果
  console.log("Assistant:", result.message);
  console.log("Tool calls:", result.toolCalls);

  return result;
}

// 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  runHelloWorldAgent().catch(console.error);
}
```

### 运行

```bash
# 编译
pnpm build

# 运行
node dist/agents/examples/hello-world.js
```

---

## 工具调用示例

### 使用浏览器工具

```typescript
// 文件: src/agents/examples/browser-example.ts

import { runEmbeddedPiAgent } from "../pi-embedded.js";
import { loadConfig } from "../../config/config.js";

async function browseSomething() {
  const config = await loadConfig();

  // 让 Agent 使用浏览器工具
  const result = await runEmbeddedPiAgent({
    sessionKey: "browser-example",
    userMessage: "Please visit https://example.com and tell me what you see",
    config,
    tools: {
      browser: true,  // 启用浏览器
      canvas: false,
      bash: false
    }
  });

  console.log("Result:", result.message);

  // 检查工具调用
  if (result.toolCalls) {
    for (const call of result.toolCalls) {
      console.log(`Tool: ${call.name}`);
      console.log(`Input: ${JSON.stringify(call.input)}`);
      console.log(`Result: ${call.result}`);
    }
  }
}
```

### 使用 Bash 工具

```typescript
// 文件: src/agents/examples/bash-example.ts

import { runEmbeddedPiAgent } from "../pi-embedded.js";

async function runBashCommands() {
  const result = await runEmbeddedPiAgent({
    sessionKey: "bash-example",
    userMessage: "List all files in the current directory and count how many TypeScript files there are",
    config: await loadConfig(),
    tools: {
      bash: true,      // 启用 bash
      browser: false,
      read: true,      // 读取文件
      write: false
    }
  });

  console.log("Result:", result.message);
  console.log("Used tools:", result.toolCalls?.map(c => c.name));
}
```

---

## 多轮对话

### 会话管理

```typescript
// 文件: src/agents/examples/multi-turn.ts

import { runEmbeddedPiAgent } from "../pi-embedded.js";
import { loadSessionStore, saveSessionStore } from "../../config/sessions.js";

async function multiTurnConversation() {
  const sessionKey = "my-conversation";

  // 对话 1
  console.log("\n--- Turn 1 ---");
  let result = await runEmbeddedPiAgent({
    sessionKey,
    userMessage: "What's your name?"
  });
  console.log("Assistant:", result.message);

  // 等待一秒
  await new Promise(r => setTimeout(r, 1000));

  // 对话 2 - Agent 会记得之前的内容
  console.log("\n--- Turn 2 ---");
  result = await runEmbeddedPiAgent({
    sessionKey,
    userMessage: "What did I just ask you?"
  });
  console.log("Assistant:", result.message);

  // 对话 3
  console.log("\n--- Turn 3 ---");
  result = await runEmbeddedPiAgent({
    sessionKey,
    userMessage: "Let me ask something else now..."
  });
  console.log("Assistant:", result.message);

  // 查看完整的会话历史
  const session = await loadSessionStore(sessionKey);
  console.log("\nTotal messages in session:", session.messages.length);
  console.log("Session model:", session.model);
}
```

---

## 自定义工具

### 第一步：定义工具

```typescript
// 文件: src/agents/tools/weather-tool.ts

import type { Tool } from "../pi-tools.types.js";

// 1. 定义工具的 schema
export const weatherTool: Tool = {
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: {
    type: "object" as const,
    properties: {
      location: {
        type: "string",
        description: "City name, e.g., 'San Francisco, CA'"
      },
      units: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        description: "Temperature units"
      }
    },
    required: ["location"]
  }
};

// 2. 实现执行函数
export async function executeWeatherTool(input: {
  location: string;
  units?: "celsius" | "fahrenheit";
}): Promise<string> {
  // 这里可以调用真实的天气 API
  // 或者 mock 数据

  const { location, units = "celsius" } = input;

  // Mock 天气数据
  const mockWeather: Record<string, { temp: number; condition: string }> = {
    "San Francisco, CA": { temp: 15, condition: "Cloudy" },
    "New York, NY": { temp: 8, condition: "Rainy" },
    "Los Angeles, CA": { temp: 22, condition: "Sunny" }
  };

  const weather = mockWeather[location] || {
    temp: Math.random() * 30,
    condition: "Unknown"
  };

  return JSON.stringify({
    location,
    temperature: weather.temp,
    unit: units,
    condition: weather.condition,
    timestamp: new Date().toISOString()
  });
}
```

### 第二步：注册工具

```typescript
// 文件: src/agents/pi-tools.ts (修改现有文件)

import { weatherTool, executeWeatherTool } from "./tools/weather-tool.js";

// 在 createMoltbotTools 函数中
export function createMoltbotTools(context: ToolContext): Tool[] {
  const tools: Tool[] = [
    weatherTool,  // 添加你的工具
    // ... 其他工具
  ];

  return tools;
}

// 在工具执行处理中
export async function invokeTool(
  name: string,
  input: unknown,
  context: InvokeContext
): Promise<string> {
  if (name === "get_weather") {
    return await executeWeatherTool(input as {
      location: string;
      units?: "celsius" | "fahrenheit"
    });
  }

  // ... 其他工具处理
}
```

### 第三步：使用工具

```typescript
// 文件: src/agents/examples/custom-tool-example.ts

import { runEmbeddedPiAgent } from "../pi-embedded.js";

async function useCustomWeatherTool() {
  const result = await runEmbeddedPiAgent({
    sessionKey: "weather-example",
    userMessage: "What's the weather like in San Francisco? Tell me in Celsius.",
    tools: {
      get_weather: true  // 启用你的自定义工具
    }
  });

  console.log("Assistant:", result.message);

  // 查看工具调用
  if (result.toolCalls) {
    for (const call of result.toolCalls) {
      if (call.name === "get_weather") {
        console.log("Tool input:", call.input);
        console.log("Tool result:", call.result);
      }
    }
  }
}
```

---

## 处理多通道消息

### 监听 WhatsApp 消息

```typescript
// 文件: src/channels/whatsapp/monitor-example.ts

import { monitorWebChannel } from "./monitor.js";
import { runEmbeddedPiAgent } from "../../agents/pi-embedded.js";

async function handleWhatsAppMessages() {
  const config = await loadConfig();

  // 监听 WhatsApp 消息
  monitorWebChannel({
    config,
    onMessage: async (message) => {
      console.log(`New message from ${message.from}: ${message.text}`);

      // 使用 Agent 处理消息
      const result = await runEmbeddedPiAgent({
        sessionKey: `whatsapp-${message.from}`,
        userMessage: message.text,
        config
      });

      // 发送回复
      await sendReplyToWhatsApp({
        to: message.from,
        text: result.message
      });
    },
    onError: (error) => {
      console.error("WhatsApp error:", error);
    }
  });
}
```

### 监听 Telegram 消息

```typescript
// 文件: src/channels/telegram/monitor-example.ts

import { Bot } from "grammy";
import { runEmbeddedPiAgent } from "../../agents/pi-embedded.js";

async function handleTelegramMessages() {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

  bot.on("message", async (ctx) => {
    const userId = ctx.from!.id;
    const messageText = ctx.message.text || "";

    console.log(`Telegram message from ${userId}: ${messageText}`);

    // 使用 Agent 处理
    const result = await runEmbeddedPiAgent({
      sessionKey: `telegram-${userId}`,
      userMessage: messageText
    });

    // 发送回复
    await ctx.reply(result.message);
  });

  await bot.start();
}
```

### 监听 Discord 消息

```typescript
// 文件: src/channels/discord/monitor-example.ts

import { Client, IntentsBitField } from "discord.js";
import { runEmbeddedPiAgent } from "../../agents/pi-embedded.js";

async function handleDiscordMessages() {
  const client = new Client({
    intents: [
      IntentsBitField.Flags.DirectMessages,
      IntentsBitField.Flags.MessageContent
    ]
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    console.log(`Discord message from ${message.author}: ${message.content}`);

    // 使用 Agent 处理
    const result = await runEmbeddedPiAgent({
      sessionKey: `discord-${message.author.id}`,
      userMessage: message.content
    });

    // 发送回复
    await message.reply(result.message);
  });

  await client.login(process.env.DISCORD_TOKEN);
}
```

---

## 记忆和搜索

### 使用向量搜索

```typescript
// 文件: src/agents/examples/memory-search-example.ts

import { MemoryManager } from "../../memory/manager.js";
import { runEmbeddedPiAgent } from "../pi-embedded.js";
import { loadConfig } from "../../config/config.js";

async function useMemorySearch() {
  const config = await loadConfig();
  const sessionKey = "memory-example";

  // 创建内存管理器
  const memory = new MemoryManager(config);

  // 进行几次对话以积累历史
  console.log("\n--- 建立对话历史 ---");
  const messages = [
    "I like pizza and pasta",
    "My favorite color is blue",
    "I work as a software engineer"
  ];

  for (const msg of messages) {
    console.log(`User: ${msg}`);
    const result = await runEmbeddedPiAgent({
      sessionKey,
      userMessage: msg,
      config
    });
    console.log(`Assistant: ${result.message}\n`);

    // 添加到向量存储
    await memory.addMessage(sessionKey, {
      role: "user",
      content: msg,
      timestamp: Date.now()
    });
  }

  // 现在进行相关查询
  console.log("\n--- 搜索相关的历史 ---");

  // 搜索与"食物"相关的对话
  const foodResults = await memory.search(sessionKey, "food");
  console.log("Searching for 'food':");
  for (const result of foodResults) {
    console.log(`- ${result.content} (score: ${result.score})`);
  }

  // 搜索与"工作"相关的对话
  const workResults = await memory.search(sessionKey, "work");
  console.log("\nSearching for 'work':");
  for (const result of workResults) {
    console.log(`- ${result.content} (score: ${result.score})`);
  }

  // 让 Agent 使用搜索结果
  console.log("\n--- 使用记忆进行智能对话 ---");
  const searchResults = await memory.search(sessionKey, "color");
  const context = searchResults.map(r => r.content).join("; ");

  const finalResult = await runEmbeddedPiAgent({
    sessionKey,
    userMessage: `Based on what I told you earlier (${context}), what should I paint my room?`,
    config
  });
  console.log("Assistant:", finalResult.message);
}
```

### 手动管理会话历史

```typescript
// 文件: src/agents/examples/session-history-example.ts

import { loadSessionStore, saveSessionStore } from "../../config/sessions.js";

async function manageSessionHistory() {
  const sessionKey = "history-example";

  // 1. 加载会话
  const session = await loadSessionStore(sessionKey);

  // 2. 查看历史
  console.log("Session info:");
  console.log("- ID:", session.sessionId);
  console.log("- Messages:", session.messages.length);
  console.log("- Model:", session.model);
  console.log("- Created:", session.created);

  // 3. 列出消息
  console.log("\nMessage history:");
  for (let i = 0; i < session.messages.length; i++) {
    const msg = session.messages[i];
    console.log(`${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
  }

  // 4. 修改会话（例如删除旧消息）
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20); // 只保留最近 20 条
    console.log("\nTrimmed history to last 20 messages");

    // 保存更改
    await saveSessionStore(sessionKey, session);
  }

  // 5. 导出会话为文本
  let textExport = `Session History: ${sessionKey}\n`;
  textExport += `Created: ${session.created}\n`;
  textExport += `Model: ${session.model}\n\n`;

  for (const msg of session.messages) {
    textExport += `${msg.role.toUpperCase()}:\n${msg.content}\n\n`;
  }

  console.log("\nSession exported:");
  console.log(textExport);
}
```

---

## 进阶：创建 Agent 服务

### 完整的 Agent 服务

```typescript
// 文件: src/agents/examples/agent-service.ts

import type { GatewayRequestContext } from "../../gateway/server-methods/types.js";
import { runEmbeddedPiAgent } from "../pi-embedded.js";
import { loadSessionStore } from "../../config/sessions.js";

/**
 * 完整的 Agent 服务示例
 * 可以集成到 Gateway RPC 方法中
 */
export class AgentService {
  async processUserMessage(
    sessionKey: string,
    userMessage: string,
    options: {
      thinking?: boolean;
      tools?: string[];
      model?: string;
    } = {}
  ) {
    try {
      // 1. 验证会话
      const session = await loadSessionStore(sessionKey);
      if (!session) {
        throw new Error(`Session not found: ${sessionKey}`);
      }

      // 2. 准备 Agent 选项
      const agentOptions = {
        sessionKey,
        userMessage,
        config: await loadConfig(),
        model: options.model || session.model,
        thinking: options.thinking ? "enabled" : undefined,
        tools: options.tools
      };

      // 3. 运行 Agent
      const result = await runEmbeddedPiAgent(agentOptions);

      // 4. 处理结果
      return {
        success: true,
        message: result.message,
        toolCalls: result.toolCalls,
        sessionKey,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        sessionKey
      };
    }
  }

  async getSessions() {
    // 列出所有会话
    // 实现细节...
  }

  async createSession(options: {
    name?: string;
    model?: string;
    agentId?: string;
  } = {}) {
    // 创建新会话
    // 实现细节...
  }

  async deleteSession(sessionKey: string) {
    // 删除会话
    // 实现细节...
  }
}

// 使用示例
const agentService = new AgentService();

const result = await agentService.processUserMessage(
  "my-session",
  "What can you do?",
  { thinking: true }
);

console.log(result);
```

---

## 调试技巧

### 打印调试信息

```typescript
// 在你的代码中添加调试日志
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("my-agent");

log.info("Starting agent run", { sessionKey });
log.debug("Agent config", { model, tools });
log.warn("Low memory warning");
log.error("Agent error", { error });
```

### 检查工具调用

```typescript
// 查看 Agent 调用了哪些工具
const result = await runEmbeddedPiAgent({
  sessionKey,
  userMessage: "Do something"
});

if (result.toolCalls) {
  console.log("Tools called:");
  for (const call of result.toolCalls) {
    console.log(`- ${call.name}`);
    console.log(`  Input:`, JSON.stringify(call.input, null, 2));
    console.log(`  Result:`, call.result);
  }
}
```

---

## 完整示例：AI 助手聊天机器人

```typescript
// 文件: src/agents/examples/chatbot.ts

import { runEmbeddedPiAgent } from "../pi-embedded.js";
import { loadConfig } from "../../config/config.js";
import * as readline from "readline";

class AIChatBot {
  private sessionKey: string;

  constructor(sessionKey: string = "chatbot") {
    this.sessionKey = sessionKey;
  }

  async chat(userMessage: string): Promise<string> {
    const config = await loadConfig();

    const result = await runEmbeddedPiAgent({
      sessionKey: this.sessionKey,
      userMessage,
      config,
      tools: {
        bash: true,
        read: true,
        browser: true
      }
    });

    return result.message;
  }

  async interactiveMode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("AI Chat Bot (type 'exit' to quit)");
    console.log("================================\n");

    const askQuestion = () => {
      rl.question("You: ", async (input) => {
        if (input.toLowerCase() === "exit") {
          console.log("Goodbye!");
          rl.close();
          return;
        }

        try {
          const response = await this.chat(input);
          console.log(`\nAssistant: ${response}\n`);
        } catch (error) {
          console.error("Error:", error);
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}

// 运行 chatbot
if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new AIChatBot("interactive-chatbot");
  await bot.interactiveMode();
}
```

### 运行 Chatbot

```bash
# 编译
pnpm build

# 运行
node dist/agents/examples/chatbot.js

# 然后开始输入：
# You: Hello!
# Assistant: Hi there! How can I help you today?
# You: What's the weather?
# Assistant: I can help check weather, but I need a location...
```

---

## 测试你的 Agent

### 编写测试

```typescript
// 文件: src/agents/examples/agent.test.ts

import { describe, it, expect } from "vitest";
import { runEmbeddedPiAgent } from "../pi-embedded.js";

describe("Agent Examples", () => {
  it("should handle basic conversation", async () => {
    const result = await runEmbeddedPiAgent({
      sessionKey: "test-basic",
      userMessage: "Hello!"
    });

    expect(result.message).toBeDefined();
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("should use tools correctly", async () => {
    const result = await runEmbeddedPiAgent({
      sessionKey: "test-tools",
      userMessage: "List files in current directory"
    });

    expect(result.toolCalls?.length || 0).toBeGreaterThan(0);
  });

  it("should maintain conversation history", async () => {
    const sessionKey = "test-history";

    // 第一轮
    await runEmbeddedPiAgent({
      sessionKey,
      userMessage: "My name is Alice"
    });

    // 第二轮
    const result = await runEmbeddedPiAgent({
      sessionKey,
      userMessage: "What is my name?"
    });

    // Agent 应该记得"Alice"
    expect(result.message).toContain("Alice");
  });
});
```

### 运行测试

```bash
# 运行特定测试
pnpm test src/agents/examples/agent.test.ts

# 或 watch 模式
pnpm test:watch src/agents/examples/agent.test.ts
```

---

现在你有了完整的代码示例！下一步是选择一个感兴趣的领域开始实践。

