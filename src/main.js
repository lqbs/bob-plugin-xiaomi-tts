/**
 * Bob 小米 MiMo TTS 插件
 * 基于小米 MiMo 语音大模型 (MiMo-V2.5-TTS) API
 *
 * 接口文档：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5
 */

var lang = require('./lang.js');

var API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
var API_DOCUMENT_URL = 'https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5';
var DEFAULT_MODEL = 'mimo-v2.5-tts';
var DEFAULT_VOICE = 'Dean';
var DEFAULT_STYLE_PROMPT = 'Read the English text clearly and accurately for an English learner. Use a neutral tone and a slightly slow, steady pace. Pronounce each word naturally, and read the supplied text exactly once without adding explanations or other words.';
var CACHE_DIR = '$sandbox/tts-cache';
var pending = {};

function supportLanguages() {
    return lang.supportLanguages.map(function (item) {
        return item[0];
    });
}

function optionText(identifier, defaultValue) {
    var value = $option[identifier];
    if (value === undefined || value === null || String(value).trim() === '') {
        return defaultValue;
    }
    return String(value).trim();
}

function clampInteger(value, defaultValue, minimum, maximum) {
    var number = parseInt(value, 10);
    if (isNaN(number)) number = defaultValue;
    if (number < minimum) number = minimum;
    if (number > maximum) number = maximum;
    return number;
}

function createApiError(message, addition) {
    return {
        type: 'api',
        message: message,
        addition: addition || '',
        troubleshootingLink: API_DOCUMENT_URL
    };
}

function formatApiError(resData, statusCode) {
    var message = '语音合成失败';
    var addition = '';

    if (resData && typeof resData === 'object') {
        if (resData.error) {
            if (typeof resData.error === 'string') {
                message = resData.error;
            } else if (resData.error.message) {
                message = resData.error.message;
                if (resData.error.code || resData.error.type) {
                    addition = '错误类型: ' + (resData.error.code || resData.error.type);
                }
            }
        } else if (resData.message) {
            message = resData.message;
        }
    }

    if (!addition && statusCode) {
        addition = 'HTTP 状态码: ' + statusCode;
    }

    return createApiError(message, addition);
}

/**
 * 提取响应中的 Base64 音频数据
 */
function extractAudioBase64(data) {
    if (!data) return null;

    if (data.choices && data.choices.length > 0) {
        var choice = data.choices[0];
        if (choice.message && choice.message.audio && choice.message.audio.data) {
            return choice.message.audio.data;
        }
        if (choice.audio && choice.audio.data) {
            return choice.audio.data;
        }
        if (choice.message && typeof choice.message.audio === 'string') {
            return choice.message.audio;
        }
    }

    if (data.audio && data.audio.data) {
        return data.audio.data;
    }

    return null;
}

// 索引文件保存完整请求，以便校验哈希碰撞；音频单独保存为 WAV。
function cacheKey(text, options) {
    return JSON.stringify([DEFAULT_MODEL, 'wav', text, options.voice, options.stylePrompt]);
}

function cacheHash(key) {
    var a = 2166136261, b = 5381;
    for (var i = 0; i < key.length; i++) {
        var c = key.charCodeAt(i);
        a = Math.imul(a ^ c, 16777619);
        b = Math.imul(b, 33) ^ c;
    }
    return ('00000000' + (a >>> 0).toString(16)).slice(-8) +
        ('00000000' + (b >>> 0).toString(16)).slice(-8);
}

function cachePath(key) {
    if (!$file.exists(CACHE_DIR) && !$file.mkdir(CACHE_DIR) && !$file.exists(CACHE_DIR)) return null;
    var prefix = CACHE_DIR + '/' + cacheHash(key);
    for (var i = 0; i < 1000; i++) {
        var path = prefix + (i ? '-' + i : '');
        var metadata = path + '.json';
        if (!$file.exists(metadata)) return path;
        var data = $file.read(metadata);
        if (data && data.toUTF8() === key) return path;
    }
    return null;
}

function isWavBase64(base64) {
    if (typeof base64 !== 'string' || base64.length < 16) return false;
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var bytes = [];
    for (var i = 0; i < 16; i += 4) {
        var a = alphabet.indexOf(base64.charAt(i));
        var b = alphabet.indexOf(base64.charAt(i + 1));
        var c = alphabet.indexOf(base64.charAt(i + 2));
        var d = alphabet.indexOf(base64.charAt(i + 3));
        if (a < 0 || b < 0 || c < 0 || d < 0) return false;
        bytes.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
    }
    return bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
        bytes[8] === 87 && bytes[9] === 65 && bytes[10] === 86 && bytes[11] === 69;
}

function readCachedAudio(path) {
    if (!path || !$file.exists(path + '.json') || !$file.exists(path + '.wav')) return null;
    var data = $file.read(path + '.wav');
    var base64 = data && data.toBase64();
    return isWavBase64(base64) ? base64 : null;
}

function writeCachedAudio(path, key, base64) {
    if (!path) return;
    if (!isWavBase64(base64)) {
        $log.error('小米 MiMo TTS 返回的音频不是有效 WAV，未写入缓存');
        return;
    }
    var data = $data.fromBase64(base64);
    if (!data) {
        $log.error('小米 MiMo TTS 缓存音频解码失败');
        return;
    }
    // 先记录完整键，避免同一个哈希的不同请求读取到错误音频。
    if (!$file.exists(path + '.json') && !$file.write({path: path + '.json', data: $data.fromUTF8(key)})) { $log.error('小米 MiMo TTS 缓存索引写入失败'); return; }
    if (!$file.write({path: path + '.wav', data: data})) $log.error('小米 MiMo TTS 缓存写入失败');
}

