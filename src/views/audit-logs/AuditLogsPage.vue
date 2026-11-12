<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/api/api'
import { useI18n } from '@/i18n'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'
import { useCurrency } from '@/composables/useCurrency'

const { t, isKhmer } = useI18n()
const toast = useToast()
const { formatDateTime } = useFormatDate()
const { formatUsd, formatKhr } = useCurrency()

// ================= STATE =================
const logs = ref([])
const usersList = ref([])
const isLoading = ref(false)
const searchQuery = ref('')

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
})

const filters = reactive({
  table_name: '',
  action: '',
  user_id: '',
  start_date: '',
  end_date: '',
  limit: 20,
})

// Detail Modal State
const showDetailModal = ref(false)
const selectedLog = ref(null)
const isLoadingSingleLog = ref(false)
const showRawJson = ref(false)

// ================= OPTIONS =================
const moduleKeys = [
  'orders',
  'payments',
  'refunds',
  'shifts',
  'products',
  'categories',
  'ingredients',
  'stock_movements',
  'recipes',
  'expenses',
  'users',
  'settings',
  'refresh_tokens',
  'password_resets',
]

const actionGroups = [
  {
    key: 'pos',
    actions: [
      'CREATE_ORDER',
      'UPDATE_ORDER',
      'CANCEL_ORDER',
      'PROCESS_PAYMENT',
      'PROCESS_REFUND',
    ],
  },
  {
    key: 'shifts',
    actions: ['OPEN_SHIFT', 'CLOSE_SHIFT'],
  },
  {
    key: 'inventory',
    actions: [
      'CREATE_INGREDIENT',
      'UPDATE_INGREDIENT',
      'DELETE_INGREDIENT',
      'STOCK_IN',
      'STOCK_WASTE',
      'STOCK_ADJUST',
      'UPDATE_RECIPE',
      'DELETE_RECIPE',
    ],
  },
  {
    key: 'products',
    actions: [
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'DELETE_PRODUCT',
      'UPLOAD_PRODUCT_IMAGE',
      'DELETE_PRODUCT_IMAGE',
      'CREATE_CATEGORY',
      'UPDATE_CATEGORY',
      'DELETE_CATEGORY',
    ],
  },
  {
    key: 'expenses',
    actions: ['CREATE_EXPENSE', 'UPDATE_EXPENSE', 'VOID_EXPENSE'],
  },
  {
    key: 'security',
    actions: [
      'LOGIN',
      'LOGIN_FAILED',
      'LOGOUT',
      'LOGOUT_ALL',
      'CHANGE_PASSWORD',
      'CHANGE_PASSWORD_FAILED',
      'FORGOT_PASSWORD_REQUEST',
      'VERIFY_OTP_SUCCESS',
      'RESET_PASSWORD',
      'SECURITY_ALERT_TOKEN_REUSE',
    ],
  },
  {
    key: 'admin',
    actions: [
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'UPDATE_PROFILE',
      'UPDATE_SETTINGS',
      'UPLOAD_LOGO',
      'DELETE_LOGO',
    ],
  },
]

