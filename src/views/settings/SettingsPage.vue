<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/api'
import { t } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import BaseInput from '@/components/base/BaseInput.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()

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
    shopErrors.shop_name = t('settings.valShopNameRequired')
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
    shopErrors.exchange_rate = t('settings.valExchangeRateInvalid')
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
    .filter(Boolean)
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
    profileNameError.value = t('settings.valProfileNameRequired')
    return
  }
  if (cleanName.length < 2) {
    profileNameError.value = t('users.validationNameMin')
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
    passwordErrors.currentPassword = t('settings.valCurrentPasswordRequired')
    valid = false
  }

  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = t('settings.valNewPasswordRequired')
    valid = false
  } else if (passwordForm.newPassword.length < 6) {
    passwordErrors.newPassword = t('settings.valNewPasswordMin')
    valid = false
  } else if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordErrors.newPassword = t('settings.valNewPasswordDiff')
    valid = false
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = t('settings.valConfirmPasswordRequired')
    valid = false
  } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.confirmPassword = t('settings.valPasswordMismatch')
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
  <div class="settings-page">
    <!-- Top Segmented Switcher & Action Controls -->
    <div class="settings-top-bar">
      <div class="segmented-nav" role="tablist">
        <button
          type="button"
          class="seg-btn"
          :class="{ active: activeTab === 'shop' }"
          @click="setTab('shop')"
        >
          <i class="bi bi-shop"></i>
          <span>{{ $t('settings.shopSettingsTitle') }}</span>
        </button>
        <button
          type="button"
          class="seg-btn"
          :class="{ active: activeTab === 'profile' }"
          @click="setTab('profile')"
        >
          <i class="bi bi-person-badge"></i>
          <span>{{ $t('settings.ownerAccountTab') }}</span>
        </button>
      </div>

      <div v-if="activeTab === 'shop'" class="top-actions">
        <span class="save-state-label" :class="{ 'is-dirty': isShopDirty }">
          <i class="bi" :class="isShopDirty ? 'bi-circle-fill' : 'bi-check2'"></i>
          <span>{{ isShopDirty ? $t('settings.unsavedChanges') : $t('settings.allUpToDate') }}</span>
        </span>

        <button
          type="button"
          class="btn-action-secondary"
          :disabled="!isShopDirty || isSavingShop"
          @click="handleResetShopForm"
        >
          {{ $t('common.reset') }}
        </button>

        <button
          type="button"
          class="btn-action-primary"
          :disabled="!isShopDirty || isSavingShop"
          @click="handleSaveSettings"
        >
          <span v-if="isSavingShop" class="spinner-border spinner-border-sm"></span>
          <span>{{ $t('common.saveChanges') }}</span>
        </button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: SHOP SETTINGS (UNIFIED SHEET + PREVIEW) -->
    <!-- ========================================== -->
    <form v-if="activeTab === 'shop'" @submit.prevent="handleSaveSettings">
      <div class="settings-grid">
        <!-- LEFT COLUMN: Single Unified White Sheet -->
        <div class="ledger-panel">
          <!-- Section 1: Store Branding -->
          <section class="panel-section">
            <h6 class="panel-heading">{{ $t('settings.storeProfileBranding') }}</h6>

            <div class="logo-row">
              <div class="logo-thumb">
                <img
                  v-if="appStore.shopLogoUrl"
                  :src="appStore.shopLogoUrl"
                  alt="Shop Logo"
                  class="w-100 h-100 object-fit-cover"
                />
                <i v-else class="bi bi-cup-hot"></i>
              </div>

              <div class="logo-info">
                <div class="logo-title">{{ $t('settings.shopLogo') }}</div>
                <div class="logo-hint">{{ $t('settings.logoFormatHint') }}</div>
              </div>

              <div class="logo-actions">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="d-none"
                  @change="handleLogoChange"
                />
                <button
                  type="button"
                  class="btn-mini-secondary"
                  :disabled="isUploadingLogo"
                  @click="triggerLogoSelect"
                >
                  <span v-if="isUploadingLogo" class="spinner-border spinner-border-sm"></span>
                  <span>{{ appStore.settings?.logo ? $t('common.change') : $t('common.upload') }}</span>
                </button>
                <button
                  v-if="appStore.settings?.logo"
                  type="button"
                  class="btn-mini-danger"
                  :disabled="isDeletingLogo"
                  @click="handleDeleteLogo"
                >
                  {{ $t('common.remove') }}
                </button>
              </div>
            </div>

            <div class="fields-grid mt-3">
              <div class="col-span-7">
                <BaseInput
                  v-model="shopForm.shop_name"
                  size="sm"
                  no-margin
                  :label="$t('settings.shopNameLabel')"
                  :placeholder="$t('settings.shopNamePlaceholder')"
                  :error="shopErrors.shop_name"
                  required
                />
              </div>

              <div class="col-span-5">
                <BaseInput
                  v-model="shopForm.phone"
                  size="sm"
                  no-margin
                  :label="$t('settings.phoneNumberLabel')"
                  :placeholder="$t('settings.phonePlaceholder')"
                  :error="shopErrors.phone"
                />
              </div>

              <div class="col-span-12">
                <BaseInput
                  v-model="shopForm.address"
                  size="sm"
                  no-margin
                  :label="$t('settings.shopAddressLabel')"
                  :placeholder="$t('settings.addressPlaceholder')"
                  :error="shopErrors.address"
                />
              </div>
            </div>
          </section>

          <!-- Section 2: Exchange Rate -->
          <section class="panel-section">
            <h6 class="panel-heading">{{ $t('settings.currencyExchangeRate') }}</h6>

            <div class="rate-row">
              <div class="rate-input-box">
                <BaseInput
                  v-model="shopForm.exchange_rate"
                  type="number"
                  size="sm"
                  no-margin
                  :label="$t('settings.exchangeRateInputLabel')"
                  placeholder="4100"
                  :error="shopErrors.exchange_rate"
                  required
                >
                  <template #suffix>
                    <span class="suffix-label">៛ / USD</span>
                  </template>
                </BaseInput>
              </div>

              <div class="rate-inline-ref tabular">
                $5 = {{ getRateConversion(5) }} ៛
                <span class="ref-dot">·</span>
                $10 = {{ getRateConversion(10) }} ៛
                <span class="ref-dot">·</span>
                $20 = {{ getRateConversion(20) }} ៛
              </div>
            </div>
          </section>

          <!-- Section 3: Thermal Receipt -->
          <section class="panel-section">
            <h6 class="panel-heading">{{ $t('settings.receiptPrintingPrefs') }}</h6>

            <div class="paper-row mb-3">
              <label class="field-label">{{ $t('settings.thermalPaperSize') }}</label>
              <div class="paper-segmented">
                <button
                  type="button"
                  class="paper-seg-btn"
                  :class="{ active: shopForm.receipt_width === '80' }"
                  @click="shopForm.receipt_width = '80'"
                >
                  {{ $t('settings.paper80mmShort') }}
                </button>
                <button
                  type="button"
                  class="paper-seg-btn"
                  :class="{ active: shopForm.receipt_width === '58' }"
                  @click="shopForm.receipt_width = '58'"
                >
                  {{ $t('settings.paper58mmShort') }}
                </button>
              </div>
            </div>

            <BaseInput
              v-model="shopForm.receipt_footer"
              size="sm"
              no-margin
              :label="$t('settings.receiptFooterNote')"
              :placeholder="$t('settings.footerPlaceholder')"
              :error="shopErrors.receipt_footer"
              :hint="$t('settings.receiptFooterHint')"
            />
          </section>
        </div>

        <!-- RIGHT COLUMN: Sticky Real-Time Receipt Preview -->
        <div class="preview-column">
          <div class="receipt-sticky-wrapper">
            <div class="preview-header">
              <span class="preview-title">{{ $t('receipt.livePreview') }}</span>
              <span class="preview-width tabular">{{ shopForm.receipt_width }}mm</span>
            </div>

            <div class="thermal-receipt-container" :class="`receipt-width-${shopForm.receipt_width}`">
              <div class="receipt-sawtooth-cut"></div>

              <div class="receipt-body">
                <div class="text-center mb-3">
                  <div v-if="appStore.shopLogoUrl" class="receipt-preview-logo mx-auto mb-2">
                    <img :src="appStore.shopLogoUrl" alt="Shop Logo" class="w-100 h-100 object-fit-contain" />
                  </div>
                  <div v-else class="receipt-preview-icon text-muted mb-1">
                    <i class="bi bi-cup-hot fs-4"></i>
                  </div>

                  <div class="receipt-font-title">
                    {{ shopForm.shop_name || 'YOUR SHOP NAME' }}
                  </div>
                  <div v-if="shopForm.address" class="receipt-font-meta">
                    {{ shopForm.address }}
                  </div>
                  <div v-if="shopForm.phone" class="receipt-font-meta">
                    {{ $t('receipt.tel') }}: {{ shopForm.phone }}
                  </div>
                </div>

                <div class="receipt-dashed-line my-2"></div>

                <div class="receipt-meta-grid">
                  <div class="meta-split">
                    <span>{{ $t('receipt.receipt') }}: #RCP-0042</span>
                    <span>{{ $t('receipt.queue') }}: #04</span>
                  </div>
                  <div class="meta-split">
                    <span>{{ receiptDate }}</span>
                    <span>{{ $t('common.takeaway') }}</span>
                  </div>
                  <div class="meta-split">
                    <span>{{ authStore.user?.name || 'Owner' }}</span>
                    <span>{{ $t('receipt.shift') }} #2</span>
                  </div>
                </div>

                <div class="receipt-dashed-line my-2"></div>

                <div class="receipt-items-list mb-2">
                  <div class="receipt-item-row">
                    <span>1x Iced Latte (Large)</span>
                    <span class="fw-semibold tabular">$3.50</span>
                  </div>
                  <div class="receipt-item-row">
                    <span>1x Caramel Macchiato</span>
                    <span class="fw-semibold tabular">$3.50</span>
                  </div>
                  <div class="receipt-item-row">
                    <span>1x Butter Croissant</span>
                    <span class="fw-semibold tabular">$2.00</span>
                  </div>
                </div>

                <div class="receipt-dashed-line my-2"></div>

                <div class="receipt-totals-box">
                  <div class="receipt-item-row muted-row">
                    <span>{{ $t('receipt.subtotal') }}</span>
                    <span class="tabular">$9.00</span>
                  </div>
                  <div class="receipt-total-usd">
                    <span>{{ $t('receipt.totalUsd') }}</span>
                    <span class="tabular">$9.00</span>
                  </div>
                  <div class="receipt-item-row fw-bold">
                    <span>{{ $t('receipt.totalKhr') }}</span>
                    <span class="tabular">{{ sampleKhrTotal }} ៛</span>
                  </div>
                  <div class="receipt-item-row muted-row smaller-row">
                    <span>{{ $t('receipt.exchangeRate') }}</span>
                    <span class="tabular">$1 = {{ Number(shopForm.exchange_rate || 4100).toLocaleString() }} ៛</span>
                  </div>
                </div>

                <div class="receipt-dashed-line my-3"></div>

                <div class="receipt-footer-text text-center">
                  {{ shopForm.receipt_footer || $t('receipt.thankYouDefault') }}
                </div>

                <div class="text-center pt-3">
                  <div class="barcode-graphic mx-auto"></div>
                </div>
              </div>

              <div class="receipt-sawtooth-cut bottom"></div>
            </div>
          </div>
        </div>
      </div>
    </form>

    <!-- ========================================== -->
    <!-- TAB 2: OWNER ACCOUNT & SECURITY (50/50)    -->
    <!-- ========================================== -->
    <div v-else class="account-grid">
      <!-- LEFT CARD: Personal Info & Sessions -->
      <div class="ledger-panel account-card">
        <div class="identity-bar">
          <div class="avatar-square">{{ userInitials }}</div>
          <div class="account-meta">
            <div class="account-name">{{ authStore.user?.name || 'Owner' }}</div>
            <div class="account-subline">
              <span>{{ authStore.user?.email }}</span>
              <span class="meta-dot">·</span>
              <span class="account-role">{{ $t('settings.shopOwnerBadge') }}</span>
            </div>
          </div>
        </div>

        <form class="panel-section account-form-body" @submit.prevent="handleUpdateProfile">
          <h6 class="panel-heading">{{ $t('settings.personalDetails') }}</h6>

          <div class="stack-fields">
            <BaseInput
              v-model="profileName"
              size="sm"
              no-margin
              :label="$t('users.fullNameLabel')"
              :placeholder="$t('settings.yourFullNamePlaceholder')"
              :error="profileNameError"
              required
            />

            <BaseInput
              :model-value="authStore.user?.email || ''"
              size="sm"
              no-margin
              :label="$t('auth.emailLabel')"
              disabled
            />
          </div>

          <div class="section-footer">
            <button
              type="submit"
              class="btn-action-primary"
              :disabled="!isProfileDirty || isSavingProfile"
            >
              <span v-if="isSavingProfile" class="spinner-border spinner-border-sm"></span>
              <span>{{ $t('settings.saveProfile') }}</span>
            </button>
          </div>
        </form>

        <div class="session-bar">
          <div class="session-copy">
            <div class="session-title">{{ $t('settings.activeSessions') }}</div>
            <div class="session-sub">{{ $t('settings.activeSessionsDesc') }}</div>
          </div>

          <button
            type="button"
            class="btn-danger-outline"
            :disabled="isLoggingOutAll"
            @click="handleLogoutAllDevices"
          >
            <span v-if="isLoggingOutAll" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-box-arrow-right"></i>
            <span>{{ $t('settings.signOutAllSessions') }}</span>
          </button>
        </div>
      </div>

      <!-- RIGHT CARD: Password & Security -->
      <form class="ledger-panel account-card" @submit.prevent="handleChangePassword">
        <div class="panel-section account-form-body">
          <h6 class="panel-heading">{{ $t('settings.passwordSecurity') }}</h6>

          <div class="stack-fields">
            <BaseInput
              v-model="passwordForm.currentPassword"
              type="password"
              size="sm"
              no-margin
              :label="$t('settings.currentPassword')"
              :placeholder="$t('settings.currentPasswordPlaceholder')"
              :error="passwordErrors.currentPassword"
              required
            />

            <BaseInput
              v-model="passwordForm.newPassword"
              type="password"
              size="sm"
              no-margin
              :label="$t('settings.newPassword')"
              :placeholder="$t('users.min6Characters')"
              :error="passwordErrors.newPassword"
              required
            />

            <BaseInput
              v-model="passwordForm.confirmPassword"
              type="password"
              size="sm"
              no-margin
              :label="$t('settings.confirmNewPassword')"
              :placeholder="$t('settings.confirmPasswordPlaceholder')"
              :error="passwordErrors.confirmPassword"
              required
            />
          </div>

          <div class="section-footer">
            <button
              type="submit"
              class="btn-action-primary"
              :disabled="isChangingPassword || (!passwordForm.currentPassword && !passwordForm.newPassword && !passwordForm.confirmPassword)"
            >
              <span v-if="isChangingPassword" class="spinner-border spinner-border-sm"></span>
              <span>{{ $t('settings.updatePassword') }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  --roast-ink: #14231a;
  --sage-muted: #54665b;
  --botanical-primary: #2d5a43;
  --botanical-deep: #1e3f2f;
  --ledger-line: #e4ebe6;
  --ledger-hairline: #eff4f1;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* Top Bar */
.settings-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.segmented-nav {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: #edf2ef;
  border: 1px solid #e1e9e4;
}

.seg-btn {
  border: none;
  background: transparent;
  padding: 0.44rem 0.95rem;
  border-radius: 7px;
  font-size: 0.81rem;
  font-weight: 600;
  color: var(--sage-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.14s ease;
}

.seg-btn:hover:not(.active) {
  color: var(--roast-ink);
}

.seg-btn.active {
  background: #ffffff;
  color: var(--botanical-deep);
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(20, 35, 26, 0.08);
}

.top-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.save-state-label {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: #6b7d72;
  margin-right: 0.25rem;
}

.save-state-label.is-dirty {
  color: #b45309;
}

.save-state-label.is-dirty i {
  font-size: 0.45rem;
}

.btn-action-primary,
.btn-action-secondary {
  height: 36px;
  padding: 0 1rem;
  border-radius: 8px;
  font-size: 0.81rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-action-primary {
  border: 1px solid var(--botanical-primary);
  background: var(--botanical-primary);
  color: #ffffff;
}

.btn-action-primary:hover:not(:disabled) {
  background: var(--botanical-deep);
  border-color: var(--botanical-deep);
}

.btn-action-secondary {
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
}

.btn-action-secondary:hover:not(:disabled) {
  background: #f4f8f5;
  border-color: #b8ccc0;
}

.btn-action-primary:disabled {
  border-color: #e2e8e4;
  background: #f2f5f3;
  color: #8b9a90;
  cursor: not-allowed;
}

.btn-action-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Main 2-Column Grid */
.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(300px, 5fr);
  gap: 1.25rem;
  align-items: start;
}

/* Unified White Ledger Panel */
.ledger-panel {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(20, 35, 26, 0.03);
}

.panel-section {
  padding: 1.25rem 1.35rem;
  border-bottom: 1px solid var(--ledger-hairline);
}

.panel-section:last-child {
  border-bottom: none;
}

.panel-heading {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.panel-heading.is-danger {
  color: #b91c1c;
  margin-bottom: 0.4rem;
}

/* Compact Inputs Inside Panel */
.ledger-panel :deep(.text-label) {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--roast-ink);
  margin-bottom: 0.35rem;
}

.ledger-panel :deep(.form-control-sm) {
  height: 40px;
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
  font-size: 0.84rem;
  line-height: 1.5;
  border-color: #dce6e0;
  border-radius: 8px;
}

.ledger-panel :deep(.form-control-sm:disabled) {
  background-color: #f6f9f7;
  border-color: #e6ede9;
  color: var(--sage-muted);
}

.ledger-panel :deep(.input-group-text) {
  border-color: #dce6e0;
}

/* Logo Row */
.logo-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-bottom: 0.25rem;
}

.logo-thumb {
  width: 52px;
  height: 52px;
  border-radius: 11px;
  border: 1px solid #dce6e0;
  background: #f6f9f7;
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  overflow: hidden;
  flex-shrink: 0;
}

.logo-info {
  flex: 1;
  min-width: 0;
}

.logo-title {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.logo-hint {
  font-size: 0.74rem;
  color: var(--sage-muted);
  margin-top: 2px;
}

.logo-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-mini-secondary,
.btn-mini-danger {
  height: 32px;
  padding: 0 0.75rem;
  border-radius: 7px;
  font-size: 0.77rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.btn-mini-secondary {
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
}

.btn-mini-secondary:hover:not(:disabled) {
  background: #f4f8f5;
}

.btn-mini-danger {
  border: 1px solid transparent;
  background: transparent;
  color: #dc2626;
}

.btn-mini-danger:hover:not(:disabled) {
  background: #fef2f2;
}

/* 12-Col Fields Grid */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.85rem;
}

.col-span-5 {
  grid-column: span 5;
}

.col-span-6 {
  grid-column: span 6;
}

.col-span-7 {
  grid-column: span 7;
}

.col-span-12 {
  grid-column: span 12;
}

/* Exchange Rate Row */
.rate-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rate-input-box {
  max-width: 280px;
}

.suffix-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--sage-muted);
}

