const { config } = require('../config/env.js');

const request = (options) => {
  return new Promise((resolve, reject) => {
    const fullUrl = `${config.baseUrl}${options.url}`;

    console.log('📡 Requesting:', fullUrl);

    wx.request({
      ...options,
      url: fullUrl,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.error('❌ Request failed:', res);
          reject(res);
        }
      },
      fail: (err) => {
        console.error('❌ Network error:', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  request
};

