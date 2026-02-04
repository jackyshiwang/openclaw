# Clawdbot 改造详细方案

**项目**: 晨思 APP 后端  
**基于**: Clawdbot v1.x  
**改造目标**: 从通用AI网关 → 专用晨思对话引擎

---

## 1. 改造策略总览

### 1.1 保留 vs 删除 vs 新增

| 模块类别 | 操作 | 说明 |
|---------|------|------|
| **核心AI引擎** | ✅ 保留 | 多模型路由、Prompt管理、会话上下文 |
| **社交媒体集成** | ❌ 删除 | Telegram/Discord/WhatsApp/Slack |
| **Web UI** | ❌ 删除 | 不需要网页聊天界面 |
| **API服务器** | ⚠️ 改造 | 保留Express框架,重写路由 |
| **会话管理** | ⚠️ 改造 | 改为每日新会话模式 |
| **数据库层** | ➕ 新增 | Clawdbot原生不带数据库,需新增MySQL |
| **业务逻辑** | ➕ 新增 | 问题库、情绪分析、金句生成等 |

---

## 2. 目录结构改造

### 2.1 原Clawdbot结构
```
clawdbot/
├── src/
│   ├── core/              # 核心引擎 ✅ 保留
│   │   ├── ai/           # AI客户端
│   │   ├── session/      # 会话管理
│   │   └── logger.ts     # 日志
│   ├── integrations/      # 第三方集成
│   │   ├── telegram/     # ❌ 删除
│   │   ├── discord/      # ❌ 删除
│   │   ├── whatsapp/     # ❌ 删除
│   │   └── slack/        # ❌ 删除
│   ├── ui/                # Web UI ❌ 删除
│   └── api/               # API服务器 ⚠️ 改造
├── config/
│   └── config.yaml        # ⚠️ 改造配置
└── package.json
```

### 2.2 改造后结构 (chensi-backend)
```
chensi-backend/
├── src/
│   ├── core/                    # 从Clawdbot保留
│   │   ├── ai/
│   │   │   ├── client.ts        # AI客户端抽象层
│   │   │   ├── router.ts        # 多模型路由 (通义千问/Claude)
│   │   │   └── prompt.ts        # Prompt模板引擎
│   │   ├── session/
│   │   │   ├── manager.ts       # ⚠️ 改造: 每日新会话
│   │   │   └── context.ts       # 上下文维护
│   │   └── logger.ts
│   │
│   ├── modules/                 # ➕ 新增业务模块
│   │   ├── question-bank/
│   │   │   ├── manager.ts       # 问题库管理
│   │   │   ├── selector.ts      # 问题推荐算法
│   │   │   └── data.json        # 50+问题数据
│   │   ├── emotion/
│   │   │   └── analyzer.ts      # 情绪识别
│   │   ├── quote/
│   │   │   └── generator.ts     # 金句生成
│   │   ├── goal/
│   │   │   ├── tracker.ts       # 目标追踪
│   │   │   └── planner.ts       # AI目标规划
│   │   └── user/
│   │       └── service.ts       # 用户信息管理
│   │
│   ├── services/                # ➕ 第三方服务集成
│   │   ├── aliyun/
│   │   │   ├── asr.ts           # 语音识别
│   │   │   ├── tts.ts           # 语音合成
│   │   │   └── qwen.ts          # 通义千问SDK
│   │   ├── midjourney.ts        # Midjourney API
│   │   └── wechat-push.ts       # 微信推送
│   │
│   ├── api/                     # ⚠️ 重写API路由
│   │   ├── routes/
│   │   │   ├── session.ts       # 晨思会话相关
│   │   │   ├── history.ts       # 历史记录
│   │   │   ├── goal.ts          # 目标管理
│   │   │   └── user.ts          # 用户信息
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT鉴权
│   │   │   └── error.ts         # 错误处理
│   │   └── server.ts            # Express服务器
│   │
│   ├── database/                # ➕ 数据库层
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Conversation.ts
│   │   │   └── Goal.ts
│   │   ├── migrations/          # 数据库迁移
│   │   └── connection.ts        # MySQL连接
│   │
│   └── config/                  # ⚠️ 配置文件
│       ├── momen-persona.ts     # Momen人格配置
│       ├── ai-models.ts         # AI模型配置
│       └── app.config.ts        # 应用配置
│
├── tests/                       # ➕ 测试
│   ├── unit/
│   └── integration/
│
├── scripts/                     # ➕ 工具脚本
│   ├── import-questions.ts      # 导入问题库
│   └── migrate-db.ts            # 数据库迁移
│
├── .env.example                 # 环境变量模板
├── Dockerfile                   # Docker配置
├── docker-compose.yml           # 容器编排
└── package.json
```

