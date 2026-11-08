<template>
  <div class="expenses-page">
    <!-- Clean Tab & Action Header Bar -->
    <div class="expenses-nav-tabs d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <!-- Status Tabs -->
      <div class="d-flex align-items-center gap-4">
        <button
          type="button"
          class="nav-tab-btn"
          :class="{ active: filters.status === '' }"
          @click="setStatusFilter('')"
        >
          <span>{{ $t('expenses.allExpenses') }}</span>
          <span v-if="filters.status === '' && pagination.total_items > 0" class="tab-badge">
            {{ pagination.total_items }}
          </span>
        </button>
        <button
          type="button"
          class="nav-tab-btn"
          :class="{ active: filters.status === 'ACTIVE' }"
          @click="setStatusFilter('ACTIVE')"
        >
          <span>{{ $t('expenses.active') }}</span>
        </button>
        <button
          type="button"
          class="nav-tab-btn"
          :class="{ active: filters.status === 'VOIDED' }"
          @click="setStatusFilter('VOIDED')"
        >
          <span>{{ $t('expenses.voided') }}</span>
        </button>
      </div>

      <!-- Right Action & Summary -->
      <div class="d-flex align-items-center gap-3 pb-2">
        <div class="total-summary-tag d-none d-sm-inline-flex align-items-center gap-1.5">
          <span class="text-muted small">{{ $t('common.total') }}:</span>
          <span class="fw-bold text-dark numeric-tabular">{{ formatUsd(summaryTotals.total_equivalent_usd) }}</span>
          <span v-if="summaryTotals.total_khr > 0" class="text-muted small numeric-tabular">
            ({{ Number(summaryTotals.total_khr).toLocaleString() }} ៛)
          </span>
        </div>

        <button
          type="button"
          class="btn btn-coffee btn-sm d-inline-flex align-items-center gap-1.5 px-3 py-1.5"
          @click="openCreateModal"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('expenses.recordExpense') }}</span>
        </button>
      </div>
    </div>

    <!-- Main Expenses Card -->
    <div class="clean-card">
      <!-- Single-Row Filter Toolbar -->
      <div class="filter-bar d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center flex-wrap gap-2 flex-grow-1">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="filters.search"
              type="text"
              class="form-control form-control-sm search-input"
              :placeholder="$t('expenses.searchPlaceholder')"
              @keyup.enter="applyFilters"
            />
          </div>

          <select
            v-model="filters.category"
            class="form-select form-select-sm filter-select"
            @change="applyFilters"
          >
            <option value="">{{ $t('common.allCategories') }}</option>
            <option v-for="cat in expenseCategories" :key="cat" :value="cat">
              {{ $t(`expenses.categories.${cat}`) !== `expenses.categories.${cat}` ? $t(`expenses.categories.${cat}`) : cat }}
            </option>
          </select>

          <select
            v-model="filters.payment_method"
            class="form-select form-select-sm filter-select"
            @change="applyFilters"
          >
            <option value="">{{ $t('common.allMethods') }}</option>
            <option value="CASH">{{ $t('common.cash') }}</option>
            <option value="KHQR">{{ $t('common.khqr') }}</option>
            <option value="BANK_TRANSFER">{{ $t('common.bankTransfer') }}</option>
          </select>

          <div class="d-flex align-items-center gap-1">
            <input
              v-model="filters.start_date"
              type="date"
              class="form-control form-control-sm filter-date"
              @change="applyFilters"
            />
            <span class="text-muted small">{{ $t('expenses.to') }}</span>
            <input
              v-model="filters.end_date"
              type="date"
              class="form-control form-control-sm filter-date"
              @change="applyFilters"
            />
          </div>

          <button
            v-if="appStore.currentShift?.id"
            type="button"
            class="btn btn-sm"
            :class="filters.currentShiftOnly ? 'btn-coffee' : 'btn-light-coffee'"
            @click="toggleCurrentShiftOnly"
          >
            {{ $t('expenses.currentShift') }}
          </button>
        </div>

        <button
          type="button"
          class="btn btn-light-coffee btn-sm d-inline-flex align-items-center gap-1"
          @click="resetFilters"
        >
          <i class="bi bi-arrow-counterclockwise"></i>
          <span>{{ $t('common.reset') }}</span>
        </button>
      </div>

      <!-- Loading / Empty / Table -->
      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('expenses.loadingExpenses') }}</div>
      </div>

      <div v-else-if="expensesList.length === 0" class="empty-box">
        <i class="bi bi-wallet2 fs-2 text-muted mb-2 d-block"></i>
        <div class="fw-semibold text-dark">{{ $t('expenses.noExpensesFound') }}</div>
        <div class="small text-muted">{{ $t('expenses.noExpensesFoundDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('expenses.colDateShift') }}</th>
              <th>{{ $t('expenses.colCategory') }}</th>
              <th>{{ $t('expenses.colDescription') }}</th>
              <th>{{ $t('expenses.colMethod') }}</th>
              <th>{{ $t('expenses.colAmount') }}</th>
              <th>{{ $t('expenses.colRecordedBy') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="exp in expensesList"
              :key="exp.id"
              :class="{ 'row-voided': exp.status === 'VOIDED' }"
            >
              <td>
                <div class="small text-dark fw-semibold">{{ formatDateTime(exp.incurred_at) }}</div>
              </td>
              <td>
                <span class="cat-badge">{{ $t(`expenses.categories.${exp.category}`) !== `expenses.categories.${exp.category}` ? $t(`expenses.categories.${exp.category}`) : exp.category }}</span>
              </td>
              <td>
                <div class="text-dark" style="max-width: 280px">{{ exp.description }}</div>
                <div v-if="exp.status === 'VOIDED' && exp.void_reason" class="small text-danger mt-1">
                  {{ $t('expenses.voided') }}: {{ exp.void_reason }}
                </div>
              </td>
              <td>
                <span class="method-pill">{{ exp.payment_method }}</span>
              </td>
              <td>
                <div class="fw-bold" :class="exp.status === 'VOIDED' ? 'text-decoration-line-through text-muted' : 'text-dark'">
                  {{ exp.currency === 'USD' ? formatUsd(exp.amount) : formatKhr(exp.amount) }}
                </div>
              </td>
              <td>
                <span class="small fw-semibold">{{ exp.created_by_name }}</span>
              </td>
              <td>
                <span
                  class="status-pill"
                  :class="exp.status === 'ACTIVE' ? 'active' : 'voided'"
                >
                  {{ exp.status }}
                </span>
              </td>
              <td class="text-end">
                <div v-if="exp.status === 'ACTIVE' && canManageExpense(exp)" class="d-inline-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-action-icon"
                    :title="$t('common.edit')"
                    @click="openEditModal(exp)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-action-icon btn-action-icon--danger"
                    :title="$t('common.delete')"
                    @click="openVoidModal(exp)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
                <span v-else class="small text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total_pages > 1" class="pagination-bar">
        <div class="small text-muted">
          {{ $t('common.pageOf', { page: pagination.current_page, total: pagination.total_pages }) }}
        </div>
        <div class="d-flex gap-1">
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="pagination.current_page <= 1"
            @click="fetchExpenses(pagination.current_page - 1)"
          >
            {{ $t('common.prev') }}
          </button>
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="pagination.current_page >= pagination.total_pages"
            @click="fetchExpenses(pagination.current_page + 1)"
          >
            {{ $t('common.next') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 1: CREATE / EDIT EXPENSE ================= -->
    <div v-if="showFormModal" class="modal-backdrop-custom" @click.self="showFormModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">
            {{ editingExpense ? $t('expenses.editExpenseTitle', { id: editingExpense.id }) : $t('expenses.recordNewExpenseTitle') }}
          </h6>
          <button type="button" class="btn-close-custom" @click="showFormModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSaveExpense">
          <div class="modal-body-custom">
            <!-- Warning if CASH selected without open shift -->
            <div
              v-if="form.payment_method === 'CASH' && !appStore.hasOpenShift && !authStore.isOwner"
              class="alert alert-warning py-2 px-3 small mb-3"
            >
              <i class="bi bi-exclamation-triangle me-1"></i>
              {{ $t('expenses.cashShiftWarning') }}
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('expenses.categoryLabel') }} <span class="text-danger">*</span></label>
              <select v-model="form.category" class="form-select form-control-clean" required>
                <option v-for="cat in expenseCategories" :key="cat" :value="cat">
                  {{ $t(`expenses.categories.${cat}`) !== `expenses.categories.${cat}` ? $t(`expenses.categories.${cat}`) : cat }}
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('expenses.paymentMethodLabel') }} <span class="text-danger">*</span></label>
              <div class="option-pills">
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: form.payment_method === 'CASH' }"
                  @click="form.payment_method = 'CASH'"
                >
                  {{ $t('common.cash') }}
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: form.payment_method === 'KHQR' }"
                  @click="form.payment_method = 'KHQR'"
                >
                  {{ $t('common.khqr') }}
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: form.payment_method === 'BANK_TRANSFER' }"
                  @click="form.payment_method = 'BANK_TRANSFER'"
                >
                  {{ $t('common.bankTransfer') }}
                </button>
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-5">
                <label class="form-label-clean">{{ $t('expenses.currencyLabel') }} <span class="text-danger">*</span></label>
                <div class="option-pills">
                  <button
                    type="button"
                    class="opt-pill flex-grow-1"
                    :class="{ active: form.currency === 'USD' }"
                    @click="form.currency = 'USD'"
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    class="opt-pill flex-grow-1"
                    :class="{ active: form.currency === 'KHR' }"
                    @click="form.currency = 'KHR'"
                  >
                    KHR (៛)
                  </button>
                </div>
              </div>

              <div class="col-7">
                <label class="form-label-clean">
                  {{ $t('expenses.amountLabel', { currency: form.currency }) }} <span class="text-danger">*</span>
                </label>
                <input
                  v-model.number="form.amount"
                  type="number"
                  :step="form.currency === 'USD' ? '0.01' : '100'"
                  min="0.01"
                  class="form-control form-control-clean fw-bold"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('expenses.descriptionLabel') }} <span class="text-danger">*</span></label>
              <textarea
                v-model="form.description"
                rows="2"
                class="form-control form-control-clean"
                :placeholder="$t('expenses.descriptionPlaceholder')"
                maxlength="500"
                required
              ></textarea>
            </div>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="btn btn-light-coffee" @click="showFormModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-coffee flex-grow-1" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1"></span>
              {{ editingExpense ? $t('common.saveChanges') : $t('expenses.recordExpense') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL 2: VOID EXPENSE ================= -->
    <div v-if="showVoidModal && voidingExpense" class="modal-backdrop-custom" @click.self="showVoidModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold text-danger">{{ $t('expenses.voidExpenseTitle', { id: voidingExpense.id }) }}</h6>
          <button type="button" class="btn-close-custom" @click="showVoidModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleConfirmVoid">
          <div class="modal-body-custom">
            <p class="small text-muted mb-3">
              {{
                $t('expenses.voidExpenseDesc', {
                  amount:
                    voidingExpense.currency === 'USD'
                      ? formatUsd(voidingExpense.amount)
                      : formatKhr(voidingExpense.amount),
                  category: voidingExpense.category,
                })
              }}
            </p>

            <label class="form-label-clean">{{ $t('expenses.voidReasonLabel') }} <span class="text-danger">*</span></label>
            <textarea
              v-model="voidReason"
              rows="2"
              class="form-control form-control-clean"
              :placeholder="$t('expenses.voidReasonPlaceholder')"
              minlength="3"
              maxlength="255"
              required
            ></textarea>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="btn btn-light-coffee" @click="showVoidModal = false">
              {{ $t('expenses.keepActive') }}
            </button>
            <button type="submit" class="btn btn-danger flex-grow-1" :disabled="isVoiding">
              <span v-if="isVoiding" class="spinner-border spinner-border-sm me-1"></span>
              {{ $t('expenses.confirmVoid') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api/api'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'

const appStore = useAppStore()
const authStore = useAuthStore()
const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()
const { formatDateTime } = useFormatDate()

const expenseCategories = ref([
  'INGREDIENTS',
  'SUPPLIES',
  'UTILITIES',
  'MAINTENANCE',
  'SALARY',
  'MARKETING',
  'RENT',
  'EQUIPMENT',
  'OTHER',
])

const expensesList = ref([])
const isLoading = ref(false)
const pagination = reactive({
  current_page: 1,
  limit: 20,
  total_items: 0,
  total_pages: 1,
})

const summaryTotals = reactive({
  total_usd: 0,
  total_khr: 0,
  cash_usd: 0,
  cash_khr: 0,
  total_equivalent_usd: 0,
})

const filters = reactive({
  search: '',
  category: '',
  payment_method: '',
  currency: '',
  status: '',
  start_date: '',
  end_date: '',
  currentShiftOnly: false,
})

// Modal States
const showFormModal = ref(false)
const editingExpense = ref(null)
const isSubmitting = ref(false)
const form = reactive({
  category: 'SUPPLIES',
  payment_method: 'CASH',
  currency: 'USD',
  amount: null,
  description: '',
})

const showVoidModal = ref(false)
const voidingExpense = ref(null)
const voidReason = ref('')
const isVoiding = ref(false)

// ================= METHODS =================
const canManageExpense = (exp) => {
  if (authStore.isOwner) return true
  return Number(exp.created_by) === Number(authStore.user?.id)
}

const setStatusFilter = (status) => {
  filters.status = status
  applyFilters()
}

const fetchCategories = async () => {
  try {
    const res = await api.get('/expenses/categories')
    if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
      expenseCategories.value = res.data.data
    }
  } catch {
    // keep default
  }
}

const fetchSummary = async () => {
  try {
    const params = {}
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    if (filters.currentShiftOnly && appStore.currentShift?.id) {
      params.shift_id = appStore.currentShift.id
    }

    const res = await api.get('/expenses/summary', { params })
    if (res.data?.data?.totals) {
      Object.assign(summaryTotals, res.data.data.totals)
    }
  } catch {
    // ignore
  }
}

const fetchExpenses = async (page = 1) => {
  isLoading.value = true
  try {
    const params = {
      page,
      limit: pagination.limit,
    }
    if (filters.search?.trim()) params.search = filters.search.trim()
    if (filters.category) params.category = filters.category
    if (filters.payment_method) params.payment_method = filters.payment_method
    if (filters.currency) params.currency = filters.currency
    if (filters.status) params.status = filters.status
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    if (filters.currentShiftOnly && appStore.currentShift?.id) {
      params.shift_id = appStore.currentShift.id
    }

    const res = await api.get('/expenses', { params })
    expensesList.value = res.data?.data || []
    if (res.data?.pagination) {
      Object.assign(pagination, res.data.pagination)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load expenses')
  } finally {
    isLoading.value = false
  }
}

const applyFilters = () => {
  fetchExpenses(1)
  fetchSummary()
}

const toggleCurrentShiftOnly = () => {
  filters.currentShiftOnly = !filters.currentShiftOnly
  applyFilters()
}

const resetFilters = () => {
  filters.search = ''
  filters.category = ''
  filters.payment_method = ''
  filters.currency = ''
  filters.status = ''
  filters.start_date = ''
  filters.end_date = ''
  filters.currentShiftOnly = false
  applyFilters()
}

// Create / Edit Modal
const openCreateModal = () => {
  editingExpense.value = null
  form.category = expenseCategories.value[0] || 'SUPPLIES'
  form.payment_method = appStore.hasOpenShift ? 'CASH' : 'KHQR'
  form.currency = 'USD'
  form.amount = null
  form.description = ''
  showFormModal.value = true
}

const openEditModal = (exp) => {
  editingExpense.value = exp
  form.category = exp.category
  form.payment_method = exp.payment_method
  form.currency = exp.currency
  form.amount = Number(exp.amount)
  form.description = exp.description
  showFormModal.value = true
}

const handleSaveExpense = async () => {
  if (!form.amount || Number(form.amount) <= 0) {
    toast.warning('Expense amount must be greater than 0')
    return
  }
  if (!form.description.trim()) {
    toast.warning('Please enter an expense description')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      category: form.category,
      payment_method: form.payment_method,
      currency: form.currency,
      amount: Number(form.amount),
      description: form.description.trim(),
    }

    if (editingExpense.value) {
      await api.put(`/expenses/${editingExpense.value.id}`, payload)
      toast.success('Expense updated successfully')
    } else {
      if (appStore.currentShift?.id) {
        payload.shift_id = appStore.currentShift.id
      }
      await api.post('/expenses', payload)
      toast.success('Expense recorded successfully')
    }

    showFormModal.value = false
    await Promise.all([
      fetchExpenses(pagination.current_page),
      fetchSummary(),
      appStore.fetchCurrentShift(),
    ])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save expense')
  } finally {
    isSubmitting.value = false
  }
}

// Void Modal
const openVoidModal = (exp) => {
  voidingExpense.value = exp
  voidReason.value = ''
  showVoidModal.value = true
}

const handleConfirmVoid = async () => {
  if (!voidReason.value || voidReason.value.trim().length < 3) {
    toast.warning('Void reason must be at least 3 characters')
    return
  }

  isVoiding.value = true
  try {
    await api.post(`/expenses/${voidingExpense.value.id}/void`, {
      void_reason: voidReason.value.trim(),
    })
    toast.success(`Expense #${voidingExpense.value.id} voided`)
    showVoidModal.value = false

    await Promise.all([
      fetchExpenses(pagination.current_page),
      fetchSummary(),
      appStore.fetchCurrentShift(),
    ])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to void expense')
  } finally {
    isVoiding.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchCategories(),
    appStore.fetchCurrentShift(),
    fetchExpenses(1),
    fetchSummary(),
  ])
})
</script>

<style scoped>
.page-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.85rem;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 14px;
  padding: 0.9rem 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.bg-coffee-soft {
  background: #f4eee8;
  color: #2d5a43;
}

.bg-warning-soft {
  background: #fef3c7;
  color: #b45309;
}

.bg-info-soft {
  background: #e0f2fe;
  color: #0369a1;
}

.kpi-label {
  font-size: 0.74rem;
  color: #78716c;
  font-weight: 600;
}

.kpi-value {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1c1917;
  line-height: 1.2;
}

.kpi-sub {
  font-size: 0.7rem;
  color: #8a7f78;
}

.expenses-nav-tabs {
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
}

.nav-tab-btn {
  border: none;
  background: transparent;
  padding: 0.65rem 0.25rem;
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface-variant, #716762);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
  cursor: pointer;
}

.nav-tab-btn:hover {
  color: var(--on-surface, #1c1b1b);
}

.nav-tab-btn.active {
  color: var(--primary, #2d5a43);
  font-weight: 600;
  border-bottom-color: var(--primary, #2d5a43);
}

.tab-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface-variant, #504440);
}

.nav-tab-btn.active .tab-badge {
  background-color: var(--primary, #2d5a43);
  color: #ffffff;
}

.total-summary-tag {
  font-size: 13px;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.clean-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
}

.filter-bar {
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid #eeeae4;
  background: #fcfbfa;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.search-wrap {
  position: relative;
  min-width: 210px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #8a7f78;
  font-size: 0.8rem;
}

.search-input {
  padding-left: 30px;
  border-radius: 9px;
  border: 1px solid #dedad4;
}

.filter-select,
.filter-date {
  width: auto;
  border-radius: 9px;
  border: 1px solid #dedad4;
}

.clean-table th {
  background: #faf9f7;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #6b5b52;
  font-weight: 700;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eeeae4;
}

.clean-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f0ec;
  font-size: 0.85rem;
}

.row-voided {
  background: #fafaf9;
  opacity: 0.75;
}

.cat-badge {
  background: #edf7f1;
  border: 1px solid #f5d0b5;
  color: #2d5a43;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
}

.method-pill {
  background: #f4f1ed;
  color: #4f433d;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.status-pill.active {
  background: #dcfce7;
  color: #15803d;
}

.status-pill.voided {
  background: #fee2e2;
  color: #b91c1c;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
}

.btn-action-icon:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.btn-action-icon--danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.pagination-bar {
  padding: 0.75rem 1.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fcfbfa;
}

.empty-box {
  padding: 3.5rem 1rem;
  text-align: center;
}

.btn-coffee {
  background: #2d5a43;
  color: #ffffff;
  border: none;
  border-radius: 9px;
  font-weight: 600;
}

.btn-light-coffee {
  background: #f4f1ed;
  color: #2d5a43;
  border: 1px solid #e6e1da;
  border-radius: 9px;
  font-weight: 600;
}

/* Modal */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(28, 25, 23, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 1rem;
}

.modal-card-custom {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e6e4e0;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
}

.modal-sm-custom {
  max-width: 440px;
}

.modal-header-custom {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #eeeae4;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body-custom {
  padding: 1.15rem 1.25rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid #eeeae4;
  background: #faf9f7;
  display: flex;
  gap: 0.5rem;
}

.btn-close-custom {
  border: none;
  background: #f4f1ed;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.form-label-clean {
  font-size: 0.78rem;
  font-weight: 700;
  color: #4f433d;
  margin-bottom: 0.35rem;
  display: block;
}

.form-control-clean {
  border-radius: 10px;
  border: 1px solid #dedad4;
  background: #faf9f7;
  font-size: 0.86rem;
}

.option-pills {
  display: flex;
  gap: 0.4rem;
}

.opt-pill {
  border: 1px solid #e2ddd6;
  background: #faf9f7;
  color: #4f433d;
  border-radius: 9px;
  padding: 0.4rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.opt-pill.active {
  background: #2d5a43;
  color: #ffffff;
  border-color: #2d5a43;
}
</style>
