import { Goal } from "../models/Goal.js";

export class GoalService {
  static async addGoal(userId: number, content: string, category: string = "life"): Promise<Goal> {
    return await Goal.create({
      user_id: userId,
      content,
      category,
    });
  }

  static async getGoals(userId: number): Promise<Goal[]> {
    return await Goal.findAll({
      where: {
        user_id: userId,
        status: "active",
      },
    });
  }

  static async completeGoal(goalId: number, userId: number): Promise<boolean> {
    const [updated] = await Goal.update(
      { status: "completed" },
      {
        where: {
          id: goalId,
          user_id: userId,
        },
      },
    );
    return updated > 0;
  }
}
