<template>
    <div class="toolbar border-r border-border">
        <button v-if="showExplorerButton" class="toggle-button" :class="{ activeToggleButton: explorerPanelActive }"
            @click="$emit('toggle-explorer-panel')" style="-webkit-app-region: no-drag">
            <Folder :size="20" />
        </button>

        <button v-for="panel in visiblePluginPanels" :key="panel.panelKey" class="toggle-button"
            :class="{ activeToggleButton: activePluginPanelId === panel.panelKey }" :title="resolveLabel(panel.title)"
            @click="$emit('toggle-plugin-panel', panel.panelKey)" style="-webkit-app-region: no-drag">
            <component v-if="getIcon(panel.icon)" :is="getIcon(panel.icon)" :size="20" />
            <BarChart3 v-else :size="20" />
        </button>

        <div class="toolbar-spacer" />

        <button class="toggle-button" @click="$emit('open-settings')" style="-webkit-app-region: no-drag">
            <Settings :size="20" />
        </button>
    </div>
</template>

<script setup>
import { BarChart3, Folder, Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'
import { lucideIconMap } from '@/components/editor/icons'

const { t } = useI18n()

defineProps({
    explorerPanelActive: { type: Boolean, default: false },
    showExplorerButton: { type: Boolean, default: true },
    visiblePluginPanels: { type: Array, default: () => [] },
    activePluginPanelId: { type: String, default: '' },
})

defineEmits(['toggle-explorer-panel', 'toggle-plugin-panel', 'open-settings'])

function getIcon(icon) {
    return icon ? lucideIconMap[icon] : null
}

function resolveLabel(label) {
    return resolveI18nLabel(t, label)
}
</script>

<style scoped>
.toolbar {
    position: relative;
    width: 42px;
    height: 100%;
    flex-shrink: 0;
    background-color: var(--muted);
    display: flex;
    flex-direction: column;
}

.toolbar-spacer {
    flex: 1;
}

.toggle-button {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 6px 4px;
    width: 32px;
    height: 32px;
    overflow: hidden;
    border: none;
    background-color: transparent;
    color: var(--muted-foreground);
    border-radius: var(--radius-sm);
    opacity: 0.7;
    transition: color 0.15s ease, opacity 0.15s ease;
}

.toggle-button:hover {
    color: var(--foreground);
    opacity: 1;
}

.toggle-button:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--ring) 55%, transparent);
    outline-offset: 1px;
}

.activeToggleButton {
    color: var(--primary);
    opacity: 1;
}
</style>
