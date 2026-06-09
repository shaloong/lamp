<template>
    <div class="toolbar-area" v-if="editor">
        <template v-for="item in pluginHost.contributions.sortedEditorToolbar" :key="item.id">
            <ToolbarDropdown v-if="item.type === 'dropdown' && item.children" :label="resolveLabel(item.label)"
                :children="item.children" :editor="editor"
                :is-disabled="item.isDisabled ? item.isDisabled(editor) : false" />
            <button v-else @click="invokeAction(item.pluginId, item.action)"
                :class="{ 'is-active': item.isActive ? item.isActive(editor) : false }"
                :disabled="item.isDisabled ? item.isDisabled(editor) : false"
                :title="resolveLabel(item.label) + (item.keybinding ? ' (' + item.keybinding + ')' : '')">
                <component v-if="item.icon && lucideIconMap[item.icon]" :is="lucideIconMap[item.icon]" :size="16"
                    class="icon" aria-hidden="true" />
                <span v-else class="btn-label">{{ resolveLabel(item.label) }}</span>
            </button>
        </template>
    </div>
</template>

<script setup>
import ToolbarDropdown from '@/components/ToolbarDropdown.vue'
import { pluginHost } from '@/plugins/index'
import { lucideIconMap } from './icons'

defineProps({
    editor: { type: Object, default: null },
    resolveLabel: { type: Function, required: true },
    invokeAction: { type: Function, required: true },
})
</script>
