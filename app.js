// app.js - 声纹变声小程序
App({
  globalData: {
    voiceprintReady: false,
    voiceprintId: null,
    voiceprintDuration: 0,
    apiBaseUrl: 'http://192.168.0.159/VoicePrint',
    serverStatus: 'offline'
  },

  onLaunch() {
    console.log('声纹变声小程序启动')
    this.checkVoiceprint()
    this.checkServerStatus()
  },

  // 检查是否已录制声纹
  checkVoiceprint() {
    const vp = wx.getStorageSync('voiceprint')
    if (vp && vp.voiceprintId) {
      this.globalData.voiceprintReady = true
      this.globalData.voiceprintId = vp.voiceprintId
      this.globalData.voiceprintDuration = vp.duration || 0
    }
  },

  // 检查服务器状态
  checkServerStatus() {
    const API = require('./utils/api')
    API.health().then(res => {
      this.globalData.serverStatus = 'online'
    }).catch(() => {
      this.globalData.serverStatus = 'offline'
    })
  },

  // 保存声纹信息
  saveVoiceprint(data) {
    this.globalData.voiceprintReady = true
    this.globalData.voiceprintId = data.voiceprintId
    this.globalData.voiceprintDuration = data.duration || 0
    wx.setStorageSync('voiceprint', {
      voiceprintId: data.voiceprintId,
      duration: data.duration || 0,
      createTime: Date.now()
    })
  },

  // 清除声纹
  clearVoiceprint() {
    this.globalData.voiceprintReady = false
    this.globalData.voiceprintId = null
    wx.removeStorageSync('voiceprint')
  }
})