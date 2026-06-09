<template>
    <div class="tool-view" v-show="tool1Active || tool2Active" style="-webkit-app-region: no-drag">
        <div v-show="tool1Active" class="tool1" :class="{ active: tool1Active }">
            <div v-if="workspaceStore.isOpen" class="file-explorer">
                <div class="workspace-header">
                    <span class="workspace-name" :title="workspaceStore.rootPath">
                        <Folder :size="16" class="workspace-icon" />
                        {{ workspaceStore.name }}
                    </span>
                </div>

                <div v-if="folderContent !== ''" class="folder-tree">
                    <FileTree :data="folderContent" :height="toolViewHeight" :expandedKeys="expandedKeys"
                        @node-click="$emit('node-click', $event)" @toggle-expand="$emit('toggle-expand', $event)" />
                </div>

                <div v-if="tempFiles.length > 0" class="temp-files-section">
                    <div class="section-header" @click="$emit('update:tempSectionExpanded', !tempSectionExpanded)">
                        <ChevronRight :size="12" class="expand-arrow" :class="{ expanded: tempSectionExpanded }" />
                        <span>{{ $t('app.tempFiles') }}</span>
                        <span class="file-count">({{ tempFiles.length }})</span>
                    </div>

                    <div v-show="tempSectionExpanded" class="temp-files-list">
                        <div v-for="file in tempFiles" :key="file.path" class="temp-file-item"
                            @click="$emit('open-temp-file', file)">
                            <File :size="14" class="temp-file-icon" />
                            <span class="file-name" :title="file.path">
                                {{ file.name }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="no-workspace">
                <div class="no-workspace-content">
                    <p class="empty-text">
                        {{ $t('app.noWorkspace') }}
                    </p>
                    <div class="action-buttons">
                        <Button @click="$emit('open-workspace')">
                            {{ $t('app.openWorkspace') }}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import FileTree from '@/components/FileTree.vue'
import Button from '@/components/ui/button/Button.vue'
import { Folder, File, ChevronRight } from 'lucide-vue-next'

defineProps({
    tool1Active: { type: Boolean, default: false },
    tool2Active: { type: Boolean, default: false },
    workspaceStore: { type: Object, required: true },
    folderContent: { type: [Array, String], default: '' },
    toolViewHeight: { type: Number, default: 400 },
    tempFiles: { type: Array, default: () => [] },
    tempSectionExpanded: { type: Boolean, default: true },
    expandedKeys: { type: Array, default: () => [] },
})

defineEmits([
    'open-workspace',
    'open-temp-file',
    'node-click',
    'toggle-expand',
    'update:tempSectionExpanded',
])
</script>

<style scoped>
.tool-view {
    width: 300px;
    display: flex;
    flex-direction: column;
    background-color: var(--muted);
    border-right: 1px solid var(--border);
}

.tool1 {
    flex-grow: 1;
}

.workspace-header {
    padding: 8px 12px;
    border-bottom: 1px solid oklch(0 0 0 / 0.15);
    background-color: oklch(0 0 0 / 0.05);
}

.workspace-name {
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
}

.workspace-icon {
    flex-shrink: 0;
    margin-right: 6px;
    color: var(--primary);
}

.temp-files-section {
    border-top: 1px solid oklch(0 0 0 / 0.15);
    background-color: oklch(0 0 0 / 0.03);
    max-height: 150px;
    overflow-y: auto;
}

.section-header {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted-foreground);
    cursor: pointer;
}

.expand-arrow {
    margin-right: 4px;
    transition: transform 0.15s ease;
}

.expand-arrow.expanded {
    transform: rotate(90deg);
}

.file-count {
    margin-left: 4px;
    opacity: 0.7;
}

.temp-files-list {
    padding: 4px 0;
}

.temp-file-item {
    display: flex;
    align-items: center;
    padding: 4px 12px 4px 24px;
    font-size: 13px;
    cursor: pointer;
}

.temp-file-icon {
    margin-right: 6px;
    color: var(--muted-foreground);
}

.file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--foreground);
}

.no-workspace {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 20px;
}

.no-workspace-content {
    text-align: center;
}

.empty-text {
    font-size: 14px;
    color: var(--muted-foreground);
    margin-bottom: 20px;
}
</style>
