<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()
const { formatDateTime } = useFormatDate()

const profileData = ref(null)
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
    if (data) {
      profileData.value = data
      name.value = data.name || ''
    }
  } catch {
    // Ignore if offline
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
      profileData.value = res.data.data
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
</script>

<template>
  <div class="profile-wrapper mx-auto">
    <!-- 1. Personal Information Card -->
    <form class="clean-card bg-white p-4 p-md-5 mb-4" @submit.prevent="handleUpdateProfile">
      <div class="d-flex align-items-center justify-content-between pb-4 mb-4 border-bottom">
        <div class="d-flex align-items-center gap-3">
          <div class="avatar-box d-flex align-items-center justify-content-center">
            {{ userInitials }}
          </div>
          <div>
            <h5 class="fw-semibold mb-1 text-dark">{{ authStore.user?.name }}</h5>
            <div class="text-muted small">{{ authStore.user?.email }}</div>
          </div>
        </div>
        <span class="badge-tag-crema">{{ authStore.user?.role }}</span>
      </div>

      <div class="row g-3 mb-2">
        <div class="col-12 col-md-7">
          <BaseInput
            v-model="name"
            label="Display name"
            placeholder="Your full name"
            :error="nameError"
            required
          />
        </div>

        <div class="col-12 col-md-5">
          <BaseInput
            :model-value="authStore.user?.email || ''"
            label="Work email"
            disabled
          />
        </div>
      </div>

      <div class="d-flex align-items-center justify-content-between pt-3 border-top">
        <span class="text-muted small">
          Last login: {{ formatDateTime(profileData?.last_login_at) }}
        </span>

        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!isProfileDirty"
          :loading="isSavingProfile"
        >
          Save Name
        </BaseButton>
      </div>
    </form>

    <!-- 2. Change Password Card -->
    <form class="clean-card bg-white p-4 p-md-5 mb-4" @submit.prevent="handleChangePassword">
      <div class="mb-4 pb-3 border-bottom">
        <h5 class="fw-semibold mb-1 text-dark">Change Password</h5>
        <p class="text-muted small mb-0">
          Use a strong password of at least 6 characters.
        </p>
      </div>

      <BaseInput
        v-model="passwordForm.currentPassword"
        type="password"
        label="Current password"
        placeholder="••••••••"
        :error="passwordErrors.currentPassword"
        required
      />

      <div class="row g-3">
        <div class="col-12 col-md-6">
          <BaseInput
            v-model="passwordForm.newPassword"
            type="password"
            label="New password"
            placeholder="••••••••"
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

      <div class="d-flex justify-content-end pt-3 border-top">
        <BaseButton type="submit" variant="primary" :loading="isChangingPassword">
          Update Password
        </BaseButton>
      </div>
    </form>

    <!-- 3. Active Sessions Card -->
    <div class="clean-card bg-white p-4 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
      <div>
        <div class="fw-semibold text-dark mb-1">Active Sessions</div>
        <div class="text-muted small">
          Sign out your account from all browsers and POS terminals.
        </div>
      </div>

      <BaseButton
        type="button"
        variant="secondary"
        size="sm"
        class="text-danger flex-shrink-0"
        :loading="isLoggingOutAll"
        @click="handleLogoutAllDevices"
      >
        Sign Out All Devices
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.profile-wrapper {
  max-width: 680px;
}

.clean-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.avatar-box {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background-color: var(--secondary-fixed, #ffdcc5);
  color: var(--on-secondary-fixed, #2b1707);
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
