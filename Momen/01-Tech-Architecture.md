# 晨思 APP 技术架构设计文档

**版本**: v1.0  
**日期**: 2026年2月3日  
**基于**: Clawdbot 仓库改造

---

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                        用户端                                │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  微信小程序       │         │  Telegram Bot   │         │
│  │  (主要前端)       │         │  (备选前端)      │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
│           │  HTTPS                      │  Telegram API     │
│           ▼                             ▼                    │
│  ┌──────────────────────────────────────────────┐          │
│  │         微信云存储 (IndexedDB)                │          │
│  │  - 对话历史                                   │          │
│  │  - 用户目标                                   │          │
│  │  - 情绪标签                                   │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ RESTful API / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   阿里云服务器 (后端)                         │
│  ┌──────────────────────────────────────────┐              │
│  │          Clawdbot 改造版 (Node.js)        │              │
│  │  ┌────────────────────────────────────┐  │              │
│  │  │  会话管理模块                      │  │              │
│  │  │  - 每日新会话创建                  │  │              │
│  │  │  - 上下文维护(用户目标/历史)       │  │              │
│  │  └────────────────────────────────────┘  │              │
│  │  ┌────────────────────────────────────┐  │              │
│  │  │  AI 路由模块                       │  │              │
│  │  │  - 大模型API调用 (通义千问/Claude) │  │              │
│  │  │  - Prompt 工程(Momen人格注入)      │  │              │
│  │  └────────────────────────────────────┘  │              │
│  │  ┌────────────────────────────────────┐  │              │
│  │  │  业务逻辑模块                      │  │              │
│  │  │  - 问题库管理                      │  │              │
│  │  │  - 情绪识别                        │  │              │
│  │  │  - 金句卡片生成                    │  │              │
│  │  └────────────────────────────────────┘  │              │
│  └──────────────────────────────────────────┘              │
│                         │                                    │
│                         │ API 调用                           │
│                         ▼                                    │
│  ┌──────────────────────────────────────────┐              │
│  │         第三方服务集成层                  │              │
│  │  - 阿里云语音 (ASR/TTS)                  │              │
│  │  - Midjourney API (金句海报)             │              │
│  │  - 微信模板消息 (推送通知)               │              │
│  │  - 自建埋点系统 (数据分析)               │              │
│  └──────────────────────────────────────────┘              │
│                         │                                    │
│                         │ 云端可选备份                       │
│                         ▼                                    │
│  ┌──────────────────────────────────────────┐              │
│  │      阿里云 RDS (MySQL) - 可选            │              │
│  │  - 用户基础信息 (加密)                    │              │
│  │  - 匿名化情绪数据 (用于算法优化)          │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 外部API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI 服务商                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  通义千问     │  │   Claude      │  │   GPT-4      │     │
│  │  (阿里云)     │  │  (Anthropic)  │  │   (OpenAI)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心技术栈

### 2.1 前端技术栈 (微信小程序)

| 技术组件 | 选型 | 版本 | 用途 |
|---------|------|------|------|
| **开发框架** | 微信小程序原生 | 3.0+ | 主框架 |
| **状态管理** | MobX / Redux | 最新 | 全局状态(用户信息/会话状态) |
| **UI 组件库** | WeUI / Vant Weapp | 最新 | 基础组件 |
| **本地存储** | wx.cloud.database | - | IndexedDB封装 |
| **语音录制** | wx.getRecorderManager() | - | 原生API |
| **动画库** | WXS动画 / Lottie | - | 呼吸动画/微动效 |

### 2.2 后端技术栈 (Clawdbot 改造)

| 技术组件 | 选型 | 版本 | 用途 |
|---------|------|------|------|
| **运行时** | Node.js | 18+ LTS | Clawdbot原生环境 |
| **Web框架** | Express / Koa | 最新 | RESTful API |
| **WebSocket** | Socket.io | 4.x | 实时对话(可选) |
| **数据库** | MySQL (阿里云RDS) | 8.0+ | 云端可选备份 |
| **缓存** | Redis | 7.x | 会话缓存 |
| **AI SDK** | @alicloud/dysmsapi20170525 | 最新 | 阿里云通义千问 |
| **日志** | Winston | 3.x | 结构化日志 |

