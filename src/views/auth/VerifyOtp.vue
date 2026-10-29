<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/api'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const route = useRoute()

const email = ref(
  route.query.email ||
  sessionStorage.getItem('resetEmail') ||
  localStorage.getItem('resetEmail') ||
  ''
)
const digits = ref(['', '', '', '', '', ''])
const inputRefs = ref([])

const isComplete = computed(() => {
  return digits.value.every((d) => d !== '')
})

const isLoading = ref(false)
const isResending = ref(false)
const errorMessage = ref('')
const countdown = ref(0)
let timer = null

const startCountdown = (seconds = 60) => {
  countdown.value = seconds
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

onMounted(() => {
  if (inputRefs.value[0]) {
    inputRefs.value[0].focus()
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const handleInput = (index, event) => {
  errorMessage.value = ''
  const val = event.target.value.replace(/\D/g, '')
  digits.value[index] = val ? val[val.length - 1] : ''

  if (val && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
}

const handleKeyDown = (index, event) => {
  errorMessage.value = ''
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

const handlePaste = (event) => {
  errorMessage.value = ''
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text') || ''
  const cleanDigits = pastedData.replace(/\D/g, '').slice(0, 6).split('')

  cleanDigits.forEach((d, idx) => {
    if (idx < 6) digits.value[idx] = d
  })

  const nextIdx = Math.min(cleanDigits.length, 5)
  inputRefs.value[nextIdx]?.focus()
}

const handleVerify = async () => {
  errorMessage.value = ''

  if (!email.value) {
    errorMessage.value = 'Email is missing. Please restart from Forgot Password.'
    return
  }

  if (!isComplete.value) {
    errorMessage.value = 'Please enter all 6 digits of the passcode'
    return
  }

  const otpCode = digits.value.join('')

  isLoading.value = true
  try {
    const res = await api.post('/auth/verify-otp', {
      email: email.value,
      otp: otpCode,
    })

    const resetToken =
      res.data?.data?.resetToken ||
      res.data?.resetToken ||
      res.data?.data?.token ||
      res.data?.token

    if (resetToken) {
      sessionStorage.setItem('resetToken', resetToken)
      localStorage.setItem('resetToken', resetToken)
      router.push({ path: '/reset-password', query: { token: resetToken } })
    } else {
      errorMessage.value = res.data?.message || 'Verification failed. Please try again.'
    }
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message ||
      err.message ||
      'Invalid or expired passcode'
  } finally {
    isLoading.value = false
  }
}

const handleResend = async () => {
  if (isResending.value || countdown.value > 0) return

  if (!email.value) {
    errorMessage.value = 'Email is missing. Please restart from Forgot Password.'
    return
  }

  isResending.value = true
  errorMessage.value = ''

  try {
    await api.post('/auth/forgot-password', { email: email.value })
    startCountdown(60)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Failed to resend code'
  } finally {
    isResending.value = false
  }
}
</script>

<template>
  <div class="verify-wrapper min-vh-100 d-flex align-items-center justify-content-center p-3">
    <div class="verify-card bg-white p-4 p-sm-5">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <router-link
          to="/forgot-password"
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
          Back to forgot password
        </router-link>
        <span class="step-text">Step 2</span>
      </div>

      <h3 class="title-text fw-bold mb-2">Check email</h3>
      <p class="subtitle-text mb-4">Enter the 6-digit passcode sent to your inbox.</p>

      <form @submit.prevent="handleVerify">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="code-label mb-0 fw-medium">Security code</label>
          <span class="expiry-text">10 min expiry</span>
        </div>

        <div class="otp-grid mb-2" @paste="handlePaste">
          <input
            v-for="(digit, index) in digits"
            :key="index"
            :ref="(el) => (inputRefs[index] = el)"
            type="text"
            inputmode="numeric"
            maxlength="1"
            placeholder="•"
            class="otp-box text-center"
            :class="{
              'otp-box--filled': !!digit,
              'otp-box--error': !!errorMessage,
            }"
            :value="digit"
            @input="handleInput(index, $event)"
            @keydown="handleKeyDown(index, $event)"
            @keydown.enter.prevent="handleVerify"
          />
        </div>

        <div v-if="errorMessage" class="error-text small mb-3">
          {{ errorMessage }}
        </div>
        <div v-else class="mb-4"></div>

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          block
          class="mb-4"
          :loading="isLoading"
        >
          Verify Code
        </BaseButton>
      </form>

      <div class="text-center pt-2 border-top">
        <button
          type="button"
          class="btn btn-link p-0 text-decoration-none small resend-link"
          :disabled="isResending || countdown > 0"
          @click="handleResend"
        >
          <span v-if="isResending">Sending code...</span>
          <span v-else-if="countdown > 0">Resend OTP ({{ countdown }}s)</span>
          <span v-else>Resend OTP</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verify-wrapper {
  background-color: var(--background, #faf9f7);
  font-family: var(--font-family, 'Inter', sans-serif);
}

.verify-card {
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
  font-size: 14px;
  line-height: 1.5;
  color: var(--on-surface-variant, #504440);
}

.code-label {
  font-size: 13px;
  color: var(--on-surface, #1c1b1b);
}

.expiry-text {
  font-size: 13px;
  color: var(--on-surface-variant, #504440);
}

.otp-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  width: 100%;
}

.otp-box {
  width: 100%;
  min-width: 0;
  height: 52px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--outline-variant, #d3c3be);
  background-color: var(--surface-container-low, #f6f3f2);
  font-size: 20px;
  font-weight: 600;
  color: var(--on-surface, #1c1b1b);
  text-align: center;
  outline: none;
  transition: all 0.15s ease;
  font-feature-settings: 'tnum' 1;
  box-sizing: border-box;
}

.otp-box::placeholder {
  color: var(--outline, #827470);
  font-size: 20px;
  line-height: 1;
}

.otp-box:focus {
  border-color: var(--primary, #2c1810);
  background-color: #ffffff;
  box-shadow:
    0 0 0 2px var(--background, #faf9f7),
    0 0 0 4px rgba(44, 24, 16, 0.2);
}

.otp-box--filled {
  background-color: #ffffff;
}

.otp-box--error {
  border-color: var(--error, #ba1a1a) !important;
  color: var(--error, #ba1a1a) !important;
}

.error-text {
  color: var(--error, #ba1a1a);
  font-size: 13px;
  font-weight: 500;
}

.resend-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--primary, #2c1810);
  transition: color 0.15s ease;
}

.resend-link:hover:not(:disabled) {
  color: var(--primary-dark, #1d100b) !important;
  text-decoration: underline !important;
}

.resend-link:disabled {
  color: var(--outline, #827470) !important;
  cursor: not-allowed;
  text-decoration: none !important;
}
</style>
