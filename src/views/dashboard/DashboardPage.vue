<template>
  <div class="dashboard-page">
    <!-- ================= TOP FILTER & PERIOD BAR ================= -->
    <header class="dashboard-top-bar">
      <div class="segmented-tabs" role="tablist" aria-label="Date presets">
        <button
          v-for="p in datePresets"
          :key="p.key"
          type="button"
          class="seg-tab-btn"
          :class="{ active: activePreset === p.key }"
          @click="applyDatePreset(p.key)"
        >
          <span>{{ $t(p.labelKey) }}</span>
        </button>
      </div>

      <div class="dashboard-top-bar__right">
        <div class="date-range-group">
          <i class="bi bi-calendar3 date-range-group__icon"></i>
          <input
            v-model="filters.start_date"
            type="date"
            class="date-range-group__input"
            aria-label="Start date"
            @change="handleCustomDateChange"
          />
          <span class="date-range-group__sep">→</span>
          <input
            v-model="filters.end_date"
            type="date"
            class="date-range-group__input"
            aria-label="End date"
            @change="handleCustomDateChange"
          />
        </div>

        <button
          type="button"
          class="toolbar-btn"
          :disabled="isLoading"
          :title="$t('dashboard.refresh')"
          @click="fetchAllDashboardData"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': isLoading }"></i>
          <span class="d-none d-sm-inline">{{ $t('dashboard.refresh') }}</span>
        </button>
      </div>
    </header>

    <!-- ================= 4-COLUMN FINANCIAL & OPERATIONAL SUMMARY ================= -->
    <section class="clean-card kpi-summary-card">
      <div class="kpi-grid">
        <!-- 1. Net Sales (ចំណូលលក់សុទ្ធ) -->
        <div class="kpi-col">
          <div class="kpi-col__head">
            <span class="kpi-col__title">{{ $t('dashboard.netSales') }}</span>
          </div>
          <div class="kpi-col__main tabular">{{ formatUsd(financials.net_sales_usd) }}</div>
          <div class="kpi-col__sub tabular">{{ formatKhr(usdToKhr(financials.net_sales_usd)) }}</div>

          <div class="kpi-breakdown">
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('dashboard.grossSales') }}</span>
              <span class="kpi-breakdown__val tabular">{{ formatUsd(financials.gross_sales_usd) }}</span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('dashboard.discounts') }}</span>
              <span class="kpi-breakdown__val tabular" :class="{ 'text-amber': financials.total_discounts_usd > 0 }">
                {{ financials.total_discounts_usd > 0 ? `-${formatUsd(financials.total_discounts_usd)}` : '$0.00' }}
              </span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('orders.tabRefunds') }}</span>
              <span class="kpi-breakdown__val tabular" :class="{ 'text-crimson': financials.total_refunded_usd > 0 }">
                {{ financials.total_refunded_usd > 0 ? `-${formatUsd(financials.total_refunded_usd)}` : '$0.00' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Total Expenses (ចំណាយសរុប) -->
        <div class="kpi-col">
          <div class="kpi-col__head">
            <span class="kpi-col__title">{{ $t('dashboard.expenses') }}</span>
          </div>
          <div
            class="kpi-col__main tabular"
            :class="financials.total_expenses_usd > 0 ? 'text-crimson' : ''"
          >
            {{ formatUsd(financials.total_expenses_usd) }}
          </div>
          <div class="kpi-col__sub tabular">{{ formatKhr(usdToKhr(financials.total_expenses_usd)) }}</div>

          <div class="kpi-breakdown">
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('reports.colTransactions') }}</span>
              <span class="kpi-breakdown__val tabular">{{ $t('dashboard.transactions', { count: expensesCount }) }}</span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('shifts.cashExpenses') }}</span>
              <span class="kpi-breakdown__val tabular">{{ formatUsd(financials.cash_expenses_usd || 0) }}</span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('orders.tabRefunds') }}</span>
              <span class="kpi-breakdown__val tabular">
                {{ formatUsd(financials.total_refunded_usd) }} ({{ refundsCount }})
              </span>
            </div>
          </div>
        </div>

        <!-- 3. Net Operating Profit (ប្រាក់ចំណេញសុទ្ធ) -->
        <div class="kpi-col">
          <div class="kpi-col__head">
            <span class="kpi-col__title">{{ $t('dashboard.netProfit') }}</span>
          </div>
          <div
            class="kpi-col__main tabular"
            :class="financials.net_operating_profit_usd >= 0 ? 'text-emerald' : 'text-crimson'"
          >
            {{ formatUsd(financials.net_operating_profit_usd) }}
          </div>
          <div class="kpi-col__sub tabular">{{ formatKhr(usdToKhr(financials.net_operating_profit_usd)) }}</div>

          <div class="kpi-breakdown">
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('dashboard.netSales') }}</span>
              <span class="kpi-breakdown__val tabular">{{ formatUsd(financials.net_sales_usd) }}</span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('dashboard.expenses') }}</span>
              <span class="kpi-breakdown__val tabular" :class="{ 'text-crimson': financials.total_expenses_usd > 0 }">
                {{ financials.total_expenses_usd > 0 ? `-${formatUsd(financials.total_expenses_usd)}` : '$0.00' }}
              </span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('dashboard.margin') }}</span>
              <span
                class="kpi-breakdown__val tabular"
                :class="financials.net_operating_profit_usd >= 0 ? 'text-emerald' : 'text-crimson'"
              >
                {{ profitMarginDisplay }}
              </span>
            </div>
          </div>
        </div>

        <!-- 4. Paid Orders (វិក្កយបត្របានបង់ប្រាក់) -->
        <div class="kpi-col">
          <div class="kpi-col__head">
            <span class="kpi-col__title">{{ $t('dashboard.paidOrders') }}</span>
          </div>
          <div class="kpi-col__main tabular">{{ ordersStats.paid_orders }}</div>
          <div class="kpi-col__sub tabular">
            {{ $t('dashboard.avgOrder', { amount: formatUsd(financials.average_order_value_usd) }) }}
          </div>

          <div class="kpi-breakdown">
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('orders.statusOpen') }}</span>
              <span class="kpi-breakdown__val tabular">{{ ordersStats.open_orders || 0 }}</span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('orders.statusCancelled') }}</span>
              <span class="kpi-breakdown__val tabular">{{ ordersStats.cancelled_orders || 0 }}</span>
            </div>
            <div class="kpi-breakdown__row">
              <span class="kpi-breakdown__label">{{ $t('orders.statusRefunded') }}</span>
              <span class="kpi-breakdown__val tabular">{{ ordersStats.refunded_orders || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= MIDDLE ROW: SALES TREND & PAYMENT CHANNELS ================= -->
    <div class="dashboard-mid-grid">
      <!-- Sales Trend Panel -->
      <section class="clean-card panel-card">
        <div class="panel-header">
          <div class="panel-header__left">
            <h2 class="panel-title">{{ $t('dashboard.salesTrend') }}</h2>
            <span v-if="salesTrend.peak_period" class="panel-subtitle tabular">
              {{ $t('dashboard.peakPeriod', { period: formatPeriodShort(salesTrend.peak_period) }) }}
            </span>
          </div>

          <div class="segmented-tabs segmented-tabs--sm" role="group">
            <button
              v-for="g in ['hour', 'day', 'month']"
              :key="g"
              type="button"
              class="seg-tab-btn"
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

        <!-- Active / Hovered Period Summary Bar -->
        <div v-if="visibleTrendPoints.length > 0 && activeTrendPoint" class="trend-readout-strip">
          <div class="trend-readout__left">
            <span class="trend-readout__period tabular">{{ activeTrendPoint.period }}</span>
            <span
              v-if="activeTrendPoint.orders_count !== undefined"
              class="trend-readout__orders tabular"
            >
              · {{ $t('dashboard.ordersCount', { count: activeTrendPoint.orders_count }) }}
            </span>
          </div>
          <div class="trend-readout__right">
            <strong class="trend-readout__usd tabular">
              {{ formatUsd(activeTrendPoint.net_sales_usd) }}
            </strong>
            <span class="trend-readout__khr tabular">
              ({{ formatKhr(usdToKhr(activeTrendPoint.net_sales_usd)) }})
            </span>
          </div>
        </div>

        <div class="panel-body">
          <div v-if="visibleTrendPoints.length === 0" class="empty-state">
            <i class="bi bi-bar-chart-line empty-icon"></i>
            <p class="empty-text">{{ $t('dashboard.noPaidSales') }}</p>
          </div>

          <div v-else class="chart-wrapper">
            <!-- Y-Axis Reference Gridlines -->
            <div class="chart-gridlines" aria-hidden="true">
              <div class="chart-gridline">
                <span class="chart-gridline__label tabular">{{ formatUsdCompact(maxTrendSales) }}</span>
                <div class="chart-gridline__rule"></div>
              </div>
              <div class="chart-gridline">
                <span class="chart-gridline__label tabular">{{ formatUsdCompact(maxTrendSales / 2) }}</span>
                <div class="chart-gridline__rule"></div>
              </div>
              <div class="chart-gridline chart-gridline--zero">
                <span class="chart-gridline__label tabular">$0</span>
                <div class="chart-gridline__rule"></div>
              </div>
            </div>

            <!-- Bars Stage -->
            <div class="chart-stage">
              <div
                v-for="pt in visibleTrendPoints"
                :key="pt.period"
                class="chart-col"
                :class="{
                  'is-peak': pt.period === salesTrend.peak_period,
                  'is-focused': focusedPeriod === pt.period,
                }"
                tabindex="0"
                @mouseenter="focusedPeriod = pt.period"
                @focus="focusedPeriod = pt.period"
              >
                <div class="chart-col__track">
                  <div
                    class="chart-col__bar"
                    :style="{ height: `${getTrendBarHeight(pt.net_sales_usd)}%` }"
                  >
                    <span class="chart-col__val tabular">{{ formatUsdCompact(pt.net_sales_usd) }}</span>
                  </div>
                </div>
                <div class="chart-col__label tabular" :title="pt.period">
                  {{ formatPeriodShort(pt.period) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Payment Channels Panel -->
      <section class="clean-card panel-card">
        <div class="panel-header">
          <h2 class="panel-title">{{ $t('dashboard.paymentChannels') }}</h2>
          <span v-if="paymentsBreakdown.length > 0" class="panel-total tabular">
            {{ formatUsd(totalPaymentsUsd) }}
          </span>
        </div>

        <div class="panel-body">
          <div v-if="paymentsBreakdown.length === 0" class="empty-state">
            <i class="bi bi-credit-card-2-front empty-icon"></i>
            <p class="empty-text">{{ $t('dashboard.noCompletedPayments') }}</p>
          </div>

          <div v-else class="payment-channel-list">
            <div
              v-for="(pm, idx) in enrichedPayments"
              :key="idx"
              class="payment-channel-row"
            >
              <div class="payment-channel-row__top">
                <div class="payment-channel-row__info">
                  <span class="payment-method-name" :class="getMethodClass(pm.method)">
                    {{ formatMethodName(pm.method) }} ({{ pm.currency }})
                  </span>
                  <span class="payment-method-txns tabular">
                    · {{ $t('dashboard.transactions', { count: pm.transaction_count }) }}
                  </span>
                </div>

                <div class="payment-channel-row__figures tabular">
                  <strong class="payment-method-usd">{{ formatUsd(pm.net_amount_usd) }}</strong>
                  <span class="payment-method-share">{{ pm.sharePercent }}%</span>
                </div>
              </div>

              <div class="payment-bar-track">
                <div
                  class="payment-bar-fill"
                  :class="getMethodClass(pm.method)"
                  :style="{ width: `${pm.sharePercent}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ================= BOTTOM ROW: TOP SELLING ITEMS & LOW STOCK ALERTS ================= -->
    <div class="dashboard-bottom-grid">
      <!-- Top Selling Menu Items -->
      <section class="clean-card panel-card">
        <div class="panel-header">
          <h2 class="panel-title">{{ $t('dashboard.topSellingItems') }}</h2>
          <router-link to="/reports" class="panel-link">
            <span>{{ $t('dashboard.fullReports') }}</span>
            <i class="bi bi-arrow-up-right"></i>
          </router-link>
        </div>

        <div v-if="topProducts.length === 0" class="panel-body empty-state">
          <i class="bi bi-cup-hot empty-icon"></i>
          <p class="empty-text">{{ $t('dashboard.noProductSales') }}</p>
        </div>

        <div v-else class="table-responsive">
          <table class="clean-table">
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
                  <span class="rank-text tabular" :class="{ 'is-top': item.rank === 1 }">
                    #{{ item.rank }}
                  </span>
                </td>
                <td>
                  <div class="product-name">{{ item.product_name }}</div>
                  <div class="product-variant">{{ item.variant_name }}</div>
                </td>
                <td>
                  <span class="category-text">{{ $tCategory(item.category_name) }}</span>
                </td>
                <td class="text-end">
                  <span class="sold-qty tabular">{{ item.total_quantity_sold }}</span>
                </td>
                <td class="text-end col-rev">
                  <div class="rev-usd tabular">{{ formatUsd(item.total_revenue_usd) }}</div>
                  <div class="rev-share tabular">{{ getProductShare(item) }}%</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Low-Stock Alerts -->
      <section class="clean-card panel-card">
        <div class="panel-header">
          <div class="panel-header__left">
            <h2 class="panel-title">{{ $t('dashboard.lowStockAlerts') }}</h2>
            <span v-if="lowStockItems.length > 0" class="low-stock-count tabular">
              ({{ lowStockItems.length }})
            </span>
          </div>
          <router-link to="/inventory" class="panel-link">
            <span>{{ $t('dashboard.restock') }}</span>
            <i class="bi bi-arrow-up-right"></i>
          </router-link>
        </div>

        <div v-if="lowStockItems.length === 0" class="panel-body empty-state">
          <div class="healthy-icon">
            <i class="bi bi-check2"></i>
          </div>
          <div class="healthy-title">{{ $t('dashboard.allWellStocked') }}</div>
          <p class="empty-text">{{ $t('dashboard.allWellStockedDesc') }}</p>
        </div>

        <div v-else class="table-responsive">
          <table class="clean-table">
            <thead>
              <tr>
                <th>{{ $t('inventory.colIngredient') }}</th>
                <th class="text-end">{{ $t('inventory.colMinAlert') }}</th>
                <th class="text-end">{{ $t('inventory.colCurrentStock') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ing in lowStockItems.slice(0, 6)" :key="ing.id">
                <td>
                  <span class="ing-name">{{ ing.name }}</span>
                </td>
                <td class="text-end">
                  <span class="ing-min tabular">
                    {{ formatQty(ing.minimum_stock) }} {{ ing.unit }}
                  </span>
                </td>
                <td class="text-end">
                  <span
                    class="ing-stock tabular"
                    :class="Number(ing.current_stock) <= 0 ? 'text-crimson' : 'text-amber'"
                  >
                    {{ formatQty(ing.current_stock) }} {{ ing.unit }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/api'
import { t } from '@/i18n'
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
  cash_expenses_usd: 0,
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
const profitMarginDisplay = computed(() => {
  const net = Number(financials.net_sales_usd) || 0
  const profit = Number(financials.net_operating_profit_usd) || 0
  if (net <= 0) {
    return profit < 0 ? `${formatUsd(profit)}` : '0%'
  }
  const pct = Math.round((profit / net) * 100)
  if (pct < -100) return `${pct}%`
  return `${pct >= 0 ? '+' : ''}${pct}%`
})

const visibleTrendPoints = computed(() => {
  return salesTrend.data.slice(-14)
})

const maxTrendSales = computed(() => {
  if (!visibleTrendPoints.value.length) return 10
  return Math.max(...visibleTrendPoints.value.map((d) => Number(d.net_sales_usd) || 0), 1)
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
  const maxVal = maxTrendSales.value
  return Math.max(8, Math.round(((Number(val) || 0) / maxVal) * 100))
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
  if (method === 'BANK_TRANSFER') return t('common.bankTransfer')
  if (method === 'CASH') return t('common.cash')
  if (method === 'KHQR') return t('common.khqr')
  return method
}

const getMethodClass = (method) => {
  if (method === 'KHQR') return 'method-khqr'
  if (method === 'BANK_TRANSFER') return 'method-bank'
  return 'method-cash'
}

const getProductShare = (item) => {
  if (item.revenue_share_percentage !== undefined) {
    return Math.max(1, Math.min(100, Math.round(Number(item.revenue_share_percentage))))
  }
  const rev = Number(item.total_revenue_usd) || 0
  return Math.max(1, Math.round((rev / maxProductRevenue.value) * 100))
}

const formatQty = (qty) => {
  const n = Number(qty)
  if (Number.isNaN(n)) return qty
  return Number.isInteger(n) ? n : Number(n.toFixed(2))
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
.dashboard-page {
  --roast-ink: #14231a;
  --sage-muted: #54665b;
  --botanical-primary: #2d5a43;
  --botanical-deep: #1e3f2f;
  --botanical-tint: #eaf3ee;
  --ledger-line: #dce6e0;
  --ledger-hairline: #edf3ef;
  --surface-tint: #f8fbf9;
  --emerald-ok: #1e6b43;
  --amber-warn: #b45309;
  --crimson-debit: #b91c1c;

  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--roast-ink);
  padding-bottom: 1.5rem;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.text-emerald {
  color: var(--emerald-ok) !important;
}

.text-amber {
  color: var(--amber-warn) !important;
}

.text-crimson {
  color: var(--crimson-debit) !important;
}

/* ================= TOP FILTER & PERIOD BAR ================= */
.dashboard-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #e9f0ec;
  border: 1px solid var(--ledger-line);
  border-radius: 10px;
}

.segmented-tabs--sm {
  padding: 3px;
  border-radius: 8px;
}

.seg-tab-btn {
  border: none;
  background: transparent;
  padding: 0.42rem 0.9rem;
  border-radius: 7px;
  font-size: 0.81rem;
  font-weight: 600;
  color: #4f6356;
  cursor: pointer;
  transition: all 0.15s ease;
}

.segmented-tabs--sm .seg-tab-btn {
  padding: 0.28rem 0.68rem;
  font-size: 0.76rem;
  border-radius: 6px;
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

.dashboard-top-bar__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.date-range-group {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.65rem;
  background: #ffffff;
  border: 1.5px solid var(--ledger-line);
  border-radius: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.date-range-group:focus-within {
  border-color: var(--botanical-primary);
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
  font-weight: 600;
  padding: 0;
  width: 112px;
  cursor: pointer;
  outline: none;
}

.date-range-group__sep {
  color: var(--sage-muted);
  font-size: 0.76rem;
}

.toolbar-btn {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.8rem;
  border-radius: 8px;
  border: 1.5px solid var(--ledger-line);
  background: #ffffff;
  color: var(--roast-ink);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--surface-tint);
  border-color: #c6d8ce;
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ================= CARDS & 4-COLUMN KPI LEDGER ================= */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.kpi-col {
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
}

.kpi-col + .kpi-col {
  border-left: 1px solid var(--ledger-line);
}

.kpi-col__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.kpi-col__title {
  font-size: 0.81rem;
  font-weight: 700;
  color: var(--sage-muted);
}

.kpi-col__main {
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--roast-ink);
}

.kpi-col__sub {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sage-muted);
  margin-top: 0.18rem;
}

.kpi-breakdown {
  margin-top: 0.9rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ledger-hairline);
  display: flex;
  flex-direction: column;
  gap: 0.36rem;
}

.kpi-breakdown__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.77rem;
}

.kpi-breakdown__label {
  color: var(--sage-muted);
  font-weight: 500;
}

.kpi-breakdown__val {
  color: var(--roast-ink);
  font-weight: 700;
}

/* ================= MIDDLE & BOTTOM GRIDS ================= */
.dashboard-mid-grid {
  display: grid;
  grid-template-columns: 1.65fr 1fr;
  gap: 1rem;
}

.dashboard-bottom-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 1rem;
}

.panel-card {
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 0.85rem 1.15rem;
  border-bottom: 1px solid var(--ledger-hairline);
  background: var(--surface-tint);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.panel-header__left {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.panel-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.panel-subtitle {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.panel-total {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--botanical-primary);
}

.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--botanical-primary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.panel-link:hover {
  color: var(--botanical-deep);
  text-decoration: underline;
}

.panel-body {
  padding: 1rem 1.15rem;
  flex: 1;
}

/* ================= SALES TREND CHART ================= */
.trend-readout-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.52rem 1.15rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.8rem;
}

.trend-readout__left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.trend-readout__period {
  font-weight: 700;
  color: var(--roast-ink);
}

.trend-readout__orders {
  font-weight: 600;
  color: var(--sage-muted);
}

.trend-readout__right {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.trend-readout__usd {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--botanical-primary);
}

.trend-readout__khr {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.chart-wrapper {
  position: relative;
  height: 195px;
  padding-top: 18px;
  padding-bottom: 24px;
  padding-left: 52px;
}

.chart-gridlines {
  position: absolute;
  inset: 18px 0 24px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.chart-gridline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.chart-gridline__label {
  width: 44px;
  text-align: right;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--sage-muted);
  flex-shrink: 0;
}

.chart-gridline__rule {
  flex: 1;
  border-bottom: 1px dashed #e1ebe5;
}

.chart-gridline--zero .chart-gridline__rule {
  border-bottom: 1px solid var(--ledger-line);
}

.chart-stage {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 0.5rem;
  overflow-x: auto;
}

.chart-col {
  flex: 1;
  max-width: 56px;
  min-width: 36px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  outline: none;
}

.chart-col__track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.chart-col__bar {
  position: relative;
  width: 100%;
  max-width: 32px;
  background: #739c85;
  border-radius: 5px 5px 0 0;
  transition: height 0.25s ease, background-color 0.15s ease;
}

.chart-col:hover .chart-col__bar,
.chart-col.is-focused .chart-col__bar {
  background: var(--botanical-primary);
}

.chart-col.is-peak .chart-col__bar {
  background: var(--botanical-deep);
}

.chart-col__val {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--sage-muted);
  white-space: nowrap;
}

.chart-col.is-focused .chart-col__val,
.chart-col.is-peak .chart-col__val {
  color: var(--roast-ink);
}

.chart-col__label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--sage-muted);
  margin-top: 6px;
  white-space: nowrap;
}

/* ================= PAYMENT CHANNELS ================= */
.payment-channel-list {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.payment-channel-row {
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.payment-channel-row__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.payment-channel-row__info {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.payment-method-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.payment-method-txns {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sage-muted);
}

.payment-channel-row__figures {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
}

.payment-method-usd {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.payment-method-share {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sage-muted);
  min-width: 32px;
  text-align: right;
}

.payment-bar-track {
  height: 5px;
  background: #edf3ef;
  border-radius: 999px;
  overflow: hidden;
}

.payment-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.payment-bar-fill.method-cash {
  background: var(--botanical-primary);
}

.payment-bar-fill.method-khqr {
  background: var(--crimson-debit);
}

.payment-bar-fill.method-bank {
  background: #0284c7;
}

/* ================= TABLES (TOP ITEMS & LOW STOCK) ================= */
.clean-table {
  width: 100%;
  border-collapse: collapse;
}

.clean-table th {
  background: var(--surface-tint);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--sage-muted);
  padding: 0.62rem 1.1rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.72rem 1.1rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.82rem;
  vertical-align: middle;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.clean-table tbody tr:hover td {
  background: #fafcfb;
}

.col-rank {
  width: 44px;
}

.col-rev {
  min-width: 105px;
}

.rank-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--sage-muted);
}

.rank-text.is-top {
  color: var(--botanical-primary);
  font-weight: 800;
}

.product-name {
  font-weight: 700;
  color: var(--roast-ink);
  line-height: 1.25;
}

.product-variant {
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--sage-muted);
  margin-top: 1px;
}

.category-text {
  font-size: 0.81rem;
  font-weight: 600;
  color: var(--roast-ink);
}

.sold-qty {
  font-weight: 700;
  color: var(--roast-ink);
}

.rev-usd {
  font-weight: 800;
  color: var(--roast-ink);
}

.rev-share {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--sage-muted);
}

/* Low Stock Table Specifics */
.low-stock-count {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--amber-warn);
}

.ing-name {
  font-weight: 700;
  color: var(--roast-ink);
}

.ing-min {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.ing-stock {
  font-size: 0.84rem;
  font-weight: 800;
}

/* ================= EMPTY STATES ================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.25rem 1rem;
  color: var(--sage-muted);
}

.empty-icon {
  font-size: 1.5rem;
  margin-bottom: 0.35rem;
  opacity: 0.65;
}

.empty-text {
  margin: 0;
  font-size: 0.8rem;
}

.healthy-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--botanical-tint);
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-bottom: 0.45rem;
}

.healthy-title {
  font-size: 0.84rem;
  font-weight: 700;
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
@media (max-width: 1199.98px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .kpi-col:nth-child(3) {
    border-left: none;
  }

  .kpi-col:nth-child(3),
  .kpi-col:nth-child(4) {
    border-top: 1px solid var(--ledger-line);
  }
}

@media (max-width: 991.98px) {
  .dashboard-mid-grid,
  .dashboard-bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 575.98px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .kpi-col + .kpi-col {
    border-left: none;
    border-top: 1px solid var(--ledger-line);
  }
}
</style>
