<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const toast = useToast()
const { formatUsd, formatKhr } = useCurrency()
const { formatDateTime } = useFormatDate()

const isOwner = computed(() => authStore.isOwner)

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
  <div class="shifts-page mx-auto">
    <!-- ========================================== -->
    <!-- 1. CURRENT SHIFT CARD                      -->
    <!-- ========================================== -->
    <div class="clean-card bg-white p-4 mb-4">
      <div v-if="isLoadingCurrent" class="text-center py-4 text-muted small">
        <span class="spinner-border spinner-border-sm me-2"></span>
        Checking active shift...
      </div>

      <!-- STATE A: NO ACTIVE SHIFT -> OPEN SHIFT FORM -->
      <div v-else-if="!activeShift">
        <div class="mb-3 pb-3 border-bottom">
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="status-dot-badge status-closed">Shift Closed</span>
          </div>
          <h5 class="fw-semibold text-dark mb-1">Open Cashier Shift</h5>
          <p class="text-muted small mb-0">
            Enter your starting cash drawer balance (USD & KHR) to begin taking orders.
          </p>
        </div>

        <form @submit.prevent="handleOpenShift">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-sm-6 col-md-3">
              <BaseInput
                v-model="openForm.opening_cash_usd"
                type="number"
                label="Opening Cash (USD)"
                placeholder="0.00"
                class="mb-0"
                required
              >
                <template #prefix><span class="small fw-semibold">$</span></template>
              </BaseInput>
            </div>

            <div class="col-12 col-sm-6 col-md-3">
              <BaseInput
                v-model="openForm.opening_cash_khr"
                type="number"
                label="Opening Cash (KHR)"
                placeholder="0"
                class="mb-0"
                required
              >
                <template #suffix><span class="small fw-semibold text-muted">៛</span></template>
              </BaseInput>
            </div>

            <div class="col-12 col-md-4">
              <BaseInput
                v-model="openForm.note"
                label="Shift note (optional)"
                placeholder="e.g. Morning shift"
                class="mb-0"
              />
            </div>

            <div class="col-12 col-md-2">
              <BaseButton type="submit" variant="primary" block :loading="isOpeningShift">
                Open Shift
              </BaseButton>
            </div>
          </div>
        </form>
      </div>

      <!-- STATE B: ACTIVE OPEN SHIFT SUMMARY -->
      <div v-else>
        <div
          class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 pb-3 mb-3 border-bottom"
        >
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="status-dot-badge status-open">Shift #{{ activeShift.id }} Active</span>
              <span class="text-muted small">
                • Opened {{ formatDateTime(activeShift.opened_at) }}
              </span>
            </div>
            <h5 class="fw-semibold text-dark mb-0">Current Cash Drawer Summary</h5>
          </div>

          <div class="d-flex align-items-center gap-2">
            <BaseButton variant="secondary" size="sm" @click="loadCurrentShift">
              <template #prefix><i class="bi bi-arrow-clockwise"></i></template>
              Refresh
            </BaseButton>
            <BaseButton variant="secondary" size="sm" @click="router.push('/pos')">
              <template #prefix><i class="bi bi-calculator"></i></template>
              Go to POS
            </BaseButton>
            <BaseButton
              variant="danger"
              size="sm"
              @click="openCloseShiftModal(activeShift)"
            >
              Close Shift
            </BaseButton>
          </div>
        </div>

        <!-- 4 Summary Boxes -->
        <div class="row g-3">
          <div class="col-12 col-sm-6 col-lg-3">
            <div class="stat-box p-3 rounded-3">
              <div class="text-muted small mb-1">Opening Cash</div>
              <div class="fw-bold fs-6 numeric-tabular">
                {{ formatUsd(activeShift.opening_cash_usd) }}
              </div>
              <div class="text-muted small numeric-tabular">
                {{ formatKhr(activeShift.opening_cash_khr) }}
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-lg-3">
            <div class="stat-box stat-box--highlight p-3 rounded-3">
              <div class="text-muted small mb-1">Expected Cash in Drawer</div>
              <div class="fw-bold fs-6 text-dark numeric-tabular">
                {{ formatUsd(activeShift.summary?.expected_drawer?.cash_usd) }}
              </div>
              <div class="text-muted small numeric-tabular">
                {{ formatKhr(activeShift.summary?.expected_drawer?.cash_khr) }}
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-lg-3">
            <div class="stat-box p-3 rounded-3">
              <div class="text-muted small mb-1">Total Sales (Paid Orders)</div>
              <div class="fw-bold fs-6 numeric-tabular">
                {{ formatUsd(activeShift.summary?.total_sales_usd) }}
              </div>
              <div class="text-muted small numeric-tabular">
                {{ activeShift.summary?.total_orders || 0 }} paid •
                <span
                  :class="
                    activeShift.summary?.open_orders_count > 0 ? 'text-danger fw-semibold' : ''
                  "
                >
                  {{ activeShift.summary?.open_orders_count || 0 }} open
                </span>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-lg-3">
            <div class="stat-box p-3 rounded-3">
              <div class="text-muted small mb-1">KHQR & Bank Transfers</div>
              <div class="fw-bold fs-6 numeric-tabular">
                {{
                  formatUsd(
                    (activeShift.summary?.khqr?.usd || 0) +
                      (activeShift.summary?.bank_transfer?.usd || 0),
                  )
                }}
              </div>
              <div class="text-muted small numeric-tabular">
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
    </div>

    <!-- ========================================== -->
    <!-- 2. SHIFTS HISTORY TABLE                    -->
    <!-- ========================================== -->
    <div class="clean-card bg-white overflow-hidden">
      <div class="p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h6 class="fw-bold text-dark mb-0">Shifts History</h6>

        <div class="d-flex align-items-center flex-wrap gap-2">
          <select
            v-model="filterStatus"
            class="form-select form-select-sm clean-select"
            style="width: auto; min-width: 120px"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            v-if="isOwner"
            v-model="filterUserId"
            class="form-select form-select-sm clean-select"
            style="width: auto; min-width: 140px"
          >
            <option value="">All Staff</option>
            <option v-for="s in staffList" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>

          <input
            v-model="filterStartDate"
            type="date"
            class="form-control form-control-sm clean-select"
            style="width: auto"
            title="Start Date"
          />

          <input
            v-model="filterEndDate"
            type="date"
            class="form-control form-control-sm clean-select"
            style="width: auto"
            title="End Date"
          />
        </div>
      </div>

      <div v-if="isLoadingHistory" class="text-center py-5 text-muted small">
        <span class="spinner-border spinner-border-sm me-2"></span>
        Loading shifts...
      </div>

      <div v-else-if="shifts.length === 0" class="text-center py-5 px-3">
        <i class="bi bi-safe2 fs-2 text-muted d-block mb-2"></i>
        <div class="fw-semibold mb-1">No shifts recorded</div>
        <p class="text-muted small mb-0">Shift records will appear here once opened.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th class="ps-4">Shift</th>
              <th>Cashier</th>
              <th>Opened / Closed</th>
              <th>Opening Cash</th>
              <th>Closing vs Expected</th>
              <th>Status</th>
              <th class="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in shifts" :key="s.id">
              <td class="ps-4 fw-semibold numeric-tabular">#{{ s.id }}</td>

              <td>
                <div class="fw-medium text-dark">{{ s.user_name }}</div>
                <div class="text-muted" style="font-size: 12px">{{ s.user_role }}</div>
              </td>

              <td class="small">
                <div class="text-dark">{{ formatDateTime(s.opened_at) }}</div>
                <div class="text-muted">
                  {{ s.closed_at ? formatDateTime(s.closed_at) : 'Still open' }}
                </div>
              </td>

              <td class="small numeric-tabular">
                <div class="fw-medium">{{ formatUsd(s.opening_cash_usd) }}</div>
                <div class="text-muted">{{ formatKhr(s.opening_cash_khr) }}</div>
              </td>

              <td class="small numeric-tabular">
                <template v-if="s.status === 'CLOSED'">
                  <div>
                    <span class="fw-semibold">{{ formatUsd(s.closing_cash_usd) }}</span>
                    <span class="text-muted"> / {{ formatUsd(s.expected_cash_usd) }}</span>
                  </div>
                  <div class="text-muted">
                    {{ formatKhr(s.closing_cash_khr) }} / {{ formatKhr(s.expected_cash_khr) }}
                  </div>
                </template>
                <span v-else class="text-muted">—</span>
              </td>

              <td>
                <span
                  class="status-dot-badge"
                  :class="s.status === 'OPEN' ? 'status-open' : 'status-closed'"
                >
                  {{ s.status }}
                </span>
              </td>

              <td class="text-end pe-4">
                <div class="d-inline-flex gap-1">
                  <button
                    type="button"
                    class="btn-action"
                    title="View shift details"
                    @click="openShiftDetails(s.id)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  <button
                    v-if="s.status === 'OPEN'"
                    type="button"
                    class="btn-action btn-action--danger"
                    title="Close shift"
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
        class="d-flex align-items-center justify-content-between px-4 py-3 border-top small text-muted"
      >
        <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
        <div class="d-flex gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="fetchShiftsHistory(pagination.page - 1)"
          >
            Previous
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchShiftsHistory(pagination.page + 1)"
          >
            Next
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CLOSE SHIFT                       -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="closeModal.show"
        class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      >
        <div class="modal-card bg-white p-4" style="max-width: 460px">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0">Close Shift #{{ closeModal.shiftId }}</h5>
            <button type="button" class="btn-close btn-sm" @click="closeModal.show = false"></button>
          </div>

          <form @submit.prevent="handleConfirmCloseShift">
            <!-- Expected Cash Reference -->
            <div class="expected-box p-3 rounded-3 mb-3">
              <div class="small text-muted mb-1">System Expected Cash in Drawer</div>
              <div class="d-flex justify-content-between align-items-center numeric-tabular">
                <span class="fw-bold fs-6">{{ formatUsd(closeModal.expectedUsd) }}</span>
                <span class="fw-bold fs-6">{{ formatKhr(closeModal.expectedKhr) }}</span>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12 col-sm-6">
                <BaseInput
                  v-model="closeModal.closing_cash_usd"
                  type="number"
                  label="Counted Cash (USD)"
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
                  label="Counted Cash (KHR)"
                  placeholder="0"
                  required
                >
                  <template #suffix><span class="small text-muted">៛</span></template>
                </BaseInput>
              </div>
            </div>

            <!-- Live Difference Preview -->
            <div class="d-flex justify-content-between small px-1 mb-3 numeric-tabular">
              <span>
                USD Diff:
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
                KHR Diff:
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
              label="Closing note (optional)"
              placeholder="Any discrepancy reason or handover note..."
            />

            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
              <BaseButton
                type="button"
                variant="secondary"
                :disabled="closeModal.isClosing"
                @click="closeModal.show = false"
              >
                Cancel
              </BaseButton>
              <BaseButton type="submit" variant="danger" :loading="closeModal.isClosing">
                Confirm Close Shift
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
        class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      >
        <div class="modal-card bg-white p-4" style="max-width: 520px">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0">
              Shift #{{ detailModal.data?.id || '' }} Details
            </h5>
            <button type="button" class="btn-close btn-sm" @click="detailModal.show = false"></button>
          </div>

          <div v-if="detailModal.isLoading" class="text-center py-4 text-muted small">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Loading summary...
          </div>

          <div v-else-if="detailModal.data" class="small">
            <div class="d-flex justify-content-between py-1">
              <span class="text-muted">Cashier</span>
              <span class="fw-semibold">{{ detailModal.data.user_name }}</span>
            </div>
            <div class="d-flex justify-content-between py-1">
              <span class="text-muted">Opened At</span>
              <span>{{ formatDateTime(detailModal.data.opened_at) }}</span>
            </div>
            <div class="d-flex justify-content-between py-1 pb-2 border-bottom">
              <span class="text-muted">Closed At</span>
              <span>
                {{
                  detailModal.data.closed_at
                    ? formatDateTime(detailModal.data.closed_at)
                    : 'Still Open'
                }}
              </span>
            </div>

            <div class="py-2 border-bottom numeric-tabular">
              <div class="fw-semibold text-dark mb-1">Cash Drawer Flow</div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Opening Cash</span>
                <span>
                  {{ formatUsd(detailModal.data.opening_cash_usd) }} /
                  {{ formatKhr(detailModal.data.opening_cash_khr) }}
                </span>
              </div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Net Cash Sales</span>
                <span>
                  {{ formatUsd(detailModal.data.summary?.cash?.net_usd) }} /
                  {{ formatKhr(detailModal.data.summary?.cash?.net_khr) }}
                </span>
              </div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Cash Expenses</span>
                <span class="text-danger">
                  -{{ formatUsd(detailModal.data.summary?.expenses?.cash_usd) }} /
                  -{{ formatKhr(detailModal.data.summary?.expenses?.cash_khr) }}
                </span>
              </div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Cash Refunds</span>
                <span class="text-danger">
                  -{{ formatUsd(detailModal.data.summary?.refunds?.cash_usd) }} /
                  -{{ formatKhr(detailModal.data.summary?.refunds?.cash_khr) }}
                </span>
              </div>
              <div class="d-flex justify-content-between py-1 fw-semibold text-dark">
                <span>Expected Drawer</span>
                <span>
                  {{ formatUsd(detailModal.data.summary?.expected_drawer?.cash_usd) }} /
                  {{ formatKhr(detailModal.data.summary?.expected_drawer?.cash_khr) }}
                </span>
              </div>
              <div
                v-if="detailModal.data.status === 'CLOSED'"
                class="d-flex justify-content-between py-1 fw-semibold"
              >
                <span>Actual Counted</span>
                <span>
                  {{ formatUsd(detailModal.data.closing_cash_usd) }} /
                  {{ formatKhr(detailModal.data.closing_cash_khr) }}
                </span>
              </div>
            </div>

            <div v-if="detailModal.data.note" class="pt-2 text-muted">
              <strong>Note:</strong> {{ detailModal.data.note }}
            </div>

            <div class="d-flex justify-content-end pt-3 mt-2 border-top">
              <BaseButton variant="secondary" size="sm" @click="detailModal.show = false">
                Close
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shifts-page {
  max-width: 1080px;
}