### 2.3 第三方服务

| 服务类型 | 服务商 | SDK/API | 用途 |
|---------|--------|---------|------|
| **ASR** | 阿里云智能语音 | nls-sdk-nodejs | 语音转文字 |
| **TTS** | 阿里云智能语音 | nls-sdk-nodejs | AI问题语音播报 |
| **图片生成** | Midjourney | midjourney-api | 金句卡片海报 |
| **推送通知** | 微信订阅消息 | 小程序云开发 | 定时提醒 |
| **埋点** | 自建 | - | 用户行为统计 |

---

## 3. 数据模型设计

### 3.1 本地存储 (微信小程序 IndexedDB)

#### 表1: 用户信息表 (users)
```json
{
  "user_id": "wx_openid_xxxxx",
  "nickname": "张三",
  "avatar": "https://...",
  "created_at": "2026-02-03T09:00:00Z",
  "settings": {
    "reminder_time": "07:30",
    "enable_voice": true,
    "theme": "light"
  }
}
```

#### 表2: 对话记录表 (conversations)
```json
{
  "conversation_id": "uuid-v4",
  "user_id": "wx_openid_xxxxx",
  "session_date": "2026-02-03",
  "messages": [
    {
      "role": "assistant",
      "content": "早安,张三!昨天最让你感到温暖的时刻是什么?",
      "timestamp": "2026-02-03T07:30:00Z"
    },
    {
      "role": "user",
      "content": "昨天朋友请我吃火锅",
      "emotion": "positive",
      "timestamp": "2026-02-03T07:31:00Z"
    }
  ],
  "summary": {
    "quote": "友谊的温暖,在热气腾腾的火锅中升腾",
    "emotion_tag": "gratitude",
    "ai_insight": "共享美食的时刻,往往也是情感连接最深的时刻"
  },
  "is_synced": false
}
```

#### 表3: 用户目标表 (goals)
```json
{
  "goal_id": "uuid-v4",
  "user_id": "wx_openid_xxxxx",
  "year": 2026,
  "category": "work", // work | life
  "title": "每周运动3次",
  "description": "保持健康体魄",
  "created_at": "2026-01-01T00:00:00Z",
  "progress": [
    {
      "week": "2026-W05",
      "completed": 2,
      "target": 3
    }
  ]
}
```

### 3.2 云端备份 (可选 - MySQL)

#### 表1: 匿名化情绪数据 (emotion_analytics)
```sql
CREATE TABLE emotion_analytics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  anonymous_user_id VARCHAR(64), -- 哈希后的用户ID
  emotion_tag VARCHAR(32), -- gratitude|achievement|relationship|meaning|self_care
  sentiment_score FLOAT, -- -1.0 ~ 1.0
  conversation_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (conversation_date)
);
```

---

## 4. 核心功能模块设计

### 4.1 会话管理模块

**功能职责:**
- 每天自动创建新会话 (session_date 为唯一标识)
- 维护多轮对话上下文
- 在会话中注入用户目标信息

**关键代码逻辑:**
```javascript
class SessionManager {
  async getOrCreateDailySession(userId) {
    const today = new Date().toISOString().split('T')[0];
    let session = await this.findSession(userId, today);
    
    if (!session) {
      // 创建新会话,注入用户目标上下文
      const userGoals = await this.getUserGoals(userId);
      session = await this.createSession(userId, today, {
        system_prompt: this.buildSystemPrompt(userGoals)
      });
    }
    
    return session;
  }
  
  buildSystemPrompt(userGoals) {
    return `你是Momen,一位温暖耐心的智慧长者...
    用户今年的目标包括: ${userGoals.map(g => g.title).join(', ')}
    在对话中自然地关心这些目标的进展.`;
  }
}
```

