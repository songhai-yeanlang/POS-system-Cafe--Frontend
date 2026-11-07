<template>
  <div class="dashboard-page">
    <!-- Quick Date Filter Bar -->
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div class="preset-pills">
        <button
          v-for="p in datePresets"
          :key="p.key"
          type="button"
          class="preset-pill"
          :class="{ active: activePreset === p.key }"
          @click="applyDatePreset(p.key)"
        >
          {{ $t(p.labelKey) }}
        </button>
      </div>

      <div class="d-flex align-items-center gap-2">
        <input
          v-model="filters.start_date"
          type="date"
          class="form-control form-control-sm filter-date"
          @change="handleCustomDateChange"
        />
        <input
          v-model="filters.end_date"
          type="date"
          class="form-control form-control-sm filter-date"
          @change="handleCustomDateChange"
        />

        <button
          type="button"
          class="btn btn-light-coffee btn-sm"
          :disabled="isLoading"
          @click="fetchAllDashboardData"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': isLoading }"></i>
        </button>
      </div>
    </div>

    <!-- Primary Financial KPI Cards (4 Columns) -->
    <div class="kpi-grid-4 mb-3">
      <div class="kpi-box">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="kpi-title">{{ $t('dashboard.netSales') }}</span>
          <div class="kpi-badge bg-coffee-soft">
            <i class="bi bi-graph-up-arrow"></i>
          </div>
        </div>
        <div class="kpi-main-val">{{ formatUsd(financials.net_sales_usd) }}</div>
        <div class="kpi-sub-val">{{ formatKhr(usdToKhr(financials.net_sales_usd)) }}</div>
      </div>

      <div class="kpi-box">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="kpi-title">{{ $t('dashboard.netProfit') }}</span>
          <div
            class="kpi-badge"
            :class="financials.net_operating_profit_usd >= 0 ? 'bg-success-soft' : 'bg-danger-soft'"
          >
            <i class="bi bi-coin"></i>
          </div>
        </div>
        <div
          class="kpi-main-val"
          :class="financials.net_operating_profit_usd >= 0 ? 'text-success' : 'text-danger'"
        >
          {{ formatUsd(financials.net_operating_profit_usd) }}
        </div>
        <div class="kpi-sub-val">
          {{ formatKhr(usdToKhr(financials.net_operating_profit_usd)) }}
        </div>
      </div>

      <div class="kpi-box">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="kpi-title">{{ $t('dashboard.paidOrders') }}</span>
          <div class="kpi-badge bg-info-soft">
            <i class="bi bi-receipt"></i>
          </div>
        </div>
        <div class="kpi-main-val">{{ ordersStats.paid_orders }}</div>
        <div class="kpi-sub-val">
          {{ $t('dashboard.avgOrder', { amount: formatUsd(financials.average_order_value_usd) }) }}
        </div>
      </div>

      <div class="kpi-box">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="kpi-title">{{ $t('dashboard.expenses') }}</span>
          <div class="kpi-badge bg-warning-soft">
            <i class="bi bi-wallet2"></i>
          </div>
        </div>
        <div class="kpi-main-val text-danger">
          {{ formatUsd(financials.total_expenses_usd) }}
        </div>
        <div class="kpi-sub-val">
          {{ $t('dashboard.refunds', { amount: formatUsd(financials.total_refunded_usd) }) }}
        </div>
      </div>
    </div>

    <!-- Middle Row: Sales Trend & Payment Breakdown -->
    <div class="row g-3 mb-3">
      <!-- Sales Trend Visual Bar Chart -->
      <div class="col-lg-8">
        <div class="clean-card h-100">
          <div class="card-header-clean">
            <div>
              <h6 class="fw-bold mb-0 text-dark">{{ $t('dashboard.salesTrend') }}</h6>
            </div>

            <div class="preset-pills">
              <button
                v-for="g in ['hour', 'day', 'month']"
                :key="g"
                type="button"
                class="preset-pill"
                :class="{ active: trendGroupBy === g }"
                @click="changeTrendGroupBy(g)"
              >
                {{ g === 'hour' ? $t('dashboard.byHour') : g === 'day' ? $t('dashboard.byDay') : $t('dashboard.byMonth') }}
              </button>
            </div>
          </div>

          <div class="card-body-clean">
            <div v-if="salesTrend.data.length === 0" class="empty-box py-4">
              <i class="bi bi-bar-chart fs-3 text-muted d-block mb-1"></i>
              <div class="small text-muted">{{ $t('dashboard.noPaidSales') }}</div>
            </div>

            <div v-else>
              <!-- Clean Visual Bar Chart -->
              <div class="trend-bars-wrap">
                <div
                  v-for="pt in salesTrend.data.slice(-14)"
                  :key="pt.period"
                  class="trend-bar-col"
                >
                  <div class="trend-bar-val">{{ formatUsd(pt.net_sales_usd) }}</div>
                  <div class="trend-bar-track">
                    <div
                      class="trend-bar-fill"
                      :style="{ height: `${getTrendBarHeight(pt.net_sales_usd)}%` }"
                    ></div>
                  </div>
                  <div class="trend-bar-label" :title="pt.period">
                    {{ formatPeriodShort(pt.period) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Methods Breakdown -->
      <div class="col-lg-4">
        <div class="clean-card h-100">
          <div class="card-header-clean">
            <h6 class="fw-bold mb-0 text-dark">{{ $t('dashboard.paymentChannels') }}</h6>
          </div>

          <div class="card-body-clean">
            <div v-if="paymentsBreakdown.length === 0" class="empty-box py-4">
              <div class="small text-muted">{{ $t('dashboard.noCompletedPayments') }}</div>
            </div>

            <div v-else class="d-flex flex-column gap-2">
              <div
                v-for="(pm, idx) in paymentsBreakdown"
                :key="idx"
                class="payment-channel-row"
              >
                <div class="d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center gap-2">
                    <span class="method-tag">{{ pm.method }}</span>
                    <span class="currency-tag">{{ pm.currency }}</span>
                    <span class="small text-muted">({{ pm.transaction_count }})</span>
                  </div>
                  <span class="fw-bold text-dark">{{ formatUsd(pm.net_amount_usd) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row: Top Selling Products & Low Stock Alerts -->
    <div class="row g-3">
      <!-- Top 5 Best Sellers -->
      <div class="col-lg-7">
        <div class="clean-card h-100">
          <div class="card-header-clean">
            <h6 class="fw-bold mb-0 text-dark">{{ $t('dashboard.topSellingItems') }}</h6>
            <router-link to="/reports" class="btn btn-light-coffee btn-xs">
              {{ $t('dashboard.fullReports') }} <i class="bi bi-arrow-right ms-1"></i>
            </router-link>
          </div>

          <div v-if="topProducts.length === 0" class="empty-box py-4">
            <div class="small text-muted">{{ $t('dashboard.noProductSales') }}</div>
          </div>

          <div v-else class="table-responsive">
            <table class="table clean-table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{{ $t('dashboard.colProduct') }}</th>
                  <th>{{ $t('dashboard.colCategory') }}</th>
                  <th>{{ $t('dashboard.colSold') }}</th>
                  <th class="text-end">{{ $t('dashboard.colRevenue') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in topProducts" :key="item.variant_id">
                  <td>
                    <span class="rank-badge">{{ item.rank }}</span>
                  </td>
                  <td>
                    <span class="fw-semibold text-dark">{{ item.product_name }}</span>
                    <span class="small text-muted ms-1">({{ item.variant_name }})</span>
                  </td>
                  <td>
                    <span class="small text-muted">{{ item.category_name }}</span>
                  </td>
                  <td>
                    <span class="fw-semibold">{{ item.total_quantity_sold }}</span>
                  </td>
                  <td class="text-end">
                    <span class="fw-bold text-dark">{{ formatUsd(item.total_revenue_usd) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Low Stock Alert List -->
      <div class="col-lg-5">
        <div class="clean-card h-100">
          <div class="card-header-clean">
            <h6 class="fw-bold mb-0 text-dark">{{ $t('dashboard.lowStockAlerts') }}</h6>
            <router-link to="/inventory" class="btn btn-light-coffee btn-xs">
              {{ $t('dashboard.restock') }} <i class="bi bi-arrow-right ms-1"></i>
            </router-link>
          </div>

          <div v-if="lowStockItems.length === 0" class="empty-box py-4">
            <i class="bi bi-check2-circle fs-3 text-success d-block mb-1"></i>
            <div class="fw-semibold text-dark small">{{ $t('dashboard.allWellStocked') }}</div>
            <div class="small text-muted">{{ $t('dashboard.allWellStockedDesc') }}</div>
          </div>

          <div v-else class="card-body-clean d-flex flex-column gap-2">
            <div
              v-for="ing in lowStockItems.slice(0, 6)"
              :key="ing.id"
              class="low-stock-row"
            >
              <div>
                <div class="fw-bold small text-dark">{{ ing.name }}</div>
                <div class="text-muted" style="font-size: 0.72rem">
                  {{ $t('dashboard.minRequired', { qty: ing.minimum_stock, unit: ing.unit }) }}
                </div>
              </div>
              <div class="text-end">
                <span
                  class="stock-tag"
                  :class="Number(ing.current_stock) <= 0 ? 'out' : 'low'"
                >
                  {{ $t('dashboard.leftStock', { qty: ing.current_stock, unit: ing.unit }) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api/api'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'

const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()

const isLoading = ref(false)
const activePreset = ref('MONTH')
const trendGroupBy = ref('day')

const datePresets = [
  { key: 'TODAY', labelKey: 'dashboard.today' },
  { key: '7D', labelKey: 'dashboard.last7Days' },
  { key: 'MONTH', labelKey: 'dashboard.thisMonth' },
  { key: 'ALL', labelKey: 'dashboard.allTime' },
]

const filters = reactive({
  start_date: '',
  end_date: '',
})

const financials = reactive({
  gross_sales_usd: 0,
  total_discounts_usd: 0,
  billed_sales_usd: 0,
  total_refunded_usd: 0,
  net_sales_usd: 0,
  total_expenses_usd: 0,
  net_operating_profit_usd: 0,
  average_order_value_usd: 0,
})

const ordersStats = reactive({
  total_orders: 0,
  paid_orders: 0,
  open_orders: 0,
  cancelled_orders: 0,
  refunded_orders: 0,
})

const refundsCount = ref(0)
const expensesCount = ref(0)
const paymentsBreakdown = ref([])

const salesTrend = reactive({
  peak_period: null,
  data: [],
})

const topProducts = ref([])
const lowStockItems = ref([])

// ================= HELPERS =================
const toIsoDateStr = (d) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const applyDatePreset = (presetKey) => {
  activePreset.value = presetKey
  const now = new Date()

  if (presetKey === 'TODAY') {
    const today = toIsoDateStr(now)
    filters.start_date = today
    filters.end_date = today
    trendGroupBy.value = 'hour'
  } else if (presetKey === '7D') {
    const past = new Date(now)
    past.setDate(now.getDate() - 6)
    filters.start_date = toIsoDateStr(past)
    filters.end_date = toIsoDateStr(now)
    trendGroupBy.value = 'day'
  } else if (presetKey === 'MONTH') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    filters.start_date = toIsoDateStr(firstDay)
    filters.end_date = toIsoDateStr(now)
    trendGroupBy.value = 'day'
  } else {
    filters.start_date = ''
    filters.end_date = ''
    trendGroupBy.value = 'month'
  }

  fetchAllDashboardData()
}

const handleCustomDateChange = () => {
  activePreset.value = 'CUSTOM'
  fetchAllDashboardData()
}

const changeTrendGroupBy = async (group) => {
  trendGroupBy.value = group
  await fetchSalesTrendOnly()
}

const getTrendBarHeight = (val) => {
  const maxVal = Math.max(...salesTrend.data.map((d) => Number(d.net_sales_usd) || 0), 1)
  return Math.max(8, Math.round(((Number(val) || 0) / maxVal) * 100))
}

const formatPeriodShort = (period) => {
  if (!period) return ''
  if (period.length > 10) return period.slice(11) // HH:00
  if (period.length === 10) return period.slice(5) // MM-DD
  return period
}

// ================= API FETCH =================
const getDateParams = () => {
  const params = {}
  if (filters.start_date) params.start_date = filters.start_date
  if (filters.end_date) params.end_date = filters.end_date
  return params
}

const fetchSalesTrendOnly = async () => {
  try {
    const res = await api.get('/reports/sales-trend', {
      params: { ...getDateParams(), group_by: trendGroupBy.value },
    })
    if (res.data?.data) {
      salesTrend.peak_period = res.data.data.peak_period
      salesTrend.data = res.data.data.data || []
    }
  } catch {
    salesTrend.data = []
  }
}

const fetchAllDashboardData = async () => {
  isLoading.value = true
  try {
    const dateParams = getDateParams()
    const [dashRes, trendRes, topRes, lowRes] = await Promise.all([
      api.get('/reports/dashboard', { params: dateParams }),
      api.get('/reports/sales-trend', {
        params: { ...dateParams, group_by: trendGroupBy.value },
      }),
      api.get('/reports/top-products', { params: { ...dateParams, limit: 5 } }),
      api.get('/inventory/ingredients/low-stock'),
    ])

    const dashData = dashRes.data?.data
    if (dashData) {
      Object.assign(financials, dashData.financials || {})
      Object.assign(ordersStats, dashData.orders || {})
      refundsCount.value = dashData.refunds_count || 0
      expensesCount.value = dashData.expenses_count || 0
      paymentsBreakdown.value = dashData.payments_breakdown || []
    }

    if (trendRes.data?.data) {
      salesTrend.peak_period = trendRes.data.data.peak_period
      salesTrend.data = trendRes.data.data.data || []
    }

    topProducts.value = topRes.data?.data?.products || []
    lowStockItems.value = lowRes.data?.data || []
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load dashboard metrics')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  applyDatePreset('MONTH')
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

.filter-date {
  width: auto;
  border-radius: 9px;
  border: 1px solid #dedad4;
}

/* KPI Grid */
.kpi-grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(225px, 1fr));
  gap: 0.9rem;
}

.kpi-box {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  padding: 1rem 1.15rem;
}

.kpi-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b5b52;
}

.kpi-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.bg-coffee-soft {
  background: #f4eee8;
  color: #2d5a43;
}

.bg-success-soft {
  background: #dcfce7;
  color: #15803d;
}

.bg-danger-soft {
  background: #fee2e2;
  color: #b91c1c;
}

.bg-info-soft {
  background: #e0f2fe;
  color: #0369a1;
}

.bg-warning-soft {
  background: #fef3c7;
  color: #b45309;
}

.kpi-main-val {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1c1917;
  line-height: 1.15;
}

.kpi-sub-val {
  font-size: 0.78rem;
  color: #78716c;
  margin-top: 2px;
}

.kpi-foot {
  font-size: 0.72rem;
  color: #8a7f78;
}

/* Clean Cards */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
}

.card-header-clean {
  padding: 0.9rem 1.15rem;
  border-bottom: 1px solid #eeeae4;
  background: #fcfbfa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-body-clean {
  padding: 1rem 1.15rem;
}

/* Visual Bar Chart */
.trend-bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 145px;
  padding: 0.5rem 0.25rem 0;
  border-bottom: 1px solid #eeeae4;
  overflow-x: auto;
}

.trend-bar-col {
  flex: 1;
  min-width: 42px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.trend-bar-val {
  font-size: 0.65rem;
  font-weight: 700;
  color: #574c45;
  margin-bottom: 4px;
}

.trend-bar-track {
  flex: 1;
  width: 24px;
  background: #f4f1ed;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.trend-bar-fill {
  width: 100%;
  background: #2d5a43;
  border-radius: 6px 6px 0 0;
  transition: height 0.25s ease;
}

.trend-bar-label {
  font-size: 0.68rem;
  color: #78716c;
  margin-top: 5px;
  white-space: nowrap;
}

.clean-table-sm th {
  background: #faf9f7;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b5b52;
  font-weight: 700;
  padding: 0.55rem 0.9rem;
}

.clean-table-sm td {
  padding: 0.55rem 0.9rem;
  font-size: 0.82rem;
}

/* Payment Channel Row */
.payment-channel-row {
  background: #faf9f7;
  border: 1px solid #ece8e2;
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
}

.method-tag {
  font-size: 0.72rem;
  font-weight: 700;
  background: #2d5a43;
  color: #ffffff;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.currency-tag {
  font-size: 0.7rem;
  font-weight: 700;
  background: #d6ede0;
  color: #2d5a43;
  padding: 0.14rem 0.45rem;
  border-radius: 6px;
}

.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #f4f1ed;
  color: #2d5a43;
  font-weight: 800;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.low-stock-row {
  background: #faf9f7;
  border: 1px solid #ece8e2;
  border-radius: 11px;
  padding: 0.6rem 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stock-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
}

.stock-tag.low {
  background: #fef3c7;
  color: #b45309;
}

.stock-tag.out {
  background: #fee2e2;
  color: #b91c1c;
}

.btn-light-coffee {
  background: #f4f1ed;
  color: #2d5a43;
  border: 1px solid #e6e1da;
  border-radius: 9px;
  font-weight: 600;
}

.btn-xs {
  font-size: 0.74rem;
  padding: 0.25rem 0.6rem;
}

.empty-box {
  text-align: center;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.spin-anim {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
</style>
