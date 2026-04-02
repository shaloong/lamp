import { ref, computed, watch, isRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { pluginHost } from '@/plugins/index'
import { AI_PROVIDERS, BUILTIN_SETTINGS_SECTIONS } from '@/components/settings/config'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { i18n } from '@/i18n'
import { requireLampAPI } from '@/lib/lampApi'
import { useSettingsStore } from '@/stores/settings'

export function useSettingsDialogState(props, emit) {
  const settingsStore = useSettingsStore()
  const { t, locale } = useI18n()

  function getCurrentLocale() {
    const globalLocale = i18n.global.locale
    if (typeof globalLocale === 'string') return globalLocale
    if (globalLocale && typeof globalLocale === 'object' && 'value' in globalLocale) {
      return globalLocale.value
    }
    return typeof locale === 'string' ? locale : locale?.value
  }

  function setCurrentLocale(lang) {
    const globalLocale = i18n.global.locale
    
    // Try to set via ref first (Vue 3 composition mode)
    if (isRef(globalLocale)) {
      globalLocale.value = lang
      return
    }
    
    // Fall back to direct assignment
    if (typeof globalLocale === 'string') {
      i18n.global.locale = lang
      return
    }
    
    // Try composable locale
    if (isRef(locale)) {
      locale.value = lang
      return
    }
  }

  function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '')
  }

  const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const activeTab = ref('builtin:general')
  const hydratingSettings = ref(false)

  // 从 store 获取响应式引用
  const { language, aiProvider } = storeToRefs(settingsStore)

  const providers = AI_PROVIDERS
  const builtinSections = BUILTIN_SETTINGS_SECTIONS

  const allNavItems = computed(() => {
    const builtins = builtinSections.map(item => ({
      id: `builtin:${item.id}`,
      sectionId: item.id,
      icon: item.icon,
      priority: item.priority,
      type: 'builtin',
      label: t(item.labelKey),
      section: {
        id: item.id,
        label: t(item.labelKey),
        type: 'builtin',
        kind: item.id,
      },
    }))

    const pluginSections = pluginHost.contributions.sortedSettings.map(section => ({
      id: `${section.pluginId}:${section.id}`,
      label: resolveLabel(section.label),
      icon: 'plugin',
      priority: section.priority ?? 50,
      type: 'plugin',
      section,
    }))

    return [...builtins, ...pluginSections].sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50))
  })

  watch(allNavItems, (items) => {
    if (!items.length) return
    if (!items.some(item => item.id === activeTab.value)) {
      activeTab.value = items[0].id
    }
  }, { immediate: true })

  const activeNavItem = computed(() => {
    return allNavItems.value.find(n => n.id === activeTab.value) || null
  })

  const activeSection = computed(() => {
    return activeNavItem.value?.section || null
  })

  function resolveLabel(label) {
    return resolveI18nLabel(t, label)
  }

  function resolvePluginName(name) {
    return resolveI18nLabel(t, name)
  }

  function getPluginValue(item) {
    const ctx = pluginHost.getContext(item.pluginId)
    if (!ctx) return item.defaultValue
    return ctx.storage.get(item.id, item.defaultValue)
  }

  function handlePluginSettingChange(item, newValue) {
    const ctx = pluginHost.getContext(item.pluginId)
    if (!ctx) return

    if (!item.manualPersist) {
      ctx.storage.set(item.id, newValue)
    }
    if (item.onChange) {
      item.onChange(newValue)
    }
  }

  watch(visible, (val) => {
    if (val) {
      loadSettings()
    }
  }, { immediate: true })

  watch(aiProvider, (newProvider) => {
    if (hydratingSettings.value) return
    const p = providers.find(item => item.id === newProvider)
    if (p && p.id !== 'custom') {
      settingsStore.setAiSettings({
        baseUrl: p.baseUrl,
        model: p.models[0]?.value || '',
      })
    } else {
      settingsStore.setAiSettings({
        baseUrl: '',
        model: '',
      })
    }
  })

  async function saveGeneralSettings() {
    if (hydratingSettings.value) return
    try {
      const api = requireLampAPI('settings save')
      await api.saveGeneralSettings(settingsStore.generalSettings)
    } catch (error) {
      console.error('Failed to save general settings', error)
    }
  }

  async function saveAiSettings() {
    if (hydratingSettings.value) return
    try {
      const api = requireLampAPI('settings save')
      const settings = settingsStore.aiSettings
      await api.saveAiSettings({
        ...settings,
        baseUrl: normalizeBaseUrl(settings.baseUrl),
      })
    } catch (error) {
      console.error('Failed to save AI settings', error)
    }
  }

  // Auto-save general settings when any field changes
  watch(
    () => settingsStore.generalSettings,
    () => {
      // Language: apply locale immediately
      setCurrentLocale(language.value)
      saveGeneralSettings()
    },
    { deep: true }
  )

  // Auto-save AI settings when any field changes
  watch(
    () => settingsStore.aiSettings,
    () => {
      saveAiSettings()
    },
    { deep: true }
  )

  async function loadSettings() {
    try {
      hydratingSettings.value = true
      const api = requireLampAPI('settings load')
      const [general, ai] = await Promise.all([
        api.getGeneralSettings(),
        api.getAiSettings(),
      ])

      // 更新 store 中的通用设置
      settingsStore.setGeneralSettings({
        language: general?.language || getCurrentLocale() || 'zh-CN',
        autoSave: general?.autoSave ?? general?.auto_save ?? true,
        autoSaveInterval: general?.autoSaveInterval ?? general?.auto_save_interval ?? 30,
        restoreOnStart: general?.restoreOnStart ?? general?.restore_on_start ?? true,
        openLastWorkspace: general?.openLastWorkspace ?? general?.open_last_workspace ?? false,
        focusMode: general?.focusMode ?? general?.focus_mode ?? false,
      })

      // 更新 store 中的 AI 设置
      const savedProvider = ai?.provider || 'deepseek'
      const provider = providers.find(item => item.id === savedProvider) || providers[0]
      const aiBaseUrlVal = ai?.baseUrl ?? ai?.base_url ?? ''
      const aiApiKeyVal = ai?.apiKey ?? ai?.api_key ?? ''
      const aiModelVal = ai?.model || ''

      settingsStore.setAiSettings({
        provider: savedProvider,
        baseUrl: savedProvider === 'custom' ? aiBaseUrlVal : (provider.baseUrl || aiBaseUrlVal || ''),
        apiKey: aiApiKeyVal,
        model: aiModelVal || (provider.models[0]?.value || ''),
      })
    } catch (error) {
      console.error('Failed to load settings', error)
    } finally {
      hydratingSettings.value = false
    }
  }

  return {
    pluginHost,
    visible,
    activeTab,
    allNavItems,
    activeNavItem,
    activeSection,
    resolveLabel,
    resolvePluginName,
    getPluginValue,
    handlePluginSettingChange,
    t,
  }
}
