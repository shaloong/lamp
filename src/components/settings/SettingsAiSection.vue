<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.ai') }}</h3>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiProvider') }}</div>
            </div>
            <div class="setting-control">
                <Select v-model="aiFormModel.provider">
                    <SelectTrigger class="settings-control-field-lg">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="p in providersModel" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiBaseUrl') }}</div>
            </div>
            <div class="setting-control">
                <Input v-model="aiFormModel.baseUrl" :placeholder="currentProviderModel?.baseUrl || ''"
                    :disabled="!isCustomProviderModel" class="settings-control-field-lg" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiModel') }}</div>
            </div>
            <div class="setting-control">
                <Combobox v-model="aiFormModel.model" class="settings-control-field-lg"
                    :options="currentProviderModelsModel" :placeholder="t('settings.modelPlaceholder')"
                    :empty-text="t('settings.noModelSuggestions')" suggestion-mode="all" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiApiKey') }}</div>
            </div>
            <div class="setting-control api-key-control">
                <Input v-model="aiFormModel.apiKey" type="password" :placeholder="t('settings.aiApiKeyPlaceholder')"
                    class="settings-control-field-lg" />
                <a v-if="currentProviderModel?.helpUrl" :href="currentProviderModel.helpUrl" target="_blank"
                    class="help-link" :title="t('settings.getApiKey')">
                    <ExternalLink :size="14" />
                    <span>{{ t('settings.getApiKey') }}</span>
                </a>
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed, unref } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { ExternalLink } from 'lucide-vue-next'

const props = defineProps({
    aiForm: { type: Object, required: true },
    providers: { type: [Array, Object], required: true },
    currentProvider: { type: Object, default: null },
    currentProviderModels: { type: [Array, Object], required: true },
    isCustomProvider: { type: [Boolean, Object], required: true },
    t: { type: Function, required: true },
})

const aiFormModel = computed(() => {
    const raw = unref(props.aiForm)
    if (raw && typeof raw === 'object') return raw
    return { provider: '', baseUrl: '', apiKey: '', model: '' }
})

const providersModel = computed(() => {
    const raw = unref(props.providers)
    return Array.isArray(raw) ? raw : []
})

const currentProviderModel = computed(() => {
    const raw = unref(props.currentProvider)
    return raw && typeof raw === 'object' ? raw : null
})

const currentProviderModelsModel = computed(() => {
    const raw = unref(props.currentProviderModels)
    return Array.isArray(raw) ? raw : []
})

const isCustomProviderModel = computed(() => {
    const raw = unref(props.isCustomProvider)
    return typeof raw === 'boolean' ? raw : !!raw
})

</script>
