import { watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

/**
 * Applies the given theme value to the document root.
 * @param {'light' | 'dark' | 'system'} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // 'system' — follow OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

/**
 * Sets up reactive theme management:
 * - Watches settingsStore.theme and re-applies on change
 * - Listens for OS preference changes (only effective when theme='system')
 *
 * Returns a dispose function to clean up watchers and event listeners.
 */
export function useTheme() {
  const settingsStore = useSettingsStore()

  // Apply immediately with current store value
  applyTheme(settingsStore.theme)

  // Re-apply whenever the store value changes
  const stopWatch = watch(
    () => settingsStore.theme,
    (theme) => applyTheme(theme),
  )

  // Respond to OS preference changes when in 'system' mode
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const onMediaChange = () => {
    if (settingsStore.theme === 'system') {
      applyTheme('system')
    }
  }
  mediaQuery.addEventListener('change', onMediaChange)

  return function dispose() {
    stopWatch()
    mediaQuery.removeEventListener('change', onMediaChange)
  }
}