### 4.2 问题库管理模块

**功能职责:**
- 存储50+个积极心理学问题
- 根据用户历史回答避免重复
- 智能推荐问题(结合用户目标和情绪趋势)

**数据结构:**
```javascript
const questionBank = [
  {
    id: 1,
    category: "gratitude",
    text: "昨天发生了什么让你微笑的小事?",
    weight: 1.0 // 推荐权重
  },
  // ... 50+ questions
];

function selectDailyQuestion(userId, questionHistory, userGoals) {
  // 1. 排除最近7天问过的问题
  // 2. 根据用户目标类别加权 (如目标是运动,倾向问自我关怀类问题)
  // 3. 随机选择
}
```

### 4.3 情绪识别模块

**功能职责:**
- 调用AI模型分析用户回答的情绪倾向
- 返回情绪标签和情感分数

**实现方案:**
```javascript
async function analyzeEmotion(userMessage) {
  const prompt = `分析以下文本的情绪倾向,返回JSON格式:
  {
    "emotion": "positive|neutral|negative",
    "tag": "gratitude|achievement|anxiety|sadness|joy",
    "score": 0.8, // -1.0 ~ 1.0
    "keywords": ["朋友", "温暖"]
  }
  
  文本: ${userMessage}`;
  
  const response = await aiClient.chat(prompt);
  return JSON.parse(response);
}
```

### 4.4 金句卡片生成模块

**流程:**
1. 用户完成晨思对话后,AI总结生成金句
2. 调用 Midjourney API 生成配图
3. 在小程序本地合成卡片(文字+图片)

**技术实现:**
- **方案A (推荐)**: 小程序 Canvas API 绘制卡片,无需外部API
- **方案B**: 后端合成图片后返回URL

**Canvas 绘制示例:**
```javascript
// 小程序端
const ctx = wx.createCanvasContext('quoteCanvas');

// 1. 绘制背景 (Midjourney生成的图片)
ctx.drawImage(bgImagePath, 0, 0, 750, 1200);

// 2. 添加半透明遮罩
ctx.setFillStyle('rgba(0,0,0,0.3)');
ctx.fillRect(0, 0, 750, 1200);

// 3. 绘制金句文字
ctx.setFontSize(48);
ctx.setFillStyle('#FFFFFF');
ctx.fillText('友谊的温暖,在热气腾腾的火锅中升腾', 50, 500);

// 4. 添加日期和坚持天数
ctx.setFontSize(28);
ctx.fillText('2026年2月3日 | 已坚持 23 天', 50, 1100);

ctx.draw();
```

---

## 5. Clawdbot 改造方案

### 5.1 需要保留的模块

```
clawdbot/
├── src/
│   ├── core/
│   │   ├── ai/
│   │   │   ├── client.ts          ✅ 保留 - AI客户端抽象层
│   │   │   ├── router.ts          ✅ 保留 - 多模型路由
│   │   │   └── prompt.ts          ✅ 保留 - Prompt模板引擎
│   │   ├── session/
│   │   │   ├── manager.ts         ✅ 保留并改造 - 会话管理
│   │   │   └── context.ts         ✅ 保留 - 上下文维护
│   │   └── logger.ts              ✅ 保留 - 日志系统
│   ├── integrations/
│   │   ├── telegram/              ❌ 删除 (不需要)
│   │   ├── discord/               ❌ 删除
│   │   ├── whatsapp/              ❌ 删除
│   │   └── wechat/                ➕ 新增 - 微信小程序适配器
│   └── api/
│       └── server.ts              ✅ 保留并改造 - Express服务器
```

### 5.2 新增模块

