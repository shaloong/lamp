<template>
  <Dialog :open="visible" @update:open="visible = $event">
    <DialogContent class="max-w-180 max-h-[85vh]" @pointer-down-outside="() => { }">
      <DialogHeader>
        <DialogTitle>{{ t('settings.title') }}</DialogTitle>
      </DialogHeader>

      <div class="settings-layout">
        <!-- 左侧导航 -->
        <nav class="settings-nav">
          <template v-for="item in allNavItems" :key="item.id">
            <div v-if="item.type === 'divider'" class="nav-divider" />
            <button v-else class="nav-item" :class="{ active: activeTab === item.id }" @click="activeTab = item.id">
              <span class="nav-icon">
                <component :is="getNavIcon(item.icon)" :size="16" />
              </span>
              <span class="nav-label">{{ item.label }}</span>
            </button>
          </template>
        </nav>

        <!-- 右侧内容 -->
        <div class="settings-content">
          <SettingsGeneralSection v-if="activeTab === 'general'" :form="form" :t="t" />

          <SettingsAiSection v-else-if="activeTab === 'ai'" :ai-form="aiForm" :providers="providers"
            :current-provider="currentProvider" :current-provider-models="currentProviderModels"
            :is-custom-provider="isCustomProvider" :t="t" />

          <SettingsPluginsSection v-else-if="activeTab === 'plugins'" :plugin-host="pluginHost"
            :resolve-plugin-name="resolvePluginName" :t="t" />

          <SettingsPluginDynamicSection v-else-if="activeSection" :active-section="activeSection"
            :resolve-label="resolveLabel" :get-plugin-value="getPluginValue"
            :handle-plugin-setting-change="handlePluginSettingChange" />

          <!-- 快捷键设置 -->
          <section v-else-if="activeTab === 'shortcuts'" class="settings-section settings-shortcuts">
            <ShortcutSettings />
          </section>

          <!-- 其他标签 - 预留 -->
          <section v-else class="settings-section settings-placeholder">
            <p style="color: var(--muted-foreground); font-size: 13px; text-align: center; margin-top: 60px">
              {{navItems.find(n => n.id === activeTab)?.label || activeTab}} — Coming soon
            </p>
          </section>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="handleClose">
          {{ isBuiltInTab ? t('common.cancel') : t('common.close') }}
        </Button>
        <Button v-if="isBuiltInTab" :disabled="submitting" @click="handleSave">
          {{ submitting ? t('common.saving') : t('common.save') }}
        </Button>
      </DialogFooter>
      <DialogClose class="absolute right-4 top-4" />
    </DialogContent>
  </Dialog>
</template>

<script setup>
import ShortcutSettings from './ShortcutSettings.vue'
import SettingsGeneralSection from '@/components/settings/SettingsGeneralSection.vue'
import SettingsAiSection from '@/components/settings/SettingsAiSection.vue'
import SettingsPluginsSection from '@/components/settings/SettingsPluginsSection.vue'
import SettingsPluginDynamicSection from '@/components/settings/SettingsPluginDynamicSection.vue'
import { useSettingsDialogState } from '@/composables/useSettingsDialogState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, Bot, Puzzle, Keyboard, ExternalLink, Edit3 } from 'lucide-vue-next'

const navIconMap = {
  setting: Settings,
  edit: Edit3,
  Bot,
  plugin: Puzzle,
  jianpankuaijiejian: Keyboard,
  tongzhi: ExternalLink,
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const {
  pluginHost,
  t,
  visible,
  activeTab,
  submitting,
  form,
  providers,
  aiForm,
  currentProvider,
  currentProviderModels,
  isCustomProvider,
  navItems,
  allNavItems,
  activeSection,
  isBuiltInTab,
  resolveLabel,
  resolvePluginName,
  getPluginValue,
  handlePluginSettingChange,
  handleSave,
  handleClose,
} = useSettingsDialogState(props, emit)

function getNavIcon(icon) {
  return navIconMap[icon] || Settings
}
</script>

<style>
.settings-layout {
  display: flex;
  gap: 0;
  min-height: 400px;
  max-height: calc(85vh - 140px);
}

.settings-nav-scroll {
  width: 192px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--border);
}

.settings-nav {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--muted-foreground);
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
  width: 100%;

  &:hover {
    background-color: var(--accent);
    color: var(--foreground);
  }

  &.active {
    background-color: var(--accent);
    color: var(--foreground);
    font-weight: 500;
  }
}

.nav-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-divider {
  height: 1px;
  background-color: var(--border);
  margin: 4px 8px;
}

.settings-content {
  flex: 1;
  padding: 8px 24px;
  overflow-y: auto;
  min-width: 0;
  text-align: left;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.setting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--accent);

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.setting-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground);
  margin-bottom: 2px;
}

.setting-desc {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.4;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.input-suffix {
  font-size: 12px;
  color: var(--muted-foreground);
}

.settings-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--primary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.api-key-control {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.help-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.plugins-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plugins-empty {
  color: var(--muted-foreground);
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}

.plugin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  background-color: var(--secondary);
  border: 1px solid var(--border);
  gap: 16px;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground);
  margin-bottom: 2px;
}

.plugin-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.plugin-id {
  font-family: monospace;
}

.plugin-version {
  color: var(--muted-foreground);
}

.plugin-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-actions {
  flex-shrink: 0;
}
</style>
