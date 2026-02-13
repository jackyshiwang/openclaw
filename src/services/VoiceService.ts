import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { loadConfig } from "../config/config.js";
import { resolveMoltbotAgentDir } from "../agents/agent-paths.js";
import { ensureAuthProfileStore } from "../agents/auth-profiles/store.js";

export class VoiceService {
  private static openai: OpenAI | null = null;

  private static async getOpenAIClient(): Promise<OpenAI> {
    if (this.openai) return this.openai;

    // Load config to find API Key
    const config = await loadConfig();
    const agentDir = resolveMoltbotAgentDir();
    const profiles = ensureAuthProfileStore(agentDir);

    // Try to find OpenAI key
    let apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Look in auth profiles
      for (const profile of Object.values(profiles.profiles)) {
        if (profile.provider === "openai" && profile.type === "api_key") {
          apiKey = profile.key;
          break;
        }
      }
    }

    if (!apiKey) {
      throw new Error(
        "OpenAI API Key not found. Please configure it in .env or auth-profiles.json",
      );
    }

    this.openai = new OpenAI({ apiKey });
    return this.openai;
  }

  /**
   * Transcribe audio file to text (ASR)
   * @param filePath Path to the audio file (mp3, wav, m4a, etc.)
   */
  static async transcribe(filePath: string): Promise<string> {
    const client = await this.getOpenAIClient();

    try {
      const transcription = await client.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        language: "zh", // Optimize for Chinese
      });
      return transcription.text;
    } catch (error) {
      console.error("[VoiceService] Transcription failed:", error);
      throw new Error("Failed to transcribe audio");
    }
  }

  /**
   * Synthesize text to speech (TTS)
   * @param text Text to speak
   * @param outputPath Path to save the audio file
   */
  static async synthesize(text: string, outputPath: string): Promise<string> {
    const client = await this.getOpenAIClient();

    try {
      const mp3 = await client.audio.speech.create({
        model: "tts-1",
        voice: "shimmer", // 'alloy', 'echo', 'fable', 'onyx', 'nova', and 'shimmer'
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(outputPath, buffer);
      return outputPath;
    } catch (error) {
      console.error("[VoiceService] Synthesis failed:", error);
      throw new Error("Failed to synthesize speech");
    }
  }
}