```
src/
├── modules/
│   ├── question-bank/
│   │   ├── manager.ts             ➕ 问题库管理
│   │   └── selector.ts            ➕ 问题推荐算法
│   ├── emotion/
│   │   └── analyzer.ts            ➕ 情绪分析
│   ├── quote/
│   │   └── generator.ts           ➕ 金句生成
│   └── goal/
│       └── tracker.ts             ➕ 目标追踪
├── services/
│   ├── aliyun-asr.ts              ➕ 阿里云语音服务
│   └── midjourney.ts              ➕ Midjourney集成
└── config/
    └── momen-persona.ts           ➕ Momen人格配置
```

### 5.3 核心改造点

#### 改造1: 会话管理逻辑

**原Clawdbot逻辑:**
- 支持连续多日的长对话
- 会话ID与渠道(Telegram/Discord)绑定

**晨思改造:**
- 每天创建新会话 (session_date 为主键)
- 会话上下文注入用户目标和历史情绪

```diff
// src/core/session/manager.ts

class SessionManager {
-  async getSession(channelId: string): Promise<Session> {
-    return this.sessions.get(channelId);
-  }

+  async getDailySession(userId: string): Promise<Session> {
+    const today = new Date().toISOString().split('T')[0];
+    const sessionKey = `${userId}:${today}`;
+    
+    if (!this.sessions.has(sessionKey)) {
+      const userContext = await this.buildUserContext(userId);
+      this.sessions.set(sessionKey, {
+        id: sessionKey,
+        userId,
+        date: today,
+        context: userContext,
+        messages: []
+      });
+    }
+    
+    return this.sessions.get(sessionKey);
+  }
+
+  private async buildUserContext(userId: string) {
+    // 获取用户目标、历史情绪等信息
+    const goals = await goalService.getUserGoals(userId);
+    const recentEmotions = await emotionService.getRecentTrends(userId, 7);
+    
+    return {
+      goals: goals.map(g => g.title),
+      emotionTrend: recentEmotions.averageSentiment
+    };
+  }
}
```

#### 改造2: Prompt 工程

**新增Momen人格System Prompt:**

```typescript
// src/config/momen-persona.ts

export const MOMEN_SYSTEM_PROMPT = `
# 角色设定
你是 Momen,一位温暖耐心的智慧长者,以禅意哲学的方式陪伴用户进行晨间反思.

# 核心原则
1. 不说教、不批判、不给具体建议
2. 通过提问引导用户自我探索
3. 共情用户情绪,强化正向体验
4. 语言简洁诗意,避免冗长说教

# 对话策略
- 用户积极回答时: 强化正向记忆 (如"这份温暖值得被记住")
- 用户消极回答时: 接纳情绪+轻轻转向 (如"看起来不太容易,能聊聊你是怎么撑过来的吗?")
- 用户回避时: 尊重边界,不强迫深入

