import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginHost } from '@/plugins/index'
import { AI_PROVIDERS, BUILTIN_NAV_ITEMS } from '@/components/settings/config'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { i18n } from '@/i18n'

export function useSettingsDialogState(props, emit) {
  const { t, locale } = useI18n()

  function getCurrentLocale() {
    return typeof locale === 'string' ? locale : locale?.value
  }

  function setCurrentLocale(lang) {
    if (typeof locale === 'string') {
      // legacy mode: update locale on app-level i18n instance
      i18n.global.locale = lang
      return
    }
    if (locale && typeof locale === 'object' && 'value' in locale) {
      locale.value = lang
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
  })

  watch(() => form.value.language, (lang) => {
    setCurrentLocale(lang)
  })

  watch(() => aiForm.value.provider, (newProvider) => {
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
      const [general, ai] = await Promise.all([
        window.lampAPI.getGeneralSettings(),
        window.lampAPI.getAiSettings(),
      ])
      form.value = {
        language: general.language || getCurrentLocale() || 'zh-CN',
        autoSave: general.autoSave ?? true,
        autoSaveInterval: general.autoSaveInterval || 30,
        restoreOnStart: general.restoreOnStart ?? true,
        openLastWorkspace: general.openLastWorkspace ?? false,
      }
      const savedProvider = ai.provider || 'deepseek'
      const provider = providers.find(item => item.id === savedProvider) || providers[0]
      aiForm.value = {
        provider: savedProvider,
        baseUrl: savedProvider === 'custom' ? (ai.baseUrl || '') : (provider.baseUrl || ai.baseUrl || ''),
        apiKey: ai.apiKey || '',
        model: ai.model || (provider.models[0]?.value || ''),
      }
    } catch (error) {
      console.error('Failed to load settings', error)
    }
  }

  async function handleSave() {
    if (submitting.value) return
    submitting.value = true
    try {
      const generalPayload = JSON.parse(JSON.stringify(form.value))
      await window.lampAPI.saveGeneralSettings(generalPayload)
      await window.lampAPI.saveAiSettings({
        provider: aiForm.value.provider,
        baseUrl: normalizeBaseUrl(aiForm.value.baseUrl),
        apiKey: aiForm.value.apiKey,
        model: aiForm.value.model,
      })
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