// ================= HELPERS =================
const getModuleLabel = (table) => {
  if (!table) return t('common.system')
  const key = `auditLogs.modules.${table}`
  const translated = t(key)
  if (translated !== key) return translated
  return String(table).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const getActionLabel = (action = '') => {
  if (!action) return '—'
  const key = `auditLogs.actions.${action}`
  const translated = t(key)
  if (translated !== key) return translated
  return String(action).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const getRoleLabel = (role) => {
  if (!role) return ''
  return role === 'OWNER' ? t('common.owner') : t('common.staff')
}

const formatIpAddress = (ip) => {
  if (!ip) return '127.0.0.1'
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1'
  return ip.replace('::ffff:', '')
}

const parseDetailsObject = (details) => {
  if (!details) return null
  if (typeof details === 'object') return details
  try {
    return JSON.parse(details)
  } catch {
    return null
  }
}

const isCriticalAction = (action = '') => {
  return (
    action.includes('FAILED') ||
    action.includes('ALERT') ||
    action.includes('DELETE') ||
    action.includes('CANCEL') ||
    action.includes('VOID') ||
    action.includes('REFUND') ||
    action === 'STOCK_WASTE'
  )
}

const getActionToneClass = (action = '') => {
  if (isCriticalAction(action)) return 'tone-danger'
  if (
    action.startsWith('CREATE_') ||
    action === 'OPEN_SHIFT' ||
    action === 'PROCESS_PAYMENT' ||
    action === 'LOGIN' ||
    action === 'STOCK_IN' ||
    action === 'VERIFY_OTP_SUCCESS'
  ) {
    return 'tone-success'
  }
  if (
    action.startsWith('UPDATE_') ||
    action.startsWith('UPLOAD_') ||
    action === 'CLOSE_SHIFT' ||
    action === 'CHANGE_PASSWORD' ||
    action === 'RESET_PASSWORD' ||
    action === 'STOCK_ADJUST'
  ) {
    return 'tone-warning'
  }
  return 'tone-neutral'
}

const DETAIL_KEY_LABELS_KM = {
  name: 'ឈ្មោះ',
  email: 'អ៊ីមែល',
  role: 'តួនាទី',
  receipt_no: 'លេខវិក្កយបត្រ',
  receipt_number: 'លេខវិក្កយបត្រ',
  order_number: 'លេខកម្មង់',
  category: 'ប្រភេទ',
  description: 'បរិយាយ',
  reason: 'មូលហេតុ',
  unit: 'ខ្នាត',
  current_stock: 'ស្តុកបច្ចុប្បន្ន',
  minimum_stock: 'ស្តុកអប្បបរមា',
  quantity: 'បរិមាណ',
  opening_cash_usd: 'ប្រាក់ដើមគ្រា (USD)',
  opening_cash_khr: 'ប្រាក់ដើមគ្រា (KHR)',
  expected_cash_usd: 'ប្រាក់រំពឹងទុក (USD)',
  expected_cash_khr: 'ប្រាក់រំពឹងទុក (KHR)',
  actual_cash_usd: 'ប្រាក់រាប់ជាក់ស្ដែង (USD)',
  actual_cash_khr: 'ប្រាក់រាប់ជាក់ស្ដែង (KHR)',
  amount_usd: 'ទឹកប្រាក់ (USD)',
  amount_khr: 'ទឹកប្រាក់ (KHR)',
  total_usd: 'សរុប (USD)',
  changedFields: 'ចំណុចដែលបានកែប្រែ',
  deactivated: 'ផ្អាកគណនី',
  is_active: 'ដំណើរការគណនី',
  passwordReset: 'កំណត់ពាក្យសម្ងាត់ថ្មី',
  closed_by: 'អ្នកបិទវេន',
  opened_by: 'អ្នកបើកវេន',
  shop_name: 'ឈ្មោះហាង',
  exchange_rate: 'អត្រាប្តូរប្រាក់',
}

const formatKeyLabel = (key) => {
  if (isKhmer.value && DETAIL_KEY_LABELS_KM[key]) {
    return DETAIL_KEY_LABELS_KM[key]
  }
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const formatDetailValue = (key, val) => {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') {
    return val ? (isKhmer.value ? 'បាទ/ចាស' : 'Yes') : (isKhmer.value ? 'ទេ' : 'No')
  }
  if (Array.isArray(val)) {
    return val.map((item) => formatKeyLabel(String(item))).join(', ')
  }
  if (typeof val === 'number') {
    if (key.endsWith('_usd')) return formatUsd(val)
    if (key.endsWith('_khr')) return formatKhr(val)
  }
  return String(val)
}

const formatReadableSummary = (log) => {
  const details = log?.details
  if (!details) return '—'
  const obj = parseDetailsObject(details)
  if (!obj || typeof obj !== 'object') return String(details)

  const parts = []

  // Common human-first identifiers
  const titleVal = obj.receipt_no || obj.receipt_number || obj.order_number || obj.name || obj.product_name || obj.category_name
  if (titleVal) parts.push(String(titleVal))
  if (obj.email && !parts.includes(obj.email)) parts.push(obj.email)

  // Changed fields summary
  if (Array.isArray(obj.changedFields) && obj.changedFields.length > 0) {
    const label = isKhmer.value
      ? `កែប្រែ ${obj.changedFields.length} ចំណុច`
      : `Updated ${obj.changedFields.length} field${obj.changedFields.length > 1 ? 's' : ''}`
    parts.push(label)
  }

  // Cash shift amounts
  if (obj.opening_cash_usd !== undefined || obj.opening_cash_khr !== undefined) {
    const usd = formatUsd(obj.opening_cash_usd || 0)
    const khr = formatKhr(obj.opening_cash_khr || 0)
    parts.push(`${isKhmer.value ? 'ដើមគ្រា' : 'Opening'} ${usd} / ${khr}`)
  } else if (obj.expected_cash_usd !== undefined || obj.expected_cash_khr !== undefined) {
    const usd = formatUsd(obj.expected_cash_usd || 0)
    const khr = formatKhr(obj.expected_cash_khr || 0)
    parts.push(`${isKhmer.value ? 'រំពឹងទុក' : 'Expected'} ${usd} / ${khr}`)
  }

  // Expense / payment amount + note
  if (obj.amount_usd !== undefined && Number(obj.amount_usd) > 0) {
    parts.push(formatUsd(obj.amount_usd))
  } else if (obj.total_usd !== undefined) {
    parts.push(formatUsd(obj.total_usd))
  }

  if (obj.description) parts.push(String(obj.description))
  else if (obj.reason) parts.push(String(obj.reason))
  else if (obj.category) parts.push(String(obj.category))

  // Inventory stock levels
  if (obj.current_stock !== undefined) {
    const unitStr = obj.unit ? ` ${obj.unit}` : ''
    parts.push(`${isKhmer.value ? 'ស្តុក' : 'Stock'}: ${obj.current_stock}${unitStr}`)
  } else if (obj.quantity !== undefined) {
    const unitStr = obj.unit ? ` ${obj.unit}` : ''
    parts.push(`${isKhmer.value ? 'បរិមាណ' : 'Qty'}: ${obj.quantity}${unitStr}`)
  }

  if (parts.length > 0) {
    return parts.join(' • ')
  }

  // Clean fallback for any remaining scalar fields
  const fallback = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '' || typeof v === 'object') continue
    fallback.push(`${formatKeyLabel(k)}: ${formatDetailValue(k, v)}`)
    if (fallback.length >= 2) break
  }
  return fallback.length > 0 ? fallback.join(' • ') : '—'
}

