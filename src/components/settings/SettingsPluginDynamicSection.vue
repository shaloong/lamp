<template>
    <section class="settings-section">
        <h3 class="section-title">{{ resolveLabel(activeSection.label) }}</h3>
        <template v-for="item in activeSection.items" :key="item.id">
            <div class="setting-row">
                <div class="setting-info">
                    <div class="setting-label">{{ resolveLabel(item.label) }}</div>
                    <div v-if="item.description" class="setting-desc">
                        {{ resolveLabel(item.description) }}
                    </div>
                </div>
                <div class="setting-control">
                    <Switch v-if="item.type === 'toggle'" :model-value="getPluginValue(item)"
                        @change="handlePluginSettingChange(item, $event)" />

                    <Input v-else-if="item.type === 'text'" :model-value="getPluginValue(item)"
                        @update:model-value="handlePluginSettingChange(item, $event)"
                        class="settings-control-field-lg" />

                    <textarea v-else-if="item.type === 'textarea'" :value="getPluginValue(item)"
                        @input="handlePluginSettingChange(item, $event.target.value)" rows="4"
                        class="settings-control-field-xl settings-textarea flex rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />

                    <Select v-else-if="item.type === 'select'" :model-value="getPluginValue(item)"
                        @update:model-value="handlePluginSettingChange(item, $event)">
                        <SelectTrigger class="settings-control-field-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="opt in item.options" :key="opt.value" :value="opt.value">
                                {{ resolveLabel(opt.label) }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </template>
    </section>
</template>

<script setup>
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

defineProps({
    activeSection: { type: Object, required: true },
    resolveLabel: { type: Function, required: true },
    getPluginValue: { type: Function, required: true },
    handlePluginSettingChange: { type: Function, required: true },
})
</script>
