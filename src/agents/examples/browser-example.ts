import { runEmbeddedPiAgent } from "../pi-embedded-runner.js";
import { loadConfig } from "../../config/config.js";
import { resolveSessionTranscriptPath } from "../../config/sessions/paths.js";
import { resolveMoltbotAgentDir } from "../agent-paths.js";
import path from "node:path";
import os from "node:os";

/**
 * 浏览器示例：使用 Agent 访问网页并分析内容
 *
 * 这个示例展示如何使用 browser 工具让 Agent：
 * - 访问网页
 * - 获取网页内容
 * - 分析和总结信息
 *
 * 运行示例：
 *   moltbot-hello  # 注意：请确保已配置 API 密钥
 */
async function browseSomething() {
  // 1. 加载配置
  const config = await loadConfig();

  // 2. 从配置或环境变量获取模型信息
  const primaryModel = config?.agents?.defaults?.model?.primary || "openai/gpt-4o";
  const [provider, model] = primaryModel.includes("/")
    ? primaryModel.split("/")
    : ["openai", primaryModel];

  // 3. 准备会话参数
  const sessionId = "browser-example-" + Date.now();
  const sessionKey = "browser-example";
  const sessionFile = resolveSessionTranscriptPath(sessionId);
  const workspaceDir = path.join(os.homedir(), ".moltbot", "workspace");
  const agentDir = resolveMoltbotAgentDir(); // 获取正确的 agent 目录

  // 4. 运行 Agent（启用浏览器工具）
  const result = await runEmbeddedPiAgent({
    sessionId,
    sessionKey,
    sessionFile,
    workspaceDir,
    agentDir,
    config,
    prompt: "Please visit https://hapday.app/zh/homepage/ and tell me what you see",
    provider, // 从配置中提取提供者
    model, // 从配置中提取模型
    timeoutMs: 60000, // 浏览器操作需要更长时间
    runId: "run-" + Date.now(),
  });

  // 5. 处理结果
  console.log("Run metadata:", result.meta);
  if (result.payloads && result.payloads.length > 0) {
    console.log("\n📄 Agent 回复：");
    for (const payload of result.payloads) {
      if (payload.text) {
        console.log(payload.text);
      }
    }
  }

  // 检查工具调用
  if (result.meta.pendingToolCalls && result.meta.pendingToolCalls.length > 0) {
    console.log("\n🛠️ 待执行的工具调用：");
    for (const call of result.meta.pendingToolCalls) {
      console.log(`  - ${call.name}`);
      console.log(`    参数: ${call.arguments}`);
    }
  }

  return result;
}

// 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  browseSomething().catch(console.error);
}
