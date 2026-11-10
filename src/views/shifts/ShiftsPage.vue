<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'
import { useI18n } from '@/i18n'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()
const { formatUsd, formatKhr } = useCurrency()
const { formatDateTime } = useFormatDate()
const { t } = useI18n()

const isOwner = computed(() => authStore.isOwner)

const getRoleLabel = (role) => {
  if (!role) return '—'
  if (role.toUpperCase() === 'OWNER') return t('common.owner')
  if (role.toUpperCase() === 'STAFF') return t('common.staff')
  return role
}

const resetHistoryFilters = () => {
  filterStatus.value = ''
  filterUserId.value = ''
  filterStartDate.value = ''
  filterEndDate.value = ''
}

// Current Shift State
const activeShift = ref(null)
const isLoadingCurrent = ref(false)

// Shifts History State
const shifts = ref([])
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })
const isLoadingHistory = ref(false)
const staffList = ref([])

// History Filters
const filterStatus = ref('')
const filterUserId = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')

// Open Shift Form
const openForm = reactive({
  opening_cash_usd: 0,
  opening_cash_khr: 0,
  note: '',
})
const isOpeningShift = ref(false)

// Fetch Current Active Shift
const loadCurrentShift = async () => {
  isLoadingCurrent.value = true
  try {
    const data = await appStore.fetchCurrentShift()
    activeShift.value = data
  } finally {
    isLoadingCurrent.value = false
  }
}

