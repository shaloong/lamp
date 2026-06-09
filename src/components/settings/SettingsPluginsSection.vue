<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.plugins') }}</h3>
        <div class="plugins-list">
            <div v-if="pluginHost.loadedManifests.length === 0" class="plugins-empty">
                {{ t('app.noPlugins') }}
            </div>
            <div v-for="plugin in pluginHost.loadedManifests" :key="plugin.id" class="plugin-item">
                <div class="plugin-info">
                    <div class="plugin-name">{{ resolvePluginName(plugin.name) }}</div>
                    <div class="plugin-meta">
                        <span class="plugin-id">{{ plugin.id }}</span>
                        <span v-if="plugin.version" class="plugin-version">v{{ plugin.version }}</span>
                        <span v-if="plugin.description" class="plugin-desc">{{ plugin.description }}</span>
                    </div>
                </div>
                <div class="plugin-actions">
                    <Badge v-if="plugin.disableable === false" variant="secondary">{{ t('app.core') }}</Badge>
                    <Badge v-else variant="default">{{ t('app.enabled') }}</Badge>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { Badge } from '@/components/ui/badge'

defineProps({
    pluginHost: { type: Object, required: true },
    resolvePluginName: { type: Function, required: true },
    t: { type: Function, required: true },
})
</script>
