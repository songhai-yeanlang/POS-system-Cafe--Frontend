<template>
  <div class="expenses-page">
    <!-- Top Segmented Tabs & Summary Action Bar -->
    <div class="expenses-top-bar">
      <!-- Status Segmented Tabs -->
      <div class="expenses-segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: filters.status === '' }"
          @click="setStatusFilter('')"
        >
          <i class="bi bi-wallet2"></i>
          <span>{{ $t('expenses.allExpenses') }}</span>
          <span v-if="filters.status === '' && pagination.total_items > 0" class="seg-tab-count tabular">
            {{ pagination.total_items }}
          </span>
        </button>
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: filters.status === 'ACTIVE' }"
          @click="setStatusFilter('ACTIVE')"
        >
          <span class="seg-tab-dot active"></span>
          <span>{{ $t('expenses.active') }}</span>
          <span v-if="filters.status === 'ACTIVE' && pagination.total_items > 0" class="seg-tab-count tabular">
            {{ pagination.total_items }}
          </span>
        </button>
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: filters.status === 'VOIDED' }"
          @click="setStatusFilter('VOIDED')"
        >
          <span class="seg-tab-dot voided"></span>
          <span>{{ $t('expenses.voided') }}</span>
          <span v-if="filters.status === 'VOIDED' && pagination.total_items > 0" class="seg-tab-count tabular">
            {{ pagination.total_items }}
          </span>
        </button>
      </div>

      <!-- Right Summary Pill & Primary Record Action -->
      <div class="expenses-top-bar__right">
        <div class="expense-summary-pill tabular">
          <i class="bi bi-calculator"></i>
          <span class="expense-summary-pill__label">{{ $t('common.total') }}:</span>
          <strong class="expense-summary-pill__usd">{{ formatUsd(summaryTotals.total_equivalent_usd) }}</strong>
          <span v-if="summaryTotals.total_khr > 0" class="expense-summary-pill__khr">
            ({{ Number(summaryTotals.total_khr).toLocaleString() }} ៛)
          </span>
        </div>

        <button
          type="button"
          class="btn-record-expense"
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
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="filters.search"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('expenses.searchPlaceholder')"
              @keyup.enter="applyFilters"
            />
            <button
              v-if="filters.search"
              type="button"
              class="search-clear"
              @click="filters.search = ''; applyFilters()"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <select
            v-model="filters.category"
            class="filter-input filter-select"
            @change="applyFilters"
          >
            <option value="">{{ $t('common.allCategories') }}</option>
            <option v-for="cat in expenseCategories" :key="cat" :value="cat">
              {{ getCategoryLabel(cat) }}
            </option>
          </select>

          <select
            v-model="filters.payment_method"
            class="filter-input filter-select"
            @change="applyFilters"
          >
            <option value="">{{ $t('common.allMethods') }}</option>
            <option value="CASH">{{ $t('common.cash') }}</option>
            <option value="KHQR">{{ $t('common.khqr') }}</option>
            <option value="BANK_TRANSFER">{{ $t('common.bankTransfer') }}</option>
          </select>

          <div class="date-range-group">
            <i class="bi bi-calendar3 date-range-group__icon"></i>
            <input
              v-model="filters.start_date"
              type="date"
              class="date-range-group__input"
              @change="applyFilters"
            />
            <span class="date-range-group__sep">→</span>
            <input
              v-model="filters.end_date"
              type="date"
              class="date-range-group__input"
              @change="applyFilters"
            />
          </div>
        </div>

        <div class="filter-bar__right">
          <button
            v-if="appStore.currentShift?.id"
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': filters.currentShiftOnly }"
            @click="toggleCurrentShiftOnly"
          >
            <i class="bi bi-clock-history"></i>
            <span>{{ $t('expenses.currentShift') }}</span>
          </button>

          <button
            type="button"
            class="toolbar-btn"
            :title="$t('common.reset')"
            @click="resetFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.reset') }}</span>
          </button>
        </div>
      </div>

      <!-- Loading / Empty / Table -->
      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('expenses.loadingExpenses') }}</div>
      </div>

      <div v-else-if="expensesList.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-wallet2"></i>
        </div>
        <div class="empty-box__title">{{ $t('expenses.noExpensesFound') }}</div>
        <div class="empty-box__desc">{{ $t('expenses.noExpensesFoundDesc') }}</div>
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
                <div class="date-cell tabular">
                  <span class="date-cell__time">{{ formatDateTime(exp.incurred_at) }}</span>
                  <span v-if="exp.shift_id" class="date-cell__shift">
                    {{ $t('receipt.shift') }} #{{ exp.shift_id }}
                  </span>
                </div>
              </td>
              <td>
                <span class="cat-text">{{ getCategoryLabel(exp.category, true) }}</span>
              </td>
              <td>
                <div class="desc-text">{{ exp.description }}</div>
                <div v-if="exp.status === 'VOIDED' && exp.void_reason" class="void-reason-text">
                  {{ $t('expenses.voided') }}: {{ exp.void_reason }}
                </div>
              </td>
              <td>
                <span class="method-text">
                  <i
                    :class="
                      exp.payment_method === 'CASH'
                        ? 'bi bi-cash-stack'
                        : exp.payment_method === 'KHQR'
                          ? 'bi bi-qr-code-scan'
                          : 'bi bi-bank'
                    "
                  ></i>
                  <span>{{ getMethodLabel(exp.payment_method) }}</span>
                </span>
              </td>
              <td>
                <div
                  class="amount-cell tabular"
                  :class="{ 'is-voided': exp.status === 'VOIDED' }"
                >
                  <strong class="amount-cell__main">
                    {{ exp.currency === 'USD' ? formatUsd(exp.amount) : formatKhr(exp.amount) }}
                  </strong>
                  <span v-if="exp.currency === 'USD'" class="amount-cell__sub">
                    {{ formatKhr(usdToKhr(exp.amount)) }}
                  </span>
                </div>
              </td>
              <td>
                <span class="recorder-name">{{ exp.created_by_name }}</span>
              </td>
              <td>
                <span
                  class="status-text"
                  :class="exp.status === 'ACTIVE' ? 'active' : 'voided'"
                >
                  {{ exp.status === 'ACTIVE' ? $t('expenses.active') : $t('expenses.voided') }}
                </span>
              </td>
              <td class="text-end">
                <div v-if="exp.status === 'ACTIVE' && canManageExpense(exp)" class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.edit')"
                    @click="openEditModal(exp)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-action-icon is-danger"
                    :title="$t('common.delete')"
                    @click="openVoidModal(exp)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
                <div v-else-if="exp.status === 'VOIDED' && authStore.isOwner" class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon is-danger"
                    :title="$t('expenses.confirmDelete')"
                    @click="openDeleteModal(exp)"
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
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: pagination.current_page, total: pagination.total_pages }) }}
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.current_page <= 1"
            @click="fetchExpenses(pagination.current_page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.current_page >= pagination.total_pages"
            @click="fetchExpenses(pagination.current_page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
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
              class="shift-warn-banner mb-3"
            >
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ $t('expenses.cashShiftWarning') }}</span>
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('expenses.categoryLabel') }} <span class="text-danger">*</span></label>
              <select v-model="form.category" class="form-select form-control-clean" required>
                <option v-for="cat in expenseCategories" :key="cat" :value="cat">
                  {{ getCategoryLabel(cat) }}
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
                  <i class="bi bi-cash-stack"></i>
                  <span>{{ $t('common.cash') }}</span>
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: form.payment_method === 'KHQR' }"
                  @click="form.payment_method = 'KHQR'"
                >
                  <i class="bi bi-qr-code-scan"></i>
                  <span>{{ $t('common.khqr') }}</span>
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: form.payment_method === 'BANK_TRANSFER' }"
                  @click="form.payment_method = 'BANK_TRANSFER'"
                >
                  <i class="bi bi-bank"></i>
                  <span>{{ $t('common.bankTransfer') }}</span>
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
                  :step="form.currency === 'USD' ? '0.01' : '1'"
                  :min="form.currency === 'USD' ? '0.01' : '1'"
                  class="form-control form-control-clean fw-bold tabular"
                  :placeholder="form.currency === 'USD' ? '0.00' : '1000'"
                  required
                />
              </div>
            </div>

            <div class="mb-1">
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
            <button type="button" class="toolbar-btn" @click="showFormModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn-coffee flex-grow-1" :disabled="isSubmitting">
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
                  category: getCategoryLabel(voidingExpense.category),
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
            <button type="button" class="toolbar-btn" @click="showVoidModal = false">
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

    <!-- ================= MODAL 3: PERMANENT DELETE VOIDED EXPENSE (OWNER ONLY) ================= -->
    <div v-if="showDeleteModal && deletingExpense" class="modal-backdrop-custom" @click.self="showDeleteModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold text-danger">{{ $t('expenses.deleteVoidedTitle', { id: deletingExpense.id }) }}</h6>
          <button type="button" class="btn-close-custom" @click="showDeleteModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleConfirmDelete">
          <div class="modal-body-custom">
            <p class="small text-muted mb-0">
              {{
                $t('expenses.deleteVoidedDesc', {
                  amount:
                    deletingExpense.currency === 'USD'
                      ? formatUsd(deletingExpense.amount)
                      : formatKhr(deletingExpense.amount),
                  category: getCategoryLabel(deletingExpense.category),
                })
              }}
            </p>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="toolbar-btn" @click="showDeleteModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-danger flex-grow-1" :disabled="isDeleting">
              <span v-if="isDeleting" class="spinner-border spinner-border-sm me-1"></span>
              {{ $t('expenses.confirmDelete') }}
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
import { useI18n } from '@/i18n'

