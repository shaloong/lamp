/**
 * useShortcutCenter — centralized keyboard shortcut composable.
 *
 * MUST be called from a Vue component's setup() context.
 * Returns a simple register() function and manages lifecycle automatically.
 */
import { onUnmounted } from 'vue'
import { useMagicKeys } from '@vueuse/core'

let keys: Record<string, boolean> | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null
const watchers = new Map<string, { keys: string[]; handler: () => void; wasActive: boolean }>()

function ensureInit() {
  if (!keys) {
    // With reactive: true, useMagicKeys returns Record<string, boolean> directly
    keys = useMagicKeys({ reactive: true }) as Record<string, boolean>
    // Poll at ~60fps to detect shortcut activation (rising edge detection)
    pollInterval = setInterval(() => {
      if (!keys) return
      for (const [_id, w] of watchers) {
        const allActive = w.keys.every(key => !!keys![key])
        if (allActive && !w.wasActive) {
          const tag = (document.activeElement as HTMLElement)?.tagName
          if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
            w.handler()
          }
        }
        w.wasActive = allActive
      }
    }, 16)
  }
}

export function useShortcutCenter() {
  ensureInit()

  onUnmounted(() => {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
    watchers.clear()
  })

  /**
   * Register a shortcut to watch.
   * @param id Unique command id
   * @param accelerator Accelerator string e.g. 'Ctrl+O'
   * @param handler Callback when shortcut fires
   */
  function register(id: string, accelerator: string, handler: () => void) {
    if (!accelerator) return
    const MOD: Record<string, string> = {
      control: 'ctrl', ctrl: 'ctrl',
      cmd: 'meta', meta: 'meta', command: 'meta',
      alt: 'alt', option: 'alt',
      shift: 'shift',
    }
    const parts = accelerator.split('+').map(p => p.trim())
    const partKeys = parts.map(p => (MOD[p.toLowerCase()] ?? p.toLowerCase()))
    watchers.set(id, { keys: partKeys, handler, wasActive: false })
  }

  return { register }
}
