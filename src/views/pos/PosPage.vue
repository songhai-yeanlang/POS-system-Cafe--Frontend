<template>
  <div class="pos-page">
    <!-- Clean Notice Banner if No Active Shift -->
    <div v-if="!appStore.hasOpenShift && !appStore.isLoadingShift" class="shift-closed-banner mb-3">
      <div class="d-flex align-items-center gap-3 min-w-0">
        <div class="shift-closed-icon">
          <i class="bi bi-safe2"></i>
        </div>
        <div class="min-w-0">
          <div class="fw-semibold text-dark">{{ $t('pos.noActiveShift') }}</div>
          <div class="text-muted small text-truncate">
            {{ $t('pos.noActiveShiftDesc') }}
          </div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 flex-shrink-0">
        <router-link
          to="/shifts"
          class="btn-shift-link text-decoration-none d-none d-sm-inline-flex align-items-center gap-1"
          :title="$t('pos.shiftsAndDrawer')"
        >
          <span>{{ $t('pos.shiftsAndDrawer') }}</span>
          <i class="bi bi-arrow-right"></i>
        </router-link>
        <button
          type="button"
          class="btn btn-coffee btn-sm d-inline-flex align-items-center gap-1 px-3 py-1.5"
          @click="openQuickShiftModal"
        >
          <i class="bi bi-unlock me-1"></i>
          <span>{{ $t('pos.openShift') }}</span>
        </button>
      </div>
    </div>

    <div class="pos-layout">
      <!-- ================= LEFT COLUMN: CATALOG ================= -->
      <div class="pos-catalog-panel">
        <!-- Top Search & Open Orders Bar -->
        <div class="catalog-toolbar">
          <div class="search-box flex-grow-1">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              class="form-control search-input"
              :placeholder="$t('pos.searchPlaceholder')"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="btn-clear-search"
              @click="searchQuery = ''"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <button
            type="button"
            class="btn btn-outline-coffee position-relative"
            @click="openPendingOrdersModal"
          >
            <i class="bi bi-clock-history me-1"></i>
            {{ $t('pos.openOrders') }}
            <span v-if="openOrdersCount > 0" class="open-orders-badge">
              {{ openOrdersCount }}
            </span>
          </button>

          <button
            type="button"
            class="btn btn-light-coffee"
            :title="$t('pos.refreshMenu')"
            :disabled="isLoadingCatalog"
            @click="fetchCatalog"
          >
            <i class="bi bi-arrow-clockwise" :class="{ 'spin-anim': isLoadingCatalog }"></i>
          </button>
        </div>

        <!-- Category Pills -->
        <div class="category-strip">
          <button
            type="button"
            class="cat-pill"
            :class="{ active: selectedCategoryId === 'ALL' }"
            @click="selectedCategoryId = 'ALL'"
          >
            <i class="bi bi-grid-fill me-1"></i>{{ $t('pos.allItems') }}
          </button>
          <button
            v-for="cat in activeCategories"
            :key="cat.id"
            type="button"
            class="cat-pill"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="selectedCategoryId = cat.id"
          >
            {{ $tCategory(cat.name) }}
          </button>
        </div>

        <!-- Product Grid -->
        <div v-if="isLoadingCatalog" class="catalog-empty-state">
          <div class="spinner-border spinner-border-sm text-secondary mb-2" role="status"></div>
          <div class="small text-muted">{{ $t('pos.loadingMenu') }}</div>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="catalog-empty-state">
          <i class="bi bi-cup-hot fs-2 text-muted mb-2 d-block"></i>
          <div class="fw-semibold text-dark">{{ $t('pos.noProductsFound') }}</div>
          <div class="small text-muted">{{ $t('pos.noProductsFoundDesc') }}</div>
        </div>

        <div v-else class="product-grid">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
            :class="{ 'in-cart': getProductCartQty(product.id) > 0 }"
            @click="handleProductClick(product)"
          >
            <div class="product-thumb">
              <img
                v-if="product.image"
                :src="getAssetUrl(product.image)"
                :alt="product.name"
                class="product-img"
              />
              <div v-else class="product-placeholder">
                <i
                  class="bi"
                  :class="product.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot-fill'"
                ></i>
              </div>

              <span v-if="getProductCartQty(product.id) > 0" class="in-cart-badge">
                {{ getProductCartQty(product.id) }}
              </span>

              <span v-if="getActiveVariants(product).length > 1" class="variant-count-pill">
                {{ $t('pos.sizesCount', { count: getActiveVariants(product).length }) }}
              </span>
            </div>

            <div class="product-body">
              <div v-if="product.category_name" class="product-cat">
                {{ $tCategory(product.category_name) }}
              </div>
              <div class="product-title" :title="product.name">{{ product.name }}</div>

              <div class="product-footer">
                <div class="price-usd">{{ formatUsd(getStartingPrice(product)) }}</div>
                <span class="product-add-btn" aria-hidden="true">
                  <i class="bi bi-plus-lg"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= RIGHT COLUMN: CART & CHECKOUT ================= -->
      <div class="pos-cart-panel">
        <!-- Cart Header -->
        <div class="cart-header">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="cart-title">
                {{ editingOrder ? $t('pos.orderQueueTitle', { no: editingOrder.queue_no }) : $t('pos.currentOrder') }}
              </span>
              <span v-if="editingOrder" class="badge-editing">
                {{ editingOrder.receipt_no }}
              </span>
            </div>
            <button
              v-if="cartItems.length > 0 || editingOrder"
              type="button"
              class="btn-reset-cart"
              @click="resetCart"
            >
              <i class="bi bi-trash3 me-1"></i>{{ $t('common.clear') }}
            </button>
          </div>

          <!-- Order Type & Table Selector -->
          <div class="d-flex gap-2 align-items-center">
            <div class="order-type-switch flex-grow-1">
              <button
                type="button"
                class="type-btn"
                :class="{ active: orderForm.order_type === 'TAKEAWAY' }"
                @click="setOrderType('TAKEAWAY')"
              >
                <i class="bi bi-bag-check me-1"></i>{{ $t('common.takeaway') }}
              </button>
              <button
                type="button"
                class="type-btn"
                :class="{ active: orderForm.order_type === 'DINE_IN' }"
                @click="setOrderType('DINE_IN')"
              >
                <i class="bi bi-shop me-1"></i>{{ $t('common.dineIn') }}
              </button>
            </div>

            <div v-if="orderForm.order_type === 'DINE_IN'" class="table-input-wrap">
              <input
                v-model="orderForm.table_no"
                type="text"
                class="form-control form-control-sm table-input"
                :placeholder="$t('pos.tablePlaceholder')"
                maxlength="20"
              />
            </div>
          </div>
        </div>

        <!-- Cart Items List -->
        <div class="cart-items-container">
          <div v-if="cartItems.length === 0" class="cart-empty">
            <div class="empty-cart-icon">
              <i class="bi bi-basket2"></i>
            </div>
            <div class="fw-semibold text-dark">{{ $t('pos.cartEmpty') }}</div>
            <div class="small text-muted">{{ $t('pos.cartEmptyDesc') }}</div>
          </div>

          <div v-else class="cart-list">
            <div
              v-for="(item, index) in cartItems"
              :key="item.cartKey"
              class="cart-item-card"
            >
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="cart-item-info" @click="openEditCartItem(item, index)">
                  <div class="cart-item-name">
                    {{ item.product_name }}
                    <span class="cart-variant-badge">{{ item.variant_name }}</span>
                  </div>

                  <!-- Customizations (Sugar / Ice) -->
                  <div
                    v-if="item.product_type === 'DRINK' && (item.sugar_level !== null || item.ice_level)"
                    class="cart-item-specs"
                  >
                    <span v-if="item.sugar_level !== null" class="spec-chip">
                      {{ $t('pos.sugarPct', { pct: item.sugar_level }) }}
                    </span>
                    <span v-if="item.ice_level" class="spec-chip">
                      {{ $t('pos.iceLabel', { ice: formatIceLabel(item.ice_level) }) }}
                    </span>
                  </div>

                  <!-- Add-ons -->
                  <div v-if="item.addons && item.addons.length > 0" class="cart-item-addons">
                    <div
                      v-for="addon in item.addons"
                      :key="addon.addon_variant_id"
                      class="addon-line"
                    >
                      + {{ addon.quantity }}x {{ addon.name }}
                      ({{ formatUsd(addon.unit_price * addon.quantity) }})
                    </div>
                  </div>

                  <!-- Item Note -->
                  <div v-if="item.note" class="cart-item-note">
                    <i class="bi bi-chat-left-text me-1"></i>{{ item.note }}
                  </div>
                </div>

                <div class="text-end">
                  <div class="cart-item-total">{{ formatUsd(calculateCartItemTotal(item)) }}</div>
                  <div class="cart-item-unit text-muted">
                    {{ formatUsd(item.unit_price) }} {{ $t('pos.each') }}
                  </div>
                </div>
              </div>

              <div class="cart-item-actions mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                <button
                  type="button"
                  class="btn-edit-item"
                  @click="openEditCartItem(item, index)"
                >
                  <i class="bi bi-sliders me-1"></i>{{ $t('pos.customize') }}
                </button>

                <div class="qty-stepper">
                  <button
                    type="button"
                    class="qty-btn"
                    @click="changeCartItemQty(index, -1)"
                  >
                    <i class="bi" :class="item.quantity === 1 ? 'bi-trash3 text-danger' : 'bi-dash'"></i>
                  </button>
                  <span class="qty-val">{{ item.quantity }}</span>
                  <button
                    type="button"
                    class="qty-btn"
                    @click="changeCartItemQty(index, 1)"
                  >
                    <i class="bi bi-plus"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Footer: Discount, Note, Totals & Checkout Buttons -->
        <div class="cart-footer">
          <!-- Discount & Order Note Bar -->
          <div class="d-flex gap-2 mb-2">
            <button
              type="button"
              class="btn btn-xs-action flex-grow-1"
              :class="{ 'has-value': orderForm.discount_type !== 'NONE' && orderForm.discount_value > 0 }"
              @click="showDiscountModal = true"
            >
              <i class="bi bi-tag me-1"></i>
              <span v-if="orderForm.discount_type === 'NONE' || !orderForm.discount_value">
                {{ $t('pos.addDiscount') }}
              </span>
              <span v-else>
                {{
                  $t('pos.discountApplied', {
                    val:
                      orderForm.discount_type === 'PERCENT'
                        ? `${orderForm.discount_value}%`
                        : formatUsd(orderForm.discount_value),
                  })
                }}
              </span>
            </button>

            <button
              type="button"
              class="btn btn-xs-action flex-grow-1"
              :class="{ 'has-value': !!orderForm.note }"
              @click="showNoteModal = true"
            >
              <i class="bi bi-journal-text me-1"></i>
              {{ orderForm.note ? $t('pos.noteAdded') : $t('pos.orderNote') }}
            </button>
          </div>

          <!-- Totals Box -->
          <div class="totals-box">
            <div class="totals-row">
              <span>{{ $t('pos.subtotalItems', { count: totalCartUnits }) }}</span>
              <span class="fw-semibold">{{ formatUsd(cartSubtotal) }}</span>
            </div>
            <div v-if="cartDiscountAmount > 0" class="totals-row text-danger">
              <span>
                {{ $t('common.discount') }}
                <small v-if="orderForm.discount_type === 'PERCENT'">
                  ({{ orderForm.discount_value }}%)
                </small>
              </span>
              <span>-{{ formatUsd(cartDiscountAmount) }}</span>
            </div>
            <div class="totals-divider"></div>
            <div class="totals-grand">
              <div>
                <div class="grand-label">{{ $t('pos.totalPayable') }}</div>
                <div class="grand-rate">{{ $t('pos.rateLabel', { rate: exchangeRate.toLocaleString() }) }}</div>
              </div>
              <div class="text-end">
                <div class="grand-usd">{{ formatUsd(cartGrandTotal) }}</div>
                <div class="grand-khr">{{ formatKhr(usdToKhr(cartGrandTotal)) }}</div>
              </div>
            </div>
          </div>

          <!-- Checkout Actions -->
          <div class="checkout-actions">
            <button
              type="button"
              class="btn btn-hold-order"
              :disabled="cartItems.length === 0 || isSubmittingOrder || !appStore.hasOpenShift"
              @click="handleSaveOpenOrder"
            >
              <span
                v-if="isSubmittingOrder && !showPaymentModal"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              <i v-else class="bi bi-bookmark-check me-1"></i>
              {{ editingOrder ? $t('pos.updateOpen') : $t('pos.holdOrder') }}
            </button>

            <button
              type="button"
              class="btn btn-pay-now"
              :disabled="cartItems.length === 0 || isSubmittingOrder || !appStore.hasOpenShift"
              @click="openCheckoutModal"
            >
              <i class="bi bi-cash-coin me-1"></i>
              {{ $t('pos.payNow', { amount: formatUsd(cartGrandTotal) }) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 1: ITEM CUSTOMIZATION ================= -->
    <div v-if="showCustomizeModal && customizingProduct" class="modal-backdrop-custom" @click.self="closeCustomizeModal">
      <div class="modal-card-custom modal-customize-card">
        <div class="modal-header-custom">
          <div class="d-flex align-items-center gap-3">
            <div class="customize-prod-thumb">
              <img
                v-if="customizingProduct.image"
                :src="getAssetUrl(customizingProduct.image)"
                :alt="customizingProduct.name"
              />
              <i
                v-else
                class="bi"
                :class="customizingProduct.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot'"
              ></i>
            </div>
            <div>
              <div class="d-flex align-items-center gap-2">
                <h5 class="mb-0 fw-bold text-dark">{{ customizingProduct.name }}</h5>
                <span class="badge-type-pill" :class="customizingProduct.product_type?.toLowerCase()">
                  {{ customizingProduct.product_type }}
                </span>
              </div>
              <div class="small text-muted">{{ $tCategory(customizingProduct.category_name) }}</div>
            </div>
          </div>
          <button type="button" class="btn-close-custom" @click="closeCustomizeModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <!-- 1. Select Variant (Size / Temperature) -->
          <div class="mb-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <label class="section-label-modern">{{ $t('pos.chooseSizeVariant') }}</label>
              <span class="small text-muted">{{ $t('pos.availableCount', { count: getActiveVariants(customizingProduct).length }) }}</span>
            </div>
            <div class="variant-grid-modern">
              <button
                v-for="v in getActiveVariants(customizingProduct)"
                :key="v.id"
                type="button"
                class="variant-card-modern"
                :class="{ active: customForm.variant_id === v.id }"
                @click="selectVariantInModal(v)"
              >
                <div class="d-flex align-items-start justify-content-between gap-1 mb-1">
                  <span class="variant-name">{{ v.name }}</span>
                  <div class="variant-radio-indicator">
                    <i class="bi bi-check2"></i>
                  </div>
                </div>
                <div class="variant-specs">
                  <span v-if="v.temperature && v.temperature !== 'NONE'" class="spec-pill" :class="v.temperature.toLowerCase()">
                    {{ v.temperature }}
                  </span>
                  <span v-if="v.size" class="spec-pill size">{{ v.size }}</span>
                </div>
                <div class="variant-price-modern">{{ formatUsd(v.price) }}</div>
              </button>
            </div>
          </div>

          <!-- 2. Drink Customizations: Sugar & Ice -->
          <template v-if="customizingProduct.product_type === 'DRINK'">
            <div class="mb-3">
              <label class="section-label-modern">{{ $t('pos.sugarLevelTitle') }}</label>
              <div class="option-pills-modern">
                <button
                  v-for="s in sugarOptions"
                  :key="s"
                  type="button"
                  class="opt-pill-modern"
                  :class="{ active: customForm.sugar_level === s }"
                  @click="customForm.sugar_level = s"
                >
                  {{ s }}%
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label class="section-label-modern">{{ $t('pos.iceLevelTitle') }}</label>
              <div class="option-pills-modern">
                <button
                  v-for="ice in iceOptions"
                  :key="ice.value"
                  type="button"
                  class="opt-pill-modern"
                  :class="{ active: customForm.ice_level === ice.value }"
                  @click="customForm.ice_level = ice.value"
                >
                  {{ ice.label }}
                </button>
              </div>
            </div>

            <!-- 4. Add-ons (for Drinks) -->
            <div v-if="availableAddons.length > 0" class="mb-3">
              <label class="section-label-modern">{{ $t('pos.extraAddons') }}</label>
              <div class="addons-grid-modern">
                <div
                  v-for="addon in availableAddons"
                  :key="addon.variant_id"
                  class="addon-card-modern"
                  :class="{ selected: getAddonQty(addon.variant_id) > 0 }"
                >
                  <div class="addon-info">
                    <div class="fw-semibold text-dark small">{{ addon.display_name }}</div>
                    <div class="addon-price">+{{ formatUsd(addon.price) }}</div>
                  </div>

                  <div class="qty-stepper-sm">
                    <button
                      v-if="getAddonQty(addon.variant_id) > 0"
                      type="button"
                      class="qty-btn-sm"
                      @click="changeAddonQty(addon, -1)"
                    >
                      <i class="bi bi-dash"></i>
                    </button>
                    <span v-if="getAddonQty(addon.variant_id) > 0" class="qty-val-sm">
                      {{ getAddonQty(addon.variant_id) }}
                    </span>
                    <button
                      type="button"
                      class="qty-btn-sm"
                      @click="changeAddonQty(addon, 1)"
                    >
                      <i class="bi bi-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Quantity & Item Note -->
          <div class="row g-2 align-items-end pt-1">
            <div class="col-sm-5">
              <label class="section-label-modern">{{ $t('pos.quantity') }}</label>
              <div class="qty-stepper-modern">
                <button
                  type="button"
                  class="qty-btn-modern"
                  :disabled="customForm.quantity <= 1"
                  @click="customForm.quantity = Math.max(1, customForm.quantity - 1)"
                >
                  <i class="bi bi-dash-lg"></i>
                </button>
                <span class="qty-val-modern">{{ customForm.quantity }}</span>
                <button
                  type="button"
                  class="qty-btn-modern"
                  @click="customForm.quantity++"
                >
                  <i class="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>
            <div class="col-sm-7">
              <label class="section-label-modern">{{ $t('pos.specialInstruction') }}</label>
              <div class="note-input-wrap">
                <i class="bi bi-pencil note-input-icon"></i>
                <input
                  v-model="customForm.note"
                  type="text"
                  class="form-control form-control-clean note-input"
                  :placeholder="$t('pos.specialInstructionPlaceholder')"
                  maxlength="200"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-ghost-cancel" @click="closeCustomizeModal">
            {{ $t('common.cancel') }}
          </button>
          <button type="button" class="btn btn-add-order flex-grow-1" @click="confirmCustomizedItem">
            <i class="bi bi-cart-plus me-1.5"></i>
            <span>{{ editingCartIndex !== null ? $t('pos.updateItem') : $t('pos.addToOrder') }}</span>
            <span class="footer-btn-divider">•</span>
            <span class="footer-btn-price">{{ formatUsd(customizedPreviewTotal) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 2: DISCOUNT ================= -->
    <div v-if="showDiscountModal" class="modal-backdrop-custom" @click.self="showDiscountModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">{{ $t('pos.orderDiscountTitle') }}</h6>
          <button type="button" class="btn-close-custom" @click="showDiscountModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <div class="mb-3">
            <label class="form-label-clean">{{ $t('pos.discountType') }}</label>
            <div class="option-pills">
              <button
                type="button"
                class="opt-pill flex-grow-1"
                :class="{ active: discountDraft.type === 'NONE' }"
                @click="discountDraft.type = 'NONE'"
              >
                {{ $t('pos.none') }}
              </button>
              <button
                type="button"
                class="opt-pill flex-grow-1"
                :class="{ active: discountDraft.type === 'PERCENT' }"
                @click="discountDraft.type = 'PERCENT'"
              >
                {{ $t('pos.percent') }}
              </button>
              <button
                type="button"
                class="opt-pill flex-grow-1"
                :class="{ active: discountDraft.type === 'FIXED' }"
                @click="discountDraft.type = 'FIXED'"
              >
                {{ $t('pos.fixed') }}
              </button>
            </div>
          </div>

          <template v-if="discountDraft.type !== 'NONE'">
            <div class="mb-3">
              <label class="form-label-clean">
                {{ discountDraft.type === 'PERCENT' ? $t('pos.percentageRange') : $t('pos.amountInUsd') }}
              </label>
              <input
                v-model.number="discountDraft.value"
                type="number"
                step="0.01"
                min="0"
                :max="discountDraft.type === 'PERCENT' ? 100 : cartSubtotal"
                class="form-control form-control-clean"
                placeholder="0.00"
              />
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('pos.discountReason') }} <span class="text-danger">*</span></label>
              <input
                v-model="discountDraft.reason"
                type="text"
                class="form-control form-control-clean"
                :placeholder="$t('pos.discountReasonPlaceholder')"
                maxlength="255"
              />
            </div>

            <div v-if="!authStore.isOwner" class="mb-2">
              <label class="form-label-clean">
                {{ $t('pos.approvedByOwnerId') }} <span class="text-danger">*</span>
              </label>
              <input
                v-model.number="discountDraft.approved_by"
                type="number"
                min="1"
                class="form-control form-control-clean"
                placeholder="Owner User ID (e.g. 1)"
              />
              <div class="form-text small">
                {{ $t('pos.discountOwnerHint') }}
              </div>
            </div>
          </template>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="clearDiscount">
            {{ $t('common.remove') }}
          </button>
          <button type="button" class="btn btn-coffee flex-grow-1" @click="applyDiscountDraft">
            {{ $t('pos.applyDiscount') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 3: ORDER NOTE ================= -->
    <div v-if="showNoteModal" class="modal-backdrop-custom" @click.self="showNoteModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">{{ $t('pos.orderNote') }}</h6>
          <button type="button" class="btn-close-custom" @click="showNoteModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body-custom">
          <label class="form-label-clean">{{ $t('pos.generalNoteLabel') }}</label>
          <textarea
            v-model="orderForm.note"
            rows="3"
            class="form-control form-control-clean"
            :placeholder="$t('pos.orderNotePlaceholder')"
            maxlength="500"
          ></textarea>
        </div>
        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="orderForm.note = ''; showNoteModal = false">
            {{ $t('common.clear') }}
          </button>
          <button type="button" class="btn btn-coffee flex-grow-1" @click="showNoteModal = false">
            {{ $t('pos.saveNote') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 4: PAYMENT / CHECKOUT ================= -->
    <div v-if="showPaymentModal" class="modal-backdrop-custom" @click.self="closePaymentModal">
      <div class="modal-card-custom" style="max-width: 500px;">
        <div class="modal-header-custom">
          <div>
            <h6 class="mb-0 fw-bold">{{ $t('pos.completePayment') }}</h6>
            <div class="small text-muted">
              {{ activeCheckoutOrder ? `${activeCheckoutOrder.receipt_no} (#${activeCheckoutOrder.queue_no})` : $t('pos.newOrderCheckout') }}
            </div>
          </div>
          <button type="button" class="btn-close-custom" :disabled="isProcessingPayment" @click="closePaymentModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <!-- Total Banner -->
          <div class="payment-total-banner mb-3">
            <div>
              <div class="small text-uppercase fw-semibold opacity-75">{{ $t('pos.totalDue') }}</div>
              <div class="fs-3 fw-bold">{{ formatUsd(checkoutTotalUsd) }}</div>
            </div>
            <div class="text-end">
              <div class="small opacity-75">{{ $t('pos.inKhmerRiel', { rate: exchangeRate.toLocaleString() }) }}</div>
              <div class="fs-4 fw-bold">{{ formatKhr(checkoutTotalKhr) }}</div>
            </div>
          </div>

          <!-- Payment Method -->
          <label class="form-label-clean">{{ $t('pos.step1PaymentMethod') }}</label>
          <div class="method-grid mb-3">
            <button
              type="button"
              class="method-btn"
              :class="{ active: paymentForm.method === 'CASH' }"
              @click="selectPaymentMethod('CASH')"
            >
              <i class="bi bi-cash-stack fs-5"></i>
              <span>{{ $t('common.cash') }}</span>
            </button>
            <button
              type="button"
              class="method-btn"
              :class="{ active: paymentForm.method === 'KHQR' }"
              @click="selectPaymentMethod('KHQR')"
            >
              <i class="bi bi-qr-code-scan fs-5"></i>
              <span>{{ $t('common.khqr') }}</span>
            </button>
          </div>

          <!-- Currency Paid By Customer -->
          <label class="form-label-clean">{{ $t('pos.step2PaymentCurrency') }}</label>
          <div class="option-pills mb-3">
            <button
              type="button"
              class="opt-pill flex-grow-1"
              :class="{ active: paymentForm.currency === 'USD' }"
              @click="selectPaymentCurrency('USD')"
            >
              USD ($) — {{ formatUsd(checkoutTotalUsd) }}
            </button>
            <button
              type="button"
              class="opt-pill flex-grow-1"
              :class="{ active: paymentForm.currency === 'KHR' }"
              @click="selectPaymentCurrency('KHR')"
            >
              KHR (៛) — {{ formatKhr(checkoutTotalKhr) }}
            </button>
          </div>

          <!-- CASH Specific Inputs -->
          <template v-if="paymentForm.method === 'CASH'">
            <div class="mb-2">
              <label class="form-label-clean">
                {{ $t('pos.step3CashReceived', { currency: paymentForm.currency }) }}
              </label>
              <input
                :value="paymentForm.currency === 'USD' ? formatUsd(paymentForm.received_amount) : formatKhr(paymentForm.received_amount)"
                type="text"
                readonly
                disabled
                class="form-control form-control-clean fs-5 fw-bold"
                style="background-color: #f4f2ee; color: #1c1917; cursor: default; opacity: 1;"
              />
            </div>
          </template>

          <!-- KHQR / BANK_TRANSFER Specific Inputs -->
          <template v-else>
            <div class="mb-3">
              <label class="form-label-clean">{{ $t('pos.bankWalletName') }}</label>
              <div class="quick-cash-pills mb-2">
                <button
                  v-for="b in ['ABA KHQR', 'ACLEDA', 'Wing', 'Bakong', 'Canadia']"
                  :key="b"
                  type="button"
                  class="quick-cash-btn"
                  :class="{ active: paymentForm.bank_name === b }"
                  @click="paymentForm.bank_name = b"
                >
                  {{ b }}
                </button>
              </div>
              <input
                v-model="paymentForm.bank_name"
                type="text"
                class="form-control form-control-clean"
                :placeholder="$t('pos.bankPlaceholder')"
                maxlength="50"
              />
            </div>

            <div class="mb-2">
              <label class="form-label-clean">{{ $t('pos.transactionRef') }}</label>
              <input
                v-model="paymentForm.reference"
                type="text"
                class="form-control form-control-clean"
                :placeholder="$t('pos.transactionRefPlaceholder')"
                maxlength="150"
              />
              <div class="small text-muted mt-2">
                <i class="bi bi-info-circle me-1"></i>
                {{
                  $t('pos.verifyTransferHint', {
                    amount:
                      paymentForm.currency === 'USD'
                        ? formatUsd(checkoutTotalUsd)
                        : formatKhr(checkoutTotalKhr),
                  })
                }}
              </div>
            </div>
          </template>
        </div>

        <div class="modal-footer-custom">
          <button
            type="button"
            class="btn btn-light-coffee"
            :disabled="isProcessingPayment"
            @click="closePaymentModal"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-pay-confirm flex-grow-1"
            :disabled="isProcessingPayment || !isCashSufficient"
            @click="handleConfirmPayment"
          >
            <span v-if="isProcessingPayment" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-check2-circle me-1"></i>
            {{
              $t('pos.confirmPayment', {
                amount:
                  paymentForm.currency === 'USD'
                    ? formatUsd(checkoutTotalUsd)
                    : formatKhr(checkoutTotalKhr),
              })
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 5: OPEN ORDERS LIST ================= -->
    <div v-if="showOpenOrdersModal" class="modal-backdrop-custom" @click.self="showOpenOrdersModal = false">
      <div class="modal-card-custom modal-lg-custom">
        <div class="modal-header-custom">
          <div>
            <h6 class="mb-0 fw-bold">{{ $t('pos.activeOpenOrdersTitle') }}</h6>
            <div class="small text-muted">{{ $t('pos.activeOpenOrdersDesc') }}</div>
          </div>
          <button type="button" class="btn-close-custom" @click="showOpenOrdersModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <div v-if="isLoadingOpenOrders" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-secondary me-2"></div>
            <span class="small text-muted">{{ $t('pos.loadingOpenOrders') }}</span>
          </div>

          <div v-else-if="openOrdersList.length === 0" class="text-center py-4">
            <i class="bi bi-check2-all fs-2 text-success d-block mb-1"></i>
            <div class="fw-semibold">{{ $t('pos.noOpenOrders') }}</div>
            <div class="small text-muted">{{ $t('pos.noOpenOrdersDesc') }}</div>
          </div>

          <div v-else class="open-orders-list">
            <div
              v-for="ord in openOrdersList"
              :key="ord.id"
              class="open-order-row"
            >
              <div>
                <div class="d-flex align-items-center gap-2">
                  <span class="fw-bold text-dark">{{ $t('receipt.queue') }} #{{ ord.queue_no }}</span>
                  <span class="badge bg-light text-dark border">{{ ord.receipt_no }}</span>
                  <span class="badge" :class="ord.order_type === 'DINE_IN' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'">
                    {{ ord.order_type === 'DINE_IN' ? `${$t('common.dineIn')} ${ord.table_no ? `(${ord.table_no})` : ''}` : $t('common.takeaway') }}
                  </span>
                </div>
                <div class="small text-muted mt-1">
                  {{ $t('orders.itemsCount', { count: ord.total_items }) }} • {{ formatDateTime(ord.created_at) }}
                </div>
              </div>

              <div class="d-flex align-items-center gap-2">
                <div class="text-end me-2">
                  <div class="fw-bold text-dark">{{ formatUsd(ord.total) }}</div>
                  <div class="small text-muted">{{ formatKhr(usdToKhr(ord.total)) }}</div>
                </div>
                <button
                  type="button"
                  class="btn btn-light-coffee btn-sm"
                  @click="loadOrderIntoCart(ord.id)"
                >
                  <i class="bi bi-pencil-square me-1"></i>{{ $t('common.edit') }}
                </button>
                <button
                  type="button"
                  class="btn btn-coffee btn-sm"
                  @click="payExistingOpenOrder(ord.id)"
                >
                  <i class="bi bi-cash-coin me-1"></i>{{ $t('pos.pay') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 6: RECEIPT PRINT PREVIEW ================= -->
    <div v-if="showReceiptModal && completedReceipt" class="modal-backdrop-custom" @click.self="closeReceiptModal">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom no-print">
          <div class="d-flex align-items-center gap-2 text-success fw-bold">
            <i class="bi bi-check-circle-fill"></i>
            <span>{{ $t('receipt.paymentCompleted') }}</span>
          </div>
          <button type="button" class="btn-close-custom" @click="closeReceiptModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <!-- Printable Thermal Receipt -->
          <div id="printable-receipt" class="thermal-receipt">
            <div class="text-center mb-2">
              <img
                v-if="appStore.shopLogoUrl"
                :src="appStore.shopLogoUrl"
                alt="Logo"
                class="receipt-logo mb-1"
              />
              <div class="fw-bold fs-6">{{ appStore.shopName }}</div>
              <div v-if="appStore.settings.address" class="receipt-sub">
                {{ appStore.settings.address }}
              </div>
              <div v-if="appStore.settings.phone" class="receipt-sub">
                {{ $t('receipt.tel') }}: {{ appStore.settings.phone }}
              </div>
            </div>

            <div class="receipt-divider"></div>

            <div class="d-flex justify-content-between receipt-meta">
              <span>{{ $t('receipt.receipt') }}: <strong>{{ completedReceipt.order.receipt_no }}</strong></span>
              <span>{{ $t('receipt.queue') }}: <strong>#{{ completedReceipt.order.queue_no }}</strong></span>
            </div>
            <div class="d-flex justify-content-between receipt-meta">
              <span>{{ $t('receipt.type') }}: {{ completedReceipt.order.order_type === 'DINE_IN' ? $t('common.dineIn') : $t('common.takeaway') }}</span>
              <span v-if="completedReceipt.order.table_no">
                {{ $t('receipt.table') }}: <strong>{{ completedReceipt.order.table_no }}</strong>
              </span>
            </div>
            <div class="d-flex justify-content-between receipt-meta">
              <span>{{ $t('receipt.cashier') }}: {{ completedReceipt.order.cashier?.name || authStore.user?.name }}</span>
              <span>{{ formatDateTime(completedReceipt.payment?.paid_at || completedReceipt.order.created_at) }}</span>
            </div>

            <div class="receipt-divider"></div>

            <!-- Receipt Items -->
            <div class="receipt-items">
              <div
                v-for="item in completedReceipt.order.items"
                :key="item.id"
                class="receipt-item"
              >
                <div class="d-flex justify-content-between fw-semibold">
                  <span>
                    {{ item.quantity }}x {{ item.product_name }} ({{ item.variant_name }})
                  </span>
                  <span>{{ formatUsd(item.line_total) }}</span>
                </div>
                <div
                  v-if="item.sugar_level !== null || item.ice_level"
                  class="receipt-item-sub"
                >
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
            </div>

            <div class="receipt-divider"></div>

            <!-- Totals -->
            <div class="d-flex justify-content-between receipt-meta">
              <span>{{ $t('receipt.subtotal') }}</span>
              <span>{{ formatUsd(completedReceipt.order.subtotal) }}</span>
            </div>
            <div
              v-if="completedReceipt.order.discount?.amount > 0"
              class="d-flex justify-content-between receipt-meta"
            >
              <span>{{ $t('receipt.discount') }}</span>
              <span>-{{ formatUsd(completedReceipt.order.discount.amount) }}</span>
            </div>
            <div class="d-flex justify-content-between fw-bold mt-1">
              <span>{{ $t('receipt.totalUsd') }}</span>
              <span>{{ formatUsd(completedReceipt.order.total) }}</span>
            </div>
            <div class="d-flex justify-content-between fw-semibold receipt-meta">
              <span>{{ $t('receipt.totalKhr') }}</span>
              <span>{{ formatKhr(usdToKhr(completedReceipt.order.total)) }}</span>
            </div>

            <template v-if="completedReceipt.payment">
              <div class="receipt-divider"></div>
              <div class="d-flex justify-content-between receipt-meta">
                <span>{{ $t('receipt.paidBy', { method: completedReceipt.payment.method }) }}</span>
                <span>
                  {{
                    completedReceipt.payment.currency === 'USD'
                      ? formatUsd(completedReceipt.payment.received_amount)
                      : formatKhr(completedReceipt.payment.received_amount)
                  }}
                </span>
              </div>
              <div
                v-if="completedReceipt.payment.change_usd > 0"
                class="d-flex justify-content-between receipt-meta"
              >
                <span>{{ $t('receipt.changeUsd') }}</span>
                <span>{{ formatUsd(completedReceipt.payment.change_usd) }}</span>
              </div>
              <div
                v-if="completedReceipt.payment.change_khr > 0"
                class="d-flex justify-content-between receipt-meta"
              >
                <span>{{ $t('receipt.changeKhr') }}</span>
                <span>{{ formatKhr(completedReceipt.payment.change_khr) }}</span>
              </div>
            </template>

            <div class="receipt-divider"></div>
            <div class="text-center receipt-sub mt-1">
              {{ appStore.settings.receipt_footer || $t('receipt.thankYouDefault') }}
            </div>
          </div>
        </div>

        <div class="modal-footer-custom no-print">
          <button type="button" class="btn btn-light-coffee" @click="printReceipt">
            <i class="bi bi-printer me-1"></i>{{ $t('receipt.printReceipt') }}
          </button>
          <button type="button" class="btn btn-coffee flex-grow-1" @click="closeReceiptModal">
            <i class="bi bi-plus-circle me-1"></i>{{ $t('receipt.newOrder') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Open Shift Modal -->
    <div
      v-if="showQuickShiftModal"
      class="modal-backdrop-custom"
      @click.self="showQuickShiftModal = false"
    >
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <div>
            <h6 class="mb-0 fw-bold">{{ $t('pos.openCashierShiftTitle') }}</h6>
            <div class="small text-muted">{{ $t('pos.openCashierShiftDesc') }}</div>
          </div>
          <button type="button" class="btn-close-custom" @click="showQuickShiftModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="submitQuickOpenShift">
          <div class="modal-body-custom">
            <!-- Opening Cash USD -->
            <div class="mb-3">
              <label class="form-label-clean">{{ $t('pos.openingCashUsd') }}</label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0 fw-bold text-muted">$</span>
                <input
                  v-model.number="quickShiftForm.opening_cash_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-control border-start-0"
                  placeholder="0.00"
                  required
                  autofocus
                />
              </div>
            </div>

            <!-- Opening Cash KHR -->
            <div class="mb-3">
              <label class="form-label-clean">{{ $t('pos.openingCashKhr') }}</label>
              <div class="input-group">
                <input
                  v-model.number="quickShiftForm.opening_cash_khr"
                  type="number"
                  step="100"
                  min="0"
                  class="form-control border-end-0"
                  placeholder="0"
                  required
                />
                <span class="input-group-text bg-light border-start-0 fw-bold text-muted">៛</span>
              </div>
            </div>

            <!-- Note (Optional) -->
            <div class="mb-2">
              <label class="form-label-clean">{{ $t('pos.shiftNoteOptional') }}</label>
              <input
                v-model="quickShiftForm.note"
                type="text"
                class="form-control"
                :placeholder="$t('pos.shiftNotePlaceholder')"
              />
            </div>
          </div>

          <div class="modal-footer-custom">
            <button
              type="button"
              class="btn btn-light-coffee"
              :disabled="quickShiftForm.isSubmitting"
              @click="showQuickShiftModal = false"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="submit"
              class="btn btn-coffee flex-grow-1"
              :disabled="quickShiftForm.isSubmitting"
            >
              <span
                v-if="quickShiftForm.isSubmitting"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              <i v-else class="bi bi-unlock me-1"></i>
              {{ $t('pos.startShift') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { getAssetUrl } from '@/api/api'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const toast = useToast()
const { exchangeRate, formatUsd, formatKhr, usdToKhr, khrToUsd } = useCurrency()
const { formatDateTime } = useFormatDate()
const { t } = useI18n()

// ================= STATE: QUICK OPEN SHIFT =================
const showQuickShiftModal = ref(false)
const quickShiftForm = reactive({
  opening_cash_usd: 0,
  opening_cash_khr: 0,
  note: '',
  isSubmitting: false,
})

const openQuickShiftModal = () => {
  quickShiftForm.opening_cash_usd = 0
  quickShiftForm.opening_cash_khr = 0
  quickShiftForm.note = ''
  showQuickShiftModal.value = true
}

const submitQuickOpenShift = async () => {
  const usd = Number(quickShiftForm.opening_cash_usd)
  const khr = Number(quickShiftForm.opening_cash_khr)

  if (isNaN(usd) || usd < 0 || isNaN(khr) || khr < 0) {
    toast.error('Opening cash amounts cannot be negative.')
    return
  }

  quickShiftForm.isSubmitting = true
  try {
    const res = await api.post('/shifts/open', {
      opening_cash_usd: Number(usd.toFixed(2)),
      opening_cash_khr: Math.round(khr),
      note: quickShiftForm.note?.trim() || null,
    })
    toast.success(res.data?.message || 'Shift opened successfully')
    showQuickShiftModal.value = false
    await appStore.fetchCurrentShift()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to open shift')
  } finally {
    quickShiftForm.isSubmitting = false
  }
}

// ================= STATE: CATALOG =================
const categories = ref([])
const products = ref([])
const isLoadingCatalog = ref(false)
const searchQuery = ref('')
const selectedCategoryId = ref('ALL')

// ================= STATE: CART & ORDER =================
const cartItems = ref([])
const editingOrder = ref(null)
const isSubmittingOrder = ref(false)

const orderForm = reactive({
  order_type: 'TAKEAWAY',
  table_no: '',
  note: '',
  discount_type: 'NONE',
  discount_value: 0,
  discount_reason: '',
  discount_approved_by: null,
})

// ================= STATE: ITEM CUSTOMIZE MODAL =================
const showCustomizeModal = ref(false)
const customizingProduct = ref(null)
const editingCartIndex = ref(null)

const sugarOptions = [0, 25, 50, 75, 100]
const iceOptions = computed(() => [
  { value: 'NONE', label: t('pos.noIce') },
  { value: 'LESS', label: t('pos.lessIce') },
  { value: 'NORMAL', label: t('pos.normalIce') },
  { value: 'EXTRA', label: t('pos.extraIce') },
])

const customForm = reactive({
  variant_id: null,
  variant_name: '',
  unit_price: 0,
  quantity: 1,
  sugar_level: 100,
  ice_level: 'NORMAL',
  note: '',
  addons: [],
})

// ================= STATE: DISCOUNT & NOTE MODALS =================
const showDiscountModal = ref(false)
const showNoteModal = ref(false)
const discountDraft = reactive({
  type: 'NONE',
  value: 0,
  reason: '',
  approved_by: 1,
})

// ================= STATE: PAYMENT MODAL =================
const showPaymentModal = ref(false)
const isProcessingPayment = ref(false)
const activeCheckoutOrder = ref(null)

const paymentForm = reactive({
  method: 'CASH',
  currency: 'USD',
  received_amount: 0,
  change_currency: 'USD',
  bank_name: '',
  reference: '',
})

// ================= STATE: OPEN ORDERS & RECEIPT =================
const showOpenOrdersModal = ref(false)
const isLoadingOpenOrders = ref(false)
const openOrdersList = ref([])
const openOrdersCount = ref(0)

const showReceiptModal = ref(false)
const completedReceipt = ref(null)

// ================= COMPUTED: CATALOG =================
const activeCategories = computed(() =>
  categories.value.filter((c) => c.is_active)
)

const availableAddons = computed(() => {
  const list = []
  for (const p of products.value) {
    if (p.is_active && p.product_type === 'ADDON' && Array.isArray(p.variants)) {
      for (const v of p.variants) {
        if (v.is_active) {
          const displayName =
            v.name === 'Regular' || v.name === 'Standard'
              ? p.name
              : `${p.name} (${v.name})`
          list.push({
            variant_id: v.id,
            product_id: p.id,
            display_name: displayName,
            price: Number(v.price) || 0,
          })
        }
      }
    }
  }
  return list
})

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return products.value.filter((p) => {
    if (!p.is_active) return false
    if (p.product_type === 'ADDON') return false
    const activeVars = getActiveVariants(p)
    if (activeVars.length === 0) return false

    if (selectedCategoryId.value !== 'ALL' && p.category_id !== selectedCategoryId.value) {
      return false
    }
    if (q) {
      const matchName = p.name?.toLowerCase().includes(q)
      const matchCat = p.category_name?.toLowerCase().includes(q)
      return matchName || matchCat
    }
    return true
  })
})

const getActiveVariants = (product) => {
  if (!Array.isArray(product?.variants)) return []
  return product.variants.filter((v) => v.is_active)
}

const getStartingPrice = (product) => {
  const vars = getActiveVariants(product)
  if (!vars.length) return 0
  return Math.min(...vars.map((v) => Number(v.price) || 0))
}

const getProductCartQty = (productId) => {
  return cartItems.value
    .filter((item) => item.product_id === productId)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

// ================= COMPUTED: CART TOTALS =================
const calculateCartItemTotal = (item) => {
  const baseLine = Number((item.quantity * Number(item.unit_price)).toFixed(2))
  const addonsTotal = (item.addons || []).reduce(
    (sum, a) => sum + Number((a.quantity * Number(a.unit_price)).toFixed(2)),
    0
  )
  return Number((baseLine + addonsTotal).toFixed(2))
}

const totalCartUnits = computed(() =>
  cartItems.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
)

const cartSubtotal = computed(() => {
  const raw = cartItems.value.reduce((sum, item) => sum + calculateCartItemTotal(item), 0)
  return Number(raw.toFixed(2))
})

const cartDiscountAmount = computed(() => {
  const sub = cartSubtotal.value
  if (sub <= 0 || orderForm.discount_type === 'NONE') return 0
  const val = Number(orderForm.discount_value) || 0
  if (val <= 0) return 0

  if (orderForm.discount_type === 'PERCENT') {
    const pct = Math.min(100, val)
    return Number((Math.round(((sub * pct) / 100) * 100) / 100).toFixed(2))
  }
  if (orderForm.discount_type === 'FIXED') {
    return Number(Math.min(sub, val).toFixed(2))
  }
  return 0
})

const cartGrandTotal = computed(() =>
  Number(Math.max(0, cartSubtotal.value - cartDiscountAmount.value).toFixed(2))
)

// ================= COMPUTED: CUSTOMIZATION MODAL =================
const customizedPreviewTotal = computed(() => {
  const base = Number(customForm.quantity || 1) * Number(customForm.unit_price || 0)
  const addonsSum = customForm.addons.reduce(
    (s, a) => s + Number(a.quantity || 0) * Number(a.unit_price || 0),
    0
  )
  return Number((base + addonsSum).toFixed(2))
})

// ================= COMPUTED: PAYMENT MODAL =================
const checkoutTotalUsd = computed(() => {
  if (activeCheckoutOrder.value) {
    return Number(activeCheckoutOrder.value.total) || 0
  }
  return cartGrandTotal.value
})

const checkoutTotalKhr = computed(() =>
  Math.round(checkoutTotalUsd.value * exchangeRate.value)
)

const requiredBillAmount = computed(() =>
  paymentForm.currency === 'USD' ? checkoutTotalUsd.value : checkoutTotalKhr.value
)

const effectiveReceivedAmount = computed(() => {
  if (paymentForm.method !== 'CASH') {
    return requiredBillAmount.value
  }
  return Number(paymentForm.received_amount) || 0
})

const isCashSufficient = computed(() => {
  if (paymentForm.method !== 'CASH') return true
  return effectiveReceivedAmount.value >= requiredBillAmount.value
})

const calculatedChange = computed(() => {
  if (paymentForm.method !== 'CASH' || !isCashSufficient.value) {
    return { changeUsd: 0, changeKhr: 0 }
  }
  const diffInPaidCurrency = effectiveReceivedAmount.value - requiredBillAmount.value
  const diffUsd =
    paymentForm.currency === 'USD'
      ? diffInPaidCurrency
      : diffInPaidCurrency / exchangeRate.value

  if (paymentForm.change_currency === 'KHR') {
    return {
      changeUsd: 0,
      changeKhr: Math.round(diffUsd * exchangeRate.value),
    }
  }
  return {
    changeUsd: Number(diffUsd.toFixed(2)),
    changeKhr: 0,
  }
})

const quickCashPresets = computed(() => {
  const bill = requiredBillAmount.value
  if (paymentForm.currency === 'USD') {
    const candidates = [1, 2, 5, 10, 20, 50, 100]
    return candidates.filter((c) => c >= bill).slice(0, 5)
  } else {
    const candidates = [5000, 10000, 20000, 50000, 100000, 200000]
    return candidates.filter((c) => c >= bill).slice(0, 5)
  }
})

// ================= METHODS: FETCH CATALOG & OPEN ORDERS =================
const fetchCatalog = async () => {
  isLoadingCatalog.value = true
  try {
    const [catRes, prodRes] = await Promise.all([
      api.get('/categories', { params: { is_active: true } }),
      api.get('/products', { params: { limit: 200, is_active: true } }),
    ])
    categories.value = catRes.data?.data || []
    products.value = prodRes.data?.data || []
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load POS catalog')
  } finally {
    isLoadingCatalog.value = false
  }
}

const fetchOpenOrders = async () => {
  if (!appStore.currentShift?.id) {
    openOrdersList.value = []
    openOrdersCount.value = 0
    return
  }
  isLoadingOpenOrders.value = true
  try {
    const res = await api.get('/orders', {
      params: {
        status: 'OPEN',
        shift_id: appStore.currentShift.id,
        limit: 50,
      },
    })
    openOrdersList.value = res.data?.data || []
    openOrdersCount.value = res.data?.pagination?.total ?? openOrdersList.value.length
  } catch {
    openOrdersList.value = []
  } finally {
    isLoadingOpenOrders.value = false
  }
}

const openPendingOrdersModal = async () => {
  showOpenOrdersModal.value = true
  await fetchOpenOrders()
}

// ================= METHODS: ITEM CUSTOMIZATION =================
const handleProductClick = (product) => {
  const activeVars = getActiveVariants(product)
  if (!activeVars.length) return

  // Open customization modal for Drinks or multi-variant items
  customizingProduct.value = product
  editingCartIndex.value = null

  const defaultVar = activeVars[0]
  customForm.variant_id = defaultVar.id
  customForm.variant_name = defaultVar.name
  customForm.unit_price = Number(defaultVar.price) || 0
  customForm.quantity = 1
  customForm.sugar_level = product.product_type === 'DRINK' ? 100 : null
  customForm.ice_level = product.product_type === 'DRINK' ? 'NORMAL' : null
  customForm.note = ''
  customForm.addons = []

  showCustomizeModal.value = true
}

const openEditCartItem = (item, index) => {
  const product = products.value.find((p) => p.id === item.product_id) || {
    id: item.product_id,
    name: item.product_name,
    category_name: 'Order Item',
    product_type: item.product_type || 'DRINK',
    variants: [
      {
        id: item.variant_id,
        name: item.variant_name,
        price: item.unit_price,
        is_active: true,
      },
    ],
  }

  customizingProduct.value = product
  editingCartIndex.value = index

  customForm.variant_id = item.variant_id
  customForm.variant_name = item.variant_name
  customForm.unit_price = Number(item.unit_price)
  customForm.quantity = Number(item.quantity)
  customForm.sugar_level = item.sugar_level
  customForm.ice_level = item.ice_level
  customForm.note = item.note || ''
  customForm.addons = (item.addons || []).map((a) => ({ ...a }))

  showCustomizeModal.value = true
}

const selectVariantInModal = (v) => {
  customForm.variant_id = v.id
  customForm.variant_name = v.name
  customForm.unit_price = Number(v.price) || 0
}

const getAddonQty = (addonVariantId) => {
  const found = customForm.addons.find((a) => a.addon_variant_id === addonVariantId)
  return found ? found.quantity : 0
}

const changeAddonQty = (addon, delta) => {
  const idx = customForm.addons.findIndex((a) => a.addon_variant_id === addon.variant_id)
  if (idx === -1 && delta > 0) {
    customForm.addons.push({
      addon_variant_id: addon.variant_id,
      name: addon.display_name,
      unit_price: addon.price,
      quantity: 1,
    })
  } else if (idx !== -1) {
    const nextQty = customForm.addons[idx].quantity + delta
    if (nextQty <= 0) {
      customForm.addons.splice(idx, 1)
    } else {
      customForm.addons[idx].quantity = nextQty
    }
  }
}

const closeCustomizeModal = () => {
  showCustomizeModal.value = false
  customizingProduct.value = null
  editingCartIndex.value = null
}

const buildItemSignature = (item) => {
  const addonsKey = (item.addons || [])
    .slice()
    .sort((a, b) => a.addon_variant_id - b.addon_variant_id)
    .map((a) => `${a.addon_variant_id}:${a.quantity}`)
    .join(',')
  return `${item.variant_id}|${item.sugar_level ?? ''}|${item.ice_level ?? ''}|${(item.note || '').trim()}|${addonsKey}`
}

const confirmCustomizedItem = () => {
  if (!customizingProduct.value || !customForm.variant_id) return

  const isDrink = customizingProduct.value.product_type === 'DRINK'
  const newItem = {
    cartKey: `${Date.now()}-${Math.random()}`,
    product_id: customizingProduct.value.id,
    product_name: customizingProduct.value.name,
    product_type: customizingProduct.value.product_type,
    variant_id: customForm.variant_id,
    variant_name: customForm.variant_name,
    unit_price: Number(customForm.unit_price),
    quantity: Number(customForm.quantity),
    sugar_level: isDrink ? customForm.sugar_level : null,
    ice_level: isDrink ? customForm.ice_level : null,
    note: customForm.note ? customForm.note.trim() : '',
    addons: customForm.addons.map((a) => ({ ...a })),
  }

  if (editingCartIndex.value !== null) {
    cartItems.value.splice(editingCartIndex.value, 1, newItem)
  } else {
    // Merge if identical variant + customization + single qty without addons
    const newSig = buildItemSignature(newItem)
    const existingIdx = cartItems.value.findIndex(
      (existing) => (existing.addons || []).length === 0 && newItem.addons.length === 0 && buildItemSignature(existing) === newSig
    )
    if (existingIdx !== -1) {
      cartItems.value[existingIdx].quantity += newItem.quantity
    } else {
      cartItems.value.push(newItem)
    }
  }

  closeCustomizeModal()
}

const changeCartItemQty = (index, delta) => {
  const item = cartItems.value[index]
  if (!item) return
  const next = item.quantity + delta
  if (next <= 0) {
    cartItems.value.splice(index, 1)
  } else {
    item.quantity = next
  }
}

const setOrderType = (type) => {
  orderForm.order_type = type
  if (type === 'TAKEAWAY') {
    orderForm.table_no = ''
  }
}

const formatIceLabel = (ice) => {
  const found = iceOptions.value.find((i) => i.value === ice)
  return found ? found.label : ice
}

// ================= METHODS: DISCOUNT =================
watch(showDiscountModal, (val) => {
  if (val) {
    discountDraft.type = orderForm.discount_type
    discountDraft.value = orderForm.discount_value
    discountDraft.reason = orderForm.discount_reason
    discountDraft.approved_by =
      orderForm.discount_approved_by || (authStore.isOwner ? authStore.user?.id : 1)
  }
})

const clearDiscount = () => {
  orderForm.discount_type = 'NONE'
  orderForm.discount_value = 0
  orderForm.discount_reason = ''
  orderForm.discount_approved_by = null
  showDiscountModal.value = false
}

const applyDiscountDraft = () => {
  if (discountDraft.type === 'NONE' || Number(discountDraft.value) <= 0) {
    clearDiscount()
    return
  }
  if (!discountDraft.reason || !discountDraft.reason.trim()) {
    toast.warning('Please enter a reason for the discount')
    return
  }
  if (discountDraft.type === 'PERCENT' && Number(discountDraft.value) > 100) {
    toast.warning('Percentage discount cannot exceed 100%')
    return
  }
  if (discountDraft.type === 'FIXED' && Number(discountDraft.value) > cartSubtotal.value) {
    toast.warning('Fixed discount cannot exceed subtotal')
    return
  }

  orderForm.discount_type = discountDraft.type
  orderForm.discount_value = Number(discountDraft.value)
  orderForm.discount_reason = discountDraft.reason.trim()
  orderForm.discount_approved_by = authStore.isOwner
    ? authStore.user?.id
    : Number(discountDraft.approved_by) || 1
  showDiscountModal.value = false
}

// ================= METHODS: BUILD PAYLOAD & SAVE ORDER =================
const buildOrderPayload = () => {
  const payload = {
    order_type: orderForm.order_type,
    note: orderForm.note ? orderForm.note.trim() : null,
    discount_type: orderForm.discount_type,
    discount_value: orderForm.discount_type === 'NONE' ? 0 : Number(orderForm.discount_value),
    items: cartItems.value.map((item) => {
      const mapped = {
        variant_id: item.variant_id,
        quantity: item.quantity,
        note: item.note ? item.note.trim() : null,
        addons: (item.addons || []).map((a) => ({
          addon_variant_id: a.addon_variant_id,
          quantity: a.quantity,
        })),
      }
      if (item.sugar_level !== null && item.sugar_level !== undefined) {
        mapped.sugar_level = Number(item.sugar_level)
      }
      if (item.ice_level) {
        mapped.ice_level = item.ice_level
      }
      return mapped
    }),
  }

  if (orderForm.order_type === 'DINE_IN' && orderForm.table_no?.trim()) {
    payload.table_no = orderForm.table_no.trim()
  }

  if (orderForm.discount_type !== 'NONE' && orderForm.discount_value > 0) {
    payload.discount_reason = orderForm.discount_reason
    payload.discount_approved_by = authStore.isOwner
      ? authStore.user?.id
      : Number(orderForm.discount_approved_by) || 1
  }

  return payload
}

const resetCart = () => {
  cartItems.value = []
  editingOrder.value = null
  activeCheckoutOrder.value = null
  orderForm.order_type = 'TAKEAWAY'
  orderForm.table_no = ''
  orderForm.note = ''
  orderForm.discount_type = 'NONE'
  orderForm.discount_value = 0
  orderForm.discount_reason = ''
  orderForm.discount_approved_by = null

  if (route.query.orderId) {
    router.replace({ path: '/pos', query: {} })
  }
}

const saveOrUpdateOrderRecord = async () => {
  const payload = buildOrderPayload()
  if (editingOrder.value?.id) {
    const res = await api.put(`/orders/${editingOrder.value.id}`, payload)
    return res.data?.data
  } else {
    const res = await api.post('/orders', payload)
    return res.data?.data
  }
}

const handleSaveOpenOrder = async () => {
  if (cartItems.value.length === 0) return
  isSubmittingOrder.value = true
  try {
    const saved = await saveOrUpdateOrderRecord()
    toast.success(
      editingOrder.value
        ? `Order ${saved.receipt_no} updated`
        : `Order #${saved.queue_no} (${saved.receipt_no}) saved as Open`
    )
    resetCart()
    await Promise.all([fetchOpenOrders(), appStore.fetchCurrentShift()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save order')
  } finally {
    isSubmittingOrder.value = false
  }
}

// ================= METHODS: PAYMENT & CHECKOUT =================
const initPaymentDefaults = (totalUsd) => {
  paymentForm.method = 'CASH'
  paymentForm.currency = 'USD'
  paymentForm.received_amount = Number(totalUsd.toFixed(2))
  paymentForm.change_currency = 'USD'
  paymentForm.bank_name = ''
  paymentForm.reference = ''
}

const openCheckoutModal = () => {
  if (cartItems.value.length === 0) return
  activeCheckoutOrder.value = null
  initPaymentDefaults(cartGrandTotal.value)
  showPaymentModal.value = true
}

const selectPaymentMethod = (method) => {
  paymentForm.method = method
  paymentForm.received_amount = requiredBillAmount.value
  if (method === 'KHQR' && !paymentForm.bank_name) {
    paymentForm.bank_name = 'ABA KHQR'
  }
}

const selectPaymentCurrency = (currency) => {
  paymentForm.currency = currency
  paymentForm.change_currency = currency
  paymentForm.received_amount =
    currency === 'USD' ? checkoutTotalUsd.value : checkoutTotalKhr.value
}

const closePaymentModal = () => {
  if (isProcessingPayment.value) return
  showPaymentModal.value = false
}

const handleConfirmPayment = async () => {
  if (!isCashSufficient.value) {
    toast.warning('Received cash amount is less than the order bill')
    return
  }

  isProcessingPayment.value = true
  try {
    // 1. If order isn't created/updated yet, save it first
    let orderRecord = activeCheckoutOrder.value
    if (!orderRecord) {
      orderRecord = await saveOrUpdateOrderRecord()
      editingOrder.value = orderRecord
    }

    // 2. Build payment payload
    const payPayload = {
      order_id: orderRecord.id,
      method: paymentForm.method,
      currency: paymentForm.currency,
    }

    if (paymentForm.method === 'CASH') {
      payPayload.received_amount = Number(effectiveReceivedAmount.value)
      payPayload.change_currency = paymentForm.change_currency
      payPayload.change_usd = calculatedChange.value.changeUsd
      payPayload.change_khr = calculatedChange.value.changeKhr
    } else {
      payPayload.received_amount = requiredBillAmount.value
      if (paymentForm.bank_name?.trim()) {
        payPayload.bank_name = paymentForm.bank_name.trim()
      }
      if (paymentForm.reference?.trim()) {
        payPayload.reference = paymentForm.reference.trim()
      }
    }

    const payRes = await api.post('/payments', payPayload)
    const paymentRecord = payRes.data?.data

    // Fetch fresh order details with items & payment
    const finalOrderRes = await api.get(`/orders/${orderRecord.id}`)
    const finalOrder = finalOrderRes.data?.data || orderRecord

    completedReceipt.value = {
      order: finalOrder,
      payment: paymentRecord,
    }

    showPaymentModal.value = false
    showReceiptModal.value = true
    toast.success(`Payment completed for ${finalOrder.receipt_no}`)

    resetCart()
    await Promise.all([fetchOpenOrders(), appStore.fetchCurrentShift()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Payment failed')
  } finally {
    isProcessingPayment.value = false
  }
}

// ================= METHODS: RESUME / PAY EXISTING OPEN ORDER =================
const loadOrderIntoCart = async (orderId) => {
  try {
    const res = await api.get(`/orders/${orderId}`)
    const ord = res.data?.data
    if (!ord) return

    if (ord.status !== 'OPEN') {
      toast.warning(`Order ${ord.receipt_no} is already ${ord.status}`)
      return
    }

    editingOrder.value = ord
    orderForm.order_type = ord.order_type || 'TAKEAWAY'
    orderForm.table_no = ord.table_no || ''
    orderForm.note = ord.note || ''
    orderForm.discount_type = ord.discount?.type || 'NONE'
    orderForm.discount_value = Number(ord.discount?.value) || 0
    orderForm.discount_reason = ord.discount?.reason || ''
    orderForm.discount_approved_by = ord.discount?.approved_by?.id || null

    cartItems.value = (ord.items || []).map((item) => {
      // Find matching product to determine product_type
      let foundProductId = null
      let foundProductType = 'DRINK'
      for (const p of products.value) {
        if (p.variants?.some((v) => v.id === item.variant_id)) {
          foundProductId = p.id
          foundProductType = p.product_type
          break
        }
      }

      return {
        cartKey: `${item.id}-${Math.random()}`,
        product_id: foundProductId,
        product_name: item.product_name,
        product_type: foundProductType,
        variant_id: item.variant_id,
        variant_name: item.variant_name,
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity),
        sugar_level: item.sugar_level,
        ice_level: item.ice_level,
        note: item.note || '',
        addons: (item.addons || []).map((a) => ({
          addon_variant_id: a.addon_variant_id,
          name: a.addon_name,
          unit_price: Number(a.unit_price),
          quantity: Number(a.quantity),
        })),
      }
    })

    showOpenOrdersModal.value = false
    toast.info(`Loaded Order #${ord.queue_no} (${ord.receipt_no})`)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load open order')
  }
}

const payExistingOpenOrder = async (orderId) => {
  try {
    const res = await api.get(`/orders/${orderId}`)
    const ord = res.data?.data
    if (!ord) return
    showOpenOrdersModal.value = false
    activeCheckoutOrder.value = ord
    initPaymentDefaults(Number(ord.total) || 0)
    showPaymentModal.value = true
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load order for payment')
  }
}

// ================= METHODS: PRINT RECEIPT =================
const printReceipt = () => {
  window.print()
}

const closeReceiptModal = () => {
  showReceiptModal.value = false
  completedReceipt.value = null
}

// ================= LIFECYCLE =================
onMounted(async () => {
  await Promise.all([fetchCatalog(), appStore.fetchCurrentShift()])
  await fetchOpenOrders()

  if (route.query.orderId) {
    await loadOrderIntoCart(Number(route.query.orderId))
  }
})
</script>

<style scoped>
.pos-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 92px);
  min-height: 580px;
}

/* Clean Shift Closed Banner */
.shift-closed-banner {
  background: var(--surface-container-lowest, #ffffff);
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 14px;
  padding: 0.85rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.shift-closed-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface-variant, #504440);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.btn-shift-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface-variant, #504440);
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.btn-shift-link:hover {
  color: var(--on-surface, #1c1b1b);
  background-color: var(--surface-container-low, #f6f3f2);
}

/* Main 2-Column Layout */
.pos-layout {
  display: grid;
  grid-template-columns: 1fr 390px;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

@media (max-width: 1100px) {
  .pos-page {
    height: auto;
  }
  .pos-layout {
    grid-template-columns: 1fr;
  }
}

/* Left Panel: Catalog */
.pos-catalog-panel {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.catalog-toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.85rem;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #8a7f78;
}

.search-input {
  padding-left: 36px;
  padding-right: 32px;
  border-radius: 11px;
  border: 1px solid #e6e4e0;
  background: #faf9f7;
  font-size: 0.88rem;
  height: 40px;
}

.search-input:focus {
  background: #ffffff;
  border-color: #2d5a43;
  box-shadow: none;
}

.btn-clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #8a7f78;
  font-size: 0.78rem;
}

/* Category Pills */
.category-strip {
  display: flex;
  gap: 0.45rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-bottom: 0.75rem;
  scrollbar-width: thin;
}

.cat-pill {
  border: 1px solid #e6e4e0;
  background: #faf9f7;
  color: #4f433d;
  border-radius: 999px;
  padding: 0.38rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.cat-pill:hover {
  border-color: #c5bcb4;
  background: #f3f0ec;
}

.cat-pill.active {
  background: #2d5a43;
  color: #ffffff;
  border-color: #2d5a43;
}

/* Product Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
  gap: 0.9rem;
  overflow-y: auto;
  padding: 0.15rem 0.25rem 0.5rem 0.05rem;
  align-content: start;
  flex: 1;
}

.product-card {
  border: 1px solid #ece9e4;
  border-radius: 16px;
  background: #ffffff;
  padding: 0.45rem;
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.product-card:hover {
  transform: translateY(-3px);
  border-color: rgba(45, 90, 67, 0.45);
  box-shadow: 0 10px 24px -6px rgba(45, 90, 67, 0.12), 0 4px 10px -4px rgba(15, 23, 42, 0.05);
}

.product-card:active {
  transform: translateY(-1px);
}

.product-card.in-cart {
  border-color: rgba(45, 90, 67, 0.5);
  background: #fcfdfc;
}

.product-thumb {
  height: 122px;
  border-radius: 12px;
  background: #f4f5f4;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.04);
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.product-card:hover .product-img {
  transform: scale(1.045);
}

.product-placeholder {
  font-size: 2rem;
  color: #8c6d58;
}

.in-cart-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #2d5a43;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.3);
}

.variant-count-pill {
  position: absolute;
  bottom: 7px;
  left: 7px;
  font-size: 0.68rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  color: #334155;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.product-body {
  padding: 0.55rem 0.35rem 0.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.product-cat {
  font-size: 0.69rem;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 0.12rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.product-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.price-usd {
  font-size: 0.96rem;
  font-weight: 800;
  color: #2d5a43;
  line-height: 1.1;
  letter-spacing: -0.01em;
  font-feature-settings: 'tnum' 1;
}

.product-add-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #edf5f0;
  color: #2d5a43;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.product-card:hover .product-add-btn {
  background: #2d5a43;
  color: #ffffff;
  box-shadow: 0 3px 8px rgba(45, 90, 67, 0.22);
}

.catalog-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1rem;
}

/* ================= RIGHT PANEL: CART ================= */
.pos-cart-panel {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.cart-header {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #eeeae4;
  background: #fcfbfa;
}

.cart-title {
  font-weight: 800;
  font-size: 0.98rem;
  color: #1c1917;
}

.badge-editing {
  font-size: 0.72rem;
  background: #d6ede0;
  color: #2d5a43;
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
  font-weight: 700;
}

.btn-reset-cart {
  border: none;
  background: transparent;
  color: #b91c1c;
  font-size: 0.78rem;
  font-weight: 600;
}

.order-type-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f2efeb;
  padding: 3px;
  border-radius: 10px;
}

.type-btn {
  border: none;
  background: transparent;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #574c45;
}

.type-btn.active {
  background: #ffffff;
  color: #2d5a43;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.table-input-wrap {
  width: 95px;
}

.table-input {
  border-radius: 9px;
  border: 1px solid #dcd6ce;
  font-weight: 600;
  text-align: center;
}

/* Cart Items Container */
.cart-items-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.9rem;
}

.cart-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.5rem 1rem;
}

.empty-cart-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #f7f4f0;
  color: #8c6d58;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  margin-bottom: 0.6rem;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.cart-item-card {
  border: 1px solid #ece8e2;
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  background: #faf9f7;
}

.cart-item-info {
  cursor: pointer;
  flex: 1;
}

.cart-item-name {
  font-weight: 700;
  font-size: 0.86rem;
  color: #1c1917;
}

.cart-variant-badge {
  font-size: 0.72rem;
  font-weight: 600;
  background: #ebe6df;
  color: #3f312b;
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  margin-left: 4px;
}

.cart-item-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.spec-chip {
  font-size: 0.68rem;
  background: #fff;
  border: 1px solid #e2ddd6;
  color: #574c45;
  padding: 0.08rem 0.4rem;
  border-radius: 5px;
}

.cart-item-addons {
  margin-top: 4px;
  font-size: 0.73rem;
  color: #574c45;
}

.cart-item-note {
  margin-top: 3px;
  font-size: 0.72rem;
  color: #8c5a32;
  font-style: italic;
}

.cart-item-total {
  font-weight: 800;
  font-size: 0.9rem;
  color: #2d5a43;
}

.cart-item-unit {
  font-size: 0.7rem;
}

.btn-edit-item {
  border: none;
  background: transparent;
  font-size: 0.74rem;
  color: #6b5b52;
  padding: 0;
  font-weight: 600;
}

.btn-edit-item:hover {
  color: #2d5a43;
}

/* Stepper */
.qty-stepper {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2ddd6;
  border-radius: 8px;
  overflow: hidden;
}

.qty-btn {
  border: none;
  background: transparent;
  width: 26px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
}

.qty-btn:hover {
  background: #f3f0ec;
}

.qty-val {
  min-width: 24px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
}

/* Cart Footer */
.cart-footer {
  padding: 0.85rem 1rem;
  border-top: 1px solid #eeeae4;
  background: #fcfbfa;
}

.btn-xs-action {
  border: 1px dashed #d5cfc7;
  background: #ffffff;
  color: #4f433d;
  border-radius: 9px;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.35rem 0.6rem;
}

.btn-xs-action.has-value {
  border-style: solid;
  border-color: #2d5a43;
  background: #fff7f0;
  color: #2d5a43;
}

.totals-box {
  background: #f6f3ef;
  border-radius: 12px;
  padding: 0.7rem 0.85rem;
  margin-bottom: 0.75rem;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #574c45;
  margin-bottom: 0.25rem;
}

.totals-divider {
  border-top: 1px dashed #d8d2c9;
  margin: 0.45rem 0;
}

.totals-grand {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grand-label {
  font-weight: 700;
  font-size: 0.86rem;
  color: #1c1917;
}

.grand-rate {
  font-size: 0.68rem;
  color: #78716c;
}

.grand-usd {
  font-size: 1.2rem;
  font-weight: 800;
  color: #2d5a43;
  line-height: 1.1;
}

.grand-khr {
  font-size: 0.78rem;
  font-weight: 700;
  color: #6b5b52;
}

.checkout-actions {
  display: grid;
  grid-template-columns: 125px 1fr;
  gap: 0.5rem;
}

.btn-hold-order {
  background: #f2efeb;
  color: #2d5a43;
  border: 1px solid #dfd9d0;
  border-radius: 11px;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.65rem 0.5rem;
}

.btn-pay-now {
  background: #2d5a43;
  color: #ffffff;
  border: none;
  border-radius: 11px;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.65rem 0.85rem;
}

.btn-pay-now:hover:not(:disabled) {
  background: #3f2419;
  color: #ffffff;
}

/* Buttons */
.btn-coffee {
  background: #2d5a43;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.84rem;
  padding: 0.5rem 0.95rem;
}

.btn-coffee:hover:not(:disabled) {
  background: #3f2419;
  color: #ffffff;
}

.btn-outline-coffee {
  background: #ffffff;
  color: #2d5a43;
  border: 1px solid #dfd9d0;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.82rem;
  padding: 0.45rem 0.85rem;
  white-space: nowrap;
}

.btn-light-coffee {
  background: #f4f1ed;
  color: #2d5a43;
  border: 1px solid #e6e1da;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.84rem;
  padding: 0.45rem 0.85rem;
}

.open-orders-badge {
  background: #d97706;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.1rem 0.42rem;
  border-radius: 999px;
  margin-left: 4px;
}

/* ================= MODALS ================= */
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
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
}

.modal-sm-custom {
  max-width: 420px;
}

.modal-lg-custom {
  max-width: 720px;
}

.modal-customize-card {
  max-width: 540px;
  border-radius: 20px;
  box-shadow: 0 25px 60px -12px rgba(28, 25, 23, 0.2), 0 0 1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e8e5e0;
}

.modal-header-custom {
  padding: 1.1rem 1.35rem;
  border-bottom: 1px solid #f1ede8;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.customize-prod-thumb {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: #f4f6f4;
  border: 1px solid #e2eae4;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  color: #2d5a43;
  flex-shrink: 0;
}

.customize-prod-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge-type-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.badge-type-pill.drink {
  background: #e0f2fe;
  color: #0369a1;
}

.badge-type-pill.food {
  background: #fef3c7;
  color: #92400e;
}

.badge-type-pill.addon {
  background: #f3e8ff;
  color: #6b21a8;
}

.modal-body-custom {
  padding: 1.2rem 1.35rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 1rem 1.35rem;
  border-top: 1px solid #f1ede8;
  background: #faf9f7;
  display: flex;
  gap: 0.65rem;
}

.btn-close-custom {
  border: none;
  background: #f4f1ed;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s ease;
}

.btn-close-custom:hover {
  background: #e8e3dc;
  color: #111827;
}

.form-label-clean {
  font-size: 0.78rem;
  font-weight: 700;
  color: #4f433d;
  margin-bottom: 0.4rem;
  display: block;
}

.section-label-modern {
  font-size: 0.76rem;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.45rem;
  display: block;
}

.form-control-clean {
  border-radius: 10px;
  border: 1px solid #dedad4;
  background: #faf9f7;
  font-size: 0.88rem;
}

.form-control-clean:focus {
  background: #ffffff;
  border-color: #2d5a43;
  box-shadow: none;
}

/* Variant Cards Modern */
.variant-grid-modern {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
  gap: 0.65rem;
}

.variant-card-modern {
  border: 1.5px solid #e5e7eb;
  background: #ffffff;
  border-radius: 13px;
  padding: 0.75rem 0.85rem;
  text-align: left;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  outline: none !important;
}

.variant-card-modern:hover:not(.active) {
  border-color: #cbd5e1;
  background: #fafafa;
  transform: translateY(-1px);
}

.variant-card-modern.active {
  border-color: #2d5a43;
  background: #f2f7f4;
  box-shadow: 0 4px 12px rgba(45, 90, 67, 0.08);
}

.variant-name {
  font-weight: 700;
  font-size: 0.88rem;
  color: #111827;
  line-height: 1.25;
}

.variant-radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  color: transparent;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.variant-card-modern.active .variant-radio-indicator {
  background: #2d5a43;
  border-color: #2d5a43;
  color: #ffffff;
}

.variant-specs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 0.3rem;
  margin-bottom: 0.45rem;
}

.spec-pill {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.spec-pill.hot {
  background: #fee2e2;
  color: #b91c1c;
}

.spec-pill.iced,
.spec-pill.frappe {
  background: #e0f2fe;
  color: #0369a1;
}

.spec-pill.size {
  background: #f3f4f6;
  color: #4b5563;
}

.variant-price-modern {
  font-weight: 700;
  font-size: 0.94rem;
  color: #2d5a43;
}

/* Option Pills Modern */
.option-pills-modern {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.opt-pill-modern {
  flex: 1 1 auto;
  min-width: 55px;
  border: 1.5px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  border-radius: 10px;
  padding: 0.48rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.18s ease;
  cursor: pointer;
  outline: none !important;
}

.opt-pill-modern:hover:not(.active) {
  border-color: #cbd5e1;
  background: #f9fafb;
  color: #111827;
}

.opt-pill-modern.active {
  background: #2d5a43;
  color: #ffffff;
  border-color: #2d5a43;
  box-shadow: 0 3px 8px rgba(45, 90, 67, 0.22);
}

/* Add-ons list modern */
.addons-grid-modern {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.5rem;
}

.addon-card-modern {
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  transition: all 0.15s ease;
}

.addon-card-modern.selected {
  border-color: #2d5a43;
  background: #f2f7f4;
}

.addon-price {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2d5a43;
}

/* Stepper Modern */
.qty-stepper-modern {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
  height: 42px;
  padding: 3px 4px;
}

.qty-btn-modern {
  border: none;
  background: #ffffff;
  color: #374151;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.15s ease;
  cursor: pointer;
}

.qty-btn-modern:hover:not(:disabled) {
  background: #2d5a43;
  color: #ffffff;
}

.qty-btn-modern:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.qty-val-modern {
  font-weight: 700;
  font-size: 1rem;
  color: #111827;
  min-width: 28px;
  text-align: center;
}

.note-input-wrap {
  position: relative;
}

.note-input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.85rem;
  pointer-events: none;
}

.note-input {
  height: 42px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  padding-left: 34px;
  font-size: 0.86rem;
}

.note-input:focus {
  background: #ffffff;
  border-color: #2d5a43;
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.btn-ghost-cancel {
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  font-size: 0.88rem;
  transition: all 0.15s ease;
}

.btn-ghost-cancel:hover {
  background: #e5e7eb;
  color: #111827;
}

.btn-add-order {
  background: #2d5a43;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  font-size: 0.92rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 14px rgba(45, 90, 67, 0.28);
  transition: all 0.18s ease;
}

.btn-add-order:hover {
  background: #234634;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(45, 90, 67, 0.32);
}

.footer-btn-divider {
  opacity: 0.45;
}

.footer-btn-price {
  font-weight: 700;
  letter-spacing: 0.2px;
}

/* Variant & Option Pills */
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
  gap: 0.5rem;
}

.variant-choice-btn {
  border: 1px solid #e2ddd6;
  background: #faf9f7;
  border-radius: 11px;
  padding: 0.6rem;
  text-align: left;
  transition: all 0.15s ease;
}

.variant-choice-btn.active {
  border-color: #2d5a43;
  background: #edf7f1;
  box-shadow: inset 0 0 0 1px #2d5a43;
}

.variant-price {
  font-weight: 800;
  color: #2d5a43;
  font-size: 0.86rem;
}

.option-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.opt-pill {
  border: 1px solid #e2ddd6;
  background: #faf9f7;
  color: #4f433d;
  border-radius: 9px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.opt-pill.active {
  background: #2d5a43;
  color: #ffffff;
  border-color: #2d5a43;
}

/* Add-ons list */
.addons-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.addon-row {
  border: 1px solid #e6e2dc;
  border-radius: 10px;
  padding: 0.45rem 0.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #faf9f7;
}

.addon-row.selected {
  border-color: #2d5a43;
  background: #fff7f0;
}

.qty-stepper-sm {
  display: flex;
  align-items: center;
  gap: 4px;
}

.qty-btn-sm {
  border: 1px solid #d8d2c9;
  background: #fff;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.qty-val-sm {
  font-size: 0.8rem;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.qty-stepper-lg {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #dedad4;
  border-radius: 10px;
  background: #faf9f7;
  height: 38px;
  padding: 0 4px;
}

.qty-btn-lg {
  border: none;
  background: #ffffff;
  width: 30px;
  height: 30px;
  border-radius: 7px;
}

.qty-val-lg {
  font-weight: 700;
  font-size: 0.92rem;
}

/* Payment Modal Styles */
.payment-total-banner {
  background: #2d5a43;
  color: #ffffff;
  border-radius: 14px;
  padding: 0.9rem 1.15rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.method-btn {
  border: 1px solid #e2ddd6;
  background: #faf9f7;
  border-radius: 12px;
  padding: 0.65rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #4f433d;
}

.method-btn.active {
  border-color: #2d5a43;
  background: #edf7f1;
  color: #2d5a43;
  box-shadow: inset 0 0 0 1px #2d5a43;
}

.quick-cash-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.quick-cash-btn {
  border: 1px solid #dcd6ce;
  background: #ffffff;
  border-radius: 8px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2d5a43;
}

.quick-cash-btn.active,
.quick-cash-btn:hover {
  background: #2d5a43;
  color: #ffffff;
}

.payment-summary-box {
  background: #faf9f7;
  border: 1px solid #e6e2dc;
  border-radius: 14px;
  padding: 1rem;
}

.change-callout {
  background: #eefbf3;
  border: 1px solid #bbf7d0;
  border-radius: 11px;
  padding: 0.75rem;
}

.change-callout.insufficient {
  background: #fef2f2;
  border-color: #fecaca;
}

.btn-pay-confirm {
  background: #15803d;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  padding: 0.6rem 1rem;
}

.btn-pay-confirm:hover:not(:disabled) {
  background: #166534;
  color: #ffffff;
}

/* Open Orders List */
.open-orders-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.open-order-row {
  border: 1px solid #e6e2dc;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #faf9f7;
}

/* Thermal Receipt */
.thermal-receipt {
  background: #fffef9;
  border: 1px dashed #c8c2b8;
  border-radius: 10px;
  padding: 1rem;
  font-family: 'Kantumruy Pro', 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  color: #1c1917;
}

.receipt-logo {
  max-height: 44px;
  object-fit: contain;
}

.receipt-sub {
  font-size: 0.74rem;
  color: #57534e;
}

.receipt-divider {
  border-top: 1px dashed #a8a29e;
  margin: 0.55rem 0;
}

.receipt-meta {
  font-size: 0.75rem;
  margin-bottom: 2px;
}

.receipt-item {
  margin-bottom: 0.4rem;
}

.receipt-item-sub {
  font-size: 0.72rem;
  color: #57534e;
  padding-left: 0.75rem;
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

@media print {
  body * {
    visibility: hidden;
  }
  #printable-receipt,
  #printable-receipt * {
    visibility: visible;
  }
  #printable-receipt {
    position: fixed;
    left: 0;
    top: 0;
    width: 80mm;
    border: none;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
}
</style>