// ================= COMPUTED =================
const activeFilterCount = computed(() => {
  let count = 0
  if (filters.table_name) count++
  if (filters.action) count++
  if (filters.user_id) count++
  if (filters.start_date) count++
  if (filters.end_date) count++
  if (searchQuery.value.trim()) count++
  return count
})

const filteredLogs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return logs.value

  return logs.value.filter((log) => {
    const detailsStr =
      typeof log.details === 'string'
        ? log.details.toLowerCase()
        : JSON.stringify(log.details || {}).toLowerCase()

    return (
      String(log.id).includes(q) ||
      String(log.record_id || '').includes(q) ||
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      getActionLabel(log.action).toLowerCase().includes(q) ||
      (log.table_name && log.table_name.toLowerCase().includes(q)) ||
      getModuleLabel(log.table_name).toLowerCase().includes(q) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q)) ||
      detailsStr.includes(q)
    )
  })
})

const visiblePages = computed(() => {
  const total = pagination.totalPages || 1
  const current = pagination.page || 1
  const pages = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, start + 4)
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const parsedModalDetailsEntries = computed(() => {
  if (!selectedLog.value?.details) return []
  const obj = parseDetailsObject(selectedLog.value.details)
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).filter(([, val]) => val !== null && val !== undefined && val !== '')
})

