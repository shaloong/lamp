<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.general') }}</h3>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.language') }}</div>
                <div class="setting-desc">{{ t('settings.languageDesc') }}</div>
            </div>
            <div class="setting-control">
                <Select v-model="settingsStore.language">
                    <SelectTrigger class="settings-control-field-md">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="zh-CN">简体中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.autoSave') }}</div>
                <div class="setting-desc">{{ t('settings.autoSaveDesc') }}</div>
            </div>
            <div class="setting-control">
                <Switch v-model="settingsStore.autoSave" />
            </div>
        </div>

        <div class="setting-row" :class="{ disabled: !settingsStore.autoSave }">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.autoSaveInterval') }}</div>
            </div>
            <div class="setting-control">
                <Input type="number" v-model.number="settingsStore.autoSaveInterval" :min="5" :max="300"
                    :disabled="!settingsStore.autoSave" class="settings-control-field-sm" />
                <span class="input-suffix">{{ t('settings.seconds') }}</span>
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.restoreOnStart') }}</div>
                <div class="setting-desc">{{ t('settings.restoreOnStartDesc') }}</div>
            </div>
            <div class="setting-control">
                <Switch v-model="settingsStore.restoreOnStart" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.openLastWorkspace') }}</div>
                <div class="setting-desc">{{ t('settings.openLastWorkspaceDesc') }}</div>
            </div>
            <div class="setting-control">
                <Switch v-model="settingsStore.openLastWorkspace" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.focusMode') }}</div>
                <div class="setting-desc">{{ t('settings.focusModeDesc') }}</div>
            </div>
            <div class="setting-control">
                <Switch v-model="settingsStore.focusMode" />
            </div>
        </div>
    </section>
</template>

<script setup>
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '@/stores/settings'

defineProps({
    t: { type: Function, required: true },
})

const settingsStore = useSettingsStore()
</script>
