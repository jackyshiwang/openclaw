import { MOMEN_SYSTEM_PROMPT } from "../agents/chensi/prompt.js";
import { Goal } from "../models/Goal.js";
import { Question } from "../models/Question.js";
import { runEmbeddedPiAgent } from "../agents/pi-embedded-runner.js";
import { loadConfig } from "../config/config.js";
import { resolveSessionTranscriptPath } from "../config/sessions/paths.js";
import { resolveMoltbotAgentDir } from "../agents/agent-paths.js";
import path from "node:path";
import os from "node:os";

export class MomenAIService {
  /**
   * Generates the dynamic system prompt by injecting user context.
   */
  static generatePrompt(userGoals: Goal[], currentQuestion: Question | null): string {
    let prompt = MOMEN_SYSTEM_PROMPT;

    // Inject Goals
    if (userGoals.length > 0) {
      const goalsText = userGoals.map((g) => `- ${g.content} (${g.category})`).join("\n");
      prompt += `\n\n# 今日用户背景\n用户今年的目标:\n${goalsText}\n\n在对话中自然地关心这些目标,但不要刻意追问.`;
    }

    // Inject Current Question Context (if starting a session)
    if (currentQuestion) {
      prompt += `\n\n# 当前晨思问题\n维度: ${currentQuestion.dimension}\n问题: ${currentQuestion.content}`;
    }

    return prompt;
  }

  /**
   * Chats with Momen AI.
   * Uses the existing Moltbot `runEmbeddedPiAgent` infrastructure.
   */
  static async chatWithMomen(
    userId: number,
    userMessage: string,
    userGoals: Goal[],
    currentQuestion: Question | null,
    sessionId: string,
  ): Promise<{ response: string; insightCard: any | null }> {
    // 1. Prepare Configuration
    const config = await loadConfig();
    const primaryModel = config?.agents?.defaults?.model?.primary || "openai/gpt-4o";
    const [provider, model] = primaryModel.includes("/")
      ? primaryModel.split("/")
      : ["openai", primaryModel];

    const sessionKey = sessionId;
    const sessionFile = resolveSessionTranscriptPath(sessionId);
    const workspaceDir = path.join(os.homedir(), ".moltbot", "workspace");
    const agentDir = resolveMoltbotAgentDir();

    // 2. Build Dynamic System Prompt
    const systemPrompt = this.generatePrompt(userGoals, currentQuestion);

    // 3. Run Agent
    console.log(`[MomenAIService] Running agent for session: ${sessionId}`);

    try {
      const result = await runEmbeddedPiAgent({
        sessionId,
        sessionKey,
        sessionFile,
        workspaceDir,
        agentDir,
        config,
        prompt: userMessage,
        extraSystemPrompt: systemPrompt, // Inject our dynamic prompt
        provider,
        model,
        timeoutMs: 60000,
        runId: "run-" + Date.now(),
      });

      // 4. Parse Response
      let replyText = "";
      let insightCard = null;

      if (result.payloads) {
        for (const payload of result.payloads) {
          if (payload.text) {
            replyText += payload.text + "\n";

            // Try to extract JSON Insight Card
            // The prompt instructs the AI to output JSON in a code block
            const jsonMatch = payload.text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              try {
                insightCard = JSON.parse(jsonMatch[1]);
              } catch (e) {
                console.warn("[MomenAIService] Failed to parse insight card JSON", e);
              }
            }
          }
        }
      }

      return {
        response: replyText.trim(),
        insightCard,
      };
    } catch (error) {
      console.error("[MomenAIService] Error running agent:", error);
      throw new Error("Failed to communicate with Momen AI");
    }
  }
}