const appStore = useAppStore()
const authStore = useAuthStore()
const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()
const { formatDateTime } = useFormatDate()
const { t } = useI18n()

const CATEGORY_KEY_MAP = {
  'INGREDIENTS & SUPPLIES': 'INGREDIENTS',
  'INGREDIENTS': 'INGREDIENTS',
  'SUPPLIES': 'SUPPLIES',
  'PACKAGING & CUPS': 'SUPPLIES',
  'UTILITIES': 'UTILITIES',
  'UTILITIES & INTERNET': 'UTILITIES',
  'MAINTENANCE': 'MAINTENANCE',
  'REPAIR & MAINTENANCE': 'MAINTENANCE',
  'SALARY': 'SALARY',
  'STAFF & SALARY': 'SALARY',
  'MARKETING': 'MARKETING',
  'RENT': 'RENT',
  'EQUIPMENT': 'EQUIPMENT',
  'OTHER': 'OTHER',
  'MISCELLANEOUS': 'OTHER',
}

const getCategoryLabel = (cat, short = false) => {
  if (!cat) return '—'
  const upper = String(cat).trim().toUpperCase()
  const mappedKey = CATEGORY_KEY_MAP[upper] || upper
  const key = `expenses.categories.${mappedKey}`
  const translated = t(key)
  const label = translated !== key ? translated : cat
  if (short) {
    return label.replace(/\s*\([A-Z_&\s]+\)\s*$/, '').trim()
  }
  return label
}

