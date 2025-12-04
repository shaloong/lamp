const path = require('path');
const fs = require('fs');

let languageFiles = null;

function setLanguage(language) {
    // 读取特定语言
    languageFiles = JSON.parse(fs.readFileSync(path.join(__dirname, '/lang/'+ language +'.json'), 'utf-8'));
}

function locale(text) {
    return languageFiles[text];
}

module.exports = {
    setLanguage, locale
}