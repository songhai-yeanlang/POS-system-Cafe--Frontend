<template>
  <div class="reports-page">
    <!-- Single-Row Report Tabs & Date Filter Bar -->
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <!-- Report Tab Navigation -->
      <div class="report-tabs">
        <button
          type="button"
          class="report-tab"
          :class="{ active: activeTab === 'TOP_PRODUCTS' }"
          @click="switchTab('TOP_PRODUCTS')"
        >
          <i class="bi bi-trophy me-1"></i>{{ $t('reports.tabTopProducts') }}
        </button>

        <button
          type="button"
          class="report-tab"
          :class="{ active: activeTab === 'INVENTORY_USAGE' }"
          @click="switchTab('INVENTORY_USAGE')"
        >
          <i class="bi bi-boxes me-1"></i>{{ $t('reports.tabInventoryUsage') }}
        </button>

        <template v-if="authStore.isOwner">
          <button
            type="button"
            class="report-tab"
            :class="{ active: activeTab === 'CATEGORIES' }"
            @click="switchTab('CATEGORIES')"
          >
            <i class="bi bi-tags me-1"></i>{{ $t('reports.tabCategories') }}
          </button>

          <button
            type="button"
            class="report-tab"
            :class="{ active: activeTab === 'PAYMENT_METHODS' }"
            @click="switchTab('PAYMENT_METHODS')"
          >
            <i class="bi bi-credit-card me-1"></i>{{ $t('reports.tabPayments') }}
          </button>

          <button
            type="button"
            class="report-tab"
            :class="{ active: activeTab === 'STAFF_PERFORMANCE' }"
            @click="switchTab('STAFF_PERFORMANCE')"
          >
            <i class="bi bi-people me-1"></i>{{ $t('reports.tabStaff') }}
          </button>
        </template>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <div class="preset-pills">
          <button
            v-for="p in datePresets"
            :key="p.key"
            type="button"
            class="preset-pill"
            :class="{ active: activePreset === p.key }"
            @click="applyPreset(p.key)"
          >
            {{ $t(p.labelKey) }}
          </button>
        </div>

        <input
          v-model="dateRange.start_date"
          type="date"
          class="form-control form-control-sm filter-date"
          @change="handleCustomDate"
        />
        <input
          v-model="dateRange.end_date"
          type="date"
          class="form-control form-control-sm filter-date"
          @change="handleCustomDate"
        />

        <button
          type="button"
          class="btn btn-light-coffee btn-sm"
          :disabled="isLoading"
          @click="loadCurrentTabReport"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>

    <!-- ================= TAB 1: TOP SELLING PRODUCTS ================= -->
    <div v-if="activeTab === 'TOP_PRODUCTS'" class="clean-card">
      <div class="card-toolbar">
        <div>
          <span class="fw-bold text-dark">{{ $t('reports.topSellingVariants') }}</span>
          <span class="small text-muted ms-2">
            {{ $t('reports.totalRevenueInList') }} <strong>{{ formatUsd(topProductsData.total_revenue_sum) }}</strong>
          </span>
        </div>

        <div class="d-flex gap-2 align-items-center">
          <select
            v-model="topProductsLimit"
            class="form-select form-select-sm filter-select"
            @change="loadCurrentTabReport"
          >
            <option :value="10">{{ $t('reports.topN', { n: 10 }) }}</option>
            <option :value="25">{{ $t('reports.topN', { n: 25 }) }}</option>
            <option :value="50">{{ $t('reports.topN', { n: 50 }) }}</option>
          </select>
        </div>
      </div>

      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="topProductsData.products.length === 0" class="empty-box">
        <div class="small text-muted">{{ $t('reports.noProductSales') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('reports.colRank') }}</th>
              <th>{{ $t('reports.colProduct') }}</th>
              <th>{{ $t('reports.colVariant') }}</th>
              <th>{{ $t('reports.colCategory') }}</th>
              <th>{{ $t('reports.colUnitsSold') }}</th>
              <th>{{ $t('reports.colRevenue') }}</th>
              <th style="width: 180px">{{ $t('reports.colRevenueShare') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topProductsData.products" :key="item.variant_id">
              <td>
                <span class="rank-pill" :class="{ top3: item.rank <= 3 }">#{{ item.rank }}</span>
              </td>
              <td class="fw-bold text-dark">{{ item.product_name }}</td>
              <td>
                <span class="badge bg-light text-dark border">{{ item.variant_name }}</span>
              </td>
              <td class="small text-muted">{{ item.category_name }}</td>
              <td>
                <span class="fw-bold">{{ item.total_quantity_sold }}</span>
              </td>
              <td>
                <div class="fw-bold text-dark">{{ formatUsd(item.total_revenue_usd) }}</div>
              </td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="share-bar-track flex-grow-1">
                    <div
                      class="share-bar-fill"
                      :style="{ width: `${Math.min(100, item.revenue_share_percentage)}%` }"
                    ></div>
                  </div>
                  <span class="small fw-semibold">{{ item.revenue_share_percentage }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= TAB 2: INVENTORY USAGE ================= -->
    <div v-if="activeTab === 'INVENTORY_USAGE'" class="clean-card">
      <div class="card-toolbar">
        <div>
          <span class="fw-bold text-dark">{{ $t('reports.ingredientConsumptionTitle') }}</span>
          <span class="small text-muted ms-2">
            {{ $t('reports.lowStockAlertsCount', { count: inventoryUsageData.low_stock_alert_count }) }}
          </span>
        </div>

        <button
          type="button"
          class="btn btn-sm"
          :class="inventoryLowStockOnly ? 'btn-warning text-dark fw-bold' : 'btn-light-coffee'"
          @click="inventoryLowStockOnly = !inventoryLowStockOnly; loadCurrentTabReport()"
        >
          <i class="bi bi-exclamation-triangle me-1"></i>{{ $t('inventory.lowStockOnly') }}
        </button>
      </div>

      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="inventoryUsageData.ingredients.length === 0" class="empty-box">
        <div class="small text-muted">{{ $t('inventory.noIngredientsFound') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('inventory.colIngredient') }}</th>
              <th>{{ $t('inventory.colCurrentStock') }}</th>
              <th>{{ $t('reports.colConsumedSales') }}</th>
              <th>{{ $t('reports.colPurchased') }}</th>
              <th>{{ $t('reports.colWasted') }}</th>
              <th>{{ $t('reports.colReturned') }}</th>
              <th>{{ $t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ing in inventoryUsageData.ingredients" :key="ing.ingredient_id">
              <td>
                <div class="fw-bold text-dark">{{ ing.ingredient_name }}</div>
                <div class="small text-muted">{{ $t('inventory.colMinAlert') }}: {{ ing.minimum_stock }} {{ ing.unit }}</div>
              </td>
              <td>
                <span class="fw-bold" :class="ing.is_low_stock ? 'text-danger' : 'text-dark'">
                  {{ ing.current_stock }} {{ ing.unit }}
                </span>
              </td>
              <td>
                <span class="fw-semibold text-primary">
                  {{ ing.total_consumed_sales }} {{ ing.unit }}
                </span>
              </td>
              <td class="text-success">+{{ ing.total_purchased }} {{ ing.unit }}</td>
              <td class="text-danger">
                {{ ing.total_wasted > 0 ? `-${ing.total_wasted} ${ing.unit}` : '0' }}
              </td>
              <td>{{ ing.total_returned }} {{ ing.unit }}</td>
              <td>
                <span v-if="ing.is_low_stock" class="status-tag low">{{ $t('inventory.lowStock') }}</span>
                <span v-else class="status-tag ok">{{ $t('reports.healthy') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= TAB 3: CATEGORIES SALES (OWNER) ================= -->
    <div v-if="activeTab === 'CATEGORIES'" class="clean-card">
      <div class="card-toolbar">
        <div>
          <span class="fw-bold text-dark">{{ $t('reports.salesByCategory') }}</span>
          <span class="small text-muted ms-2">
            {{ $t('reports.totalRevenue') }} <strong>{{ formatUsd(categoriesData.total_revenue_sum) }}</strong>
          </span>
        </div>
      </div>

      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('products.colCategoryName') }}</th>
              <th>{{ $t('reports.colItemsSold') }}</th>
              <th>{{ $t('reports.colTotalRevenueUsd') }}</th>
              <th>{{ $t('reports.colEquivalentKhr') }}</th>
              <th style="width: 220px">{{ $t('reports.colShareOfRevenue') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categoriesData.categories" :key="cat.category_id">
              <td class="fw-bold text-dark">{{ cat.category_name }}</td>
              <td class="fw-semibold">{{ cat.total_items_sold }}</td>
              <td class="fw-bold text-dark">{{ formatUsd(cat.total_revenue_usd) }}</td>
              <td class="small text-muted">{{ formatKhr(usdToKhr(cat.total_revenue_usd)) }}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="share-bar-track flex-grow-1">
                    <div
                      class="share-bar-fill"
                      :style="{ width: `${Math.min(100, cat.revenue_share_percentage)}%` }"
                    ></div>
                  </div>
                  <span class="small fw-semibold">{{ cat.revenue_share_percentage }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= TAB 4: PAYMENT METHODS (OWNER) ================= -->
    <div v-if="activeTab === 'PAYMENT_METHODS'" class="clean-card">
      <div class="card-toolbar">
        <div class="d-flex flex-wrap gap-3 align-items-center">
          <span class="fw-bold text-dark">{{ $t('reports.paymentMethodsBreakdown') }}</span>
          <span class="small text-muted">
            {{ $t('reports.gross') }} <strong>{{ formatUsd(paymentMethodsData.summary.total_gross_amount_usd) }}</strong>
          </span>
          <span class="small text-danger">
            {{ $t('reports.refunded') }} <strong>-{{ formatUsd(paymentMethodsData.summary.total_refunded_usd) }}</strong>
          </span>
          <span class="small text-success">
            {{ $t('reports.netCollected') }} <strong>{{ formatUsd(paymentMethodsData.summary.total_net_amount_usd) }}</strong>
          </span>
        </div>
      </div>

      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
      </div>

      <div v-else-if="paymentMethodsData.payment_methods.length === 0" class="empty-box">
        <div class="small text-muted">{{ $t('dashboard.noCompletedPayments') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('orders.colMethod') }}</th>
              <th>{{ $t('expenses.currencyLabel') }}</th>
              <th>{{ $t('reports.colTransactions') }}</th>
              <th>{{ $t('reports.colRawGross') }}</th>
              <th>{{ $t('reports.colRefundedUsd') }}</th>
              <th>{{ $t('reports.colNetRevenueUsd') }}</th>
              <th style="width: 180px">{{ $t('reports.colNetShare') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pm, idx) in paymentMethodsData.payment_methods" :key="idx">
              <td><span class="method-pill">{{ pm.method }}</span></td>
              <td><span class="fw-bold">{{ pm.currency }}</span></td>
              <td>{{ pm.transaction_count }}</td>
              <td class="fw-semibold">
                {{ pm.currency === 'USD' ? formatUsd(pm.gross_amount) : formatKhr(pm.gross_amount) }}
              </td>
              <td class="text-danger">
                {{ pm.refunded_amount_usd > 0 ? `-${formatUsd(pm.refunded_amount_usd)}` : '—' }}
              </td>
              <td class="fw-bold text-dark">{{ formatUsd(pm.net_amount_usd) }}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="share-bar-track flex-grow-1">
                    <div
                      class="share-bar-fill"
                      :style="{ width: `${Math.min(100, pm.revenue_share_percentage)}%` }"
                    ></div>
                  </div>
                  <span class="small fw-semibold">{{ pm.revenue_share_percentage }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= TAB 5: STAFF PERFORMANCE (OWNER) ================= -->
    <div v-if="activeTab === 'STAFF_PERFORMANCE'" class="clean-card">
      <div class="card-toolbar">
        <span class="fw-bold text-dark">{{ $t('reports.staffPerformanceTitle') }}</span>
      </div>

      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('reports.colStaffMember') }}</th>
              <th>{{ $t('reports.colRole') }}</th>
              <th>{{ $t('reports.colShiftsOpened') }}</th>
              <th>{{ $t('reports.colPaidOrders') }}</th>
              <th>{{ $t('reports.colAvgOrderValue') }}</th>
              <th>{{ $t('reports.colDiscountsGiven') }}</th>
              <th class="text-end">{{ $t('reports.colTotalPaidSales') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="st in staffPerformanceData.staff" :key="st.staff_id">
              <td>
                <div class="fw-bold text-dark">{{ st.staff_name }}</div>
                <div class="small text-muted">{{ st.staff_email }}</div>
              </td>
              <td>
                <span class="method-pill">{{ st.role }}</span>
              </td>
              <td>{{ st.shifts_count }}</td>
              <td class="fw-semibold">{{ st.paid_orders_count }}</td>
              <td>{{ formatUsd(st.average_order_value_usd) }}</td>
              <td class="text-danger">
                {{ st.total_discounts_usd > 0 ? formatUsd(st.total_discounts_usd) : '$0.00' }}
              </td>
              <td class="text-end">
                <div class="fw-bold text-dark">{{ formatUsd(st.total_sales_usd) }}</div>
                <div class="small text-muted">{{ formatKhr(usdToKhr(st.total_sales_usd)) }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()

const activeTab = ref('TOP_PRODUCTS')
const activePreset = ref('MONTH')
const isLoading = ref(false)

const datePresets = [
  { key: 'TODAY', labelKey: 'dashboard.today' },
  { key: '7D', labelKey: 'dashboard.last7Days' },
  { key: 'MONTH', labelKey: 'dashboard.thisMonth' },
  { key: 'ALL', labelKey: 'dashboard.allTime' },
]

const dateRange = reactive({
  start_date: '',
  end_date: '',
})

// Tab specific state
const topProductsLimit = ref(10)
const topProductsData = reactive({
  total_revenue_sum: 0,
  products: [],
})

const inventoryLowStockOnly = ref(false)
const inventoryUsageData = reactive({
  total_ingredients_count: 0,
  low_stock_alert_count: 0,
  ingredients: [],
})

const categoriesData = reactive({
  total_revenue_sum: 0,
  categories: [],
})

const paymentMethodsData = reactive({
  summary: {
    total_gross_amount_usd: 0,
    total_refunded_usd: 0,
    total_net_amount_usd: 0,
  },
  payment_methods: [],
})

const staffPerformanceData = reactive({
  staff: [],
})

// ================= HELPERS =================
const toIsoDateStr = (d) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const applyPreset = (key) => {
  activePreset.value = key
  const now = new Date()

  if (key === 'TODAY') {
    const t = toIsoDateStr(now)
    dateRange.start_date = t
    dateRange.end_date = t
  } else if (key === '7D') {
    const past = new Date(now)
    past.setDate(now.getDate() - 6)
    dateRange.start_date = toIsoDateStr(past)
    dateRange.end_date = toIsoDateStr(now)
  } else if (key === 'MONTH') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    dateRange.start_date = toIsoDateStr(first)
    dateRange.end_date = toIsoDateStr(now)
  } else {
    dateRange.start_date = ''
    dateRange.end_date = ''
  }

  loadCurrentTabReport()
}

const handleCustomDate = () => {
  activePreset.value = 'CUSTOM'
  loadCurrentTabReport()
}

const switchTab = (tab) => {
  activeTab.value = tab
  loadCurrentTabReport()
}

const buildDateParams = () => {
  const p = {}
  if (dateRange.start_date) p.start_date = dateRange.start_date
  if (dateRange.end_date) p.end_date = dateRange.end_date
  return p
}

const loadCurrentTabReport = async () => {
  isLoading.value = true
  const baseParams = buildDateParams()

  try {
    if (activeTab.value === 'TOP_PRODUCTS') {
      const res = await api.get('/reports/top-products', {
        params: { ...baseParams, limit: topProductsLimit.value },
      })
      topProductsData.total_revenue_sum = res.data?.data?.total_revenue_sum || 0
      topProductsData.products = res.data?.data?.products || []
    } else if (activeTab.value === 'INVENTORY_USAGE') {
      const res = await api.get('/reports/inventory-usage', {
        params: { ...baseParams, low_stock_only: inventoryLowStockOnly.value },
      })
      Object.assign(inventoryUsageData, res.data?.data || {})
    } else if (activeTab.value === 'CATEGORIES') {
      const res = await api.get('/reports/categories', { params: baseParams })
      categoriesData.total_revenue_sum = res.data?.data?.total_revenue_sum || 0
      categoriesData.categories = res.data?.data?.categories || []
    } else if (activeTab.value === 'PAYMENT_METHODS') {
      const res = await api.get('/reports/payment-methods', { params: baseParams })
      if (res.data?.data) {
        Object.assign(paymentMethodsData.summary, res.data.data.summary || {})
        paymentMethodsData.payment_methods = res.data.data.payment_methods || []
      }
    } else if (activeTab.value === 'STAFF_PERFORMANCE') {
      const res = await api.get('/reports/staff-performance', { params: baseParams })
      staffPerformanceData.staff = res.data?.data?.staff || []
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load report data')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  applyPreset('MONTH')
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

.preset-pills {
  display: inline-flex;
  background: #f2efeb;
  padding: 3px;
  border-radius: 10px;
  border: 1px solid #e6e2dc;
}

.preset-pill {
  border: none;
  background: transparent;
  color: #574c45;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.32rem 0.75rem;
  border-radius: 8px;
}

.preset-pill.active {
  background: #2d5a43;
  color: #ffffff;
}

.filter-date,
.filter-select {
  width: auto;
  border-radius: 9px;
  border: 1px solid #dedad4;
}

.report-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.report-tab {
  border: 1px solid #e2ddd6;
  background: #ffffff;
  color: #4f433d;
  border-radius: 11px;
  padding: 0.5rem 1rem;
  font-size: 0.84rem;
  font-weight: 700;
  transition: all 0.15s ease;
}

.report-tab.active {
  background: #2d5a43;
  color: #ffffff;
  border-color: #2d5a43;
}

.clean-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
}

.card-toolbar {
  padding: 0.9rem 1.15rem;
  border-bottom: 1px solid #eeeae4;
  background: #fcfbfa;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
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

.rank-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 24px;
  border-radius: 6px;
  background: #f2efeb;
  color: #574c45;
  font-weight: 700;
  font-size: 0.75rem;
}

.rank-pill.top3 {
  background: #d6ede0;
  color: #2d5a43;
}

.share-bar-track {
  height: 8px;
  background: #f2efeb;
  border-radius: 999px;
  overflow: hidden;
}

.share-bar-fill {
  height: 100%;
  background: #2d5a43;
  border-radius: 999px;
}

.method-pill {
  background: #f4f1ed;
  color: #2d5a43;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.status-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.status-tag.low {
  background: #fef3c7;
  color: #b45309;
}

.status-tag.ok {
  background: #dcfce7;
  color: #15803d;
}

.btn-light-coffee {
  background: #f4f1ed;
  color: #2d5a43;
  border: 1px solid #e6e1da;
  border-radius: 9px;
  font-weight: 600;
}

.empty-box {
  padding: 3.5rem 1rem;
  text-align: center;
}
</style>
