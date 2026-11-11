<template>
  <div class="reports-page">
    <!-- ================= TOP BAR: REPORT TABS & DATE CONTROLS ================= -->
    <header class="reports-top-bar">
      <!-- Report Category Segmented Tabs -->
      <div class="segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'TOP_PRODUCTS' }"
          @click="switchTab('TOP_PRODUCTS')"
        >
          <i class="bi bi-trophy"></i>
          <span>{{ $t('reports.tabTopProducts') }}</span>
        </button>

        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'INVENTORY_USAGE' }"
          @click="switchTab('INVENTORY_USAGE')"
        >
          <i class="bi bi-boxes"></i>
          <span>{{ $t('reports.tabInventoryUsage') }}</span>
        </button>

        <template v-if="authStore.isOwner">
          <button
            type="button"
            class="seg-tab-btn"
            :class="{ active: activeTab === 'CATEGORIES' }"
            @click="switchTab('CATEGORIES')"
          >
            <i class="bi bi-tags"></i>
            <span>{{ $t('reports.tabCategories') }}</span>
          </button>

          <button
            type="button"
            class="seg-tab-btn"
            :class="{ active: activeTab === 'PAYMENT_METHODS' }"
            @click="switchTab('PAYMENT_METHODS')"
          >
            <i class="bi bi-credit-card-2-front"></i>
            <span>{{ $t('reports.tabPayments') }}</span>
          </button>

          <button
            type="button"
            class="seg-tab-btn"
            :class="{ active: activeTab === 'STAFF_PERFORMANCE' }"
            @click="switchTab('STAFF_PERFORMANCE')"
          >
            <i class="bi bi-people"></i>
            <span>{{ $t('reports.tabStaff') }}</span>
          </button>
        </template>
      </div>

      <!-- Date Presets, Date Range & Refresh -->
      <div class="reports-top-bar__right">
        <div class="segmented-tabs segmented-tabs--sm" role="group" aria-label="Date presets">
          <button
            v-for="p in datePresets"
            :key="p.key"
            type="button"
            class="seg-tab-btn"
            :class="{ active: activePreset === p.key }"
            @click="applyPreset(p.key)"
          >
            {{ $t(p.labelKey) }}
          </button>
        </div>

        <div class="date-range-group">
          <i class="bi bi-calendar3 date-range-group__icon"></i>
          <input
            v-model="dateRange.start_date"
            type="date"
            class="date-range-group__input"
            aria-label="Start date"
            @change="handleCustomDate"
          />
          <span class="date-range-group__sep">→</span>
          <input
            v-model="dateRange.end_date"
            type="date"
            class="date-range-group__input"
            aria-label="End date"
            @change="handleCustomDate"
          />
        </div>

        <button
          type="button"
          class="toolbar-btn"
          :disabled="isLoading"
          :title="$t('dashboard.refresh')"
          @click="loadCurrentTabReport"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': isLoading }"></i>
          <span class="d-none d-md-inline">{{ $t('dashboard.refresh') }}</span>
        </button>
      </div>
    </header>

    <!-- ================= TAB 1: TOP SELLING PRODUCTS ================= -->
    <section v-if="activeTab === 'TOP_PRODUCTS'" class="clean-card">
      <div class="report-card-header">
        <div class="report-card-header__left">
          <h2 class="report-title">{{ $t('reports.topSellingVariants') }}</h2>
          <div class="report-summary-inline tabular">
            <span class="summary-item">
              <span class="summary-label">{{ $t('reports.totalRevenueInList') }}</span>
              <strong class="summary-value text-emerald">{{ formatUsd(topProductsData.total_revenue_sum) }}</strong>
              <span class="summary-khr">({{ formatKhr(usdToKhr(topProductsData.total_revenue_sum)) }})</span>
            </span>
          </div>
        </div>

        <div class="report-card-header__right">
          <select
            v-model="topProductsLimit"
            class="filter-select"
            @change="loadCurrentTabReport"
          >
            <option :value="10">{{ $t('reports.topN', { n: 10 }) }}</option>
            <option :value="25">{{ $t('reports.topN', { n: 25 }) }}</option>
            <option :value="50">{{ $t('reports.topN', { n: 50 }) }}</option>
          </select>
        </div>
      </div>

      <div v-if="isLoading" class="empty-state">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="empty-text">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="topProductsData.products.length === 0" class="empty-state">
        <i class="bi bi-cup-hot empty-icon"></i>
        <div class="empty-text">{{ $t('reports.noProductSales') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th style="width: 72px">{{ $t('reports.colRank') }}</th>
              <th>{{ $t('reports.colProduct') }}</th>
              <th>{{ $t('reports.colVariant') }}</th>
              <th>{{ $t('reports.colCategory') }}</th>
              <th class="text-end">{{ $t('reports.colUnitsSold') }}</th>
              <th class="text-end">{{ $t('reports.colRevenue') }}</th>
              <th style="width: 210px">{{ $t('reports.colRevenueShare') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topProductsData.products" :key="item.variant_id">
              <td>
                <span class="rank-text tabular" :class="{ 'is-top': item.rank <= 3 }">
                  #{{ item.rank }}
                </span>
              </td>
              <td>
                <span class="cell-primary">{{ item.product_name }}</span>
              </td>
              <td>
                <span class="cell-secondary">{{ item.variant_name }}</span>
              </td>
              <td>
                <span class="cell-secondary">{{ $tCategory(item.category_name) }}</span>
              </td>
              <td class="text-end">
                <span class="cell-primary tabular">{{ item.total_quantity_sold }}</span>
              </td>
              <td class="text-end">
                <div class="cell-primary tabular">{{ formatUsd(item.total_revenue_usd) }}</div>
                <div class="cell-sub tabular">{{ formatKhr(usdToKhr(item.total_revenue_usd)) }}</div>
              </td>
              <td>
                <div class="share-cell">
                  <div class="share-bar-track">
                    <div
                      class="share-bar-fill"
                      :style="{ width: `${Math.min(100, Number(item.revenue_share_percentage) || 0)}%` }"
                    ></div>
                  </div>
                  <span class="share-pct tabular">{{ item.revenue_share_percentage }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ================= TAB 2: INVENTORY USAGE ================= -->
    <section v-if="activeTab === 'INVENTORY_USAGE'" class="clean-card">
      <div class="report-card-header">
        <div class="report-card-header__left">
          <h2 class="report-title">{{ $t('reports.ingredientConsumptionTitle') }}</h2>
          <span
            v-if="inventoryUsageData.low_stock_alert_count > 0"
            class="low-stock-inline tabular"
          >
            {{ $t('reports.lowStockAlertsCount', { count: inventoryUsageData.low_stock_alert_count }) }}
          </span>
        </div>

        <div class="report-card-header__right">
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': inventoryLowStockOnly }"
            @click="inventoryLowStockOnly = !inventoryLowStockOnly; loadCurrentTabReport()"
          >
            <i class="bi bi-exclamation-triangle"></i>
            <span>{{ $t('inventory.lowStockOnly') }}</span>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="empty-state">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="empty-text">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="inventoryUsageData.ingredients.length === 0" class="empty-state">
        <i class="bi bi-boxes empty-icon"></i>
        <div class="empty-text">{{ $t('inventory.noIngredientsFound') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th>{{ $t('inventory.colIngredient') }}</th>
              <th class="text-end">{{ $t('inventory.colCurrentStock') }}</th>
              <th class="text-end">{{ $t('reports.colConsumedSales') }}</th>
              <th class="text-end">{{ $t('reports.colPurchased') }}</th>
              <th class="text-end">{{ $t('reports.colWasted') }}</th>
              <th class="text-end">{{ $t('reports.colReturned') }}</th>
              <th class="text-end">{{ $t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ing in inventoryUsageData.ingredients" :key="ing.ingredient_id">
              <td>
                <div class="cell-primary">{{ ing.ingredient_name }}</div>
                <div class="cell-sub tabular">
                  {{ $t('inventory.colMinAlert') }}: {{ formatQty(ing.minimum_stock) }} {{ ing.unit }}
                </div>
              </td>
              <td class="text-end">
                <span
                  class="cell-primary tabular"
                  :class="getStockColorClass(ing)"
                >
                  {{ formatQty(ing.current_stock) }} {{ ing.unit }}
                </span>
              </td>
              <td class="text-end">
                <span class="cell-secondary tabular">
                  {{ Number(ing.total_consumed_sales) > 0 ? `${formatQty(ing.total_consumed_sales)} ${ing.unit}` : '0' }}
                </span>
              </td>
              <td class="text-end">
                <span class="tabular" :class="Number(ing.total_purchased) > 0 ? 'text-emerald fw-bold' : 'text-muted-dash'">
                  {{ Number(ing.total_purchased) > 0 ? `+${formatQty(ing.total_purchased)} ${ing.unit}` : '0' }}
                </span>
              </td>
              <td class="text-end">
                <span class="tabular" :class="Number(ing.total_wasted) > 0 ? 'text-crimson fw-bold' : 'text-muted-dash'">
                  {{ Number(ing.total_wasted) > 0 ? `-${formatQty(ing.total_wasted)} ${ing.unit}` : '0' }}
                </span>
              </td>
              <td class="text-end">
                <span class="cell-secondary tabular">
                  {{ Number(ing.total_returned) > 0 ? `+${formatQty(ing.total_returned)} ${ing.unit}` : '0' }}
                </span>
              </td>
              <td class="text-end">
                <span class="status-text" :class="getStockColorClass(ing)">
                  {{ getStockStatusLabel(ing) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ================= TAB 3: CATEGORIES SALES (OWNER) ================= -->
    <section v-if="activeTab === 'CATEGORIES'" class="clean-card">
      <div class="report-card-header">
        <div class="report-card-header__left">
          <h2 class="report-title">{{ $t('reports.salesByCategory') }}</h2>
          <div class="report-summary-inline tabular">
            <span class="summary-item">
              <span class="summary-label">{{ $t('reports.totalRevenue') }}</span>
              <strong class="summary-value text-emerald">{{ formatUsd(categoriesData.total_revenue_sum) }}</strong>
              <span class="summary-khr">({{ formatKhr(usdToKhr(categoriesData.total_revenue_sum)) }})</span>
            </span>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="empty-state">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="empty-text">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="categoriesData.categories.length === 0" class="empty-state">
        <i class="bi bi-tags empty-icon"></i>
        <div class="empty-text">{{ $t('reports.noProductSales') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th>{{ $t('products.colCategoryName') }}</th>
              <th class="text-end">{{ $t('reports.colItemsSold') }}</th>
              <th class="text-end">{{ $t('reports.colTotalRevenueUsd') }}</th>
              <th class="text-end">{{ $t('reports.colEquivalentKhr') }}</th>
              <th style="width: 220px">{{ $t('reports.colShareOfRevenue') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categoriesData.categories" :key="cat.category_id">
              <td>
                <span class="cell-primary">{{ $tCategory(cat.category_name) }}</span>
              </td>
              <td class="text-end">
                <span class="cell-primary tabular">{{ cat.total_items_sold }}</span>
              </td>
              <td class="text-end">
                <span class="cell-primary tabular">{{ formatUsd(cat.total_revenue_usd) }}</span>
              </td>
              <td class="text-end">
                <span class="cell-secondary tabular">{{ formatKhr(usdToKhr(cat.total_revenue_usd)) }}</span>
              </td>
              <td>
                <div class="share-cell">
                  <div class="share-bar-track">
                    <div
                      class="share-bar-fill"
                      :style="{ width: `${Math.min(100, Number(cat.revenue_share_percentage) || 0)}%` }"
                    ></div>
                  </div>
                  <span class="share-pct tabular">{{ cat.revenue_share_percentage }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ================= TAB 4: PAYMENT METHODS (OWNER) ================= -->
    <section v-if="activeTab === 'PAYMENT_METHODS'" class="clean-card">
      <div class="report-card-header">
        <div class="report-card-header__left">
          <h2 class="report-title">{{ $t('reports.paymentMethodsBreakdown') }}</h2>
          <div class="report-summary-inline tabular">
            <span class="summary-item">
              <span class="summary-label">{{ $t('reports.gross') }}</span>
              <strong class="summary-value">{{ formatUsd(paymentMethodsData.summary.total_gross_amount_usd) }}</strong>
            </span>
            <span class="summary-sep">·</span>
            <span class="summary-item">
              <span class="summary-label">{{ $t('reports.refunded') }}</span>
              <strong class="summary-value text-crimson">
                {{ paymentMethodsData.summary.total_refunded_usd > 0 ? `-${formatUsd(paymentMethodsData.summary.total_refunded_usd)}` : '$0.00' }}
              </strong>
            </span>
            <span class="summary-sep">·</span>
            <span class="summary-item">
              <span class="summary-label">{{ $t('reports.netCollected') }}</span>
              <strong class="summary-value text-emerald">{{ formatUsd(paymentMethodsData.summary.total_net_amount_usd) }}</strong>
            </span>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="empty-state">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="empty-text">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="paymentMethodsData.payment_methods.length === 0" class="empty-state">
        <i class="bi bi-credit-card-2-front empty-icon"></i>
        <div class="empty-text">{{ $t('dashboard.noCompletedPayments') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th>{{ $t('orders.colMethod') }}</th>
              <th>{{ $t('expenses.currencyLabel') }}</th>
              <th class="text-end">{{ $t('reports.colTransactions') }}</th>
              <th class="text-end">{{ $t('reports.colRawGross') }}</th>
              <th class="text-end">{{ $t('reports.colRefundedUsd') }}</th>
              <th class="text-end">{{ $t('reports.colNetRevenueUsd') }}</th>
              <th style="width: 210px">{{ $t('reports.colNetShare') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pm, idx) in paymentMethodsData.payment_methods" :key="idx">
              <td>
                <span class="cell-primary">{{ formatMethodName(pm.method) }}</span>
              </td>
              <td>
                <span class="cell-secondary tabular">{{ pm.currency }}</span>
              </td>
              <td class="text-end">
                <span class="cell-primary tabular">{{ pm.transaction_count }}</span>
              </td>
              <td class="text-end">
                <span class="cell-secondary tabular">
                  {{ pm.currency === 'USD' ? formatUsd(pm.gross_amount) : formatKhr(pm.gross_amount) }}
                </span>
              </td>
              <td class="text-end">
                <span class="tabular" :class="Number(pm.refunded_amount_usd) > 0 ? 'text-crimson fw-bold' : 'text-muted-dash'">
                  {{ Number(pm.refunded_amount_usd) > 0 ? `-${formatUsd(pm.refunded_amount_usd)}` : '—' }}
                </span>
              </td>
              <td class="text-end">
                <span class="cell-primary tabular">{{ formatUsd(pm.net_amount_usd) }}</span>
              </td>
              <td>
                <div class="share-cell">
                  <div class="share-bar-track">
                    <div
                      class="share-bar-fill"
                      :style="{ width: `${Math.min(100, Number(pm.revenue_share_percentage) || 0)}%` }"
                    ></div>
                  </div>
                  <span class="share-pct tabular">{{ pm.revenue_share_percentage }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ================= TAB 5: STAFF PERFORMANCE (OWNER) ================= -->
    <section v-if="activeTab === 'STAFF_PERFORMANCE'" class="clean-card">
      <div class="report-card-header">
        <div class="report-card-header__left">
          <h2 class="report-title">{{ $t('reports.staffPerformanceTitle') }}</h2>
        </div>
      </div>

      <div v-if="isLoading" class="empty-state">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="empty-text">{{ $t('reports.loadingReport') }}</div>
      </div>

      <div v-else-if="staffPerformanceData.staff.length === 0" class="empty-state">
        <i class="bi bi-people empty-icon"></i>
        <div class="empty-text">{{ $t('users.noUsersFound') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="clean-table">
          <thead>
            <tr>
              <th>{{ $t('reports.colStaffMember') }}</th>
              <th>{{ $t('reports.colRole') }}</th>
              <th class="text-end">{{ $t('reports.colShiftsOpened') }}</th>
              <th class="text-end">{{ $t('reports.colPaidOrders') }}</th>
              <th class="text-end">{{ $t('reports.colAvgOrderValue') }}</th>
              <th class="text-end">{{ $t('reports.colDiscountsGiven') }}</th>
              <th class="text-end">{{ $t('reports.colTotalPaidSales') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="st in staffPerformanceData.staff" :key="st.staff_id">
              <td>
                <div class="cell-primary">{{ st.staff_name }}</div>
                <div class="cell-sub">{{ st.staff_email }}</div>
              </td>
              <td>
                <span class="cell-secondary">{{ formatRoleName(st.role) }}</span>
              </td>
              <td class="text-end">
                <span class="cell-secondary tabular">{{ st.shifts_count }}</span>
              </td>
              <td class="text-end">
                <span class="cell-primary tabular">{{ st.paid_orders_count }}</span>
              </td>
              <td class="text-end">
                <span class="cell-secondary tabular">{{ formatUsd(st.average_order_value_usd) }}</span>
              </td>
              <td class="text-end">
                <span class="tabular" :class="Number(st.total_discounts_usd) > 0 ? 'text-amber fw-bold' : 'text-muted-dash'">
                  {{ Number(st.total_discounts_usd) > 0 ? formatUsd(st.total_discounts_usd) : '$0.00' }}
                </span>
              </td>
              <td class="text-end">
                <div class="cell-primary tabular">{{ formatUsd(st.total_sales_usd) }}</div>
                <div class="cell-sub tabular">{{ formatKhr(usdToKhr(st.total_sales_usd)) }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/api/api'
import { t } from '@/i18n'
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
    const today = toIsoDateStr(now)
    dateRange.start_date = today
    dateRange.end_date = today
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

const formatQty = (qty) => {
  const n = Number(qty)
  if (Number.isNaN(n)) return qty
  return Number.isInteger(n) ? n : Number(n.toFixed(2))
}

const formatMethodName = (method) => {
  if (method === 'BANK_TRANSFER') return t('common.bankTransfer')
  if (method === 'CASH') return t('common.cash')
  if (method === 'KHQR') return t('common.khqr')
  return method
}

const formatRoleName = (role) => {
  if (role === 'OWNER') return t('common.owner')
  if (role === 'STAFF') return t('common.staff')
  return role
}

const getStockColorClass = (ing) => {
  if (Number(ing.current_stock) <= 0) return 'text-crimson'
  if (ing.is_low_stock) return 'text-amber'
  return 'text-emerald'
}

const getStockStatusLabel = (ing) => {
  if (Number(ing.current_stock) <= 0) return t('inventory.outOfStock')
  if (ing.is_low_stock) return t('inventory.lowStock')
  return t('reports.healthy')
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
.reports-page {
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
  gap: 0.95rem;
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

.text-muted-dash {
  color: #95a59b;
}

/* ================= TOP BAR: TABS & DATE CONTROLS ================= */
.reports-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.segmented-tabs {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
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
  padding: 0.42rem 0.88rem;
  border-radius: 7px;
  font-size: 0.81rem;
  font-weight: 600;
  color: #4f6356;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-tab-btn i {
  font-size: 0.88rem;
}

.segmented-tabs--sm .seg-tab-btn {
  padding: 0.3rem 0.7rem;
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

.reports-top-bar__right {
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

.toolbar-btn.is-active {
  background: #fffbeb;
  border-color: #f59e0b;
  color: var(--amber-warn);
  font-weight: 700;
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filter-select {
  height: 36px;
  padding: 0 2rem 0 0.75rem;
  border-radius: 8px;
  border: 1.5px solid var(--ledger-line);
  background-color: #ffffff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2354665b' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  background-size: 11px 9px;
  appearance: none;
  color: var(--roast-ink);
  font-size: 0.81rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-select:focus {
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

/* ================= MAIN CARD & REPORT HEADER ================= */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.report-card-header {
  padding: 0.88rem 1.15rem;
  border-bottom: 1px solid var(--ledger-hairline);
  background: var(--surface-tint);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.report-card-header__left {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.report-card-header__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.report-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.report-summary-inline {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.81rem;
}

.summary-item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
}

.summary-label {
  color: var(--sage-muted);
  font-weight: 600;
}

.summary-value {
  font-weight: 800;
  color: var(--roast-ink);
}

.summary-khr {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.summary-sep {
  color: #b7c8be;
}

.low-stock-inline {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--amber-warn);
}

/* ================= REPORT TABLES ================= */
.clean-table {
  width: 100%;
  border-collapse: collapse;
}

.clean-table th {
  background: #fafcfb;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--sage-muted);
  padding: 0.68rem 1.15rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.78rem 1.15rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.83rem;
  vertical-align: middle;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.clean-table tbody tr:hover td {
  background: #fafcfb;
}

.rank-text {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--sage-muted);
}

.rank-text.is-top {
  color: var(--botanical-primary);
  font-weight: 800;
}

.cell-primary {
  font-weight: 700;
  color: var(--roast-ink);
}

.cell-secondary {
  font-weight: 600;
  color: #384b40;
}

.cell-sub {
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--sage-muted);
  margin-top: 2px;
}

.status-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.share-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.share-bar-track {
  flex: 1;
  height: 6px;
  background: #e9f0ec;
  border-radius: 999px;
  overflow: hidden;
}

.share-bar-fill {
  height: 100%;
  background: var(--botanical-primary);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.share-pct {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--roast-ink);
  min-width: 48px;
  text-align: right;
}

/* ================= EMPTY STATES ================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1rem;
  color: var(--sage-muted);
}

.empty-icon {
  font-size: 1.6rem;
  margin-bottom: 0.4rem;
  opacity: 0.65;
}

.empty-text {
  font-size: 0.82rem;
  font-weight: 500;
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
