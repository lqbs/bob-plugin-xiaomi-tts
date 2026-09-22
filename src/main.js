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
var DEFAULT_VOICE = '冰糖';
var DEFAULT_STYLE_PROMPT = '用自然清晰的语调朗读';

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
        format: optionText('audioFormat', 'mp3'),
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

    synthesize(text, options, completion);
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

    options.format = 'mp3';
    options.timeout = 20;
    synthesize('你好', options, function (response) {
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