// Fetch Shifts History
const fetchShiftsHistory = async (page = 1) => {
  isLoadingHistory.value = true
  try {
    const params = {
      page,
      limit: pagination.value.limit,
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (isOwner.value && filterUserId.value) params.user_id = filterUserId.value
    if (filterStartDate.value) params.start_date = filterStartDate.value
    if (filterEndDate.value) params.end_date = filterEndDate.value

    const res = await api.get('/shifts', { params })
    shifts.value = res.data?.data || []
    if (res.data?.pagination) {
      pagination.value = res.data.pagination
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load shift history')
  } finally {
    isLoadingHistory.value = false
  }
}

const fetchStaffOptions = async () => {
  if (!isOwner.value) return
  try {
    const res = await api.get('/users', { params: { limit: 100 } })
    staffList.value = res.data?.data || []
  } catch {
    // Ignore
  }
}

watch([filterStatus, filterUserId, filterStartDate, filterEndDate], () => {
  fetchShiftsHistory(1)
})

onMounted(async () => {
  await Promise.all([loadCurrentShift(), fetchShiftsHistory(1), fetchStaffOptions()])
})

// Open Shift Action
const handleOpenShift = async () => {
  const usd = Number(openForm.opening_cash_usd)
  const khr = Number(openForm.opening_cash_khr)

  if (isNaN(usd) || usd < 0 || isNaN(khr) || khr < 0) {
    toast.error('Opening cash amounts cannot be negative.')
    return
  }

  isOpeningShift.value = true
  try {
    const res = await api.post('/shifts/open', {
      opening_cash_usd: Number(usd.toFixed(2)),
      opening_cash_khr: Math.round(khr),
      note: openForm.note?.trim() || null,
    })
    toast.success(res.data?.message || 'Shift opened successfully')
    openForm.opening_cash_usd = 0
    openForm.opening_cash_khr = 0
    openForm.note = ''
    await Promise.all([loadCurrentShift(), fetchShiftsHistory(1)])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to open shift')
  } finally {
    isOpeningShift.value = false
  }
}

// ==========================================
// CLOSE SHIFT MODAL
// ==========================================
const closeModal = reactive({
  show: false,
  shiftId: null,
  expectedUsd: 0,
  expectedKhr: 0,
  openOrdersCount: 0,
  closing_cash_usd: '',
  closing_cash_khr: '',
  note: '',
  isClosing: false,
})

const openCloseShiftModal = async (targetShift) => {
  try {
    const res = await api.get(`/shifts/${targetShift.id}`)
    const detail = res.data?.data || targetShift
    const expUsd = Number(detail.summary?.expected_drawer?.cash_usd || 0)
    const expKhr = Math.round(Number(detail.summary?.expected_drawer?.cash_khr || 0))
    const openOrders = Number(detail.summary?.open_orders_count || 0)

    if (openOrders > 0) {
      toast.warning(
        `Cannot close shift: There are ${openOrders} unpaid order(s). Please pay or cancel them first.`,
      )
      return
    }

    closeModal.shiftId = detail.id
    closeModal.expectedUsd = expUsd
    closeModal.expectedKhr = expKhr
    closeModal.openOrdersCount = openOrders
    closeModal.closing_cash_usd = expUsd
    closeModal.closing_cash_khr = expKhr
    closeModal.note = ''
    closeModal.show = true
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load shift details')
  }
}

const liveDiffUsd = computed(() => {
  const actual = Number(closeModal.closing_cash_usd) || 0
  return Number((actual - closeModal.expectedUsd).toFixed(2))
})

const liveDiffKhr = computed(() => {
  const actual = Math.round(Number(closeModal.closing_cash_khr) || 0)
  return actual - closeModal.expectedKhr
})

const handleConfirmCloseShift = async () => {
  const usd = Number(closeModal.closing_cash_usd)
  const khr = Number(closeModal.closing_cash_khr)

  if (closeModal.closing_cash_usd === '' || isNaN(usd) || usd < 0) {
    toast.error('Please enter a valid closing USD amount')
    return
  }
  if (closeModal.closing_cash_khr === '' || isNaN(khr) || khr < 0) {
    toast.error('Please enter a valid closing KHR amount')
    return
  }

  closeModal.isClosing = true
  try {
    const res = await api.post(`/shifts/${closeModal.shiftId}/close`, {
      closing_cash_usd: Number(usd.toFixed(2)),
      closing_cash_khr: Math.round(khr),
      note: closeModal.note?.trim() || null,
    })
    toast.success(res.data?.message || 'Shift closed successfully')
    closeModal.show = false
    await Promise.all([loadCurrentShift(), fetchShiftsHistory(pagination.value.page)])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to close shift')
  } finally {
    closeModal.isClosing = false
  }
}

// ==========================================
// SHIFT DETAILS MODAL
// ==========================================
const detailModal = reactive({
  show: false,
  isLoading: false,
  data: null,
})

const openShiftDetails = async (shiftId) => {
  detailModal.show = true
  detailModal.isLoading = true
  detailModal.data = null
  try {
    const res = await api.get(`/shifts/${shiftId}`)
    detailModal.data = res.data?.data || null
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load shift summary')
    detailModal.show = false
  } finally {
    detailModal.isLoading = false
  }
}
</script>

<template>
  <div class="shifts-page">
    <!-- ========================================== -->
    <!-- 1. CURRENT SHIFT CARD                      -->
    <!-- ========================================== -->
    <div class="clean-card drawer-card mb-3">
      <div v-if="isLoadingCurrent" class="empty-box py-4">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('shifts.checkingActiveShift') }}</div>
      </div>

      <!-- STATE A: NO ACTIVE SHIFT -> OPEN SHIFT FORM -->
      <div v-else-if="!activeShift" class="drawer-card__body">
        <div class="drawer-card__head">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="status-badge closed">
                <span class="status-badge__dot"></span>
                <span>{{ $t('shifts.shiftClosed') }}</span>
              </span>
            </div>
            <h5 class="drawer-card__title mb-1">{{ $t('shifts.openCashierShift') }}</h5>
            <p class="drawer-card__subtitle mb-0">
              {{ $t('shifts.openShiftSubtitle') }}
            </p>
          </div>
        </div>

        <form @submit.prevent="handleOpenShift" class="open-shift-form">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-sm-6 col-lg-3">
              <BaseInput
                v-model="openForm.opening_cash_usd"
                type="number"
                :label="$t('shifts.openingCashUsd')"
                placeholder="0.00"
                no-margin
                class="mb-0"
                required
              >
                <template #prefix><span class="small fw-semibold">$</span></template>
              </BaseInput>
            </div>

            <div class="col-12 col-sm-6 col-lg-3">
              <BaseInput
                v-model="openForm.opening_cash_khr"
                type="number"
                :label="$t('shifts.openingCashKhr')"
                placeholder="0"
                no-margin
                class="mb-0"
                required
              >
                <template #suffix><span class="small fw-semibold text-muted">៛</span></template>
              </BaseInput>
            </div>

            <div class="col-12 col-sm-6 col-lg-3">
              <BaseInput
                v-model="openForm.note"
                :label="$t('shifts.shiftNoteOptional')"
                :placeholder="$t('shifts.shiftNotePlaceholder')"
                no-margin
                class="mb-0"
              />
            </div>

            <div class="col-12 col-sm-6 col-lg-3">
              <div class="d-none d-sm-block mb-1" style="visibility: hidden; height: 21px">
                <span class="small">&nbsp;</span>
              </div>
              <BaseButton
                type="submit"
                variant="primary"
                block
                :loading="isOpeningShift"
                class="btn-open-shift"
              >
                <i class="bi bi-unlock me-1"></i>{{ $t('shifts.openShiftBtn') }}
              </BaseButton>
            </div>
          </div>
        </form>
      </div>

      <!-- STATE B: ACTIVE OPEN SHIFT SUMMARY -->
      <div v-else class="drawer-card__body">
        <div class="drawer-card__head">
          <div>
            <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
              <span class="status-badge open">
                <span class="status-badge__dot"></span>
                <span>{{ $t('shifts.shiftActiveBadge', { id: activeShift.id }) }}</span>
              </span>
              <span class="drawer-card__time tabular">
                <i class="bi bi-clock me-1"></i>
                {{ $t('shifts.openedAt', { date: formatDateTime(activeShift.opened_at) }) }}
              </span>
            </div>
            <h5 class="drawer-card__title mb-0">{{ $t('shifts.currentDrawerSummary') }}</h5>
          </div>

          <div class="drawer-card__actions">
            <button type="button" class="toolbar-btn" @click="loadCurrentShift">
              <i class="bi bi-arrow-clockwise"></i>
              <span>{{ $t('common.refresh') }}</span>
            </button>
            <button type="button" class="toolbar-btn toolbar-btn--pos" @click="router.push('/pos')">
              <i class="bi bi-calculator"></i>
              <span>{{ $t('shifts.goToPos') }}</span>
            </button>
            <button
              type="button"
              class="toolbar-btn toolbar-btn--danger"
              @click="openCloseShiftModal(activeShift)"
            >
              <i class="bi bi-lock"></i>
              <span>{{ $t('shifts.closeShiftBtn') }}</span>
            </button>
          </div>
        </div>

        <!-- 4 Summary KPI Boxes -->
        <div class="drawer-metrics-grid">
          <div class="metric-box">
            <div class="metric-box__head">
              <span class="metric-box__label">{{ $t('shifts.openingCash') }}</span>
              <span class="metric-box__icon"><i class="bi bi-safe"></i></span>
            </div>
            <div class="metric-box__usd tabular">
              {{ formatUsd(activeShift.opening_cash_usd) }}
            </div>
            <div class="metric-box__sub tabular">
              {{ formatKhr(activeShift.opening_cash_khr) }}
            </div>
          </div>

          <div class="metric-box metric-box--highlight">
            <div class="metric-box__head">
              <span class="metric-box__label">{{ $t('shifts.expectedCashInDrawer') }}</span>
              <span class="metric-box__icon"><i class="bi bi-wallet2"></i></span>
            </div>
            <div class="metric-box__usd tabular">
              {{ formatUsd(activeShift.summary?.expected_drawer?.cash_usd) }}
            </div>
            <div class="metric-box__sub tabular">
              {{ formatKhr(activeShift.summary?.expected_drawer?.cash_khr) }}
            </div>
          </div>

          <div class="metric-box">
            <div class="metric-box__head">
              <span class="metric-box__label">{{ $t('shifts.totalSalesPaid') }}</span>
              <span class="metric-box__icon"><i class="bi bi-receipt-cutoff"></i></span>
            </div>
            <div class="metric-box__usd tabular">
              {{ formatUsd(activeShift.summary?.total_sales_usd) }}
            </div>
            <div class="metric-box__sub tabular">
              <span>{{ $t('shifts.paidCount', { count: activeShift.summary?.total_orders || 0 }) }}</span>
              <span class="mx-1">•</span>
              <span
                :class="
                  activeShift.summary?.open_orders_count > 0 ? 'text-danger fw-bold' : ''
                "
              >
                {{ $t('shifts.openCount', { count: activeShift.summary?.open_orders_count || 0 }) }}
              </span>
            </div>
          </div>

          <div class="metric-box">
            <div class="metric-box__head">
              <span class="metric-box__label">{{ $t('shifts.khqrBankTransfers') }}</span>
              <span class="metric-box__icon"><i class="bi bi-qr-code-scan"></i></span>
            </div>
            <div class="metric-box__usd tabular">
              {{
                formatUsd(
                  (activeShift.summary?.khqr?.usd || 0) +
                    (activeShift.summary?.bank_transfer?.usd || 0),
                )
              }}
            </div>
            <div class="metric-box__sub tabular">
              {{
                formatKhr(
                  (activeShift.summary?.khqr?.khr || 0) +
                    (activeShift.summary?.bank_transfer?.khr || 0),
                )
              }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- 2. SHIFTS HISTORY TABLE                    -->
    <!-- ========================================== -->
    <div class="clean-card">
      <div class="filter-bar">
        <div class="d-flex align-items-center gap-2">
          <h6 class="filter-bar__title mb-0">{{ $t('shifts.shiftsHistory') }}</h6>
          <span v-if="pagination.total > 0" class="count-pill tabular">{{ pagination.total }}</span>
        </div>

        <div class="filter-bar__controls">
          <select
            v-model="filterStatus"
            class="filter-input filter-select"
          >
            <option value="">{{ $t('common.allStatus') }}</option>
            <option value="OPEN">{{ $t('nav.openBadge') }}</option>
            <option value="CLOSED">{{ $t('shifts.shiftClosed') }}</option>
          </select>

          <select
            v-if="isOwner"
            v-model="filterUserId"
            class="filter-input filter-select"
          >
            <option value="">{{ $t('shifts.allStaff') }}</option>
            <option v-for="s in staffList" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>

          <div class="date-range-group">
            <i class="bi bi-calendar3 date-range-group__icon"></i>
            <input
              v-model="filterStartDate"
              type="date"
              class="date-range-group__input"
            />
            <span class="date-range-group__sep">→</span>
            <input
              v-model="filterEndDate"
              type="date"
              class="date-range-group__input"
            />
          </div>

          <button
            type="button"
            class="toolbar-btn toolbar-btn--icon"
            :title="$t('common.reset')"
            @click="resetHistoryFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>
      </div>

      <div v-if="isLoadingHistory" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('shifts.loadingShifts') }}</div>
      </div>

      <div v-else-if="shifts.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-safe2"></i>
        </div>
        <div class="empty-box__title">{{ $t('shifts.noShiftsRecorded') }}</div>
        <div class="empty-box__desc">{{ $t('shifts.noShiftsRecordedDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th>{{ $t('shifts.colShift') }}</th>
              <th>{{ $t('shifts.colCashier') }}</th>
              <th>{{ $t('shifts.colOpenedClosed') }}</th>
              <th>{{ $t('shifts.colOpeningCash') }}</th>
              <th>{{ $t('shifts.colClosingExpected') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in shifts"
              :key="s.id"
              class="clickable-row"
              @click="openShiftDetails(s.id)"
            >
              <td>
                <span class="shift-id-badge tabular">#{{ s.id }}</span>
              </td>

              <td>
                <div class="cashier-cell">
                  <span class="cashier-cell__name">{{ s.user_name }}</span>
                  <span class="cashier-cell__role">{{ getRoleLabel(s.user_role) }}</span>
                </div>
              </td>

              <td>
                <div class="time-cell tabular">
                  <div class="time-cell__open">{{ formatDateTime(s.opened_at) }}</div>
                  <div class="time-cell__close">
                    {{ s.closed_at ? formatDateTime(s.closed_at) : $t('shifts.stillOpen') }}
                  </div>
                </div>
              </td>

              <td>
                <div class="amount-cell tabular">
                  <strong class="amount-cell__usd">{{ formatUsd(s.opening_cash_usd) }}</strong>
                  <span class="amount-cell__khr">{{ formatKhr(s.opening_cash_khr) }}</span>
                </div>
              </td>

              <td>
                <div v-if="s.status === 'CLOSED'" class="amount-cell tabular">
                  <div>
                    <strong class="amount-cell__usd">{{ formatUsd(s.closing_cash_usd) }}</strong>
                    <span class="amount-cell__expected"> / {{ formatUsd(s.expected_cash_usd) }}</span>
                  </div>
                  <div class="amount-cell__khr">
                    {{ formatKhr(s.closing_cash_khr) }} / {{ formatKhr(s.expected_cash_khr) }}
                  </div>
                </div>
                <span v-else class="text-muted small">—</span>
              </td>

              <td>
                <span
                  class="status-badge"
                  :class="s.status === 'OPEN' ? 'open' : 'closed'"
                >
                  <span class="status-badge__dot"></span>
                  <span>{{ s.status === 'OPEN' ? $t('nav.openBadge') : $t('shifts.shiftClosed') }}</span>
                </span>
              </td>

              <td class="text-end" @click.stop>
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.view')"
                    @click="openShiftDetails(s.id)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  <button
                    v-if="s.status === 'OPEN'"
                    type="button"
                    class="btn-action-icon is-danger"
                    :title="$t('shifts.closeShiftBtn')"
                    @click="openCloseShiftModal(s)"
                  >
                    <i class="bi bi-lock"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="pagination-bar"
      >
        <span class="pagination-info tabular">
          {{ $t('common.pageOf', { page: pagination.page, total: pagination.totalPages }) }}
        </span>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page <= 1"
            @click="fetchShiftsHistory(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchShiftsHistory(pagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CLOSE SHIFT                       -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="closeModal.show"
        class="modal-backdrop-custom"
        @click.self="closeModal.show = false"
      >
        <div class="modal-card-custom" style="max-width: 460px">
          <div class="modal-header-custom">
            <h6 class="mb-0 fw-bold">{{ $t('shifts.closeShiftModalTitle', { id: closeModal.shiftId }) }}</h6>
            <button type="button" class="btn-close-custom" @click="closeModal.show = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <form @submit.prevent="handleConfirmCloseShift">
            <div class="modal-body-custom">
              <!-- Expected Cash Reference -->
              <div class="expected-banner mb-3">
                <div class="expected-banner__label">{{ $t('shifts.systemExpectedCash') }}</div>
                <div class="expected-banner__values tabular">
                  <strong class="expected-banner__usd">{{ formatUsd(closeModal.expectedUsd) }}</strong>
                  <span class="expected-banner__divider"></span>
                  <strong class="expected-banner__khr">{{ formatKhr(closeModal.expectedKhr) }}</strong>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-12 col-sm-6">
                  <BaseInput
                    v-model="closeModal.closing_cash_usd"
                    type="number"
                    :label="$t('shifts.countedCashUsd')"
                    placeholder="0.00"
                    required
                  >
                    <template #prefix><span class="small fw-semibold">$</span></template>
                  </BaseInput>
                </div>

                <div class="col-12 col-sm-6">
                  <BaseInput
                    v-model="closeModal.closing_cash_khr"
                    type="number"
                    :label="$t('shifts.countedCashKhr')"
                    placeholder="0"
                    required
                  >
                    <template #suffix><span class="small text-muted">៛</span></template>
                  </BaseInput>
                </div>
              </div>

              <!-- Live Difference Preview -->
              <div class="diff-preview-row tabular mb-3">
                <span>
                  {{ $t('shifts.usdDiff') }}
                  <strong
                    :class="
                      liveDiffUsd === 0
                        ? 'text-success'
                        : liveDiffUsd > 0
                          ? 'text-primary'
                          : 'text-danger'
                    "
                  >
                    {{ liveDiffUsd >= 0 ? '+' : '' }}{{ formatUsd(liveDiffUsd) }}
                  </strong>
                </span>
                <span>
                  {{ $t('shifts.khrDiff') }}
                  <strong
                    :class="
                      liveDiffKhr === 0
                        ? 'text-success'
                        : liveDiffKhr > 0
                          ? 'text-primary'
                          : 'text-danger'
                    "
                  >
                    {{ liveDiffKhr >= 0 ? '+' : '' }}{{ formatKhr(liveDiffKhr) }}
                  </strong>
                </span>
              </div>

              <BaseInput
                v-model="closeModal.note"
                :label="$t('shifts.closingNoteOptional')"
                :placeholder="$t('shifts.closingNotePlaceholder')"
                no-margin
              />
            </div>

            <div class="modal-footer-custom">
              <button
                type="button"
                class="toolbar-btn"
                :disabled="closeModal.isClosing"
                @click="closeModal.show = false"
              >
                {{ $t('common.cancel') }}
              </button>
              <BaseButton type="submit" variant="danger" class="flex-grow-1" :loading="closeModal.isClosing">
                {{ $t('shifts.confirmCloseShift') }}
              </BaseButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ========================================== -->
    <!-- MODAL 2: SHIFT DETAILS                     -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="detailModal.show"
        class="modal-backdrop-custom"
        @click.self="detailModal.show = false"
      >
        <div class="modal-card-custom" style="max-width: 500px">
          <div class="modal-header-custom">
            <div class="d-flex align-items-center gap-2">
              <h6 class="mb-0 fw-bold">
                {{ $t('shifts.shiftDetailsTitle', { id: detailModal.data?.id || '' }) }}
              </h6>
              <span
                v-if="detailModal.data"
                class="status-badge"
                :class="detailModal.data.status === 'OPEN' ? 'open' : 'closed'"
              >
                <span class="status-badge__dot"></span>
                <span>{{ detailModal.data.status === 'OPEN' ? $t('nav.openBadge') : $t('shifts.shiftClosed') }}</span>
              </span>
            </div>
            <button type="button" class="btn-close-custom" @click="detailModal.show = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="modal-body-custom">
            <div v-if="detailModal.isLoading" class="empty-box py-4">
              <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
              <div class="small text-muted">{{ $t('shifts.loadingSummary') }}</div>
            </div>

            <div v-else-if="detailModal.data" class="small">
              <div class="info-box mb-3">
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.colCashier') }}</span>
                  <span class="fw-semibold">{{ detailModal.data.user_name }}</span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.openedAtLabel') }}</span>
                  <span class="tabular">{{ formatDateTime(detailModal.data.opened_at) }}</span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.closedAtLabel') }}</span>
                  <span class="tabular">
                    {{
                      detailModal.data.closed_at
                        ? formatDateTime(detailModal.data.closed_at)
                        : $t('shifts.stillOpen')
                    }}
                  </span>
                </div>
              </div>

              <div class="info-box tabular">
                <div class="fw-bold text-dark mb-2">{{ $t('shifts.cashDrawerFlow') }}</div>
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.openingCash') }}</span>
                  <span class="fw-semibold">
                    {{ formatUsd(detailModal.data.opening_cash_usd) }} /
                    {{ formatKhr(detailModal.data.opening_cash_khr) }}
                  </span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.netCashSales') }}</span>
                  <span class="fw-semibold">
                    {{ formatUsd(detailModal.data.summary?.cash?.net_usd) }} /
                    {{ formatKhr(detailModal.data.summary?.cash?.net_khr) }}
                  </span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.cashExpenses') }}</span>
                  <span class="text-danger">
                    -{{ formatUsd(detailModal.data.summary?.expenses?.cash_usd) }} /
                    -{{ formatKhr(detailModal.data.summary?.expenses?.cash_khr) }}
                  </span>
                </div>
                <div class="d-flex justify-content-between py-1">
                  <span class="text-muted">{{ $t('shifts.cashRefunds') }}</span>
                  <span class="text-danger">
                    -{{ formatUsd(detailModal.data.summary?.refunds?.cash_usd) }} /
                    -{{ formatKhr(detailModal.data.summary?.refunds?.cash_khr) }}
                  </span>
                </div>
                <div class="d-flex justify-content-between pt-2 mt-1 border-top fw-bold text-dark">
                  <span>{{ $t('shifts.expectedDrawer') }}</span>
                  <span>
                    {{ formatUsd(detailModal.data.summary?.expected_drawer?.cash_usd) }} /
                    {{ formatKhr(detailModal.data.summary?.expected_drawer?.cash_khr) }}
                  </span>
                </div>
                <div
                  v-if="detailModal.data.status === 'CLOSED'"
                  class="d-flex justify-content-between py-1 fw-bold"
                  style="color: #2d5a43"
                >
                  <span>{{ $t('shifts.actualCounted') }}</span>
                  <span>
                    {{ formatUsd(detailModal.data.closing_cash_usd) }} /
                    {{ formatKhr(detailModal.data.closing_cash_khr) }}
                  </span>
                </div>
              </div>

              <div v-if="detailModal.data.note" class="pt-3 text-muted">
                <strong>{{ $t('common.note') }}:</strong> {{ detailModal.data.note }}
              </div>
            </div>
          </div>

          <div class="modal-footer-custom justify-content-end">
            <button type="button" class="toolbar-btn" @click="detailModal.show = false">
              {{ $t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shifts-page {
  --roast-ink: #1a2820;
  --sage-muted: #5a6f62;
  --botanical-espresso: #2d5a43;
  --botanical-hover: #244936;
  --botanical-tint: #eaf5ee;
  --botanical-border: #3b7054;
  --counter-stone: #f4f8f5;
  --ledger-line: #dce6e0;
  --ledger-hairline: #ebf1ed;
  color: var(--roast-ink);
}

.shifts-page button:focus,
.shifts-page button:focus-visible,
.shifts-page input:focus,
.shifts-page select:focus {
  outline: none;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* ================= MAIN CARDS ================= */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.drawer-card__body {
  padding: 1.15rem 1.25rem;
}

.drawer-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--ledger-hairline);
}

.drawer-card__title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.drawer-card__subtitle {
  font-size: 0.8rem;
  color: var(--sage-muted);
}

.drawer-card__time {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--sage-muted);
}

.drawer-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.open-shift-form :deep(.mb-3) {
  margin-bottom: 0 !important;
}

.btn-open-shift {
  height: 44px !important;
}

/* ================= 4 KPI SUMMARY CARDS ================= */
.drawer-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.85rem;
}

@media (max-width: 991.98px) {
  .drawer-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 575.98px) {
  .drawer-metrics-grid {
    grid-template-columns: 1fr;
  }
}

.metric-box {
  background: #f8fbf9;
  border: 1.5px solid #e1ebe5;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: border-color 0.15s ease;
}

.metric-box__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 2px;
}

.metric-box__label {
  font-size: 0.76rem;
  font-weight: 600;
  color: #4f6356;
}

.metric-box__icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #edf4f0;
  color: #3b7054;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.84rem;
  flex-shrink: 0;
}

.metric-box__usd {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--roast-ink);
  line-height: 1.15;
}

.metric-box__sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.metric-box--highlight {
  background: #eaf5ee;
  border-color: #3b7054;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.06);
}

.metric-box--highlight .metric-box__label {
  color: #193e2b;
  font-weight: 700;
}

.metric-box--highlight .metric-box__icon {
  background: #d5ebdd;
  color: #193e2b;
}

.metric-box--highlight .metric-box__usd {
  color: #193e2b;
}

.metric-box--highlight .metric-box__sub {
  color: #2d5a43;
}

/* ================= FILTER TOOLBAR & CONTROLS ================= */
.filter-bar {
  padding: 0.78rem 1.15rem;
  border-bottom: 1px solid var(--ledger-hairline);
  background: #f8fbf9;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.filter-bar__title {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.count-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  background: #eaf5ee;
  color: #2d5a43;
  border: 1px solid #cce3d5;
}

.filter-bar__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.filter-input {
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0 0.75rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input:focus {
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.filter-select {
  cursor: pointer;
}

.date-range-group {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.65rem;
  background: #ffffff;
  border: 1.5px solid #dce6e0;
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.date-range-group:focus-within {
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.date-range-group__icon {
  font-size: 0.78rem;
  color: var(--sage-muted);
  margin-right: 2px;
}

.date-range-group__input {
  border: none;
  background: transparent;
  color: var(--roast-ink);
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0;
  width: 112px;
  cursor: pointer;
}

.date-range-group__sep {
  color: #94a89c;
  font-size: 0.75rem;
  padding: 0 2px;
}

/* Toolbar Buttons */
.toolbar-btn {
  height: 36px;
  padding: 0 0.82rem;
  border: 1.5px solid #dce6e0;
  border-radius: 8px;
  background: #ffffff;
  color: #3d5245;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.14s ease;
  white-space: nowrap;
}

.toolbar-btn--icon {
  width: 36px;
  padding: 0;
}

.toolbar-btn:hover:not(:disabled) {
  border-color: #b8ccc0;
  background: #f2f7f4;
  color: var(--roast-ink);
}

.toolbar-btn--pos {
  background: #eaf5ee;
  border-color: #3b7054;
  color: #193e2b;
  font-weight: 700;
}

.toolbar-btn--pos:hover:not(:disabled) {
  background: #dcf0e4;
  border-color: #2d5a43;
  color: #193e2b;
}

.toolbar-btn--danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
  font-weight: 700;
}

.toolbar-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #ffffff;
}

.toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ================= CLEAN LEDGER TABLE ================= */
.clean-table th {
  background: #f4f8f5;
  font-size: 0.75rem;
  color: #4f6356;
  font-weight: 700;
  padding: 0.7rem 1.15rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.75rem 1.15rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.84rem;
  color: var(--roast-ink);
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.clickable-row:hover td {
  background-color: #f8fbf9;
}

.shift-id-badge {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 800;
  color: #193e2b;
  background: #eff5f1;
  border: 1px solid #d9e7df;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
}

.cashier-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cashier-cell__name {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.cashier-cell__role {
  font-size: 0.73rem;
  font-weight: 500;
  color: var(--sage-muted);
}

.time-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-cell__open {
  font-size: 0.81rem;
  font-weight: 600;
  color: var(--roast-ink);
}

.time-cell__close {
  font-size: 0.74rem;
  color: var(--sage-muted);
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.amount-cell__usd {
  font-size: 0.86rem;
  font-weight: 800;
  color: #193e2b;
}

.amount-cell__expected {
  font-size: 0.8rem;
  color: var(--sage-muted);
}

.amount-cell__khr {
  font-size: 0.73rem;
  font-weight: 500;
  color: var(--sage-muted);
}

/* Status Badges */
.status-badge {
  font-size: 0.73rem;
  font-weight: 700;
  padding: 0.22rem 0.62rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
  white-space: nowrap;
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.open {
  background: #e6f6ec;
  color: #166534;
  border: 1px solid #ccebd7;
}

.status-badge.closed {
  background: #f1f5f3;
  color: #526358;
  border: 1px solid #dce5df;
}

/* Action Buttons */
.action-group {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-action-icon {
  width: 31px;
  height: 31px;
  border-radius: 7px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #465a4e;
  font-size: 0.84rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-action-icon:hover {
  background: #eaf5ee;
  border-color: #3b7054;
  color: #193e2b;
}

.btn-action-icon.is-danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.btn-action-icon.is-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

/* Pagination & Empty States */
.pagination-bar {
  padding: 0.72rem 1.15rem;
  border-top: 1px solid var(--ledger-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fbf9;
}

.pagination-info {
  font-size: 0.8rem;
  font-weight: 600;
  color: #3d5245;
}

.empty-box {
  padding: 3.2rem 1rem;
  text-align: center;
}

.empty-box__icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 0.65rem;
  border-radius: 10px;
  background: #f0f6f2;
  border: 1px solid #dce6e0;
  color: #3b7054;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.empty-box__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin-bottom: 2px;
}

.empty-box__desc {
  font-size: 0.78rem;
  color: var(--sage-muted);
}

/* Modals */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(20, 32, 25, 0.48);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
  padding: 1rem;
}

.modal-card-custom {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--ledger-line);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 44px rgba(20, 32, 25, 0.18);
}

.modal-header-custom {
  padding: 0.95rem 1.2rem;
  border-bottom: 1px solid var(--ledger-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body-custom {
  padding: 1.15rem 1.2rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 0.85rem 1.2rem;
  border-top: 1px solid var(--ledger-hairline);
  background: #f5f9f6;
  display: flex;
  gap: 0.5rem;
}

.btn-close-custom {
  border: 1px solid var(--ledger-line);
  background: #f5f9f6;
  color: var(--sage-muted);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-close-custom:hover {
  background: #e6efe9;
  color: var(--roast-ink);
}

.expected-banner {
  background: #f2f8f4;
  border: 1px solid #d5e6dc;
  border-radius: 10px;
  padding: 0.85rem 1rem;
}

.expected-banner__label {
  font-size: 0.74rem;
  font-weight: 600;
  color: #4f6356;
  margin-bottom: 4px;
}

.expected-banner__values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.expected-banner__usd {
  font-size: 1.2rem;
  font-weight: 800;
  color: #193e2b;
}

.expected-banner__divider {
  width: 1px;
  height: 18px;
  background: #cde0d5;
}

.expected-banner__khr {
  font-size: 1.05rem;
  font-weight: 800;
  color: #2d5a43;
}

.diff-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: #f8fbf9;
  border: 1px solid #e2ece6;
  font-size: 0.78rem;
}

.info-box {
  background: #f7faf8;
  border: 1px solid #dce6e0;
  border-radius: 10px;
  padding: 0.85rem;
}
</style>
