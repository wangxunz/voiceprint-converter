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
    convertStatus: '',
    recording: false
  },

  onLoad() {
    this._recorder = wx.getRecorderManager()
    this._recorder.onStop((res) => {
      this.setData({ recording: false })
      if (res.tempFilePath) {
        const size = res.fileSize || 0
        const duration = res.duration ? Math.floor(res.duration / 1000) : 0
        this._setSong(res.tempFilePath, '录制_' + this._now() + '.mp3', size, duration)
      } else {
        wx.showToast({ title: '录制失败：未获取到音频', icon: 'error' })
      }
    })
    this._recorder.onError((err) => {
      console.error('录制错误:', err)
      this.setData({ recording: false })
      wx.showToast({ title: '录制失败', icon: 'error' })
    })
  },

  onShow() {
    const vp = Storage.getVoiceprint()
    const app = getApp()
    this.setData({ voiceprintReady: !!(vp || app.globalData.voiceprintReady) })
  },

  // 开始录制
  recordAsSong() {
    this.setData({ recording: true })
    this._recorder.start({
      duration: 300000,
      sampleRate: 44100,
      numberOfChannels: 2,
      encodeBitRate: 320000,
      format: 'mp3'
    })
  },

  // 停止录制
  stopRecordSong() {
    this._recorder.stop()
  },

  // 从聊天/本地选择音频
  chooseFromChat() {
    wx.chooseMessageFile({
      count: 1,
      type: 'all',
      success: (res) => {
        const file = res.tempFiles[0]
        // type: 'all' 可能选到非音频文件，校验扩展名
        const ext = (file.name || '').split('.').pop().toLowerCase()
        const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma', 'mp4', 'opus']
        if (!audioExts.includes(ext)) {
          wx.showToast({ title: '请选择音频文件（mp3/wav/m4a 等）', icon: 'none', duration: 2500 })
          return
        }
        this._setSong(file.path, file.name, file.size)
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') !== -1) return
        console.log('[DEBUG] chooseMessageFile fail:', JSON.stringify(err))
        wx.showToast({ title: '选择失败，请用录制', icon: 'none', duration: 3000 })
      }
    })
  },

  _setSong(path, name, size, duration) {
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

    if (!this.data.songSelected || !this.data.songFilePath) {
      wx.showToast({ title: '请先选择歌曲', icon: 'none' })
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
