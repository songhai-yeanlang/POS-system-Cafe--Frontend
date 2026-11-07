<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()
const { formatDateTime } = useFormatDate()

// Active Tab ('shop' | 'profile')
const activeTab = ref(route.query.tab === 'profile' ? 'profile' : 'shop')

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab === 'profile') {
      activeTab.value = 'profile'
    } else if (newTab === 'shop') {
      activeTab.value = 'shop'
    }
  },
)

const setTab = (tab) => {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}

// ==========================================
// 1. SHOP SETTINGS STATE & LOGIC
// ==========================================
const fileInputRef = ref(null)
const isSavingShop = ref(false)
const isUploadingLogo = ref(false)
const isDeletingLogo = ref(false)

const shopErrors = reactive({
  shop_name: '',
  phone: '',
  address: '',
  exchange_rate: '',
  receipt_footer: '',
})

const shopForm = reactive({
  shop_name: '',
  phone: '',
  address: '',
  exchange_rate: 4100,
  receipt_width: '80',
  receipt_footer: '',
})

const syncShopFormFromStore = () => {
  const s = appStore.settings
  shopForm.shop_name = s.shop_name || ''
  shopForm.phone = s.phone || ''
  shopForm.address = s.address || ''
  shopForm.exchange_rate = Number(s.exchange_rate) || 4100
  shopForm.receipt_width = s.receipt_width === '58' ? '58' : '80'
  shopForm.receipt_footer = s.receipt_footer || ''
}

const clearShopErrors = () => {
  shopErrors.shop_name = ''
  shopErrors.phone = ''
  shopErrors.address = ''
  shopErrors.exchange_rate = ''
  shopErrors.receipt_footer = ''
}

const isShopDirty = computed(() => {
  const s = appStore.settings
  return (
    shopForm.shop_name.trim() !== (s.shop_name || '') ||
    (shopForm.phone || '').trim() !== (s.phone || '') ||
    (shopForm.address || '').trim() !== (s.address || '') ||
    Number(shopForm.exchange_rate) !== Number(s.exchange_rate || 4100) ||
    shopForm.receipt_width !== (s.receipt_width || '80') ||
    (shopForm.receipt_footer || '').trim() !== (s.receipt_footer || '')
  )
})

const validateShopForm = () => {
  clearShopErrors()
  let valid = true

  const cleanName = shopForm.shop_name.trim()
  if (!cleanName) {
    shopErrors.shop_name = 'Shop name is required'
    valid = false
  } else if (cleanName.length > 150) {
    shopErrors.shop_name = 'Shop name cannot exceed 150 characters'
    valid = false
  }

  if (shopForm.phone && shopForm.phone.trim().length > 30) {
    shopErrors.phone = 'Phone cannot exceed 30 characters'
    valid = false
  }

  if (shopForm.address && shopForm.address.trim().length > 500) {
    shopErrors.address = 'Address cannot exceed 500 characters'
    valid = false
  }

  const rate = Number(shopForm.exchange_rate)
  if (!rate || isNaN(rate) || rate <= 0) {
    shopErrors.exchange_rate = 'Exchange rate must be greater than 0'
    valid = false
  }

  if (shopForm.receipt_footer && shopForm.receipt_footer.trim().length > 500) {
    shopErrors.receipt_footer = 'Receipt footer cannot exceed 500 characters'
    valid = false
  }

  return valid
}

const handleSaveSettings = async () => {
  if (!validateShopForm()) return

  isSavingShop.value = true
  try {
    const payload = {
      shop_name: shopForm.shop_name.trim(),
      phone: shopForm.phone?.trim() ? shopForm.phone.trim() : null,
      address: shopForm.address?.trim() ? shopForm.address.trim() : null,
      exchange_rate: Number(shopForm.exchange_rate),
      receipt_width: shopForm.receipt_width,
      receipt_footer: shopForm.receipt_footer?.trim() ? shopForm.receipt_footer.trim() : null,
    }

    const res = await appStore.updateSettings(payload)
    syncShopFormFromStore()
    toast.success(res.message || 'Settings saved successfully.')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to save settings.')
  } finally {
    isSavingShop.value = false
  }
}

const handleResetShopForm = () => {
  clearShopErrors()
  syncShopFormFromStore()
}

const triggerLogoSelect = () => {
  fileInputRef.value?.click()
}

const handleLogoChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Only JPG, PNG, or WEBP images are allowed.')
    event.target.value = ''
    return
  }

  if (file.size > 3 * 1024 * 1024) {
    toast.error('Logo file size must be under 3MB.')
    event.target.value = ''
    return
  }

  isUploadingLogo.value = true
  try {
    const res = await appStore.uploadLogo(file)
    toast.success(res.message || 'Shop logo updated.')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to upload logo.')
  } finally {
    isUploadingLogo.value = false
    event.target.value = ''
  }
}

const handleDeleteLogo = async () => {
  if (!appStore.settings?.logo || isDeletingLogo.value) return

  isDeletingLogo.value = true
  try {
    const res = await appStore.deleteLogo()
    toast.success(res.message || 'Shop logo removed.')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to remove logo.')
  } finally {
    isDeletingLogo.value = false
  }
}

// ==========================================
// 2. OWNER PROFILE & SECURITY LOGIC
// ==========================================
const profileData = ref(null)
const profileName = ref('')
const profileNameError = ref('')
const isSavingProfile = ref(false)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const isChangingPassword = ref(false)
const isLoggingOutAll = ref(false)

const userInitials = computed(() => {
  const n = profileName.value || authStore.user?.name || 'U'
  return n
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const isProfileDirty = computed(() => {
  return profileName.value.trim() !== (authStore.user?.name || '')
})

const handleUpdateProfile = async () => {
  profileNameError.value = ''
  const cleanName = profileName.value.trim()

  if (!cleanName) {
    profileNameError.value = 'Name is required'
    return
  }
  if (cleanName.length < 2) {
    profileNameError.value = 'Name must be at least 2 characters'
    return
  }

  isSavingProfile.value = true
  try {
    const res = await api.patch('/auth/profile', { name: cleanName })
    if (res.data?.data) {
      profileData.value = res.data.data
      authStore.setUser({
        ...authStore.user,
        name: res.data.data.name,
      })
      profileName.value = res.data.data.name
    }
    toast.success(res.data?.message || 'Profile updated successfully')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update profile')
  } finally {
    isSavingProfile.value = false
  }
}

const clearPasswordErrors = () => {
  passwordErrors.currentPassword = ''
  passwordErrors.newPassword = ''
  passwordErrors.confirmPassword = ''
}

const handleChangePassword = async () => {
  clearPasswordErrors()
  let valid = true

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = 'Current password is required'
    valid = false
  }

  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = 'New password is required'
    valid = false
  } else if (passwordForm.newPassword.length < 6) {
    passwordErrors.newPassword = 'New password must be at least 6 characters'
    valid = false
  } else if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordErrors.newPassword = 'New password must be different from current password'
    valid = false
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Confirm password is required'
    valid = false
  } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.confirmPassword = 'Passwords do not match'
    valid = false
  }

  if (!valid) return

  isChangingPassword.value = true
  try {
    const res = await api.patch('/auth/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    })

    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    toast.success(res.data?.message || 'Password changed successfully')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to change password')
  } finally {
    isChangingPassword.value = false
  }
}

const handleLogoutAllDevices = async () => {
  if (isLoggingOutAll.value) return
  isLoggingOutAll.value = true
  try {
    await authStore.logoutAll()
    appStore.resetAppData()
    toast.success('Signed out from all devices')
    router.push('/login')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to sign out of all sessions')
  } finally {
    isLoggingOutAll.value = false
  }
}

// ==========================================
// 3. RECEIPT PREVIEW HELPERS
// ==========================================
const receiptDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const sampleSubtotal = 9.0
const sampleKhrTotal = computed(() => {
  const rate = Number(shopForm.exchange_rate) || 4100
  return Math.round(sampleSubtotal * rate).toLocaleString('en-US')
})

const getRateConversion = (usd) => {
  const rate = Number(shopForm.exchange_rate) || 4100
  return Math.round(usd * rate).toLocaleString('en-US')
}

onMounted(async () => {
  await appStore.fetchSettings()
  syncShopFormFromStore()

  profileName.value = authStore.user?.name || ''
  try {
    const data = await authStore.fetchMe()
    if (data) {
      profileData.value = data
      profileName.value = data.name || ''
    }
  } catch {
    // Ignore
  }
})
</script>

