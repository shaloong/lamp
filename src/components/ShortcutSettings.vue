<template>
  <div class="shortcut-settings">
    <!-- 搜索框 -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <Search class="search-icon" :size="14" />
        <Input v-model="searchQuery" class="search-input" :placeholder="t('shortcuts.searchPlaceholder')"
          @keydown.esc="searchQuery = ''" />
      </div>
      <Button variant="outline" size="sm" class="reset-all-btn" @click="handleResetAll">
        {{ t('shortcuts.resetAll') }}
      </Button>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredGroups.length === 0" class="shortcuts-empty">
      <Keyboard class="empty-icon" :size="32" />
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Keyboard } from 'lucide-vue-next'
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
  border-bottom: 1px solid var(--border);
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
  height: 32px;
  padding-left: 32px;
  background: var(--background);
}

.reset-all-btn {
  flex-shrink: 0;
  height: 32px;
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