.clean-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.stat-box {
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.stat-box--highlight {
  background-color: var(--secondary-fixed, #ffdcc5);
  border-color: #f3c6a5;
}

.clean-select {
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  font-size: 13px;
  box-shadow: none !important;
}

.clean-select:focus {
  border-color: var(--primary, #2c1810);
}

.clean-table th {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--outline, #827470);
  background-color: var(--surface-container-low, #f6f3f2);
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  padding-top: 12px;
  padding-bottom: 12px;
}

.clean-table td {
  padding-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  font-size: 14px;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.status-dot-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-dot-badge::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-open {
  color: #166534;
}
.status-open::before {
  background-color: #16a34a;
}

.status-closed {
  color: var(--on-surface-variant, #504440);
}
.status-closed::before {
  background-color: #9ca3af;
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  background: #ffffff;
  color: var(--on-surface-variant, #504440);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.15s ease;
}

.btn-action:hover {
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface, #1c1b1b);
}

.btn-action--danger:hover {
  background-color: var(--error-container, #ffdad6);
  border-color: #fca5a5;
  color: var(--error, #ba1a1a);
}

/* Modal */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background-color: rgba(28, 27, 27, 0.45);
  backdrop-filter: blur(2px);
  z-index: 1060;
}

.modal-card {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.expected-box {
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
}
</style>
