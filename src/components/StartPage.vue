<template>
    <div class="start-page">
        <main class="start-content">
            <header class="brand-mark" aria-label="Lamp">
                <img src="/src/assets/lamp-icon.svg" alt="" class="start-logo" />
            </header>

            <section class="start-actions" :aria-label="$t('app.quickActions')">
                <button class="action-button action-button-primary" @click="$emit('new-file')">
                    <FilePlus2 :size="19" :stroke-width="1.8" />
                    <span class="action-label">{{ $t('app.newDocument') }}</span>
                    <kbd class="action-hint">Ctrl+N</kbd>
                </button>

                <button class="action-button" @click="$emit('open-file')">
                    <FolderOpen :size="19" :stroke-width="1.8" />
                    <span class="action-label">{{ $t('menu.openFile') }}</span>
                    <kbd class="action-hint">Ctrl+O</kbd>
                </button>

                <button class="action-button" @click="$emit('open-workspace')">
                    <FolderPlus :size="19" :stroke-width="1.8" />
                    <span class="action-label">{{ $t('commands.app.openWorkspace') }}</span>
                    <kbd class="action-hint">Ctrl+Shift+O</kbd>
                </button>
            </section>

            <section class="recent-section">
                <div class="section-heading">
                    <h1 class="section-title">{{ $t('app.recent') }}</h1>
                </div>

                <div v-if="recentEntries.length" class="recent-list">
                    <button
                        v-for="(file, index) in recentEntries"
                        :key="file.path"
                        class="recent-item"
                        :class="{ 'recent-item-current': index === 0 }"
                        :title="file.path"
                        @click="$emit('open-recent', file.path)"
                    >
                        <span class="recent-icon" aria-hidden="true">
                            <FileText :size="18" :stroke-width="1.7" />
                        </span>
                        <span class="recent-details">
                            <span class="recent-name">{{ file.name }}</span>
                            <span class="recent-path">{{ file.directory }}</span>
                        </span>
                        <span v-if="index === 0" class="continue-label">{{ $t('app.continueWriting') }}</span>
                        <ChevronRight class="recent-arrow" :size="17" :stroke-width="1.8" aria-hidden="true" />
                    </button>
                </div>

                <div v-else class="recent-empty">
                    <FileText :size="20" :stroke-width="1.6" aria-hidden="true" />
                    <span>{{ $t('app.noRecentFiles') }}</span>
                </div>
            </section>
        </main>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronRight, FilePlus2, FileText, FolderOpen, FolderPlus } from 'lucide-vue-next'

const props = defineProps({
    recentFiles: {
        type: Array,
        default: () => [],
    },
})

const recentEntries = computed(() => props.recentFiles.slice(0, 7).map((path) => {
    const normalizedPath = String(path || '').replace(/\\/g, '/')
    const segments = normalizedPath.split('/').filter(Boolean)
    const name = segments.pop() || normalizedPath
    const directory = segments.length ? segments.join('/') : normalizedPath

    return { path, name, directory }
}))

defineEmits(['new-file', 'open-file', 'open-workspace', 'open-recent'])
</script>

<style scoped>
.start-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--background);
}

.start-content {
    width: min(100%, 1320px);
    height: 100%;
    min-height: 0;
    margin: 0 auto;
    padding: clamp(40px, 6vh, 64px) clamp(42px, 4.5vw, 64px) 48px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
}

.start-content::-webkit-scrollbar {
    width: 6px;
}

.start-content::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: var(--border);
}

.brand-mark {
    display: flex;
    width: fit-content;
    align-items: center;
    margin-bottom: 34px;
}

.start-logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
}

.start-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: clamp(36px, 6vh, 56px);
}

.action-button {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) auto;
    align-items: center;
    min-width: 0;
    min-height: 64px;
    gap: 12px;
    padding: 0 18px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--card);
    color: var(--foreground);
    cursor: pointer;
    font: inherit;
    text-align: left;
    transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.action-button svg {
    color: var(--muted-foreground);
}

