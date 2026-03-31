/**
 * useShortcutCenter — centralized keyboard shortcut composable.
 *
 * MUST be called from a Vue component's setup() context.
 * The singleton (keys, pollInterval, watchers) lives at module scope — it is shared
 * across all callers. The component's onUnmounted does NOT tear it down because
 * other components (and the app shell) still need it while they run.
 *
 * The shortcut center does NOT store or call handlers directly.
 * Instead, when a shortcut fires it calls pluginHost.commandService.execute(id),
 * which is the single canonical execution path for both keyboard shortcuts and menu clicks.
 */
import { useMagicKeys } from '@vueuse/core'
import { pluginHost } from '@/plugins/index'

let keys: Record<string, boolean> | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null
const watchers = new Map<string, { keys: string[]; wasActive: boolean }>()

function ensureInit() {
  if (!keys) {
    keys = useMagicKeys({ reactive: true }) as Record<string, boolean>
    pollInterval = setInterval(() => {
      if (!keys) return
      for (const [id, w] of watchers) {
        const allActive = w.keys.every(key => !!keys![key])
        if (allActive && !w.wasActive) {
          const tag = (document.activeElement as HTMLElement)?.tagName
          if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
            // Route through CommandService so both keyboard shortcuts and menu clicks
            // share the same execution path — no double-invocation possible.
            pluginHost.commandService.execute(id).catch(() => {/* unknown command */})
          }
        }
        w.wasActive = allActive
      }
    }, 16)
  }
}

export function useShortcutCenter() {
  ensureInit()

  // Do NOT tear down the global singleton on unmount — it is shared.
  // Each component calling this composable only contributes registrations.

  /**
   * Register a shortcut to watch.
   * @param id Unique command id
   * @param accelerator Accelerator string e.g. 'Ctrl+O'
   */
  function register(id: string, accelerator: string) {
    if (!accelerator) return
    const MOD: Record<string, string> = {
      control: 'ctrl', ctrl: 'ctrl',
      cmd: 'meta', meta: 'meta', command: 'meta',
      alt: 'alt', option: 'alt',
      shift: 'shift',
    }
    const parts = accelerator.split('+').map(p => p.trim())
    const partKeys = parts.map(p => (MOD[p.toLowerCase()] ?? p.toLowerCase()))
    watchers.set(id, { keys: partKeys, wasActive: false })
  }

  return { register }
}
