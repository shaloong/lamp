<template>
    <div class="start-page">
        <!-- 主内容区 -->
        <div class="start-content">
            <!-- Logo -->
            <div class="start-header">
                <img src="/src/assets/lamp-icon.svg" alt="Lamp" class="start-logo" />
                <p class="start-greeting">{{ greeting }}</p>
            </div>

            <!-- 快捷操作 -->
            <div class="start-actions">
                <button class="action-button" @click="$emit('new-file')">
                    <FileText :size="20" />
                    <div>
                        <div class="action-label">{{ $t('commands.app.newFile') }}</div>
                        <div class="action-hint">Ctrl+N</div>
                    </div>
                </button>

                <button class="action-button" @click="$emit('open-file')">
                    <FolderOpen :size="20" />
                    <div>
                        <div class="action-label">{{ $t('menu.openFile') }}</div>
                        <div class="action-hint">Ctrl+O</div>
                    </div>
                </button>

                <button class="action-button" @click="$emit('open-workspace')">
                    <FolderPlus :size="20" />
                    <div>
                        <div class="action-label">{{ $t('commands.app.openWorkspace') }}</div>
                        <div class="action-hint">Ctrl+Shift+O</div>
                    </div>
                </button>
            </div>

            <!-- 最近文件 -->
            <div class="start-section">
                <h2 class="section-title">{{ $t('app.recent') || 'Recent Files' }}</h2>
                <div v-if="recentFiles.length > 0" class="recent-list">
                    <button v-for="file in recentFiles.slice(0, 5)" :key="file" class="recent-item"
                        @click="$emit('open-recent', file)">
                        <FileText :size="16" />
                        <span class="recent-name">{{ file.split('\\').pop() || file }}</span>
                    </button>
                </div>
                <div v-else class="recent-empty">{{ $t('app.noRecentFiles') }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { FileText, FolderOpen, FolderPlus } from 'lucide-vue-next'

const greeting = computed(() => {
    const hour = new Date().getHours()
    const lang = typeof navigator !== 'undefined' ? String(navigator.language || '').toLowerCase() : 'en'
    const isZh = lang.startsWith('zh')
    if (isZh) {
        if (hour < 12) return '早上好，开始今天的写作。'
        if (hour < 18) return '下午好，继续推进你的草稿。'
        return '晚上好，适合安静地整理思绪。'
    }
    if (hour < 12) return 'Good morning. Ready to write?'
    if (hour < 18) return 'Good afternoon. Keep your draft moving.'
    return 'Good evening. A great time for deep writing.'
})

defineProps({
    recentFiles: {
        type: Array,
        default: () => [],
    },
})

defineEmits(['new-file', 'open-file', 'open-workspace', 'open-recent'])
</script>

<style scoped>
.start-page {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: linear-gradient(135deg, var(--background) 0%, color-mix(in oklab, var(--background) 95%, var(--foreground)));
    overflow: hidden;
}

.start-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    padding: 60px 80px;
    background: var(--background);
}

.start-content::-webkit-scrollbar {
    width: 6px;
}

.start-content::-webkit-scrollbar-track {
    background: transparent;
}

.start-content::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
}

.start-content::-webkit-scrollbar-thumb:hover {
    background: var(--muted-foreground);
}

.start-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 48px;
}

.start-logo {
    width: 64px;
    height: 64px;
    margin-bottom: 0;
    opacity: 0.8;
    transition: opacity 0.3s;
}

.start-logo:hover {
    opacity: 1;
}

.start-greeting {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--muted-foreground);
    letter-spacing: 0.2px;
}

.start-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
    margin-bottom: 56px;
}

.action-button {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    border: 1px solid color-mix(in oklab, var(--border) 88%, var(--foreground));
    border-radius: 8px;
    background: color-mix(in oklab, var(--card) 92%, var(--background));
    color: var(--foreground);
    cursor: pointer;
    transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
    text-align: left;
    font-size: 13px;

    svg {
        flex-shrink: 0;
        color: var(--muted-foreground);
    }
}

.action-button:hover {
    border-color: color-mix(in oklab, var(--foreground) 30%, var(--border));
    background: color-mix(in oklab, var(--foreground) 6%, var(--card));
    box-shadow: 0 8px 20px color-mix(in oklab, var(--foreground) 10%, transparent);

    svg {
        color: var(--foreground);
    }
}

.action-label {
    font-weight: 500;
    color: var(--foreground);
    margin-bottom: 4px;
}

.action-hint {
    font-size: 12px;
    color: var(--muted-foreground);
}

.start-section {
    margin-bottom: 28px;
}

.section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px 0;
}

.recent-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.recent-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--foreground);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
    text-align: left;
    overflow: hidden;

    svg {
        flex-shrink: 0;
        color: var(--muted-foreground);
    }
}

.recent-item:hover {
    background: color-mix(in oklab, var(--foreground) 5%, transparent);

    svg {
        color: var(--accent);
    }
}

.recent-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recent-empty {
    display: flex;
    align-items: center;
    min-height: 52px;
    border: 1px dashed color-mix(in oklab, var(--border) 85%, var(--foreground));
    border-radius: 8px;
    padding: 0 12px;
    font-size: 12px;
    color: var(--muted-foreground);
}

@media (min-width: 1400px) {
    .start-content {
        padding: 60px 100px;
    }
}

/* 响应式调整 */
@media (max-width: 900px) {
    .start-content {
        padding: 40px 48px;
    }

    .start-header {
        margin-bottom: 48px;
    }

    .start-actions {
        margin-bottom: 48px;
        grid-template-columns: 1fr;
    }
}

/* 滚动时的平顺效果 */
.start-content {
    scroll-behavior: smooth;
}
</style>
