<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.ai') }}</h3>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiProvider') }}</div>
            </div>
            <div class="setting-control">
                <Select v-model="settingsStore.aiProvider">
                    <SelectTrigger class="settings-control-field-lg">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiBaseUrl') }}</div>
            </div>
            <div class="setting-control">
                <Input v-model="settingsStore.aiBaseUrl" :placeholder="currentProvider?.baseUrl || ''"
                    :disabled="!isCustomProvider" class="settings-control-field-lg" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiModel') }}</div>
            </div>
            <div class="setting-control">
                <Combobox v-model="settingsStore.aiModel" class="settings-control-field-lg"
                    :options="currentProviderModels" :placeholder="t('settings.modelPlaceholder')"
                    :empty-text="t('settings.noModelSuggestions')" suggestion-mode="all" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiApiKey') }}</div>
            </div>
            <div class="setting-control api-key-control">
                <Input v-model="settingsStore.aiApiKey" type="password" :placeholder="t('settings.aiApiKeyPlaceholder')"
                    class="settings-control-field-lg" />
                <a v-if="currentProvider?.helpUrl" :href="currentProvider.helpUrl" target="_blank" class="help-link"
                    :title="t('settings.getApiKey')">
                    <ExternalLink :size="14" />
                    <span>{{ t('settings.getApiKey') }}</span>
                </a>
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { ExternalLink } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { AI_PROVIDERS } from '@/components/settings/config'

defineProps({
    t: { type: Function, required: true },
})

const settingsStore = useSettingsStore()
const providers = AI_PROVIDERS

const currentProvider = computed(() => {
    return providers.find(p => p.id === settingsStore.aiProvider) || providers[providers.length - 1]
})

const currentProviderModels = computed(() => currentProvider.value?.models || [])
const isCustomProvider = computed(() => settingsStore.aiProvider === 'custom')
</script>
