import 'dotenv/config';

// Default to localhost if not provided, but user should provide it
const REMOTE_URL = process.env.REMOTE_URL || 'http://127.0.0.1:3000';

async function runRemoteVerification() {
  console.log(`🚀 Starting Remote Verification against: ${REMOTE_URL}\n`);

  if (REMOTE_URL.includes('127.0.0.1') || REMOTE_URL.includes('localhost')) {
    console.warn("⚠️  WARNING: You are testing against LOCALHOST. Set REMOTE_URL env var to test cloud.");
  }

  let allPass = true;

  // Helper for fetch
  const apiCall = async (method: string, path: string, body?: any) => {
    try {
      const opts: any = { method };
      if (body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(`${REMOTE_URL}${path}`, opts);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text.substring(0, 100)}`);
      }
      return await res.json();
    } catch (e) {
      throw e;
    }
  };

  // --- 1. Health Check ---
  try {
    console.log("⏳ Checking Health Endpoint...");
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

  // --- 2. Daily Question (Database Check) ---
  try {
    console.log("⏳ Checking Database Connectivity (Daily Question)...");
    const data = await apiCall('GET', '/api/daily-question?userId=99999');
    if (data && data.content) {
      console.log("✅ [PASS] API: GET /api/daily-question returned valid question.");
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error(`❌ [FAIL] API: GET /api/daily-question - ${error.message}`);
    allPass = false;
  }

  // --- 3. Chat (AI Service Check) ---
  try {
    console.log("⏳ Checking AI Service (Chat)...");
    const payload = {
      userId: 99999,
      message: "Hello from remote verification script",
      sessionId: `remote-verify-${Date.now()}`
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

  console.log("\n---------------------------------------------------");
  if (allPass) {
    console.log("✅ REMOTE SYSTEM ONLINE");
    process.exit(0);
  } else {
    console.log("💥 Remote Verification FAILED. Check logs above.");
    process.exit(1);
  }
}

runRemoteVerification();

