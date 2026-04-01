<template>
  <div class="shortcut-settings">
    <!-- 搜索框 -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 1024 1024" fill="currentColor">
          <path
            d="M480.8 137.6c-88.8 0-171.4 34.6-232.5 95.7-61.1 61.1-95.7 143.7-95.7 232.5 0 88.8 34.6 171.4 95.7 232.5 61.1 61.1 143.7 95.7 232.5 95.7 88.8 0 171.4-34.6 232.5-95.7 61.1-61.1 95.7-143.7 95.7-232.5 0-88.8-34.6-171.4-95.7-232.5C652.2 172.2 569.6 137.6 480.8 137.6zM480.8 32c248.4 0 448 199.6 448 448S729.2 928 480.8 928 32 728.4 32 480 231.6 32 480.8 32zM397.9 166.3c-54.5 54.5-84.6 127.9-84.6 205.5 0 77.6 30.1 151 84.6 205.5 54.5 54.5 127.9 84.6 205.5 84.6 77.6 0 151-30.1 205.5-84.6 54.5-54.5 84.6-127.9 84.6-205.5 0-77.6-30.1-151-84.6-205.5-54.5-54.5-127.9-84.6-205.5-84.6-77.6 0-151 30.1-205.5 84.6z" />
        </svg>
        <input v-model="searchQuery" class="search-input" :placeholder="t('shortcuts.searchPlaceholder')"
          @keydown.esc="searchQuery = ''" />
      </div>
      <button class="reset-all-btn" @click="handleResetAll">
        {{ t('shortcuts.resetAll') }}
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredGroups.length === 0" class="shortcuts-empty">
      <svg viewBox="0 0 1024 1024" fill="currentColor" class="empty-icon">
        <path d="M576 192v64H448v64h128v64H320v-64h128v-64H320v-64h256zM192 768V64h640v704H192z" />
      </svg>
      <p>{{ t('shortcuts.empty') }}</p>
    </div>

    <!-- 分组列表 -->
    <ShortcutGroupList v-else :groups="filteredGroups" :recording-id="recordingId" :conflict-id="conflictId"
      :resolve-label="resolveLabel" :t="t" @start-recording="startRecording" @cancel-recording="cancelRecording"
      @clear-conflict="clearConflict" @reset-shortcut="handleReset" />
  </div>
</template>

<script setup>
import ShortcutGroupList from '@/components/settings/ShortcutGroupList.vue'
import { useShortcutSettings } from '@/composables/useShortcutSettings'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const {
  searchQuery,
  recordingId,
  conflictId,
  filteredGroups,
  resolveLabel,
  startRecording,
  cancelRecording,
  clearConflict,
  handleReset,
  handleResetAll,
} = useShortcutSettings(t)
</script>

<style scoped>
.shortcut-settings {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid oklch(0 0 0 / 0.15);
  margin-bottom: 16px;
}

.search-input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--muted-foreground);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 10px 7px 32px;
  border: 1px solid oklch(0 0 0 / 0.15);
  border-radius: 6px;
  background: oklch(0 0 0 / 0.05);
  font-size: 13px;
  color: var(--foreground);
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--muted-foreground);
  }
}

.reset-all-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid oklch(0 0 0 / 0.15);
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background-color: oklch(0 0 0 / 0.08);
    color: var(--foreground);
  }
}

.shortcuts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--muted-foreground);
  font-size: 13px;

  .empty-icon {
    width: 32px;
    height: 32px;
    opacity: 0.4;
  }
}
</style>
