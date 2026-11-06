<template>
  <div class="orders-page">
    <!-- Clean Tab Switcher Navigation -->
    <div class="orders-nav-tabs d-flex align-items-center gap-4 mb-3">
      <button
        type="button"
        class="nav-tab-btn"
        :class="{ active: activeTab === 'ORDERS' }"
        @click="switchTab('ORDERS')"
      >
        <i class="bi bi-receipt"></i>
        <span>Orders</span>
      </button>
      <button
        type="button"
        class="nav-tab-btn"
        :class="{ active: activeTab === 'PAYMENTS' }"
        @click="switchTab('PAYMENTS')"
      >
        <i class="bi bi-credit-card-2-front"></i>
        <span>Payments</span>
      </button>
      <button
        type="button"
        class="nav-tab-btn"
        :class="{ active: activeTab === 'REFUNDS' }"
        @click="switchTab('REFUNDS')"
      >
        <i class="bi bi-arrow-counterclockwise"></i>
        <span>Refunds</span>
      </button>
    </div>

    <!-- ================= TAB 1: ORDERS ================= -->
    <div v-if="activeTab === 'ORDERS'" class="clean-card">
      <!-- Status Quick Filter Pills + Search Bar -->
      <div class="filter-bar">
        <div class="status-pills">
          <button
            v-for="st in orderStatusOptions"
            :key="st.value"
            type="button"
            class="status-pill"
            :class="{ active: orderFilters.status === st.value }"
            @click="setOrderStatusFilter(st.value)"
          >
            {{ st.label }}
          </button>
        </div>

        <div class="d-flex flex-wrap gap-2 align-items-center">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="orderFilters.search"
              type="text"
              class="form-control form-control-sm search-input"
              placeholder="Receipt #, Queue #, Table..."
              @keyup.enter="fetchOrders(1)"
            />
          </div>

          <select
            v-model="orderFilters.order_type"
            class="form-select form-select-sm filter-select"
            @change="fetchOrders(1)"
          >
            <option value="">All Types</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DINE_IN">Dine-In</option>
          </select>

          <input
            v-model="orderFilters.start_date"
            type="date"
            class="form-control form-control-sm filter-date"
            title="Start Date"
            @change="fetchOrders(1)"
          />
          <input
            v-model="orderFilters.end_date"
            type="date"
            class="form-control form-control-sm filter-date"
            title="End Date"
            @change="fetchOrders(1)"
          />

          <button
            v-if="appStore.currentShift?.id"
            type="button"
            class="btn btn-sm"
            :class="orderFilters.currentShiftOnly ? 'btn-coffee' : 'btn-light-coffee'"
            @click="toggleCurrentShiftFilter"
          >
            <i class="bi bi-clock-history me-1"></i>Current Shift
          </button>

          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            title="Reset Filters"
            @click="resetOrderFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>
      </div>

      <!-- Orders Table -->
      <div v-if="isLoadingOrders" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">Loading orders...</div>
      </div>

      <div v-else-if="ordersList.length === 0" class="empty-box">
        <i class="bi bi-receipt-cutoff fs-2 text-muted mb-2 d-block"></i>
        <div class="fw-semibold text-dark">No Orders Found</div>
        <div class="small text-muted">No orders match the current filter criteria.</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>Receipt / Queue</th>
              <th>Type / Table</th>
              <th>Cashier</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date / Time</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ord in ordersList" :key="ord.id">
              <td>
                <div class="fw-bold text-dark">{{ ord.receipt_no }}</div>
                <div class="small text-muted">Queue #{{ ord.queue_no }}</div>
              </td>
              <td>
                <span
                  class="type-badge"
                  :class="ord.order_type === 'DINE_IN' ? 'dine-in' : 'takeaway'"
                >
                  {{ ord.order_type === 'DINE_IN' ? 'Dine-In' : 'Takeaway' }}
                  <template v-if="ord.table_no"> • #{{ ord.table_no }}</template>
                </span>
              </td>
              <td>
                <div class="fw-semibold small text-dark">{{ ord.cashier?.name || '—' }}</div>
              </td>
              <td>
                <span class="text-muted small">{{ ord.total_items }} item(s)</span>
              </td>
              <td>
                <div class="fw-bold text-dark">{{ formatUsd(ord.total) }}</div>
              </td>
              <td>
                <span class="status-badge" :class="ord.status.toLowerCase()">
                  {{ ord.status }}
                </span>
              </td>
              <td>
                <div class="small text-dark">{{ formatDateTime(ord.created_at) }}</div>
              </td>
              <td class="text-end">
                <div class="d-inline-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-action-icon"
                    title="View Details & Receipt"
                    @click="openOrderDetails(ord.id)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>

                  <!-- OPEN Order Actions -->
                  <template v-if="ord.status === 'OPEN'">
                    <button
                      type="button"
                      class="btn btn-action-icon text-primary"
                      title="Resume / Pay in POS"
                      @click="resumeInPos(ord.id)"
                    >
                      <i class="bi bi-calculator"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-action-icon text-danger"
                      title="Cancel Order"
                      @click="openCancelModal(ord)"
                    >
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </template>

                  <!-- PAID Order Actions -->
                  <template v-if="ord.status === 'PAID'">
                    <button
                      type="button"
                      class="btn btn-action-icon text-warning"
                      title="Process Refund"
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
        <div class="small text-muted">
          Page {{ orderPagination.page }} of {{ orderPagination.totalPages }}
          ({{ orderPagination.total }} total orders)
        </div>
        <div class="d-flex gap-1">
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="orderPagination.page <= 1"
            @click="fetchOrders(orderPagination.page - 1)"
          >
            Prev
          </button>
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="orderPagination.page >= orderPagination.totalPages"
            @click="fetchOrders(orderPagination.page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- ================= TAB 2: PAYMENTS ================= -->
    <div v-if="activeTab === 'PAYMENTS'" class="clean-card">
      <div class="filter-bar">
        <div class="d-flex flex-wrap gap-2 align-items-center w-100 justify-content-between">
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <div class="search-wrap">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="paymentFilters.search"
                type="text"
                class="form-control form-control-sm search-input"
                placeholder="Receipt #, Bank, Reference..."
                @keyup.enter="fetchPayments(1)"
              />
            </div>

            <select
              v-model="paymentFilters.method"
              class="form-select form-select-sm filter-select"
              @change="fetchPayments(1)"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="KHQR">KHQR</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>

            <select
              v-model="paymentFilters.currency"
              class="form-select form-select-sm filter-select"
              @change="fetchPayments(1)"
            >
              <option value="">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="KHR">KHR (៛)</option>
            </select>
          </div>

          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            @click="resetPaymentFilters"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
          </button>
        </div>
      </div>

      <div v-if="isLoadingPayments" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">Loading payments...</div>
      </div>

      <div v-else-if="paymentsList.length === 0" class="empty-box">
        <i class="bi bi-credit-card fs-2 text-muted mb-2 d-block"></i>
        <div class="fw-semibold text-dark">No Payments Found</div>
        <div class="small text-muted">Completed payments will appear here.</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Method</th>
              <th>Bill Amount</th>
              <th>Received</th>
              <th>Change</th>
              <th>Cashier</th>
              <th>Paid At</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pay in paymentsList" :key="pay.id">
              <td>
                <div class="fw-bold text-dark">{{ pay.receipt_no }}</div>
              </td>
              <td>
                <span class="method-pill">{{ pay.method }}</span>
                <span v-if="pay.bank_name" class="small text-muted ms-1">({{ pay.bank_name }})</span>
              </td>
              <td>
                <div class="fw-bold text-dark">
                  {{ pay.currency === 'USD' ? formatUsd(pay.amount) : formatKhr(pay.amount) }}
                </div>
              </td>
              <td>
                <span class="fw-semibold">
                  {{
                    pay.currency === 'USD'
                      ? formatUsd(pay.received_amount)
                      : formatKhr(pay.received_amount)
                  }}
                </span>
              </td>
              <td>
                <div v-if="pay.change_usd > 0" class="small text-success fw-semibold">
                  {{ formatUsd(pay.change_usd) }}
                </div>
                <div v-else-if="pay.change_khr > 0" class="small text-success fw-semibold">
                  {{ formatKhr(pay.change_khr) }}
                </div>
                <span v-else class="small text-muted">—</span>
              </td>
              <td>
                <span class="small fw-semibold">{{ pay.receiver_name }}</span>
              </td>
              <td>
                <span class="small">{{ formatDateTime(pay.paid_at) }}</span>
              </td>
              <td class="text-end">
                <div class="d-inline-flex gap-1 align-items-center">
                  <span v-if="pay.is_refunded" class="status-badge refunded me-1">Refunded</span>
                  <button
                    type="button"
                    class="btn btn-action-icon"
                    title="View Order Receipt"
                    @click="openOrderDetails(pay.order_id)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                  <button
                    v-if="!pay.is_refunded"
                    type="button"
                    class="btn btn-action-icon text-warning"
                    title="Refund Payment"
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
        <div class="small text-muted">
          Page {{ paymentPagination.current_page }} of {{ paymentPagination.total_pages }}
        </div>
        <div class="d-flex gap-1">
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="paymentPagination.current_page <= 1"
            @click="fetchPayments(paymentPagination.current_page - 1)"
          >
            Prev
          </button>
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="paymentPagination.current_page >= paymentPagination.total_pages"
            @click="fetchPayments(paymentPagination.current_page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- ================= TAB 3: REFUNDS ================= -->
    <div v-if="activeTab === 'REFUNDS'" class="clean-card">
      <div class="filter-bar">
        <div class="d-flex flex-wrap gap-2 align-items-center w-100 justify-content-between">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="refundFilters.search"
              type="text"
              class="form-control form-control-sm search-input"
              placeholder="Search receipt # or reason..."
              @keyup.enter="fetchRefunds(1)"
            />
          </div>

          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            @click="refundFilters.search = ''; fetchRefunds(1)"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>Refresh
          </button>
        </div>
      </div>

      <div v-if="isLoadingRefunds" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">Loading refunds...</div>
      </div>

      <div v-else-if="refundsList.length === 0" class="empty-box">
        <i class="bi bi-shield-check fs-2 text-muted mb-2 d-block"></i>
        <div class="fw-semibold text-dark">No Refunds Recorded</div>
        <div class="small text-muted">Refunded transactions will be listed here.</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>Refund ID / Receipt</th>
              <th>Method</th>
              <th>Refunded Amount</th>
              <th>Reason</th>
              <th>Approved By</th>
              <th>Refunded At</th>
              <th class="text-end">Order</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="refItem in refundsList" :key="refItem.id">
              <td>
                <div class="fw-bold text-dark">{{ refItem.receipt_no }}</div>
                <div class="small text-muted">Refund #{{ refItem.id }} • Shift #{{ refItem.shift_id }}</div>
              </td>
              <td>
                <span class="method-pill">{{ refItem.method }}</span>
              </td>
              <td>
                <div class="fw-bold text-danger">
                  -{{
                    refItem.currency === 'USD'
                      ? formatUsd(refItem.amount)
                      : formatKhr(refItem.amount)
                  }}
                </div>
                <div class="small text-muted">{{ formatUsd(refItem.amount_usd) }} USD</div>
              </td>
              <td>
                <div class="small text-dark" style="max-width: 260px">{{ refItem.reason }}</div>
                <div v-if="refItem.reference" class="small text-muted">Ref: {{ refItem.reference }}</div>
              </td>
              <td>
                <span class="small fw-semibold">{{ refItem.approver_name }}</span>
              </td>
              <td>
                <span class="small">{{ formatDateTime(refItem.refunded_at) }}</span>
              </td>
              <td class="text-end">
                <button
                  type="button"
                  class="btn btn-action-icon"
                  title="View Order Details"
                  @click="openOrderDetails(refItem.order_id)"
                >
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= MODAL 1: ORDER DETAILS & RECEIPT REPRINT ================= -->
    <div v-if="showDetailModal && selectedOrder" class="modal-backdrop-custom" @click.self="showDetailModal = false">
      <div class="modal-card-custom modal-lg-custom">
        <div class="modal-header-custom no-print">
          <div class="d-flex align-items-center gap-2">
            <h6 class="mb-0 fw-bold">Order {{ selectedOrder.receipt_no }}</h6>
            <span class="status-badge" :class="selectedOrder.status.toLowerCase()">
              {{ selectedOrder.status }}
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
                  <span class="text-muted">Queue Number</span>
                  <span class="fw-bold">#{{ selectedOrder.queue_no }}</span>
                </div>
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">Order Type</span>
                  <span class="fw-semibold">
                    {{ selectedOrder.order_type }}
                    <template v-if="selectedOrder.table_no">
                      (Table {{ selectedOrder.table_no }})
                    </template>
                  </span>
                </div>
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">Cashier</span>
                  <span class="fw-semibold">{{ selectedOrder.cashier?.name }}</span>
                </div>
                <div class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">Created At</span>
                  <span>{{ formatDateTime(selectedOrder.created_at) }}</span>
                </div>
                <div v-if="selectedOrder.paid_at" class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">Paid At</span>
                  <span class="text-success fw-semibold">{{ formatDateTime(selectedOrder.paid_at) }}</span>
                </div>
                <div v-if="selectedOrder.cancelled_at" class="d-flex justify-content-between small mb-2">
                  <span class="text-muted">Cancelled By</span>
                  <span class="text-danger">
                    {{ selectedOrder.cancelled_by?.name }} ({{ selectedOrder.cancellation_reason }})
                  </span>
                </div>
                <div v-if="selectedOrder.note" class="small text-muted border-top pt-2 mt-2">
                  <strong>Note:</strong> {{ selectedOrder.note }}
                </div>
              </div>

              <!-- Payment Info Box -->
              <div v-if="selectedOrder.payments?.length > 0" class="info-box">
                <div class="fw-bold small mb-2">Payment Record</div>
                <div
                  v-for="p in selectedOrder.payments"
                  :key="p.id"
                  class="small"
                >
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Method</span>
                    <span class="fw-semibold">{{ p.method }} ({{ p.currency }})</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Received</span>
                    <span class="fw-bold">
                      {{ p.currency === 'USD' ? formatUsd(p.received_amount) : formatKhr(p.received_amount) }}
                    </span>
                  </div>
                  <div v-if="p.change_usd > 0 || p.change_khr > 0" class="d-flex justify-content-between">
                    <span class="text-muted">Change</span>
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
                    Tel: {{ appStore.settings.phone }}
                  </div>
                </div>

                <div class="receipt-divider"></div>

                <div class="d-flex justify-content-between receipt-meta">
                  <span>Receipt: <strong>{{ selectedOrder.receipt_no }}</strong></span>
                  <span>Queue: <strong>#{{ selectedOrder.queue_no }}</strong></span>
                </div>
                <div class="d-flex justify-content-between receipt-meta">
                  <span>Type: {{ selectedOrder.order_type }}</span>
                  <span>Status: <strong>{{ selectedOrder.status }}</strong></span>
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
                    <span v-if="item.sugar_level !== null">Sugar {{ item.sugar_level }}%</span>
                    <span v-if="item.sugar_level !== null && item.ice_level"> • </span>
                    <span v-if="item.ice_level">Ice {{ item.ice_level }}</span>
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
                  <span>Subtotal</span>
                  <span>{{ formatUsd(selectedOrder.subtotal) }}</span>
                </div>
                <div
                  v-if="selectedOrder.discount?.amount > 0"
                  class="d-flex justify-content-between receipt-meta"
                >
                  <span>Discount</span>
                  <span>-{{ formatUsd(selectedOrder.discount.amount) }}</span>
                </div>
                <div class="d-flex justify-content-between fw-bold mt-1">
                  <span>TOTAL (USD)</span>
                  <span>{{ formatUsd(selectedOrder.total) }}</span>
                </div>
                <div class="d-flex justify-content-between receipt-meta fw-semibold">
                  <span>TOTAL (KHR)</span>
                  <span>{{ formatKhr(usdToKhr(selectedOrder.total)) }}</span>
                </div>

                <div class="receipt-divider"></div>
                <div class="text-center receipt-sub">
                  {{ appStore.settings.receipt_footer || 'Thank you for visiting!' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer-custom no-print">
          <button type="button" class="btn btn-light-coffee" @click="showDetailModal = false">
            Close
          </button>

          <button
            v-if="selectedOrder.status === 'OPEN'"
            type="button"
            class="btn btn-outline-coffee"
            @click="resumeInPos(selectedOrder.id)"
          >
            <i class="bi bi-calculator me-1"></i>Resume in POS
          </button>

          <button
            v-if="selectedOrder.status === 'PAID'"
            type="button"
            class="btn btn-outline-danger"
            @click="showDetailModal = false; openRefundModalFromOrder(selectedOrder.id)"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>Refund Order
          </button>

          <button type="button" class="btn btn-coffee ms-auto" @click="printCurrentReceipt">
            <i class="bi bi-printer me-1"></i>Print Receipt
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 2: CANCEL OPEN ORDER ================= -->
    <div v-if="showCancelModal && cancellingOrder" class="modal-backdrop-custom" @click.self="showCancelModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold text-danger">Cancel Order {{ cancellingOrder.receipt_no }}</h6>
          <button type="button" class="btn-close-custom" @click="showCancelModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <p class="small text-muted mb-3">
            Are you sure you want to cancel Queue <strong>#{{ cancellingOrder.queue_no }}</strong>
            ({{ formatUsd(cancellingOrder.total) }})? This action cannot be undone.
          </p>

          <label class="form-label-clean">Cancellation Reason <span class="text-danger">*</span></label>
          <textarea
            v-model="cancelReason"
            rows="3"
            class="form-control form-control-clean"
            placeholder="e.g. Customer changed mind, duplicate order..."
            maxlength="255"
          ></textarea>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="showCancelModal = false">
            Keep Order
          </button>
          <button
            type="button"
            class="btn btn-danger flex-grow-1"
            :disabled="isSubmittingCancel"
            @click="handleConfirmCancel"
          >
            <span v-if="isSubmittingCancel" class="spinner-border spinner-border-sm me-1"></span>
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 3: PROCESS REFUND ================= -->
    <div v-if="showRefundModal && refundTargetPayment" class="modal-backdrop-custom" @click.self="showRefundModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">Process Refund</h6>
          <button type="button" class="btn-close-custom" @click="showRefundModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <div class="info-box mb-3">
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">Receipt No</span>
              <span class="fw-bold">{{ refundTargetPayment.receipt_no }}</span>
            </div>
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">Payment Method</span>
              <span class="fw-semibold">{{ refundTargetPayment.method }}</span>
            </div>
            <div class="d-flex justify-content-between small">
              <span class="text-muted">Refund Amount</span>
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
            <label class="form-label-clean">Refund Reason (Min 3 chars) <span class="text-danger">*</span></label>
            <textarea
              v-model="refundForm.reason"
              rows="2"
              class="form-control form-control-clean"
              placeholder="e.g. Wrong drink prepared, customer complaint..."
              maxlength="500"
            ></textarea>
          </div>

          <div v-if="!authStore.isOwner" class="mb-3">
            <label class="form-label-clean">Approved By Owner ID <span class="text-danger">*</span></label>
            <input
              v-model.number="refundForm.approved_by"
              type="number"
              min="1"
              class="form-control form-control-clean"
              placeholder="Active Owner User ID (e.g. 1)"
            />
          </div>

          <div class="mb-1">
            <label class="form-label-clean">Reference Note (Optional)</label>
            <input
              v-model="refundForm.reference"
              type="text"
              class="form-control form-control-clean"
              placeholder="Optional reference..."
              maxlength="150"
            />
          </div>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="showRefundModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-danger flex-grow-1"
            :disabled="isSubmittingRefund"
            @click="handleConfirmRefund"
          >
            <span v-if="isSubmittingRefund" class="spinner-border spinner-border-sm me-1"></span>
            Confirm Refund
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/api'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const toast = useToast()
const { formatUsd, formatKhr, usdToKhr } = useCurrency()
const { formatDateTime } = useFormatDate()

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

const orderStatusOptions = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
]

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
    const params = { page, limit: 20 }
    if (refundFilters.search?.trim()) params.search = refundFilters.search.trim()

    const res = await api.get('/refunds', { params })
    refundsList.value = res.data?.data || []
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

const openRefundModalWithPayment = (payment) => {
  if (!appStore.hasOpenShift) {
    toast.warning('You must have an active open shift to process a refund.')
    return
  }
  refundTargetPayment.value = payment
  refundForm.reason = ''
  refundForm.reference = ''
  refundForm.approved_by = authStore.isOwner ? authStore.user?.id : 1
  showRefundModal.value = true
}

const handleConfirmRefund = async () => {
  if (!refundForm.reason || refundForm.reason.trim().length < 3) {
    toast.warning('Refund reason must be at least 3 characters')
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
      payload.approved_by = Number(refundForm.approved_by) || 1
    }

    await api.post('/refunds', payload)
    toast.success(`Refund processed for ${refundTargetPayment.value.receipt_no}`)
    showRefundModal.value = false

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
.page-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.orders-nav-tabs {
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  gap: 1.5rem;
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
  color: var(--primary, #2c1810);
  font-weight: 600;
  border-bottom-color: var(--primary, #2c1810);
}

.nav-tab-btn i {
  font-size: 15px;
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

.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.status-pill {
  border: 1px solid #e2ddd6;
  background: #ffffff;
  color: #574c45;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.status-pill.active {
  background: #2c1810;
  color: #ffffff;
  border-color: #2c1810;
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
  background: #ffffff;
}

.filter-select,
.filter-date {
  width: auto;
  border-radius: 9px;
  border: 1px solid #dedad4;
}

.clean-table th {
  background: #faf9f7;
  font-size: 0.75rem;
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

.type-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.type-badge.dine-in {
  background: #e0f2fe;
  color: #0369a1;
}

.type-badge.takeaway {
  background: #f3f0ec;
  color: #4f433d;
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  display: inline-block;
}

.status-badge.open {
  background: #fef3c7;
  color: #b45309;
}

.status-badge.paid {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.cancelled {
  background: #f3f4f6;
  color: #4b5563;
}

.status-badge.refunded {
  background: #fee2e2;
  color: #b91c1c;
}

.method-pill {
  font-size: 0.74rem;
  font-weight: 700;
  background: #f4f1ed;
  color: #2c1810;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e6e2dc;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4f433d;
}

.btn-action-icon:hover {
  background: #f4f1ed;
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
  background: #2c1810;
  color: #ffffff;
  border: none;
  border-radius: 9px;
  font-weight: 600;
}

.btn-light-coffee {
  background: #f4f1ed;
  color: #2c1810;
  border: 1px solid #e6e1da;
  border-radius: 9px;
  font-weight: 600;
}

.btn-outline-coffee {
  background: #ffffff;
  color: #2c1810;
  border: 1px solid #2c1810;
  border-radius: 9px;
  font-weight: 600;
}

/* Modal Styles */
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
  max-width: 430px;
}

.modal-lg-custom {
  max-width: 720px;
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

.info-box {
  background: #faf9f7;
  border: 1px solid #e8e4de;
  border-radius: 12px;
  padding: 0.85rem;
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

/* Thermal Receipt */
.thermal-receipt {
  background: #fffef9;
  border: 1px dashed #c8c2b8;
  border-radius: 10px;
  padding: 1rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem;
}

.receipt-logo {
  max-height: 42px;
  object-fit: contain;
}

.receipt-sub {
  font-size: 0.73rem;
  color: #57534e;
}

.receipt-divider {
  border-top: 1px dashed #a8a29e;
  margin: 0.5rem 0;
}

.receipt-meta {
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.receipt-item-sub {
  font-size: 0.72rem;
  color: #57534e;
  padding-left: 0.75rem;
}

@media print {
  body * {
    visibility: hidden;
  }
  #printable-order-receipt,
  #printable-order-receipt * {
    visibility: visible;
  }
  #printable-order-receipt {
    position: fixed;
    left: 0;
    top: 0;
    width: 80mm;
    border: none;
  }
  .no-print {
    display: none !important;
  }
}
</style>
