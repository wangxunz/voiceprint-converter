// pages/index/index.js - 声纹录制主页
const VoiceprintRecorder = require('../../utils/recorder')
const Storage = require('../../utils/storage')
const API = require('../../utils/api')

Page({
  data: {
    voiceprintReady: false,
    voiceprintCreateTime: '',
    voiceprintDuration: 0,
    recording: false,
    recordTime: '00:00',
    recordProgress: 0,
    uploading: false,
    uploadProgress: 0,
    uploadStatus: '',
    pitchShift: 0
  },

  recorder: null,

  onLoad() {
    this.recorder = new VoiceprintRecorder().init()
    this.recorder.on('tick', (d) => {
      this.setData({
        recordTime: d.formatted,
        recordProgress: Math.min(100, (d.elapsed / 60000) * 100)
      })
    })
    this.recorder.on('stop', (res) => {
      this.setData({ recording: false, recordTime: '00:00' })
      if (res.tempFilePath) this._uploadVoiceprint(res)
    })
    this.recorder.on('error', (err) => {
      console.error('录制错误:', err)
      this.setData({ recording: false })
      wx.showToast({ title: '录制失败', icon: 'error' })
    })
  },

  onShow() {
    const vp = Storage.getVoiceprint()
    if (vp) {
      this.setData({
        voiceprintReady: true,
        voiceprintCreateTime: this._fmtDate(vp.updateTime || vp.createTime),
        voiceprintDuration: vp.duration || 0
      })
    }
    const app = getApp()
    if (app.globalData.voiceprintReady && !vp) {
      this.setData({ voiceprintReady: true })
    }
  },

  startRecord() {
    this.setData({ recording: true, recordTime: '00:00', recordProgress: 0 })
    this.recorder.start({
      duration: 60000,
      sampleRate: 44100,
      format: 'wav',
      bitRate: 192000,
      channels: 1
    })
  },

  stopRecord() {
    this.recorder.stop()
  },

  async _uploadVoiceprint(res) {
    this.setData({
      uploading: true,
      uploadProgress: 20,
      uploadStatus: '正在上传音频...'
    })

    const duration = res.duration ? Math.floor(res.duration / 1000) : 0
    if (duration < 5) {
      this.setData({ uploading: false })
      wx.showToast({ title: '录制时间太短，请至少录制 5 秒', icon: 'none' })
      return
    }

    try {
      this.setData({ uploadProgress: 40, uploadStatus: '正在提取声纹特征...' })
      const result = await API.uploadVoiceprint(res.tempFilePath, duration)
      
      this.setData({ uploadProgress: 90, uploadStatus: '声纹建模中...' })
      
      // 模拟建模延迟
      await new Promise(r => setTimeout(r, 1500))
      
      const vpData = {
        voiceprintId: result.voiceprintId,
        duration: duration,
        createTime: Date.now()
      }
      Storage.saveVoiceprint(vpData)
      
      const app = getApp()
      app.saveVoiceprint(vpData)
      
      this.setData({
        uploading: false,
        voiceprintReady: true,
        voiceprintCreateTime: this._fmtDate(Date.now()),
        voiceprintDuration: duration
      })
      
      wx.showToast({ title: '声纹录制成功！', icon: 'success' })
    } catch (err) {
      console.error('上传失败:', err)
      this.setData({ uploading: false })
      wx.showToast({ title: err.message || '上传失败，请重试', icon: 'error' })
    }
  },

  reRecord() {
    wx.showModal({
      title: '重新录制',
      content: '将覆盖现有声纹，确认重新录制？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ voiceprintReady: false })
          Storage.removeVoiceprint()
          getApp().clearVoiceprint()
        }
      }
    })
  },

  onPitchChange(e) {
    this.setData({ pitchShift: e.detail.value })
    wx.setStorageSync('defaultPitchShift', e.detail.value)
  },

  _fmtDate(ts) {
    const d = new Date(ts)
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${M}-${day} ${h}:${m}`
  },

  onUnload() {
    if (this.recorder) this.recorder.destroy()
  }
})