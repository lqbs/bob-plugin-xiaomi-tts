# Bob Plugin - 小米 MiMo TTS

使用小米 MiMo 语音大模型（MiMo-V2.5-TTS）为 [Bob](https://bobtranslate.com/) 提供高质量语音合成服务。默认使用英文预置音色「Dean」，适合朗读英语单词和短句。

## 功能特性

- 基于小米 MiMo 语音大模型（MiMo-V2.5-TTS）API
- 默认使用「Dean」英文音色和清晰、稍慢、平稳的朗读风格
- 支持自定义音色（如茉莉、苏打、白桦、Mia 等）
- 支持自定义语气与风格提示词（如“用自然清晰的语调朗读”）
- 将生成的 WAV 音频缓存在 Bob 插件沙盒中，相同文本、音色和风格重复使用
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
| 音色 | 发音人名称（Mia、Chloe、Milo、Dean 等） | Dean |
| 语气/风格指令 | 提示词指令控制语调风格 | 清晰、稍慢、平稳地朗读英语 |
| 超时时间 | 请求超时时间（秒，10-120） | 60 |

### 音频缓存

首次朗读时生成 WAV 并保存在 Bob 的插件沙盒 `tts-cache` 目录；相同文本、音色和风格指令再次朗读时直接读取缓存，无需联网。修改这些内容会生成新缓存。升级后 Bob 可能保留原有的音色和风格设置；如需与 `--voice Dean` 示例一致，请在插件设置中选择 Dean 并使用默认风格指令。缓存不会自动清理；可在 Bob 插件沙盒目录中删除 `tts-cache` 以重新生成，卸载插件时 Bob 也会清除沙盒。缓存写入失败时仍会播放本次生成的音频，但下次需要重新请求。

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

### 英语朗读示例

`script/demo.py` 使用英文预置音色朗读单词或短句，需要安装 Python 的 `openai` 包并设置 `MIMO_API_KEY`：

```bash
python3 -m pip install openai
export MIMO_API_KEY="你的 API Key"
python3 script/demo.py "pronunciation"
python3 script/demo.py "Could you say that again?" --voice Dean -o sentence.wav
```

默认使用 Mia 音色，输出 `audio_file.wav`；也可以选择 Chloe、Milo 或 Dean。脚本使用固定的清晰、稍慢、平稳朗读指令，但语音生成结果不保证每次完全相同。

## 相关文档

- [Bob 插件开发文档](https://bobtranslate.com/plugin/)
- [小米 MiMo 语音合成 v2.5 调用指南](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5)

## 许可证

MIT