---

## 3. 核心模块改造详解

### 3.1 会话管理模块改造

#### 原Clawdbot逻辑
```typescript
// src/core/session/manager.ts (原版)
class SessionManager {
  private sessions = new Map<string, Session>();
  
  // 根据渠道ID获取会话 (可能跨多天)
  getSession(channelId: string): Session {
    if (!this.sessions.has(channelId)) {
      this.sessions.set(channelId, {
        id: channelId,
        messages: [],
        context: {}
      });
    }
    return this.sessions.get(channelId)!;
  }
}
```

#### 改造后逻辑
```typescript
// src/core/session/manager.ts (改造版)
import { GoalService } from '@/modules/goal/tracker';
import { EmotionService } from '@/modules/emotion/analyzer';

class SessionManager {
  private sessions = new Map<string, DailySession>();
  private goalService: GoalService;
  private emotionService: EmotionService;
  
  constructor() {
    this.goalService = new GoalService();
    this.emotionService = new EmotionService();
  }
  
  /**
   * 获取或创建今日会话
   * 关键改造: 每天创建新会话
   */
  async getDailySession(userId: string): Promise<DailySession> {
    const today = new Date().toISOString().split('T')[0]; // 2026-02-03
    const sessionKey = `${userId}:${today}`;
    
    if (!this.sessions.has(sessionKey)) {
      // 构建用户上下文
      const userContext = await this.buildUserContext(userId);
      
      this.sessions.set(sessionKey, {
        id: sessionKey,
        userId,
        date: today,
        context: userContext,
        messages: [],
        metadata: {
          startTime: Date.now(),
          questionId: null,
          emotionScore: null
        }
      });
    }
    
    return this.sessions.get(sessionKey)!;
  }
  
  /**
   * 构建用户上下文 (注入到System Prompt)
   */
  private async buildUserContext(userId: string) {
    // 获取用户年度目标
    const goals = await this.goalService.getUserGoals(userId);
    
    // 获取最近7天情绪趋势
    const recentEmotions = await this.emotionService.getRecentTrends(userId, 7);
    
    // 获取用户基本信息
    const user = await UserModel.findById(userId);
    
    return {
      userName: user.nickname,
      goals: goals.map(g => ({
        category: g.category,
        title: g.title,
        progress: g.progress
      })),
      emotionTrend: {
        average: recentEmotions.averageSentiment,
        mostFrequent: recentEmotions.mostFrequentTag
      },
      streakDays: user.consecutiveDays
    };
  }
  
  /**
   * 清理过期会话 (每天凌晨自动执行)
   */
  async cleanupOldSessions() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    for (const [key, session] of this.sessions.entries()) {
      if (session.date < yesterday) {
        // 持久化到数据库
        await this.persistSession(session);
        // 从内存删除
        this.sessions.delete(key);
      }
    }
  }
}
```

---

### 3.2 Prompt工程改造

#### 新增Momen人格配置
```typescript
// src/config/momen-persona.ts

export const MOMEN_SYSTEM_PROMPT = `
# 角色身份
你是 Momen,一位温暖耐心的智慧长者,通过禅意哲学的方式陪伴用户进行晨间反思。

# 核心原则
1. **不说教**: 避免使用"你应该""你必须"等命令式语言
2. **不批判**: 接纳用户的所有情绪,无论积极或消极
3. **不给具体建议**: 通过提问引导用户自我探索,而非直接给出答案
4. **诗意简洁**: 语言优美但不冗长,每句话不超过20字

# 对话策略
## 当用户回答积极时
- 强化正向记忆 (如"这份温暖值得被记住")
- 用诗意的语言升华体验
- 避免过度夸张的赞美

## 当用户回答消极时
- 先接纳情绪 ("看起来不太容易")
- 轻轻转向行动 ("能聊聊你是怎么撑过来的吗?")
- 避免空洞的安慰

## 当用户回避/不想说时
- 尊重边界,不强迫深入
- 用开放式的话术 ("也可以先记录下来,以后再看")

