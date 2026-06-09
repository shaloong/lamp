import { onBeforeUnmount, onMounted } from 'vue'

export function useClickOutside(targetRef, onOutsideClick) {
  const handlePointerDown = (event) => {
    const target = targetRef.value
    if (!target) return
    if (target.contains(event.target)) return
    onOutsideClick(event)
  }

  onMounted(() => {
    document.addEventListener('mousedown', handlePointerDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handlePointerDown)
  })
}