const formattedRawJson = computed(() => {
  if (!selectedLog.value?.details) return ''
  const parsed = parseDetailsObject(selectedLog.value.details)
  if (parsed && typeof parsed === 'object') {
    return JSON.stringify(parsed, null, 2)
  }
  return String(selectedLog.value.details)
})

// ================= API CALLS =================
const fetchUsersList = async () => {
  try {
    const res = await api.get('/users')
    usersList.value = res.data?.data || []
  } catch {
    usersList.value = []
  }
}

const fetchAuditLogs = async (targetPage = 1) => {
  isLoading.value = true
  try {
    const params = {
      page: targetPage,
      limit: filters.limit || 20,
    }

    if (filters.table_name) params.table_name = filters.table_name
    if (filters.action) params.action = filters.action
    if (filters.user_id) params.user_id = Number(filters.user_id)
    if (filters.start_date) params.start_date = `${filters.start_date}T00:00:00`
    if (filters.end_date) params.end_date = `${filters.end_date}T23:59:59`

    const res = await api.get('/audit-logs', { params })
    logs.value = res.data?.data || []

    const pag = res.data?.pagination || {}
    pagination.page = pag.page || targetPage
    pagination.limit = pag.limit || filters.limit
    pagination.total = pag.total || 0
    pagination.totalPages = pag.totalPages || 1
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load audit logs')
  } finally {
    isLoading.value = false
  }
}

const resetFilters = () => {
  filters.table_name = ''
  filters.action = ''
  filters.user_id = ''
  filters.start_date = ''
  filters.end_date = ''
  searchQuery.value = ''
  fetchAuditLogs(1)
}

const openDetailModal = async (log) => {
  selectedLog.value = { ...log }
  showRawJson.value = false
  showDetailModal.value = true
  isLoadingSingleLog.value = true

  try {
    const res = await api.get(`/audit-logs/${log.id}`)
    if (res.data?.data) {
      selectedLog.value = res.data.data
    }
  } catch {
    // Keep row data if detail fetch fails
  } finally {
    isLoadingSingleLog.value = false
  }
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedLog.value = null
}

const copyJsonPayload = async () => {
  try {
    await navigator.clipboard.writeText(formattedRawJson.value)
    toast.success(t('auditLogs.copiedJson'))
  } catch {
    toast.error('Unable to copy JSON payload')
  }
}

onMounted(async () => {
  await Promise.all([fetchUsersList(), fetchAuditLogs(1)])
})
</script>

