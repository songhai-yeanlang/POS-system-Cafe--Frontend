import { computed } from 'vue'
import { useAppStore } from '@/stores/appStore'

export function useCurrency() {
  const appStore = useAppStore()

  const exchangeRate = computed(() => Number(appStore.exchangeRate) || 4100)

  const formatUsd = (amount) => {
    const num = Number(amount) || 0
    return `$${num.toFixed(2)}`
  }

  const formatKhr = (amount) => {
    const num = Math.round(Number(amount) || 0)
    return `${num.toLocaleString('en-US')} ៛`
  }

  const usdToKhr = (usdAmount, customRate = null) => {
    const rate = Number(customRate) || exchangeRate.value
    return Math.round((Number(usdAmount) || 0) * rate)
  }

  const khrToUsd = (khrAmount, customRate = null) => {
    const rate = Number(customRate) || exchangeRate.value
    if (rate <= 0) return 0
    return Number(((Number(khrAmount) || 0) / rate).toFixed(2))
  }

  return {
    exchangeRate,
    formatUsd,
    formatKhr,
    usdToKhr,
    khrToUsd,
  }
}
