/**
 * 通用设置状态管理 Store
 * 管理全局设置状态，确保设置变更可以在整个应用中响应
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // ─── 通用设置 ───────────────────────────────────────────────
  const language = ref('zh-CN')
  const autoSave = ref(true)
  const autoSaveInterval = ref(30)
  const restoreOnStart = ref(true)
  const openLastWorkspace = ref(false)
  const focusMode = ref(false)

  // ─── AI 设置 ────────────────────────────────────────────────
  const aiProvider = ref('deepseek')
  const aiBaseUrl = ref('')
  const aiApiKey = ref('')
  const aiModel = ref('')

  // ─── 通用设置操作 ───────────────────────────────────────────
  function setGeneralSettings(settings) {
    if (settings.language !== undefined) language.value = settings.language
    if (settings.autoSave !== undefined) autoSave.value = settings.autoSave
    if (settings.autoSaveInterval !== undefined) autoSaveInterval.value = settings.autoSaveInterval
    if (settings.restoreOnStart !== undefined) restoreOnStart.value = settings.restoreOnStart
    if (settings.openLastWorkspace !== undefined) openLastWorkspace.value = settings.openLastWorkspace
    if (settings.focusMode !== undefined) focusMode.value = settings.focusMode
  }

  // ─── AI 设置操作 ────────────────────────────────────────────
  function setAiSettings(settings) {
    if (settings.provider !== undefined) aiProvider.value = settings.provider
    if (settings.baseUrl !== undefined) aiBaseUrl.value = settings.baseUrl
    if (settings.apiKey !== undefined) aiApiKey.value = settings.apiKey
    if (settings.model !== undefined) aiModel.value = settings.model
  }

  // ─── 便捷 getter ────────────────────────────────────────────
  const generalSettings = computed(() => ({
    language: language.value,
    autoSave: autoSave.value,
    autoSaveInterval: autoSaveInterval.value,
    restoreOnStart: restoreOnStart.value,
    openLastWorkspace: openLastWorkspace.value,
    focusMode: focusMode.value,
  }))

  const aiSettings = computed(() => ({
    provider: aiProvider.value,
    baseUrl: aiBaseUrl.value,
    apiKey: aiApiKey.value,
    model: aiModel.value,
  }))

  return {
    // 通用设置
    language,
    autoSave,
    autoSaveInterval,
    restoreOnStart,
    openLastWorkspace,
    focusMode,
    generalSettings,
    setGeneralSettings,

    // AI 设置
    aiProvider,
    aiBaseUrl,
    aiApiKey,
    aiModel,
    aiSettings,
    setAiSettings,
  }
})