/**
 * 调用小米 MiMo Chat Completions 语音合成接口
 */
function synthesize(text, options, completion) {
    var messages = [];
    if (options.stylePrompt) {
        messages.push({
            role: 'user',
            content: options.stylePrompt
        });
    }
    messages.push({
        role: 'assistant',
        content: text
    });

    var requestBody = {
        model: DEFAULT_MODEL,
        messages: messages,
        audio: {
            voice: options.voice,
            format: options.format
        }
    };

    $log.info('小米 MiMo TTS 请求: voice=' + options.voice + ', format=' + options.format + ', textLength=' + text.length);

    $http.request({
        method: 'POST',
        url: API_URL,
        header: {
            'Content-Type': 'application/json',
            'api-key': options.apiKey,
            'Authorization': 'Bearer ' + options.apiKey
        },
        body: requestBody,
        timeout: options.timeout,
        handler: function (result) {
            var statusCode = result.response ? result.response.statusCode : 0;
            var resData = result.data;

            if (result.error) {
                var errorMsg = result.error.message || JSON.stringify(result.error);
                $log.error('小米 MiMo TTS 网络请求异常: ' + errorMsg);
                completion({
                    error: createApiError(
                        statusCode ? '请求失败（HTTP ' + statusCode + '）' : '请求服务器失败',
                        errorMsg
                    )
                });
                return;
            }

            if (statusCode && (statusCode < 200 || statusCode >= 300)) {
                $log.error('小米 MiMo TTS 响应状态码异常: ' + statusCode + ', data=' + JSON.stringify(resData));
                completion({
                    error: formatApiError(resData, statusCode)
                });
                return;
            }

            if (resData && resData.error) {
                $log.error('小米 MiMo TTS 业务错误: ' + JSON.stringify(resData.error));
                completion({
                    error: formatApiError(resData, statusCode)
                });
                return;
            }

            var audioBase64 = extractAudioBase64(resData);
            if (!audioBase64) {
                $log.error('小米 MiMo TTS 未能获取音频数据: ' + JSON.stringify(resData));
                completion({
                    error: createApiError('服务器未返回音频数据', '请检查模型或音色配置是否正确')
                });
                return;
            }

            completion({
                result: {
                    type: 'base64',
                    value: audioBase64,
                    raw: resData
                }
            });
        }
    });
}

function readOptions() {
    return {
        apiKey: optionText('apiKey', ''),
        voice: optionText('voice', DEFAULT_VOICE),
        format: 'wav',
        stylePrompt: optionText('stylePrompt', DEFAULT_STYLE_PROMPT),
        timeout: pluginTimeoutInterval()
    };
}

function tts(query, completion) {
    var text = query.text || '';
    if (!text.trim()) {
        completion({ error: { type: 'param', message: '合成文本不能为空' } });
        return;
    }

    if (!lang.isSupported(query.lang)) {
        completion({
            error: {
                type: 'unsupportLanguage',
                message: '不支持的语言: ' + query.lang
            }
        });
        return;
    }

    var options = readOptions();
    var key = cacheKey(text, options);
    var path = null;
    try {
        path = cachePath(key);
        var cached = readCachedAudio(path);
        if (cached) {
            $log.info('小米 MiMo TTS 缓存命中');
            completion({result: {type: 'base64', value: cached}});
            return;
        }
    } catch (error) {
        $log.error('小米 MiMo TTS 缓存读取失败: ' + error);
        path = null;
    }

    if (!options.apiKey) {
        completion({
            error: {
                type: 'secretKey',
                message: '请在插件配置中填入 API Key',
                troubleshootingLink: API_DOCUMENT_URL
            }
        });
        return;
    }

    if (pending[key]) {
        pending[key].push(completion);
        return;
    }
    pending[key] = [completion];
    synthesize(text, options, function (response) {
        if (response.result) {
            try {
                // 重新定位路径，避免并发请求发生哈希碰撞。
                writeCachedAudio(cachePath(key), key, response.result.value);
            } catch (error) {
                $log.error('小米 MiMo TTS 缓存写入失败: ' + error);
            }
        }
        var callbacks = pending[key];
        delete pending[key];
        callbacks.forEach(function (callback) { callback(response); });
    });
}

function pluginTimeoutInterval() {
    return clampInteger($option.timeout, 60, 10, 120);
}

function pluginValidate(completion) {
    var options = readOptions();
    if (!options.apiKey) {
        completion({
            result: false,
            error: {
                type: 'secretKey',
                message: '请填写 API Key',
                troubleshootingLink: API_DOCUMENT_URL
            }
        });
        return;
    }

    options.timeout = 20;
    synthesize('Hello.', options, function (response) {
        if (response.error) {
            completion({ result: false, error: response.error });
            return;
        }
        completion({ result: true });
    });
}

exports.supportLanguages = supportLanguages;
exports.tts = tts;
exports.pluginTimeoutInterval = pluginTimeoutInterval;
exports.pluginValidate = pluginValidate;