const getMethodLabel = (method) => {
  if (method === 'CASH') return t('common.cash')
  if (method === 'KHQR') return t('common.khqr')
  if (method === 'BANK_TRANSFER') return t('common.bankTransfer')
  return method || '—'
}

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

const showDeleteModal = ref(false)
const deletingExpense = ref(null)
const isDeleting = ref(false)

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

// Permanent Delete Modal (OWNER only for VOIDED expenses)
const openDeleteModal = (exp) => {
  deletingExpense.value = exp
  showDeleteModal.value = true
}

const handleConfirmDelete = async () => {
  if (!deletingExpense.value) return
  isDeleting.value = true
  try {
    await api.delete(`/expenses/${deletingExpense.value.id}`)
    toast.success(`Expense #${deletingExpense.value.id} deleted permanently`)
    showDeleteModal.value = false

    const nextPage =
      expensesList.value.length === 1 && pagination.current_page > 1
        ? pagination.current_page - 1
        : pagination.current_page

    await Promise.all([
      fetchExpenses(nextPage),
      fetchSummary(),
      appStore.fetchCurrentShift(),
    ])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete expense')
  } finally {
    isDeleting.value = false
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
.expenses-page {
  --botanical-primary: #2d5a43;
  --botanical-deep: #193e2b;
  --botanical-tint: #eaf5ee;
  --botanical-border: #3b7054;
  --ledger-line: #dce6e0;
  --ledger-hairline: #ecf2ee;
  --roast-ink: #1e2a23;
  --sage-muted: #62756a;

  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* ── Top Bar: Segmented Status Tabs & Summary Actions ── */
.expenses-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.expenses-segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #e9f0ec;
  border: 1px solid var(--ledger-line);
  border-radius: 10px;
}

.seg-tab-btn {
  border: none;
  background: transparent;
  padding: 0.44rem 0.95rem;
  border-radius: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4f6356;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-tab-btn i {
  font-size: 0.9rem;
}

.seg-tab-btn:hover:not(.active) {
  color: var(--roast-ink);
  background: rgba(255, 255, 255, 0.5);
}

.seg-tab-btn.active {
  background: #ffffff;
  color: var(--botanical-deep);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(20, 35, 26, 0.08);
}

.seg-tab-count {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.08rem 0.42rem;
  border-radius: 999px;
  background: var(--botanical-tint);
  color: var(--botanical-primary);
}

.seg-tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.seg-tab-dot.active {
  background: #16a34a;
}

.seg-tab-dot.voided {
  background: #dc2626;
}

/* ── Top Right Summary & Primary CTA ── */
.expenses-top-bar__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.expense-summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 38px;
  padding: 0 0.95rem;
  border-radius: 9px;
  background: #f3f9f5;
  border: 1.5px solid #cde2d5;
  color: var(--roast-ink);
}

.expense-summary-pill i {
  color: var(--botanical-primary);
  font-size: 0.92rem;
}

.expense-summary-pill__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #4f6356;
}

.expense-summary-pill__usd {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--botanical-deep);
}

