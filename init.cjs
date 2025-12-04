const fs = require("fs");
const path = require("path");

const defaultConfig = {
  // 初始配置项
  language: "en",
  openAI: {
    baseURL: "https://api.deepseek.com",
    apiKey: "",
    model: "deepseek-chat",
  },
};

function ensureConfigShape(config = {}) {
  return {
    ...defaultConfig,
    ...config,
    openAI: {
      ...defaultConfig.openAI,
      ...(config.openAI || {}),
    },
  };
}

function createConfigFile() {
  const configPath = path.join(__dirname, "config.json");
  let normalizedConfig = defaultConfig;

  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, "utf-8");
      normalizedConfig = ensureConfigShape(JSON.parse(fileContent));
    } catch (error) {
      normalizedConfig = defaultConfig;
    }
  }

  fs.writeFileSync(
    configPath,
    JSON.stringify(normalizedConfig, null, 2),
    "utf-8"
  );

  return configPath;
}

module.exports = {
  createConfigFile,
  ensureConfigShape,
};
