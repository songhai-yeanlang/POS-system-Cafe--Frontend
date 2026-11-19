<template>
  <div class="orders-page">
    <!-- Top Navigation & Quick Status Bar -->
    <div class="orders-top-bar">
      <div class="orders-segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'ORDERS' }"
          @click="switchTab('ORDERS')"
        >
          <i class="bi bi-receipt"></i>
          <span>{{ $t('orders.tabOrders') }}</span>
          <span v-if="orderPagination.total > 0 && activeTab === 'ORDERS'" class="seg-tab-count tabular">
            {{ orderPagination.total }}
          </span>
        </button>
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'PAYMENTS' }"
          @click="switchTab('PAYMENTS')"
        >
          <i class="bi bi-credit-card-2-front"></i>
          <span>{{ $t('orders.tabPayments') }}</span>
        </button>
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'REFUNDS' }"
          @click="switchTab('REFUNDS')"
        >
          <i class="bi bi-arrow-counterclockwise"></i>
          <span>{{ $t('orders.tabRefunds') }}</span>
        </button>
      </div>

      <!-- Status Quick Filter Pills (Orders Tab) -->
      <div v-if="activeTab === 'ORDERS'" class="status-pills">
        <button
          v-for="st in orderStatusOptions"
          :key="st.value"
          type="button"
          class="status-pill"
          :class="{ active: orderFilters.status === st.value }"
          @click="setOrderStatusFilter(st.value)"
        >
          <span v-if="st.value" class="status-pill__dot" :class="st.value.toLowerCase()"></span>
          <span>{{ st.label }}</span>
        </button>
      </div>
    </div>

    <!-- ================= TAB 1: ORDERS ================= -->
    <div v-if="activeTab === 'ORDERS'" class="clean-card">
      <!-- Single-Row Search & Filter Toolbar -->
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="orderFilters.search"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('orders.searchOrdersPlaceholder')"
              @keyup.enter="fetchOrders(1)"
            />
            <button
              v-if="orderFilters.search"
              type="button"
              class="search-clear"
              @click="orderFilters.search = ''; fetchOrders(1)"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <select
            v-model="orderFilters.order_type"
            class="filter-input filter-select"
            @change="fetchOrders(1)"
          >
            <option value="">{{ $t('common.allTypes') }}</option>
            <option value="TAKEAWAY">{{ $t('common.takeaway') }}</option>
            <option value="DINE_IN">{{ $t('common.dineIn') }}</option>
          </select>

          <div class="date-range-group">
            <i class="bi bi-calendar3 date-range-group__icon"></i>
            <input
              v-model="orderFilters.start_date"
              type="date"
              class="date-range-group__input"
              @change="fetchOrders(1)"
            />
            <span class="date-range-group__sep">→</span>
            <input
              v-model="orderFilters.end_date"
              type="date"
              class="date-range-group__input"
              @change="fetchOrders(1)"
            />
          </div>
        </div>

        <div class="filter-bar__right">
          <button
            v-if="appStore.currentShift?.id"
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': orderFilters.currentShiftOnly }"
            @click="toggleCurrentShiftFilter"
          >
            <i class="bi bi-clock-history"></i>
            <span>{{ $t('orders.currentShift') }}</span>
          </button>

          <button
            type="button"
            class="toolbar-btn toolbar-btn--icon"
            :title="$t('common.reset')"
            @click="resetOrderFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>
      </div>

      <!-- Orders Table -->
      <div v-if="isLoadingOrders" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('orders.loadingOrders') }}</div>
      </div>

      <div v-else-if="ordersList.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-receipt-cutoff"></i>
        </div>
        <div class="empty-box__title">{{ $t('orders.noOrdersFound') }}</div>
        <div class="empty-box__desc">{{ $t('orders.noOrdersFoundDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('orders.colReceiptQueue') }}</th>
              <th>{{ $t('orders.colTypeTable') }}</th>
              <th>{{ $t('orders.colCashier') }}</th>
              <th>{{ $t('orders.colItems') }}</th>
              <th>{{ $t('orders.colTotal') }}</th>
              <th>{{ $t('orders.colStatus') }}</th>
              <th>{{ $t('orders.colDateTime') }}</th>
              <th class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ord in ordersList"
              :key="ord.id"
              class="clickable-row"
              @click="openOrderDetails(ord.id)"
            >
              <td>
                <div class="receipt-cell">
                  <span class="receipt-cell__no tabular">{{ ord.receipt_no }}</span>
                  <span class="receipt-cell__queue tabular">
                    {{ $t('receipt.queue') }} #{{ ord.queue_no }}
                  </span>
                </div>
              </td>
              <td>
                <span
                  class="type-badge"
                  :class="ord.order_type === 'DINE_IN' ? 'dine-in' : 'takeaway'"
                >
                  <i :class="ord.order_type === 'DINE_IN' ? 'bi bi-shop' : 'bi bi-bag'"></i>
                  <span>
                    {{ ord.order_type === 'DINE_IN' ? $t('common.dineIn') : $t('common.takeaway') }}
                    <template v-if="ord.table_no"> • #{{ ord.table_no }}</template>
                  </span>
                </span>
              </td>
              <td>
                <span class="cashier-name">{{ ord.cashier?.name || '—' }}</span>
              </td>
              <td>
                <span class="items-text tabular">
                  {{ $t('orders.itemsCount', { count: ord.total_items }) }}
                </span>
              </td>
              <td>
                <div class="amount-cell tabular">
                  <strong class="amount-cell__usd">{{ formatUsd(ord.total) }}</strong>
                  <span class="amount-cell__khr">{{ formatKhr(usdToKhr(ord.total, ord.exchange_rate)) }}</span>
                </div>
              </td>
              <td>
                <span class="status-text" :class="ord.status.toLowerCase()">
                  {{ getOrderStatusLabel(ord.status) }}
                </span>
              </td>
              <td>
                <span class="datetime-text tabular">{{ formatDateTime(ord.created_at) }}</span>
              </td>
              <td class="text-end" @click.stop>
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.view')"
                    @click="openOrderDetails(ord.id)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>

                  <!-- OPEN Order Actions -->
                  <template v-if="ord.status === 'OPEN'">
                    <button
                      type="button"
                      class="btn-action-icon is-pos"
                      :title="$t('orders.resumeInPos')"
                      @click="resumeInPos(ord.id)"
                    >
                      <i class="bi bi-calculator"></i>
                    </button>
                    <button
                      type="button"
                      class="btn-action-icon is-danger"
                      :title="$t('common.cancel')"
                      @click="openCancelModal(ord)"
                    >
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </template>

                  <!-- PAID Order Actions -->
                  <template v-if="ord.status === 'PAID'">
                    <button
                      type="button"
                      class="btn-action-icon is-refund"
                      :title="$t('orders.refundOrder')"
                      @click="openRefundModalFromOrder(ord.id)"
                    >
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="orderPagination.totalPages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: orderPagination.page, total: orderPagination.totalPages }) }}
          <span class="ms-1 text-muted">{{ $t('orders.totalOrdersCount', { count: orderPagination.total }) }}</span>
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="orderPagination.page <= 1"
            @click="fetchOrders(orderPagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="orderPagination.page >= orderPagination.totalPages"
            @click="fetchOrders(orderPagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= TAB 2: PAYMENTS ================= -->
    <div v-if="activeTab === 'PAYMENTS'" class="clean-card">
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="paymentFilters.search"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('orders.searchPaymentsPlaceholder')"
              @keyup.enter="fetchPayments(1)"
            />
            <button
              v-if="paymentFilters.search"
              type="button"
              class="search-clear"
              @click="paymentFilters.search = ''; fetchPayments(1)"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <select
            v-model="paymentFilters.method"
            class="filter-input filter-select"
            @change="fetchPayments(1)"
          >
            <option value="">{{ $t('common.allMethods') }}</option>
            <option value="CASH">{{ $t('common.cash') }}</option>
            <option value="KHQR">{{ $t('common.khqr') }}</option>
            <option value="BANK_TRANSFER">{{ $t('common.bankTransfer') }}</option>
          </select>

          <select
            v-model="paymentFilters.currency"
            class="filter-input filter-select"
            @change="fetchPayments(1)"
          >
            <option value="">{{ $t('common.allCurrencies') }}</option>
            <option value="USD">USD ($)</option>
            <option value="KHR">KHR (៛)</option>
          </select>
        </div>

        <div class="filter-bar__right">
          <button
            type="button"
            class="toolbar-btn"
            @click="resetPaymentFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.reset') }}</span>
          </button>
        </div>
      </div>

      <div v-if="isLoadingPayments" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('orders.loadingPayments') }}</div>
      </div>

      <div v-else-if="paymentsList.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-credit-card"></i>
        </div>
        <div class="empty-box__title">{{ $t('orders.noPaymentsFound') }}</div>
        <div class="empty-box__desc">{{ $t('orders.noPaymentsFoundDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('orders.colReceipt') }}</th>
              <th>{{ $t('orders.colMethod') }}</th>
              <th>{{ $t('orders.colBillAmount') }}</th>
              <th>{{ $t('orders.colReceived') }}</th>
              <th>{{ $t('orders.colChange') }}</th>
              <th>{{ $t('orders.colCashier') }}</th>
              <th>{{ $t('orders.colPaidAt') }}</th>
              <th class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pay in paymentsList"
              :key="pay.id"
              class="clickable-row"
              @click="openOrderDetails(pay.order_id)"
            >
              <td>
                <span class="receipt-cell__no tabular">{{ pay.receipt_no }}</span>
              </td>
              <td>
                <span class="method-pill">
                  <i :class="pay.method === 'CASH' ? 'bi bi-cash-stack' : 'bi bi-qr-code-scan'"></i>
                  <span>{{ getMethodLabel(pay.method) }}</span>
                </span>
                <span v-if="pay.bank_name" class="small text-muted ms-1">({{ pay.bank_name }})</span>
              </td>
              <td>
                <strong class="amount-cell__usd tabular">
                  {{ pay.currency === 'USD' ? formatUsd(pay.amount) : formatKhr(pay.amount) }}
                </strong>
              </td>
              <td>
                <span class="fw-semibold tabular">
                  {{
                    pay.currency === 'USD'
                      ? formatUsd(pay.received_amount)
                      : formatKhr(pay.received_amount)
                  }}
                </span>
              </td>
              <td>
                <div v-if="pay.change_usd > 0" class="small text-success fw-semibold tabular">
                  {{ formatUsd(pay.change_usd) }}
                </div>
                <div v-else-if="pay.change_khr > 0" class="small text-success fw-semibold tabular">
                  {{ formatKhr(pay.change_khr) }}
                </div>
                <span v-else class="small text-muted">—</span>
              </td>
              <td>
                <span class="cashier-name">{{ pay.receiver_name }}</span>
              </td>
              <td>
                <span class="datetime-text tabular">{{ formatDateTime(pay.paid_at) }}</span>
              </td>
              <td class="text-end" @click.stop>
                <div class="action-group">
                  <span v-if="pay.is_refunded" class="status-text refunded me-1">
                    {{ $t('orders.statusRefunded') }}
                  </span>
                  <button
                    type="button"
                    class="btn-action-icon"
                    @click="openOrderDetails(pay.order_id)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  <button
                    v-if="!pay.is_refunded"
                    type="button"
                    class="btn-action-icon is-refund"
                    @click="openRefundModalWithPayment(pay)"
                  >
                    <i class="bi bi-arrow-counterclockwise"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="paymentPagination.total_pages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: paymentPagination.current_page, total: paymentPagination.total_pages }) }}
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="paymentPagination.current_page <= 1"
            @click="fetchPayments(paymentPagination.current_page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="paymentPagination.current_page >= paymentPagination.total_pages"
            @click="fetchPayments(paymentPagination.current_page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= TAB 3: REFUNDS ================= -->
    <div v-if="activeTab === 'REFUNDS'" class="clean-card">
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="refundFilters.search"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('orders.searchRefundsPlaceholder')"
              @keyup.enter="fetchRefunds(1)"
            />
            <button
              v-if="refundFilters.search"
              type="button"
              class="search-clear"
              @click="refundFilters.search = ''; fetchRefunds(1)"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div class="filter-bar__right">
          <button
            type="button"
            class="toolbar-btn"
            @click="refundFilters.search = ''; fetchRefunds(1)"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.refresh') }}</span>
          </button>
        </div>
      </div>

      <div v-if="isLoadingRefunds" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('orders.loadingRefunds') }}</div>
      </div>

      <div v-else-if="refundsList.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-shield-check"></i>
        </div>
        <div class="empty-box__title">{{ $t('orders.noRefundsRecorded') }}</div>
        <div class="empty-box__desc">{{ $t('orders.noRefundsRecordedDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('orders.colRefundIdReceipt') }}</th>
              <th>{{ $t('orders.colMethod') }}</th>
              <th>{{ $t('orders.colRefundedAmount') }}</th>
              <th>{{ $t('orders.colReason') }}</th>
              <th>{{ $t('orders.colApprovedBy') }}</th>
              <th>{{ $t('orders.colRefundedAt') }}</th>
              <th class="text-end">{{ $t('orders.colOrder') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="refItem in refundsList"
              :key="refItem.id"
              class="clickable-row"
              @click="openOrderDetails(refItem.order_id)"
            >
              <td>
                <div class="receipt-cell">
                  <span class="receipt-cell__no tabular">{{ refItem.receipt_no }}</span>
                  <span class="receipt-cell__queue tabular">
                    #{{ refItem.id }} • {{ $t('receipt.shift') }} #{{ refItem.shift_id }}
                  </span>
                </div>
              </td>
              <td>
                <span class="method-pill">
                  <i :class="refItem.method === 'CASH' ? 'bi bi-cash-stack' : 'bi bi-qr-code-scan'"></i>
                  <span>{{ getMethodLabel(refItem.method) }}</span>
                </span>
              </td>
              <td>
                <div class="amount-cell tabular">
                  <strong class="text-danger fw-bold">
                    -{{
                      refItem.currency === 'USD'
                        ? formatUsd(refItem.amount)
                        : formatKhr(refItem.amount)
                    }}
                  </strong>
                  <span class="amount-cell__khr">{{ formatUsd(refItem.amount_usd) }} USD</span>
                </div>
              </td>
              <td>
                <div class="small text-dark" style="max-width: 260px">{{ refItem.reason }}</div>
                <div v-if="refItem.reference" class="small text-muted">Ref: {{ refItem.reference }}</div>
              </td>
              <td>
                <span class="cashier-name">{{ refItem.approver_name }}</span>
              </td>
              <td>
                <span class="datetime-text tabular">{{ formatDateTime(refItem.refunded_at) }}</span>
              </td>
              <td class="text-end" @click.stop>
                <button
                  type="button"
                  class="btn-action-icon"
                  @click="openOrderDetails(refItem.order_id)"
                >
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="refundPagination.total_pages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: refundPagination.current_page, total: refundPagination.total_pages }) }}
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="refundPagination.current_page <= 1"
            @click="fetchRefunds(refundPagination.current_page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="refundPagination.current_page >= refundPagination.total_pages"
            @click="fetchRefunds(refundPagination.current_page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 1: ORDER DETAILS & RECEIPT REPRINT ================= -->
    <div v-if="showDetailModal && selectedOrder" class="modal-backdrop-custom" @click.self="showDetailModal = false">
      <div class="modal-card-custom modal-lg-custom">
        <div class="modal-header-custom no-print">
          <div class="d-flex align-items-center gap-2">
            <h6 class="mb-0 fw-bold">{{ $t('orders.orderTitle', { no: selectedOrder.receipt_no }) }}</h6>
            <span class="status-text" :class="selectedOrder.status.toLowerCase()">
              {{ getOrderStatusLabel(selectedOrder.status) }}
            </span>
          </div>
          <button type="button" class="btn-close-custom" @click="showDetailModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <div class="row g-3">
            <!-- Left: Order Info & Actions -->
            <div class="col-md-6 no-print">
              <div class="info-box mb-3">
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">{{ $t('orders.queueNumber') }}</span>
                  <span class="fw-bold">#{{ selectedOrder.queue_no }}</span>
                </div>
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">{{ $t('orders.orderType') }}</span>
                  <span class="fw-semibold">
                    {{ selectedOrder.order_type === 'DINE_IN' ? $t('common.dineIn') : $t('common.takeaway') }}
                    <template v-if="selectedOrder.table_no">
                      ({{ $t('receipt.table') }} {{ selectedOrder.table_no }})
                    </template>
                  </span>
                </div>
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">{{ $t('orders.colCashier') }}</span>
                  <span class="fw-semibold">{{ selectedOrder.cashier?.name }}</span>
                </div>
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">{{ $t('orders.createdAt') }}</span>
                  <span>{{ formatDateTime(selectedOrder.created_at) }}</span>
                </div>
                <div v-if="selectedOrder.paid_at" class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">{{ $t('orders.paidAt') }}</span>
                  <span class="text-success fw-semibold">{{ formatDateTime(selectedOrder.paid_at) }}</span>
                </div>
                <div
                  v-if="selectedOrder.discount?.amount > 0"
                  class="d-flex justify-content-between small mb-2"
                >
                  <span class="text-muted">{{ $t('common.discount') }}</span>
                  <span class="fw-semibold text-success tabular">
                    <template v-if="selectedOrder.discount?.code">
                      {{ selectedOrder.discount.code }} •
                    </template>
                    -{{ formatUsd(selectedOrder.discount.amount) }}
                  </span>
                </div>
                <div v-if="selectedOrder.cancelled_at" class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">{{ $t('orders.cancelledBy') }}</span>
                  <span class="text-danger">
                    {{ selectedOrder.cancelled_by?.name }} ({{ selectedOrder.cancellation_reason }})
                  </span>
                </div>
                <div v-if="selectedOrder.note" class="small text-muted border-top pt-2 mt-2">
                  <strong>{{ $t('common.note') }}:</strong> {{ selectedOrder.note }}
                </div>
              </div>

              <!-- Payment Info Box -->
              <div v-if="selectedOrder.payments?.length > 0" class="info-box">
                <div class="fw-bold small mb-2">{{ $t('orders.paymentRecord') }}</div>
                <div
                  v-for="p in selectedOrder.payments"
                  :key="p.id"
                  class="small"
                >
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">{{ $t('orders.colMethod') }}</span>
                    <span class="fw-semibold">{{ p.method }} ({{ p.currency }})</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">{{ $t('orders.colReceived') }}</span>
                    <span class="fw-bold">
                      {{ p.currency === 'USD' ? formatUsd(p.received_amount) : formatKhr(p.received_amount) }}
                    </span>
                  </div>
                  <div v-if="p.change_usd > 0 || p.change_khr > 0" class="d-flex justify-content-between">
                    <span class="text-muted">{{ $t('orders.colChange') }}</span>
                    <span class="text-success fw-semibold">
                      {{ p.change_usd > 0 ? formatUsd(p.change_usd) : formatKhr(p.change_khr) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Printable Thermal Receipt -->
            <div class="col-md-6">
              <div id="printable-order-receipt" class="thermal-receipt">
                <div class="text-center mb-2">
                  <img
                    v-if="appStore.shopLogoUrl"
                    :src="appStore.shopLogoUrl"
                    alt="Logo"
                    class="receipt-logo mb-1"
                  />
                  <div class="fw-bold">{{ appStore.shopName }}</div>
                  <div v-if="appStore.settings.address" class="receipt-sub">
                    {{ appStore.settings.address }}
                  </div>
                  <div v-if="appStore.settings.phone" class="receipt-sub">
                    {{ $t('receipt.tel') }}: {{ appStore.settings.phone }}
                  </div>
                </div>

                <div class="receipt-divider"></div>

                <div class="d-flex justify-content-between receipt-meta">
                  <span>{{ $t('receipt.receipt') }}: <strong>{{ selectedOrder.receipt_no }}</strong></span>
                  <span>{{ $t('receipt.queue') }}: <strong>#{{ selectedOrder.queue_no }}</strong></span>
                </div>
                <div class="d-flex justify-content-between receipt-meta">
                  <span>{{ $t('receipt.type') }}: {{ selectedOrder.order_type === 'DINE_IN' ? $t('common.dineIn') : $t('common.takeaway') }}</span>
                  <span>{{ $t('receipt.status') }}: <strong>{{ selectedOrder.status }}</strong></span>
                </div>

                <div class="receipt-divider"></div>

                <div
                  v-for="item in selectedOrder.items"
                  :key="item.id"
                  class="mb-2"
                >
                  <div class="d-flex justify-content-between fw-semibold">
                    <span>{{ item.quantity }}x {{ item.product_name }} ({{ item.variant_name }})</span>
                    <span>{{ formatUsd(item.line_total) }}</span>
                  </div>
                  <div v-if="item.sugar_level !== null || item.ice_level" class="receipt-item-sub">
                    <span v-if="item.sugar_level !== null">{{ $t('receipt.sugar') }} {{ item.sugar_level }}%</span>
                    <span v-if="item.sugar_level !== null && item.ice_level"> • </span>
                    <span v-if="item.ice_level">{{ $t('receipt.ice') }} {{ item.ice_level }}</span>
                  </div>
                  <div
                    v-for="addon in item.addons || []"
                    :key="addon.id"
                    class="receipt-item-sub d-flex justify-content-between"
                  >
                    <span>+ {{ addon.quantity }}x {{ addon.addon_name }}</span>
                    <span>{{ formatUsd(addon.line_total) }}</span>
                  </div>
                </div>

                <div class="receipt-divider"></div>

                <div class="d-flex justify-content-between receipt-meta">
                  <span>{{ $t('receipt.subtotal') }}</span>
                  <span>{{ formatUsd(selectedOrder.subtotal) }}</span>
                </div>
                <div
                  v-if="selectedOrder.discount?.amount > 0"
                  class="d-flex justify-content-between receipt-meta"
                >
                  <span>
                    {{ $t('receipt.discount') }}
                    <template v-if="getReceiptDiscountLabel(selectedOrder.discount)">
                      ({{ getReceiptDiscountLabel(selectedOrder.discount) }})
                    </template>
                  </span>
                  <span>-{{ formatUsd(selectedOrder.discount.amount) }}</span>
                </div>
                <div class="d-flex justify-content-between fw-bold mt-1">
                  <span>{{ $t('receipt.totalUsd') }}</span>
                  <span>{{ formatUsd(selectedOrder.total) }}</span>
                </div>
                <div class="d-flex justify-content-between receipt-meta fw-semibold">
                  <span>{{ $t('receipt.totalKhr') }}</span>
                  <span>
                    {{
                      formatKhr(
                        usdToKhr(
                          selectedOrder.total,
                          selectedOrder.exchange_rate || selectedOrder.payments?.[0]?.khr_per_usd
                        )
                      )
                    }}
                  </span>
                </div>

                <template v-if="selectedOrder.payments?.length > 0">
                  <div class="receipt-divider"></div>
                  <div
                    v-for="p in selectedOrder.payments"
                    :key="`rcp-pay-${p.id}`"
                  >
                    <div class="d-flex justify-content-between receipt-meta">
                      <span>
                        {{ $t('receipt.paidBy', { method: getMethodLabel(p.method) }) }}
                        <template v-if="p.bank_name"> ({{ p.bank_name }})</template>
                      </span>
                      <span>
                        {{ p.currency === 'USD' ? formatUsd(p.received_amount) : formatKhr(p.received_amount) }}
                      </span>
                    </div>
                    <div
                      v-if="p.change_usd > 0"
                      class="d-flex justify-content-between receipt-meta"
                    >
                      <span>{{ $t('receipt.changeUsd') }}</span>
                      <span>{{ formatUsd(p.change_usd) }}</span>
                    </div>
                    <div
                      v-if="p.change_khr > 0"
                      class="d-flex justify-content-between receipt-meta"
                    >
                      <span>{{ $t('receipt.changeKhr') }}</span>
                      <span>{{ formatKhr(p.change_khr) }}</span>
                    </div>
                  </div>
                </template>

                <div class="receipt-divider"></div>
                <div class="text-center receipt-sub">
                  {{ appStore.settings.receipt_footer || $t('receipt.thankYouDefault') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer-custom no-print">
          <button type="button" class="btn btn-light-coffee" @click="showDetailModal = false">
            {{ $t('common.close') }}
          </button>

          <button
            v-if="selectedOrder.status === 'OPEN'"
            type="button"
            class="btn btn-outline-coffee"
            @click="resumeInPos(selectedOrder.id)"
          >
            <i class="bi bi-calculator me-1"></i>{{ $t('orders.resumeInPos') }}
          </button>

          <button
            v-if="selectedOrder.status === 'PAID'"
            type="button"
            class="btn btn-outline-danger"
            @click="showDetailModal = false; openRefundModalFromOrder(selectedOrder.id)"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>{{ $t('orders.refundOrder') }}
          </button>

          <button type="button" class="btn btn-coffee ms-auto" @click="printCurrentReceipt">
            <i class="bi bi-printer me-1"></i>{{ $t('receipt.printReceipt') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 2: CANCEL OPEN ORDER ================= -->
    <div v-if="showCancelModal && cancellingOrder" class="modal-backdrop-custom" @click.self="showCancelModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold text-danger">{{ $t('orders.cancelOrderTitle', { no: cancellingOrder.receipt_no }) }}</h6>
          <button type="button" class="btn-close-custom" @click="showCancelModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <p class="small text-muted mb-3">
            {{ $t('orders.cancelOrderConfirm', { queue: cancellingOrder.queue_no, total: formatUsd(cancellingOrder.total) }) }}
          </p>

          <label class="form-label-clean">{{ $t('orders.cancellationReason') }} <span class="text-danger">*</span></label>
          <textarea
            v-model="cancelReason"
            rows="3"
            class="form-control form-control-clean"
            :placeholder="$t('orders.cancelReasonPlaceholder')"
            maxlength="255"
          ></textarea>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="showCancelModal = false">
            {{ $t('orders.keepOrder') }}
          </button>
          <button
            type="button"
            class="btn btn-danger flex-grow-1"
            :disabled="isSubmittingCancel"
            @click="handleConfirmCancel"
          >
            <span v-if="isSubmittingCancel" class="spinner-border spinner-border-sm me-1"></span>
            {{ $t('orders.confirmCancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 3: PROCESS REFUND ================= -->
    <div v-if="showRefundModal && refundTargetPayment" class="modal-backdrop-custom" @click.self="closeRefundModal">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">{{ $t('orders.processRefundTitle') }}</h6>
          <button type="button" class="btn-close-custom" @click="closeRefundModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <div class="info-box mb-3">
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">{{ $t('orders.receiptNo') }}</span>
              <span class="fw-bold">{{ refundTargetPayment.receipt_no }}</span>
            </div>
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">{{ $t('orders.paymentMethod') }}</span>
              <span class="fw-semibold">{{ refundTargetPayment.method }}</span>
            </div>
            <div class="d-flex justify-content-between small">
              <span class="text-muted">{{ $t('orders.refundAmount') }}</span>
              <span class="fw-bold text-danger">
                {{
                  refundTargetPayment.currency === 'USD'
                    ? formatUsd(refundTargetPayment.amount)
                    : formatKhr(refundTargetPayment.amount)
                }}
              </span>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label-clean">{{ $t('orders.refundReasonLabel') }} <span class="text-danger">*</span></label>
            <textarea
              v-model="refundForm.reason"
              rows="2"
              class="form-control form-control-clean"
              name="refund_reason_text"
              autocomplete="off"
              :placeholder="$t('orders.refundReasonPlaceholder')"
              maxlength="500"
            ></textarea>
          </div>

          <div v-if="!authStore.isOwner" class="mb-3">
            <label class="form-label-clean">{{ $t('pos.ownerPassword') }} <span class="text-danger">*</span></label>
            <input
              v-model="refundForm.owner_password"
              :type="supportsTextSecurity ? 'text' : 'password'"
              class="form-control form-control-clean"
              :class="{ 'masked-secret-input': supportsTextSecurity && Boolean(refundForm.owner_password) }"
              name="refund_approval_code"
              :placeholder="$t('pos.ownerPasswordPlaceholder')"
              :autocomplete="supportsTextSecurity ? 'off' : 'new-password'"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              :readonly="!refundPasswordUnlocked"
              @focus="refundPasswordUnlocked = true"
              @mousedown="refundPasswordUnlocked = true"
              @copy.prevent
              @cut.prevent
            />
          </div>

          <div class="mb-1">
            <label class="form-label-clean">{{ $t('orders.referenceNoteOptional') }}</label>
            <input
              v-model="refundForm.reference"
              type="text"
              class="form-control form-control-clean"
              name="refund_reference_note"
              autocomplete="off"
              placeholder="..."
              maxlength="150"
            />
          </div>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="closeRefundModal">
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-danger flex-grow-1"
            :disabled="isSubmittingRefund"
            @click="handleConfirmRefund"
          >
            <span v-if="isSubmittingRefund" class="spinner-border spinner-border-sm me-1"></span>
            {{ $t('orders.confirmRefund') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'
import { useI18n } from '@/i18n'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()
const { formatDateTime } = useFormatDate()
const { t } = useI18n()

const activeTab = ref('ORDERS')

// ================= STATE: ORDERS =================
const ordersList = ref([])
const isLoadingOrders = ref(false)
const orderPagination = reactive({
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 1,
})

const orderStatusOptions = computed(() => [
  { value: '', label: t('orders.statusAll') },
  { value: 'OPEN', label: t('orders.statusOpen') },
  { value: 'PAID', label: t('orders.statusPaid') },
  { value: 'CANCELLED', label: t('orders.statusCancelled') },
  { value: 'REFUNDED', label: t('orders.statusRefunded') },
])

const getOrderStatusLabel = (status) => {
  switch (status) {
    case 'OPEN':
      return t('orders.statusOpen')
    case 'PAID':
      return t('orders.statusPaid')
    case 'CANCELLED':
      return t('orders.statusCancelled')
    case 'REFUNDED':
      return t('orders.statusRefunded')
    default:
      return status
  }
}

const getMethodLabel = (method) => {
  switch (method) {
    case 'CASH':
      return t('common.cash')
    case 'KHQR':
      return t('common.khqr')
    case 'BANK_TRANSFER':
      return t('common.bankTransfer')
    default:
      return method
  }
}

const getReceiptDiscountLabel = (discount) => {
  if (!discount) return ''
  if (discount.name) return discount.name
  if (discount.code && discount.reason) {
    const prefix = `${discount.code} - `
    if (discount.reason.startsWith(prefix)) {
      return discount.reason.slice(prefix.length).trim()
    }
  }
  return ''
}

const orderFilters = reactive({
  status: '',
  order_type: '',
  search: '',
  start_date: '',
  end_date: '',
  currentShiftOnly: false,
})

// ================= STATE: PAYMENTS =================
const paymentsList = ref([])
const isLoadingPayments = ref(false)
const paymentPagination = reactive({
  current_page: 1,
  limit: 15,
  total_items: 0,
  total_pages: 1,
})

const paymentFilters = reactive({
  search: '',
  method: '',
  currency: '',
})

// ================= STATE: REFUNDS =================
const refundsList = ref([])
const isLoadingRefunds = ref(false)
const refundPagination = reactive({
  current_page: 1,
  limit: 15,
  total_items: 0,
  total_pages: 1,
})
const refundFilters = reactive({
  search: '',
})

// ================= STATE: MODALS =================
const showDetailModal = ref(false)
const selectedOrder = ref(null)

const showCancelModal = ref(false)
const cancellingOrder = ref(null)
const cancelReason = ref('')
const isSubmittingCancel = ref(false)

const showRefundModal = ref(false)
const refundTargetPayment = ref(null)
const isSubmittingRefund = ref(false)
const refundForm = reactive({
  reason: '',
  approved_by: 1,
  owner_password: '',
  reference: '',
})

// ================= METHODS: FETCHING =================
const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'ORDERS') fetchOrders(1)
  if (tab === 'PAYMENTS') fetchPayments(1)
  if (tab === 'REFUNDS') fetchRefunds(1)
}

const fetchOrders = async (page = 1) => {
  isLoadingOrders.value = true
  try {
    const params = {
      page,
      limit: orderPagination.limit,
    }
    if (orderFilters.status) params.status = orderFilters.status
    if (orderFilters.order_type) params.order_type = orderFilters.order_type
    if (orderFilters.search?.trim()) params.search = orderFilters.search.trim()
    if (orderFilters.start_date) params.start_date = orderFilters.start_date
    if (orderFilters.end_date) params.end_date = orderFilters.end_date
    if (orderFilters.currentShiftOnly && appStore.currentShift?.id) {
      params.shift_id = appStore.currentShift.id
    }

    const res = await api.get('/orders', { params })
    ordersList.value = res.data?.data || []
    if (res.data?.pagination) {
      Object.assign(orderPagination, res.data.pagination)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load orders')
  } finally {
    isLoadingOrders.value = false
  }
}

const setOrderStatusFilter = (status) => {
  orderFilters.status = status
  fetchOrders(1)
}

const toggleCurrentShiftFilter = () => {
  orderFilters.currentShiftOnly = !orderFilters.currentShiftOnly
  fetchOrders(1)
}

const resetOrderFilters = () => {
  orderFilters.status = ''
  orderFilters.order_type = ''
  orderFilters.search = ''
  orderFilters.start_date = ''
  orderFilters.end_date = ''
  orderFilters.currentShiftOnly = false
  fetchOrders(1)
}

const fetchPayments = async (page = 1) => {
  isLoadingPayments.value = true
  try {
    const params = { page, limit: paymentPagination.limit }
    if (paymentFilters.search?.trim()) params.search = paymentFilters.search.trim()
    if (paymentFilters.method) params.method = paymentFilters.method
    if (paymentFilters.currency) params.currency = paymentFilters.currency

    const res = await api.get('/payments', { params })
    paymentsList.value = res.data?.data || []
    if (res.data?.pagination) {
      Object.assign(paymentPagination, res.data.pagination)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load payments')
  } finally {
    isLoadingPayments.value = false
  }
}

const resetPaymentFilters = () => {
  paymentFilters.search = ''
  paymentFilters.method = ''
  paymentFilters.currency = ''
  fetchPayments(1)
}

const fetchRefunds = async (page = 1) => {
  isLoadingRefunds.value = true
  try {
    const params = { page, limit: refundPagination.limit }
    if (refundFilters.search?.trim()) params.search = refundFilters.search.trim()

    const res = await api.get('/refunds', { params })
    refundsList.value = res.data?.data || []
    if (res.data?.pagination) {
      Object.assign(refundPagination, res.data.pagination)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load refunds')
  } finally {
    isLoadingRefunds.value = false
  }
}

// ================= METHODS: ACTIONS =================
const openOrderDetails = async (orderId) => {
  try {
    const res = await api.get(`/orders/${orderId}`)
    selectedOrder.value = res.data?.data
    showDetailModal.value = true
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load order details')
  }
}

const resumeInPos = (orderId) => {
  router.push({ path: '/pos', query: { orderId } })
}

const openCancelModal = (ord) => {
  cancellingOrder.value = ord
  cancelReason.value = ''
  showCancelModal.value = true
}

const handleConfirmCancel = async () => {
  if (!cancelReason.value.trim()) {
    toast.warning('Please enter a cancellation reason')
    return
  }
  isSubmittingCancel.value = true
  try {
    await api.post(`/orders/${cancellingOrder.value.id}/cancel`, {
      reason: cancelReason.value.trim(),
    })
    toast.success(`Order ${cancellingOrder.value.receipt_no} cancelled`)
    showCancelModal.value = false
    await Promise.all([fetchOrders(orderPagination.page), appStore.fetchCurrentShift()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to cancel order')
  } finally {
    isSubmittingCancel.value = false
  }
}

const openRefundModalFromOrder = async (orderId) => {
  try {
    const res = await api.get(`/payments/order/${orderId}`)
    const payment = res.data?.data
    if (!payment) {
      toast.warning('No completed payment found for this order')
      return
    }
    openRefundModalWithPayment(payment)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to find payment for refund')
  }
}

const supportsTextSecurity =
  typeof window !== 'undefined' &&
  typeof window.CSS?.supports === 'function' &&
  window.CSS.supports('-webkit-text-security', 'disc')
const refundPasswordUnlocked = ref(false)

const closeRefundModal = () => {
  showRefundModal.value = false
  refundForm.owner_password = ''
  refundPasswordUnlocked.value = false
}

const openRefundModalWithPayment = (payment) => {
  if (!appStore.hasOpenShift) {
    toast.warning('You must have an active open shift to process a refund.')
    return
  }
  refundTargetPayment.value = payment
  refundForm.reason = ''
  refundForm.reference = ''
  refundForm.approved_by = authStore.isOwner ? authStore.user?.id : 1
  refundForm.owner_password = ''
  refundPasswordUnlocked.value = false
  showRefundModal.value = true
}

const handleConfirmRefund = async () => {
  if (!refundForm.reason || refundForm.reason.trim().length < 3) {
    toast.warning('Refund reason must be at least 3 characters')
    return
  }
  if (!authStore.isOwner && !refundForm.owner_password?.trim()) {
    toast.warning(t('pos.ownerPasswordRequired'))
    return
  }
  isSubmittingRefund.value = true
  try {
    const payload = {
      payment_id: refundTargetPayment.value.id,
      reason: refundForm.reason.trim(),
    }
    if (refundForm.reference?.trim()) {
      payload.reference = refundForm.reference.trim()
    }
    if (!authStore.isOwner) {
      payload.owner_password = refundForm.owner_password
    }

    await api.post('/refunds', payload)
    toast.success(`Refund processed for ${refundTargetPayment.value.receipt_no}`)
    closeRefundModal()

    await Promise.all([
      fetchOrders(orderPagination.page),
      fetchPayments(paymentPagination.current_page),
      appStore.fetchCurrentShift(),
    ])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Refund failed')
  } finally {
    isSubmittingRefund.value = false
  }
}

const printCurrentReceipt = () => {
  window.print()
}

onMounted(async () => {
  await Promise.all([fetchOrders(1), appStore.fetchCurrentShift()])
})
</script>

<style scoped>
.orders-page {
  color: var(--roast-ink);
}

.orders-page button:focus,
.orders-page button:focus-visible,
.orders-page input:focus,
.orders-page select:focus {
  outline: none;
}

/* ================= TOP NAVIGATION & STATUS BAR ================= */
.orders-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.orders-segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #e9f0ec;
  border: 1px solid #dce6e0;
  border-radius: 10px;
}

/* Status Quick Pills */
.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
}

.status-pill {
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  color: #4b5f53;
  border-radius: 8px;
  padding: 0.36rem 0.78rem;
  font-size: 0.78rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.status-pill:hover:not(.active) {
  border-color: #b8ccc0;
  background: #f5f9f6;
  color: var(--roast-ink);
}

.status-pill.active {
  background: #eaf5ee;
  color: #193e2b;
  border-color: #3b7054;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(45, 90, 67, 0.08);
}

.status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-pill__dot.open {
  background: #d97706;
}

.status-pill__dot.paid {
  background: #16a34a;
}

.status-pill__dot.cancelled {
  background: #64748b;
}

.status-pill__dot.refunded {
  background: #dc2626;
}

.toolbar-btn.is-active {
  background: #eaf5ee;
  border-color: #3b7054;
  color: #193e2b;
  font-weight: 700;
}

/* Table Cells */
.receipt-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.receipt-cell__no {
  font-weight: 700;
  color: var(--roast-ink);
  font-size: 0.85rem;
}

.receipt-cell__queue {
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--sage-muted);
}

.cashier-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2f4236;
}

.items-text {
  color: #3d5245;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.amount-cell__usd {
  font-size: 0.88rem;
  font-weight: 800;
  color: #193e2b;
}

.amount-cell__khr {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--sage-muted);
}

.datetime-text {
  font-size: 0.8rem;
  color: #485c50;
}

/* Badges */
.type-badge {
  font-size: 0.81rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  white-space: nowrap;
}

.type-badge i {
  font-size: 0.8rem;
}

.type-badge.dine-in {
  color: #0369a1;
}

.type-badge.takeaway {
  color: #2d5a43;
}

.status-text.open {
  color: #b45309;
}

.method-pill {
  font-size: 0.81rem;
  font-weight: 600;
  color: #193e2b;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  white-space: nowrap;
}

.btn-action-icon.is-pos {
  background: #eaf5ee;
  border-color: #bdd8c8;
  color: #2d5a43;
}

.btn-action-icon.is-pos:hover {
  background: #2d5a43;
  border-color: #2d5a43;
  color: #ffffff;
}

.btn-action-icon.is-refund {
  background: #fdf8f2;
  border-color: #eedbc3;
  color: #9a5b13;
}

.btn-action-icon.is-refund:hover {
  background: #fef3c7;
  border-color: #d97706;
  color: #92400e;
}

.btn-outline-coffee {
  background: #ffffff;
  color: #2d5a43;
  border: 1.5px solid #3b7054;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.45rem 0.95rem;
}

.btn-outline-coffee:hover {
  background: #eaf5ee;
  color: #193e2b;
}

.modal-lg-custom {
  max-width: 720px;
}

.info-box {
  background: #f7faf8;
  border: 1px solid #dce6e0;
  border-radius: 10px;
  padding: 0.85rem;
}

.masked-secret-input {
  -webkit-text-security: disc;
}

.masked-secret-input::placeholder {
  -webkit-text-security: none;
}
</style>
