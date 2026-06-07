// pages/history/history.js - 变声历史
const Storage = require('../../utils/storage')

Page({
  data: { history: [] },

  onShow() {
    const history = Storage.getHistory()
    history.forEach(item => {
      item.createTimeText = this._fmtDate(item.createdAt)
    })
    this.setData({ history })
  },

  openPlayer(e) {
    const taskId = e.currentTarget.dataset.taskid
    const name = e.currentTarget.dataset.name
    wx.navigateTo({
      url: `/pages/player/player?taskId=${taskId}&songName=${encodeURIComponent(name || '')}`
    })
  },

  clearAll() {
    wx.showModal({
      title: '确认清空',
      content: '将删除所有变声历史记录',
      confirmColor: '#d63031',
      success: (res) => {
        if (res.confirm) {
          Storage.clearHistory()
          this.setData({ history: [] })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  _fmtDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${M}-${day} ${h}:${m}`
  }
})