import express from "express";
import bodyParser from "body-parser";
import { QuestionService } from "../services/QuestionService.js";
import { MomenAIService } from "../services/MomenAIService.js";
import { GoalService } from "../services/GoalService.js";
import { VoiceService } from "../services/VoiceService.js";
import { EmotionService } from "../services/EmotionService.js";
import { ReflectionBackup } from "../models/ReflectionBackup.js";
import { User } from "../models/User.js";
import { Op } from "sequelize";
import sequelize from "../models/index.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" }); // Temp storage for audio uploads
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "10mb" })); // Increased limit for sync uploads
app.use(express.static("public")); // Serve static files for testing

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "chensi-api-v2" });
});

// --- 1. Daily Question ---
app.get("/api/daily-question", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // In a real scenario, we might use last_question_ids from the client to avoid duplicates.
    // For now, QuestionService uses server-side history (ReflectionBackup) to determine the best question.
    const question = await QuestionService.getDailyQuestion(Number(userId));

    if (!question) {
      return res.status(404).json({ error: "No questions available" });
    }

    res.json(question);
  } catch (error) {
    console.error("Error fetching daily question:", error);
    res.status(500).json({ error: "Failed to fetch daily question" });
  }
});

// --- 2. AI Chat (Stateless) ---
app.post("/api/chat", async (req, res) => {
  const { userId, message, questionContext, sessionId } = req.body;

  if (!userId || !message || !sessionId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Fetch user goals to inject into context (fail gracefully if DB is down)
    let goals: any[] = [];
    try {
      goals = await GoalService.getGoals(Number(userId));
    } catch (e) {
      console.warn("Failed to fetch goals (DB might be down), proceeding without them.");
    }

    // Call AI Service
    // Note: This is stateless in terms of DB persistence, but stateful in terms of the Agent's session file on disk.
    // The Agent runtime manages the conversation history in .moltbot/sessions/
    const result = await MomenAIService.chatWithMomen(
      Number(userId),
      message,
      goals,
      questionContext || null,
      sessionId,
    );

    res.json(result);
  } catch (error) {
    console.error("Error in chat handler:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- 3. Backup Sync (Upload) ---
app.post("/api/sync/upload", async (req, res) => {
  const { userId, reflections } = req.body;

  if (!userId || !Array.isArray(reflections)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    // Ensure user exists
    const [user] = await User.findOrCreate({
      where: { id: userId },
      defaults: { openid: `user_${userId}` }, // Mock openid for now
    });

    const savedRecords = [];

    for (const item of reflections) {
      // Upsert logic: update if local_id exists for this user, else insert
      const [record, created] = await ReflectionBackup.upsert({
        user_id: userId,
        local_id: item.local_id,
        content_json: JSON.stringify(item.content),
        sync_time: new Date(),
      });
      savedRecords.push({ local_id: item.local_id, status: "synced" });
    }

    // Update user sync time
    await user.update({ cloud_sync_time: new Date() });

    res.json({ success: true, synced: savedRecords.length });
  } catch (error) {
    console.error("Error syncing upload:", error);
    res.status(500).json({ error: "Sync failed" });
  }
});

// --- 4. Restore (Download) ---
app.get("/api/sync/download", async (req, res) => {
  const { userId, since } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const whereClause: any = { user_id: userId };

    if (since) {
      whereClause.sync_time = { [Op.gt]: new Date(String(since)) };
    }

    const backups = await ReflectionBackup.findAll({
      where: whereClause,
      order: [["sync_time", "ASC"]],
    });

    const reflections = backups.map((b) => ({
      local_id: b.local_id,
      content: JSON.parse(b.content_json),
      sync_time: b.sync_time,
    }));

    res.json({ reflections });
  } catch (error) {
    console.error("Error syncing download:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

// --- 5. User Goals ---
app.get("/api/goals", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const goals = await GoalService.getGoals(Number(userId));
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

app.post("/api/goals", async (req, res) => {
  const { userId, content, category } = req.body;
  if (!userId || !content) return res.status(400).json({ error: "Missing required fields" });

  try {
    const goal = await GoalService.addGoal(Number(userId), content, category);
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: "Failed to create goal" });
  }
});

app.delete("/api/goals/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const success = await GoalService.completeGoal(Number(id), Number(userId));
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Goal not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

// --- 6. Voice I/O ---
app.post("/api/voice/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  try {
    const text = await VoiceService.transcribe(req.file.path);
    // Cleanup temp file
    fs.unlinkSync(req.file.path);
    res.json({ text });
  } catch (error) {
    // Cleanup temp file on error too
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.post("/api/voice/synthesize", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const fileName = `speech-${Date.now()}.mp3`;
    const publicDir = path.join(process.cwd(), "public", "audio");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    const filePath = path.join(publicDir, fileName);
    await VoiceService.synthesize(text, filePath);

    // Return URL to the audio file
    const audioUrl = `/audio/${fileName}`;
    res.json({ audioUrl });
  } catch (error) {
    res.status(500).json({ error: "Synthesis failed" });
  }
});

// --- 7. Emotion Analysis ---
app.post("/api/emotion/analyze", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const result = await EmotionService.analyze(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

// Start Server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    // Sync models (create tables if not exist)
    await sequelize.sync();
    console.log("✅ Database synced.");

    app.listen(PORT, () => {
      console.log(`🚀 Chensi API Server v2 running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    // Fallback: Start server anyway for testing without DB (optional)
    app.listen(PORT, () => console.log(`⚠️ Server running WITHOUT DB on port ${PORT}`));
  }
};

startServer();
