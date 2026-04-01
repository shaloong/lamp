import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { pluginHost } from '@/plugins/index'
import { resolveI18nLabel } from '@/lib/resolveI18nLabel'

export function useCommandPalette(props, emit, t, inputRef) {
  const searchQuery = ref('')
  const selectedIndex = ref(0)

  const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const resolveLabel = (label) => {
    return resolveI18nLabel(t, label)
  }

  const filteredCommands = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const commands = pluginHost.commandService.getAll()
    if (!q) return commands

    return commands.filter((cmd) => {
      const label = resolveLabel(cmd.label).toLowerCase()
      const id = (cmd.id || '').toLowerCase()
      const keybinding = (cmd.keybinding || '').toLowerCase()
      return label.includes(q) || id.includes(q) || keybinding.includes(q)
    })
  })

  const close = () => {
    visible.value = false
    searchQuery.value = ''
    selectedIndex.value = 0
  }

  const execute = async (cmd) => {
    try {
      await pluginHost.commandService.execute(cmd.id)
    } catch (err) {
      console.error(`[CommandPalette] Failed to execute "${cmd.id}":`, err)
    }
    close()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      close()
    }
  }

  const handleKeydown = (e) => {
    if (!visible.value) return

    if (e.key === 'Escape') {
      close()
      e.preventDefault()
      return
    }

    if (e.key === 'ArrowDown') {
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
      e.preventDefault()
      return
    }

    if (e.key === 'ArrowUp') {
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      e.preventDefault()
      return
    }

    if (e.key === 'Enter') {
      const cmd = filteredCommands.value[selectedIndex.value]
      if (cmd) {
        execute(cmd)
      }
      e.preventDefault()
    }
  }

  watch(filteredCommands, (list) => {
    if (list.length === 0) {
      selectedIndex.value = 0
    } else if (selectedIndex.value > list.length - 1) {
      selectedIndex.value = list.length - 1
    }
  })

  let offShow = null

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    offShow = pluginHost.events.on('lamp.ui.commandPalette.show', () => {
      visible.value = true
      nextTick(() => inputRef.value?.focus())
    })
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    offShow?.()
  })

  return {
    visible,
    searchQuery,
    selectedIndex,
    filteredCommands,
    close,
    execute,
    handleOverlayClick,
    resolveLabel,
  }
}
