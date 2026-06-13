// utils/api.js - 后端 API 接口封装 (PATH_INFO 模式)

const API = {
  // PATH_INFO 路由: baseUrl/index.php/health
  getBaseUrl() {
    const app = getApp()
    const base = (app && app.globalData && app.globalData.apiBaseUrl) 
      ? app.globalData.apiBaseUrl 
      : 'http://192.168.0.159/VoicePrint'
    return base + '/index.php'
  },

  // 上传声纹样本
  async uploadVoiceprint(filePath, duration) {
    return this._upload('/voiceprint/enroll', filePath, 'voice_sample', { duration })
  },

  // 上传歌曲，提交变声任务
  async submitConversion(voiceprintId, songFilePath, songName, pitchShift = 0) {
    return this._upload('/conversion/submit', songFilePath, 'song_file', {
      voiceprintId, songName, pitchShift
    })
  },

  // 查询任务状态
  async getTaskStatus(taskId) {
    return this._get('/conversion/status', { taskId })
  },

  // 获取转换结果下载链接
  async getResultUrl(taskId) {
    return this._get('/conversion/result', { taskId })
  },

  // 删除任务
  async deleteTask(taskId) {
    return this._post('/conversion/delete', { taskId })
  },

  // 获取历史记录
  async getHistory(page = 1, pageSize = 20) {
    return this._get('/conversion/history', { page, pageSize })
  },

  // 健康检查
  async healthCheck() {
    return this._get('/health')
  },

  // ---- 内部方法 ----
  _upload(url, filePath, fileKey, extraData = {}) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.getBaseUrl()}${url}`,
        filePath,
        name: fileKey,
        formData: extraData,
        success: (res) => {
          try {
            // 处理 BOM + 其他非法 JSON 前缀
            let text = res.data
            if (typeof text === 'string') {
              text = text.replace(/^\uFEFF+/, '').trim()
            }
            const data = JSON.parse(text)
            if (data.code === 0) resolve(data.data)
            else reject(data)
          } catch (e) {
            reject({ code: -1, message: '解析响应失败', raw: (res.data || '').substring(0, 200) })
          }
        },
        fail: reject
      })
    })
  },

  _get(url, params = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.getBaseUrl()}${url}`,
        method: 'GET',
        data: params,
        timeout: 30000,
        success: (res) => {
          if (res.data && res.data.code === 0) resolve(res.data.data)
          else reject(res.data || { code: -1, message: '请求失败' })
        },
        fail: reject
      })
    })
  },

  _post(url, data = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.getBaseUrl()}${url}`,
        method: 'POST',
        data,
        timeout: 30000,
        success: (res) => {
          if (res.data && res.data.code === 0) resolve(res.data.data)
          else reject(res.data || { code: -1, message: '请求失败' })
        },
        fail: reject
      })
    })
  }
}

module.exports = API