.rate-inline-ref {
  font-size: 0.76rem;
  color: var(--sage-muted);
  font-weight: 500;
}

.ref-dot {
  margin: 0 0.35rem;
  color: #b8c4bc;
}

/* Thermal Paper Segmented Selector */
.paper-row {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--roast-ink);
  margin-bottom: 0.38rem;
}

.paper-segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: #f1f5f3;
  border: 1px solid #e4ece7;
  max-width: 340px;
}

.paper-seg-btn {
  height: 33px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--sage-muted);
  font-size: 0.79rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s ease;
}

.paper-seg-btn.active {
  background: #ffffff;
  color: var(--botanical-deep);
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(20, 35, 26, 0.08);
}

.section-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

/* Right Column: Live Receipt Preview */
.receipt-sticky-wrapper {
  position: sticky;
  top: 1.25rem;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto 0.6rem;
  max-width: 356px;
}

.preview-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--sage-muted);
}

.preview-width {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--botanical-primary);
}

.thermal-receipt-container {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(20, 35, 26, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8e4;
  margin: 0 auto;
  transition: max-width 0.22s ease;
  font-family: 'Kantumruy Pro', ui-monospace, monospace;
}

.receipt-width-80 {
  max-width: 356px;
}

.receipt-width-58 {
  max-width: 292px;
}

.receipt-body {
  padding: 1.15rem 1.25rem;
}

.receipt-sawtooth-cut {
  height: 10px;
  background: radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%);
  background-size: 12px 12px;
}

