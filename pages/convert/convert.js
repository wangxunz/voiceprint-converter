// pages/convert/convert.js - 变声转换页面
const API = require('../../utils/api')
const Storage = require('../../utils/storage')

Page({
  data: {
    voiceprintReady: false,
    songSelected: false,
    songFilePath: '',
    songName: '',
    songSizeText: '',
    songDuration: 0,
    pitchShift: 0,
    reverb: 20,
    fidelity: 80,
    converting: false,
    convertStep: 0,
    convertStatus: ''
  },

  onShow() {
    const vp = Storage.getVoiceprint()
    const app = getApp()
    this.setData({ voiceprintReady: !!(vp || app.globalData.voiceprintReady) })
  },

  // 选择音频文件（从聊天文件）
  chooseFromChat() {
    wx.showActionSheet({
      itemList: ['从聊天文件选择', '录制音频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this._pickFromChat()
        } else {
          this._recordSong()
        }
      }
    })
  },

  _pickFromChat() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['audio'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0]
        const name = file.tempFilePath.split('/').pop() || 'audio.mp3'
        this._setSong(file.tempFilePath, name, file.size, file.duration)
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '选择文件失败', icon: 'none' })
        }
      }
    })
  },

  _recordSong() {
    const recorder = wx.getRecorderManager()
    wx.showModal({
      title: '录制音频',
      content: '点击确定后开始录制，录制完成后自动作为歌曲进行变声',
      success: (modalRes) => {
        if (!modalRes.confirm) return
        wx.showToast({ title: '录制中...', icon: 'none', duration: 30000 })
        recorder.start({
          duration: 300000,
          sampleRate: 44100,
          numberOfChannels: 2,
          encodeBitRate: 320000,
          format: 'mp3'
        })
        recorder.onStop((res) => {
          wx.hideToast()
          if (res.tempFilePath) {
            this._setSong(res.tempFilePath, '录制_' + this._now() + '.mp3', res.fileSize || 0)
          }
        })
        recorder.onError(() => {
          wx.hideToast()
          wx.showToast({ title: '录制失败', icon: 'error' })
        })
      }
    })
  },

  _setSong(path, name, size, duration) {
    // 限制文件大小 20MB
    if (size > 20 * 1024 * 1024) {
      wx.showToast({ title: '文件不能超过 20MB', icon: 'none' })
      return
    }

    const sizeText = size < 1024 * 1024
      ? (size / 1024).toFixed(1) + ' KB'
      : (size / (1024 * 1024)).toFixed(1) + ' MB'

    this.setData({
      songSelected: true,
      songFilePath: path,
      songName: name || '未命名音频',
      songSizeText: sizeText,
      songDuration: duration || 0
    })
  },

  clearSong() {
    this.setData({
      songSelected: false,
      songFilePath: '',
      songName: '',
      songSizeText: '',
      songDuration: 0
    })
  },

  // 参数调节
  onSlider(e) { this.setData({ pitchShift: e.detail.value }) },
  onReverb(e) { this.setData({ reverb: e.detail.value }) },
  onFidelity(e) { this.setData({ fidelity: e.detail.value }) },

  // 开始转换
  async startConversion() {
    const vp = Storage.getVoiceprint()
    const voiceprintId = vp ? vp.voiceprintId : getApp().globalData.voiceprintId
    
    if (!voiceprintId) {
      wx.showToast({ title: '请先录制声纹', icon: 'none' })
      return
    }

    this.setData({
      converting: true,
      convertStep: 1,
      convertStatus: '正在上传歌曲...'
    })

    try {
      // 步骤 1: 上传歌曲
      const task = await API.submitConversion(
        voiceprintId,
        this.data.songFilePath,
        this.data.songName,
        this.data.pitchShift
      )

      // 步骤 2: 声纹匹配
      this.setData({ convertStep: 2, convertStatus: '正在匹配声纹...' })
      await this._delay(2000)

      // 步骤 3: AI 变声
      this.setData({ convertStep: 3, convertStatus: 'AI 正在变声中...' })
      
      // 轮询任务状态
      let result = null
      for (let i = 0; i < 120; i++) {
        await this._delay(3000)
        const status = await API.getTaskStatus(task.taskId)
        if (status.state === 'completed') {
          result = status
          break
        } else if (status.state === 'failed') {
          throw new Error(status.error || '变声处理失败')
        }
        this.setData({
          convertStatus: `AI 变声中... (已处理 ${status.progress || 0}%)`
        })
      }

      if (!result) throw new Error('处理超时，请重试')

      // 步骤 4: 完成
      this.setData({ convertStep: 4, convertStatus: '变声完成！' })

      // 保存历史
      Storage.addHistory({
        taskId: task.taskId,
        songName: this.data.songName,
        resultUrl: result.resultUrl,
        duration: result.duration,
        pitchShift: this.data.pitchShift,
        createdAt: Date.now()
      })

      await this._delay(1000)
      
      // 跳转到播放页
      wx.navigateTo({
        url: `/pages/player/player?taskId=${task.taskId}&songName=${encodeURIComponent(this.data.songName)}`
      })

      this.setData({ converting: false, convertStep: 0 })
    } catch (err) {
      console.error('转换失败:', err)
      this.setData({ converting: false, convertStep: 0 })
      wx.showModal({
        title: '转换失败',
        content: err.message || '请重试',
        showCancel: false
      })
    }
  },

  goToVoiceprint() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  _delay(ms) { return new Promise(r => setTimeout(r, ms)) },

  _now() {
    const d = new Date()
    return `${d.getMonth()+1}${d.getDate()}_${d.getHours()}${d.getMinutes()}${d.getSeconds()}`
  }
})