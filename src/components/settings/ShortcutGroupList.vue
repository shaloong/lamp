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
                                <svg viewBox="0 0 1024 1024" fill="currentColor" width="14" height="14">
                                    <path
                                        d="M810.7 273.4L691.6 392.5l119.1 119.1-119.1 119.1L691.6 630.7l119.1-119.1L691.6 392.5l119.1-119.1z" />
                                </svg>
                            </button>
                        </template>

                        <template v-else-if="conflictId === item.id">
                            <span class="conflict-hint">
                                <svg viewBox="0 0 1024 1024" fill="currentColor" width="12" height="12">
                                    <path
                                        d="M512 85.3L85.3 512l426.7 426.7L896 576 469.3 149.3 896 85.3 832 21.3 512 341.3 192 21.3z" />
                                </svg>
                                {{ t('shortcuts.conflict') }}
                            </span>
                            <button class="cancel-btn" @click.stop="$emit('clear-conflict')">
                                <svg viewBox="0 0 1024 1024" fill="currentColor" width="14" height="14">
                                    <path
                                        d="M810.7 273.4L691.6 392.5l119.1 119.1-119.1 119.1L691.6 630.7l119.1-119.1L691.6 392.5l119.1-119.1z" />
                                </svg>
                            </button>
                        </template>

                        <template v-else>
                            <kbd class="shortcut-key">{{ item.effectiveAccelerator || '—' }}</kbd>
                            <button class="reset-btn" :title="t('shortcuts.reset')"
                                @click.stop="$emit('reset-shortcut', item.id)">
                                <svg viewBox="0 0 1024 1024" fill="currentColor" width="12" height="12">
                                    <path
                                        d="M512 170.7c-188.2 0-341.3 153.2-341.3 341.3S323.8 853.3 512 853.3 853.3 700.2 853.3 512 700.2 170.7 512 170.7zM512 768c-141.4 0-256-114.6-256-256S370.6 256 512 256s256 114.6 256 256-114.6 256-256 256zM298.7 554.7L213.3 640l85.4 85.3 85.3-85.3L469.3 640 384 554.7l-85.3-85.3z" />
                                </svg>
                            </button>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
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
    border: 1px solid oklch(0 0 0 / 0.15);
    border-radius: 8px;
    overflow: hidden;
}

.shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    gap: 12px;
    border-bottom: 1px solid oklch(0 0 0 / 0.08);
    cursor: pointer;
    transition: background-color 0.12s;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: oklch(0 0 0 / 0.05);
    }

    &.is-recording {
        background-color: rgba(64, 158, 255, 0.08);
        outline: 1px solid var(--primary);
    }

    &.has-conflict {
        background-color: rgba(245, 108, 108, 0.06);
        outline: 1px solid #f56c6c;
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
    border: 1px solid oklch(0 0 0 / 0.15);
    border-radius: 4px;
    background: oklch(0 0 0 / 0.05);
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
    color: #f56c6c;
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

    &:hover {
        background-color: oklch(0 0 0 / 0.08);
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