.expense-summary-pill__khr {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.btn-record-expense {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  height: 38px;
  padding: 0 1.05rem;
  border-radius: 9px;
  background: var(--botanical-primary);
  border: 1px solid var(--botanical-primary);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.16);
}

.btn-record-expense:hover {
  background: var(--botanical-deep);
  border-color: var(--botanical-deep);
}

/* ── Main Ledger Card & Filter Toolbar ── */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.filter-bar {
  padding: 0.78rem 1.05rem;
  border-bottom: 1px solid var(--ledger-hairline);
  background: #f8fbf9;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.filter-bar__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  flex: 1;
}

.filter-bar__right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.search-wrap {
  position: relative;
  min-width: 245px;
  flex: 0 1 285px;
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sage-muted);
  font-size: 0.8rem;
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--sage-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  cursor: pointer;
}

.search-clear:hover {
  background: #e8f0eb;
  color: var(--roast-ink);
}

.filter-input {
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
  font-size: 0.81rem;
  font-weight: 500;
  padding: 0 0.75rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}

.filter-input:focus {
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.search-input {
  width: 100%;
  padding-left: 32px;
  padding-right: 28px;
}

.filter-select {
  padding-right: 1.85rem;
  cursor: pointer;
}

/* Unified Date Range Pill */
.date-range-group {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.65rem;
  background: #ffffff;
  border: 1.5px solid #dce6e0;
  border-radius: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
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
  outline: none;
}

.date-range-group__sep {
  color: #94a89c;
  font-size: 0.75rem;
  padding: 0 2px;
}

/* Toolbar Buttons */
.toolbar-btn {
  height: 36px;
  padding: 0 0.8rem;
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

.toolbar-btn:hover:not(:disabled):not(.is-active) {
  border-color: #b8ccc0;
  background: #f2f7f4;
  color: var(--roast-ink);
}

.toolbar-btn.is-active {
  background: var(--botanical-tint);
  border-color: var(--botanical-border);
  color: var(--botanical-deep);
  font-weight: 700;
}

.toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Table Styling ── */
.clean-table th {
  background: #f4f8f5;
  font-size: 0.75rem;
  color: #4f6356;
  font-weight: 700;
  padding: 0.72rem 1rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.78rem 1rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.84rem;
  color: var(--roast-ink);
}

.clean-table tbody tr:hover td {
  background-color: #f8fbf9;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.row-voided td {
  background: #fafcfb;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-cell__time {
  font-weight: 600;
  color: var(--roast-ink);
  font-size: 0.81rem;
  white-space: nowrap;
}

.date-cell__shift {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--sage-muted);
  white-space: nowrap;
}

.cat-text {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--roast-ink);
  white-space: nowrap;
}

