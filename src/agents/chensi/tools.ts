import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 获取当前文件目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "data.json");

export type Question = {
  id: number;
  dimension: string;
  category: string;
  depth: "light" | "medium" | "deep";
  level_1: string;
  level_2: string | null;
  level_3: string | null;
  tags: string[];
};

export type QuestionDatabase = {
  questions: Question[];
};

/**
 * 获取每日问题工具
 */
export async function getDailyQuestion(): Promise<Question> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const db = JSON.parse(raw) as QuestionDatabase;

    // MVP 策略：随机选择一个问题
    // 后续可升级为：基于历史记录去重、基于用户偏好加权
    const randomIndex = Math.floor(Math.random() * db.questions.length);
    return db.questions[randomIndex];
  } catch (error) {
    console.error("Failed to load questions:", error);
    // Fallback question
    return {
      id: 0,
      dimension: "开心",
      category: "小确幸",
      depth: "light",
      level_1: "昨天发生了一件什么让你开心的小事？",
      level_2: null,
      level_3: null,
      tags: ["fallback"],
    };
  }
}

/**
 * 工具定义 (供 Agent 使用)
 */
export const chensiTools = [
  {
    name: "get_daily_question",
    description: "获取今天的晨思问题，用于开启对话",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export async function executeChensiTool(name: string, args: any) {
  if (name === "get_daily_question") {
    return await getDailyQuestion();
  }
  throw new Error(`Unknown tool: ${name}`);
}
