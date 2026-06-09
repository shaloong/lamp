export const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { value: 'deepseek-chat', label: 'deepseek-chat' },
      { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
    ],
    helpUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    models: [
      { value: 'gpt-4o', label: 'gpt-4o' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4-turbo', label: 'gpt-4-turbo' },
      { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
    ],
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'claude-sonnet-4-20250514' },
      { value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest' },
      { value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest' },
      { value: 'claude-3-opus-latest', label: 'claude-3-opus-latest' },
    ],
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { value: 'glm-4', label: 'glm-4' },
      { value: 'glm-4-flash', label: 'glm-4-flash' },
      { value: 'glm-4-plus', label: 'glm-4-plus' },
      { value: 'glm-3-turbo', label: 'glm-3-turbo' },
    ],
    helpUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen/Qwen2.5-72B-Instruct' },
      { value: 'deepseek-ai/DeepSeek-V3', label: 'deepseek-ai/DeepSeek-V3' },
      { value: 'THUDM/glm-4-9b-chat', label: 'THUDM/glm-4-9b-chat' },
      { value: 'Pro/Qwen2.5-7B-Instruct', label: 'Pro/Qwen2.5-7B-Instruct' },
    ],
    helpUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  { id: 'custom', name: 'Custom', baseUrl: '', models: [], helpUrl: '' },
]

export const BUILTIN_NAV_ITEMS = [
  { id: 'general', labelKey: 'settings.general', icon: 'setting', priority: 100, type: 'builtin' },
  { id: 'ai', labelKey: 'settings.ai', icon: 'Bot', priority: 100, type: 'builtin' },
  { id: 'editor', labelKey: 'settings.editor', icon: 'edit', priority: 100, type: 'builtin' },
  { id: 'plugins', labelKey: 'settings.plugins', icon: 'plugin', priority: 100, type: 'builtin' },
  { id: 'shortcuts', labelKey: 'settings.shortcuts', icon: 'jianpankuaijiejian', priority: 100, type: 'builtin' },
]
