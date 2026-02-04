const app = getApp()

// 配置 API 地址 (本地开发时使用)
// 真机调试需要局域网 IP，或者部署到云端
const API_BASE = 'http://localhost:3000/api';

Page({
  data: {
    dailyQuestion: null,
    messages: [],
    inputValue: '',
    isLoading: false,
    toView: '',
    insightCard: null,
    userId: 'user-' + Math.floor(Math.random() * 10000) // 模拟用户ID
  },

  onLoad() {
    this.fetchDailyQuestion();
  },

  // 获取今日问题
  fetchDailyQuestion() {
    wx.request({
      url: `${API_BASE}/daily-question`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            dailyQuestion: res.data
          });
          // 添加 AI 开场白
          this.addMessage('ai', `早安！${res.data.level_1}`);
        }
      },
      fail: (err) => {
        console.error('获取问题失败', err);
        wx.showToast({ title: '网络连接失败', icon: 'none' });
      }
    });
  },

  // 输入框变化
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 发送消息
  sendMessage() {
    const content = this.data.inputValue.trim();
    if (!content || this.data.isLoading) return;

    // 1. 添加用户消息
    this.addMessage('user', content);
    this.setData({ inputValue: '', isLoading: true });

    // 2. 调用后端 API
    wx.request({
      url: `${API_BASE}/chat`,
      method: 'POST',
      data: {
        userId: this.data.userId,
        message: content,
        questionContext: this.data.dailyQuestion
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const { reply, insightCard } = res.data;

          // 添加 AI 回复
          if (reply) {
            this.addMessage('ai', reply);
          }

          // 如果有金句卡片，显示弹窗
          if (insightCard) {
            this.setData({ insightCard });
          }
        } else {
          wx.showToast({ title: 'AI 响应异常', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('发送失败', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 添加消息到列表
  addMessage(role, content) {
    const messages = this.data.messages;
    messages.push({ role, content });
    this.setData({
      messages,
      toView: `msg-${messages.length - 1}` // 滚动到底部
    });
  },

  // 关闭卡片
  closeCard() {
    this.setData({ insightCard: null });
  }
})

