const STORAGE_KEY = 'MOMEN_REFLECTIONS';
const { request } = require('./request');

const StorageManager = {
  /**
   * Save a new reflection record
   * @param {Object} content - The reflection content (e.g., insight card, conversation summary)
   * @param {Array} tags - Tags for the reflection (e.g., ['Happiness', 'Work'])
   */
  saveReflection: (content, tags = []) => {
    const reflections = wx.getStorageSync(STORAGE_KEY) || [];
    const newRecord = {
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      content: content,
      tags: tags,
      synced: false
    };

    reflections.unshift(newRecord); // Add to the beginning
    wx.setStorageSync(STORAGE_KEY, reflections);
    return newRecord;
  },

  /**
   * Save or update today's reflection record
   * @param {Object} content - The reflection content
   * @param {Array} tags - Tags
   */
  saveOrUpdateToday: (content, tags = []) => {
    const reflections = wx.getStorageSync(STORAGE_KEY) || [];
    const today = new Date().toISOString().split('T')[0];
    const index = reflections.findIndex(item => item.date === today);

    if (index !== -1) {
      // Update existing
      reflections[index].content = content;
      reflections[index].tags = tags;
      reflections[index].timestamp = Date.now();
      reflections[index].synced = false; // Mark as unsynced on update
      wx.setStorageSync(STORAGE_KEY, reflections);
      return reflections[index];
    } else {
      // Create new
      const newRecord = {
        id: generateUUID(),
        date: today,
        timestamp: Date.now(),
        content: content,
        tags: tags,
        synced: false
      };
      reflections.unshift(newRecord);
      wx.setStorageSync(STORAGE_KEY, reflections);
      return newRecord;
    }
  },

  /**
   * Get all reflections
   */
  getReflections: () => {
    return wx.getStorageSync(STORAGE_KEY) || [];
  },

  /**
   * Get reflections filtered by tag
   * @param {String} tag
   */
  getReflectionsByTag: (tag) => {
    const reflections = wx.getStorageSync(STORAGE_KEY) || [];
    if (!tag) return reflections;
    return reflections.filter(item => item.tags && item.tags.includes(tag));
  },

  /**
   * Sync unsynced records to the cloud
   */
  syncToCloud: async () => {
    const reflections = wx.getStorageSync(STORAGE_KEY) || [];
    const unsynced = reflections.filter(item => !item.synced);

    if (unsynced.length === 0) {
      return { success: true, count: 0 };
    }

    const userId = wx.getStorageSync('userId'); // Assuming userId is stored
    if (!userId) {
      console.error('Cannot sync: No userId found');
      return { success: false, error: 'No userId' };
    }

    try {
      const payload = unsynced.map(item => ({
        local_id: item.id,
        content: {
          ...item.content,
          date: item.date,
          tags: item.tags
        }
      }));

      const res = await request({
        url: '/api/sync/upload',
        method: 'POST',
        data: {
          userId: userId,
          reflections: payload
        }
      });

      if (res.success) {
        // Mark as synced
        const updatedReflections = reflections.map(item => {
          if (!item.synced) {
            return { ...item, synced: true };
          }
          return item;
        });
        wx.setStorageSync(STORAGE_KEY, updatedReflections);
        return { success: true, count: unsynced.length };
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error };
    }
  }
};

// Helper to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = StorageManager;