<template>
  <div class="audit-page">
    <div class="clean-card">
      <!-- Clean Filter Toolbar -->
      <div class="filter-bar">
        <div class="filter-bar__controls">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('auditLogs.filterPlaceholder')"
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

          <select
            v-model="filters.table_name"
            class="filter-input filter-select"
            @change="fetchAuditLogs(1)"
          >
            <option value="">{{ $t('auditLogs.allModules') }}</option>
            <option v-for="mod in moduleKeys" :key="mod" :value="mod">
              {{ getModuleLabel(mod) }}
            </option>
          </select>

          <select
            v-model="filters.action"
            class="filter-input filter-select filter-select--wide"
            @change="fetchAuditLogs(1)"
          >
            <option value="">{{ $t('auditLogs.allActions') }}</option>
            <optgroup
              v-for="group in actionGroups"
              :key="group.key"
              :label="$t(`auditLogs.actionGroups.${group.key}`)"
            >
              <option v-for="act in group.actions" :key="act" :value="act">
                {{ getActionLabel(act) }}
              </option>
            </optgroup>
          </select>

          <select
            v-model="filters.user_id"
            class="filter-input filter-select"
            @change="fetchAuditLogs(1)"
          >
            <option value="">{{ $t('auditLogs.allUsers') }}</option>
            <option v-for="u in usersList" :key="u.id" :value="u.id">
              {{ u.name }}
            </option>
          </select>

          <div class="date-range-group">
            <input
              v-model="filters.start_date"
              type="date"
              class="date-input"
              aria-label="Start date"
              @change="fetchAuditLogs(1)"
            />
            <span class="date-sep">—</span>
            <input
              v-model="filters.end_date"
              type="date"
              class="date-input"
              aria-label="End date"
              @change="fetchAuditLogs(1)"
            />
          </div>
        </div>

        <div class="filter-bar__actions">
          <button
            v-if="activeFilterCount > 0"
            type="button"
            class="toolbar-btn toolbar-btn--icon"
            :title="$t('auditLogs.resetFilters')"
            @click="resetFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>

          <button
            type="button"
            class="toolbar-btn toolbar-btn--icon"
            :title="$t('common.refresh')"
            :disabled="isLoading"
            @click="fetchAuditLogs(1)"
          >
            <span v-if="isLoading" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('auditLogs.loadingAuditLogs') }}</div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredLogs.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-shield-check"></i>
        </div>
        <div class="empty-box__title">{{ $t('auditLogs.noAuditLogsFound') }}</div>
        <div class="empty-box__desc">{{ $t('auditLogs.noAuditLogsFoundDesc') }}</div>
        <button
          v-if="activeFilterCount > 0"
          type="button"
          class="toolbar-btn mt-3"
          @click="resetFilters"
        >
          {{ $t('auditLogs.resetFilters') }}
        </button>
      </div>

      <!-- Clean 6-Column Ledger Table -->
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th>{{ $t('auditLogs.colTime') }}</th>
              <th>{{ $t('auditLogs.colUser') }}</th>
              <th>{{ $t('auditLogs.colAction') }}</th>
              <th>{{ $t('auditLogs.colModule') }}</th>
              <th>{{ $t('auditLogs.colSummary') }}</th>
              <th class="text-end">{{ $t('auditLogs.colDetails') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="audit-row"
              @click="openDetailModal(log)"
            >
              <td>
                <span class="datetime-text tabular">
                  {{ formatDateTime(log.created_at) }}
                </span>
              </td>

              <td>
                <div class="actor-cell">
                  <span class="actor-name">
                    {{ log.user_name || $t('common.system') }}
                  </span>
                  <span v-if="log.user_role" class="actor-role">
                    {{ getRoleLabel(log.user_role) }}
                  </span>
                </div>
              </td>

              <td>
                <span class="action-text" :class="getActionToneClass(log.action)">
                  {{ getActionLabel(log.action) }}
                </span>
              </td>

              <td>
                <div class="module-cell">
                  <span class="module-name">{{ getModuleLabel(log.table_name) }}</span>
                  <span v-if="log.record_id" class="module-id tabular">#{{ log.record_id }}</span>
                </div>
              </td>

              <td>
                <div class="summary-text" :title="formatReadableSummary(log)">
                  {{ formatReadableSummary(log) }}
                </div>
              </td>

              <td class="text-end" @click.stop>
                <button
                  type="button"
                  class="btn-action-icon"
                  :title="$t('auditLogs.colDetails')"
                  @click="openDetailModal(log)"
                >
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('auditLogs.showingPage', { page: pagination.page, total: pagination.totalPages, events: pagination.total.toLocaleString() }) }}
        </div>

        <div class="pagination-controls">
          <button
            type="button"
            class="btn-page"
            :disabled="pagination.page <= 1 || isLoading"
            @click="fetchAuditLogs(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <button
            v-for="p in visiblePages"
            :key="p"
            type="button"
            class="btn-page tabular"
            :class="{ active: p === pagination.page }"
            :disabled="isLoading"
            @click="fetchAuditLogs(p)"
          >
            {{ p }}
          </button>

          <button
            type="button"
            class="btn-page"
            :disabled="pagination.page >= pagination.totalPages || isLoading"
            @click="fetchAuditLogs(pagination.page + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Clean Activity Detail Modal -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && selectedLog"
        class="modal-backdrop-custom"
        @click.self="closeDetailModal"
      >
        <div class="modal-sheet">
          <div class="modal-head">
            <div>
              <h6 class="modal-heading">
                {{ $t('auditLogs.auditLogTitle', { id: selectedLog.id }) }}
              </h6>
              <div class="modal-sub">
                <span class="action-text" :class="getActionToneClass(selectedLog.action)">
                  {{ getActionLabel(selectedLog.action) }}
                </span>
                <span class="meta-dot">·</span>
                <span>{{ getModuleLabel(selectedLog.table_name) }}</span>
                <span v-if="selectedLog.record_id" class="tabular"> #{{ selectedLog.record_id }}</span>
              </div>
            </div>
            <button type="button" class="btn-close-quiet" @click="closeDetailModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="modal-body-scroll">
            <div v-if="isLoadingSingleLog" class="py-2 small text-muted">
              <span class="spinner-border spinner-border-sm me-2"></span>
              {{ $t('common.loading') }}
            </div>

            <!-- Clean Borderless Info List -->
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">{{ $t('auditLogs.actorUser') }}</span>
                <span class="info-value">
                  {{ selectedLog.user_name || $t('common.system') }}
                  <span v-if="selectedLog.user_role" class="text-muted-inline">
                    ({{ getRoleLabel(selectedLog.user_role) }})
                  </span>
                </span>
              </div>

              <div class="info-row">
                <span class="info-label">{{ $t('auditLogs.timestamp') }}</span>
                <span class="info-value tabular">{{ formatDateTime(selectedLog.created_at) }}</span>
              </div>

              <div v-if="selectedLog.user_email" class="info-row">
                <span class="info-label">{{ $t('auditLogs.userEmail') }}</span>
                <span class="info-value">{{ selectedLog.user_email }}</span>
              </div>

              <div class="info-row">
                <span class="info-label">{{ $t('auditLogs.clientIp') }}</span>
                <span class="info-value tabular">{{ formatIpAddress(selectedLog.ip_address) }}</span>
              </div>
            </div>

            <!-- Readable Details Table -->
            <div v-if="parsedModalDetailsEntries.length > 0" class="details-section">
              <div class="details-section__title">{{ $t('auditLogs.eventDetailsPayload') }}</div>
              <div class="kv-list">
                <div v-for="[key, val] in parsedModalDetailsEntries" :key="key" class="kv-row">
                  <span class="kv-key">{{ formatKeyLabel(key) }}</span>
                  <span class="kv-val">
                    <pre v-if="typeof val === 'object' && val !== null && !Array.isArray(val)" class="kv-nested-pre">{{ JSON.stringify(val, null, 2) }}</pre>
                    <template v-else>{{ formatDetailValue(key, val) }}</template>
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="no-details-note">
              {{ $t('auditLogs.noExtraDetails') }}
            </div>

            <!-- Collapsible Technical JSON -->
            <div v-if="formattedRawJson" class="raw-json-wrap">
              <div class="raw-json-bar">
                <button
                  type="button"
                  class="btn-link-quiet"
                  @click="showRawJson = !showRawJson"
                >
                  <i class="bi" :class="showRawJson ? 'bi-chevron-up' : 'bi-code-slash'"></i>
                  <span>{{ showRawJson ? $t('auditLogs.hideRawJson') : $t('auditLogs.showRawJson') }}</span>
                </button>

                <button
                  v-if="showRawJson"
                  type="button"
                  class="btn-link-quiet"
                  @click="copyJsonPayload"
                >
                  <i class="bi bi-clipboard"></i>
                  <span>{{ $t('auditLogs.copyJson') }}</span>
                </button>
              </div>

              <pre v-if="showRawJson" class="json-code-box">{{ formattedRawJson }}</pre>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-modal-close" @click="closeDetailModal">
              {{ $t('auditLogs.closeInspector') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.audit-page {
  --roast-ink: #14231a;
  --sage-muted: #54665b;
  --botanical-primary: #2d5a43;
  --botanical-deep: #1e3f2f;
  --ledger-line: #e4ebe6;
  --ledger-hairline: #eff4f1;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.clean-card {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(20, 35, 26, 0.03);
}

/* Filter Toolbar */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--ledger-line);
  background: #ffffff;
}

