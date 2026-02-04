import { runEmbeddedPiAgent } from "../pi-embedded-runner.js";
import { loadConfig } from "../../config/config.js";
import { resolveSessionTranscriptPath } from "../../config/sessions/paths.js";
import { resolveMoltbotAgentDir } from "../agent-paths.js";
import path from "node:path";
import os from "node:os";

/**
 * 简单示例：运行一个 Agent 来说出它的名字
 *
 * 使用 OpenAI 的 GPT-4o 模型
 *
 * 需要配置 OpenAI API 密钥，可以通过以下方式之一：
 * 1. 设置环境变量：export OPENAI_API_KEY="sk-..."
 * 2. 在配置文件中指定：~/.moltbot/moltbot.json 中的 models.providers.openai.apiKey
 *
 * 运行示例：
 *   export OPENAI_API_KEY="your-api-key"
 *   node dist/agents/examples/hello-world.js
 */
async function runHelloWorldAgent() {
  // 1. 加载配置
  const config = await loadConfig();

  // 2. 从配置或环境变量获取模型信息
  const primaryModel = config?.agents?.defaults?.model?.primary || "openai/gpt-4o";
  const [provider, model] = primaryModel.includes("/")
    ? primaryModel.split("/")
    : ["openai", primaryModel];

  // 3. 准备会话参数
  const sessionId = "hello-world-" + Date.now();
  const sessionKey = "hello-world";
  const sessionFile = resolveSessionTranscriptPath(sessionId);
  const workspaceDir = path.join(os.homedir(), ".moltbot", "workspace");
  const agentDir = resolveMoltbotAgentDir(); // 获取正确的 agent 目录

  // 4. 运行 Agent
  const result = await runEmbeddedPiAgent({
    sessionId,
    sessionKey,
    sessionFile,
    workspaceDir,
    agentDir, // 指定 agent 目录，系统会从这里查找 API 密钥配置
    config,
    prompt: "Hello! What is your name?",
    provider, // 从配置中提取提供者
    model, // 从配置中提取模型
    timeoutMs: 30000,
    runId: "run-" + Date.now(),
  });

  // 4. 处理结果
  console.log("Run metadata:", result.meta);
  if (result.payloads && result.payloads.length > 0) {
    for (const payload of result.payloads) {
      if (payload.text) {
        console.log("Assistant:", payload.text);
      }
    }
  }
  if (result.meta.pendingToolCalls && result.meta.pendingToolCalls.length > 0) {
    console.log("Tool calls:", result.meta.pendingToolCalls);
  }

  return result;
}

// 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  runHelloWorldAgent().catch(console.error);
}
