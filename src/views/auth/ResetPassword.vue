<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/api'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const route = useRoute()

const newPassword = ref('')
const confirmPassword = ref('')
const resetToken = ref(
  route.query.token ||
  sessionStorage.getItem('resetToken') ||
  localStorage.getItem('resetToken') ||
  ''
)

const isLoading = ref(false)
const errorMessage = ref('')

const newPasswordError = computed(() => {
  if (!errorMessage.value) return ''
  if (errorMessage.value.toLowerCase().includes('8 characters')) {
    return errorMessage.value
  }
  return ''
})

const confirmPasswordError = computed(() => {
  if (!errorMessage.value) return ''
  if (errorMessage.value.toLowerCase().includes('match') || !newPasswordError.value) {
    return errorMessage.value
  }
  return ''
})

watch([newPassword, confirmPassword], () => {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
})

const isReady = computed(() => {
  return (
    newPassword.value.length >= 8 &&
    confirmPassword.value.length >= 8 &&
    newPassword.value === confirmPassword.value
  )
})

const handleUpdatePassword = async () => {
  errorMessage.value = ''

  if (!resetToken.value) {
    errorMessage.value = 'Missing or invalid reset session. Please restart from Forgot Password.'
    return
  }

  if (newPassword.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  isLoading.value = true
  try {
    await api.post('/auth/reset-password', {
      resetToken: resetToken.value,
      newPassword: newPassword.value,
    })

    sessionStorage.removeItem('resetToken')
    sessionStorage.removeItem('resetEmail')
    router.push('/login')
  } catch (err) {
    errorMessage.value = err.response?.data?.message || err.message || 'Failed to update password'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="reset-wrapper min-vh-100 d-flex align-items-center justify-content-center p-3">
    <div class="reset-card bg-white p-4 p-sm-5">
      <div class="d-flex align-items-center justify-content-between pb-3 mb-4">
        <span class="step-header-text">Reset password</span>
        <span class="step-number-text">Step 3</span>
      </div>

      <h3 class="title-text fw-bold mb-2">Set password</h3>
      <p class="subtitle-text mb-4">Choose a strong password with 8+ characters.</p>

      <form @submit.prevent="handleUpdatePassword">
        <BaseInput
          v-model="newPassword"
          type="password"
          label="New password"
          placeholder="••••••••••••"
          :error="newPasswordError"
          required
          autofocus
        />

        <BaseInput
          v-model="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="••••••••••••"
          :error="confirmPasswordError"
          class="mb-4"
          required
        />

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          block
          class="mb-4"
          :loading="isLoading"
        >
          Update Password
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.reset-wrapper {
  background-color: var(--background, #faf9f7);
  font-family: var(--font-family, 'Inter', sans-serif);
}

.reset-card {
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  box-shadow: 0 4px 20px -2px rgba(44, 24, 16, 0.04);
}

.step-header-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface, #1c1b1b);
}

.step-number-text {
  font-size: 13px;
  color: var(--on-surface-variant, #504440);
}

.title-text {
  font-size: 24px;
  color: var(--on-surface, #1c1b1b);
  letter-spacing: -0.02em;
}

.subtitle-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--on-surface-variant, #504440);
}
</style>