.filter-bar__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.filter-bar__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.search-wrap {
  position: relative;
  flex: 1 1 200px;
  min-width: 180px;
  max-width: 260px;
}

.search-icon {
  position: absolute;
  left: 0.72rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.78rem;
  color: #7d8f84;
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #7d8f84;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  cursor: pointer;
}

.search-clear:hover {
  background: #eef3ef;
  color: var(--roast-ink);
}

.filter-input {
  height: 36px;
  border: 1px solid #dce6e0;
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 0.8rem;
  color: var(--roast-ink);
  transition: border-color 0.14s ease;
}

.filter-input:focus {
  outline: none;
  border-color: var(--botanical-primary);
}

.search-input {
  width: 100%;
  padding: 0 1.9rem 0 2rem;
}

.filter-select {
  padding: 0 2rem 0 0.72rem;
  cursor: pointer;
  max-width: 175px;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2354665b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.8' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  background-size: 11px 11px;
  appearance: none;
}

.filter-select--wide {
  max-width: 195px;
}

.date-range-group {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 0.55rem;
  border: 1px solid #dce6e0;
  border-radius: 8px;
  background: #ffffff;
  gap: 0.3rem;
}

.date-input {
  border: none;
  background: transparent;
  font-size: 0.78rem;
  color: var(--roast-ink);
  width: 118px;
  outline: none;
}

