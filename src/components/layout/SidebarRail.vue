<template>
    <div class="toolbar border-r border-border">
        <button class="toggle-button" :class="{ activeToggleButton: tool1Active }" @click="$emit('toggle-tool1')"
            style="-webkit-app-region: no-drag">
            <Folder :size="20" />
        </button>

        <div class="toolbar-spacer" />

        <button class="toggle-button" @click="$emit('open-settings')" style="-webkit-app-region: no-drag">
            <Settings :size="20" />
        </button>
    </div>
</template>

<script setup>
import { Folder, Settings } from 'lucide-vue-next'

defineProps({
    tool1Active: { type: Boolean, default: false },
})

defineEmits(['toggle-tool1', 'open-settings'])
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
