<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
  rememberMe: false,
})

const isLoading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  const savedEmail = localStorage.getItem('remember_email')
  if (savedEmail) {
    form.email = savedEmail
    form.rememberMe = true
  }
})

watch(
  () => [form.email, form.password],
  () => {
    if (errorMessage.value) {
      errorMessage.value = ''
    }
  },
)

const handleLogin = async () => {
  errorMessage.value = ''

  if (!form.email || !form.password) {
    errorMessage.value = 'Please enter both email and password'
    return
  }

  isLoading.value = true
  try {
    await authStore.login({
      email: form.email,
      password: form.password,
    })

    if (form.rememberMe) {
      localStorage.setItem('remember_email', form.email)
    } else {
      localStorage.removeItem('remember_email')
    }

    router.push('/')
  } catch (err) {
    errorMessage.value = err.message || 'Invalid email or password'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-wrapper min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-4">
    <div class="login-card row g-0 rounded-4 overflow-hidden bg-white">
      <div class="col-12 col-md-12 form-side d-flex flex-column justify-content-center p-4 p-md-5">
        <div class="mb-4">
          <h3 class="fw-semibold text-dark mb-1">Welcome back</h3>
          <p class="text-secondary small mb-0">Sign in to your account</p>
        </div>

        <form @submit.prevent="handleLogin">
          <BaseInput
            v-model="form.email"
            type="email"
            label="Email address"
            placeholder="barista@brewpos.com"
            :error="!form.email && errorMessage ? errorMessage : ''"
            required
            autofocus
          />

          <BaseInput
            v-model="form.password"
            type="password"
            label="Password"
            placeholder="••••••••"
            :error="
              errorMessage && form.email
                ? errorMessage
                : !form.password && errorMessage
                  ? errorMessage
                  : ''
            "
            required
          />

          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="form-check d-flex align-items-center gap-2 mb-0 ps-0">
              <input
                id="rememberMe"
                v-model="form.rememberMe"
                class="form-check-input remember-check m-0"
                type="checkbox"
              />
              <label class="form-check-label remember-label" for="rememberMe"> Remember me </label>
            </div>

            <router-link to="/forgot-password" class="text-decoration-none small forgot-link">
              Forgot password?
            </router-link>
          </div>

          <BaseButton type="submit" variant="primary" size="lg" block :loading="isLoading">
            Sign In
          </BaseButton>
        </form>

        <div class="text-center mt-4 pt-2">
          <span class="system-tag text-uppercase fw-semibold">POS SYSTEM V1.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  background-color: var(--background, #faf9f7);
}

.login-card {
  width: 100%;
  max-width: 500px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
}

.brand-side {
  background-color: var(--primary, #2c1810);
  color: var(--on-primary, #ffffff);
  min-height: 220px;
}

.brand-icon-box {
  width: 72px;
  height: 72px;
  color: #ffffff;
}

.brand-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  color: var(--secondary-fixed, #ffdcc5);
  font-size: 13px;
  font-weight: 400;
}

.form-side {
  background-color: var(--surface-container-lowest, #ffffff);
}

.remember-check {
  cursor: pointer;
  width: 16px;
  height: 16px;
  border-color: var(--border-subtle, #e5e7eb);
  box-shadow: none !important;
  border-radius: 4px;
}

.remember-check:checked {
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
}

.remember-check:focus {
  border-color: var(--primary, #2c1810);
  box-shadow: 0 0 0 2px rgba(44, 24, 16, 0.15) !important;
}

.remember-label {
  font-size: 13px;
  color: var(--on-surface-variant, #504440);
  cursor: pointer;
  user-select: none;
}

.forgot-link {
  color: var(--on-surface-variant, #504440);
  font-size: 13px;
}

.forgot-link:hover {
  color: var(--primary, #2c1810) !important;
  text-decoration: underline !important;
}

.system-tag {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--on-surface-variant, #504440);
}
</style>
