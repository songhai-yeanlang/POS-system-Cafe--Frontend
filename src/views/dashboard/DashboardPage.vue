<template>
  <div class="dashboard-ledger">
    <!-- ================= TOP CONTROL BAR ================= -->
    <header class="ledger-toolbar">
      <div class="period-segmented" role="group" aria-label="Date presets">
        <button
          v-for="p in datePresets"
          :key="p.key"
          type="button"
          class="segment-btn"
          :class="{ active: activePreset === p.key }"
          @click="applyDatePreset(p.key)"
        >
          {{ $t(p.labelKey) }}
        </button>
      </div>

      <div class="toolbar-dates">
        <div class="date-range-capsule">
          <i class="bi bi-calendar3 text-muted"></i>
          <input
            v-model="filters.start_date"
            type="date"
            class="date-input-clean"
            aria-label="Start date"
            @change="handleCustomDateChange"
          />
          <span class="date-range-sep">–</span>
          <input
            v-model="filters.end_date"
            type="date"
            class="date-input-clean"
            aria-label="End date"
            @change="handleCustomDateChange"
          />
        </div>

        <button
          type="button"
          class="btn-refresh-ledger"
          :disabled="isLoading"
          :title="$t('dashboard.refresh')"
          @click="fetchAllDashboardData"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': isLoading }"></i>
          <span class="d-none d-sm-inline">{{ $t('dashboard.refresh') }}</span>
        </button>
      </div>
    </header>

    <!-- ================= HERO FINANCIAL STATEMENT SHEET ================= -->
    <section class="financial-statement-sheet">
      <!-- Primary Revenue & Profit Anchor -->
      <div class="statement-hero">
        <div class="statement-hero-split">
          <!-- Net Sales Column -->
          <div class="hero-metric-block">
            <div class="metric-label-row">
              <span class="metric-label">{{ $t('dashboard.netSales') }}</span>
              <span v-if="financials.gross_sales_usd > 0" class="metric-pill-neutral tabular">
                {{ $t('dashboard.grossSales') }}: {{ formatUsd(financials.gross_sales_usd) }}
              </span>
            </div>
            <div class="hero-figure tabular">{{ formatUsd(financials.net_sales_usd) }}</div>
            <div class="hero-khr tabular">
              {{ formatKhr(usdToKhr(financials.net_sales_usd)) }}
            </div>
          </div>

          <!-- Net Operating Profit Column -->
          <div class="hero-metric-block hero-profit-block">
            <div class="metric-label-row">
              <span class="metric-label">{{ $t('dashboard.netProfit') }}</span>
              <span
                class="margin-pill tabular"
                :class="profitMarginPercent >= 0 ? 'positive' : 'negative'"
              >
                {{ $t('dashboard.margin') }} {{ profitMarginPercent >= 0 ? '+' : '' }}{{ profitMarginPercent }}%
              </span>
            </div>
            <div
              class="hero-figure tabular"
              :class="financials.net_operating_profit_usd >= 0 ? 'figure-positive' : 'figure-negative'"
            >
              {{ formatUsd(financials.net_operating_profit_usd) }}
            </div>
            <div class="hero-khr tabular">
              {{ formatKhr(usdToKhr(financials.net_operating_profit_usd)) }}
            </div>
          </div>
        </div>

        <!-- Revenue Flow Proportion Bar -->
        <div class="revenue-flow-strip">
          <div class="flow-bar-track" aria-hidden="true">
            <div
              class="flow-segment seg-profit"
              :style="{ width: `${flowWidths.profit}%` }"
              :title="`${$t('dashboard.netProfit')}: ${formatUsd(Math.max(0, financials.net_operating_profit_usd))}`"
            ></div>
            <div
              class="flow-segment seg-expenses"
              :style="{ width: `${flowWidths.expenses}%` }"
              :title="`${$t('dashboard.expenses')}: ${formatUsd(financials.total_expenses_usd)}`"
            ></div>
            <div
              class="flow-segment seg-deductions"
              :style="{ width: `${flowWidths.deductions}%` }"
              :title="`${$t('dashboard.discounts')} & ${$t('dashboard.refunds', { amount: formatUsd(financials.total_refunded_usd) })}`"
            ></div>
          </div>
          <div class="flow-legend">
            <span class="flow-legend-item">
              <span class="legend-dot seg-profit"></span>
              <span>{{ $t('dashboard.netProfit') }}</span>
              <strong class="tabular">{{ formatUsd(financials.net_operating_profit_usd) }}</strong>
            </span>
            <span class="flow-legend-item">
              <span class="legend-dot seg-expenses"></span>
              <span>{{ $t('dashboard.expenses') }}</span>
              <strong class="tabular">{{ formatUsd(financials.total_expenses_usd) }}</strong>
            </span>
            <span class="flow-legend-item">
              <span class="legend-dot seg-deductions"></span>
              <span>{{ $t('dashboard.discounts') }}</span>
              <strong class="tabular">{{ formatUsd(financials.total_discounts_usd) }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Right Secondary Operational Counters -->
      <div class="statement-side-metrics">
        <!-- Paid Orders & Ticket Average -->
        <div class="side-metric-cell">
          <div class="d-flex justify-content-between align-items-baseline mb-1">
            <span class="metric-label">{{ $t('dashboard.paidOrders') }}</span>
            <span class="side-meta tabular">
              {{ $t('dashboard.avgOrder', { amount: formatUsd(financials.average_order_value_usd) }) }}
            </span>
          </div>
          <div class="side-figure tabular">{{ ordersStats.paid_orders }}</div>
          <div class="side-sub-pills">
            <span class="status-micro-pill">
              {{ $t('dashboard.openCount', { count: ordersStats.open_orders || 0 }) }}
            </span>
            <span v-if="ordersStats.cancelled_orders > 0" class="status-micro-pill muted">
              {{ $t('dashboard.cancelledCount', { count: ordersStats.cancelled_orders }) }}
            </span>
          </div>
        </div>

        <!-- Expenses & Refunds Outflow -->
        <div class="side-metric-cell">
          <div class="d-flex justify-content-between align-items-baseline mb-1">
            <span class="metric-label">{{ $t('dashboard.expenses') }}</span>
            <span class="side-meta tabular">
              {{ $t('dashboard.transactions', { count: expensesCount }) }}
            </span>
          </div>
          <div class="side-figure figure-negative tabular">
            {{ formatUsd(financials.total_expenses_usd) }}
          </div>
          <div class="side-sub-row tabular">
            <span>{{ $t('dashboard.refunds', { amount: formatUsd(financials.total_refunded_usd) }) }}</span>
            <span v-if="refundsCount > 0" class="text-muted">({{ refundsCount }})</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= MIDDLE WORKSPACE: TREND & PAYMENT CHANNELS ================= -->
    <div class="ledger-grid-mid">
      <!-- Sales Trend Panel -->
      <section class="ledger-panel">
        <div class="panel-head">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <h2 class="panel-title mb-0">{{ $t('dashboard.salesTrend') }}</h2>
            <span v-if="salesTrend.peak_period" class="peak-callout tabular">
              <i class="bi bi-lightning-charge-fill"></i>
              {{ $t('dashboard.peakPeriod', { period: formatPeriodShort(salesTrend.peak_period) }) }}
            </span>
          </div>

          <div class="period-segmented period-segmented-sm" role="group">
            <button
              v-for="g in ['hour', 'day', 'month']"
              :key="g"
              type="button"
              class="segment-btn"
              :class="{ active: trendGroupBy === g }"
              @click="changeTrendGroupBy(g)"
            >
              {{
                g === 'hour'
                  ? $t('dashboard.byHour')
                  : g === 'day'
                    ? $t('dashboard.byDay')
                    : $t('dashboard.byMonth')
              }}
            </button>
          </div>
        </div>

        <!-- Active / Hovered Bar Readout Strip -->
        <div v-if="visibleTrendPoints.length > 0 && activeTrendPoint" class="trend-inspector-bar">
          <div class="d-flex align-items-center gap-2">
            <span class="inspector-period tabular">{{ activeTrendPoint.period }}</span>
            <span
              v-if="activeTrendPoint.orders_count !== undefined"
              class="inspector-orders tabular"
            >
              {{ $t('dashboard.ordersCount', { count: activeTrendPoint.orders_count }) }}
            </span>
          </div>
          <div class="d-flex align-items-baseline gap-2">
            <strong class="inspector-usd tabular">
              {{ formatUsd(activeTrendPoint.net_sales_usd) }}
            </strong>
            <span class="inspector-khr tabular">
              {{ formatKhr(usdToKhr(activeTrendPoint.net_sales_usd)) }}
            </span>
          </div>
        </div>

        <div class="panel-body">
          <div v-if="visibleTrendPoints.length === 0" class="empty-state">
            <i class="bi bi-bar-chart-line empty-icon"></i>
            <p class="empty-text mb-0">{{ $t('dashboard.noPaidSales') }}</p>
          </div>

          <div v-else class="chart-stage">
            <div
              v-for="pt in visibleTrendPoints"
              :key="pt.period"
              class="chart-col"
              :class="{
                'is-peak': pt.period === salesTrend.peak_period,
                'is-focused': focusedPeriod === pt.period,
              }"
              @mouseenter="focusedPeriod = pt.period"
              @focus="focusedPeriod = pt.period"
              tabindex="0"
            >
              <div class="chart-col-val tabular">{{ formatUsdCompact(pt.net_sales_usd) }}</div>
              <div class="chart-col-well">
                <div
                  class="chart-col-bar"
                  :style="{ height: `${getTrendBarHeight(pt.net_sales_usd)}%` }"
                ></div>
              </div>
              <div class="chart-col-label tabular" :title="pt.period">
                {{ formatPeriodShort(pt.period) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Payment Channels Settlement Panel -->
      <section class="ledger-panel">
        <div class="panel-head">
          <h2 class="panel-title mb-0">{{ $t('dashboard.paymentChannels') }}</h2>
          <span v-if="paymentsBreakdown.length > 0" class="panel-meta tabular">
            {{ formatUsd(totalPaymentsUsd) }}
          </span>
        </div>

        <div class="panel-body">
          <div v-if="paymentsBreakdown.length === 0" class="empty-state">
            <i class="bi bi-credit-card-2-front empty-icon"></i>
            <p class="empty-text mb-0">{{ $t('dashboard.noCompletedPayments') }}</p>
          </div>

          <div v-else class="tender-list">
            <div
              v-for="(pm, idx) in enrichedPayments"
              :key="idx"
              class="tender-item"
            >
              <div class="tender-item-top">
                <div class="d-flex align-items-center gap-2">
                  <span class="tender-badge" :class="getMethodClass(pm.method)">
                    {{ formatMethodName(pm.method) }}
                  </span>
                  <span class="tender-currency tabular">{{ pm.currency }}</span>
                  <span class="tender-txns tabular">
                    {{ $t('dashboard.transactions', { count: pm.transaction_count }) }}
                  </span>
                </div>
                <div class="text-end">
                  <div class="tender-amount tabular">{{ formatUsd(pm.net_amount_usd) }}</div>
                </div>
              </div>

              <div class="tender-bar-row">
                <div class="tender-bar-track">
                  <div
                    class="tender-bar-fill"
                    :class="getMethodClass(pm.method)"
                    :style="{ width: `${pm.sharePercent}%` }"
                  ></div>
                </div>
                <span class="tender-share tabular">{{ pm.sharePercent }}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ================= BOTTOM WORKSPACE: TOP MENU ITEMS & PANTRY STOCK ================= -->
    <div class="ledger-grid-bottom">
      <!-- Top Selling Menu Variants -->
      <section class="ledger-panel">
        <div class="panel-head">
          <h2 class="panel-title mb-0">{{ $t('dashboard.topSellingItems') }}</h2>
          <router-link to="/reports" class="panel-action-link">
            <span>{{ $t('dashboard.fullReports') }}</span>
            <i class="bi bi-arrow-up-right"></i>
          </router-link>
        </div>

        <div v-if="topProducts.length === 0" class="panel-body empty-state">
          <i class="bi bi-cup-hot empty-icon"></i>
          <p class="empty-text mb-0">{{ $t('dashboard.noProductSales') }}</p>
        </div>

        <div v-else class="table-responsive">
          <table class="ledger-table align-middle mb-0">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th>{{ $t('dashboard.colProduct') }}</th>
                <th>{{ $t('dashboard.colCategory') }}</th>
                <th class="text-end">{{ $t('dashboard.colSold') }}</th>
                <th class="text-end col-rev">{{ $t('dashboard.colRevenue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in topProducts" :key="item.variant_id">
                <td class="col-rank">
                  <span class="rank-index tabular" :class="{ 'rank-first': item.rank === 1 }">
                    {{ item.rank }}
                  </span>
                </td>
                <td>
                  <div class="product-cell-name">{{ item.product_name }}</div>
                  <div class="product-cell-variant">{{ item.variant_name }}</div>
                </td>
                <td>
                  <span class="category-chip">{{ $tCategory(item.category_name) }}</span>
                </td>
                <td class="text-end">
                  <span class="sold-qty tabular">{{ item.total_quantity_sold }}</span>
                </td>
                <td class="text-end col-rev">
                  <div class="rev-figure tabular">{{ formatUsd(item.total_revenue_usd) }}</div>
                  <div class="rev-share-track" :title="`${getProductShare(item)}%`">
                    <div
                      class="rev-share-fill"
                      :style="{ width: `${getProductShare(item)}%` }"
                    ></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Low-Stock Alerts & Pantry Watch -->
      <section class="ledger-panel">
        <div class="panel-head">
          <div class="d-flex align-items-center gap-2">
            <h2 class="panel-title mb-0">{{ $t('dashboard.lowStockAlerts') }}</h2>
            <span v-if="lowStockItems.length > 0" class="alert-count-pill tabular">
              {{ lowStockItems.length }}
            </span>
          </div>
          <router-link to="/inventory" class="panel-action-link">
            <span>{{ $t('dashboard.restock') }}</span>
            <i class="bi bi-arrow-up-right"></i>
          </router-link>
        </div>

        <div class="panel-body">
          <div v-if="lowStockItems.length === 0" class="empty-state healthy-state">
            <div class="healthy-check">
              <i class="bi bi-check2"></i>
            </div>
            <div class="healthy-title">{{ $t('dashboard.allWellStocked') }}</div>
            <p class="empty-text mb-0">{{ $t('dashboard.allWellStockedDesc') }}</p>
          </div>

          <div v-else class="stock-watch-list">
            <div
              v-for="ing in lowStockItems.slice(0, 6)"
              :key="ing.id"
              class="stock-watch-item"
              :class="{ 'is-depleted': Number(ing.current_stock) <= 0 }"
            >
              <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                <div>
                  <div class="stock-ing-name">{{ ing.name }}</div>
                  <div class="stock-ing-min tabular">
                    {{ $t('dashboard.minRequired', { qty: formatQty(ing.minimum_stock), unit: ing.unit }) }}
                  </div>
                </div>

                <span
                  class="stock-status-pill tabular"
                  :class="Number(ing.current_stock) <= 0 ? 'status-out' : 'status-low'"
                >
                  {{ $t('dashboard.leftStock', { qty: formatQty(ing.current_stock), unit: ing.unit }) }}
                </span>
              </div>

              <div class="stock-gauge-track">
                <div
                  class="stock-gauge-fill"
                  :class="Number(ing.current_stock) <= 0 ? 'fill-out' : 'fill-low'"
                  :style="{ width: `${getStockRatio(ing)}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/api'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'

const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()

const isLoading = ref(false)
const activePreset = ref('MONTH')
const trendGroupBy = ref('day')
const focusedPeriod = ref(null)

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

// ================= COMPUTED METRICS =================
const profitMarginPercent = computed(() => {
  const net = Number(financials.net_sales_usd) || 0
  const profit = Number(financials.net_operating_profit_usd) || 0
  if (net <= 0) return profit < 0 ? -100 : 0
  return Math.round((profit / net) * 100)
})

const flowWidths = computed(() => {
  const profit = Math.max(0, Number(financials.net_operating_profit_usd) || 0)
  const expenses = Math.max(0, Number(financials.total_expenses_usd) || 0)
  const deductions =
    Math.max(0, Number(financials.total_discounts_usd) || 0) +
    Math.max(0, Number(financials.total_refunded_usd) || 0)

  const total = profit + expenses + deductions
  if (total <= 0) {
    return { profit: 100, expenses: 0, deductions: 0 }
  }
  return {
    profit: Math.max(2, Math.round((profit / total) * 100)),
    expenses: Math.round((expenses / total) * 100),
    deductions: Math.round((deductions / total) * 100),
  }
})

const visibleTrendPoints = computed(() => {
  return salesTrend.data.slice(-14)
})

const activeTrendPoint = computed(() => {
  if (!visibleTrendPoints.value.length) return null
  if (focusedPeriod.value) {
    const found = visibleTrendPoints.value.find((p) => p.period === focusedPeriod.value)
    if (found) return found
  }
  if (salesTrend.peak_period) {
    const peak = visibleTrendPoints.value.find((p) => p.period === salesTrend.peak_period)
    if (peak) return peak
  }
  return visibleTrendPoints.value[visibleTrendPoints.value.length - 1]
})

const totalPaymentsUsd = computed(() => {
  return paymentsBreakdown.value.reduce((sum, pm) => sum + (Number(pm.net_amount_usd) || 0), 0)
})

const enrichedPayments = computed(() => {
  const total = totalPaymentsUsd.value
  return paymentsBreakdown.value.map((pm) => {
    const amt = Number(pm.net_amount_usd) || 0
    const sharePercent = total > 0 ? Math.round((amt / total) * 100) : 0
    return {
      ...pm,
      sharePercent,
    }
  })
})

const maxProductRevenue = computed(() => {
  if (!topProducts.value.length) return 1
  return Math.max(...topProducts.value.map((p) => Number(p.total_revenue_usd) || 0), 1)
})

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
  const maxVal = Math.max(...visibleTrendPoints.value.map((d) => Number(d.net_sales_usd) || 0), 1)
  return Math.max(6, Math.round(((Number(val) || 0) / maxVal) * 100))
}

const formatPeriodShort = (period) => {
  if (!period) return ''
  if (period.length > 10) return period.slice(11) // HH:00
  if (period.length === 10) return period.slice(5) // MM-DD
  return period
}

const formatUsdCompact = (val) => {
  const num = Number(val) || 0
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}k`
  }
  return formatUsd(num)
}

const formatMethodName = (method) => {
  if (method === 'BANK_TRANSFER') return 'Bank'
  if (method === 'CASH') return 'Cash'
  return method
}

const getMethodClass = (method) => {
  if (method === 'KHQR') return 'method-khqr'
  if (method === 'BANK_TRANSFER') return 'method-bank'
  return 'method-cash'
}

const getProductShare = (item) => {
  if (item.revenue_share_percentage !== undefined) {
    return Math.max(4, Math.min(100, Math.round(Number(item.revenue_share_percentage))))
  }
  const rev = Number(item.total_revenue_usd) || 0
  return Math.max(4, Math.round((rev / maxProductRevenue.value) * 100))
}

const formatQty = (qty) => {
  const n = Number(qty)
  if (Number.isNaN(n)) return qty
  return Number.isInteger(n) ? n : Number(n.toFixed(2))
}

const getStockRatio = (ing) => {
  const current = Math.max(0, Number(ing.current_stock) || 0)
  const min = Math.max(1, Number(ing.minimum_stock) || 1)
  return Math.min(100, Math.max(4, Math.round((current / min) * 100)))
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
      focusedPeriod.value = salesTrend.peak_period
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
      focusedPeriod.value = salesTrend.peak_period
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
.dashboard-ledger {
  --roast-ink: #16211b;
  --roast-muted: #526358;
  --forest-roast: #2d5a43;
  --forest-deep: #1e3f2f;
  --forest-wash: #e8f2ec;
  --ledger-surface: #ffffff;
  --stone-surface: #f3f6f4;
  --rule-border: #dce4df;
  --rule-subtle: #eaf0ec;
  --crema-amber: #b45309;
  --crema-wash: #fef3c7;
  --crimson-debit: #b91c1c;
  --crimson-wash: #fee2e2;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--roast-ink);
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* ================= TOP TOOLBAR ================= */
.ledger-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.period-segmented {
  display: inline-flex;
  background: var(--stone-surface);
  padding: 3px;
  border-radius: 9px;
  border: 1px solid var(--rule-border);
}

.period-segmented-sm .segment-btn {
  padding: 0.24rem 0.65rem;
  font-size: 0.74rem;
}

.segment-btn {
  border: none;
  background: transparent;
  color: var(--roast-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.34rem 0.85rem;
  border-radius: 6px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.segment-btn:hover:not(.active) {
  color: var(--roast-ink);
}

.segment-btn.active {
  background: var(--forest-roast);
  color: #ffffff;
}

.toolbar-dates {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.date-range-capsule {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--ledger-surface);
  border: 1px solid var(--rule-border);
  border-radius: 9px;
  padding: 0.24rem 0.65rem;
}

.date-input-clean {
  border: none;
  background: transparent;
  color: var(--roast-ink);
  font-size: 0.78rem;
  font-weight: 500;
  outline: none;
  padding: 0.1rem 0;
}

.date-range-sep {
  color: var(--roast-muted);
  font-size: 0.75rem;
}

.btn-refresh-ledger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--ledger-surface);
  color: var(--forest-roast);
  border: 1px solid var(--rule-border);
  border-radius: 9px;
  padding: 0.34rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.btn-refresh-ledger:hover:not(:disabled) {
  background: var(--forest-wash);
  border-color: #bfd4c7;
}

.btn-refresh-ledger:disabled {
  opacity: 0.6;
}

/* ================= HERO FINANCIAL STATEMENT SHEET ================= */
.financial-statement-sheet {
  display: grid;
  grid-template-columns: 1.75fr 1fr;
  background: var(--ledger-surface);
  border: 1px solid var(--rule-border);
  border-radius: 12px;
  overflow: hidden;
}

.statement-hero {
  padding: 1.25rem 1.4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.15rem;
  border-right: 1px solid var(--rule-border);
}

.statement-hero-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.hero-metric-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hero-profit-block {
  padding-left: 1.25rem;
  border-left: 1px solid var(--rule-subtle);
}

.metric-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.metric-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--roast-muted);
}

.metric-pill-neutral {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--roast-muted);
  background: var(--stone-surface);
  padding: 0.12rem 0.5rem;
  border-radius: 6px;
}

.margin-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.12rem 0.5rem;
  border-radius: 6px;
}

.margin-pill.positive {
  background: var(--forest-wash);
  color: var(--forest-roast);
}

.margin-pill.negative {
  background: var(--crimson-wash);
  color: var(--crimson-debit);
}

.hero-figure {
  font-size: clamp(1.55rem, 2.2vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--roast-ink);
  margin-top: 0.1rem;
}

.figure-positive {
  color: var(--forest-roast);
}

.figure-negative {
  color: var(--crimson-debit);
}

.hero-khr {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--roast-muted);
}

/* Revenue Composition Strip */
.revenue-flow-strip {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--rule-subtle);
}

.flow-bar-track {
  height: 7px;
  background: var(--stone-surface);
  border-radius: 999px;
  display: flex;
  overflow: hidden;
  gap: 2px;
}

.flow-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.seg-profit {
  background: var(--forest-roast);
}

.seg-expenses {
  background: var(--crimson-debit);
}

.seg-deductions {
  background: #d97706;
}

.flow-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.74rem;
  color: var(--roast-muted);
}

.flow-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.flow-legend-item strong {
  color: var(--roast-ink);
  font-weight: 600;
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  display: inline-block;
}

/* Right Operational Counters */
.statement-side-metrics {
  display: grid;
  grid-template-rows: 1fr 1fr;
}

.side-metric-cell {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.side-metric-cell + .side-metric-cell {
  border-top: 1px solid var(--rule-border);
}

.side-meta {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--roast-muted);
}

.side-figure {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--roast-ink);
}

.side-sub-pills {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.status-micro-pill {
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--stone-surface);
  color: var(--roast-ink);
  padding: 0.1rem 0.45rem;
  border-radius: 5px;
}

.status-micro-pill.muted {
  color: var(--roast-muted);
}

.side-sub-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--roast-muted);
  margin-top: 0.25rem;
}

/* ================= WORKSPACE GRIDS & PANELS ================= */
.ledger-grid-mid {
  display: grid;
  grid-template-columns: 1.75fr 1fr;
  gap: 1rem;
}

.ledger-grid-bottom {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 1rem;
}

.ledger-panel {
  background: var(--ledger-surface);
  border: 1px solid var(--rule-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  padding: 0.85rem 1.15rem;
  border-bottom: 1px solid var(--rule-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.panel-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.panel-meta {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--forest-roast);
}

.panel-action-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--forest-roast);
  text-decoration: none;
  padding: 0.22rem 0.55rem;
  border-radius: 6px;
  background: var(--forest-wash);
  transition: background-color 0.15s ease;
}

.panel-action-link:hover {
  background: #d5e8dc;
}

.panel-body {
  padding: 1rem 1.15rem;
  flex: 1;
}

/* ================= SALES TREND CHART ================= */
.peak-callout {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--crema-wash);
  color: var(--crema-amber);
  padding: 0.14rem 0.5rem;
  border-radius: 6px;
}

.trend-inspector-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 1.15rem;
  background: var(--stone-surface);
  border-bottom: 1px solid var(--rule-subtle);
  font-size: 0.78rem;
}

.inspector-period {
  font-weight: 600;
  color: var(--roast-ink);
}

.inspector-orders {
  font-size: 0.72rem;
  color: var(--roast-muted);
  background: #ffffff;
  padding: 0.08rem 0.45rem;
  border-radius: 4px;
  border: 1px solid var(--rule-border);
}

.inspector-usd {
  color: var(--forest-roast);
  font-size: 0.86rem;
}

.inspector-khr {
  font-size: 0.74rem;
  color: var(--roast-muted);
}

.chart-stage {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  height: 175px;
  padding: 0.4rem 0.15rem 0;
  border-bottom: 1px solid var(--rule-subtle);
  overflow-x: auto;
}

.chart-col {
  flex: 1;
  min-width: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  outline: none;
}

.chart-col-val {
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--roast-muted);
  margin-bottom: 4px;
  white-space: nowrap;
}

.chart-col.is-focused .chart-col-val,
.chart-col.is-peak .chart-col-val {
  color: var(--roast-ink);
  font-weight: 700;
}

.chart-col-well {
  flex: 1;
  width: 100%;
  max-width: 30px;
  background: var(--stone-surface);
  border-radius: 5px 5px 0 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.chart-col-bar {
  width: 100%;
  background: #638c75;
  border-radius: 5px 5px 0 0;
  transition: height 0.25s ease, background-color 0.15s ease;
}

.chart-col:hover .chart-col-bar,
.chart-col.is-focused .chart-col-bar {
  background: var(--forest-roast);
}

.chart-col.is-peak .chart-col-bar {
  background: var(--forest-deep);
}

.chart-col-label {
  font-size: 0.68rem;
  color: var(--roast-muted);
  margin-top: 6px;
  white-space: nowrap;
}

/* ================= PAYMENT CHANNELS ================= */
.tender-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.tender-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tender-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.tender-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.14rem 0.5rem;
  border-radius: 5px;
}

.tender-badge.method-cash {
  background: var(--forest-wash);
  color: var(--forest-roast);
}

.tender-badge.method-khqr {
  background: #fee2e2;
  color: #991b1b;
}

.tender-badge.method-bank {
  background: #e0f2fe;
  color: #075985;
}

.tender-currency {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--roast-muted);
  border: 1px solid var(--rule-border);
  padding: 0.08rem 0.38rem;
  border-radius: 4px;
}

.tender-txns {
  font-size: 0.72rem;
  color: var(--roast-muted);
}

.tender-amount {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.tender-bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tender-bar-track {
  flex: 1;
  height: 5px;
  background: var(--stone-surface);
  border-radius: 999px;
  overflow: hidden;
}

.tender-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.tender-bar-fill.method-cash {
  background: var(--forest-roast);
}

.tender-bar-fill.method-khqr {
  background: #dc2626;
}

.tender-bar-fill.method-bank {
  background: #0284c7;
}

.tender-share {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--roast-muted);
  min-width: 32px;
  text-align: right;
}

/* ================= TOP SELLING TABLE ================= */
.ledger-table {
  width: 100%;
  border-collapse: collapse;
}

.ledger-table th {
  background: var(--stone-surface);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--roast-muted);
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--rule-border);
}

.ledger-table td {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--rule-subtle);
  font-size: 0.82rem;
}

.ledger-table tbody tr:last-child td {
  border-bottom: none;
}

.col-rank {
  width: 44px;
}

.col-rev {
  min-width: 115px;
}

.rank-index {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--stone-surface);
  color: var(--roast-muted);
  font-weight: 700;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rank-index.rank-first {
  background: var(--forest-roast);
  color: #ffffff;
}

.product-cell-name {
  font-weight: 600;
  color: var(--roast-ink);
  line-height: 1.25;
}

.product-cell-variant {
  font-size: 0.73rem;
  color: var(--roast-muted);
}

.category-chip {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--roast-muted);
  background: var(--stone-surface);
  padding: 0.14rem 0.5rem;
  border-radius: 5px;
}

.sold-qty {
  font-weight: 600;
  color: var(--roast-ink);
}

.rev-figure {
  font-weight: 700;
  color: var(--roast-ink);
}

.rev-share-track {
  height: 4px;
  background: var(--stone-surface);
  border-radius: 999px;
  margin-top: 4px;
  overflow: hidden;
}

.rev-share-fill {
  height: 100%;
  background: var(--forest-roast);
  border-radius: 999px;
}

/* ================= LOW STOCK WATCH LIST ================= */
.alert-count-pill {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--crema-wash);
  color: var(--crema-amber);
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}

.stock-watch-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.stock-watch-item {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--rule-border);
  border-radius: 9px;
  background: #ffffff;
}

.stock-watch-item.is-depleted {
  border-color: #fecaca;
  background: #fffafa;
}

.stock-ing-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--roast-ink);
}

.stock-ing-min {
  font-size: 0.72rem;
  color: var(--roast-muted);
}

.stock-status-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  white-space: nowrap;
}

.stock-status-pill.status-low {
  background: var(--crema-wash);
  color: var(--crema-amber);
}

.stock-status-pill.status-out {
  background: var(--crimson-wash);
  color: var(--crimson-debit);
}

.stock-gauge-track {
  height: 4px;
  background: var(--stone-surface);
  border-radius: 999px;
  margin-top: 0.45rem;
  overflow: hidden;
}

.stock-gauge-fill {
  height: 100%;
  border-radius: 999px;
}

.stock-gauge-fill.fill-low {
  background: #d97706;
}

.stock-gauge-fill.fill-out {
  background: var(--crimson-debit);
}

/* ================= EMPTY STATES ================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1rem;
  color: var(--roast-muted);
}

.empty-icon {
  font-size: 1.5rem;
  margin-bottom: 0.35rem;
  opacity: 0.65;
}

.empty-text {
  font-size: 0.8rem;
}

.healthy-check {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--forest-wash);
  color: var(--forest-roast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-bottom: 0.45rem;
}

.healthy-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--roast-ink);
  margin-bottom: 0.15rem;
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

/* ================= RESPONSIVE BREAKPOINTS ================= */
@media (max-width: 991.98px) {
  .financial-statement-sheet,
  .ledger-grid-mid,
  .ledger-grid-bottom {
    grid-template-columns: 1fr;
  }

  .statement-hero {
    border-right: none;
    border-bottom: 1px solid var(--rule-border);
  }

  .statement-side-metrics {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }

  .side-metric-cell + .side-metric-cell {
    border-top: none;
    border-left: 1px solid var(--rule-border);
  }
}

@media (max-width: 575.98px) {
  .statement-hero-split,
  .statement-side-metrics {
    grid-template-columns: 1fr;
  }

  .hero-profit-block {
    padding-left: 0;
    padding-top: 0.85rem;
    border-left: none;
    border-top: 1px solid var(--rule-subtle);
  }

  .side-metric-cell + .side-metric-cell {
    border-left: none;
    border-top: 1px solid var(--rule-border);
  }
}
</style>
