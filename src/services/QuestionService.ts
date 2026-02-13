import { Op } from "sequelize";
import { Question } from "../models/Question.js";
import { ReflectionBackup } from "../models/ReflectionBackup.js";
import sequelize from "../models/index.js";

export class QuestionService {
  /**
   * Selects a daily question for the user based on their history.
   * Strategy:
   * 1. Find dimensions covered in the last 7 days.
   * 2. Identify the least covered dimension.
   * 3. Pick a random question from that dimension that hasn't been asked recently (if possible).
   */
  static async getDailyQuestion(userId: number): Promise<Question | null> {
    // 1. Get recent reflections (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReflections = await ReflectionBackup.findAll({
      where: {
        user_id: userId,
        sync_time: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });

    // 2. Count dimensions
    const dimensionCounts: Record<string, number> = {
      健康: 0,
      开心: 0,
      工作: 0,
      爱: 0,
      时间: 0,
    };

    for (const reflection of recentReflections) {
      try {
        const content = JSON.parse(reflection.content_json);
        if (content.dimension && dimensionCounts.hasOwnProperty(content.dimension)) {
          dimensionCounts[content.dimension]++;
        }
      } catch (e) {
        // Ignore malformed JSON
      }
    }

    // 3. Find least covered dimension
    let minCount = Infinity;
    let targetDimension = "健康"; // Default

    // Shuffle keys to avoid bias when counts are equal
    const dimensions = Object.keys(dimensionCounts).sort(() => Math.random() - 0.5);

    for (const dim of dimensions) {
      if (dimensionCounts[dim] < minCount) {
        minCount = dimensionCounts[dim];
        targetDimension = dim;
      }
    }

    console.log(`[QuestionService] User ${userId} dimension counts:`, dimensionCounts);
    console.log(`[QuestionService] Selected target dimension: ${targetDimension}`);

    // 4. Pick a random question from this dimension
    // In a real app, we would also exclude questions asked recently.
    // For MVP, simple random selection from the dimension is sufficient.
    const questions = await Question.findAll({
      where: { dimension: targetDimension },
    });

    if (questions.length === 0) {
      // Fallback to any question if dimension is empty (shouldn't happen with seeded data)
      return Question.findOne({ order: sequelize.random() });
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }
}

// --- Verification Snippet ---

if (process.argv[1] === import.meta.filename) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log("Database connected.");

      // Mock User ID 1
      const question = await QuestionService.getDailyQuestion(1);
      console.log("Recommended Question:", question?.toJSON());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      await sequelize.close();
    }
  })();
}
