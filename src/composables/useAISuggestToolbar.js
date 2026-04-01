import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { pluginHost } from '@/plugins/index'

export function useAISuggestToolbar(editorRef) {
  const top = ref(0)
  const left = ref(0)
  const visible = ref(false)
  const currentLabel = ref('')

  const toolbarStyle = computed(() => ({
    top: `${top.value}px`,
    left: `${left.value}px`,
    transform: 'translateY(-100%)',
  }))

  const updatePosition = () => {
    const suggestion = pluginHost.aiState.suggestion
    const editor = editorRef.value
    if (!suggestion || !editor) {
      visible.value = false
      return
    }

    currentLabel.value = suggestion.actionLabel
    try {
      const coords = editor.view.coordsAtPos(suggestion.to)
      top.value = coords.top - 10
      left.value = coords.left
      visible.value = true
    } catch {
      visible.value = false
    }
  }

  const accept = () => {
    const editor = editorRef.value
    if (!editor) return
    visible.value = false
    editor.commands.acceptAISuggestion()
  }

  const dismiss = () => {
    const editor = editorRef.value
    if (!editor) return
    visible.value = false
    editor.commands.dismissAISuggestion()
  }

  let detachEditorUpdate = null

  const bindEditorUpdate = (editor) => {
    detachEditorUpdate?.()
    detachEditorUpdate = null
    if (!editor) return
    detachEditorUpdate = editor.on('update', updatePosition)
  }

  const stopEditorWatch = watch(editorRef, bindEditorUpdate, { immediate: true })

  const stopSuggestionWatch = watch(
    () => pluginHost.aiState.suggestion,
    (suggestion) => {
      if (suggestion) {
        nextTick(updatePosition)
      } else {
        visible.value = false
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    stopEditorWatch()
    stopSuggestionWatch()
    detachEditorUpdate?.()
  })

  return {
    visible,
    currentLabel,
    toolbarStyle,
    accept,
    dismiss,
  }
}
