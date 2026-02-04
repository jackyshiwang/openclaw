# 晨思 APP 开发流程总指南

**项目**: 晨思 (Morning Reflection)  
**版本**: MVP v1.0  
**开发周期**: 6-8周  
**团队**: 1前端 + 1后端 + 1UI设计师

---

## 📚 文档导航

本项目包含以下核心文档:

1. **01-Tech-Architecture.md** - 技术架构设计
2. **02-Dev-Task-List.md** - 开发任务清单
3. **03-MVP-Prototype-Design.md** - UI原型设计
4. **04-Clawdbot-Refactor.md** - Clawdbot改造方案
5. **05-Development-Workflow.md** (本文档) - 开发流程总指南

---

## 🎯 MVP 核心目标

### 必须实现的功能
```
✅ 用户可以完成完整晨思流程 (问-答-生成金句)
✅ 语音输入功能正常
✅ 历史记录可查看
✅ 金句卡片可分享到朋友圈
✅ 目标设定与AI关联
```

### V1.1 延期功能
```
⏸️ 情绪趋势图表
⏸️ 深色模式
⏸️ 数据导出
⏸️ 云端备份
```

---

## 🚀 开发流程 (8周完整路径)

### Week 1: 准备阶段

#### Day 1-2: 环境搭建
```bash
# 后端
1. Fork Clawdbot 仓库
   git clone https://github.com/clawdbot/clawdbot.git chensi-backend
   cd chensi-backend

2. 删除无用模块
   rm -rf src/integrations/telegram src/integrations/discord src/ui

3. 安装新依赖
   npm install mysql2 ioredis @alicloud/dysmsapi20170525 \
               express-jwt jsonwebtoken handlebars

4. 配置环境变量
   cp .env.example .env
   # 填写阿里云/通义千问/微信小程序的key

# 前端
1. 创建微信小程序项目
   在微信开发者工具中新建项目

2. 配置云开发
   开通云开发 → 创建云环境 → 获取环境ID

3. 安装UI组件库
   npm install vant-weapp --save
```

#### Day 3-5: 核心模块改造
```typescript
// 任务: 改造SessionManager为每日新会话模式
// 文件: src/core/session/manager.ts

// 关键代码:
async getDailySession(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const sessionKey = `${userId}:${today}`;
  // ... 实现逻辑见 04-Clawdbot-Refactor.md
}
```

---

### Week 2: 基础功能开发

#### 后端任务
```javascript
// 1. 问题库模块 (BE-101)
// 文件: src/modules/question-bank/data.json
{
  "categories": {
    "gratitude": {
      "questions": [
        { "id": 1, "text": "昨天发生了什么让你微笑的小事?" },
        // ... 共50+问题
      ]
    }
  }
}

// 2. API路由实现 (BE-108, BE-109, BE-110)
// POST /api/v1/session/start     - 开始晨思
// POST /api/v1/session/message   - 发送消息
// POST /api/v1/session/complete  - 完成晨思
```

#### 前端任务
```javascript
// 1. 用户登录页 (FE-006)
// pages/login/index.js
wx.login({
  success: (res) => {
    // 发送code到后端换取JWT token
    wx.request({
      url: 'https://api.chensi.app/auth/login',
      data: { code: res.code },
      success: (data) => {
        wx.setStorageSync('token', data.token);
      }
    });
  }
});

// 2. 本地存储封装 (FE-003)
// utils/storage.js
export class Storage {
  async saveConversation(conversation) {
    const db = wx.cloud.database();
    await db.collection('conversations').add({ data: conversation });
  }
}
```

---

### Week 3-4: 核心功能深化

#### 晨思对话页开发
```javascript
// pages/chat/index.wxml
<view class="chat-container">
  <!-- 呼吸动画 -->
  <view wx:if="{{showBreathing}}" class="breathing-circle">
    <lottie-player src="/assets/breathing.json" loop autoplay />
  </view>
  
  <!-- AI问题卡片 -->
  <view class="ai-message">
    <text>{{aiQuestion}}</text>
  </view>
  
  <!-- 用户输入区 -->
  <textarea 
    placeholder="在这里输入你的想法..." 
    bindinput="onInput"
  />
  <button bindtap="onVoiceRecord">🎤 语音</button>
  <button bindtap="onSend">发送</button>
</view>
```

#### 语音录制功能
```javascript
// pages/chat/index.js
const recorderManager = wx.getRecorderManager();

onVoiceRecord() {
  recorderManager.start({
    duration: 60000, // 最长60秒
    format: 'mp3'
  });
  
  recorderManager.onStop((res) => {
    // 上传音频到云存储
    wx.cloud.uploadFile({
      cloudPath: `audio/${Date.now()}.mp3`,
      filePath: res.tempFilePath,
      success: (uploadRes) => {
        // 发送到后端转文字
        this.sendMessage(null, uploadRes.fileID);
      }
    });
  });
}
```

---

### Week 5-6: 辅助功能

