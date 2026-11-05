import { ref, watch } from 'vue'

export function useDebounce(sourceRef, delay = 300) {
  const debounced = ref(sourceRef.value)
  let timeoutId = null

  watch(sourceRef, (newVal) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      debounced.value = newVal
    }, delay)
  })

  return debounced
}
