<template>
    <section class="settings-section">
        <h3 class="section-title">{{ t('settings.editor') }}</h3>

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
import { Switch } from '@/components/ui/switch'
import { useSettingsStore } from '@/stores/settings'

defineProps({
    t: { type: Function, required: true },
})

const settingsStore = useSettingsStore()
</script>
