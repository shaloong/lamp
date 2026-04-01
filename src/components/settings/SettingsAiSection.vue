<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.ai') }}</h3>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiProvider') }}</div>
            </div>
            <div class="setting-control">
                <Select v-model="aiForm.provider">
                    <SelectTrigger class="w-80">
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
                <Input v-model="aiForm.baseURL" :placeholder="currentProvider?.baseUrl || ''"
                    :disabled="!isCustomProvider" class="w-80" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiModel') }}</div>
            </div>
            <div class="setting-control">
                <Select v-model="aiForm.model">
                    <SelectTrigger class="w-80">
                        <SelectValue :placeholder="t('settings.modelPlaceholder')" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="m in currentProviderModels" :key="m.value" :value="m.value">{{ m.label }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.aiApiKey') }}</div>
            </div>
            <div class="setting-control api-key-control">
                <Input v-model="aiForm.apiKey" type="password" :placeholder="t('settings.aiApiKeyPlaceholder')"
                    class="w-80" />
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ExternalLink } from 'lucide-vue-next'

defineProps({
    aiForm: { type: Object, required: true },
    providers: { type: Array, required: true },
    currentProvider: { type: Object, default: null },
    currentProviderModels: { type: Array, required: true },
    isCustomProvider: { type: Boolean, required: true },
    t: { type: Function, required: true },
})
</script>
