import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api, { getAssetUrl } from '@/api/api'

export const useAppStore = defineStore('app', () => {
  const settings = ref({
    id: 1,
    shop_name: 'BrewPOS Coffee',
    address: '',
    phone: '',
    logo: null,
    base_currency: 'USD',
    exchange_rate: 4100,
    receipt_footer: 'Thank you for visiting!',
    receipt_width: '80',
    updated_at: null,
  })

  const currentShift = ref(null)
  const isLoadingSettings = ref(false)
  const isLoadingShift = ref(false)
  const isInitialized = ref(false)

  const shopName = computed(() => settings.value?.shop_name || 'BrewPOS Coffee')
  const shopLogoUrl = computed(() => getAssetUrl(settings.value?.logo))
  const exchangeRate = computed(() => Number(settings.value?.exchange_rate) || 4100)
  const hasOpenShift = computed(() => !!currentShift.value && currentShift.value.status === 'OPEN')

  const fetchSettings = async () => {
    isLoadingSettings.value = true
    try {
      const res = await api.get('/settings')
      if (res.data?.data) {
        settings.value = {
          ...settings.value,
          ...res.data.data,
        }
      }
      return settings.value
    } catch {
      return settings.value
    } finally {
      isLoadingSettings.value = false
    }
  }

  const updateSettings = async (payload) => {
    const res = await api.put('/settings', payload)
    if (res.data?.data) {
      settings.value = {
        ...settings.value,
        ...res.data.data,
      }
    }
    return res.data
  }

  const uploadLogo = async (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    const res = await api.put('/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    if (res.data?.data) {
      settings.value = {
        ...settings.value,
        ...res.data.data,
      }
    }
    return res.data
  }

  const deleteLogo = async () => {
    const res = await api.delete('/settings/logo')
    if (res.data?.data) {
      settings.value = {
        ...settings.value,
        ...res.data.data,
      }
    } else {
      settings.value.logo = null
    }
    return res.data
  }

  const fetchCurrentShift = async () => {
    isLoadingShift.value = true
    try {
      const res = await api.get('/shifts/current')
      currentShift.value = res.data?.data || null
      return currentShift.value
    } catch {
      currentShift.value = null
      return null
    } finally {
      isLoadingShift.value = false
    }
  }

  const initAppData = async () => {
    await Promise.all([fetchSettings(), fetchCurrentShift()])
    isInitialized.value = true
  }

  const resetAppData = () => {
    currentShift.value = null
    isInitialized.value = false
  }

  return {
    settings,
    currentShift,
    isLoadingSettings,
    isLoadingShift,
    isInitialized,
    shopName,
    shopLogoUrl,
    exchangeRate,
    hasOpenShift,
    fetchSettings,
    updateSettings,
    uploadLogo,
    deleteLogo,
    fetchCurrentShift,
    initAppData,
    resetAppData,
  }
})
