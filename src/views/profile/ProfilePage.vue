<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()

const name = ref('')
const nameError = ref('')
const isSavingProfile = ref(false)

// Password Form
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
  const n = name.value || authStore.user?.name || 'U'
  return n
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const isProfileDirty = computed(() => {
  return name.value.trim() !== (authStore.user?.name || '')
})

onMounted(async () => {
  name.value = authStore.user?.name || ''
  try {
    const data = await authStore.fetchMe()
    if (data?.name) {
      name.value = data.name
    }
  } catch {
    // Ignore
  }
})

const handleUpdateProfile = async () => {
  nameError.value = ''
  const cleanName = name.value.trim()

  if (!cleanName) {
    nameError.value = 'Name is required'
    return
  }
  if (cleanName.length < 2) {
    nameError.value = 'Name must be at least 2 characters'
    return
  }

  isSavingProfile.value = true
  try {
    const res = await api.patch('/auth/profile', { name: cleanName })
    if (res.data?.data) {
      authStore.setUser({
        ...authStore.user,
        name: res.data.data.name,
      })
      name.value = res.data.data.name
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
  if (!confirm('Sign out from all devices and terminals?')) return

  isLoggingOutAll.value = true
  try {
    await authStore.logoutAll()
    appStore.resetAppData()
    toast.success('Signed out from all devices')
    router.push('/login')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to sign out')
  } finally {
    isLoggingOutAll.value = false
  }
}
</script>

<template>
  <div class="profile-container mx-auto">
    <div class="profile-sheet bg-white p-4 p-md-5">
      <!-- User Overview Header -->
      <div class="d-flex align-items-center gap-3 pb-4 mb-4 border-bottom">
        <div class="user-avatar-circle flex-shrink-0">
          {{ userInitials }}
        </div>
        <div>
          <h5 class="fw-bold text-dark mb-1">{{ authStore.user?.name || 'Staff' }}</h5>
          <div class="text-muted small">
            {{ authStore.user?.email }} •
            <span class="text-dark fw-medium">
              {{ authStore.user?.role === 'OWNER' ? 'Shop Owner' : 'Staff Cashier' }}
            </span>
          </div>
        </div>
      </div>

      <!-- SECTION 1: Personal Information -->
      <form class="mb-5" @submit.prevent="handleUpdateProfile">
        <div class="mb-3">
          <h6 class="section-title mb-1">Personal Details</h6>
          <p class="section-desc mb-3">Your display name appears on receipts and orders.</p>
        </div>

        <div class="row g-3">
          <div class="col-12 col-md-6">
            <BaseInput
              v-model="name"
              label="Full name"
              placeholder="Your full name"
              :error="nameError"
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

      <!-- SECTION 2: Change Password -->
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

      <!-- SECTION 3: Sessions -->
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
.profile-container {
  max-width: 640px;
}

.profile-sheet {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.user-avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  color: var(--primary, #2c1810);
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
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
