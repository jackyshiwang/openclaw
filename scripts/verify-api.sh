#!/bin/bash
# Verify API endpoints

echo "--- 1. Testing Static File ---"
curl -I http://localhost:3000/test-client.html

echo -e "\n--- 2. Testing Daily Question ---"
curl "http://localhost:3000/api/daily-question?userId=1"

echo -e "\n--- 3. Testing Goals API ---"
# Create Goal
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "content": "Test Goal", "category": "work"}'

# List Goals
echo -e "\nListing Goals:"
curl "http://localhost:3000/api/goals?userId=1"

echo -e "\n--- 4. Testing Chat API ---"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "message": "Hello", "sessionId": "test-session"}'

echo -e "\n--- 5. Testing Voice TTS ---"
curl -X POST http://localhost:3000/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，这是一个测试"}'

echo -e "\n--- 6. Testing Emotion Analysis ---"
curl -X POST http://localhost:3000/api/emotion/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "I am feeling very happy today because I finished my work!"}'

