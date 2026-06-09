<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommandPalette } from '@/composables/useCommandPalette'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)
const {
  visible,
  searchQuery,
  selectedIndex,
  filteredCommands,
  execute,
  handleOverlayClick,
  resolveLabel,
} = useCommandPalette(props, emit, t, inputRef)
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="command-palette-overlay" @click="handleOverlayClick">
      <div class="command-palette" @click.stop>
        <div class="palette-header">
          <input ref="inputRef" v-model="searchQuery" class="palette-input"
            :placeholder="t('commandPalette.placeholder')" @input="selectedIndex = 0" />
        </div>
        <div class="palette-list">
          <div v-if="filteredCommands.length === 0" class="palette-empty">
            {{ t('commandPalette.noResults') }}
          </div>
          <div v-for="(cmd, idx) in filteredCommands" :key="cmd.id" class="palette-item"
            :class="{ 'is-selected': idx === selectedIndex }" @click="execute(cmd)" @mouseenter="selectedIndex = idx">
            <span class="palette-item-label">{{ resolveLabel(cmd.label) }}</span>
            <span v-if="cmd.keybinding" class="palette-item-keybinding">
              {{ cmd.keybinding }}
            </span>
            <span class="palette-item-id">{{ cmd.id }}</span>
          </div>
        </div>
        <div class="palette-footer">
          <span class="palette-hint" v-html="t('commandPalette.hint')" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding-top: 80px;
}

.command-palette {
  width: 560px;
  max-height: 400px;
  background-color: var(--muted);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-header {
  padding: 12px;
  border-bottom: 1px solid oklch(0 0 0 / 0.15);
}

.palette-input {
  width: 100%;
  border: 1px solid oklch(0 0 0 / 0.20);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  color: var(--foreground);
  background-color: oklch(0 0 0 / 0.05);
}

.palette-input:focus {
  border-color: var(--primary);
}

.palette-input::placeholder {
  color: oklch(0.35 0 0);
}

.palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.palette-empty {
  padding: 16px;
  color: var(--muted-foreground);
  font-size: 13px;
  text-align: center;
}

.palette-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 6px;
}

.palette-item:hover,
.palette-item.is-selected {
  background-color: oklch(0.5462 0.2451 265.5 / 0.10);
}

.palette-item.is-selected {
  background-color: oklch(0.5462 0.2451 265.5 / 0.15);
}

.palette-item-label {
  flex: 1;
  font-size: 13px;
  color: var(--foreground);
}

.palette-item-keybinding {
  font-size: 11px;
  color: var(--muted-foreground);
  background-color: oklch(0 0 0 / 0.10);
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
}

.palette-item-id {
  font-size: 10px;
  color: oklch(0.40 0 0);
}

.palette-footer {
  padding: 6px 14px;
  border-top: 1px solid oklch(0 0 0 / 0.10);
}

.palette-hint {
  font-size: 11px;
  color: oklch(0.35 0 0);
}

.palette-hint kbd {
  background-color: oklch(0 0 0 / 0.10);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: monospace;
}
</style>
