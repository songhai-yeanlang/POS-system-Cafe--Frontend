<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import { useCurrency } from '@/composables/useCurrency'
import { useI18n } from '@/i18n'
import BaseButton from '@/components/base/BaseButton.vue'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()
const { t } = useI18n()

const isOwner = computed(() => authStore.isOwner)

// ================= STATE =================
const discountCodes = ref([])
const isLoading = ref(false)
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
})

// Segmented Tab & Filters
const statusTab = ref('ALL') // 'ALL' | 'VALID' | 'INACTIVE'
const searchQuery = ref('')
const debouncedSearch = useDebounce(searchQuery, 300)
const selectedType = ref('')

// ================= HELPERS =================
const formatShortDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatDisplayDate = (val) => {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const getValiditySubtext = (item) => {
  if (!item.expires_at) {
    return item.is_not_started ? t('discountCodes.statusScheduled') : t('discountCodes.noExpiry')
  }
  if (item.is_expired) return t('discountCodes.statusExpired')
  if (item.is_not_started) return t('discountCodes.statusScheduled')
  const now = new Date()
  const exp = new Date(item.expires_at)
  if (isNaN(exp.getTime())) return t('discountCodes.noExpiry')
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expStart = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate())
  const diffDays = Math.round((expStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return t('discountCodes.endsToday')
  return t('discountCodes.daysLeft', { days: diffDays })
}

const getStatusInfo = (item) => {
  if (!item.is_active) {
    return { key: 'inactive', label: t('discountCodes.statusInactive') }
  }
  if (item.is_expired) {
    return { key: 'expired', label: t('discountCodes.statusExpired') }
  }
  if (item.is_exhausted) {
    return { key: 'exhausted', label: t('discountCodes.statusExhausted') }
  }
  if (item.is_not_started) {
    return { key: 'scheduled', label: t('discountCodes.statusScheduled') }
  }
  return { key: 'valid', label: t('discountCodes.statusValid') }
}

const getUsagePercent = (item) => {
  if (!item.max_uses || item.max_uses <= 0) return 0
  return Math.min(100, Math.round((Number(item.used_count || 0) / Number(item.max_uses)) * 100))
}

const copyPromoCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    toast.success(t('discountCodes.codeCopied', { code }))
  } catch {
    toast.info(code)
  }
}

