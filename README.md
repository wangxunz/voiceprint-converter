# 🎤 声纹变声 - 微信小程序

用你的**个人声纹**替换歌曲原声，让你的声音唱出任何歌曲。

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| 🎙️ **声纹录制** | 录制 30-60 秒语音样本，AI 提取声纹特征 |
| 🔄 **智能变声** | 选择歌曲 → AI 分离人声 → 用你的声纹合成 |
| 🎛️ **参数调节** | 音调偏移 (-12 ~ +12)、混响强度、音色保真度 |
| 🎵 **结果播放** | 唱片动画播放器，支持快进/快退/进度拖动 |
| ⚖️ **对比试听** | 一键切换：原唱歌声 vs 你的歌声 |
| 📋 **历史记录** | 查看、重播所有变声记录 |
| 📤 **分享保存** | 保存到本地 / 分享给微信好友 |

## 🛠 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   微信小程序前端                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 声纹录制  │ │ 歌曲选择  │ │ 历史记录  │ │ 播放器  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │             │            │            │       │
│       └─────────────┴────────────┴────────────┘       │
│                         │                             │
│                    REST API                            │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                   后端服务（需部署）                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 声纹注册  │ │ 人声分离  │ │ 声纹转换  │ │ 音频合成 │ │
│  │ Speaker  │ │  Spleeter │ │  Voice   │ │  Audio  │ │
│  │ Embedding│ │  /Demucs │ │  Convert │ │  Merge  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────┘
```

### 推荐后端技术栈

| 环节 | 推荐方案 |
|------|---------|
| 声纹提取 | [SpeechBrain](https://speechbrain.github.io/) / [Resemblyzer](https://github.com/resemble-ai/Resemblyzer) |
| 人声分离 | [Spleeter](https://github.com/deezer/spleeter) / [Demucs](https://github.com/facebookresearch/demucs) |
| 声纹转换 | [RVC](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) / [So-VITS-SVC](https://github.com/svc-develop-team/so-vits-svc) |
| API 框架 | Flask / FastAPI / Express |

## 📁 项目结构

```
voiceprint-converter/
├── app.js / app.json / app.wxss    # 应用入口与全局配置
├── project.config.json / sitemap.json
├── pages/
│   ├── index/          # 声纹录制页（录制指南、波形、上传）
│   ├── convert/        # 变声转换页（选歌、参数调节、进度）
│   ├── history/        # 历史记录页（列表、重播）
│   └── player/         # 结果播放器（唱片动画、对比试听）
└── utils/
    ├── api.js          # 后端 API 封装（上传/查询/下载）
    ├── recorder.js     # 高保真录音管理器
    └── storage.js      # 本地持久化存储
```

## 🚀 快速开始

### 1. 导入项目
用微信开发者工具导入 `voiceprint-converter` 目录。

### 2. 修改 AppID
编辑 `project.config.json` → `appid` 改为你的实际 AppID。

### 3. 配置后端 API
编辑 `app.js` → `globalData.apiBaseUrl` 改为你的后端服务地址。

### 4. 添加 TabBar 图标
在 `images/` 目录放入 6 张 81×81 的 PNG 图标：
- `voiceprint.png` / `voiceprint-active.png`
- `convert.png` / `convert-active.png`
- `history.png` / `history-active.png`

### 5. 部署后端
参考上述推荐技术栈，部署声纹转换后端服务，实现以下 API：
- `POST /v1/voiceprint/enroll` — 上传声纹样本
- `POST /v1/conversion/submit` — 提交变声任务
- `GET /v1/conversion/status` — 查询任务进度
- `GET /v1/conversion/result` — 获取结果下载链接
- `GET /v1/conversion/history` — 获取历史记录
- `GET /v1/health` — 健康检查

## 📝 录音参数

| 参数 | 值 | 说明 |
|------|-----|------|
| format | wav | 无损格式保证声纹质量 |
| sampleRate | 44100 | CD 音质采样率 |
| bitRate | 192kbps | 高码率 |
| channels | 1 | 单声道 |
| maxDuration | 60s | 最长录制 60 秒 |

## 📄 License

MIT