.receipt-sawtooth-cut.bottom {
  transform: rotate(180deg);
}

.receipt-dashed-line {
  border-top: 1px dashed #c8d1cb;
}

.receipt-preview-logo {
  width: 50px;
  height: 50px;
}

.receipt-font-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #14231a;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.receipt-font-meta {
  font-size: 10.5px;
  line-height: 1.35;
  color: #54665b;
}

.receipt-meta-grid {
  font-size: 10.5px;
  line-height: 1.45;
  color: #54665b;
}

.meta-split {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.receipt-items-list,
.receipt-totals-box {
  font-size: 11.5px;
  color: #14231a;
}

.receipt-item-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 2px 0;
}

.muted-row {
  color: #54665b;
  font-size: 11px;
}

.smaller-row {
  font-size: 10.5px;
}

.receipt-total-usd {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  margin: 3px 0;
  font-weight: 800;
  font-size: 13px;
  border-top: 1px dashed #c8d1cb;
  border-bottom: 1px dashed #c8d1cb;
}

.receipt-footer-text {
  font-size: 11px;
  color: #54665b;
  line-height: 1.4;
}

.barcode-graphic {
  width: 130px;
  height: 26px;
  background: repeating-linear-gradient(
    to right,
    #14231a,
    #14231a 2px,
    #ffffff 2px,
    #ffffff 4px,
    #14231a 4px,
    #14231a 5px,
    #ffffff 5px,
    #ffffff 8px,
    #14231a 8px,
    #14231a 11px
  );
}

