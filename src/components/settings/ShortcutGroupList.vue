<template>
    <div class="shortcuts-groups">
        <div v-for="group in groups" :key="group.pluginId" class="shortcut-group">
            <div class="group-header">
                {{ group.pluginId === 'lamp.app' ? t('commands.app.title') : (group.pluginId === 'builtin' ?
                    t('shortcuts.builtin') : group.pluginId) }}
            </div>
            <div class="group-items">
                <div v-for="item in group.items" :key="item.id" class="shortcut-row" :class="{
                    'is-recording': recordingId === item.id,
                    'has-conflict': conflictId === item.id,
                }" @click="$emit('start-recording', item)">
                    <div class="shortcut-info">
                        <span class="shortcut-label">{{ resolveLabel(item.label) }}</span>
                    </div>
                    <div class="shortcut-control">
                        <template v-if="recordingId === item.id">
                            <span class="recording-hint">{{ t('shortcuts.recording') }}</span>
                            <button class="cancel-btn" @click.stop="$emit('cancel-recording')">
                                <X :size="14" />
                            </button>
                        </template>

                        <template v-else-if="conflictId === item.id">
                            <span class="conflict-hint">
                                <AlertTriangle :size="12" />
                                {{ t('shortcuts.conflict') }}
                            </span>
                            <button class="cancel-btn" @click.stop="$emit('clear-conflict')">
                                <X :size="14" />
                            </button>
                        </template>

                        <template v-else>
                            <kbd class="shortcut-key">{{ item.effectiveAccelerator || '—' }}</kbd>
                            <button class="reset-btn" :title="t('shortcuts.reset')"
                                @click.stop="$emit('reset-shortcut', item.id)">
                                <RotateCcw :size="12" />
                            </button>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { AlertTriangle, RotateCcw, X } from 'lucide-vue-next'

defineProps({
    groups: { type: Array, required: true },
    recordingId: { type: String, default: null },
    conflictId: { type: String, default: null },
    resolveLabel: { type: Function, required: true },
    t: { type: Function, required: true },
})

defineEmits(['start-recording', 'cancel-recording', 'clear-conflict', 'reset-shortcut'])
</script>

<style scoped>
.shortcuts-groups {
    overflow-y: auto;
    flex: 1;
}

.shortcut-group {
    margin-bottom: 20px;
}

.group-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    padding: 0 2px;
}

.group-items {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
}

.shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    gap: 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background-color 0.12s;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: color-mix(in oklab, var(--foreground) 6%, transparent);
    }

    &.is-recording {
        background-color: color-mix(in oklab, var(--primary) 12%, transparent);
        outline: 1px solid color-mix(in oklab, var(--primary) 70%, transparent);
    }

    &.has-conflict {
        background-color: color-mix(in oklab, var(--destructive) 11%, transparent);
        outline: 1px solid color-mix(in oklab, var(--destructive) 70%, transparent);
    }
}

.shortcut-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.shortcut-label {
    font-size: 13px;
    color: var(--foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.shortcut-control {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.shortcut-key {
    display: inline-block;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--muted);
    font-size: 11px;
    font-family: inherit;
    color: var(--foreground);
    white-space: nowrap;
    min-width: 60px;
    text-align: center;
    letter-spacing: 0.02em;
}

.recording-hint {
    font-size: 12px;
    color: var(--primary);
    animation: blink 1s ease-in-out infinite;
}

.conflict-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--destructive);
}

.cancel-btn,
.reset-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    color: var(--muted-foreground);

    &:hover {
        background-color: color-mix(in oklab, var(--foreground) 8%, transparent);
        color: var(--foreground);
    }
}

@keyframes blink {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.45;
    }
}
</style>
