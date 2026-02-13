const StorageManager = require('../../utils/storage-manager');

Page({
  data: {
    reflections: [],
    filterTag: '', // 'Happiness', 'Work', etc.
    isRefreshing: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // Refresh data when page is shown (in case new records were added)
    this.loadData();
  },

  loadData() {
    const { filterTag } = this.data;
    const data = StorageManager.getReflectionsByTag(filterTag);
    this.setData({
      reflections: data
    });
  },

  // Filter by tag (e.g., Happiness Journal)
  setFilter(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ filterTag: tag }, () => {
      this.loadData();
    });
  },

  // Pull to Refresh -> Trigger Sync
  async onPullDownRefresh() {
    this.setData({ isRefreshing: true });

    wx.showNavigationBarLoading();

    try {
      const result = await StorageManager.syncToCloud();
      if (result.success) {
        wx.showToast({
          title: `同步成功 (${result.count})`,
          icon: 'success'
        });
        // Reload data to update sync status UI if needed
        this.loadData();
      } else {
        wx.showToast({
          title: '同步失败',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      this.setData({ isRefreshing: false });
    }
  }
});