.action-button:hover {
    border-color: color-mix(in oklab, var(--foreground) 24%, var(--border));
    background: color-mix(in oklab, var(--foreground) 3.5%, var(--card));
    box-shadow: 0 5px 16px color-mix(in oklab, var(--foreground) 7%, transparent);
    transform: translateY(-1px);
}

.action-button:active {
    box-shadow: none;
    transform: translateY(0);
}

.action-button:focus-visible,
.recent-item:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--primary) 72%, transparent);
    outline-offset: 2px;
}

.action-button-primary {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: 0 5px 14px color-mix(in oklab, var(--primary) 18%, transparent);
}

.action-button-primary svg,
.action-button-primary .action-hint {
    color: var(--primary-foreground);
}

.action-button-primary .action-hint {
    opacity: 0.76;
}

.action-button-primary:hover {
    border-color: color-mix(in oklab, var(--primary) 88%, var(--foreground));
    background: color-mix(in oklab, var(--primary) 92%, var(--foreground));
    box-shadow: 0 7px 18px color-mix(in oklab, var(--primary) 24%, transparent);
}

.action-label {
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.action-hint {
    border: 0;
    background: none;
    color: var(--muted-foreground);
    font-family: inherit;
    font-size: 11px;
    line-height: 1;
    white-space: nowrap;
}

.section-heading {
    display: flex;
    min-height: 28px;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.section-title {
    margin: 0;
    color: var(--foreground);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.4;
}

.recent-list {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--card);
}

.recent-item {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto 18px;
    width: 100%;
    min-height: 66px;
    align-items: center;
    gap: 12px;
    padding: 9px 16px;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: var(--foreground);
    cursor: pointer;
    font: inherit;
    text-align: left;
    transition: background-color 130ms ease;
}

.recent-item:last-child {
    border-bottom: 0;
}

.recent-item-current {
    background: color-mix(in oklab, var(--primary) 7%, var(--card));
}

.recent-item:hover {
    background: color-mix(in oklab, var(--foreground) 4%, var(--card));
}

.recent-item-current:hover {
    background: color-mix(in oklab, var(--primary) 10%, var(--card));
}

.recent-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted-foreground);
}

.recent-item-current .recent-icon {
    color: var(--primary);
}

.recent-details {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
}

.recent-name,
.recent-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recent-name {
    font-size: 13px;
    font-weight: 550;
    line-height: 1.25;
}

.recent-path {
    color: var(--muted-foreground);
    font-size: 11px;
    line-height: 1.2;
}

.continue-label {
    color: var(--primary);
    font-size: 11px;
    font-weight: 550;
    white-space: nowrap;
}

.recent-arrow {
    color: var(--muted-foreground);
    opacity: 0;
    transform: translateX(-3px);
    transition: opacity 130ms ease, transform 130ms ease;
}

.recent-item:hover .recent-arrow,
.recent-item:focus-visible .recent-arrow {
    opacity: 1;
    transform: translateX(0);
}

.recent-empty {
    display: flex;
    min-height: 94px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    color: var(--muted-foreground);
    font-size: 12px;
}

@media (max-width: 860px) {
    .start-content {
        padding-right: 32px;
        padding-left: 32px;
    }

    .start-actions {
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .action-button {
        min-height: 56px;
    }
}

@media (max-width: 560px) {
    .start-content {
        padding: 28px 20px 32px;
    }

    .brand-mark {
        margin-bottom: 24px;
    }

    .start-logo {
        width: 44px;
        height: 44px;
    }

    .continue-label {
        display: none;
    }

    .recent-item {
        grid-template-columns: 22px minmax(0, 1fr) 16px;
        gap: 10px;
        padding-right: 12px;
        padding-left: 12px;
    }

    .recent-arrow {
        grid-column: 3;
    }
}

@media (prefers-reduced-motion: reduce) {
    .action-button,
    .recent-arrow,
    .recent-item {
        transition: none;
    }
}
</style>
