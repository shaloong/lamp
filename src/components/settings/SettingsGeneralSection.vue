<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.general') }}</h3>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.language') }}</div>
                <div class="setting-desc">{{ t('settings.languageDesc') }}</div>
            </div>
            <div class="setting-control">
                <Select v-model="form.language">
                    <SelectTrigger class="w-44">
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
                <Switch v-model="form.autoSave" />
            </div>
        </div>

        <div class="setting-row" :class="{ disabled: !form.autoSave }">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.autoSaveInterval') }}</div>
            </div>
            <div class="setting-control">
                <Input type="number" v-model.number="form.autoSaveInterval" :min="5" :max="300"
                    :disabled="!form.autoSave" class="w-32.5" />
                <span class="input-suffix">{{ t('settings.seconds') }}</span>
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.restoreOnStart') }}</div>
                <div class="setting-desc">{{ t('settings.restoreOnStartDesc') }}</div>
            </div>
            <div class="setting-control">
                <Switch v-model="form.restoreOnStart" />
            </div>
        </div>

        <div class="setting-row">
            <div class="setting-info">
                <div class="setting-label">{{ t('settings.openLastWorkspace') }}</div>
                <div class="setting-desc">{{ t('settings.openLastWorkspaceDesc') }}</div>
            </div>
            <div class="setting-control">
                <Switch v-model="form.openLastWorkspace" />
            </div>
        </div>
    </section>
</template>

<script setup>
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'

defineProps({
    form: { type: Object, required: true },
    t: { type: Function, required: true },
})
</script>