/* Tab 2 Balanced 50/50 Account & Security Grid */
.account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.account-card {
  display: flex;
  flex-direction: column;
}

.account-form-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stack-fields {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.account-card .section-footer {
  margin-top: auto;
  padding-top: 1.15rem;
}

.identity-bar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.1rem 1.35rem;
  border-bottom: 1px solid var(--ledger-hairline);
  background: #fafcfb;
}

.avatar-square {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #e6f2eb;
  border: 1px solid #cce0d4;
  color: var(--botanical-deep);
  font-size: 0.84rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.account-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--roast-ink);
  line-height: 1.25;
}

.account-subline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.76rem;
  color: var(--sage-muted);
  margin-top: 2px;
}

.meta-dot {
  color: #b8c4bc;
}

.account-role {
  font-weight: 600;
  color: var(--botanical-primary);
}

.session-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 1.35rem;
  border-top: 1px solid var(--ledger-hairline);
  background: #fafcfb;
}

.session-copy {
  flex: 1;
  min-width: 180px;
}

.session-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.session-sub {
  font-size: 0.74rem;
  color: var(--sage-muted);
  margin-top: 2px;
}

.btn-danger-outline {
  height: 36px;
  padding: 0 0.9rem;
  border-radius: 8px;
  border: 1px solid #f5c2c2;
  background: #ffffff;
  color: #c5221f;
  font-size: 0.79rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.14s ease;
}

.btn-danger-outline:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #f0a3a3;
}

.btn-danger-outline:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 992px) {
  .settings-grid,
  .account-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .col-span-5,
  .col-span-6,
  .col-span-7 {
    grid-column: span 12;
  }
}
</style>
