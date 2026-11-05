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
  <div class="settings-wrapper mx-auto">
    <!-- Clean Tab Switcher -->
    <div class="d-flex justify-content-center mb-3">
      <div class="tab-switcher d-inline-flex p-1 rounded-3 bg-white border">
        <button
          type="button"
          class="tab-btn px-4 py-2 rounded-2"
          :class="{ active: activeTab === 'shop' }"
          @click="setTab('shop')"
        >
          <i class="bi bi-shop me-1"></i>
          Shop Settings
        </button>
        <button
          type="button"
          class="tab-btn px-4 py-2 rounded-2"
          :class="{ active: activeTab === 'profile' }"
          @click="setTab('profile')"
        >
          <i class="bi bi-person-badge me-1"></i>
          Owner Account
        </button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: SHOP SETTINGS FORM                  -->
    <!-- ========================================== -->
    <form
      v-if="activeTab === 'shop'"
      class="settings-card bg-white p-4 p-md-5"
      @submit.prevent="handleSaveSettings"
    >
      <!-- 1. Logo -->
      <div class="d-flex align-items-center justify-content-between gap-3 pb-4 mb-4 border-bottom">
        <div class="d-flex align-items-center gap-3">
          <div class="logo-box d-flex align-items-center justify-content-center overflow-hidden">
            <img
              v-if="appStore.shopLogoUrl"
              :src="appStore.shopLogoUrl"
              alt="Shop Logo"
              class="w-100 h-100 object-fit-cover"
            />
            <i v-else class="bi bi-cup-hot fs-4 text-muted"></i>
          </div>
          <div>
            <div class="label-title">Shop Logo</div>
            <div class="hint-text">JPG, PNG or WEBP (Max 3MB)</div>
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
            {{ appStore.settings?.logo ? 'Change' : 'Upload' }}
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
            Remove
          </BaseButton>
        </div>
      </div>

      <!-- 2. Shop Info -->
      <div class="pb-2 mb-4 border-bottom">
        <div class="row g-3">
          <div class="col-12 col-md-7">
            <BaseInput
              v-model="shopForm.shop_name"
              label="Shop name"
              placeholder="e.g. BrewPOS Coffee"
              :error="shopErrors.shop_name"
              required
            />
          </div>

          <div class="col-12 col-md-5">
            <BaseInput
              v-model="shopForm.phone"
              label="Phone number"
              placeholder="e.g. 012 345 678"
              :error="shopErrors.phone"
            />
          </div>
        </div>

        <BaseInput
          v-model="shopForm.address"
          label="Address"
          placeholder="e.g. #123, Street 2004, Phnom Penh"
          :error="shopErrors.address"
        />
      </div>

      <!-- 3. Currency & Receipt -->
      <div class="mb-4">
        <div class="row g-3 align-items-start">
          <div class="col-12 col-md-6">
            <BaseInput
              v-model="shopForm.exchange_rate"
              type="number"
              label="Exchange rate (1 USD to KHR)"
              placeholder="4100"
              :error="shopErrors.exchange_rate"
              required
            >
              <template #suffix>
                <span class="small text-muted fw-medium">៛</span>
              </template>
            </BaseInput>
          </div>

          <div class="col-12 col-md-6 mb-3">
            <label class="form-label mb-1 fw-medium small text-dark">Receipt paper size</label>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="size-btn flex-grow-1"
                :class="{ active: shopForm.receipt_width === '80' }"
                @click="shopForm.receipt_width = '80'"
              >
                80mm (Standard)
              </button>
              <button
                type="button"
                class="size-btn flex-grow-1"
                :class="{ active: shopForm.receipt_width === '58' }"
                @click="shopForm.receipt_width = '58'"
              >
                58mm (Small)
              </button>
            </div>
          </div>
        </div>

        <BaseInput
          v-model="shopForm.receipt_footer"
          label="Receipt footer note"
          placeholder="e.g. Thank you for visiting! Wi-Fi: Coffee123"
          :error="shopErrors.receipt_footer"
        />
      </div>

      <!-- Footer Actions -->
      <div class="d-flex justify-content-end gap-2 pt-3 border-top">
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="!isShopDirty || isSavingShop"
          @click="handleResetShopForm"
        >
          Cancel
        </BaseButton>
        <BaseButton
          type="submit"
          variant="primary"
          :loading="isSavingShop"
          :disabled="!isShopDirty"
        >
          Save Changes
        </BaseButton>
      </div>
    </form>

    <!-- ========================================== -->
    <!-- TAB 2: OWNER ACCOUNT & PROFILE             -->
    <!-- ========================================== -->
    <div v-else class="settings-card bg-white p-4 p-md-5">
      <!-- User Overview Header -->
      <div class="d-flex align-items-center gap-3 pb-4 mb-4 border-bottom">
        <div class="avatar-box d-flex align-items-center justify-content-center">
          {{ userInitials }}
        </div>
        <div>
          <h5 class="fw-bold text-dark mb-1">{{ authStore.user?.name || 'Owner' }}</h5>
          <div class="text-muted small">
            {{ authStore.user?.email }} • <span class="text-dark fw-medium">Shop Owner</span>
          </div>
        </div>
      </div>

      <!-- 1. Personal Details -->
      <form class="mb-5" @submit.prevent="handleUpdateProfile">
        <div class="mb-3">
          <h6 class="section-title mb-1">Personal Details</h6>
          <p class="section-desc mb-3">Your display name appears on receipts, reports and audit trails.</p>
        </div>

        <div class="row g-3">
          <div class="col-12 col-md-6">
            <BaseInput
              v-model="profileName"
              label="Full name"
              placeholder="Your full name"
              :error="profileNameError"
              required
            />
          </div>

          <div class="col-12 col-md-6">
            <BaseInput
              :model-value="authStore.user?.email || ''"
              label="Email address"
              disabled
            />
          </div>
        </div>

        <div class="d-flex justify-content-end mt-2">
          <BaseButton
            type="submit"
            variant="primary"
            size="sm"
            :disabled="!isProfileDirty || isSavingProfile"
            :loading="isSavingProfile"
          >
            Save Changes
          </BaseButton>
        </div>
      </form>

      <!-- 2. Change Password -->
      <form class="pt-4 border-top mb-5" @submit.prevent="handleChangePassword">
        <div class="mb-3">
          <h6 class="section-title mb-1">Password</h6>
          <p class="section-desc mb-3">Change your password to keep your account safe.</p>
        </div>

        <div class="mb-3">
          <BaseInput
            v-model="passwordForm.currentPassword"
            type="password"
            label="Current password"
            placeholder="••••••••"
            :error="passwordErrors.currentPassword"
            required
          />
        </div>

        <div class="row g-3">
          <div class="col-12 col-md-6">
            <BaseInput
              v-model="passwordForm.newPassword"
              type="password"
              label="New password"
              placeholder="At least 6 characters"
              :error="passwordErrors.newPassword"
              required
            />
          </div>

          <div class="col-12 col-md-6">
            <BaseInput
              v-model="passwordForm.confirmPassword"
              type="password"
              label="Confirm new password"
              placeholder="••••••••"
              :error="passwordErrors.confirmPassword"
              required
            />
          </div>
        </div>

        <div class="d-flex justify-content-end mt-2">
          <BaseButton
            type="submit"
            variant="secondary"
            size="sm"
            :loading="isChangingPassword"
          >
            Update Password
          </BaseButton>
        </div>
      </form>

      <!-- 3. Active Sessions -->
      <div class="pt-4 border-top">
        <div class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
          <div>
            <h6 class="section-title mb-1">Active Sessions</h6>
            <p class="section-desc mb-0">Log out of your account from all browsers and POS terminals.</p>
          </div>

          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            class="text-danger flex-shrink-0"
            :loading="isLoggingOutAll"
            @click="handleLogoutAllDevices"
          >
            Sign out everywhere
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-wrapper {
  max-width: 680px;
}

.settings-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.tab-switcher {
  background-color: #ffffff;
}

.tab-btn {
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--on-surface-variant, #504440);
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--on-surface, #1c1b1b);
}

.tab-btn.active {
  background-color: var(--primary, #2c1810);
  color: #ffffff;
}

.logo-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  flex-shrink: 0;
}

.label-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface, #1c1b1b);
}

.hint-text {
  font-size: 12px;
  color: var(--on-surface-variant, #504440);
}

.size-btn {
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  background-color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface, #1c1b1b);
  transition: all 0.15s ease;
}

.size-btn:hover {
  background-color: var(--surface-container-low, #f6f3f2);
}

.size-btn.active {
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
  color: #ffffff;
}

.avatar-box {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  color: var(--primary, #2c1810);
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--on-surface, #1c1b1b);
}

.section-desc {
  font-size: 13px;
  color: var(--on-surface-variant, #504440);
}
</style>
