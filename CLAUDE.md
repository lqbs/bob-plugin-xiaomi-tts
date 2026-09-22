# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A [Bob](https://bobtranslate.com/) TTS plugin that uses Xiaomi MiMo (MiMo-V2.5-TTS) speech synthesis API. Bob is a macOS translation/TTS app; plugins run in a custom JavaScript runtime (not Node.js, not browser).

## Build & Package

```bash
# Package the plugin (run from project root)
cd src && zip -r ../xiaomi-tts.bobplugin . -x ".*"

# Get SHA256 for appcast.json
shasum -a 256 xiaomi-tts.bobplugin
```

There is no build system, linter, or test framework. The plugin is a zip of the `src/` directory renamed to `.bobplugin`.

## Architecture

- **`src/info.json`** — Plugin metadata, version, and user-configurable options (API Key, voice, audio format, style prompt, timeout). This is the Bob plugin manifest.
- **`src/main.js`** — Core TTS logic. Exports `supportLanguages()`, `tts()`, `pluginTimeoutInterval()`, and `pluginValidate()` as the Bob plugin interface. Sends POST requests to `https://api.xiaomimimo.com/v1/chat/completions` and returns base64-encoded audio.
- **`src/lang.js`** — Supported language list and lookup.
- **`appcast.json`** — Version manifest for Bob's auto-update system. Versions array is reverse-chronological (newest first).

## Bob Plugin Runtime Constraints

- **No ES6 modules** — use `require()` / `exports` (CommonJS-style)
- **No Node.js or browser APIs** — only JS built-ins and Bob globals: `$http`, `$data`, `$option`, `$log`
- `$http.request()` for HTTP POST requests with JSON payload
- `$option.<identifier>` reads values from user plugin settings defined in `info.json`

## Release Process

1. Edit source in `src/`, bump version in `src/info.json`
2. Re-package: `cd src && zip -r ../xiaomi-tts.bobplugin . -x ".*"`
3. Get SHA256: `shasum -a 256 xiaomi-tts.bobplugin`
4. Prepend new version entry to `appcast.json` (with sha256, timestamp via `date +%s000`)
5. Commit, push, then create GitHub Release: `gh release create v1.x.x xiaomi-tts.bobplugin --title "..." --notes "..."`

## API Details

- Xiaomi MiMo OpenAI-compatible Chat Completions endpoint: `https://api.xiaomimimo.com/v1/chat/completions`
- Synthesis text is passed in `messages` under the `assistant` role
- Style/instruction prompt is passed in `messages` under the `user` role
- Audio parameters: `audio: { voice: "冰糖", format: "mp3" }`
- Audio response format: `choices[0].message.audio.data` (Base64-encoded string)