# 今日用户背景
- 用户昵称: {{userName}}
{{#if goals.length}}
- 今年的目标: {{goals.map(g => g.title).join(', ')}}
{{/if}}
{{#if emotionTrend}}
- 最近情绪: {{emotionTrend.mostFrequent}} (平均分: {{emotionTrend.average}})
{{/if}}
- 已坚持: {{streakDays}} 天

# 注意事项
- 在对话中自然地提及用户目标,但不要刻意追问
- 如果用户情绪持续低落(连续3天<0),温柔建议寻求专业帮助
- 每次对话控制在1-3轮,避免冗长
`;

/**
 * 根据用户上下文渲染System Prompt
 */
export function renderMomenPrompt(context: UserContext): string {
  // 使用Handlebars模板引擎
  const template = Handlebars.compile(MOMEN_SYSTEM_PROMPT);
  return template(context);
}
```

#### AI客户端调用示例
```typescript
// src/core/ai/client.ts

import { renderMomenPrompt } from '@/config/momen-persona';

class AIClient {
  async chat(session: DailySession, userMessage: string): Promise<string> {
    // 渲染System Prompt
    const systemPrompt = renderMomenPrompt(session.context);
    
    // 构建消息历史
    const messages = [
      { role: 'system', content: systemPrompt },
      ...session.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];
    
    // 调用AI模型
    const response = await this.modelRouter.chat({
      model: 'qwen-max', // 或 'claude-3-sonnet'
      messages,
      temperature: 0.7,
      max_tokens: 300
    });
    
    return response.content;
  }
}
```

---

### 3.3 问题库模块 (新增)

```typescript
// src/modules/question-bank/data.json

{
  "categories": {
    "gratitude": {
      "name": "感恩类",
      "questions": [
        {
          "id": 1,
          "text": "昨天发生了什么让你微笑的小事?",
          "keywords": ["小事", "微笑", "温暖"]
        },
        {
          "id": 2,
          "text": "昨天最感恩的人和触动点是什么?",
          "keywords": ["感恩", "人", "触动"]
        },
        {
          "id": 3,
          "text": "今天想对谁说声谢谢?",
          "keywords": ["谢谢", "感激"]
        },
        // ... 共10个问题
      ]
    },
    "achievement": {
      "name": "成就类",
      "questions": [
        {
          "id": 11,
          "text": "昨天你完成的一件小事是什么?",
          "keywords": ["完成", "成就"]
        },
        // ... 共10个问题
      ]
    },
    "relationship": { /* 10个问题 */ },
    "meaning": { /* 10个问题 */ },
    "self_care": { /* 10个问题 */ }
  }
}
```

```typescript
// src/modules/question-bank/selector.ts

import questionData from './data.json';

export class QuestionSelector {
  /**
   * 智能选择今日问题
   * 策略:
   * 1. 排除最近7天问过的问题
   * 2. 根据用户目标类别加权
   * 3. 根据情绪趋势调整
   */
  async selectDailyQuestion(
    userId: string,
    userContext: UserContext
  ): Promise<Question> {
    // 1. 获取用户最近7天的问题历史
    const recentQuestions = await this.getRecentQuestions(userId, 7);
    const excludeIds = recentQuestions.map(q => q.id);
    
    // 2. 获取所有可用问题
    let availableQuestions = this.getAllQuestions()
      .filter(q => !excludeIds.includes(q.id));
    
    // 3. 根据用户目标加权
    if (userContext.goals.length > 0) {
      availableQuestions = this.weightByGoals(
        availableQuestions,
        userContext.goals
      );
    }
    
    // 4. 根据情绪趋势调整
    if (userContext.emotionTrend.average < 0) {
      // 情绪低落时,多问感恩类和自我关怀类
      availableQuestions = this.boostCategories(
        availableQuestions,
        ['gratitude', 'self_care']
      );
    }
    
    // 5. 随机选择 (加权随机)
    return this.weightedRandom(availableQuestions);
  }
  
  private weightByGoals(
    questions: Question[],
    goals: Goal[]
  ): Question[] {
    // 如果用户有"运动"目标,提升self_care类问题权重
    const hasHealthGoal = goals.some(g => 
      g.title.includes('运动') || g.title.includes('健康')
    );
    
    return questions.map(q => ({
      ...q,
      weight: hasHealthGoal && q.category === 'self_care' 
        ? q.weight * 1.5 
        : q.weight
    }));
  }
}
```

---

### 3.4 情绪分析模块 (新增)

```typescript
// src/modules/emotion/analyzer.ts

export class EmotionAnalyzer {
  /**
   * 使用AI分析用户回答的情绪
   * 返回: 情绪标签、情感分数、关键词
   */
  async analyze(userMessage: string): Promise<EmotionResult> {
    const prompt = `
请分析以下文本的情绪倾向,返回JSON格式:
{
  "sentiment": "positive|neutral|negative",
  "tag": "gratitude|joy|achievement|anxiety|sadness|anger",
  "score": 0.8,  // -1.0(极度消极) 到 1.0(极度积极)
  "keywords": ["关键词1", "关键词2"],
  "confidence": 0.9 // 分析置信度
}

文本: "${userMessage}"
`;

    const response = await this.aiClient.chat(prompt);
    const result = JSON.parse(response);
    
    // 存储到数据库
    await EmotionRecord.create({
      userId,
      message: userMessage,
      ...result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  /**
   * 获取用户最近N天的情绪趋势
   */
  async getRecentTrends(userId: string, days: number) {
    const records = await EmotionRecord.findByUser(userId, days);
    
    return {
      averageSentiment: records.reduce((sum, r) => sum + r.score, 0) / records.length,
      mostFrequentTag: this.getMostFrequent(records.map(r => r.tag)),
      distribution: this.getDistribution(records)
    };
  }
}
```

---

### 3.5 API路由重写

```typescript
// src/api/routes/session.ts

import express from 'express';
import { SessionManager } from '@/core/session/manager';
import { QuestionSelector } from '@/modules/question-bank/selector';
import { EmotionAnalyzer } from '@/modules/emotion/analyzer';
import { QuoteGenerator } from '@/modules/quote/generator';
import { authMiddleware } from '@/api/middleware/auth';

const router = express.Router();
const sessionManager = new SessionManager();
const questionSelector = new QuestionSelector();
const emotionAnalyzer = new EmotionAnalyzer();
const quoteGenerator = new QuoteGenerator();

/**
 * POST /api/v1/session/start
 * 开始今日晨思
 */
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    
    // 1. 获取或创建今日会话
    const session = await sessionManager.getDailySession(userId);
    
    // 2. 检查今天是否已完成晨思
    if (session.metadata.completed) {
      return res.status(200).json({
        already_completed: true,
        message: '今天已经完成晨思啦!',
        quote: session.metadata.quote
      });
    }
    
    // 3. 选择今日问题
    const question = await questionSelector.selectDailyQuestion(
      userId,
      session.context
    );
    
    // 4. 更新会话
    session.metadata.questionId = question.id;
    
    // 5. 构建欢迎消息
    const greeting = `早安, ${session.context.userName}! 深呼吸三次,让我们开始今天的晨思.`;
    
    res.json({
      sessionId: session.id,
      greeting,
      question: question.text,
      breathingDuration: 12 // 秒
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/session/message
 * 用户发送消息
 */
router.post('/message', authMiddleware, async (req, res) => {
  try {
    const { sessionId, message, voiceUrl } = req.body;
    
    // 1. 获取会话
    const session = await sessionManager.getSession(sessionId);
    
    // 2. 如果是语音,先转文字
    let text = message;
    if (voiceUrl) {
      text = await aliyunASR.transcribe(voiceUrl);
    }
    
    // 3. 情绪分析
    const emotion = await emotionAnalyzer.analyze(text);
    
    // 4. 保存用户消息
    session.messages.push({
      role: 'user',
      content: text,
      emotion: emotion.tag,
      timestamp: Date.now()
    });
    
    // 5. AI生成回复
    const aiResponse = await sessionManager.aiClient.chat(session, text);
    
    // 6. 保存AI回复
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    });
    
    // 7. 判断是否可以结束对话 (通常1-3轮)
    const shouldEnd = session.messages.length >= 4 || aiResponse.includes('完成晨思');
    
    res.json({
      reply: aiResponse,
      emotion: emotion,
      continueConversation: !shouldEnd,
      roundCount: Math.floor(session.messages.length / 2)
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/session/complete
 * 完成晨思,生成金句
 */
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await sessionManager.getSession(sessionId);
    
    // 1. AI生成金句和洞察
    const summary = await quoteGenerator.generate(session.messages);
    
    // 2. 生成卡片背景图 (可选)
    let bgImageUrl = null;
    if (process.env.ENABLE_MIDJOURNEY === 'true') {
      bgImageUrl = await midjourneyService.generate({
        prompt: `zen morning scene, ${summary.keywords.join(', ')}, soft colors, minimalist`
      });
    }
    
    // 3. 更新用户连续天数
    const user = await UserModel.findById(session.userId);
    user.consecutiveDays += 1;
    await user.save();
    
    // 4. 标记会话已完成
    session.metadata.completed = true;
    session.metadata.quote = summary.quote;
    
    // 5. 持久化到数据库
    await ConversationModel.create({
      userId: session.userId,
      date: session.date,
      messages: session.messages,
      quote: summary.quote,
      insight: summary.insight,
      emotionScore: session.messages
        .filter(m => m.role === 'user')
        .map(m => m.emotion.score)
        .reduce((a, b) => a + b, 0) / session.messages.filter(m => m.role === 'user').length
    });
    
    res.json({
      quote: summary.quote,
      insight: summary.insight,
      bgImageUrl,
      consecutiveDays: user.consecutiveDays,
      keywords: summary.keywords
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 4. 配置文件改造

### 4.1 环境变量模板
```bash
# .env.example

# === 应用配置 ===
NODE_ENV=production
PORT=3000
APP_NAME=chensi-backend

# === 数据库配置 ===
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_NAME=chensi
DB_USER=admin
DB_PASSWORD=your_password

# === Redis配置 ===
REDIS_HOST=r-xxxxx.redis.rds.aliyuncs.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# === AI模型配置 ===
# 通义千问
QWEN_API_KEY=sk-xxxxx
QWEN_MODEL=qwen-max

# Claude (备用)
CLAUDE_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-3-sonnet-20240229

# === 阿里云服务配置 ===
ALIYUN_ACCESS_KEY_ID=LTAI5xxxxx
ALIYUN_ACCESS_KEY_SECRET=xxxxx
ALIYUN_ASR_APP_KEY=xxxxx
ALIYUN_TTS_APP_KEY=xxxxx

# === Midjourney配置 (可选) ===
ENABLE_MIDJOURNEY=false
MIDJOURNEY_API_KEY=xxxxx

# === 微信小程序配置 ===
WECHAT_APP_ID=wxxxxxxxxxxx
WECHAT_APP_SECRET=xxxxx

# === JWT配置 ===
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# === 日志配置 ===
LOG_LEVEL=info
LOG_DIR=./logs
```

---

## 5. Docker部署配置

### 5.1 Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
```

### 5.2 docker-compose.yml
```yaml
version: '3.8'

services:
  # 后端服务
  backend:
    build: .
    container_name: chensi-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  # MySQL数据库
  mysql:
    image: mysql:8.0
    container_name: chensi-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: chensi
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: chensi-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  mysql-data:
  redis-data:
```

---

## 6. 改造步骤清单

### Phase 1: 基础改造 (Week 1)
- [ ] Fork Clawdbot仓库到 `chensi-backend`
- [ ] 删除无用目录 (integrations/telegram, ui等)
- [ ] 安装新依赖 (`mysql2`, `ioredis`, `@alicloud/xxx`)
- [ ] 配置TypeScript路径别名 (`@/` → `src/`)

### Phase 2: 核心模块改造 (Week 1-2)
- [ ] 改造 `SessionManager` (每日新会话逻辑)
- [ ] 实现 `renderMomenPrompt` (人格注入)
- [ ] 新增 `QuestionSelector` 模块
- [ ] 新增 `EmotionAnalyzer` 模块

### Phase 3: API重写 (Week 2)
- [ ] 重写 `/session/*` 路由
- [ ] 实现JWT鉴权中间件
- [ ] 集成阿里云ASR/TTS服务

### Phase 4: 数据库集成 (Week 2)
- [ ] 设计数据库Schema
- [ ] 实现ORM模型 (TypeORM/Sequelize)
- [ ] 编写数据库迁移脚本

### Phase 5: 测试部署 (Week 3)
- [ ] 单元测试覆盖核心模块
- [ ] 构建Docker镜像
- [ ] 部署到阿里云ECS测试环境

---

## 7. 关键技术决策

| 决策点 | 选项A | 选项B | **最终选择** | 理由 |
|-------|-------|-------|-------------|------|
| AI模型 | 通义千问 | Claude | **通义千问主+Claude备** | 阿里云生态,延迟低 |
| ORM | TypeORM | Prisma | **TypeORM** | Clawdbot已用,保持一致 |
| 会话存储 | Redis | MySQL | **Redis(临时)+MySQL(持久)** | 性能+可靠性 |
| 语音服务 | 阿里云 | 讯飞 | **阿里云** | 与后端同一生态 |

---

**改造完成标志**:
✅ 可以通过API完成完整晨思流程  
✅ Momen人格回复符合设计  
✅ 问题推荐算法有效避免重复  
✅ 情绪分析准确率 >80%  

---

**文档版本**: v1.0  
**最后更新**: 2026年2月3日