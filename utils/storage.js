// utils/storage.js - 本地存储管理
const HISTORY_KEY = 'conversion_history'
const VOICEPRINT_KEY = 'voiceprint'

module.exports = {
  // 声纹
  getVoiceprint() {
    return wx.getStorageSync(VOICEPRINT_KEY) || null
  },
  saveVoiceprint(data) {
    wx.setStorageSync(VOICEPRINT_KEY, { ...data, updateTime: Date.now() })
  },
  removeVoiceprint() {
    wx.removeStorageSync(VOICEPRINT_KEY)
  },

  // 历史记录
  getHistory() {
    return wx.getStorageSync(HISTORY_KEY) || []
  },
  addHistory(item) {
    const list = this.getHistory()
    list.unshift({ ...item, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) })
    if (list.length > 100) list.length = 100
    wx.setStorageSync(HISTORY_KEY, list)
    return list
  },
  updateHistory(id, updates) {
    const list = this.getHistory()
    const idx = list.findIndex(item => item.id === id || item.taskId === id)
    if (idx >= 0) { list[idx] = { ...list[idx], ...updates }; wx.setStorageSync(HISTORY_KEY, list) }
    return list
  },
  deleteHistory(id) {
    const list = this.getHistory().filter(item => item.id !== id && item.taskId !== id)
    wx.setStorageSync(HISTORY_KEY, list)
    return list
  },
  clearHistory() {
    wx.setStorageSync(HISTORY_KEY, [])
  }
}