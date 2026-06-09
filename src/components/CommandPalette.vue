<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginHost } from '../plugins/index'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const inputRef = ref(null)
const selectedIndex = ref(0)

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const allCommands = computed(() => {
  const registered = pluginHost.commandService.getAll()
  return registered.map(cmd => ({
    ...cmd,
    matches: !searchQuery.value ||
      cmd.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
  }))
})

const filteredCommands = computed(() =>
  allCommands.value.filter(cmd => cmd.matches)
)

function close() {
  visible.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

async function execute(cmd) {
  try {
    await pluginHost.commandService.execute(cmd.id)
  } catch (err) {
    console.error(`[CommandPalette] Failed to execute "${cmd.id}":`, err)
  }
  close()
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) close()
}

function handleKeydown(e) {
  if (!visible.value) return
  if (e.key === 'Escape') {
    close()
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    e.preventDefault()
  } else if (e.key === 'Enter') {
    const cmd = filteredCommands.value[selectedIndex.value]
    if (cmd) execute(cmd)
    e.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  pluginHost.events.on('lamp.ui.commandPalette.show', () => {
    visible.value = true
    nextTick(() => inputRef.value?.focus())
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible.value" class="command-palette-overlay" @click="handleOverlayClick">
      <div class="command-palette" @click.stop>
        <div class="palette-header">
          <input
            ref="inputRef"
            v-model="searchQuery"
            class="palette-input"
            :placeholder="t('commandPalette.placeholder')"
            @input="selectedIndex = 0"
          />
        </div>
        <div class="palette-list">
          <div v-if="filteredCommands.length === 0" class="palette-empty">
            {{ t('commandPalette.noResults') }}
          </div>
          <div
            v-for="(cmd, idx) in filteredCommands"
            :key="cmd.id"
            class="palette-item"
            :class="{ 'is-selected': idx === selectedIndex }"
            @click="execute(cmd)"
            @mouseenter="selectedIndex = idx"
          >
            <span class="palette-item-label">{{ cmd.label }}</span>
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

<style lang="scss" scoped>

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
  background-color: var(--lamp-color-neutral-light);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-header {
  padding: 12px;
  border-bottom: 1px solid var(--lamp-grey-15);
}

.palette-input {
  width: 100%;
  border: 1px solid var(--lamp-grey-20);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  color: var(--lamp-color-neutral-dark);
  background-color: var(--lamp-grey-05);

  &:focus { border-color: var(--lamp-color-primary); }
  &::placeholder { color: var(--lamp-grey-70); }
}

.palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.palette-empty {
  padding: 16px;
  color: var(--lamp-color-neutral-grey);
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

  &:hover,
  &.is-selected { background-color: var(--lamp-primary-10); }
  &.is-selected { background-color: var(--lamp-primary-15); }
}

.palette-item-label {
  flex: 1;
  font-size: 13px;
  color: var(--lamp-color-neutral-dark);
}

.palette-item-keybinding {
  font-size: 11px;
  color: var(--lamp-color-neutral-grey);
  background-color: var(--lamp-grey-10);
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
}

.palette-item-id {
  font-size: 10px;
  color: var(--lamp-grey-60);
}

.palette-footer {
  padding: 6px 14px;
  border-top: 1px solid var(--lamp-grey-10);
}

.palette-hint {
  font-size: 11px;
  color: var(--lamp-grey-70);

  kbd {
    background-color: var(--lamp-grey-10);
    border-radius: 3px;
    padding: 1px 4px;
    font-family: monospace;
  }
}
</style>
