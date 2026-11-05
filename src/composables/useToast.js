import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  const remove = (id) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const show = ({ message, type = 'success', duration = 3500 }) => {
    if (!message) return
    const id = nextId++
    toasts.value.push({ id, message, type })

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
  }

  const success = (message, duration = 3500) => show({ message, type: 'success', duration })
  const error = (message, duration = 4500) => show({ message, type: 'error', duration })
  const warning = (message, duration = 4000) => show({ message, type: 'warning', duration })
  const info = (message, duration = 3500) => show({ message, type: 'info', duration })

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    remove,
  }
}
