<template>
    <div class="sidebar-shell" @contextmenu="$emit('contextmenu', $event)">
        <SidebarRail :explorerPanelActive="explorerPanelActive" @toggle-explorer-panel="$emit('toggle-explorer-panel')"
            :showExplorerButton="showExplorerButton" @open-settings="$emit('open-settings')" />

        <WorkspacePanel :explorerPanelActive="explorerPanelActive" :workspaceStore="workspaceStore"
            :folderContent="folderContent" :toolViewHeight="toolViewHeight" :tempFiles="tempFiles"
            :tempSectionExpanded="tempSectionExpanded" :expandedKeys="expandedKeys"
            @open-workspace="$emit('open-workspace')" @open-temp-file="$emit('open-temp-file', $event)"
            @node-click="$emit('node-click', $event)" @toggle-expand="$emit('toggle-expand', $event)"
            @update:tempSectionExpanded="$emit('update:tempSectionExpanded', $event)" />
    </div>
</template>

<script setup>
import SidebarRail from './SidebarRail.vue'
import WorkspacePanel from './WorkspacePanel.vue'

defineProps({
    explorerPanelActive: { type: Boolean, default: false },
    showExplorerButton: { type: Boolean, default: true },
    workspaceStore: { type: Object, required: true },
    folderContent: { type: [Array, String], default: '' },
    toolViewHeight: { type: Number, default: 400 },
    tempFiles: { type: Array, default: () => [] },
    tempSectionExpanded: { type: Boolean, default: true },
    expandedKeys: { type: Array, default: () => [] },
})

defineEmits([
    'toggle-explorer-panel',
    'open-settings',
    'open-workspace',
    'open-temp-file',
    'node-click',
    'toggle-expand',
    'update:tempSectionExpanded',
    'contextmenu',
])
</script>

<style scoped>
.sidebar-shell {
    display: grid;
    grid-template-columns: 42px auto;
    height: 100%;
    min-height: 0;
}
</style>
