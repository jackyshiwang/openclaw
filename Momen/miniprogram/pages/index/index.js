const app = getApp()
const StorageManager = require('../../utils/storage-manager');
const { request } = require('../../utils/request');

Page({
  data: {
    dailyQuestion: null,
    messages: [],
    inputValue: '',
    isLoading: false,
    toView: '',
    insightCard: null,
    userId: 'user-' + Math.floor(Math.random() * 10000), // 模拟用户ID
    showHistory: false,
    historyList: []
  },

  onLoad() {
    this.fetchDailyQuestion();
    // 尝试从本地存储恢复 userId，保持用户身份一致
    const storedUserId = wx.getStorageSync('userId');
    if (storedUserId) {
      this.setData({ userId: storedUserId });
    } else {
      wx.setStorageSync('userId', this.data.userId);
    }

    // 尝试加载今日的历史记录
    const reflections = StorageManager.getReflections();
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = reflections.find(r => r.date === today);

    if (todayRecord && todayRecord.content && todayRecord.content.messages) {
      this.setData({
        messages: todayRecord.content.messages,
        insightCard: todayRecord.content.insightCard || null
      });
      // 滚动到底部
      this.setData({
        toView: `msg-${todayRecord.content.messages.length - 1}`
      });
    }
  },

  // 获取历史记录
  fetchHistory() {
    request({
      url: `/api/history?userId=${this.data.userId}`,
      method: 'GET'
    }).then(data => {
      this.setData({
        historyList: data,
        showHistory: true
      });
    }).catch(err => {
      console.error('获取历史记录失败', err);
    });
  },

  // 切换历史记录显示
  toggleHistory() {
    if (!this.data.showHistory) {
      this.fetchHistory();
    } else {
      this.setData({ showHistory: false });
    }
  },

  // 获取今日问题
  fetchDailyQuestion() {
    request({
      url: '/api/daily-question',
      method: 'GET'
    }).then(data => {
      this.setData({
        dailyQuestion: data
      });
      // 添加 AI 开场白
      this.addMessage('ai', `早安！${data.level_1}`);
    }).catch(err => {
      console.error('获取问题失败', err);
      wx.showToast({ title: '网络连接失败', icon: 'none' });
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
    request({
      url: '/api/chat',
      method: 'POST',
      data: {
        userId: this.data.userId,
        message: content,
        questionContext: this.data.dailyQuestion
      }
    }).then(data => {
      const { reply, insightCard } = data;

      // 添加 AI 回复
      if (reply) {
        this.addMessage('ai', reply);
      }

      // 如果有金句卡片，显示弹窗
      if (insightCard) {
        this.setData({ insightCard });
      }

      // Local-First: 保存对话记录到本地存储
      const content = {
        messages: this.data.messages,
        insightCard: insightCard || this.data.insightCard,
        question: this.data.dailyQuestion
      };
      StorageManager.saveOrUpdateToday(content, ['Daily']);
    }).catch(err => {
      console.error('发送失败', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }).finally(() => {
      this.setData({ isLoading: false });
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

