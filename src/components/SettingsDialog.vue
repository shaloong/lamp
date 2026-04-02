<template>
  <Dialog :open="visible" @update:open="visible = $event">
    <DialogContent class="max-h-[85vh]" style="max-width: 48rem" @pointer-down-outside="() => { }">
      <DialogHeader>
        <DialogTitle>{{ t('settings.title') }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('settings.title') }}</DialogDescription>
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
          <component v-if="activeBuiltinComponent" :is="activeBuiltinComponent" :key="activeTab"
            v-bind="activeBuiltinProps" />

          <SettingsPluginDynamicSection v-else-if="activeNavItem?.type === 'plugin' && activeSection"
            :active-section="activeSection" :resolve-label="resolveLabel" :get-plugin-value="getPluginValue"
            :handle-plugin-setting-change="handlePluginSettingChange" />

          <!-- 其他标签 - 预留 -->
          <section v-else class="settings-section settings-placeholder">
            <p style="color: var(--muted-foreground); font-size: 13px; text-align: center; margin-top: 60px">
              {{ activeNavItem?.label || activeTab }} — Coming soon
            </p>
          </section>
        </div>
      </div>

      <DialogClose class="absolute right-4 top-4" />
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
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
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
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
  allNavItems,
  activeNavItem,
  activeSection,
  resolveLabel,
  resolvePluginName,
  getPluginValue,
  handlePluginSettingChange,
} = useSettingsDialogState(props, emit)

const builtinSectionComponentMap = {
  general: SettingsGeneralSection,
  ai: SettingsAiSection,
  plugins: SettingsPluginsSection,
  shortcuts: ShortcutSettings,
}

const activeBuiltinComponent = computed(() => {
  if (activeNavItem.value?.type !== 'builtin') return null
  return builtinSectionComponentMap[activeNavItem.value.section?.kind] || null
})

const activeBuiltinProps = computed(() => {
  const kind = activeNavItem.value?.section?.kind
  if (kind === 'general') {
    return { t }
  }
  if (kind === 'ai') {
    return { t }
  }
  if (kind === 'plugins') {
    return {
      pluginHost,
      resolvePluginName,
      t,
    }
  }
  return {}
})

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
  padding: 8px 16px 8px 0;
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
  padding: 8px 6px 8px 24px;
  overflow-y: auto;
  min-width: 0;
  text-align: left;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  margin: 0 0 12px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.setting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in oklab, var(--border) 85%, transparent);

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
  margin-bottom: 3px;
}

.setting-desc {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.5;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.settings-control-field-sm {
  width: 8.5rem;
  max-width: 100%;
}

.settings-control-field-md {
  width: 11rem;
  max-width: 100%;
}

.settings-control-field-lg {
  width: 20rem;
  max-width: 100%;
}

.settings-control-field-xl {
  width: 28rem;
  max-width: 100%;
}

.settings-textarea {
  min-height: 96px;
  resize: vertical;
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
  gap: 10px;
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
  padding: 12px 12px;
  border-radius: 6px;
  background-color: color-mix(in oklab, var(--foreground) 4%, var(--background));
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
