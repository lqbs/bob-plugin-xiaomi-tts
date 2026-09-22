/**
 * Bob 语言代码映射
 * 小米 MiMo 语音大模型支持多语种及中英混合合成
 */

// [Bob语言代码, 说明]
var supportLanguages = [
    ['zh-Hans', '中文简体'],
    ['zh-Hant', '中文繁体'],
    ['en', '英语'],
    ['ja', '日语'],
    ['ko', '韩语'],
    ['fr', '法语'],
    ['de', '德语'],
    ['es', '西班牙语'],
    ['pt', '葡萄牙语'],
    ['id', '印尼语'],
    ['auto', '自动检测']
];

// 创建 Set 用于快速查找
var langSet = {};
for (var i = 0; i < supportLanguages.length; i++) {
    langSet[supportLanguages[i][0]] = true;
}

/**
 * 检查是否支持该语言
 * @param {string} lang Bob 语言代码
 * @returns {boolean}
 */
function isSupported(lang) {
    if (!lang) return true;
    return langSet[lang] === true;
}

exports.supportLanguages = supportLanguages;
exports.isSupported = isSupported;
