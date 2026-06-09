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
    background-color: transparent;
    color: var(--muted-foreground);
}

.activeToggleButton {
    color: var(--primary);
    border-color: var(--primary);
}
</style>
