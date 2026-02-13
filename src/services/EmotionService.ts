import OpenAI from "openai";
import { loadConfig } from "../config/config.js";
import { resolveMoltbotAgentDir } from "../agents/agent-paths.js";
import { ensureAuthProfileStore } from "../agents/auth-profiles/store.js";

export interface EmotionResult {
  primary: string;
  intensity: number; // 1-10
  keywords: string[];
  suggestion: string;
}

export class EmotionService {
  private static openai: OpenAI | null = null;

  private static async getOpenAIClient(): Promise<OpenAI> {
    if (this.openai) return this.openai;

    const config = await loadConfig();
    const agentDir = resolveMoltbotAgentDir();
    const profiles = ensureAuthProfileStore(agentDir);

    let apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      for (const profile of Object.values(profiles.profiles)) {
        if (profile.provider === "openai" && profile.type === "api_key") {
          apiKey = profile.key;
          break;
        }
      }
    }

    if (!apiKey) {
      throw new Error("OpenAI API Key not found");
    }

    this.openai = new OpenAI({ apiKey });
    return this.openai;
  }

  static async analyze(text: string): Promise<EmotionResult> {
    const client = await this.getOpenAIClient();

    const prompt = `
      Analyze the emotion of the following text.
      Return a JSON object with:
      - primary: The primary emotion (e.g., Joy, Sadness, Anxiety, Anger, Neutral, Hope).
      - intensity: A number from 1 to 10 indicating intensity.
      - keywords: An array of 1-3 keywords related to the emotion.
      - suggestion: A short, 1-sentence psychological suggestion or comforting remark.

      Text: "${text}"
    `;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content");

      return JSON.parse(content) as EmotionResult;
    } catch (error) {
      console.error("[EmotionService] Analysis failed:", error);
      // Fallback
      return {
        primary: "Neutral",
        intensity: 5,
        keywords: [],
        suggestion: "I'm listening.",
      };
    }
  }
}
