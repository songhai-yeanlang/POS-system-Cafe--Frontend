<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const appStore = useAppStore()
const toast = useToast()

const fileInputRef = ref(null)
const isSaving = ref(false)
const isUploadingLogo = ref(false)
const isDeletingLogo = ref(false)

const errors = reactive({
  shop_name: '',
  phone: '',
  address: '',
  exchange_rate: '',
  receipt_footer: '',
})

const form = reactive({
  shop_name: '',
  phone: '',
  address: '',
  exchange_rate: 4100,
  receipt_width: '80',
  receipt_footer: '',
})

const syncFormFromStore = () => {
  const s = appStore.settings
  form.shop_name = s.shop_name || ''
  form.phone = s.phone || ''
  form.address = s.address || ''
  form.exchange_rate = Number(s.exchange_rate) || 4100
  form.receipt_width = s.receipt_width === '58' ? '58' : '80'
  form.receipt_footer = s.receipt_footer || ''
}

onMounted(async () => {
  await appStore.fetchSettings()
  syncFormFromStore()
})

const clearErrors = () => {
  errors.shop_name = ''
  errors.phone = ''
  errors.address = ''
  errors.exchange_rate = ''
  errors.receipt_footer = ''
}

const isDirty = computed(() => {
  const s = appStore.settings
  return (
    form.shop_name.trim() !== (s.shop_name || '') ||
    (form.phone || '').trim() !== (s.phone || '') ||
    (form.address || '').trim() !== (s.address || '') ||
    Number(form.exchange_rate) !== Number(s.exchange_rate || 4100) ||
    form.receipt_width !== (s.receipt_width || '80') ||
    (form.receipt_footer || '').trim() !== (s.receipt_footer || '')
  )
})

const validateForm = () => {
  clearErrors()
  let valid = true

  const cleanName = form.shop_name.trim()
  if (!cleanName) {
    errors.shop_name = 'Shop name is required'
    valid = false
  } else if (cleanName.length > 150) {
    errors.shop_name = 'Shop name cannot exceed 150 characters'
    valid = false
  }

  if (form.phone && form.phone.trim().length > 30) {
    errors.phone = 'Phone cannot exceed 30 characters'
    valid = false
  }

  if (form.address && form.address.trim().length > 500) {
    errors.address = 'Address cannot exceed 500 characters'
    valid = false
  }

  const rate = Number(form.exchange_rate)
  if (!rate || isNaN(rate) || rate <= 0) {
    errors.exchange_rate = 'Exchange rate must be greater than 0'
    valid = false
  }

  if (form.receipt_footer && form.receipt_footer.trim().length > 500) {
    errors.receipt_footer = 'Receipt footer cannot exceed 500 characters'
    valid = false
  }

  return valid
}

const handleSaveSettings = async () => {
  if (!validateForm()) return

  isSaving.value = true
  try {
    const payload = {
      shop_name: form.shop_name.trim(),
      phone: form.phone?.trim() ? form.phone.trim() : null,
      address: form.address?.trim() ? form.address.trim() : null,
      exchange_rate: Number(form.exchange_rate),
      receipt_width: form.receipt_width,
      receipt_footer: form.receipt_footer?.trim() ? form.receipt_footer.trim() : null,
    }

    const res = await appStore.updateSettings(payload)
    syncFormFromStore()
    toast.success(res.message || 'Settings saved successfully.')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Failed to save settings.')
  } finally {
    isSaving.value = false
  }
}

const handleResetForm = () => {
  clearErrors()
  syncFormFromStore()
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
</script>

<template>
  <div class="settings-wrapper mx-auto">
    <form class="settings-card bg-white p-4 p-md-5" @submit.prevent="handleSaveSettings">
      <!-- Header -->
      <div class="mb-4 pb-3 border-bottom">
        <h4 class="title-text fw-semibold mb-1">Shop Settings</h4>
        <p class="subtitle-text mb-0">
          Basic shop information, exchange rate, and receipt format.
        </p>
      </div>

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
              v-model="form.shop_name"
              label="Shop name"
              placeholder="e.g. BrewPOS Coffee"
              :error="errors.shop_name"
              required
            />
          </div>

          <div class="col-12 col-md-5">
            <BaseInput
              v-model="form.phone"
              label="Phone number"
              placeholder="e.g. 012 345 678"
              :error="errors.phone"
            />
          </div>
        </div>

        <BaseInput
          v-model="form.address"
          label="Address"
          placeholder="e.g. #123, Street 2004, Phnom Penh"
          :error="errors.address"
        />
      </div>

      <!-- 3. Currency & Receipt -->
      <div class="mb-4">
        <div class="row g-3 align-items-start">
          <div class="col-12 col-md-6">
            <BaseInput
              v-model="form.exchange_rate"
              type="number"
              label="Exchange rate (1 USD to KHR)"
              placeholder="4100"
              :error="errors.exchange_rate"
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
                :class="{ active: form.receipt_width === '80' }"
                @click="form.receipt_width = '80'"
              >
                80mm (Standard)
              </button>
              <button
                type="button"
                class="size-btn flex-grow-1"
                :class="{ active: form.receipt_width === '58' }"
                @click="form.receipt_width = '58'"
              >
                58mm (Small)
              </button>
            </div>
          </div>
        </div>

        <BaseInput
          v-model="form.receipt_footer"
          label="Receipt footer note"
          placeholder="e.g. Thank you for visiting! Wi-Fi: Coffee123"
          :error="errors.receipt_footer"
        />
      </div>

      <!-- Footer Actions -->
      <div class="d-flex justify-content-end gap-2 pt-3 border-top">
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="!isDirty || isSaving"
          @click="handleResetForm"
        >
          Cancel
        </BaseButton>
        <BaseButton
          type="submit"
          variant="primary"
          :loading="isSaving"
          :disabled="!isDirty"
        >
          Save Changes
        </BaseButton>
      </div>
    </form>
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

.title-text {
  font-size: 20px;
  color: var(--on-surface, #1c1b1b);
  letter-spacing: -0.02em;
}

.subtitle-text {
  font-size: 13px;
  color: var(--on-surface-variant, #504440);
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
</style>