# 今日用户背景
{{#if goals}}用户今年的目标: {{goals.join(', ')}}{{/if}}
{{#if emotionTrend}}最近7天情绪趋势: {{emotionTrend}}{{/if}}

在对话中自然地关心这些目标,但不要刻意追问.
`;
```

#### 改造3: API 路由设计

```typescript
// src/api/routes.ts

const router = express.Router();

// 1. 开始晨思会话
router.post('/api/v1/session/start', async (req, res) => {
  const { userId } = req.body;
  const session = await sessionManager.getDailySession(userId);
  const question = await questionBank.selectDailyQuestion(userId);
  
  res.json({
    sessionId: session.id,
    question: question.text,
    greeting: `早安, ${user.nickname}! 深呼吸三次,让我们开始今天的晨思.`
  });
});

// 2. 提交用户回答
router.post('/api/v1/session/message', async (req, res) => {
  const { sessionId, message, voiceUrl } = req.body;
  
  // 如果是语音,先转文字
  let text = message;
  if (voiceUrl) {
    text = await aliyunASR.transcribe(voiceUrl);
  }
  
  // AI生成回复
  const aiResponse = await aiClient.chat(sessionId, text);
  
  // 情绪分析
  const emotion = await emotionAnalyzer.analyze(text);
  
  // 保存到会话
  await sessionManager.addMessage(sessionId, {
    role: 'user',
    content: text,
    emotion
  });
  
  res.json({
    reply: aiResponse,
    emotion: emotion.tag,
    continueConversation: true // 是否继续对话
  });
});

// 3. 完成晨思,生成金句
router.post('/api/v1/session/complete', async (req, res) => {
  const { sessionId } = req.body;
  const session = await sessionManager.getSession(sessionId);
  
  // AI生成金句和洞察
  const summary = await quoteGenerator.generate(session.messages);
  
  // 生成卡片背景图 (调用Midjourney)
  const bgImageUrl = await midjourneyService.generate({
    prompt: `warm morning scene, zen style, soft colors, ${summary.keywords.join(', ')}`
  });
  
  res.json({
    quote: summary.quote,
    insight: summary.insight,
    bgImageUrl,
    consecutiveDays: await userService.getConsecutiveDays(session.userId)
  });
});

// 4. 历史记录查询
router.get('/api/v1/history', async (req, res) => {
  const { userId, startDate, endDate, keyword, goalId } = req.query;
  
  // 从本地IndexedDB查询 (小程序端实现)
  // 或从云端备份查询 (如果用户开启云同步)
  
  res.json({ conversations: [] });
});
```

---

## 6. 性能与安全

### 6.1 性能优化

**后端优化:**
- Redis缓存会话数据 (TTL=24小时)
- AI请求异步化,避免阻塞
- 问题库预加载到内存

**前端优化:**
- IndexedDB批量读写
- 图片懒加载
- 对话列表虚拟滚动

### 6.2 数据安全

**传输安全:**
- 全站HTTPS
- API接口JWT鉴权

**存储安全:**
- 本地数据AES加密
- 云端备份仅存储哈希后的用户ID

**隐私合规:**
- 用户明确授权后才上传数据
- 提供"一键删除所有数据"功能

---

## 7. 部署方案

### 7.1 阿里云资源清单

| 资源类型 | 规格 | 数量 | 用途 |
|---------|------|------|------|
| ECS | 2核4G | 1台 | 运行Clawdbot后端 |
| RDS MySQL | 1核2G | 1台 | 云端可选备份 |
| Redis | 256MB | 1台 | 会话缓存 |
| OSS | 标准存储 | 50GB | 存储用户生成的卡片图片 |
| CDN | - | - | 加速静态资源 |

### 7.2 CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy to Aliyun

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker Image
        run: docker build -t chensi-backend:latest .
      - name: Push to Aliyun Registry
        run: |
          docker tag chensi-backend:latest registry.aliyuncs.com/chensi/backend:latest
          docker push registry.aliyuncs.com/chensi/backend:latest
      - name: Deploy to ECS
        run: |
          ssh root@your-ecs-ip "docker pull registry.aliyuncs.com/chensi/backend:latest && docker-compose up -d"
```

---

## 8. 监控与运维

### 8.1 关键指标监控

- **业务指标**: 日活用户数、晨思完成率、平均对话轮次
- **技术指标**: API响应时间、AI调用成功率、错误率
- **成本指标**: AI Token消耗量、存储占用

### 8.2 日志采集

```javascript
// 结构化日志示例
logger.info('session_started', {
  userId: 'wx_xxxxx',
  sessionId: 'uuid',
  timestamp: Date.now()
});

logger.info('ai_response_generated', {
  sessionId: 'uuid',
  model: 'qwen-max',
  tokens: 345,
  latency: 1200 // ms
});
```

---

## 附录: 技术风险评估

| 风险项 | 概率 | 影响 | 缓解措施 |
|-------|------|------|---------|
| AI服务不稳定 | 中 | 高 | 多模型备份(通义千问+Claude) |
| 微信小程序审核不通过 | 低 | 高 | 提前准备隐私协议,避免敏感词 |
| Midjourney API限流 | 中 | 中 | 使用本地Canvas绘制方案作为备选 |
| 用户数据量过大导致性能问题 | 低 | 中 | 本地存储+定期归档策略 |

---

**文档结束**