<template>
  <div class="audit-logs-page">
    <!-- Audit Logs Card -->
    <div class="section-card">
      <!-- Single-Row Compact Filter Bar -->
      <div class="p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center flex-wrap gap-2 flex-grow-1">
          <div class="search-input-wrap" style="min-width: 210px; max-width: 280px">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              class="form-control form-control-clean ps-5"
              :placeholder="$t('auditLogs.filterPlaceholder')"
            />
          </div>

          <select
            v-model="filters.table_name"
            class="form-select form-control-clean"
            style="width: auto; min-width: 145px"
            @change="fetchAuditLogs(1)"
          >
            <option value="">{{ $t('auditLogs.allModules') }}</option>
            <option v-for="mod in moduleOptions" :key="mod.value" :value="mod.value">
              {{ mod.label }}
            </option>
          </select>

          <select
            v-model="filters.action"
            class="form-select form-control-clean"
            style="width: auto; min-width: 165px"
            @change="fetchAuditLogs(1)"
          >
            <option value="">{{ $t('auditLogs.allActions') }}</option>
            <optgroup
              v-for="group in actionGroups"
              :key="group.label"
              :label="group.label"
            >
              <option v-for="act in group.actions" :key="act" :value="act">
                {{ act }}
              </option>
            </optgroup>
          </select>

          <select
            v-model="filters.user_id"
            class="form-select form-control-clean"
            style="width: auto; min-width: 140px"
            @change="fetchAuditLogs(1)"
          >
            <option value="">{{ $t('auditLogs.allUsers') }}</option>
            <option v-for="u in usersList" :key="u.id" :value="u.id">
              {{ u.name }}
            </option>
          </select>

          <input
            v-model="filters.start_date"
            type="date"
            class="form-control form-control-clean"
            style="width: auto"
            title="Start Date"
            @change="fetchAuditLogs(1)"
          />

          <input
            v-model="filters.end_date"
            type="date"
            class="form-control form-control-clean"
            style="width: auto"
            title="End Date"
            @change="fetchAuditLogs(1)"
          />

          <button
            v-if="activeFilterCount > 0 || searchQuery"
            type="button"
            class="btn btn-light-coffee btn-sm"
            :title="$t('auditLogs.resetFilters')"
            @click="resetFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>

        <button
          type="button"
          class="btn btn-coffee btn-sm"
          :disabled="isLoading"
          @click="fetchAuditLogs(1)"
        >
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-arrow-clockwise me-1"></i>
          {{ $t('common.refresh') }}
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-secondary" role="status"></div>
        <p class="text-muted small mt-2 mb-0">{{ $t('auditLogs.loadingAuditLogs') }}</p>
      </div>

      <div v-else-if="filteredLogs.length === 0" class="empty-state py-5 text-center">
        <i class="bi bi-shield-slash fs-2 text-muted d-block mb-2"></i>
        <div class="fw-semibold text-dark">{{ $t('auditLogs.noAuditLogsFound') }}</div>
        <p class="text-muted small mb-3">
          {{ $t('auditLogs.noAuditLogsFoundDesc') }}
        </p>
        <button
          v-if="activeFilterCount > 0 || searchQuery"
          type="button"
          class="btn btn-light-coffee btn-sm"
          @click="resetFilters"
        >
          {{ $t('auditLogs.resetFilters') }}
        </button>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-clean align-middle mb-0">
          <thead>
            <tr>
              <th class="ps-3">{{ $t('auditLogs.colTime') }}</th>
              <th>{{ $t('auditLogs.colUser') }}</th>
              <th>{{ $t('auditLogs.colAction') }}</th>
              <th>{{ $t('auditLogs.colModule') }}</th>
              <th>{{ $t('auditLogs.colSummary') }}</th>
              <th>{{ $t('auditLogs.colIp') }}</th>
              <th class="text-end pe-3">{{ $t('auditLogs.colDetails') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="audit-row"
              @click="openDetailModal(log)"
            >
              <td class="ps-3 small text-muted text-nowrap">
                {{ formatDateTime(log.created_at) }}
              </td>

              <td>
                <div v-if="log.user_name" class="d-flex align-items-center gap-2">
                  <span class="fw-semibold text-dark">{{ log.user_name }}</span>
                  <span
                    v-if="log.user_role"
                    class="role-micro-badge"
                    :class="log.user_role === 'OWNER' ? 'role-owner' : 'role-staff'"
                  >
                    {{ log.user_role }}
                  </span>
                </div>
                <span v-else class="text-muted small">{{ $t('common.system') }}</span>
              </td>

              <td>
                <span class="action-badge" :class="getActionBadgeClass(log.action)">
                  {{ log.action }}
                </span>
              </td>

              <td>
                <span class="module-pill">
                  {{ formatTableName(log.table_name) }}
                  <template v-if="log.record_id"> #{{ log.record_id }}</template>
                </span>
              </td>

              <td>
                <div class="detail-summary-cell" :title="formatSummaryText(log.details)">
                  {{ formatSummaryText(log.details) }}
                </div>
              </td>

              <td>
                <span class="small text-muted font-monospace">
                  {{ formatIpAddress(log.ip_address) }}
                </span>
              </td>

              <td class="text-end pe-3" @click.stop>
                <button
                  type="button"
                  class="btn btn-action-icon"
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

      <!-- Pagination Footer -->
      <div
        v-if="pagination.totalPages > 1"
        class="pagination-bar px-3 py-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
      >
        <div class="small text-muted">
          {{ $t('auditLogs.showingPage', { page: pagination.page, total: pagination.totalPages, events: pagination.total.toLocaleString() }) }}
        </div>

        <div class="d-flex align-items-center gap-1">
          <button
            type="button"
            class="btn btn-page"
            :disabled="pagination.page <= 1 || isLoading"
            @click="fetchAuditLogs(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <button
            v-for="p in visiblePages"
            :key="p"
            type="button"
            class="btn btn-page"
            :class="{ active: p === pagination.page }"
            :disabled="isLoading"
            @click="fetchAuditLogs(p)"
          >
            {{ p }}
          </button>

          <button
            type="button"
            class="btn btn-page"
            :disabled="pagination.page >= pagination.totalPages || isLoading"
            @click="fetchAuditLogs(pagination.page + 1)"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Audit Log Detail Inspector Modal -->
    <div v-if="showDetailModal && selectedLog" class="modal-backdrop-custom" @click.self="closeDetailModal">
      <div class="modal-card-custom modal-lg-custom">
        <div class="modal-header-custom">
          <div class="d-flex align-items-center gap-2">
            <span class="action-badge" :class="getActionBadgeClass(selectedLog.action)">
              <i class="bi me-1" :class="getActionIcon(selectedLog.action)"></i>
              {{ selectedLog.action }}
            </span>
            <h5 class="modal-title-custom mb-0">{{ $t('auditLogs.auditLogTitle', { id: selectedLog.id }) }}</h5>
          </div>
          <button type="button" class="btn-close-custom" @click="closeDetailModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <div v-if="isLoadingSingleLog" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
            <span class="ms-2 small text-muted">{{ $t('common.loading') }}</span>
          </div>

          <!-- Metadata Grid -->
          <div class="meta-grid mb-4">
            <div class="meta-item">
              <div class="meta-label">{{ $t('auditLogs.timestamp') }}</div>
              <div class="meta-value">{{ formatDateTime(selectedLog.created_at) }}</div>
            </div>

            <div class="meta-item">
              <div class="meta-label">{{ $t('auditLogs.actorUser') }}</div>
              <div class="meta-value">
                <template v-if="selectedLog.user_name">
                  {{ selectedLog.user_name }}
                  <span class="text-muted small">({{ selectedLog.user_role || 'USER' }})</span>
                </template>
                <template v-else>
                  {{ $t('common.system') }}
                </template>
              </div>
            </div>

            <div class="meta-item">
              <div class="meta-label">{{ $t('auditLogs.userEmail') }}</div>
              <div class="meta-value">{{ selectedLog.user_email || '—' }}</div>
            </div>

            <div class="meta-item">
              <div class="meta-label">{{ $t('auditLogs.targetTable') }}</div>
              <div class="meta-value">
                <span class="module-pill">{{ formatTableName(selectedLog.table_name) }}</span>
                <span class="text-muted small ms-1">({{ selectedLog.table_name }})</span>
              </div>
            </div>

            <div class="meta-item">
              <div class="meta-label">{{ $t('auditLogs.recordId') }}</div>
              <div class="meta-value">
                {{ selectedLog.record_id ? `#${selectedLog.record_id}` : '—' }}
              </div>
            </div>

            <div class="meta-item">
              <div class="meta-label">{{ $t('auditLogs.clientIp') }}</div>
              <div class="meta-value font-monospace">{{ formatIpAddress(selectedLog.ip_address) }}</div>
            </div>
          </div>

          <!-- Structured Key-Value Details -->
          <div class="d-flex align-items-center justify-content-between mb-2">
            <h6 class="fw-bold mb-0 small text-uppercase text-muted">{{ $t('auditLogs.eventDetailsPayload') }}</h6>
            <button
              v-if="selectedLog.details"
              type="button"
              class="btn btn-preset-sm"
              @click="copyJsonPayload"
            >
              <i class="bi bi-clipboard me-1"></i>
              {{ $t('auditLogs.copyJson') }}
            </button>
          </div>

          <div v-if="parsedModalDetailsEntries.length > 0" class="kv-table-wrap mb-3">
            <table class="table table-sm mb-0 kv-table">
              <tbody>
                <tr v-for="[key, val] in parsedModalDetailsEntries" :key="key">
                  <td class="kv-key">{{ formatKeyLabel(key) }}</td>
                  <td class="kv-val">
                    <pre v-if="typeof val === 'object' && val !== null" class="kv-nested-pre mb-0">{{ JSON.stringify(val, null, 2) }}</pre>
                    <span v-else>{{ String(val) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Raw JSON View -->
          <div class="json-code-box">
            <pre class="mb-0">{{ formattedRawJson }}</pre>
          </div>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="closeDetailModal">
            {{ $t('auditLogs.closeInspector') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/api'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'

const toast = useToast()
const { formatDateTime } = useFormatDate()

// ================= STATE =================
const logs = ref([])
const usersList = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const activeDatePreset = ref('ALL')

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

// ================= OPTIONS =================
const moduleOptions = [
  { value: 'orders', label: 'Orders (POS)' },
  { value: 'payments', label: 'Payments' },
  { value: 'refunds', label: 'Refunds' },
  { value: 'shifts', label: 'Shifts & Drawer' },
  { value: 'products', label: 'Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'stock_movements', label: 'Stock Movements' },
  { value: 'recipes', label: 'Recipes (BOM)' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'users', label: 'Users & Staff' },
  { value: 'settings', label: 'Shop Settings' },
  { value: 'refresh_tokens', label: 'Auth Sessions' },
  { value: 'password_resets', label: 'Password Resets' },
]

const actionGroups = [
  {
    label: 'POS Orders & Payments',
    actions: [
      'CREATE_ORDER',
      'UPDATE_ORDER',
      'CANCEL_ORDER',
      'PROCESS_PAYMENT',
      'PROCESS_REFUND',
    ],
  },
  {
    label: 'Shifts & Cash Drawer',
    actions: ['OPEN_SHIFT', 'CLOSE_SHIFT'],
  },
  {
    label: 'Inventory & Recipes',
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
    label: 'Products & Categories',
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
    label: 'Expenses',
    actions: ['CREATE_EXPENSE', 'UPDATE_EXPENSE', 'VOID_EXPENSE'],
  },
  {
    label: 'Authentication & Security',
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
    label: 'Users & Shop Settings',
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

// ================= COMPUTED =================
const activeFilterCount = computed(() => {
  let count = 0
  if (filters.table_name) count++
  if (filters.action) count++
  if (filters.user_id) count++
  if (filters.start_date) count++
  if (filters.end_date) count++
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
      (log.table_name && log.table_name.toLowerCase().includes(q)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q)) ||
      detailsStr.includes(q)
    )
  })
})

const criticalCountOnPage = computed(() => {
  return logs.value.filter((l) => isCriticalAction(l.action)).length
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

const parsedModalDetails = computed(() => {
  if (!selectedLog.value?.details) return null
  return parseDetailsObject(selectedLog.value.details)
})

const parsedModalDetailsEntries = computed(() => {
  const obj = parsedModalDetails.value
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj)
})

const formattedRawJson = computed(() => {
  if (!selectedLog.value?.details) return 'No additional JSON payload recorded for this event.'
  const parsed = parseDetailsObject(selectedLog.value.details)
  if (parsed && typeof parsed === 'object') {
    return JSON.stringify(parsed, null, 2)
  }
  return String(selectedLog.value.details)
})

// ================= HELPERS =================
const toLocalYmd = (dateObj) => {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const formatTableName = (table) => {
  if (!table) return 'System'
  const found = moduleOptions.find((m) => m.value === table)
  if (found) return found.label
  return table.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const formatIpAddress = (ip) => {
  if (!ip) return 'Local'
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (Local)'
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

const formatSummaryText = (details) => {
  if (!details) return '—'
  const obj = parseDetailsObject(details)
  if (!obj || typeof obj !== 'object') return String(details)

  const parts = []
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined || val === '') continue
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        parts.push(`${key}: [${val.length} items]`)
      } else {
        parts.push(`${key}: {...}`)
      }
    } else {
      parts.push(`${key}: ${val}`)
    }
  }
  return parts.length > 0 ? parts.join(' • ') : '—'
}

const formatKeyLabel = (key) => {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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

const getActionBadgeClass = (action = '') => {
  if (isCriticalAction(action)) return 'badge-action-danger'
  if (
    action.startsWith('CREATE_') ||
    action === 'OPEN_SHIFT' ||
    action === 'PROCESS_PAYMENT' ||
    action === 'LOGIN' ||
    action === 'STOCK_IN'
  ) {
    return 'badge-action-success'
  }
  if (
    action.startsWith('UPDATE_') ||
    action.startsWith('UPLOAD_') ||
    action === 'CLOSE_SHIFT' ||
    action === 'CHANGE_PASSWORD' ||
    action === 'RESET_PASSWORD' ||
    action === 'STOCK_ADJUST'
  ) {
    return 'badge-action-warning'
  }
  return 'badge-action-neutral'
}

const getActionIcon = (action = '') => {
  if (isCriticalAction(action)) return 'bi-exclamation-triangle-fill'
  if (action === 'LOGIN' || action === 'LOGOUT' || action === 'LOGOUT_ALL') return 'bi-key-fill'
  if (action.includes('ORDER')) return 'bi-receipt'
  if (action.includes('PAYMENT') || action.includes('REFUND')) return 'bi-cash-stack'
  if (action.includes('SHIFT')) return 'bi-safe2'
  if (action.includes('STOCK') || action.includes('INGREDIENT')) return 'bi-boxes'
  if (action.includes('RECIPE')) return 'bi-journal-text'
  if (action.includes('PRODUCT') || action.includes('CATEGORY')) return 'bi-cup-hot'
  if (action.includes('EXPENSE')) return 'bi-wallet2'
  if (action.includes('USER') || action.includes('PROFILE')) return 'bi-person-badge'
  if (action.includes('SETTINGS') || action.includes('LOGO')) return 'bi-gear'
  return 'bi-shield-check'
}

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

const applyDatePreset = (preset) => {
  activeDatePreset.value = preset
  const now = new Date()

  if (preset === 'ALL') {
    filters.start_date = ''
    filters.end_date = ''
  } else if (preset === 'TODAY') {
    const today = toLocalYmd(now)
    filters.start_date = today
    filters.end_date = today
  } else if (preset === '7D') {
    const past = new Date(now)
    past.setDate(now.getDate() - 6)
    filters.start_date = toLocalYmd(past)
    filters.end_date = toLocalYmd(now)
  } else if (preset === '30D') {
    const past = new Date(now)
    past.setDate(now.getDate() - 29)
    filters.start_date = toLocalYmd(past)
    filters.end_date = toLocalYmd(now)
  }

  fetchAuditLogs(1)
}

const resetFilters = () => {
  filters.table_name = ''
  filters.action = ''
  filters.user_id = ''
  filters.start_date = ''
  filters.end_date = ''
  filters.limit = 20
  searchQuery.value = ''
  activeDatePreset.value = 'ALL'
  fetchAuditLogs(1)
}

const openDetailModal = async (log) => {
  selectedLog.value = { ...log }
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
    toast.success('Audit JSON payload copied to clipboard')
  } catch {
    toast.error('Unable to copy JSON payload')
  }
}

onMounted(async () => {
  await Promise.all([fetchUsersList(), fetchAuditLogs(1)])
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

.eyebrow-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--secondary, #7c5800);
  margin-bottom: 0.2rem;
}

.page-title {
  font-family: var(--font-headline, 'Plus Jakarta Sans', sans-serif);
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--primary, #2d5a43);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--outline, #827470);
}

/* KPI Strip */
.kpi-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  padding: 1rem 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  height: 100%;
}

.kpi-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.kpi-coffee {
  background: #f5ebe6;
  color: #2d5a43;
}

.kpi-blue {
  background: #e8f0fe;
  color: #1a73e8;
}

.kpi-red {
  background: #fce8e6;
  color: #c5221f;
}

.kpi-amber {
  background: #fef3d6;
  color: #b06000;
}

.kpi-label {
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--outline, #827470);
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--primary, #2d5a43);
  line-height: 1.2;
}

.kpi-meta {
  font-size: 0.74rem;
  color: var(--outline, #827470);
}

/* Section Card */
.section-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
}

.form-label-xs {
  display: block;
  font-size: 0.73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--outline, #827470);
  margin-bottom: 0.35rem;
}

.form-control-clean {
  border-radius: 10px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  font-size: 0.85rem;
  padding: 0.48rem 0.75rem;
  background-color: #faf9f7;
}

.form-control-clean:focus {
  border-color: var(--primary, #2d5a43);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
  background-color: #ffffff;
}

.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--outline, #827470);
  font-size: 0.85rem;
}

.btn-preset-sm {
  border: 1px solid var(--border-hairline, #e6e4e0);
  background: #faf9f7;
  color: var(--on-surface, #1c1b1b);
  font-size: 0.76rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.32rem 0.65rem;
  transition: all 0.15s ease;
}

.btn-preset-sm:hover,
.btn-preset-sm.active {
  background: var(--primary, #2d5a43);
  color: #ffffff;
  border-color: var(--primary, #2d5a43);
}

/* Table */
.table-clean thead th {
  background: #faf9f7;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--outline, #827470);
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  padding: 0.75rem 0.75rem;
}

.table-clean tbody td {
  padding: 0.8rem 0.75rem;
  border-bottom: 1px solid #f2f0ec;
  font-size: 0.84rem;
}

.audit-row {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.audit-row:hover {
  background-color: #fcfbfa;
}

.actor-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #f5ebe6;
  color: #2d5a43;
  font-size: 0.76rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.actor-system {
  background: #eef0f2;
  color: #5f6368;
}

.role-micro-badge {
  font-size: 0.64rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  text-transform: uppercase;
}

.role-owner {
  background: #d6ede0;
  color: #2d5a43;
}

.role-staff {
  background: #eef0f2;
  color: #495057;
}

/* Action Badges */
.action-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.73rem;
  font-weight: 700;
  padding: 0.26rem 0.6rem;
  border-radius: 8px;
  letter-spacing: 0.02em;
}

.badge-action-success {
  background: #e6f4ea;
  color: #137333;
}

.badge-action-warning {
  background: #fef3d6;
  color: #b06000;
}

.badge-action-danger {
  background: #fce8e6;
  color: #c5221f;
}

.badge-action-neutral {
  background: #f1f3f4;
  color: #3c4043;
}

.module-pill {
  display: inline-block;
  background: #faf9f7;
  border: 1px solid var(--border-hairline, #e6e4e0);
  color: var(--primary, #2d5a43);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.18rem 0.52rem;
  border-radius: 6px;
}

.record-id-pill {
  display: inline-block;
  background: #f5ebe6;
  color: #2d5a43;
  font-family: monospace;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.15rem 0.42rem;
  border-radius: 6px;
}

.detail-summary-cell {
  max-width: 310px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #4a4644;
  font-size: 0.8rem;
}

.ip-badge {
  display: inline-flex;
  align-items: center;
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--outline, #827470);
  background: #faf9f7;
  border: 1px solid #eceae6;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  background: #ffffff;
  color: var(--primary, #2d5a43);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-action-icon:hover {
  background: #f5ebe6;
}

/* Pagination */
.btn-page {
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  background: #ffffff;
  color: var(--on-surface, #1c1b1b);
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-page.active {
  background: var(--primary, #2d5a43);
  color: #ffffff;
  border-color: var(--primary, #2d5a43);
}

/* Buttons */
.btn-coffee {
  background: var(--primary, #2d5a43);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.5rem 0.95rem;
}

.btn-coffee:hover {
  background: #3f2419;
  color: #ffffff;
}

.btn-light-coffee {
  background: #f5ebe6;
  color: var(--primary, #2d5a43);
  border: 1px solid #e6d7ce;
  border-radius: 10px;
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.5rem 0.95rem;
}

/* Modal */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(28, 27, 27, 0.45);
  backdrop-filter: blur(2px);
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card-custom {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.modal-lg-custom {
  max-width: 720px;
}

.modal-header-custom {
  padding: 1.1rem 1.35rem;
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title-custom {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--primary, #2d5a43);
}

.btn-close-custom {
  border: none;
  background: #faf9f7;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--outline, #827470);
}

.modal-body-custom {
  padding: 1.25rem 1.35rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 0.95rem 1.35rem;
  border-top: 1px solid var(--border-hairline, #e6e4e0);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.meta-item {
  background: #faf9f7;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
}

.meta-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--outline, #827470);
  margin-bottom: 0.15rem;
}

.meta-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--on-surface, #1c1b1b);
}

.kv-table-wrap {
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 10px;
  overflow: hidden;
}

.kv-table td {
  padding: 0.5rem 0.75rem;
  font-size: 0.82rem;
  border-bottom: 1px solid #f2f0ec;
}

.kv-key {
  width: 34%;
  background: #faf9f7;
  font-weight: 600;
  color: var(--primary, #2d5a43);
}

.kv-val {
  color: #3c4043;
  word-break: break-word;
}

.kv-nested-pre {
  font-size: 0.76rem;
  background: #faf9f7;
  padding: 0.4rem;
  border-radius: 6px;
}

.json-code-box {
  background: #1e1b18;
  color: #f5ebe6;
  border-radius: 12px;
  padding: 0.95rem 1.1rem;
  font-family: monospace;
  font-size: 0.79rem;
  max-height: 240px;
  overflow-y: auto;
}
</style>
