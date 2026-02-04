import express from "express";
import bodyParser from "body-parser";
import { runEmbeddedPiAgent } from "../agents/pi-embedded-runner.js";
import { loadConfig } from "../config/config.js";
import { resolveSessionTranscriptPath } from "../config/sessions/paths.js";
import { resolveMoltbotAgentDir } from "../agents/agent-paths.js";
import { MOMEN_SYSTEM_PROMPT } from "../agents/chensi/prompt.js";
import { getDailyQuestion } from "../agents/chensi/tools.js";
import path from "node:path";
import os from "node:os";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// 简单的健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "chensi-api" });
});

// 获取今日问题接口
app.get("/api/daily-question", async (req, res) => {
  try {
    const question = await getDailyQuestion();
    res.json(question);
  } catch (error) {
    console.error("Error fetching daily question:", error);
    res.status(500).json({ error: "Failed to fetch daily question" });
  }
});

// 聊天接口
app.post("/api/chat", async (req, res) => {
  const { userId, message, questionContext } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "Missing userId or message" });
  }

  try {
    // 1. 加载配置
    const config = await loadConfig();
    const primaryModel = config?.agents?.defaults?.model?.primary || "openai/gpt-4o";
    const [provider, model] = primaryModel.includes("/")
      ? primaryModel.split("/")
      : ["openai", primaryModel];

    // 2. 准备会话 (基于 userId 和日期生成 sessionId，实现每日一会话)
    const today = new Date().toISOString().split("T")[0];
    const sessionId = `chensi-${userId}-${today}`;
    const sessionKey = sessionId;
    const sessionFile = resolveSessionTranscriptPath(sessionId);
    const workspaceDir = path.join(os.homedir(), ".moltbot", "workspace");
    const agentDir = resolveMoltbotAgentDir();

    // 3. 构建 Prompt
    let prompt = message;
    if (questionContext) {
      prompt = `
当前晨思问题：${questionContext.level_1}
问题深度：${questionContext.depth}
用户回答：${message}

请根据你的 Momen 人设进行回应。
`;
    }

    // 4. 运行 Agent
    console.log(`[Chensi] Running agent for session: ${sessionId}`);
    const result = await runEmbeddedPiAgent({
      sessionId,
      sessionKey,
      sessionFile,
      workspaceDir,
      agentDir,
      config,
      prompt,
      extraSystemPrompt: MOMEN_SYSTEM_PROMPT,
      provider,
      model,
      timeoutMs: 60000,
      runId: "run-" + Date.now(),
    });

    // 5. 提取回复
    let replyText = "";
    let insightCard = null;

    if (result.payloads) {
      for (const payload of result.payloads) {
        if (payload.text) {
          replyText += payload.text + "\n";

          // 尝试解析 Insight Card JSON
          // 注意：Agent 可能会把 JSON 放在 markdown 代码块中
          const jsonMatch = payload.text.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              insightCard = JSON.parse(jsonMatch[1]);
            } catch (e) {
              console.warn("Failed to parse insight card JSON", e);
            }
          }
        }
      }
    }

    res.json({
      reply: replyText.trim(),
      insightCard,
      meta: {
        sessionId,
        usage: result.meta.agentMeta?.usage,
      },
    });
  } catch (error) {
    console.error("Error in chat handler:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Chensi API Server running on port ${PORT}`);
});
