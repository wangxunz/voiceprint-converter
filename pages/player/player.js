// pages/player/player.js - 变声结果播放器
const API = require('../../utils/api')
const Storage = require('../../utils/storage')

Page({
  data: {
    taskId: '',
    songName: '',
    resultInfo: '',
    resultUrl: '',
    compareMode: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentTimeText: '00:00',
    durationText: '00:00',
    downloading: false,
    downloadProgress: 0,
    isSeeking: false
  },

  audioCtx: null,
  originalAudio: null,

  onLoad(options) {
    this.setData({
      taskId: options.taskId || '',
      songName: decodeURIComponent(options.songName || '变声结果')
    })
    this.audioCtx = wx.createInnerAudioContext()
    this.originalAudio = wx.createInnerAudioContext()
    this._bindEvents()
    this._loadAudio()
  },

  async _loadAudio() {
    try {
      const result = await API.getResultUrl(this.data.taskId)
      this.setData({
        resultUrl: result.resultUrl,
        duration: result.duration || 0,
        durationText: this._fmtTime(result.duration || 0),
        resultInfo: `时长 ${this._fmtTime(result.duration || 0)} · 已用你的声纹`
      })
      this.audioCtx.src = result.resultUrl
      if (result.originalUrl) {
        this.originalAudio.src = result.originalUrl
      }
    } catch (err) {
      console.error('加载失败:', err)
      // 尝试从历史记录加载
      const history = Storage.getHistory()
      const item = history.find(h => h.taskId === this.data.taskId || h.id === this.data.taskId)
      if (item && item.resultUrl) {
        this.audioCtx.src = item.resultUrl
        this.setData({ resultUrl: item.resultUrl, resultInfo: '已从本地缓存加载' })
      } else {
        wx.showToast({ title: '加载音频失败', icon: 'error' })
      }
    }
  },

  _bindEvents() {
    this.audioCtx.onPlay(() => this.setData({ isPlaying: true }))
    this.audioCtx.onPause(() => this.setData({ isPlaying: false }))
    this.audioCtx.onStop(() => this.setData({ isPlaying: false }))
    this.audioCtx.onEnded(() => {
      this.setData({ isPlaying: false, currentTime: this.data.duration })
    })
    this.audioCtx.onTimeUpdate(() => {
      if (!this.data.isSeeking) {
        const t = this.audioCtx.currentTime * 1000
        this.setData({ currentTime: t, currentTimeText: this._fmtTime(t) })
      }
    })
    this.audioCtx.onCanplay(() => {
      this.audioCtx.duration && this.setData({
        duration: this.audioCtx.duration * 1000,
        durationText: this._fmtTime(this.audioCtx.duration * 1000)
      })
    })
    this.audioCtx.onError((err) => {
      console.error('播放错误:', err)
      wx.showToast({ title: '播放失败', icon: 'error' })
    })
    this.originalAudio.onError(() => { console.log('原唱音频不可用') })
  },

  togglePlay() {
    if (this.data.isPlaying) {
      this.audioCtx.pause()
    } else {
      this.audioCtx.play()
    }
  },

  // 对比原唱
  toggleCompare() {
    const next = !this.data.compareMode
    this.setData({ compareMode: next })
    if (next) {
      this.audioCtx.pause()
      this.originalAudio.play()
    } else {
      this.originalAudio.pause()
      this.originalAudio.seek(this.audioCtx.currentTime)
      this.audioCtx.play()
    }
  },

  seekTo(e) {
    const ms = e.detail.value
    this.setData({ currentTime: ms, currentTimeText: this._fmtTime(ms), isSeeking: false })
    this.audioCtx.seek(ms / 1000)
    this.originalAudio.seek(ms / 1000)
  },

  onSeeking(e) {
    const ms = e.detail.value
    this.setData({ isSeeking: true, currentTime: ms, currentTimeText: this._fmtTime(ms) })
  },

  prevSection() {
    const t = Math.max(0, this.audioCtx.currentTime - 10)
    this.audioCtx.seek(t)
    this.originalAudio.seek(t)
  },

  nextSection() {
    const t = Math.min(this.audioCtx.duration || 0, this.audioCtx.currentTime + 10)
    this.audioCtx.seek(t)
    this.originalAudio.seek(t)
  },

  saveToLocal() {
    if (!this.data.resultUrl) return
    this.setData({ downloading: true, downloadProgress: 0 })
    
    wx.downloadFile({
      url: this.data.resultUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveFile({
            tempFilePath: res.tempFilePath,
            success: (saveRes) => {
              this.setData({ downloading: false })
              wx.showModal({
                title: '保存成功',
                content: '音频已保存到本地文件',
                showCancel: false
              })
            },
            fail: () => {
              this.setData({ downloading: false })
              wx.showToast({ title: '保存失败', icon: 'error' })
            }
          })
        }
      },
      fail: () => {
        this.setData({ downloading: false })
        wx.showToast({ title: '下载失败', icon: 'error' })
      }
    })
  },

  shareResult() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  onShareAppMessage() {
    return {
      title: `听听我用声纹唱的${this.data.songName}`,
      path: `/pages/player/player?taskId=${this.data.taskId}&songName=${encodeURIComponent(this.data.songName)}`
    }
  },

  convertAgain() {
    wx.switchTab({ url: '/pages/convert/convert' })
  },

  _fmtTime(ms) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  },

  onUnload() {
    if (this.audioCtx) this.audioCtx.destroy()
    if (this.originalAudio) this.originalAudio.destroy()
  }
})