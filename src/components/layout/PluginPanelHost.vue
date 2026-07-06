<template>
    <div class="plugin-panel-host" style="-webkit-app-region: no-drag">
        <header class="plugin-panel-header">
            <component v-if="iconComponent" :is="iconComponent" :size="16" class="panel-icon" aria-hidden="true" />
            <span class="panel-title">{{ resolveLabel(panel.title) }}</span>
        </header>

        <component v-if="panelComponent" :is="panelComponent" class="plugin-panel-content" />
        <div v-else class="missing-panel">
            {{ t('app.pluginPanelUnavailable') }}
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { lucideIconMap } from '@/components/editor/icons'

const props = defineProps({
    panel: { type: Object, required: true },
})

const { t } = useI18n()

const iconComponent = computed(() => props.panel.icon ? lucideIconMap[props.panel.icon] : null)
const panelComponent = computed(() => {
    return typeof props.panel.component === 'string' ? null : props.panel.component
})

function resolveLabel(label) {
    return resolveI18nLabel(t, label)
}
</script>

<style scoped>
.plugin-panel-host {
    width: 320px;
    min-width: 320px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--background);
    border-right: 1px solid var(--border);
    color: var(--foreground);
    overflow: hidden;
}

.plugin-panel-header {
    height: 36px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklab, var(--muted) 70%, transparent);
    flex-shrink: 0;
}

.panel-icon {
    color: var(--primary);
    flex-shrink: 0;
}

.panel-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
}

.plugin-panel-content {
    flex: 1;
    min-height: 0;
}

.missing-panel {
    padding: 16px;
    color: var(--muted-foreground);
    font-size: 13px;
}
</style>
