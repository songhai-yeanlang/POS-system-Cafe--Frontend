<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'

const router = useRouter()

const email = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

watch(email, () => {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
})

const handleSendCode = async () => {
  errorMessage.value = ''
  if (!email.value) {
    errorMessage.value = 'Please enter your work email'
    return
  }

  isLoading.value = true
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    sessionStorage.setItem('resetEmail', email.value)
    localStorage.setItem('resetEmail', email.value)
    router.push({ path: '/verify-otp', query: { email: email.value } })
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'Failed to send verification code'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="forgot-wrapper min-vh-100 d-flex align-items-center justify-content-center p-3">
    <div class="forgot-card bg-white p-4 p-sm-5">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <router-link
          to="/login"
          class="back-link d-inline-flex align-items-center text-decoration-none"
        >
          <svg
            class="me-2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to login
        </router-link>
        <span class="step-text">Step 1</span>
      </div>

      <h3 class="title-text fw-bold mb-2">Forgot password?</h3>
      <p class="subtitle-text mb-4">
        Enter your work email to receive a 6-digit verification code.
      </p>

      <form @submit.prevent="handleSendCode">
        <div class="mb-4">
          <BaseInput
            v-model="email"
            type="email"
            label="Work email"
            placeholder="elena.rossi@brewpos.com"
            :error="errorMessage"
            required
            autofocus
          >
            <template #suffix>
              <span
                class="at-icon d-inline-flex align-items-center justify-content-center"
                :class="{ 'text-danger': !!errorMessage }"
              >
                @
              </span>
            </template>
          </BaseInput>
        </div>

        <BaseButton type="submit" variant="primary" size="lg" block :loading="isLoading">
          Send Code
        </BaseButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.forgot-wrapper {
  background-color: var(--background, #faf9f7);
  font-family: var(--font-family, 'Inter', sans-serif);
}

.forgot-card {
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  box-shadow: 0 4px 20px -2px rgba(44, 24, 16, 0.04);
}

.back-link {
  color: var(--on-surface-variant, #504440);
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s ease;
}
.back-link:hover {
  color: var(--primary, #2c1810);
}

.step-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface-variant, #504440);
}

.title-text {
  font-size: 24px;
  color: var(--on-surface, #1c1b1b);
  letter-spacing: -0.02em;
}

.subtitle-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--on-surface-variant, #504440);
}

.at-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--outline, #827470);
  font-size: 15px;
  font-weight: 500;
}

.security-tag {
  font-size: 12px;
  color: var(--outline, #827470);
}
</style>