<template>
  <div class="settings-page-container">
    <!-- Top Header with Title & Modern Segmented Nav -->
    <div class="settings-header-bar d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
      <div>
        <h4 class="page-title mb-1 fw-bold text-dark">
          {{ activeTab === 'shop' ? $t('settings.shopSettingsTitle') : $t('settings.ownerAccountTitle') }}
        </h4>
        <p class="page-subtitle text-muted mb-0 small">
          {{ activeTab === 'shop'
              ? $t('settings.shopSettingsSubtitle')
              : $t('settings.ownerAccountSubtitle')
          }}
        </p>
      </div>

      <!-- Modern Segmented Switcher -->
      <div class="modern-segmented-control d-inline-flex p-1">
        <button
          type="button"
          class="segment-btn"
          :class="{ active: activeTab === 'shop' }"
          @click="setTab('shop')"
        >
          <i class="bi bi-shop"></i>
          <span>{{ $t('settings.shopSettingsTitle') }}</span>
        </button>
        <button
          type="button"
          class="segment-btn"
          :class="{ active: activeTab === 'profile' }"
          @click="setTab('profile')"
        >
          <i class="bi bi-person-badge"></i>
          <span>{{ $t('settings.ownerAccountTab') }}</span>
        </button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: SHOP SETTINGS 2-COLUMN LAYOUT       -->
    <!-- ========================================== -->
    <form
      v-if="activeTab === 'shop'"
      @submit.prevent="handleSaveSettings"
    >
      <div class="row g-4 align-items-start">
        <!-- LEFT COLUMN: Settings Cards (col-lg-7) -->
        <div class="col-12 col-lg-7 d-flex flex-column gap-4">
          <!-- Card 1: Store Branding & Information -->
          <div class="settings-card bg-white p-4">
            <div class="card-section-header d-flex align-items-center gap-2 mb-3 pb-3 border-bottom">
              <div class="section-icon-badge">
                <i class="bi bi-shop-window"></i>
              </div>
              <div>
                <h6 class="section-title mb-0">{{ $t('settings.storeProfileBranding') }}</h6>
                <div class="section-desc small text-muted">{{ $t('settings.storeProfileBrandingDesc') }}</div>
              </div>
            </div>

            <!-- Logo Row -->
            <div class="d-flex align-items-center justify-content-between gap-3 p-3 rounded-3 mb-4 logo-upload-card">
              <div class="d-flex align-items-center gap-3">
                <div class="logo-box d-flex align-items-center justify-content-center overflow-hidden">
                  <img
                    v-if="appStore.shopLogoUrl"
                    :src="appStore.shopLogoUrl"
                    alt="Shop Logo"
                    class="w-100 h-100 object-fit-cover"
                  />
                  <i v-else class="bi bi-cup-hot fs-3 text-muted"></i>
                </div>
                <div>
                  <div class="fw-semibold text-dark small mb-1">{{ $t('settings.shopLogo') }}</div>
                  <div class="text-muted smaller">{{ $t('settings.logoFormatHint') }}</div>
                </div>
              </div>

              <div class="d-flex align-items-center gap-2">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="d-none"
                  @change="handleLogoChange"
                />
                <BaseButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  :loading="isUploadingLogo"
                  @click="triggerLogoSelect"
                >
                  <i class="bi bi-cloud-arrow-up me-1"></i>
                  {{ appStore.settings?.logo ? $t('common.change') : $t('common.upload') }}
                </BaseButton>
                <BaseButton
                  v-if="appStore.settings?.logo"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-danger"
                  :loading="isDeletingLogo"
                  @click="handleDeleteLogo"
                >
                  <i class="bi bi-trash3 me-1"></i>
                  {{ $t('common.remove') }}
                </BaseButton>
              </div>
            </div>

            <!-- Shop Info Inputs -->
            <div class="row g-3">
              <div class="col-12 col-md-7">
                <BaseInput
                  v-model="shopForm.shop_name"
                  :label="$t('settings.shopNameLabel')"
                  placeholder="e.g. BrewPOS Coffee"
                  :error="shopErrors.shop_name"
                  required
                />
              </div>

              <div class="col-12 col-md-5">
                <BaseInput
                  v-model="shopForm.phone"
                  :label="$t('settings.phoneNumberLabel')"
                  placeholder="e.g. 012 345 678"
                  :error="shopErrors.phone"
                />
              </div>

              <div class="col-12">
                <BaseInput
                  v-model="shopForm.address"
                  :label="$t('settings.shopAddressLabel')"
                  placeholder="e.g. #123, Street 2004, Phnom Penh"
                  :error="shopErrors.address"
                />
              </div>
            </div>
          </div>

          <!-- Card 2: Currency & Exchange Rate -->
          <div class="settings-card bg-white p-4">
            <div class="card-section-header d-flex align-items-center gap-2 mb-3 pb-3 border-bottom">
              <div class="section-icon-badge">
                <i class="bi bi-currency-exchange"></i>
              </div>
              <div>
                <h6 class="section-title mb-0">{{ $t('settings.currencyExchangeRate') }}</h6>
                <div class="section-desc small text-muted">{{ $t('settings.currencyExchangeRateDesc') }}</div>
              </div>
            </div>

            <div class="mb-3">
              <BaseInput
                v-model="shopForm.exchange_rate"
                type="number"
                :label="$t('settings.exchangeRateInputLabel')"
                placeholder="4100"
                :error="shopErrors.exchange_rate"
                required
              >
                <template #suffix>
                  <span class="small fw-semibold text-dark">៛ / USD</span>
                </template>
              </BaseInput>
            </div>

            <!-- Quick Conversion Calculator Pill bar -->
            <div class="rate-preview-box p-3 rounded-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="smaller text-muted fw-medium text-uppercase">{{ $t('settings.liveConversionRef') }}</span>
                <span class="badge bg-white text-dark border small fw-semibold">
                  {{ $t('pos.rateLabel', { rate: Number(shopForm.exchange_rate || 4100).toLocaleString() }) }}
                </span>
              </div>
              <div class="d-flex flex-wrap gap-2">
                <span class="calc-chip">$1 = {{ getRateConversion(1) }} ៛</span>
                <span class="calc-chip">$5 = {{ getRateConversion(5) }} ៛</span>
                <span class="calc-chip">$10 = {{ getRateConversion(10) }} ៛</span>
                <span class="calc-chip">$20 = {{ getRateConversion(20) }} ៛</span>
                <span class="calc-chip">$50 = {{ getRateConversion(50) }} ៛</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Receipt & Printing -->
          <div class="settings-card bg-white p-4">
            <div class="card-section-header d-flex align-items-center gap-2 mb-3 pb-3 border-bottom">
              <div class="section-icon-badge">
                <i class="bi bi-printer"></i>
              </div>
              <div>
                <h6 class="section-title mb-0">{{ $t('settings.receiptPrintingPrefs') }}</h6>
                <div class="section-desc small text-muted">{{ $t('settings.receiptPrintingPrefsDesc') }}</div>
              </div>
            </div>

            <!-- Paper Size Selector -->
            <div class="mb-4">
              <label class="form-label mb-2 fw-medium small text-dark">{{ $t('settings.thermalPaperSize') }}</label>
              <div class="row g-3">
                <div class="col-12 col-sm-6">
                  <div
                    class="paper-size-card p-3 rounded-3 cursor-pointer d-flex align-items-start gap-3"
                    :class="{ active: shopForm.receipt_width === '80' }"
                    @click="shopForm.receipt_width = '80'"
                  >
                    <div class="paper-icon-box">
                      <i class="bi bi-receipt fs-4"></i>
                    </div>
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center justify-content-between mb-1">
                        <span class="fw-semibold text-dark small">{{ $t('settings.paper80mm') }}</span>
                        <span v-if="shopForm.receipt_width === '80'" class="badge bg-primary text-white rounded-pill px-2 smaller">{{ $t('settings.selected') }}</span>
                      </div>
                      <div class="text-muted smaller">{{ $t('settings.paper80mmDesc') }}</div>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-sm-6">
                  <div
                    class="paper-size-card p-3 rounded-3 cursor-pointer d-flex align-items-start gap-3"
                    :class="{ active: shopForm.receipt_width === '58' }"
                    @click="shopForm.receipt_width = '58'"
                  >
                    <div class="paper-icon-box">
                      <i class="bi bi-phone fs-4"></i>
                    </div>
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center justify-content-between mb-1">
                        <span class="fw-semibold text-dark small">{{ $t('settings.paper58mm') }}</span>
                        <span v-if="shopForm.receipt_width === '58'" class="badge bg-primary text-white rounded-pill px-2 smaller">{{ $t('settings.selected') }}</span>
                      </div>
                      <div class="text-muted smaller">{{ $t('settings.paper58mmDesc') }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Receipt Footer Note -->
            <div>
              <BaseInput
                v-model="shopForm.receipt_footer"
                :label="$t('settings.receiptFooterNote')"
                placeholder="e.g. Thank you for visiting! Wi-Fi: Coffee123"
                :error="shopErrors.receipt_footer"
              />
              <div class="text-muted smaller mt-1">{{ $t('settings.receiptFooterHint') }}</div>
            </div>
          </div>

          <!-- Action Bar Card -->
          <div class="settings-card bg-white p-3 px-4 d-flex align-items-center justify-content-between gap-3">
            <div class="d-flex align-items-center gap-2">
              <span v-if="isShopDirty" class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-1 rounded-pill small fw-medium">
                <i class="bi bi-exclamation-circle me-1"></i> {{ $t('settings.unsavedChanges') }}
              </span>
              <span v-else class="text-muted smaller">
                <i class="bi bi-check2-circle text-success me-1"></i> {{ $t('settings.allUpToDate') }}
              </span>
            </div>

            <div class="d-flex align-items-center gap-2">
              <BaseButton
                type="button"
                variant="secondary"
                :disabled="!isShopDirty || isSavingShop"
                @click="handleResetShopForm"
              >
                {{ $t('common.reset') }}
              </BaseButton>
              <BaseButton
                type="submit"
                variant="primary"
                :loading="isSavingShop"
                :disabled="!isShopDirty"
              >
                {{ $t('common.saveChanges') }}
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Sticky Real-Time Receipt Preview (col-lg-5) -->
        <div class="col-12 col-lg-5">
          <div class="receipt-sticky-wrapper">
            <div class="d-flex align-items-center justify-content-between mb-2 px-1">
              <div class="d-flex align-items-center gap-2">
                <span class="live-pulse-dot"></span>
                <span class="fw-bold smaller text-uppercase text-dark tracking-wider">{{ $t('receipt.livePreview') }}</span>
              </div>
              <span class="badge bg-white text-dark border smaller fw-medium">
                {{ $t('receipt.widthMm', { width: shopForm.receipt_width }) }}
              </span>
            </div>

            <!-- Thermal Receipt Mockup Card -->
            <div class="thermal-receipt-container" :class="`receipt-width-${shopForm.receipt_width}`">
              <!-- Top Cut Edge -->
              <div class="receipt-sawtooth-cut"></div>

              <div class="receipt-body p-4 bg-white">
                <!-- Shop Header -->
                <div class="text-center mb-3">
                  <div v-if="appStore.shopLogoUrl" class="receipt-preview-logo mx-auto mb-2">
                    <img :src="appStore.shopLogoUrl" alt="Shop Logo" class="w-100 h-100 object-fit-contain" />
                  </div>
                  <div v-else class="receipt-preview-icon text-muted mb-1">
                    <i class="bi bi-cup-hot fs-3"></i>
                  </div>

                  <div class="receipt-font-title fw-bold text-dark text-uppercase mb-1">
                    {{ shopForm.shop_name || 'YOUR SHOP NAME' }}
                  </div>
                  <div v-if="shopForm.address" class="receipt-font-meta text-muted">
                    {{ shopForm.address }}
                  </div>
                  <div v-if="shopForm.phone" class="receipt-font-meta text-muted">
                    {{ $t('receipt.tel') }}: {{ shopForm.phone }}
                  </div>
                </div>

                <!-- Receipt Meta -->
                <div class="receipt-dashed-line my-2"></div>
                <div class="receipt-meta-grid text-muted">
                  <div class="d-flex justify-content-between">
                    <span>{{ $t('receipt.receipt') }}: #RCP-20261106-0042</span>
                    <span>{{ $t('receipt.queue') }}: #04</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span>{{ $t('receipt.date') }}: {{ receiptDate }}</span>
                    <span>{{ $t('receipt.type') }}: {{ $t('common.takeaway') }}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span>{{ $t('receipt.cashier') }}: {{ authStore.user?.name || 'Owner' }}</span>
                    <span>{{ $t('receipt.shift') }}: #2</span>
                  </div>
                </div>
                <div class="receipt-dashed-line my-2"></div>

                <!-- Sample Order Items -->
                <div class="receipt-items-list mb-2">
                  <div class="d-flex justify-content-between py-1">
                    <span>1x Iced Latte (Large)</span>
                    <span class="fw-semibold">$3.50</span>
                  </div>
                  <div class="d-flex justify-content-between py-1">
                    <span>1x Caramel Macchiato</span>
                    <span class="fw-semibold">$3.50</span>
                  </div>
                  <div class="d-flex justify-content-between py-1">
                    <span>1x Butter Croissant</span>
                    <span class="fw-semibold">$2.00</span>
                  </div>
                </div>

                <div class="receipt-dashed-line my-2"></div>

                <!-- Totals Section -->
                <div class="receipt-totals-box">
                  <div class="d-flex justify-content-between py-1 text-muted small">
                    <span>{{ $t('receipt.subtotal') }}:</span>
                    <span>$9.00</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 fw-bold fs-6 text-dark border-top border-bottom my-1">
                    <span>{{ $t('receipt.totalUsd') }}:</span>
                    <span>$9.00</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 fw-bold text-dark">
                    <span>{{ $t('receipt.totalKhr') }}:</span>
                    <span>{{ sampleKhrTotal }} ៛</span>
                  </div>
                  <div class="d-flex justify-content-between py-1 text-muted smaller">
                    <span>{{ $t('receipt.exchangeRate') }}:</span>
                    <span>$1 = {{ Number(shopForm.exchange_rate || 4100).toLocaleString() }} ៛</span>
                  </div>
                </div>

                <div class="receipt-dashed-line my-3"></div>

                <!-- Footer Note -->
                <div class="receipt-footer-text text-center text-muted small px-2">
                  {{ shopForm.receipt_footer || $t('receipt.thankYouDefault') }}
                </div>

                <!-- Barcode mockup -->
                <div class="receipt-barcode-box text-center pt-3">
                  <div class="barcode-graphic mx-auto"></div>
                  <div class="smaller text-muted mt-1 font-monospace">*** {{ $t('receipt.thankYouDefault') }} ***</div>
                </div>
              </div>

              <!-- Bottom Cut Edge -->
              <div class="receipt-sawtooth-cut bottom"></div>
            </div>
          </div>
        </div>
      </div>
    </form>

    <!-- ========================================== -->
    <!-- TAB 2: OWNER ACCOUNT & SECURITY (2-COL)   -->
    <!-- ========================================== -->
    <div v-else class="row g-4 align-items-start">
      <!-- LEFT COLUMN: Profile & Password Forms (col-lg-7) -->
      <div class="col-12 col-lg-7 d-flex flex-column gap-4">
        <!-- Personal Details -->
        <form class="settings-card bg-white p-4" @submit.prevent="handleUpdateProfile">
          <div class="card-section-header d-flex align-items-center gap-2 mb-3 pb-3 border-bottom">
            <div class="section-icon-badge">
              <i class="bi bi-person-circle"></i>
            </div>
            <div>
              <h6 class="section-title mb-0">{{ $t('settings.personalDetails') }}</h6>
              <div class="section-desc small text-muted">{{ $t('settings.personalDetailsDesc') }}</div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <BaseInput
                v-model="profileName"
                :label="$t('users.fullNameLabel')"
                placeholder="Your full name"
                :error="profileNameError"
                required
              />
            </div>
            <div class="col-12 col-md-6">
              <BaseInput
                :model-value="authStore.user?.email || ''"
                :label="$t('auth.emailLabel')"
                disabled
              />
            </div>
          </div>

          <div class="d-flex justify-content-end">
            <BaseButton
              type="submit"
              variant="primary"
              size="sm"
              :disabled="!isProfileDirty || isSavingProfile"
              :loading="isSavingProfile"
            >
              {{ $t('settings.saveProfile') }}
            </BaseButton>
          </div>
        </form>

        <!-- Password Change -->
        <form class="settings-card bg-white p-4" @submit.prevent="handleChangePassword">
          <div class="card-section-header d-flex align-items-center gap-2 mb-3 pb-3 border-bottom">
            <div class="section-icon-badge">
              <i class="bi bi-shield-lock"></i>
            </div>
            <div>
              <h6 class="section-title mb-0">{{ $t('settings.passwordSecurity') }}</h6>
              <div class="section-desc small text-muted">{{ $t('settings.passwordSecurityDesc') }}</div>
            </div>
          </div>

          <div class="mb-3">
            <BaseInput
              v-model="passwordForm.currentPassword"
              type="password"
              :label="$t('settings.currentPassword')"
              placeholder="••••••••"
              :error="passwordErrors.currentPassword"
              required
            />
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <BaseInput
                v-model="passwordForm.newPassword"
                type="password"
                :label="$t('settings.newPassword')"
                placeholder="••••••••"
                :error="passwordErrors.newPassword"
                required
              />
            </div>
            <div class="col-12 col-md-6">
              <BaseInput
                v-model="passwordForm.confirmPassword"
                type="password"
                :label="$t('settings.confirmNewPassword')"
                placeholder="••••••••"
                :error="passwordErrors.confirmPassword"
                required
              />
            </div>
          </div>

          <div class="d-flex justify-content-end">
            <BaseButton
              type="submit"
              variant="secondary"
              size="sm"
              :loading="isChangingPassword"
            >
              {{ $t('settings.updatePassword') }}
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- RIGHT COLUMN: Account Status & Danger Zone (col-lg-5) -->
      <div class="col-12 col-lg-5 d-flex flex-column gap-4">
        <!-- Account Overview Card -->
        <div class="settings-card bg-white p-4">
          <div class="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom">
            <div class="avatar-box d-flex align-items-center justify-content-center">
              {{ userInitials }}
            </div>
            <div>
              <h6 class="fw-bold text-dark mb-1">{{ authStore.user?.name || 'Owner' }}</h6>
              <div class="text-muted smaller mb-1">{{ authStore.user?.email }}</div>
              <span class="badge bg-success-subtle text-success border border-success-subtle smaller px-2 py-1 rounded-pill">
                <i class="bi bi-shield-check me-1"></i> {{ $t('settings.shopOwnerBadge') }}
              </span>
            </div>
          </div>

          <div class="role-permissions-list small">
            <div class="fw-semibold text-dark smaller text-uppercase mb-2">{{ $t('settings.accountPrivileges') }}</div>
            <div class="d-flex align-items-center gap-2 py-1 text-muted">
              <i class="bi bi-check-circle-fill text-success"></i>
              <span>{{ $t('settings.priv1') }}</span>
            </div>
            <div class="d-flex align-items-center gap-2 py-1 text-muted">
              <i class="bi bi-check-circle-fill text-success"></i>
              <span>{{ $t('settings.priv2') }}</span>
            </div>
            <div class="d-flex align-items-center gap-2 py-1 text-muted">
              <i class="bi bi-check-circle-fill text-success"></i>
              <span>{{ $t('settings.priv3') }}</span>
            </div>
            <div class="d-flex align-items-center gap-2 py-1 text-muted">
              <i class="bi bi-check-circle-fill text-success"></i>
              <span>{{ $t('settings.priv4') }}</span>
            </div>
          </div>
        </div>

        <!-- Active Sessions & Logout -->
        <div class="settings-card bg-white p-4 border-danger-subtle">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi bi-shield-exclamation text-danger fs-5"></i>
            <h6 class="section-title mb-0 text-danger">{{ $t('settings.activeSessions') }}</h6>
          </div>
          <p class="text-muted smaller mb-3">
            {{ $t('settings.activeSessionsDesc') }}
          </p>

          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            class="btn-outline-danger w-100"
            :loading="isLoggingOutAll"
            @click="handleLogoutAllDevices"
          >
            <i class="bi bi-box-arrow-right me-1"></i>
            {{ $t('settings.signOutAllSessions') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page-container {
  max-width: 1240px;
  margin: 0 auto;
}

.settings-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  box-shadow: 0 1px 3px rgba(45, 90, 67, 0.04), 0 6px 18px rgba(45, 90, 67, 0.02);
}

.section-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--primary, #2d5a43);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--on-surface, #1c1b1b);
}

.section-desc {
  font-size: 12.5px;
  color: var(--on-surface-variant, #716762);
}

.logo-upload-card {
  background-color: var(--surface-container-low, #f8f6f4);
  border: 1px dashed var(--border-hairline, #ded9d3);
}

.logo-box {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  background-color: #ffffff;
  border: 1px solid var(--border-hairline, #ded9d3);
  flex-shrink: 0;
}

.modern-segmented-control {
  background-color: var(--surface-container-low, #f4f0eb);
  border: 1px solid var(--border-hairline, #e6e2dc);
  border-radius: 14px;
  gap: 4px;
  padding: 4px;
  box-shadow: inset 0 1px 2px rgba(45, 90, 67, 0.03);
}

.segment-btn {
  border: none;
  background: transparent;
  padding: 0.55rem 1.4rem;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--on-surface-variant, #716762);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none !important;
  user-select: none;
  white-space: nowrap;
}

.segment-btn:focus,
.segment-btn:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.segment-btn:hover:not(.active) {
  color: var(--on-surface, #1c1b1b);
  background-color: rgba(255, 255, 255, 0.6);
}

.segment-btn.active {
  background-color: #ffffff;
  color: var(--primary, #2d5a43);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(45, 90, 67, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.segment-btn i {
  font-size: 15px;
  transition: color 0.15s ease;
}

.segment-btn.active i {
  color: var(--primary, #2d5a43);
}

/* Paper Size Selector */
.paper-size-card {
  border: 2px solid var(--border-hairline, #e6e2dc);
  background-color: #ffffff;
  transition: all 0.18s ease;
}

.paper-size-card:hover {
  border-color: #cfc6be;
  background-color: #faf8f6;
}

.paper-size-card.active {
  border-color: var(--primary, #2d5a43);
  background-color: #faf8f6;
  box-shadow: 0 2px 8px rgba(45, 90, 67, 0.06);
}

.paper-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background-color: #ffffff;
  border: 1px solid var(--border-hairline, #e6e2dc);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary, #2d5a43);
  flex-shrink: 0;
}

.cursor-pointer {
  cursor: pointer;
}

/* Rate preview pills */
.rate-preview-box {
  background-color: var(--surface-container-low, #f8f6f4);
  border: 1px solid var(--border-hairline, #e6e2dc);
}

.calc-chip {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  font-size: 12px;
  font-weight: 500;
  color: var(--on-surface, #1c1b1b);
  background-color: #ffffff;
  border: 1px solid var(--border-hairline, #e6e2dc);
  border-radius: 6px;
}

/* Thermal Receipt Preview */
.receipt-sticky-wrapper {
  position: sticky;
  top: 1.5rem;
}

.thermal-receipt-container {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(45, 90, 67, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px dashed #d6ceca;
  margin: 0 auto;
  transition: max-width 0.25s ease;
  font-family: 'Kantumruy Pro', 'Courier New', Courier, monospace;
}

.receipt-width-80 {
  max-width: 380px;
}

.receipt-width-58 {
  max-width: 300px;
}

.receipt-sawtooth-cut {
  height: 12px;
  background: radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%);
  background-size: 14px 14px;
}

.receipt-sawtooth-cut.bottom {
  transform: rotate(180deg);
}

.receipt-dashed-line {
  border-top: 1px dashed #bbb3af;
}

.receipt-preview-logo {
  width: 56px;
  height: 56px;
}

.receipt-font-title {
  font-size: 14px;
  letter-spacing: 0.5px;
}

.receipt-font-meta {
  font-size: 11px;
  line-height: 1.3;
}

.receipt-meta-grid {
  font-size: 11px;
  line-height: 1.4;
}

.receipt-items-list {
  font-size: 12px;
}

.receipt-totals-box {
  font-size: 12px;
}

.barcode-graphic {
  width: 140px;
  height: 32px;
  background: repeating-linear-gradient(
    to right,
    #1c1b1b,
    #1c1b1b 2px,
    #ffffff 2px,
    #ffffff 4px,
    #1c1b1b 4px,
    #1c1b1b 5px,
    #ffffff 5px,
    #ffffff 8px,
    #1c1b1b 8px,
    #1c1b1b 11px
  );
}

.live-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  animation: pulse 1.8s infinite;
  display: inline-block;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.avatar-box {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  color: var(--primary, #2d5a43);
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.smaller {
  font-size: 11.5px;
}

.tracking-wider {
  letter-spacing: 0.5px;
}
</style>