#### 历史记录页 (日历视图)
```javascript
// pages/history/index.wxml
<calendar 
  markedDates="{{markedDates}}"
  bindselect="onDateSelect"
/>

<view wx:for="{{conversations}}" wx:key="id">
  <view class="quote-card">{{item.quote}}</view>
  <view class="emotion">{{item.emotion}}</view>
</view>
```

#### 目标设定页
```javascript
// pages/goal/index.wxml
<form bindsubmit="onSubmit">
  <text>工作目标 Top3</text>
  <input name="goal1" placeholder="目标1" />
  <input name="goal2" placeholder="目标2" />
  <input name="goal3" placeholder="目标3" />
  
  <text>生活目标 Top3</text>
  <input name="goal4" placeholder="目标1" />
  
  <button formType="submit">保存</button>
</form>
```

---

### Week 7: 测试与优化

#### 单元测试
```javascript
// tests/unit/question-selector.test.ts
import { QuestionSelector } from '@/modules/question-bank/selector';

describe('QuestionSelector', () => {
  test('should not repeat questions within 7 days', async () => {
    const selector = new QuestionSelector();
    const userId = 'test-user';
    
    // 模拟用户过去7天的问题
    const history = [1, 2, 3, 4, 5, 6, 7];
    
    const newQuestion = await selector.selectDailyQuestion(userId, history);
    
    expect(history).not.toContain(newQuestion.id);
  });
});
```

#### 性能测试
```bash
# 使用 Artillery 进行压力测试
artillery run load-test.yml

# load-test.yml
config:
  target: 'https://api.chensi.app'
  phases:
    - duration: 60
      arrivalRate: 20  # 每秒20个请求
scenarios:
  - flow:
      - post:
          url: '/api/v1/session/start'
          json:
            userId: '{{ $randomString() }}'
```

---

### Week 8: 上线部署

#### 服务器部署
```bash
# 1. 连接到阿里云ECS
ssh root@your-ecs-ip

# 2. 安装Docker
curl -fsSL https://get.docker.com | sh

# 3. 克隆项目
git clone https://github.com/your-org/chensi-backend.git
cd chensi-backend

# 4. 配置环境变量
cp .env.example .env
vim .env  # 填写生产环境配置

# 5. 启动服务
docker-compose up -d

# 6. 查看日志
docker-compose logs -f backend
```

#### 微信小程序审核
```
1. 打开微信开发者工具
2. 点击"上传代码" → 填写版本号和备注
3. 登录小程序后台 (mp.weixin.qq.com)
4. 提交审核 → 填写审核信息:
   - 类别: 工具 → 健康管理
   - 标签: 心理健康、日记、正念
   - 隐私政策: 附上隐私协议链接
5. 等待审核 (通常1-3天)
```

---

## 🔧 开发工具推荐

### 后端开发
```bash
# IDE
VS Code + 插件:
- TypeScript Vue Plugin (Volar)
- Prettier - Code formatter
- ESLint

# API测试
- Postman (REST API测试)
- Bruno (开源轻量级替代品)

# 数据库管理
- Navicat Premium (MySQL可视化)
- Redis Desktop Manager (Redis可视化)

# 日志查看
- docker-compose logs -f
- PM2 (生产环境进程管理)
```

### 前端开发
```bash
# IDE
微信开发者工具 Stable 版本

# 调试工具
- vConsole (移动端调试)
- 微信开发者工具 → 调试器 → Network面板

# UI设计工具
- Figma (在线协作)
- Sketch (Mac)
```

---

## 📦 依赖管理

### 后端核心依赖
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "ioredis": "^5.3.2",
    "typeorm": "^0.3.17",
    "@alicloud/dysmsapi20170525": "^3.0.0",
    "express-jwt": "^8.4.1",
    "jsonwebtoken": "^9.0.2",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "@types/express": "^4.17.17",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1",
    "jest": "^29.6.4",
    "eslint": "^8.47.0",
    "prettier": "^3.0.2"
  }
}
```

### 前端核心依赖
```json
{
  "dependencies": {
    "vant-weapp": "^1.10.22",
    "moment": "^2.29.4",
    "lottie-miniprogram": "^2.0.4"
  },
  "devDependencies": {
    "miniprogram-api-typings": "^3.12.1"
  }
}
```

---

## 🐛 常见问题解决

### 1. 微信小程序请求失败
```javascript
// 问题: request:fail url not in domain list
// 解决: 在小程序后台配置服务器域名
// 后台路径: 开发 → 开发管理 → 服务器域名
// 添加: https://api.chensi.app
```

### 2. AI响应速度慢
```javascript
// 问题: AI生成回复超过5秒
// 解决方案:
1. 使用流式响应 (Server-Sent Events)
2. 限制 max_tokens (不超过300)
3. 使用faster模型 (qwen-turbo 代替 qwen-max)

// 示例代码:
const response = await aiClient.chat({
  model: 'qwen-turbo',  // 更快的模型
  messages,
  max_tokens: 200,       // 限制长度
  stream: true           // 流式响应
});
```

### 3. 本地数据库存储超限
```javascript
// 问题: 微信小程序本地存储上限10MB
// 解决: 定期清理历史数据

