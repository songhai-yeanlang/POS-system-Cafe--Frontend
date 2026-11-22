import { getCurrentScope, onScopeDispose, ref, watch } from 'vue'

export function useDebounce(sourceOrFn, delay = 300) {
  let timeoutId = null

  const clearTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(clearTimer)
  }

  if (typeof sourceOrFn === 'function') {
    const debouncedFn = (...args) => {
      clearTimer()
      timeoutId = setTimeout(() => {
        timeoutId = null
        sourceOrFn(...args)
      }, delay)
    }
    debouncedFn.cancel = clearTimer
    return debouncedFn
  }

  const debounced = ref(sourceOrFn?.value)

  watch(sourceOrFn, (newVal) => {
    clearTimer()
    timeoutId = setTimeout(() => {
      timeoutId = null
      debounced.value = newVal
    }, delay)
  })

  return debounced
}