// ================= FETCH =================
const fetchDiscountCodes = async (page = 1) => {
  isLoading.value = true
  try {
    const params = {
      page,
      limit: pagination.limit,
    }
    if (debouncedSearch.value?.trim()) params.search = debouncedSearch.value.trim()
    if (selectedType.value) params.discount_type = selectedType.value
    if (statusTab.value === 'VALID') {
      params.valid_only = true
    } else if (statusTab.value === 'INACTIVE') {
      params.is_active = false
    }

    const res = await api.get('/discount-codes', { params })
    discountCodes.value = res.data?.data || []
    if (res.data?.pagination) {
      pagination.page = res.data.pagination.page || page
      pagination.limit = res.data.pagination.limit || pagination.limit
      pagination.total = res.data.pagination.total ?? discountCodes.value.length
      pagination.totalPages = res.data.pagination.totalPages || 1
    }
  } catch (err) {
    toast.error(err.response?.data?.message || t('discountCodes.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

const setStatusTab = (tab) => {
  statusTab.value = tab
}

watch([debouncedSearch, selectedType, statusTab], () => {
  fetchDiscountCodes(1)
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedType.value = ''
  statusTab.value = 'ALL'
}

onMounted(() => {
  fetchDiscountCodes(1)
})

// ================= CREATE / EDIT MODAL =================
const showFormModal = ref(false)
const isSaving = ref(false)
const editingId = ref(null)
const editingUsedCount = ref(0)

const form = reactive({
  code: '',
  name: '',
  description: '',
  discount_type: 'PERCENT',
  discount_value: '',
  max_uses: '',
  starts_at: '',
  expires_at: '',
  is_active: true,
})

const formErrors = reactive({
  code: '',
  name: '',
  discount_value: '',
  max_uses: '',
  dates: '',
})

const clearFormErrors = () => {
  formErrors.code = ''
  formErrors.name = ''
  formErrors.discount_value = ''
  formErrors.max_uses = ''
  formErrors.dates = ''
}

const openCreateModal = () => {
  editingId.value = null
  editingUsedCount.value = 0
  form.code = ''
  form.name = ''
  form.description = ''
  form.discount_type = 'PERCENT'
  form.discount_value = ''
  form.max_uses = ''
  form.starts_at = ''
  form.expires_at = ''
  form.is_active = true
  clearFormErrors()
  showFormModal.value = true
}

const openEditModal = (item) => {
  editingId.value = item.id
  editingUsedCount.value = Number(item.used_count || 0)
  form.code = item.code || ''
  form.name = item.name || ''
  form.description = item.description || ''
  form.discount_type = item.discount_type || 'PERCENT'
  form.discount_value = Number(item.discount_value)
  form.max_uses = item.max_uses !== null && item.max_uses !== undefined ? String(item.max_uses) : ''
  form.starts_at = formatShortDate(item.starts_at)
  form.expires_at = formatShortDate(item.expires_at)
  form.is_active = Boolean(item.is_active)
  clearFormErrors()
  showFormModal.value = true
}

const closeFormModal = () => {
  if (isSaving.value) return
  showFormModal.value = false
}

const onCodeInput = (e) => {
  form.code = String(e.target.value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
}

const parseMaxUsesInput = () => {
  if (form.max_uses === '' || form.max_uses === null || form.max_uses === undefined) {
    return null
  }
  const trimmed = String(form.max_uses).trim()
  if (trimmed === '') return null
  return Number(trimmed)
}

const validateForm = () => {
  clearFormErrors()
  let valid = true

  const cleanCode = form.code.trim().toUpperCase()
  if (cleanCode.length < 2) {
    formErrors.code = t('discountCodes.validationCodeMin')
    valid = false
  } else if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
    formErrors.code = t('discountCodes.validationCodePattern')
    valid = false
  }

  if (!form.name.trim()) {
    formErrors.name = t('discountCodes.validationNameRequired')
    valid = false
  }

  const val = Number(form.discount_value)
  if (!val || isNaN(val) || val <= 0) {
    formErrors.discount_value = t('discountCodes.validationValuePositive')
    valid = false
  } else if (form.discount_type === 'PERCENT' && val > 100) {
    formErrors.discount_value = t('discountCodes.validationPercentMax')
    valid = false
  }

  const parsedMaxUses = parseMaxUsesInput()
  if (parsedMaxUses !== null) {
    if (!Number.isInteger(parsedMaxUses) || parsedMaxUses < 1) {
      formErrors.max_uses = t('discountCodes.validationMaxUsesInteger')
      valid = false
    } else if (editingId.value && editingUsedCount.value > 0 && parsedMaxUses < editingUsedCount.value) {
      formErrors.max_uses = t('discountCodes.validationMaxUsesBelowUsed', {
        used: editingUsedCount.value,
      })
      valid = false
    }
  }

  if (form.starts_at && form.expires_at && form.expires_at < form.starts_at) {
    formErrors.dates = t('discountCodes.validationDatesOrder')
    valid = false
  }

  return valid
}

const handleSave = async () => {
  if (!validateForm()) return

  isSaving.value = true
  try {
    const parsedMaxUses = parseMaxUsesInput()
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
      discount_type: form.discount_type,
      discount_value: Number(Number(form.discount_value).toFixed(2)),
      min_order_amount: 0,
      max_uses: parsedMaxUses,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: Boolean(form.is_active),
    }

    if (editingId.value) {
      await api.put(`/discount-codes/${editingId.value}`, payload)
      toast.success(t('discountCodes.updatedSuccess', { code: payload.code }))
    } else {
      await api.post('/discount-codes', payload)
      toast.success(t('discountCodes.createdSuccess', { code: payload.code }))
    }

    isSaving.value = false
    showFormModal.value = false
    await fetchDiscountCodes(editingId.value ? pagination.page : 1)
  } catch (err) {
    toast.error(
      err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        t('discountCodes.saveFailed')
    )
  } finally {
    isSaving.value = false
  }
}

// Quick toggle active status
const togglingId = ref(null)
const handleToggleActive = async (item, event) => {
  if (!isOwner.value || togglingId.value) return
  togglingId.value = item.id
  const nextActive = !item.is_active
  try {
    await api.put(`/discount-codes/${item.id}`, { is_active: nextActive })
    toast.success(
      t(nextActive ? 'discountCodes.activatedSuccess' : 'discountCodes.deactivatedSuccess', {
        code: item.code,
      })
    )
    await fetchDiscountCodes(pagination.page)
  } catch (err) {
    if (event?.target) {
      event.target.checked = Boolean(item.is_active)
    }
    toast.error(err.response?.data?.message || t('discountCodes.statusUpdateFailed'))
  } finally {
    togglingId.value = null
  }
}

// ================= DELETE MODAL =================
const deleteModal = reactive({
  show: false,
  id: null,
  code: '',
  isDeleting: false,
})

const confirmDelete = (item) => {
  if (item.used_count > 0) {
    toast.warning(t('discountCodes.cannotDeleteUsed'))
    return
  }
  deleteModal.id = item.id
  deleteModal.code = item.code
  deleteModal.show = true
}

const handleConfirmDelete = async () => {
  if (!deleteModal.id || deleteModal.isDeleting) return
  deleteModal.isDeleting = true
  try {
    await api.delete(`/discount-codes/${deleteModal.id}`)
    toast.success(t('discountCodes.deletedSuccess', { code: deleteModal.code }))
    deleteModal.show = false
    await fetchDiscountCodes(1)
  } catch (err) {
    toast.error(err.response?.data?.message || t('discountCodes.deleteFailed'))
  } finally {
    deleteModal.isDeleting = false
  }
}
</script>

<template>
  <div class="discounts-page">
    <!-- Top Segmented Tabs & Primary Action (Matches Products / Expenses / Orders) -->
    <div class="discounts-top-bar">
      <div class="discounts-segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: statusTab === 'ALL' }"
          @click="setStatusTab('ALL')"
        >
          <i class="bi bi-ticket-perforated"></i>
          <span>{{ $t('discountCodes.tabAll') }}</span>
          <span v-if="statusTab === 'ALL'" class="seg-tab-count tabular">
            {{ pagination.total }}
          </span>
        </button>

        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: statusTab === 'VALID' }"
          @click="setStatusTab('VALID')"
        >
          <span class="seg-tab-dot is-valid"></span>
          <span>{{ $t('discountCodes.tabValid') }}</span>
          <span v-if="statusTab === 'VALID'" class="seg-tab-count tabular">
            {{ pagination.total }}
          </span>
        </button>

        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: statusTab === 'INACTIVE' }"
          @click="setStatusTab('INACTIVE')"
        >
          <span class="seg-tab-dot is-inactive"></span>
          <span>{{ $t('discountCodes.tabInactive') }}</span>
          <span v-if="statusTab === 'INACTIVE'" class="seg-tab-count tabular">
            {{ pagination.total }}
          </span>
        </button>
      </div>

      <div v-if="isOwner" class="discounts-top-bar__right">
        <button type="button" class="btn-primary-action" @click="openCreateModal">
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('discountCodes.addCode') }}</span>
        </button>
      </div>
    </div>

    <!-- Main Ledger Card -->
    <div class="clean-card">
      <!-- Clean Filter Toolbar -->
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('discountCodes.searchPlaceholder')"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear"
              @click="searchQuery = ''"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <select v-model="selectedType" class="filter-input filter-select">
            <option value="">{{ $t('common.allTypes') }}</option>
            <option value="PERCENT">{{ $t('pos.percent') }}</option>
            <option value="FIXED">{{ $t('pos.fixed') }}</option>
          </select>
        </div>

        <div class="filter-bar__right">
          <button
            v-if="searchQuery || selectedType || statusTab !== 'ALL'"
            type="button"
            class="toolbar-btn"
            @click="clearFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.reset') }}</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('discountCodes.loading') }}</div>
      </div>

      <!-- Empty -->
      <div v-else-if="discountCodes.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-ticket-perforated"></i>
        </div>
        <div class="empty-box__title">{{ $t('discountCodes.emptyTitle') }}</div>
        <div class="empty-box__desc">{{ $t('discountCodes.emptyDesc') }}</div>
        <button
          v-if="isOwner && statusTab === 'ALL' && !searchQuery && !selectedType"
          type="button"
          class="btn-primary-action mt-3"
          @click="openCreateModal"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('discountCodes.createFirst') }}</span>
        </button>
      </div>

      <!-- Data Table -->
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table mobile-card-table">
          <thead>
            <tr>
              <th>{{ $t('discountCodes.colCodeName') }}</th>
              <th>{{ $t('discountCodes.colDiscount') }}</th>
              <th>{{ $t('discountCodes.colUsage') }}</th>
              <th>{{ $t('discountCodes.colValidity') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th v-if="isOwner" class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in discountCodes"
              :key="item.id"
              :class="{ 'row-muted': !item.is_active || item.is_expired || item.is_exhausted }"
            >
              <!-- 1. Code & Promotion Name -->
              <td>
                <div class="promo-identity">
                  <div class="promo-icon">
                    <i class="bi bi-ticket-perforated"></i>
                  </div>
                  <div class="promo-identity__body">
                    <div class="promo-identity__top">
                      <button
                        type="button"
                        class="code-tag tabular"
                        :title="$t('discountCodes.copyCode')"
                        @click="copyPromoCode(item.code)"
                      >
                        <span>{{ item.code }}</span>
                        <i class="bi bi-copy"></i>
                      </button>
                    </div>
                    <div class="promo-identity__name">{{ item.name }}</div>
                    <div v-if="item.description" class="promo-identity__desc text-truncate">
                      {{ item.description }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- 2. Discount Value -->
              <td :data-label="$t('discountCodes.colDiscount')">
                <div class="value-cell tabular">
                  <div class="value-cell__main">
                    <strong class="value-cell__amount">
                      -{{
                        item.discount_type === 'PERCENT'
                          ? `${item.discount_value}%`
                          : formatUsd(item.discount_value)
                      }}
                    </strong>
                    <span class="value-cell__type">
                      {{
                        item.discount_type === 'PERCENT'
                          ? $t('discountCodes.typePercentShort')
                          : $t('discountCodes.typeFixedShort')
                      }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- 3. Usage -->
              <td :data-label="$t('discountCodes.colUsage')">
                <div class="usage-cell tabular">
                  <template v-if="item.max_uses !== null">
                    <div class="usage-cell__count">
                      <strong>{{ item.used_count }}</strong>
                      <span class="text-muted"> / {{ item.max_uses }}</span>
                    </div>
                    <div class="usage-track">
                      <div
                        class="usage-track__fill"
                        :class="{ 'is-full': item.is_exhausted }"
                        :style="{ width: `${getUsagePercent(item)}%` }"
                      ></div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="usage-cell__count">
                      {{ $t('discountCodes.usedTimes', { count: item.used_count }) }}
                    </div>
                    <div class="cell-sub">{{ $t('discountCodes.unlimited') }}</div>
                  </template>
                </div>
              </td>

              <!-- 4. Validity Period -->
              <td :data-label="$t('discountCodes.colValidity')">
                <div class="validity-cell tabular">
                  <div v-if="item.starts_at || item.expires_at" class="validity-range">
                    <span>{{ item.starts_at ? formatDisplayDate(item.starts_at) : '—' }}</span>
                    <i class="bi bi-arrow-right validity-arrow"></i>
                    <span>{{ item.expires_at ? formatDisplayDate(item.expires_at) : '—' }}</span>
                  </div>
                  <div
                    class="cell-sub"
                    :class="{ 'text-danger fw-semibold': item.is_expired }"
                  >
                    {{ getValiditySubtext(item) }}
                  </div>
                </div>
              </td>

              <!-- 5. Status -->
              <td :data-label="$t('common.status')">
                <span class="status-text" :class="`is-${getStatusInfo(item).key}`">
                  <span class="status-dot"></span>
                  <span>{{ getStatusInfo(item).label }}</span>
                </span>
              </td>

              <!-- 6. Actions (Owner Only) -->
              <td v-if="isOwner" class="text-end mobile-card-actions">
                <div class="action-group">
                  <label
                    class="switch-control"
                    :title="item.is_active ? $t('discountCodes.toggleOn') : $t('discountCodes.toggleOff')"
                  >
                    <input
                      type="checkbox"
                      :checked="item.is_active"
                      :disabled="togglingId === item.id"
                      @change="handleToggleActive(item, $event)"
                    />
                    <span class="switch-slider"></span>
                  </label>

                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.edit')"
                    @click="openEditModal(item)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    type="button"
                    class="btn-action-icon is-danger"
                    :class="{ 'is-muted': item.used_count > 0 }"
                    :title="
                      item.used_count > 0
                        ? $t('discountCodes.cannotDeleteUsed')
                        : $t('common.delete')
                    "
                    @click="confirmDelete(item)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="pagination.totalPages > 1" class="pagination-bar">
        <span class="pagination-info tabular">
          {{ $t('common.pageOf', { page: pagination.page, total: pagination.totalPages }) }}
        </span>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page <= 1"
            @click="fetchDiscountCodes(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.previous') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchDiscountCodes(pagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CREATE / EDIT DISCOUNT CODE       -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="showFormModal"
        class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
        @click.self="closeFormModal"
      >
        <div class="modal-card modal-card--md bg-white px-4 py-3">
          <div class="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0" style="font-size: 1.05rem">
              {{ editingId ? $t('discountCodes.editCode') : $t('discountCodes.newCode') }}
            </h5>
            <button type="button" class="btn-close btn-sm" @click="closeFormModal"></button>
          </div>

          <form @submit.prevent="handleSave">
            <!-- Section 1: Code & Discount Amount -->
            <div class="form-section mb-2">
              <div class="form-section__title">{{ $t('discountCodes.sectionBasic') }}</div>

              <div class="row g-2 mb-2">
                <div class="col-12 col-sm-5">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.codeLabel') }} <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="form.code"
                    type="text"
                    class="form-control clean-input text-uppercase fw-bold tabular"
                    :placeholder="$t('discountCodes.codePlaceholder')"
                    maxlength="50"
                    required
                    @input="onCodeInput"
                  />
                  <div v-if="formErrors.code" class="text-danger small mt-1">{{ formErrors.code }}</div>
                </div>

                <div class="col-12 col-sm-7">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.nameLabel') }} <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    class="form-control clean-input"
                    :placeholder="$t('discountCodes.namePlaceholder')"
                    maxlength="150"
                    required
                  />
                  <div v-if="formErrors.name" class="text-danger small mt-1">{{ formErrors.name }}</div>
                </div>
              </div>

              <div class="row g-2">
                <div class="col-12 col-sm-6">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.discountTypeLabel') }} <span class="text-danger">*</span>
                  </label>
                  <div class="type-toggle">
                    <button
                      type="button"
                      class="type-toggle__btn"
                      :class="{ active: form.discount_type === 'PERCENT' }"
                      @click="form.discount_type = 'PERCENT'"
                    >
                      {{ $t('discountCodes.typePercentShort') }}
                    </button>
                    <button
                      type="button"
                      class="type-toggle__btn"
                      :class="{ active: form.discount_type === 'FIXED' }"
                      @click="form.discount_type = 'FIXED'"
                    >
                      {{ $t('discountCodes.typeFixedShort') }}
                    </button>
                  </div>
                </div>

                <div class="col-12 col-sm-6">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.discountValueLabel') }}
                    ({{ form.discount_type === 'PERCENT' ? '%' : '$' }})
                    <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model.number="form.discount_value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    :max="form.discount_type === 'PERCENT' ? 100 : undefined"
                    class="form-control clean-input tabular"
                    :placeholder="form.discount_type === 'PERCENT' ? '10' : '1.00'"
                    required
                  />
                  <div v-if="formErrors.discount_value" class="text-danger small mt-1">
                    {{ formErrors.discount_value }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 2: Usage Limit & Validity -->
            <div class="form-section mb-2">
              <div class="form-section__title">{{ $t('discountCodes.sectionRules') }}</div>

              <div class="row g-2 align-items-end">
                <div class="col-12 col-sm-4">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.maxUsesLabel') }}
                  </label>
                  <input
                    v-model="form.max_uses"
                    type="number"
                    :min="editingId && editingUsedCount > 0 ? editingUsedCount : 1"
                    step="1"
                    class="form-control clean-input tabular"
                    :placeholder="$t('discountCodes.unlimited')"
                  />
                </div>

                <div class="col-6 col-sm-4">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.startsAtLabel') }}
                  </label>
                  <input
                    v-model="form.starts_at"
                    type="date"
                    class="form-control clean-input tabular"
                  />
                </div>

                <div class="col-6 col-sm-4">
                  <label class="form-label mb-1 fw-medium small text-dark">
                    {{ $t('discountCodes.expiresAtLabel') }}
                  </label>
                  <input
                    v-model="form.expires_at"
                    type="date"
                    class="form-control clean-input tabular"
                  />
                </div>

                <div v-if="formErrors.max_uses" class="col-12 mt-1">
                  <div class="text-danger small">{{ formErrors.max_uses }}</div>
                </div>
                <div v-if="formErrors.dates" class="col-12 mt-1">
                  <div class="text-danger small">{{ formErrors.dates }}</div>
                </div>
                
              </div>
            </div>

            <div class="mb-2">
              <label class="form-label mb-1 fw-medium small text-dark">
                {{ $t('discountCodes.descriptionLabel') }}
              </label>
              <input
                v-model="form.description"
                type="text"
                class="form-control clean-input"
                :placeholder="$t('discountCodes.descriptionPlaceholder')"
                maxlength="500"
              />
            </div>

            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 mt-2 border-top">
              <div class="form-check mb-0">
                <input
                  id="codeActive"
                  v-model="form.is_active"
                  type="checkbox"
                  class="form-check-input custom-check"
                />
                <label for="codeActive" class="form-check-label small fw-medium">
                  {{ $t('discountCodes.activeCheck') }}
                </label>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <BaseButton type="button" variant="secondary" @click="closeFormModal">
                  {{ $t('common.cancel') }}
                </BaseButton>
                <BaseButton type="submit" variant="primary" :loading="isSaving">
                  {{ editingId ? $t('common.saveChanges') : $t('common.create') }}
                </BaseButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ========================================== -->
    <!-- MODAL 2: DELETE CONFIRMATION               -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="deleteModal.show"
        class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
        @click.self="!deleteModal.isDeleting && (deleteModal.show = false)"
      >
        <div class="modal-card bg-white p-4" style="max-width: 400px">
          <h5 class="fw-semibold mb-2 text-danger">{{ $t('discountCodes.deleteTitle') }}</h5>
          <p class="text-muted small mb-4">
            {{ $t('discountCodes.deleteDesc', { code: deleteModal.code }) }}
          </p>
          <div class="d-flex justify-content-end gap-2">
            <BaseButton
              type="button"
              variant="secondary"
              :disabled="deleteModal.isDeleting"
              @click="deleteModal.show = false"
            >
              {{ $t('common.cancel') }}
            </BaseButton>
            <BaseButton
              type="button"
              variant="danger"
              :loading="deleteModal.isDeleting"
              @click="handleConfirmDelete"
            >
              {{ $t('common.delete') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.discounts-page {
  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
}

/* ── Top Bar: Segmented Tabs & Primary Action ── */
.discounts-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.discounts-segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #e9f0ec;
  border: 1px solid var(--ledger-line);
  border-radius: 10px;
}

.seg-tab-dot.is-valid {
  background: #16a34a;
}

.seg-tab-dot.is-inactive {
  background: #94a39b;
}

.clean-table tbody tr.row-muted td {
  opacity: 0.68;
}

/* 1. Promo Identity */
.promo-identity {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.promo-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #eef6f1;
  border: 1px solid #d6e6dc;
  color: var(--botanical-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.promo-identity__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.code-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--botanical-deep);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: pointer;
}

.code-tag i {
  font-size: 0.72rem;
  color: #89a092;
  transition: color 0.14s ease;
}

.code-tag:hover {
  color: var(--botanical-primary);
}

.code-tag:hover i {
  color: var(--botanical-primary);
}

.promo-identity__name {
  font-size: 0.8rem;
  font-weight: 500;
  color: #465a4e;
}

.promo-identity__desc {
  font-size: 0.73rem;
  color: var(--sage-muted);
  max-width: 240px;
}

/* 2. Discount Value */
.value-cell__main {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.value-cell__amount {
  font-size: 0.96rem;
  font-weight: 800;
  color: var(--botanical-deep);
}

.value-cell__type {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.cell-sub {
  font-size: 0.74rem;
  color: var(--sage-muted);
  margin-top: 2px;
}

/* 3. Usage */
.usage-cell {
  min-width: 115px;
}

.usage-cell__count {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--roast-ink);
}

.usage-track {
  height: 5px;
  border-radius: 999px;
  background: #e6efe9;
  overflow: hidden;
  margin-top: 5px;
  max-width: 110px;
}

.usage-track__fill {
  height: 100%;
  background: var(--botanical-primary);
  border-radius: 999px;
}

.usage-track__fill.is-full {
  background: #dc2626;
}

/* 4. Validity */
.validity-range {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--roast-ink);
  white-space: nowrap;
}

.validity-arrow {
  font-size: 0.7rem;
  color: #8ca195;
}

/* 6. Actions & Clean Toggle Switch */
.switch-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  margin-right: 4px;
  cursor: pointer;
}

.switch-control input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: #cbd8d0;
  border-radius: 999px;
  transition: background 0.16s ease;
}

.switch-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  transition: transform 0.16s ease;
}

.switch-control input:checked + .switch-slider {
  background: var(--botanical-primary);
}

.switch-control input:checked + .switch-slider::before {
  transform: translateX(16px);
}

.switch-control input:disabled + .switch-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-action-icon.is-muted {
  opacity: 0.42;
}

.modal-card--md {
  max-width: 620px;
}

.form-section {
  background: #f9fcfa;
  border: 1px solid #e3ece6;
  border-radius: 11px;
  padding: 0.72rem 0.9rem;
}

.form-section__title {
  font-size: 0.73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #2d5a43;
  margin-bottom: 0.55rem;
}

.clean-input {
  height: 38px;
  border-radius: 8px;
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  color: #1b2820;
  font-size: 0.84rem;
}

.clean-input::placeholder {
  color: #a3b2a9;
  font-weight: 400;
  text-transform: none;
  opacity: 1;
}

.modal-card :deep(.form-control::placeholder) {
  color: #a3b2a9;
  font-weight: 400;
  opacity: 1;
}

.clean-input:focus {
  border-color: #3b7054;
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border-radius: 8px;
  border: 1.5px solid #dce6e0;
  background: #eef4f0;
  height: 38px;
}

.type-toggle__btn {
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 600;
  color: #465a4e;
  cursor: pointer;
  white-space: nowrap;
  padding: 0 0.45rem;
  transition: all 0.14s ease;
}

.type-toggle__btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.7);
  color: #193e2b;
}

.type-toggle__btn.active {
  background: #2d5a43;
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(25, 62, 43, 0.2);
}

.custom-check:checked {
  background-color: #2d5a43;
  border-color: #2d5a43;
}

@media (max-width: 767.98px) {
  .discounts-top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
    margin-bottom: 0.7rem;
  }

  .discounts-top-bar__right,
  .discounts-top-bar__right .btn-primary-action {
    width: 100%;
    justify-content: center;
    height: 42px;
    border-radius: 11px;
  }

  .usage-track {
    margin-left: auto;
  }
}
</style>