// 策略: 保留最近30天,其余上传云端
async cleanOldData() {
  const db = wx.cloud.database();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  const oldRecords = await db.collection('conversations')
    .where({ timestamp: db.command.lt(thirtyDaysAgo) })
    .get();
  
  // 上传到云端
  await this.syncToCloud(oldRecords.data);
  
  // 删除本地
  await db.collection('conversations')
    .where({ timestamp: db.command.lt(thirtyDaysAgo) })
    .remove();
}
```

---

## 📊 关键指标监控

### 业务指标
```javascript
// 埋点示例
wx.reportAnalytics('morning_reflection_complete', {
  user_id: userId,
  duration: chatDuration,  // 对话时长(秒)
  round_count: roundCount, // 对话轮数
  emotion: emotionTag      // 情绪标签
});

// 关注指标:
// 1. DAU (日活跃用户数)
// 2. 完成率 = 完成晨思人数 / 打开APP人数
// 3. 平均对话轮数
// 4. 留存率 (次日/7日/30日)
```

### 技术指标
```javascript
// 后端监控 (Prometheus)
const promClient = require('prom-client');

// API响应时间
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code']
});

// AI调用次数和耗时
const aiCallDuration = new promClient.Histogram({
  name: 'ai_call_duration_ms',
  help: 'Duration of AI API calls in ms',
  labelNames: ['model', 'status']
});
```

---

## 🔐 安全检查清单

### 上线前必查
- [ ] 所有API接口都有JWT鉴权
- [ ] 用户输入已做XSS过滤
- [ ] 敏感信息(密码/token)不在日志中明文输出
- [ ] HTTPS证书有效且不过期
- [ ] 数据库密码强度足够 (至少12位,包含大小写+数字+特殊符号)
- [ ] Redis设置了密码且不对公网开放
- [ ] 阿里云安全组只开放必要端口 (80, 443, 22)
- [ ] 定期备份数据库 (每天凌晨3点自动备份)

---

## 📞 紧急联系人

| 角色 | 姓名 | 联系方式 | 负责模块 |
|------|------|---------|---------|
| 后端负责人 | [待定] | WeChat: xxx | Clawdbot改造、API开发 |
| 前端负责人 | [待定] | WeChat: xxx | 小程序开发、UI实现 |
| UI设计师 | [待定] | WeChat: xxx | 视觉设计、交互原型 |
| 运维负责人 | [待定] | WeChat: xxx | 服务器部署、监控告警 |

---

## 🎓 学习资源

### Clawdbot相关
- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Clawdbot文档](https://clawbot.dev/docs)

### 微信小程序
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

### 阿里云服务
- [通义千问API文档](https://help.aliyun.com/zh/dashscope/)
- [智能语音服务](https://help.aliyun.com/zh/isi/)

### 积极心理学
- [《真实的幸福》](https://book.douban.com/subject/1308598/) - Martin Seligman
- [哈佛幸福课](https://www.youtube.com/watch?v=8KkKuTCFvzI)

---

## ✅ 验收标准

### 功能验收
```
测试场景1: 新用户首次使用
1. 打开小程序 → 看到欢迎页 ✓
2. 点击"开始使用" → 完成微信授权 ✓
3. 进入晨思页 → 播放呼吸动画 ✓
4. 回答AI问题 → AI给出共情回应 ✓
5. 完成晨思 → 生成金句卡片 ✓
6. 点击分享 → 可发送到朋友圈 ✓

测试场景2: 老用户回顾
1. 打开"回顾"页 → 看到日历 ✓
2. 点击某个日期 → 显示当天对话 ✓
3. 点击搜索 → 可按关键词筛选 ✓
```

### 性能验收
```
- API响应时间 P95 < 500ms ✓
- 小程序首屏加载 < 2s ✓
- AI回复生成 < 3s ✓
- 语音识别准确率 > 85% ✓
```

### 安全验收
```
- 通过OWASP Top 10检查 ✓
- 通过微信小程序安全扫描 ✓
- 数据已加密存储 ✓
```

---

## 🎉 上线发布

### 发布流程
```
1. 代码冻结 (D-3天)
2. 全量测试 (D-2天)
3. 灰度发布 (D-1天, 10%用户)
4. 观察指标 (D日, 监控24小时)
5. 全量发布 (D+1日)
```

### 发布公告模板
```markdown
# 晨思 v1.0 正式发布! 🎊

每天5分钟,与自己对话,生活更幸福~

## ✨ 核心功能
- 🌅 AI引导晨间反思
- 🎙️ 语音输入,解放双手
- 📖 历史回顾,见证成长
- 🎯 目标管理,AI智能提醒

## 📥 如何使用
微信扫码体验 → [二维码]

## 💬 反馈渠道
- 微信群: [群二维码]
- 邮箱: feedback@chensi.app

期待你的反馈! ❤️
```

---

**祝开发顺利! 🚀**

如有问题,请参考对应的详细文档或联系团队成员.

---

**文档版本**: v1.0  
**最后更新**: 2026年2月3日  
**维护者**: [产品负责人]