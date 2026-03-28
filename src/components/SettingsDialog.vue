<template>
  <el-dialog
    v-model="visible"
    :title="t('settings.title')"
    width="680"
    :before-close="handleClose"
    class="settings-dialog"
  >
    <div class="settings-layout">
      <!-- 左侧导航 -->
      <nav class="settings-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeTab === item.id }"
          @click="activeTab = item.id"
        >
          <span class="nav-icon">
            <svg v-if="item.id === 'general'" viewBox="0 0 1024 1024" fill="currentColor">
              <use xlink:href="#icon-setting" />
            </svg>
            <svg v-else-if="item.id === 'editor'" viewBox="0 0 1024 1024" fill="currentColor">
              <use xlink:href="#icon-edit" />
            </svg>
            <svg v-else-if="item.id === 'ai'" viewBox="0 0 1024 1024" fill="currentColor">
              <use xlink:href="#icon-Bot" />
            </svg>
            <svg v-else-if="item.id === 'plugins'" viewBox="0 0 1024 1024" fill="currentColor">
              <use xlink:href="#icon-plugin" />
            </svg>
            <svg v-else-if="item.id === 'shortcuts'" viewBox="0 0 1024 1024" fill="currentColor">
              <use xlink:href="#icon-jianpankuaijiejian" />
            </svg>
            <svg v-else-if="item.id === 'about'" viewBox="0 0 1024 1024" fill="currentColor">
              <use xlink:href="#icon-tongzhi" />
            </svg>
          </span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- 右侧内容 -->
      <div class="settings-content">
        <!-- 通用设置 -->
        <section v-if="activeTab === 'general'" class="settings-section">
          <h3 class="section-title">{{ t('settings.general') }}</h3>

          <!-- 语言 -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.language') }}</div>
              <div class="setting-desc">{{ t('settings.languageDesc') }}</div>
            </div>
            <div class="setting-control">
              <el-select v-model="form.language" style="width: 180px">
                <el-option value="zh-CN" label="简体中文" />
                <el-option value="en-US" label="English" />
              </el-select>
            </div>
          </div>

          <!-- 自动保存 -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.autoSave') }}</div>
              <div class="setting-desc">{{ t('settings.autoSaveDesc') }}</div>
            </div>
            <div class="setting-control">
              <el-switch v-model="form.autoSave" />
            </div>
          </div>

          <!-- 自动保存间隔 -->
          <div class="setting-row" :class="{ disabled: !form.autoSave }">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.autoSaveInterval') }}</div>
            </div>
            <div class="setting-control">
              <el-input-number
                v-model="form.autoSaveInterval"
                :min="5"
                :max="300"
                :disabled="!form.autoSave"
                controls-position="right"
                style="width: 130px"
              />
              <span class="input-suffix">{{ t('settings.seconds') }}</span>
            </div>
          </div>

          <!-- 启动时恢复 -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.restoreOnStart') }}</div>
              <div class="setting-desc">{{ t('settings.restoreOnStartDesc') }}</div>
            </div>
            <div class="setting-control">
              <el-switch v-model="form.restoreOnStart" />
            </div>
          </div>

          <!-- 打开上次工作区 -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.openLastWorkspace') }}</div>
              <div class="setting-desc">{{ t('settings.openLastWorkspaceDesc') }}</div>
            </div>
            <div class="setting-control">
              <el-switch v-model="form.openLastWorkspace" />
            </div>
          </div>
        </section>

        <!-- AI 设置 -->
        <section v-else-if="activeTab === 'ai'" class="settings-section">
          <h3 class="section-title">{{ t('settings.ai') }}</h3>

          <!-- 供应商 -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.aiProvider') }}</div>
            </div>
            <div class="setting-control">
              <el-select v-model="aiForm.provider" style="width: 320px">
                <el-option
                  v-for="p in providers"
                  :key="p.id"
                  :value="p.id"
                  :label="p.name"
                />
              </el-select>
            </div>
          </div>

          <!-- Base URL -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.aiBaseUrl') }}</div>
            </div>
            <div class="setting-control">
              <el-input
                v-model="aiForm.baseURL"
                :placeholder="currentProvider?.baseUrl || ''"
                :disabled="!isCustomProvider"
                style="width: 320px"
              />
            </div>
          </div>

          <!-- 模型 -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.aiModel') }}</div>
            </div>
            <div class="setting-control">
              <el-select
                v-model="aiForm.model"
                filterable
                allow-create
                default-first-option
                :placeholder="t('settings.modelPlaceholder')"
                style="width: 320px"
              >
                <el-option
                  v-for="m in currentProviderModels"
                  :key="m.value"
                  :value="m.value"
                  :label="m.label"
                />
              </el-select>
            </div>
          </div>

          <!-- API Key -->
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t('settings.aiApiKey') }}</div>
            </div>
            <div class="setting-control api-key-control">
              <el-input
                v-model="aiForm.apiKey"
                type="password"
                show-password
                :placeholder="t('settings.aiApiKeyPlaceholder')"
                style="width: 320px"
              />
              <a
                v-if="currentProvider?.helpUrl"
                :href="currentProvider.helpUrl"
                target="_blank"
                class="help-link"
                :title="t('settings.getApiKey')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
                  <use xlink:href="#icon-tongzhi" />
                </svg>
                <span>{{ t('settings.getApiKey') }}</span>
              </a>
            </div>
          </div>
        </section>

        <!-- 其他标签 - 预留 -->
        <section v-else class="settings-section settings-placeholder">
          <p style="color: var(--lamp-color-neutral-grey); font-size: 13px; text-align: center; margin-top: 60px">
            {{ navItems.find(n => n.id === activeTab)?.label }} — Coming soon
          </p>
        </section>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <button class="lamp-btn-inconspicuous" @click="handleClose">
          {{ activeTab === 'general' || activeTab === 'ai' ? t('common.cancel') : 'Close' }}
        </button>
        <button
          v-if="activeTab === 'general' || activeTab === 'ai'"
          class="lamp-btn-primary"
          :disabled="submitting"
          @click="handleSave"
        >
          {{ submitting ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const { t, locale } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const activeTab = ref('general')
const submitting = ref(false)
const form = ref({
  language: 'zh-CN',
  autoSave: true,
  autoSaveInterval: 30,
  restoreOnStart: true,
  openLastWorkspace: false,
})

const providers = [
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
  {
    id: 'custom',
    name: 'Custom',
    baseUrl: '',
    models: [],
    helpUrl: '',
  },
]

const aiForm = ref({
  provider: 'deepseek',
  baseURL: '',
  apiKey: '',
  model: '',
})
const navItems = ref([
  { id: 'general', label: '通用' },
  { id: 'ai', label: 'AI' },
  { id: 'editor', label: '编辑器' },
  { id: 'plugins', label: '插件' },
  { id: 'shortcuts', label: '快捷键' },
])

watch(visible, (val) => {
  if (val) {
    loadSettings()
    updateNavLabels()
  }
})

watch(locale, () => {
  updateNavLabels()
})

// 语言切换立即预览
watch(() => form.value.language, (lang) => {
  locale.value = lang
  updateNavLabels()
})

const currentProvider = computed(() =>
  providers.find(p => p.id === aiForm.value.provider) || providers[providers.length - 1]
)

const currentProviderModels = computed(() =>
  currentProvider.value.models || []
)

const isCustomProvider = computed(() =>
  aiForm.value.provider === 'custom'
)

// 切换供应商时：填充 baseUrl，重置 model
watch(() => aiForm.value.provider, (newProvider) => {
  const p = providers.find(p => p.id === newProvider)
  if (p && p.id !== 'custom') {
    aiForm.value.baseURL = p.baseUrl
    aiForm.value.model = p.models[0]?.value || ''
  } else {
    aiForm.value.baseURL = ''
    aiForm.value.model = ''
  }
})

function updateNavLabels() {
  const labels = {
    general: locale.value === 'zh-CN' ? '通用' : 'General',
    editor: locale.value === 'zh-CN' ? '编辑器' : 'Editor',
    ai: 'AI',
    plugins: locale.value === 'zh-CN' ? '插件' : 'Plugins',
    shortcuts: locale.value === 'zh-CN' ? '快捷键' : 'Shortcuts',
  }
  navItems.value = navItems.value.map((item) => ({
    ...item,
    label: labels[item.id] || item.label,
  }))
}

async function loadSettings() {
  try {
    const [general, ai] = await Promise.all([
      window.electronAPI.getGeneralSettings(),
      window.electronAPI.getAiSettings(),
    ])
    // 下拉显示当前界面语言，用户切换时才更新全局语言
    form.value = {
      language: locale.value,
      autoSave: general.autoSave ?? true,
      autoSaveInterval: general.autoSaveInterval || 30,
      restoreOnStart: general.restoreOnStart ?? true,
      openLastWorkspace: general.openLastWorkspace ?? false,
    }
    const savedProvider = ai.provider || 'deepseek'
    const p = providers.find(p => p.id === savedProvider) || providers[0]
    aiForm.value = {
      provider: savedProvider,
      baseURL: savedProvider === 'custom' ? (ai.base_url || '') : (p.baseUrl || ai.base_url || ''),
      apiKey: ai.api_key || '',
      model: ai.model || (p.models[0]?.value || ''),
    }
  } catch (error) {
    console.error('Failed to load settings', error)
  }
}

// 用户切换下拉 → 立即预览语言

async function handleSave() {
  if (submitting.value) return
  submitting.value = true
  try {
    const generalPayload = JSON.parse(JSON.stringify(form.value))
    await window.electronAPI.saveGeneralSettings(generalPayload)

    const aiPayload = {
      provider: aiForm.value.provider,
      baseURL: aiForm.value.baseURL,
      apiKey: aiForm.value.apiKey,
      model: aiForm.value.model,
    }
    await window.electronAPI.saveAiSettings(aiPayload)

    visible.value = false
  } catch (error) {
    console.error('Failed to save settings', error)
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style lang="scss" scoped>
.settings-layout {
  display: flex;
  gap: 0;
  min-height: 400px;
}

.settings-nav {
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid var(--lamp-grey-15);
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--lamp-color-neutral-grey);
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
  width: 100%;

  &:hover {
    background-color: var(--lamp-grey-08);
    color: var(--lamp-color-neutral-dark);
  }

  &.active {
    background-color: var(--lamp-grey-10);
    color: var(--lamp-color-neutral-dark);
    font-weight: 500;
  }
}

.nav-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }
}

.nav-label {
  white-space: nowrap;
}

.settings-content {
  flex: 1;
  padding: 8px 24px 8px 24px;
  overflow-y: auto;
  min-width: 0;
  text-align: left;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--lamp-color-neutral-dark);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--lamp-grey-15);
}

.setting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--lamp-grey-08);

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.setting-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--lamp-color-neutral-dark);
  margin-bottom: 2px;
}

.setting-desc {
  font-size: 12px;
  color: var(--lamp-color-neutral-grey);
  line-height: 1.4;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.input-suffix {
  font-size: 12px;
  color: var(--lamp-color-neutral-grey);
}

.settings-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--lamp-color-primary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.api-key-control {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.help-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--lamp-color-primary);
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  svg {
    flex-shrink: 0;
  }
}
</style>
