import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import api, { getAssetUrl } from '@/api/api'

const LOGO_CACHE_KEY = 'brewpos_shop_logo'
const NAME_CACHE_KEY = 'brewpos_shop_name'

const DEFAULT_FAVICON_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232d5a43'/%3E%3Cpath fill='%23ffffff' d='M18 22h22v13c0 6.075-4.925 11-11 11s-11-4.925-11-11V22zm24 3h3a5 5 0 0 1 0 10h-3V25zM16 49h26a2 2 0 1 1 0 4H16a2 2 0 1 1 0-4z'/%3E%3C/svg%3E"

function setFaviconHref(href, type = 'image/png') {
  if (typeof document === 'undefined') return
  let link = document.querySelector("link#app-favicon") || document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.id = 'app-favicon'
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = type
  link.href = href
}

function updateBrowserFavicon(logoUrl) {
  if (typeof document === 'undefined') return
  if (!logoUrl) {
    setFaviconHref(DEFAULT_FAVICON_SVG, 'image/svg+xml')
    return
  }

  // Immediately set direct logo URL so there is zero delay
  setFaviconHref(logoUrl, 'image/png')

  // Also render a clean rounded-circle/squircle favicon matching the sidebar avatar
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.roundRect(0, 0, size, size, 16)
      ctx.closePath()
      ctx.clip()

      // Object-fit: cover calculation
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const x = (size - w) / 2
      const y = (size - h) / 2
      ctx.drawImage(img, x, y, w, h)

      const dataUrl = canvas.toDataURL('image/png')
      if (dataUrl) {
        setFaviconHref(dataUrl, 'image/png')
      }
    } catch {
      // Fallback remains the direct logoUrl already set above
    }
  }
  img.src = logoUrl
}

export const useAppStore = defineStore('app', () => {
  const cachedLogo = typeof localStorage !== 'undefined' ? localStorage.getItem(LOGO_CACHE_KEY) : null
  const cachedName = typeof localStorage !== 'undefined' ? localStorage.getItem(NAME_CACHE_KEY) : null

  const settings = ref({
    id: 1,
    shop_name: cachedName || 'BrewPOS Coffee',
    address: '',
    phone: '',
    logo: cachedLogo || null,
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

  watch(
    () => [settings.value?.logo, settings.value?.shop_name],
    ([newLogo, newName]) => {
      try {
        if (typeof localStorage !== 'undefined') {
          if (newLogo) {
            localStorage.setItem(LOGO_CACHE_KEY, newLogo)
          } else {
            localStorage.removeItem(LOGO_CACHE_KEY)
          }
          if (newName) {
            localStorage.setItem(NAME_CACHE_KEY, newName)
          }
        }
      } catch {
        // ignore storage errors
      }
    }
  )

  watch(
    shopLogoUrl,
    (url) => {
      updateBrowserFavicon(url)
    },
    { immediate: true }
  )

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
