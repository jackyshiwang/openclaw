import { runEmbeddedPiAgent } from "../pi-embedded-runner.js";
import { loadConfig } from "../../config/config.js";
import { resolveSessionTranscriptPath } from "../../config/sessions/paths.js";
import { resolveMoltbotAgentDir } from "../agent-paths.js";
import { MOMEN_SYSTEM_PROMPT } from "../chensi/prompt.js";
import { getDailyQuestion } from "../chensi/tools.js";
import path from "node:path";
import os from "node:os";

/**
 * 晨思 (Chensi) MVP 运行脚本
 * 模拟一次完整的晨间反思流程
 */
async function runChensiFlow() {
  console.log("🌅 正在启动晨思 (Momen)...");

  // 1. 加载配置
  const config = await loadConfig();
  const primaryModel = config?.agents?.defaults?.model?.primary || "openai/gpt-4o";
  const [provider, model] = primaryModel.includes("/")
    ? primaryModel.split("/")
    : ["openai", primaryModel];

  // 2. 准备会话
  const sessionId = "chensi-mvp-" + Date.now();
  const sessionKey = "chensi-mvp";
  const sessionFile = resolveSessionTranscriptPath(sessionId);
  const workspaceDir = path.join(os.homedir(), ".moltbot", "workspace");
  const agentDir = resolveMoltbotAgentDir();

  // 3. 获取今日问题 (模拟 Tool 调用)
  console.log("🔍 正在从题库中抽取今日问题...");
  const question = await getDailyQuestion();
  console.log(`\n🤖 Momen: 早安！${question.level_1}`);
  console.log(`   [维度: ${question.dimension} | 深度: ${question.depth}]`);

  // 4. 模拟用户回答 (在真实 App 中这里是用户输入)
  // 为了演示，我们这里硬编码一个回答，或者你可以改为 process.stdin 读取
  const userResponse = "昨天晚上我特意放下手机，陪孩子读了半小时绘本，感觉很平静。";
  console.log(`\n👤 用户: ${userResponse}`);

  // 5. 构建 Prompt
  // 我们将问题和用户回答组合成 Prompt 发送给 Agent
  const prompt = `
当前问题：${question.level_1}
问题深度：${question.depth}
用户回答：${userResponse}

请根据你的 Momen 人设进行回应。如果需要追问，请追问。如果可以结束，请生成洞察卡片。
`;

  // 6. 运行 Agent
  console.log("\n⏳ Momen 正在思考...");
  const result = await runEmbeddedPiAgent({
    sessionId,
    sessionKey,
    sessionFile,
    workspaceDir,
    agentDir,
    config,
    prompt: prompt, // 用户输入 + 上下文
    // 注入 Momen 的 System Prompt
    extraSystemPrompt: MOMEN_SYSTEM_PROMPT,
    provider,
    model,
    timeoutMs: 30000,
    runId: "run-" + Date.now(),
  });

  // 7. 输出结果
  if (result.payloads && result.payloads.length > 0) {
    console.log("\n🤖 Momen 回应：");
    for (const payload of result.payloads) {
      if (payload.text) {
        console.log(payload.text);
      }
    }
  }
}

// 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  runChensiFlow().catch(console.error);
}
