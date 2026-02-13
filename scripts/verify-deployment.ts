import { User } from '../src/models/User.js';
import { Question } from '../src/models/Question.js';
import { ReflectionBackup } from '../src/models/ReflectionBackup.js';
import { MomenAIService } from '../src/services/MomenAIService.js';
import sequelize from '../src/models/index.js';
import { Goal } from '../src/models/Goal.js';

const API_BASE = 'http://127.0.0.1:3000';

async function runVerification() {
  console.log("🚀 Starting Deployment Verification...\n");

  let allPass = true;

  // --- 1. DB Connection & Schema Check ---
  try {
    await sequelize.authenticate();
    console.log("✅ [PASS] DB Connection: Successfully connected to database.");

    // Sync database to ensure tables exist
    await sequelize.sync();
    console.log("✅ [PASS] DB Schema: Database synced successfully.");

    // Check tables by counting (will throw if table doesn't exist)
    await User.count();
    await Question.count();
    await ReflectionBackup.count();
    await Goal.count();
    console.log("✅ [PASS] DB Schema: All required tables (User, Question, ReflectionBackup, Goal) exist.");
  } catch (error) {
    console.error(`❌ [FAIL] DB Connection/Schema:`, error);
    allPass = false;
  }

  // --- 2. Seed Data Check ---
  try {
    const count = await Question.count();
    if (count >= 50) {
      console.log(`✅ [PASS] Seed Data: Found ${count} questions in database (Expected 50+).`);
    } else {
      console.error(`❌ [FAIL] Seed Data: Only found ${count} questions. Did you run the seed script?`);
      allPass = false;
    }
  } catch (error) {
    console.error(`❌ [FAIL] Seed Data Check:`, error);
    allPass = false;
  }

  // --- 3. AI Connectivity Check ---
  try {
    console.log("⏳ Testing AI Connectivity (this may take a few seconds)...");
    // Mock data for AI service
    const userId = 99999;
    const mockGoals = [{ content: "Test Goal", category: "life" } as any];
    const mockQuestion = { dimension: "Test", content: "Hello" } as any;
    const sessionId = `verify-${Date.now()}`;

    const result = await MomenAIService.chatWithMomen(
      userId,
      "Hello, are you there?",
      mockGoals,
      mockQuestion,
      sessionId
    );

    if (result && result.response && result.response.length > 0) {
      console.log("✅ [PASS] AI Connectivity: Received response from AI Service.");
    } else {
      console.error("❌ [FAIL] AI Connectivity: Received empty response.");
      allPass = false;
    }
  } catch (error) {
    console.error(`❌ [FAIL] AI Connectivity: ${error.message}`);
    allPass = false;
  }

  // --- 4. API Simulation ---
  console.log("\n--- API Simulation (Requires Server Running on Port 3000) ---");

  // Helper for fetch
  const apiCall = async (method: string, path: string, body?: any) => {
    try {
      const opts: any = { method };
      if (body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(`${API_BASE}${path}`, opts);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text.substring(0, 100)}`);
      }
      return await res.json();
    } catch (e) {
      throw e;
    }
  };

  // 4.0 GET /health
  try {
    const data = await apiCall('GET', '/health');
    if (data && data.status === 'ok') {
      console.log("✅ [PASS] API: GET /health is OK.");
    } else {
      throw new Error("Invalid health response");
    }
  } catch (error) {
    console.error(`❌ [FAIL] API: GET /health - ${error.message}`);
    allPass = false;
  }

  // 4.1 GET /api/daily-question
  try {
    const data = await apiCall('GET', '/api/daily-question?userId=99999');
    if (data && data.content) {
      console.log("✅ [PASS] API: GET /api/daily-question returned valid question.");
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error(`❌ [FAIL] API: GET /api/daily-question - ${error.message}`);
    if (error.message.includes("fetch failed")) {
      console.warn("   ⚠️  Is the server running? (npm start / start-chensi-server.sh)");
    }
    allPass = false;
  }

  // 4.2 POST /api/chat
  try {
    const payload = {
      userId: 99999,
      message: "Testing API flow",
      sessionId: `api-test-${Date.now()}`
    };
    const data = await apiCall('POST', '/api/chat', payload);
    if (data && data.response) {
      console.log("✅ [PASS] API: POST /api/chat returned valid response.");
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error(`❌ [FAIL] API: POST /api/chat - ${error.message}`);
    allPass = false;
  }

  // 4.3 POST /api/sync/upload
  try {
    const payload = {
      userId: 99999,
      reflections: [
        {
          local_id: "test-local-id-1",
          content: { text: "Test reflection" },
          tags: ["test"]
        }
      ]
    };
    const data = await apiCall('POST', '/api/sync/upload', payload);
    if (data && data.success) {
      console.log("✅ [PASS] API: POST /api/sync/upload successful.");
    } else {
      throw new Error("Response success is not true");
    }
  } catch (error) {
    console.error(`❌ [FAIL] API: POST /api/sync/upload - ${error.message}`);
    allPass = false;
  }

  console.log("\n---------------------------------------------------");
  if (allPass) {
    console.log("🎉 ALL SYSTEMS GO! Ready for deployment.");
    process.exit(0);
  } else {
    console.log("💥 Verification FAILED. Check logs above.");
    process.exit(1);
  }
}

runVerification();

