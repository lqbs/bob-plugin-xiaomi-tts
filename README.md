# Bob Plugin - 小米 MiMo TTS

使用小米 MiMo 语音大模型（MiMo-V2.5-TTS）为 [Bob](https://bobtranslate.com/) 提供高质量语音合成服务。默认使用预置女性音色「冰糖」。

## 功能特性

- 基于小米 MiMo 语音大模型（MiMo-V2.5-TTS）API
- 默认使用「冰糖」高品质中文音色
- 支持自定义音色（如茉莉、苏打、白桦、Mia 等）
- 支持自定义语气与风格提示词（如“用自然清晰的语调朗读”）
- 支持 MP3 / WAV / FLAC / Opus 音频格式
- 支持中英双语及多语种朗读

## 安装

### 前置要求

- Bob 版本 >= 1.8.0
- 小米开放平台账号，已开通 MiMo 语音模型服务并获取 API Key

### 安装步骤

1. 下载最新的 `xiaomi-tts.bobplugin` 文件
2. 双击文件，Bob 会自动弹出安装确认
3. 在 Bob 插件设置中配置 API Key

## 配置

在 Bob 的插件设置中需要填写以下信息：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| API Key | 小米开放平台 API 密钥 | 必填 |
| 音色 | 发音人名称（冰糖、茉莉、苏打、白桦等） | 冰糖 |
| 音频格式 | MP3 / WAV / FLAC / Opus | MP3 |
| 语气/风格指令 | 提示词指令控制语调风格 | 用自然清晰的语调朗读 |
| 超时时间 | 请求超时时间（秒，10-120） | 60 |

### 获取 API Key

1. 登录 [小米开放平台控制台](https://platform.xiaomimimo.com)
2. 在 API 密钥管理中创建并复制 API Key
3. 填入 Bob 插件设置中的 `API Key` 字段

## 开发

### 项目结构

```
src/
├── info.json    # 插件元信息和配置项
├── main.js      # 核心 TTS 逻辑
└── lang.js      # 语言映射
```

### 打包

```bash
cd src && zip -r ../xiaomi-tts.bobplugin . -x ".*"
```

### 调试

在 Bob 的「偏好设置 → 高级 → 日志」中查看插件日志。

## 相关文档

- [Bob 插件开发文档](https://bobtranslate.com/plugin/)
- [小米 MiMo 语音合成 v2.5 调用指南](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5)

## 许可证

MIT
