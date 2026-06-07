// utils/recorder.js - 声纹录制管理器
class VoiceprintRecorder {
  constructor() {
    this.manager = wx.getRecorderManager()
    this.recording = false
    this.startTime = 0
    this.timer = null
    this.callbacks = {}
  }

  init() {
    this.manager.onStart(() => {
      this.recording = true
      this.startTime = Date.now()
      this._startTimer()
      this._emit('start')
    })

    this.manager.onStop((res) => {
      this.recording = false
      this._stopTimer()
      this._emit('stop', res)
    })

    this.manager.onError((err) => {
      this.recording = false
      this._stopTimer()
      this._emit('error', err)
    })

    this.manager.onFrameRecorded((res) => {
      this._emit('frame', res)
    })
    return this
  }

  start(options = {}) {
    this.manager.start({
      duration: options.duration || 60000,
      sampleRate: options.sampleRate || 44100,
      numberOfChannels: options.channels || 1,
      encodeBitRate: options.bitRate || 192000,
      format: options.format || 'wav',
      frameSize: options.frameSize || 10
    })
  }

  stop() {
    this.manager.stop()
  }

  _startTimer() {
    this._stopTimer()
    this.timer = setInterval(() => {
      const elapsed = Date.now() - this.startTime
      this._emit('tick', {
        elapsed,
        seconds: Math.floor(elapsed / 1000),
        formatted: this._fmtTime(elapsed)
      })
    }, 100)
  }

  _stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  on(event, fn) { this.callbacks[event] = fn }
  _emit(event, data) { if (this.callbacks[event]) this.callbacks[event](data) }

  _fmtTime(ms) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  getElapsed() { return this.recording ? Date.now() - this.startTime : 0 }

  destroy() {
    this._stopTimer()
    if (this.recording) this.stop()
  }
}

module.exports = VoiceprintRecorder