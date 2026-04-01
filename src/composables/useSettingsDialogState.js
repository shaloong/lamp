import { ref, computed, watch, isRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginHost } from '@/plugins/index'
import { AI_PROVIDERS, BUILTIN_NAV_ITEMS } from '@/components/settings/config'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { i18n } from '@/i18n'
import { requireLampAPI } from '@/lib/lampApi'

export function useSettingsDialogState(props, emit) {
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

  const activeTab = ref('general')
  const submitting = ref(false)
  const hydratingSettings = ref(false)
  const savedLanguage = ref('zh-CN') // Track original language when dialog opens

  const form = ref({
    language: 'zh-CN',
    autoSave: true,
    autoSaveInterval: 30,
    restoreOnStart: true,
    openLastWorkspace: false,
  })

  const providers = AI_PROVIDERS
  const aiForm = ref({ provider: 'deepseek', baseUrl: '', apiKey: '', model: '' })

  const navItems = BUILTIN_NAV_ITEMS

  const currentProvider = computed(() => {
    return providers.find(p => p.id === aiForm.value.provider) || providers[providers.length - 1]
  })

  const currentProviderModels = computed(() => currentProvider.value?.models || [])
  const isCustomProvider = computed(() => aiForm.value.provider === 'custom')

  const allNavItems = computed(() => {
    const builtins = navItems.map(item => ({
      ...item,
      label: t(item.labelKey),
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

  const activeSection = computed(() => {
    const item = allNavItems.value.find(n => n.id === activeTab.value)
    return item?.type === 'plugin' ? item.section : null
  })

  const isBuiltInTab = computed(() => {
    return navItems.some(n => n.id === activeTab.value)
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

  watch(() => aiForm.value.provider, (newProvider) => {
    if (hydratingSettings.value) return
    const p = providers.find(item => item.id === newProvider)
    if (p && p.id !== 'custom') {
      aiForm.value.baseUrl = p.baseUrl
      aiForm.value.model = p.models[0]?.value || ''
    } else {
      aiForm.value.baseUrl = ''
      aiForm.value.model = ''
    }
  })

  async function loadSettings() {
    try {
      hydratingSettings.value = true
      const api = requireLampAPI('settings load')
      const [general, ai] = await Promise.all([
        api.getGeneralSettings(),
        api.getAiSettings(),
      ])

      const language = general?.language || getCurrentLocale() || 'zh-CN'
      const autoSave = general?.autoSave ?? general?.auto_save ?? true
      const autoSaveInterval = general?.autoSaveInterval ?? general?.auto_save_interval ?? 30
      const restoreOnStart = general?.restoreOnStart ?? general?.restore_on_start ?? true
      const openLastWorkspace = general?.openLastWorkspace ?? general?.open_last_workspace ?? false

      form.value = {
        language,
        autoSave,
        autoSaveInterval,
        restoreOnStart,
        openLastWorkspace,
      }
      savedLanguage.value = language // Save original language for potential rollback

      const aiProvider = ai?.provider || 'deepseek'
      const aiBaseUrl = ai?.baseUrl ?? ai?.base_url ?? ''
      const aiApiKey = ai?.apiKey ?? ai?.api_key ?? ''
      const aiModel = ai?.model || ''

      const savedProvider = aiProvider
      const provider = providers.find(item => item.id === savedProvider) || providers[0]
      aiForm.value = {
        provider: savedProvider,
        baseUrl: savedProvider === 'custom' ? aiBaseUrl : (provider.baseUrl || aiBaseUrl || ''),
        apiKey: aiApiKey,
        model: aiModel || (provider.models[0]?.value || ''),
      }
    } catch (error) {
      console.error('Failed to load settings', error)
    } finally {
      hydratingSettings.value = false
    }
  }

  async function handleSave() {
    if (submitting.value) return
    submitting.value = true
    try {
      const api = requireLampAPI('settings save')
      const generalPayload = JSON.parse(JSON.stringify(form.value))
      await api.saveGeneralSettings(generalPayload)
      await api.saveAiSettings({
        provider: aiForm.value.provider,
        baseUrl: normalizeBaseUrl(aiForm.value.baseUrl),
        apiKey: aiForm.value.apiKey,
        model: aiForm.value.model,
      })
      // Update global locale only after successful save
      if (form.value.language !== savedLanguage.value) {
        setCurrentLocale(form.value.language)
      }
      visible.value = false
    } catch (error) {
      console.error('Failed to save settings', error)
    } finally {
      submitting.value = false
    }
  }

  function handleClose() {
    // Restore original language if it was modified but not saved
    if (form.value.language !== savedLanguage.value) {
      setCurrentLocale(savedLanguage.value)
    }
    visible.value = false
  }

  return {
    pluginHost,
    visible,
    activeTab,
    submitting,
    form,
    providers,
    aiForm,
    currentProvider,
    currentProviderModels,
    isCustomProvider,
    navItems,
    allNavItems,
    activeSection,
    isBuiltInTab,
    resolveLabel,
    resolvePluginName,
    getPluginValue,
    handlePluginSettingChange,
    handleSave,
    handleClose,
    t,
  }
}