.desc-text {
  font-weight: 600;
  color: var(--roast-ink);
  line-height: 1.4;
}

.void-reason-text {
  font-size: 0.76rem;
  font-weight: 500;
  color: #dc2626;
  margin-top: 0.25rem;
  line-height: 1.35;
}

.method-text {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--roast-ink);
  white-space: nowrap;
}

.method-text i {
  color: var(--botanical-primary);
  font-size: 0.95rem;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  white-space: nowrap;
}

.amount-cell__main {
  font-weight: 800;
  color: var(--botanical-deep);
  font-size: 0.88rem;
}

.amount-cell__sub {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--sage-muted);
}

.amount-cell.is-voided .amount-cell__main {
  color: #7c8b82;
  text-decoration: line-through;
}

.recorder-name {
  font-size: 0.81rem;
  font-weight: 600;
  color: #35473c;
  white-space: nowrap;
}

/* Status Text */
.status-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-text.active {
  color: #166534;
}

.status-text.voided {
  color: #dc2626;
}

/* Table Actions */
.action-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.btn-action-icon {
  width: 31px;
  height: 31px;
  border-radius: 7px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: #465a4e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  transition: all 0.14s ease;
  cursor: pointer;
}

.btn-action-icon:hover {
  background: var(--botanical-tint);
  border-color: var(--botanical-border);
  color: var(--botanical-deep);
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

/* Pagination */
.pagination-bar {
  padding: 0.72rem 1.05rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fbf9;
  border-top: 1px solid var(--ledger-hairline);
}

.pagination-info {
  font-size: 0.8rem;
  font-weight: 600;
  color: #3d5245;
}

/* Empty State */
.empty-box {
  padding: 3.5rem 1.25rem;
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
  font-size: 0.8rem;
  color: var(--sage-muted);
}

/* ── Modals ── */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(18, 28, 22, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 1rem;
}

.modal-card-custom {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid var(--ledger-line);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(15, 28, 21, 0.16);
}

.modal-sm-custom {
  max-width: 450px;
}

.modal-header-custom {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--ledger-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body-custom {
  padding: 1.2rem 1.25rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--ledger-hairline);
  background: #f8fbf9;
  display: flex;
  gap: 0.55rem;
}

.btn-close-custom {
  border: 1px solid var(--ledger-line);
  background: #f8fbf9;
  color: #4f6356;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-close-custom:hover {
  background: #eaf5ee;
  color: var(--botanical-deep);
}

.shift-warn-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  font-size: 0.78rem;
  font-weight: 500;
}

.form-label-clean {
  font-size: 0.78rem;
  font-weight: 700;
  color: #35473c;
  margin-bottom: 0.35rem;
  display: block;
}

.form-control-clean {
  border-radius: 9px;
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  font-size: 0.85rem;
  color: var(--roast-ink);
}

.form-control-clean:focus {
  background: #ffffff;
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.option-pills {
  display: flex;
  gap: 0.45rem;
}

.opt-pill {
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  color: #3d5245;
  border-radius: 9px;
  padding: 0.44rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.opt-pill:hover:not(.active) {
  background: #f2f7f4;
  border-color: #b8ccc0;
}

.opt-pill.active {
  background: var(--botanical-primary);
  color: #ffffff;
  border-color: var(--botanical-primary);
}

.btn-coffee {
  background: var(--botanical-primary);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  height: 36px;
  padding: 0 1rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-coffee:hover:not(:disabled) {
  background: var(--botanical-deep);
  color: #ffffff;
}
</style>
