# 🚀 Moltbot 快速开始指南

## ✅ 配置完成

你的 OpenAI API 密钥已配置在以下位置：
- `/Users/jackyxie/.moltbot/agents/default/agent/auth-profiles.json`
- `/Users/jackyxie/.moltbot/agents/main/agent/auth-profiles.json`

环境变量在：
- `/Users/jackyxie/.moltbot/.env`

## 🎯 快速运行示例

### 方式 1：使用 alias（最简单）
```bash
# 运行 Hello World 示例
moltbot-hello
```

### 方式 2：直接运行脚本
```bash
/Users/jackyxie/Documents/GitHub/moltbot/run-hello-world.sh
```

### 方式 3：手动运行（需要加载环境变量）
```bash
source ~/.moltbot/.env
cd ~/Documents/GitHub/moltbot
node dist/agents/examples/hello-world.js
```

## 📁 便捷命令

配置了以下 alias（在 `~/.zshrc` 中）：

| 命令 | 作用 |
|------|------|
| `moltbot-hello` | 运行 Hello World 示例 |
| `moltbot-cd` | 进入 Moltbot 项目目录 |
| `moltbot-sessions` | 查看所有会话文件 |

## 🔄 环境变量自动加载

`.zshrc` 已配置为自动加载 `~/.moltbot/.env` 中的环境变量，所以每次打开新终端时 `OPENAI_API_KEY` 都会被加载。

## 📝 预期输出

运行示例后，你应该看到类似的输出：
```
Run metadata: { ... }
Assistant: Hello! I'm Moltbot, your personal assistant. How can I assist you today?
```

## 🛠️ 开发工作流

1. **编辑代码**：修改 `src/agents/examples/hello-world.ts` 或其他文件
2. **构建项目**：
   ```bash
   moltbot-cd
   pnpm build
   ```
3. **运行测试**：
   ```bash
   moltbot-hello
   ```

## 📚 下一步

- 查看 `/Users/jackyxie/Documents/GitHub/moltbot/LEARNING_GUIDE.md` 了解架构
- 查看 `/Users/jackyxie/Documents/GitHub/moltbot/AGENT_EXAMPLES.md` 了解更多示例
- 查看 `/Users/jackyxie/Documents/GitHub/moltbot/QUICK_REFERENCE.md` 了解 API 参考

## 🔐 安全提示

- **不要**提交 `auth-profiles.json` 到 Git（已在 `.gitignore` 中）
- **不要**分享你的 `.env` 文件或 API 密钥
- 如果 API 密钥泄露，请立即在 OpenAI 控制台重新生成

