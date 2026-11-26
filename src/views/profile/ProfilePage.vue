<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { t } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()
const { formatDateTime, formatDate } = useFormatDate()

const profileDetails = ref(authStore.user || null)

// Personal details state
const name = ref('')
const nameError = ref('')
const isSavingProfile = ref(false)

// Password state
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

const passwordVisibility = reactive({
  current: false,
  next: false,
  confirm: false,
})

const isChangingPassword = ref(false)

// Session sign-out confirmation state
const showLogoutAllModal = ref(false)
const isLoggingOutAll = ref(false)

const activeUser = computed(() => profileDetails.value || authStore.user || {})

const displayName = computed(() => activeUser.value?.name || t('common.staff'))

const roleBadgeText = computed(() => {
  return activeUser.value?.role === 'OWNER'
    ? t('settings.shopOwnerBadge')
    : t('settings.staffCashierBadge')
})

const isAccountActive = computed(() => {
  return activeUser.value?.is_active !== false
})

const userInitials = computed(() => {
  const source = activeUser.value?.name || 'U'
  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  return parts
    .slice(0, 2)
    .map((part) => [...part][0] || '')
    .join('')
    .toUpperCase()
})

const formattedLastLogin = computed(() => {
  return formatDateTime(activeUser.value?.last_login_at, 'MMM D, YYYY, h:mm A')
})

const formattedMemberSince = computed(() => {
  return formatDate(activeUser.value?.created_at, 'MMM D, YYYY')
})

const isProfileDirty = computed(() => {
  return name.value.trim() !== (activeUser.value?.name || '')
})

const hasPasswordInput = computed(() => {
  return Boolean(
    passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword,
  )
})

const isPasswordMinLengthMet = computed(() => passwordForm.newPassword.length >= 6)

const isPasswordMatchMet = computed(() => {
  return (
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword.length > 0 &&
    passwordForm.confirmPassword === passwordForm.newPassword
  )
})

const handleNameInput = () => {
  if (nameError.value) {
    nameError.value = ''
  }
}

const handleResetName = () => {
  name.value = activeUser.value?.name || ''
  nameError.value = ''
}

const clearPasswordErrors = () => {
  passwordErrors.currentPassword = ''
  passwordErrors.newPassword = ''
  passwordErrors.confirmPassword = ''
}

const handleClearPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordVisibility.current = false
  passwordVisibility.next = false
  passwordVisibility.confirm = false
  clearPasswordErrors()
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && showLogoutAllModal.value && !isLoggingOutAll.value) {
    showLogoutAllModal.value = false
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  name.value = authStore.user?.name || ''
  try {
    const data = await authStore.fetchMe()
    if (data) {
      profileDetails.value = data
      name.value = data.name || ''
    }
  } catch {
    // Keep cached user from authStore if network request fails
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleUpdateProfile = async () => {
  nameError.value = ''
  const cleanName = name.value.trim()

  if (!cleanName) {
    nameError.value = t('settings.valProfileNameRequired')
    return
  }
  if (cleanName.length < 2) {
    nameError.value = t('users.validationNameMin')
    return
  }

  isSavingProfile.value = true
  try {
    const res = await api.patch('/auth/profile', { name: cleanName })
    const updatedUser = res.data?.data
    if (updatedUser) {
      const merged = {
        ...activeUser.value,
        ...updatedUser,
      }
      profileDetails.value = merged
      authStore.setUser(merged)
      name.value = updatedUser.name
    }
    toast.success(res.data?.message || 'Profile updated successfully')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update profile')
  } finally {
    isSavingProfile.value = false
  }
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

    handleClearPasswordForm()
    toast.success(res.data?.message || 'Password changed successfully')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to change password')
  } finally {
    isChangingPassword.value = false
  }
}

const openLogoutAllModal = () => {
  showLogoutAllModal.value = true
}

const closeLogoutAllModal = () => {
  if (isLoggingOutAll.value) return
  showLogoutAllModal.value = false
}

const handleLogoutAllDevices = async () => {
  if (isLoggingOutAll.value) return
  isLoggingOutAll.value = true
  try {
    await authStore.logoutAll()
    appStore.resetAppData()
    showLogoutAllModal.value = false
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
  <div class="profile-workspace">
    <div class="profile-grid">
      <!-- LEFT COLUMN: Staff Credential & Account Facts -->
      <aside class="staff-dossier">
        <div class="dossier-identity">
          <div class="dossier-head-row">
            <div class="dossier-monogram" aria-hidden="true">
              {{ userInitials }}
            </div>
            <div class="dossier-title-group">
              <h2 class="dossier-name">{{ displayName }}</h2>
              <div class="dossier-role">{{ roleBadgeText }}</div>
            </div>
          </div>

          <div
            v-if="activeUser.email"
            class="dossier-email"
            :title="activeUser.email"
          >
            {{ activeUser.email }}
          </div>
        </div>

        <dl class="dossier-facts">
          <div class="dossier-fact-row">
            <dt class="fact-label">{{ $t('profile.storeLabel') }}</dt>
            <dd class="fact-value">{{ appStore.shopName }}</dd>
          </div>

          <div class="dossier-fact-row">
            <dt class="fact-label">{{ $t('profile.statusLabel') }}</dt>
            <dd class="fact-value">
              <span
                class="status-indicator"
                :class="isAccountActive ? 'is-active' : 'is-inactive'"
              >
                <span class="status-indicator__dot" aria-hidden="true"></span>
                <span>{{ isAccountActive ? $t('common.active') : $t('common.inactive') }}</span>
              </span>
            </dd>
          </div>

          <div class="dossier-fact-row">
            <dt class="fact-label">{{ $t('profile.shiftLabel') }}</dt>
            <dd class="fact-value">
              <router-link
                to="/shifts"
                class="shift-link tabular"
                :class="appStore.hasOpenShift ? 'is-open' : 'is-closed'"
              >
                <span class="shift-link__dot" aria-hidden="true"></span>
                <span>
                  {{
                    appStore.hasOpenShift
                      ? $t('profile.shiftOpenValue', { id: appStore.currentShift?.id })
                      : $t('profile.shiftClosedValue')
                  }}
                </span>
                <i class="bi bi-chevron-right shift-link__chevron" aria-hidden="true"></i>
              </router-link>
            </dd>
          </div>

          <div class="dossier-fact-row">
            <dt class="fact-label">{{ $t('profile.lastSignIn') }}</dt>
            <dd class="fact-value tabular">{{ formattedLastLogin }}</dd>
          </div>

          <div class="dossier-fact-row">
            <dt class="fact-label">{{ $t('profile.memberSince') }}</dt>
            <dd class="fact-value tabular">{{ formattedMemberSince }}</dd>
          </div>
        </dl>
      </aside>

      <!-- RIGHT COLUMN: Unified Account & Security Sheet -->
      <section class="profile-ledger">
        <!-- SECTION 1: Personal Details -->
        <form class="ledger-band" novalidate @submit.prevent="handleUpdateProfile">
          <div class="band-head">
            <div>
              <h2 class="band-title">{{ $t('profile.personalDetails') }}</h2>
              <p class="band-desc">{{ $t('profile.personalDetailsDesc') }}</p>
            </div>
            <span v-if="isProfileDirty" class="unsaved-flag">
              {{ $t('settings.unsavedChanges') }}
            </span>
          </div>

          <div class="field-grid">
            <div class="field-item">
              <label for="profile-full-name" class="field-label">
                {{ $t('users.fullNameLabel') }}
                <span class="field-required" aria-hidden="true">*</span>
              </label>
              <input
                id="profile-full-name"
                v-model="name"
                type="text"
                autocomplete="name"
                class="ledger-input"
                :class="{ 'is-invalid': !!nameError }"
                :placeholder="$t('settings.yourFullNamePlaceholder')"
                :aria-invalid="!!nameError"
                :aria-describedby="nameError ? 'profile-name-error' : undefined"
                @input="handleNameInput"
              />
              <p v-if="nameError" id="profile-name-error" class="field-error" role="alert">
                {{ nameError }}
              </p>
            </div>

            <div class="field-item">
              <label for="profile-email" class="field-label">
                {{ $t('auth.emailLabel') }}
              </label>
              <div class="input-shell is-locked">
                <input
                  id="profile-email"
                  :value="activeUser.email || ''"
                  type="email"
                  class="ledger-input ledger-input--with-icon"
                  disabled
                />
                <i class="bi bi-lock input-end-icon" aria-hidden="true"></i>
              </div>
              <p class="field-hint">{{ $t('profile.emailLockedHint') }}</p>
            </div>
          </div>

          <div class="band-footer">
            <button
              v-if="isProfileDirty"
              type="button"
              class="btn-ledger-secondary"
              :disabled="isSavingProfile"
              @click="handleResetName"
            >
              {{ $t('common.reset') }}
            </button>
            <button
              type="submit"
              class="btn-ledger-primary"
              :disabled="!isProfileDirty || isSavingProfile"
            >
              <span
                v-if="isSavingProfile"
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
              ></span>
              <span>{{ $t('profile.saveChanges') }}</span>
            </button>
          </div>
        </form>

        <!-- SECTION 2: Change Password -->
        <form
          class="ledger-band ledger-band--divided"
          novalidate
          @submit.prevent="handleChangePassword"
        >
          <div class="band-head">
            <div>
              <h2 class="band-title">{{ $t('profile.passwordHeading') }}</h2>
              <p class="band-desc">
                {{
                  authStore.isOwner
                    ? $t('profile.ownerPasswordDesc')
                    : $t('profile.staffPasswordDesc')
                }}
              </p>
            </div>
          </div>

          <div class="password-stack">
            <div class="field-item">
              <label for="profile-current-password" class="field-label">
                {{ $t('profile.currentPassword') }}
                <span class="field-required" aria-hidden="true">*</span>
              </label>
              <div class="input-shell" :class="{ 'is-invalid': !!passwordErrors.currentPassword }">
                <input
                  id="profile-current-password"
                  v-model="passwordForm.currentPassword"
                  :type="passwordVisibility.current ? 'text' : 'password'"
                  autocomplete="current-password"
                  class="ledger-input ledger-input--with-toggle"
                  :class="{ 'is-invalid': !!passwordErrors.currentPassword }"
                  :placeholder="$t('settings.currentPasswordPlaceholder')"
                  :aria-invalid="!!passwordErrors.currentPassword"
                  :aria-describedby="
                    passwordErrors.currentPassword ? 'profile-current-pw-error' : undefined
                  "
                  @input="passwordErrors.currentPassword = ''"
                />
                <button
                  type="button"
                  class="btn-eye-toggle"
                  :aria-label="
                    passwordVisibility.current
                      ? $t('profile.hidePassword')
                      : $t('profile.showPassword')
                  "
                  @click="passwordVisibility.current = !passwordVisibility.current"
                >
                  <i
                    class="bi"
                    :class="passwordVisibility.current ? 'bi-eye-slash' : 'bi-eye'"
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              <p
                v-if="passwordErrors.currentPassword"
                id="profile-current-pw-error"
                class="field-error"
                role="alert"
              >
                {{ passwordErrors.currentPassword }}
              </p>
            </div>

            <div class="field-grid">
              <div class="field-item">
                <label for="profile-new-password" class="field-label">
                  {{ $t('profile.newPassword') }}
                  <span class="field-required" aria-hidden="true">*</span>
                </label>
                <div class="input-shell" :class="{ 'is-invalid': !!passwordErrors.newPassword }">
                  <input
                    id="profile-new-password"
                    v-model="passwordForm.newPassword"
                    :type="passwordVisibility.next ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="ledger-input ledger-input--with-toggle"
                    :class="{ 'is-invalid': !!passwordErrors.newPassword }"
                    :placeholder="$t('users.min6Characters')"
                    :aria-invalid="!!passwordErrors.newPassword"
                    :aria-describedby="
                      passwordErrors.newPassword ? 'profile-new-pw-error' : undefined
                    "
                    @input="passwordErrors.newPassword = ''"
                  />
                  <button
                    type="button"
                    class="btn-eye-toggle"
                    :aria-label="
                      passwordVisibility.next
                        ? $t('profile.hidePassword')
                        : $t('profile.showPassword')
                    "
                    @click="passwordVisibility.next = !passwordVisibility.next"
                  >
                    <i
                      class="bi"
                      :class="passwordVisibility.next ? 'bi-eye-slash' : 'bi-eye'"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
                <p
                  v-if="passwordErrors.newPassword"
                  id="profile-new-pw-error"
                  class="field-error"
                  role="alert"
                >
                  {{ passwordErrors.newPassword }}
                </p>
              </div>

              <div class="field-item">
                <label for="profile-confirm-password" class="field-label">
                  {{ $t('profile.confirmNewPassword') }}
                  <span class="field-required" aria-hidden="true">*</span>
                </label>
                <div
                  class="input-shell"
                  :class="{ 'is-invalid': !!passwordErrors.confirmPassword }"
                >
                  <input
                    id="profile-confirm-password"
                    v-model="passwordForm.confirmPassword"
                    :type="passwordVisibility.confirm ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="ledger-input ledger-input--with-toggle"
                    :class="{ 'is-invalid': !!passwordErrors.confirmPassword }"
                    :placeholder="$t('settings.confirmPasswordPlaceholder')"
                    :aria-invalid="!!passwordErrors.confirmPassword"
                    :aria-describedby="
                      passwordErrors.confirmPassword ? 'profile-confirm-pw-error' : undefined
                    "
                    @input="passwordErrors.confirmPassword = ''"
                  />
                  <button
                    type="button"
                    class="btn-eye-toggle"
                    :aria-label="
                      passwordVisibility.confirm
                        ? $t('profile.hidePassword')
                        : $t('profile.showPassword')
                    "
                    @click="passwordVisibility.confirm = !passwordVisibility.confirm"
                  >
                    <i
                      class="bi"
                      :class="passwordVisibility.confirm ? 'bi-eye-slash' : 'bi-eye'"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>
                <p
                  v-if="passwordErrors.confirmPassword"
                  id="profile-confirm-pw-error"
                  class="field-error"
                  role="alert"
                >
                  {{ passwordErrors.confirmPassword }}
                </p>
              </div>
            </div>
          </div>

          <div class="band-footer band-footer--split">
            <ul class="password-rules" aria-live="polite">
              <li class="password-rule" :class="{ 'is-met': isPasswordMinLengthMet }">
                <i
                  class="bi"
                  :class="isPasswordMinLengthMet ? 'bi-check-circle-fill' : 'bi-circle'"
                  aria-hidden="true"
                ></i>
                <span>{{ $t('profile.ruleMinChars') }}</span>
              </li>
              <li class="password-rule" :class="{ 'is-met': isPasswordMatchMet }">
                <i
                  class="bi"
                  :class="isPasswordMatchMet ? 'bi-check-circle-fill' : 'bi-circle'"
                  aria-hidden="true"
                ></i>
                <span>{{ $t('profile.ruleMatches') }}</span>
              </li>
            </ul>

            <div class="footer-btn-group">
              <button
                v-if="hasPasswordInput"
                type="button"
                class="btn-ledger-secondary"
                :disabled="isChangingPassword"
                @click="handleClearPasswordForm"
              >
                {{ $t('common.clear') }}
              </button>
              <button
                type="submit"
                class="btn-ledger-primary"
                :disabled="!hasPasswordInput || isChangingPassword"
              >
                <span
                  v-if="isChangingPassword"
                  class="spinner-border spinner-border-sm"
                  aria-hidden="true"
                ></span>
                <span>{{ $t('profile.updatePassword') }}</span>
              </button>
            </div>
          </div>
        </form>

        <!-- SECTION 3: Device Sessions -->
        <div class="ledger-band ledger-band--sessions">
          <div class="sessions-row">
            <div class="sessions-copy">
              <h2 class="band-title band-title--compact">{{ $t('profile.sessionsHeading') }}</h2>
              <p class="band-desc band-desc--flush">{{ $t('profile.sessionsDesc') }}</p>
            </div>

            <button
              type="button"
              class="btn-ledger-danger"
              :disabled="isLoggingOutAll"
              @click="openLogoutAllModal"
            >
              <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
              <span>{{ $t('profile.signOutEverywhere') }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- Sign Out Everywhere Confirmation Dialog -->
    <Teleport to="body">
      <div
        v-if="showLogoutAllModal"
        class="confirm-backdrop"
        role="presentation"
        @click.self="closeLogoutAllModal"
      >
        <div
          class="confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-all-title"
          aria-describedby="signout-all-desc"
        >
          <div class="confirm-body">
            <div class="confirm-icon" aria-hidden="true">
              <i class="bi bi-box-arrow-right"></i>
            </div>
            <div>
              <h3 id="signout-all-title" class="confirm-title">
                {{ $t('profile.signOutModalTitle') }}
              </h3>
              <p id="signout-all-desc" class="confirm-desc">
                {{ $t('profile.signOutModalDesc') }}
              </p>
            </div>
          </div>

          <div class="confirm-actions">
            <button
              type="button"
              class="btn-ledger-secondary"
              :disabled="isLoggingOutAll"
              @click="closeLogoutAllModal"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn-ledger-danger-solid"
              :disabled="isLoggingOutAll"
              @click="handleLogoutAllDevices"
            >
              <span
                v-if="isLoggingOutAll"
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
              ></span>
              <span>{{ $t('profile.signOutEverywhere') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.profile-workspace {
  max-width: 1060px;
  width: 100%;
  min-width: 0;
}

.profile-grid {
  display: grid;
  grid-template-columns: 296px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

/* ==========================================================================
   LEFT COLUMN: Staff Credential & Account Facts
   ========================================================================== */
.staff-dossier {
  min-width: 0;
  background-color: var(--docket-paper, #ffffff);
  border: 1px solid var(--ledger-line, #dce6e0);
  border-radius: 12px;
  overflow: hidden;
  position: sticky;
  top: 1.25rem;
}

.dossier-identity {
  padding: 1.35rem 1.35rem 1.15rem;
}

.dossier-head-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.dossier-monogram {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background-color: var(--botanical-primary, #2d5a43);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

.dossier-title-group {
  min-width: 0;
  flex: 1;
}

.dossier-name {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--roast-ink, #1a2820);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dossier-role {
  margin-top: 0.2rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--botanical-primary, #2d5a43);
  line-height: 1.3;
}

.dossier-email {
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ledger-hairline, #edf3ef);
  font-size: 0.8125rem;
  color: var(--sage-muted, #5a6f62);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dossier-facts {
  margin: 0;
  padding: 0.25rem 1.35rem 0.5rem;
  border-top: 1px solid var(--ledger-hairline, #edf3ef);
  background-color: #fafcfb;
}

.dossier-fact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.68rem 0;
  border-bottom: 1px solid #eef3f0;
}

.dossier-fact-row:last-child {
  border-bottom: none;
}

.fact-label {
  font-size: 0.78125rem;
  font-weight: 500;
  color: var(--sage-muted, #5a6f62);
  flex-shrink: 0;
}

.fact-value {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--roast-ink, #1a2820);
  text-align: right;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.status-indicator__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.status-indicator.is-active {
  color: var(--emerald-ok, #1e6b43);
}

.status-indicator.is-inactive {
  color: var(--sage-muted, #5a6f62);
}

.shift-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 5px;
  padding: 0.1rem 0.2rem;
  margin-right: -0.2rem;
  transition: opacity 0.15s ease;
}

.shift-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.shift-link:focus-visible {
  outline: 2px solid var(--botanical-primary, #2d5a43);
  outline-offset: 2px;
}

.shift-link__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.shift-link__chevron {
  font-size: 0.6875rem;
  opacity: 0.65;
}

.shift-link.is-open {
  color: var(--emerald-ok, #1e6b43);
}

.shift-link.is-closed {
  color: var(--sage-muted, #5a6f62);
}

/* ==========================================================================
   RIGHT COLUMN: Unified Ledger Sheet
   ========================================================================== */
.profile-ledger {
  min-width: 0;
  background-color: var(--docket-paper, #ffffff);
  border: 1px solid var(--ledger-line, #dce6e0);
  border-radius: 12px;
  overflow: hidden;
}

.ledger-band {
  padding: 1.2rem 1.5rem;
}

.ledger-band--divided {
  border-top: 1px solid var(--ledger-hairline, #edf3ef);
}

.ledger-band--sessions {
  padding: 1.05rem 1.5rem;
  border-top: 1px solid var(--ledger-hairline, #edf3ef);
  background-color: #fafcfb;
}

.band-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.95rem;
}

.band-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--roast-ink, #1a2820);
  line-height: 1.3;
}

.band-title--compact {
  font-size: 0.875rem;
}

.band-desc {
  margin: 0.22rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--sage-muted, #5a6f62);
  max-width: 58ch;
}

.band-desc--flush {
  margin-top: 0.18rem;
}

.unsaved-flag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--amber-warn, #b45309);
  white-space: nowrap;
  padding-top: 0.12rem;
}

/* ==========================================================================
   Form Fields & Controls
   ========================================================================== */
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.95rem 1rem;
}

.password-stack {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.field-item {
  min-width: 0;
}

.field-label {
  display: block;
  margin-bottom: 0.38rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--roast-ink, #1a2820);
  line-height: 1.3;
}

.field-required {
  color: var(--crimson-debit, #b91c1c);
  margin-left: 0.15rem;
}

.input-shell {
  position: relative;
  display: flex;
  align-items: center;
}

.ledger-input {
  width: 100%;
  height: 40px;
  padding: 0 0.8rem;
  border-radius: 8px;
  border: 1.5px solid var(--ledger-line, #dce6e0);
  background-color: #ffffff;
  color: var(--roast-ink, #1a2820);
  font-size: 0.84375rem;
  font-weight: 500;
  line-height: 1.4;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.ledger-input::placeholder {
  color: #8b9a90;
  font-weight: 400;
}

.ledger-input:hover:not(:disabled):not(:focus) {
  border-color: #c2d1c7;
}

.ledger-input:focus {
  outline: none;
  border-color: var(--botanical-primary, #2d5a43);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.1);
}

.ledger-input.is-invalid {
  border-color: var(--crimson-debit, #b91c1c);
}

.ledger-input.is-invalid:focus {
  box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
}

.ledger-input:disabled {
  background-color: #f4f8f5;
  border-color: #e4ece7;
  color: var(--sage-muted, #5a6f62);
  cursor: not-allowed;
}

.ledger-input--with-icon {
  padding-right: 2.3rem;
}

.ledger-input--with-toggle {
  padding-right: 2.5rem;
}

.input-end-icon {
  position: absolute;
  right: 0.8rem;
  font-size: 0.85rem;
  color: #8b9a90;
  pointer-events: none;
}

.btn-eye-toggle {
  position: absolute;
  right: 0.35rem;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sage-muted, #5a6f62);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    color 0.14s ease;
}

.btn-eye-toggle:hover {
  background-color: #f0f5f2;
  color: var(--roast-ink, #1a2820);
}

.btn-eye-toggle:focus-visible {
  outline: 2px solid var(--botanical-primary, #2d5a43);
  outline-offset: 1px;
}

.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted, #6c7f74);
  line-height: 1.35;
}

.field-error {
  margin: 0.35rem 0 0;
  font-size: 0.78125rem;
  font-weight: 500;
  color: var(--crimson-debit, #b91c1c);
  line-height: 1.35;
}

/* ==========================================================================
   Section Footers, Password Checks & Action Buttons
   ========================================================================== */
.band-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.9rem;
}

.band-footer--split {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}

.password-rules {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem 1rem;
}

.password-rule {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted, #6c7f74);
  transition: color 0.15s ease;
}

.password-rule i {
  font-size: 0.72rem;
}

.password-rule.is-met {
  color: var(--emerald-ok, #1e6b43);
  font-weight: 600;
}

.footer-btn-group {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.btn-ledger-primary,
.btn-ledger-secondary,
.btn-ledger-danger,
.btn-ledger-danger-solid {
  height: 36px;
  padding: 0 0.95rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.btn-ledger-primary:focus-visible,
.btn-ledger-secondary:focus-visible,
.btn-ledger-danger:focus-visible,
.btn-ledger-danger-solid:focus-visible {
  outline: 2px solid var(--botanical-primary, #2d5a43);
  outline-offset: 2px;
}

.btn-ledger-primary {
  border: 1px solid var(--botanical-primary, #2d5a43);
  background-color: var(--botanical-primary, #2d5a43);
  color: #ffffff;
}

.btn-ledger-primary:hover:not(:disabled) {
  background-color: var(--botanical-deep, #1e3f2f);
  border-color: var(--botanical-deep, #1e3f2f);
}

.btn-ledger-primary:disabled {
  border-color: #e2e8e4;
  background-color: #f2f5f3;
  color: #8b9a90;
  cursor: not-allowed;
}

.btn-ledger-secondary {
  border: 1px solid var(--ledger-line, #dce6e0);
  background-color: #ffffff;
  color: var(--roast-ink, #1a2820);
}

.btn-ledger-secondary:hover:not(:disabled) {
  background-color: #f4f8f5;
  border-color: #b8ccc0;
}

.btn-ledger-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-ledger-danger {
  border: 1px solid #f1c4c4;
  background-color: #ffffff;
  color: var(--crimson-debit, #b91c1c);
  flex-shrink: 0;
}

.btn-ledger-danger:hover:not(:disabled) {
  background-color: #fef2f2;
  border-color: #e6a3a3;
}

.btn-ledger-danger:focus-visible {
  outline-color: var(--crimson-debit, #b91c1c);
}

.btn-ledger-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-ledger-danger-solid {
  border: 1px solid #dc2626;
  background-color: #dc2626;
  color: #ffffff;
}

.btn-ledger-danger-solid:hover:not(:disabled) {
  background-color: #b91c1c;
  border-color: #b91c1c;
}

.btn-ledger-danger-solid:focus-visible {
  outline-color: #dc2626;
}

.btn-ledger-danger-solid:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ==========================================================================
   Sessions Row
   ========================================================================== */
.sessions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem 1.25rem;
}

.sessions-copy {
  flex: 1 1 200px;
  min-width: 0;
}

/* ==========================================================================
   Confirmation Dialog (Matches AppLayout Logout Modal)
   ========================================================================== */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(18, 28, 22, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1080;
}

.confirm-dialog {
  width: 100%;
  max-width: 410px;
  background-color: #ffffff;
  border: 1px solid var(--ledger-line, #dce6e0);
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 20px 45px rgba(15, 28, 21, 0.16);
}

.confirm-body {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  margin-bottom: 1.1rem;
}

.confirm-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.confirm-title {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--roast-ink, #1a2820);
}

.confirm-desc {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--sage-muted, #5a6f62);
}

.confirm-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--ledger-hairline, #edf3ef);
}

/* ==========================================================================
   Responsive & Accessibility
   ========================================================================== */
@media (max-width: 991.98px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  .staff-dossier {
    position: static;
  }
}

@media (max-width: 639.98px) {
  .staff-dossier,
  .profile-ledger {
    border-radius: 16px;
  }

  .ledger-band,
  .ledger-band--sessions {
    padding: 1.05rem 1rem;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .band-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .band-footer > button {
    width: 100%;
    height: 42px;
    border-radius: 10px;
  }

  .footer-btn-group {
    width: 100%;
    display: flex;
    gap: 0.5rem;
  }

  .footer-btn-group > button {
    flex: 1;
    height: 42px;
    border-radius: 10px;
  }

  .btn-ledger-danger {
    width: 100%;
    height: 42px;
    border-radius: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ledger-input,
  .btn-eye-toggle,
  .btn-ledger-primary,
  .btn-ledger-secondary,
  .btn-ledger-danger,
  .btn-ledger-danger-solid,
  .shift-link,
  .password-rule {
    transition: none;
  }
}
</style>
