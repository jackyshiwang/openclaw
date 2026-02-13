const API_BASE = "http://localhost:3000/api";
const USER_ID = "test-user-" + Date.now();

async function runTest() {
  console.log("🚀 Starting Chensi Full Test...");

  // 1. 获取今日问题
  console.log("\n1. Fetching daily question...");
  const questionRes = await fetch(`${API_BASE}/daily-question`);
  const question = await questionRes.json();
  console.log("Question:", question);

  if (!question.level_1) {
    throw new Error("Failed to get question");
  }

  // 2. 发送回答
  console.log("\n2. Sending answer...");
  const chatRes = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: USER_ID,
      message: "今天感觉很充实，完成了一个重要的项目。",
      questionContext: question,
    }),
  });
  const chatData = await chatRes.json();
  console.log("Chat Response:", JSON.stringify(chatData, null, 2));

  if (!chatData.reply) {
    throw new Error("No reply from AI");
  }

  if (chatData.insightCard) {
    console.log("✅ Insight Card received!");
    if (chatData.insightCard.quote) {
      console.log("✅ Quote found:", chatData.insightCard.quote);
    } else {
      console.warn("⚠️ No quote in insight card");
    }
  } else {
    console.warn(
      "⚠️ No insight card received (this might be normal if conversation is not finished)",
    );
  }

  // 3. 获取历史记录
  console.log("\n3. Fetching history...");
  // 等待一小会儿确保文件写入
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const historyRes = await fetch(`${API_BASE}/history?userId=${USER_ID}`);
  const history = await historyRes.json();
  console.log("History:", history);

  if (Array.isArray(history) && history.length > 0) {
    console.log("✅ History found!");
  } else {
    console.warn("⚠️ No history found (check if session file was created)");
  }

  console.log("\n🎉 Test Completed!");
}

runTest().catch(console.error);