.date-sep {
  font-size: 0.75rem;
  color: #8a9b90;
}

.toolbar-btn {
  height: 36px;
  padding: 0 0.75rem;
  border: 1px solid #dce6e0;
  border-radius: 8px;
  background: #ffffff;
  color: var(--sage-muted);
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.toolbar-btn--icon {
  width: 36px;
  padding: 0;
}

.toolbar-btn:hover:not(:disabled) {
  background: #f5f9f6;
  border-color: #b8ccc0;
  color: var(--botanical-primary);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Table */
.clean-table th {
  background: #fafcfb;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--sage-muted);
  padding: 0.72rem 1rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.78rem 1rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.83rem;
  color: var(--roast-ink);
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.audit-row {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.audit-row:hover td {
  background-color: #fafcfb;
}

.datetime-text {
  font-size: 0.8rem;
  color: #485c50;
  white-space: nowrap;
}

.actor-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.actor-name {
  font-weight: 700;
  font-size: 0.84rem;
  color: var(--roast-ink);
  white-space: nowrap;
}

.actor-role {
  font-size: 0.73rem;
  color: var(--sage-muted);
}

/* Unboxed Action Text */
.action-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.action-text.tone-success {
  color: #1e6b43;
}

.action-text.tone-warning {
  color: #9a5b13;
}

.action-text.tone-danger {
  color: #c5221f;
}

.action-text.tone-neutral {
  color: #475569;
}

.module-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
}

.module-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2f4538;
}

.module-id {
  font-size: 0.76rem;
  color: var(--sage-muted);
}

.summary-text {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #4d5f54;
  font-size: 0.8rem;
}

.btn-action-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: #54665b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-action-icon:hover {
  background: #f0f6f2;
  border-color: #b8ccc0;
  color: var(--botanical-primary);
}

/* Empty State */
.empty-box {
  padding: 3.5rem 1rem;
  text-align: center;
}

.empty-box__icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 0.75rem;
  border-radius: 12px;
  background: #f2f7f4;
  border: 1px solid #dce6e0;
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.empty-box__title {
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin-bottom: 0.25rem;
}

.empty-box__desc {
  font-size: 0.8rem;
  color: var(--sage-muted);
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0.72rem 1rem;
  border-top: 1px solid var(--ledger-hairline);
  background: #fafcfb;
}

.pagination-info {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-page {
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border-radius: 7px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-page:hover:not(:disabled):not(.active) {
  background: #f2f7f4;
}

.btn-page.active {
  background: var(--botanical-primary);
  border-color: var(--botanical-primary);
  color: #ffffff;
}

.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Clean Unified Detail Modal */
.modal-backdrop-custom {
  --roast-ink: #14231a;
  --sage-muted: #54665b;
  --botanical-primary: #2d5a43;
  position: fixed;
  inset: 0;
  background-color: rgba(20, 35, 26, 0.42);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1060;
}

.modal-sheet {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 88vh;
  padding: 1.3rem 1.4rem;
  border: 1px solid #e2e8e4;
  box-shadow: 0 20px 44px rgba(15, 28, 20, 0.14);
  display: flex;
  flex-direction: column;
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid #edf2ef;
}

.modal-heading {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.modal-sub {
  margin-top: 0.2rem;
  font-size: 0.8rem;
  color: var(--sage-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.meta-dot {
  color: #b8c4bc;
}

.btn-close-quiet {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #7a8a80;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  cursor: pointer;
}

.btn-close-quiet:hover {
  background: #f1f5f3;
  color: var(--roast-ink);
}

.modal-body-scroll {
  overflow-y: auto;
  padding: 0.9rem 0;
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid #f2f6f3;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.79rem;
  color: var(--sage-muted);
  flex-shrink: 0;
}

.info-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--roast-ink);
  text-align: right;
}

.text-muted-inline {
  font-weight: 500;
  color: var(--sage-muted);
}

.details-section {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #edf2ef;
}

.details-section__title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin-bottom: 0.5rem;
}

.kv-list {
  border: 1px solid #e6ede8;
  border-radius: 8px;
  overflow: hidden;
}

.kv-row {
  display: grid;
  grid-template-columns: 38% 1fr;
  gap: 0.75rem;
  padding: 0.48rem 0.75rem;
  border-bottom: 1px solid #f0f5f2;
  font-size: 0.8rem;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-key {
  color: var(--sage-muted);
  font-weight: 600;
}

.kv-val {
  color: var(--roast-ink);
  word-break: break-word;
}

.kv-nested-pre {
  margin: 0;
  font-size: 0.75rem;
  color: #34473c;
  background: #f6f9f7;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
}

.no-details-note {
  margin-top: 0.9rem;
  padding-top: 0.85rem;
  border-top: 1px solid #edf2ef;
  font-size: 0.8rem;
  color: var(--sage-muted);
}

.raw-json-wrap {
  margin-top: 0.85rem;
}

.raw-json-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.btn-link-quiet {
  border: none;
  background: transparent;
  padding: 0.2rem 0;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--sage-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.btn-link-quiet:hover {
  color: var(--botanical-primary);
}

.json-code-box {
  margin: 0.5rem 0 0;
  padding: 0.75rem 0.85rem;
  background: #f6f9f7;
  border: 1px solid #e2eae5;
  border-radius: 8px;
  color: #1f3328;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  max-height: 190px;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.85rem;
  border-top: 1px solid #edf2ef;
}

.btn-modal-close {
  height: 36px;
  padding: 0 1.05rem;
  border-radius: 8px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-modal-close:hover {
  background: #f5f8f6;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar__actions {
    justify-content: flex-end;
  }

  .search-wrap {
    max-width: none;
  }
}
</style>
