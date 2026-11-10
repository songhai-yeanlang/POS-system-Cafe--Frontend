<template>
  <div class="pos-shell">
    <!-- ================= SHIFT CLOSED BAR ================= -->
    <div v-if="!appStore.hasOpenShift && !appStore.isLoadingShift" class="shift-notice">
      <div class="shift-notice__body">
        <span class="shift-notice__indicator" aria-hidden="true">
          <i class="bi bi-safe2"></i>
        </span>
        <div class="shift-notice__copy">
          <strong class="shift-notice__title">{{ $t('pos.noActiveShift') }}</strong>
          <span class="shift-notice__desc">{{ $t('pos.noActiveShiftDesc') }}</span>
        </div>
      </div>

      <div class="shift-notice__actions">
        <router-link
          to="/shifts"
          class="shift-notice__link"
          :title="$t('pos.shiftsAndDrawer')"
        >
          <span>{{ $t('pos.shiftsAndDrawer') }}</span>
        </router-link>
        <button
          type="button"
          class="pos-btn pos-btn--primary pos-btn--compact"
          @click="openQuickShiftModal"
        >
          <i class="bi bi-unlock"></i>
          <span>{{ $t('pos.openShift') }}</span>
        </button>
      </div>
    </div>

    <!-- ================= MAIN BARISTA COUNTER WORKSPACE ================= -->
    <div class="counter-stage">
      <!-- LEFT ZONE: OPEN COUNTER MENU BOARD -->
      <section class="menu-board" aria-label="Beverage and food catalog">
        <header class="menu-board__header">
          <div class="menu-board__controls">
            <div class="search-well">
              <i class="bi bi-search search-well__icon" aria-hidden="true"></i>
              <input
                v-model="searchQuery"
                type="text"
                class="search-well__input"
                :placeholder="$t('pos.searchPlaceholder')"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="search-well__clear"
                :aria-label="$t('common.clear')"
                @click="searchQuery = ''"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="menu-board__actions">
              <button
                type="button"
                class="queue-trigger"
                :class="{ 'has-open': openOrdersCount > 0 }"
                @click="openPendingOrdersModal"
              >
                <i class="bi bi-receipt-cutoff"></i>
                <span>{{ $t('pos.openOrders') }}</span>
                <span v-if="openOrdersCount > 0" class="queue-trigger__count tabular">
                  {{ openOrdersCount }}
                </span>
              </button>

              <button
                type="button"
                class="icon-trigger"
                :title="$t('pos.refreshMenu')"
                :aria-label="$t('pos.refreshMenu')"
                :disabled="isLoadingCatalog"
                @click="refreshAllData"
              >
                <i class="bi bi-arrow-clockwise" :class="{ 'is-spinning': isLoadingCatalog }"></i>
              </button>
            </div>
          </div>

          <!-- Category Rail -->
          <nav class="category-rail" aria-label="Menu categories">
            <button
              type="button"
              class="category-rail__tab"
              :class="{ 'is-active': selectedCategoryId === 'ALL' }"
              @click="selectedCategoryId = 'ALL'"
            >
              <span>{{ $t('pos.allItems') }}</span>
              <span class="category-rail__count tabular">{{ totalCatalogCount }}</span>
            </button>

            <button
              v-for="cat in activeCategories"
              :key="cat.id"
              type="button"
              class="category-rail__tab"
              :class="{ 'is-active': selectedCategoryId === cat.id }"
              @click="selectedCategoryId = cat.id"
            >
              <span>{{ $tCategory(cat.name) }}</span>
              <span class="category-rail__count tabular">{{ getCategoryItemCount(cat.id) }}</span>
            </button>
          </nav>
        </header>

        <!-- Menu Catalog States -->
        <div v-if="isLoadingCatalog" class="board-state">
          <div class="spinner-border spinner-border-sm text-secondary mb-2" role="status"></div>
          <p class="board-state__desc">{{ $t('pos.loadingMenu') }}</p>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="board-state">
          <div class="board-state__glyph" aria-hidden="true">
            <i class="bi bi-cup-hot"></i>
          </div>
          <h3 class="board-state__title">{{ $t('pos.noProductsFound') }}</h3>
          <p class="board-state__desc">{{ $t('pos.noProductsFoundDesc') }}</p>
          <button
            v-if="searchQuery || selectedCategoryId !== 'ALL'"
            type="button"
            class="pos-btn pos-btn--ghost pos-btn--compact mt-2"
            @click="searchQuery = ''; selectedCategoryId = 'ALL'"
          >
            {{ $t('common.reset') }}
          </button>
        </div>

        <!-- Beverage & Pastry Index Grid -->
        <div v-else class="menu-grid">
          <article
            v-for="product in filteredProducts"
            :key="product.id"
            class="menu-item"
            :class="{ 'in-docket': getProductCartQty(product.id) > 0 }"
            tabindex="0"
            role="button"
            @click="handleProductClick(product)"
            @keydown.enter.prevent="handleProductClick(product)"
            @keydown.space.prevent="handleProductClick(product)"
          >
            <div class="menu-item__visual">
              <img
                v-if="product.image"
                :src="getAssetUrl(product.image)"
                :alt="product.name"
                class="menu-item__img"
                loading="lazy"
              />
              <div v-else class="menu-item__fallback" aria-hidden="true">
                <i
                  class="bi"
                  :class="product.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot'"
                ></i>
              </div>

              <!-- Top Image Overlay: Category Pill -->
              <div v-if="product.category_name" class="menu-item__overlay-top">
                <span class="menu-item__category">
                  {{ $tCategory(product.category_name) }}
                </span>
              </div>

              <span
                v-if="getProductCartQty(product.id) > 0"
                class="menu-item__qty tabular"
              >
                {{ getProductCartQty(product.id) }}
              </span>
            </div>

            <div class="menu-item__body">
              <h3 class="menu-item__title" :title="product.name">{{ product.name }}</h3>

              <div class="menu-item__pricing">
                <div class="menu-item__price-group">
                  <span class="menu-item__usd tabular">{{ getPriceDisplay(product) }}</span>
                  <span class="menu-item__khr tabular">
                    {{ formatKhr(usdToKhr(getStartingPrice(product))) }}
                  </span>
                </div>
                <span class="menu-item__action" aria-hidden="true">
                  <i class="bi bi-plus-lg"></i>
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- RIGHT ZONE: BARISTA ORDER DOCKET & REGISTER SLIP -->
      <aside class="barista-docket" aria-label="Current order docket">
        <!-- Docket Top Header -->
        <header class="docket-head">
          <div class="docket-head__top">
            <div class="docket-head__identity">
              <h2 class="docket-head__title">
                {{
                  editingOrder
                    ? $t('pos.orderQueueTitle', { no: editingOrder.queue_no })
                    : $t('pos.currentOrder')
                }}
              </h2>
              <span v-if="editingOrder" class="docket-head__receipt tabular">
                {{ editingOrder.receipt_no }}
              </span>
            </div>

            <button
              v-if="cartItems.length > 0 || editingOrder"
              type="button"
              class="docket-head__clear"
              @click="resetCart"
            >
              <i class="bi bi-trash3"></i>
              <span>{{ $t('common.clear') }}</span>
            </button>
          </div>

          <!-- Dining Mode & Table Assignment -->
          <div class="docket-head__routing">
            <div class="service-switch" role="group" aria-label="Order service mode">
              <button
                type="button"
                class="service-switch__option"
                :class="{ 'is-selected': orderForm.order_type === 'TAKEAWAY' }"
                @click="setOrderType('TAKEAWAY')"
              >
                <i class="bi bi-bag-check"></i>
                <span>{{ $t('common.takeaway') }}</span>
              </button>
              <button
                type="button"
                class="service-switch__option"
                :class="{ 'is-selected': orderForm.order_type === 'DINE_IN' }"
                @click="setOrderType('DINE_IN')"
              >
                <i class="bi bi-shop"></i>
                <span>{{ $t('common.dineIn') }}</span>
              </button>
            </div>

            <div v-if="orderForm.order_type === 'DINE_IN'" class="table-slot">
              <input
                v-model="orderForm.table_no"
                type="text"
                class="table-slot__input tabular"
                :placeholder="$t('pos.tablePlaceholder')"
                maxlength="20"
              />
            </div>
          </div>
        </header>

        <!-- Docket Line Items -->
        <div class="docket-stream">
          <div v-if="cartItems.length === 0" class="docket-empty">
            <div class="docket-empty__icon" aria-hidden="true">
              <i class="bi bi-journal-plus"></i>
            </div>
            <p class="docket-empty__title">{{ $t('pos.cartEmpty') }}</p>
            <p class="docket-empty__desc">{{ $t('pos.cartEmptyDesc') }}</p>
          </div>

          <ul v-else class="docket-list">
            <li
              v-for="(item, index) in cartItems"
              :key="item.cartKey"
              class="docket-row"
            >
              <div class="docket-row__main">
                <div
                  class="docket-row__info"
                  role="button"
                  tabindex="0"
                  @click="openEditCartItem(item, index)"
                  @keydown.enter.prevent="openEditCartItem(item, index)"
                >
                  <div class="docket-row__headline">
                    <span class="docket-row__name">{{ item.product_name }}</span>
                    <span class="docket-row__variant">{{ item.variant_name }}</span>
                  </div>

                  <!-- Drink Customizations (Sugar / Ice) -->
                  <div
                    v-if="
                      item.product_type === 'DRINK' &&
                      (item.sugar_level !== null || item.ice_level)
                    "
                    class="docket-row__specs"
                  >
                    <span v-if="item.sugar_level !== null" class="docket-spec tabular">
                      {{ $t('pos.sugarPct', { pct: item.sugar_level }) }}
                    </span>
                    <span v-if="item.ice_level" class="docket-spec">
                      {{ $t('pos.iceLabel', { ice: formatIceLabel(item.ice_level) }) }}
                    </span>
                  </div>

                  <!-- Add-ons -->
                  <div v-if="item.addons && item.addons.length > 0" class="docket-row__addons">
                    <div
                      v-for="addon in item.addons"
                      :key="addon.addon_variant_id"
                      class="docket-addon tabular"
                    >
                      <span>+ {{ addon.quantity }}× {{ addon.name }}</span>
                      <span>{{ formatUsd(addon.unit_price * addon.quantity) }}</span>
                    </div>
                  </div>

                  <!-- Item Kitchen Note -->
                  <div v-if="item.note" class="docket-row__note">
                    <i class="bi bi-chat-left-text"></i>
                    <span>{{ item.note }}</span>
                  </div>
                </div>

                <div class="docket-row__figures">
                  <div class="docket-row__line-total tabular">
                    {{ formatUsd(calculateCartItemTotal(item)) }}
                  </div>
                  <div class="docket-row__unit-price tabular">
                    {{ formatUsd(item.unit_price) }} {{ $t('pos.each') }}
                  </div>
                </div>
              </div>

              <div class="docket-row__bar">
                <button
                  type="button"
                  class="docket-row__edit"
                  @click="openEditCartItem(item, index)"
                >
                  <i class="bi bi-sliders"></i>
                  <span>{{ $t('pos.customize') }}</span>
                </button>

                <div class="docket-stepper">
                  <button
                    type="button"
                    class="docket-stepper__btn"
                    :class="{ 'is-danger': item.quantity === 1 }"
                    @click="changeCartItemQty(index, -1)"
                  >
                    <i class="bi" :class="item.quantity === 1 ? 'bi-trash3' : 'bi-dash'"></i>
                  </button>
                  <span class="docket-stepper__qty tabular">{{ item.quantity }}</span>
                  <button
                    type="button"
                    class="docket-stepper__btn"
                    @click="changeCartItemQty(index, 1)"
                  >
                    <i class="bi bi-plus"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Docket Footer: Order Adjustments & Dark Register Readout -->
        <footer class="docket-foot">
          <div class="docket-adjustments">
            <button
              type="button"
              class="adjustment-chip"
              :class="{
                'is-engaged': orderForm.discount_type !== 'NONE' && orderForm.discount_value > 0,
              }"
              @click="showDiscountModal = true"
            >
              <i class="bi bi-tag"></i>
              <span v-if="orderForm.discount_type === 'NONE' || !orderForm.discount_value">
                {{ $t('pos.addDiscount') }}
              </span>
              <span v-else class="tabular">
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
              class="adjustment-chip"
              :class="{ 'is-engaged': !!orderForm.note }"
              @click="showNoteModal = true"
            >
              <i class="bi bi-journal-text"></i>
              <span>{{ orderForm.note ? $t('pos.noteAdded') : $t('pos.orderNote') }}</span>
            </button>
          </div>

          <!-- Focal Point: Dark Espresso Register Display & Checkout -->
          <div class="register-block">
            <div class="register-block__Breakdown">
              <div class="register-line">
                <span>{{ $t('pos.subtotalItems', { count: totalCartUnits }) }}</span>
                <span class="tabular">{{ formatUsd(cartSubtotal) }}</span>
              </div>

              <div v-if="cartDiscountAmount > 0" class="register-line is-discount">
                <span>
                  {{ $t('common.discount') }}
                  <template v-if="orderForm.discount_type === 'PERCENT'">
                    ({{ orderForm.discount_value }}%)
                  </template>
                </span>
                <span class="tabular">-{{ formatUsd(cartDiscountAmount) }}</span>
              </div>
            </div>

            <div class="register-block__payable">
              <div class="register-block__label-col">
                <span class="register-block__label">{{ $t('pos.totalPayable') }}</span>
                <span class="register-block__rate tabular">
                  {{ $t('pos.rateLabel', { rate: exchangeRate.toLocaleString() }) }}
                </span>
              </div>

              <div class="register-block__amount-col">
                <div class="register-block__usd tabular">{{ formatUsd(cartGrandTotal) }}</div>
                <div class="register-block__khr tabular">
                  {{ formatKhr(usdToKhr(cartGrandTotal)) }}
                </div>
              </div>
            </div>

            <div class="register-block__actions">
              <button
                type="button"
                class="register-btn register-btn--hold"
                :disabled="cartItems.length === 0 || isSubmittingOrder || !appStore.hasOpenShift"
                @click="handleSaveOpenOrder"
              >
                <span
                  v-if="isSubmittingOrder && !showPaymentModal"
                  class="spinner-border spinner-border-sm"
                ></span>
                <i v-else class="bi bi-bookmark-check"></i>
                <span>{{ editingOrder ? $t('pos.updateOpen') : $t('pos.holdOrder') }}</span>
              </button>

              <button
                type="button"
                class="register-btn register-btn--settle tabular"
                :disabled="cartItems.length === 0 || isSubmittingOrder || !appStore.hasOpenShift"
                @click="openCheckoutModal"
              >
                <span class="register-btn__settle-label">
                  <i class="bi bi-cash-coin"></i>
                  <span>{{ $t('pos.pay') }}</span>
                </span>
                <span class="register-btn__settle-amount">{{ formatUsd(cartGrandTotal) }}</span>
              </button>
            </div>
          </div>
        </footer>
      </aside>
    </div>

    <!-- ================= MODAL 1: ITEM CUSTOMIZATION ================= -->
    <div
      v-if="showCustomizeModal && customizingProduct"
      class="pos-dialog-backdrop"
      @click.self="closeCustomizeModal"
    >
      <div class="pos-dialog pos-dialog--customize" role="dialog" aria-modal="true">
        <header class="pos-dialog__head">
          <div class="customizer-product">
            <div class="customizer-product__thumb">
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
              <div class="customizer-product__title-row">
                <h3 class="pos-dialog__title">{{ customizingProduct.name }}</h3>
              </div>
              <div class="pos-dialog__subtitle">
                {{ $tCategory(customizingProduct.category_name) }}
              </div>
            </div>
          </div>
          <button type="button" class="pos-dialog__close" @click="closeCustomizeModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="pos-dialog__body">
          <!-- Size / Temperature Variant Selection -->
          <section class="field-group">
            <div class="field-group__head">
              <label class="field-group__label">{{ $t('pos.chooseSizeVariant') }}</label>
              <span class="field-group__meta tabular">
                {{ $t('pos.availableCount', { count: getActiveVariants(customizingProduct).length }) }}
              </span>
            </div>

            <div class="variant-selector">
              <button
                v-for="v in getActiveVariants(customizingProduct)"
                :key="v.id"
                type="button"
                class="variant-option"
                :class="{ 'is-selected': customForm.variant_id === v.id }"
                @click="selectVariantInModal(v)"
              >
                <div class="variant-option__top">
                  <span class="variant-option__name">{{ getVariantSizeLabel(v) }}</span>
                  <span class="variant-option__check" aria-hidden="true">
                    <i class="bi bi-check2"></i>
                  </span>
                </div>
                <div class="variant-option__price tabular">{{ formatUsd(v.price) }}</div>
              </button>
            </div>
          </section>

          <!-- Drink Calibration: Sweetness & Ice -->
          <template v-if="customizingProduct.product_type === 'DRINK'">
            <section class="field-group">
              <div class="sugar-header">
                <label class="field-group__label mb-0">{{ $t('pos.sugarLevelTitle') }}</label>
                <div class="sugar-stepper-pill">
                  <button
                    type="button"
                    class="sugar-stepper-btn"
                    :disabled="(customForm.sugar_level ?? 0) <= 0"
                    title="-5%"
                    aria-label="Decrease sweetness"
                    @click="stepSugar(-5)"
                  >
                    <i class="bi bi-dash"></i>
                  </button>
                  <div class="sugar-stepper-value">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      class="sugar-stepper-input tabular"
                      :value="customForm.sugar_level ?? 0"
                      @input="onSugarInputChange"
                      @blur="normalizeSugar"
                    />
                    <span class="sugar-stepper-unit">%</span>
                  </div>
                  <button
                    type="button"
                    class="sugar-stepper-btn"
                    :disabled="(customForm.sugar_level ?? 0) >= 100"
                    title="+5%"
                    aria-label="Increase sweetness"
                    @click="stepSugar(5)"
                  >
                    <i class="bi bi-plus"></i>
                  </button>
                </div>
              </div>

              <div class="sugar-slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  class="sugar-range-slider"
                  :value="customForm.sugar_level ?? 0"
                  :style="{ '--sugar-pct': `${customForm.sugar_level ?? 0}%` }"
                  @input="onSugarSliderChange"
                />
                <div class="sugar-ticks">
                  <button
                    type="button"
                    class="sugar-tick-btn tabular"
                    :class="{ 'is-active': (customForm.sugar_level ?? 0) === 0 }"
                    @click="setSugarLevel(0)"
                  >
                    0%
                  </button>
                  <button
                    type="button"
                    class="sugar-tick-btn tabular"
                    :class="{ 'is-active': (customForm.sugar_level ?? 0) === 25 }"
                    @click="setSugarLevel(25)"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    class="sugar-tick-btn tabular"
                    :class="{ 'is-active': (customForm.sugar_level ?? 0) === 50 }"
                    @click="setSugarLevel(50)"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    class="sugar-tick-btn tabular"
                    :class="{ 'is-active': (customForm.sugar_level ?? 0) === 75 }"
                    @click="setSugarLevel(75)"
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    class="sugar-tick-btn tabular"
                    :class="{ 'is-active': (customForm.sugar_level ?? 0) === 100 }"
                    @click="setSugarLevel(100)"
                  >
                    100%
                  </button>
                </div>
              </div>
            </section>

            <section class="field-group">
              <label class="field-group__label">{{ $t('pos.iceLevelTitle') }}</label>
              <div class="calibration-strip calibration-strip--ice">
                <button
                  v-for="ice in iceOptions"
                  :key="ice.value"
                  type="button"
                  class="calibration-pill"
                  :class="{ 'is-selected': customForm.ice_level === ice.value }"
                  @click="customForm.ice_level = ice.value"
                >
                  {{ ice.label }}
                </button>
              </div>
            </section>

            <!-- Extra Add-ons -->
            <section v-if="availableAddons.length > 0" class="field-group">
              <label class="field-group__label">{{ $t('pos.extraAddons') }}</label>
              <div class="addon-selector">
                <div
                  v-for="addon in availableAddons"
                  :key="addon.variant_id"
                  class="addon-item"
                  :class="{ 'is-selected': getAddonQty(addon.variant_id) > 0 }"
                >
                  <div class="addon-item__meta">
                    <span class="addon-item__name">{{ addon.display_name }}</span>
                    <span class="addon-item__price tabular">+{{ formatUsd(addon.price) }}</span>
                  </div>

                  <div class="addon-item__stepper">
                    <button
                      v-if="getAddonQty(addon.variant_id) > 0"
                      type="button"
                      class="addon-item__btn"
                      @click="changeAddonQty(addon, -1)"
                    >
                      <i class="bi bi-dash"></i>
                    </button>
                    <span v-if="getAddonQty(addon.variant_id) > 0" class="addon-item__qty tabular">
                      {{ getAddonQty(addon.variant_id) }}
                    </span>
                    <button
                      type="button"
                      class="addon-item__btn"
                      @click="changeAddonQty(addon, 1)"
                    >
                      <i class="bi bi-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <!-- Quantity & Barista Note -->
          <div class="customizer-bottom-row">
            <div class="customizer-qty-col">
              <label class="field-group__label">{{ $t('pos.quantity') }}</label>
              <div class="qty-control">
                <button
                  type="button"
                  class="qty-control__btn"
                  :disabled="customForm.quantity <= 1"
                  @click="customForm.quantity = Math.max(1, customForm.quantity - 1)"
                >
                  <i class="bi bi-dash-lg"></i>
                </button>
                <span class="qty-control__val tabular">{{ customForm.quantity }}</span>
                <button
                  type="button"
                  class="qty-control__btn"
                  @click="customForm.quantity++"
                >
                  <i class="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>

            <div class="customizer-note-col">
              <label class="field-group__label">{{ $t('pos.specialInstruction') }}</label>
              <div class="input-with-icon">
                <i class="bi bi-pencil input-with-icon__glyph"></i>
                <input
                  v-model="customForm.note"
                  type="text"
                  class="pos-input pos-input--padded"
                  :placeholder="$t('pos.specialInstructionPlaceholder')"
                  maxlength="200"
                />
              </div>
            </div>
          </div>
        </div>

        <footer class="pos-dialog__foot">
          <button type="button" class="pos-btn pos-btn--ghost" @click="closeCustomizeModal">
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="pos-btn pos-btn--primary pos-btn--split flex-grow-1"
            @click="confirmCustomizedItem"
          >
            <span class="d-inline-flex align-items-center gap-2">
              <i class="bi bi-plus-circle"></i>
              <span>
                {{ editingCartIndex !== null ? $t('pos.updateItem') : $t('pos.addToOrder') }}
              </span>
            </span>
            <span class="tabular">{{ formatUsd(customizedPreviewTotal) }}</span>
          </button>
        </footer>
      </div>
    </div>

    <!-- ================= MODAL 2: DISCOUNT ================= -->
    <div
      v-if="showDiscountModal"
      class="pos-dialog-backdrop"
      @click.self="showDiscountModal = false"
    >
      <div class="pos-dialog pos-dialog--narrow" role="dialog" aria-modal="true">
        <header class="pos-dialog__head">
          <h3 class="pos-dialog__title">{{ $t('pos.orderDiscountTitle') }}</h3>
          <button type="button" class="pos-dialog__close" @click="showDiscountModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="pos-dialog__body">
          <section class="field-group">
            <label class="field-group__label">{{ $t('pos.discountType') }}</label>
            <div class="calibration-strip">
              <button
                type="button"
                class="calibration-pill flex-grow-1"
                :class="{ 'is-selected': discountDraft.type === 'NONE' }"
                @click="discountDraft.type = 'NONE'"
              >
                {{ $t('pos.none') }}
              </button>
              <button
                type="button"
                class="calibration-pill flex-grow-1"
                :class="{ 'is-selected': discountDraft.type === 'PERCENT' }"
                @click="discountDraft.type = 'PERCENT'"
              >
                {{ $t('pos.percent') }}
              </button>
              <button
                type="button"
                class="calibration-pill flex-grow-1"
                :class="{ 'is-selected': discountDraft.type === 'FIXED' }"
                @click="discountDraft.type = 'FIXED'"
              >
                {{ $t('pos.fixed') }}
              </button>
            </div>
          </section>

          <template v-if="discountDraft.type !== 'NONE'">
            <section class="field-group">
              <label class="field-group__label">
                {{
                  discountDraft.type === 'PERCENT'
                    ? $t('pos.percentageRange')
                    : $t('pos.amountInUsd')
                }}
              </label>
              <input
                v-model.number="discountDraft.value"
                type="number"
                step="0.01"
                min="0"
                :max="discountDraft.type === 'PERCENT' ? 100 : cartSubtotal"
                class="pos-input tabular"
                placeholder="0.00"
              />
            </section>

            <section class="field-group">
              <label class="field-group__label">
                {{ $t('pos.discountReason') }} <span class="text-danger">*</span>
              </label>
              <input
                v-model="discountDraft.reason"
                type="text"
                class="pos-input"
                :placeholder="$t('pos.discountReasonPlaceholder')"
                maxlength="255"
              />
            </section>

            <section v-if="!authStore.isOwner" class="field-group mb-0">
              <label class="field-group__label">
                {{ $t('pos.approvedByOwnerId') }} <span class="text-danger">*</span>
              </label>
              <input
                v-model.number="discountDraft.approved_by"
                type="number"
                min="1"
                class="pos-input tabular"
                placeholder="1"
              />
              <p class="field-group__hint">{{ $t('pos.discountOwnerHint') }}</p>
            </section>
          </template>
        </div>

        <footer class="pos-dialog__foot">
          <button type="button" class="pos-btn pos-btn--ghost" @click="clearDiscount">
            {{ $t('common.remove') }}
          </button>
          <button
            type="button"
            class="pos-btn pos-btn--primary flex-grow-1 justify-content-center"
            @click="applyDiscountDraft"
          >
            {{ $t('pos.applyDiscount') }}
          </button>
        </footer>
      </div>
    </div>

    <!-- ================= MODAL 3: ORDER NOTE ================= -->
    <div v-if="showNoteModal" class="pos-dialog-backdrop" @click.self="showNoteModal = false">
      <div class="pos-dialog pos-dialog--narrow" role="dialog" aria-modal="true">
        <header class="pos-dialog__head">
          <h3 class="pos-dialog__title">{{ $t('pos.orderNote') }}</h3>
          <button type="button" class="pos-dialog__close" @click="showNoteModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="pos-dialog__body">
          <label class="field-group__label">{{ $t('pos.generalNoteLabel') }}</label>
          <textarea
            v-model="orderForm.note"
            rows="3"
            class="pos-input pos-input--textarea"
            :placeholder="$t('pos.orderNotePlaceholder')"
            maxlength="500"
          ></textarea>
        </div>

        <footer class="pos-dialog__foot">
          <button
            type="button"
            class="pos-btn pos-btn--ghost"
            @click="orderForm.note = ''; showNoteModal = false"
          >
            {{ $t('common.clear') }}
          </button>
          <button
            type="button"
            class="pos-btn pos-btn--primary flex-grow-1 justify-content-center"
            @click="showNoteModal = false"
          >
            {{ $t('pos.saveNote') }}
          </button>
        </footer>
      </div>
    </div>

    <!-- ================= MODAL 4: PAYMENT / CHECKOUT ================= -->
    <div v-if="showPaymentModal" class="pos-dialog-backdrop" @click.self="closePaymentModal">
      <div class="pos-dialog pos-dialog--checkout" role="dialog" aria-modal="true">
        <header class="pos-dialog__head">
          <div>
            <h3 class="pos-dialog__title">{{ $t('pos.completePayment') }}</h3>
            <div class="pos-dialog__subtitle tabular">
              {{
                activeCheckoutOrder
                  ? `${activeCheckoutOrder.receipt_no} (#${activeCheckoutOrder.queue_no})`
                  : $t('pos.newOrderCheckout')
              }}
            </div>
          </div>
          <button
            type="button"
            class="pos-dialog__close"
            :disabled="isProcessingPayment"
            @click="closePaymentModal"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="pos-dialog__body">
          <!-- Dual-Currency Payable Display -->
          <div class="checkout-display">
            <div class="checkout-display__col">
              <span class="checkout-display__caption">{{ $t('pos.totalDue') }}</span>
              <strong class="checkout-display__usd tabular">{{ formatUsd(checkoutTotalUsd) }}</strong>
            </div>
            <div class="checkout-display__divider"></div>
            <div class="checkout-display__col is-right">
              <span class="checkout-display__caption tabular">
                {{ $t('pos.inKhmerRiel', { rate: exchangeRate.toLocaleString() }) }}
              </span>
              <strong class="checkout-display__khr tabular">{{ formatKhr(checkoutTotalKhr) }}</strong>
            </div>
          </div>

          <!-- Payment Channel -->
          <section class="field-group">
            <label class="field-group__label">{{ $t('pos.method') }}</label>
            <div class="channel-grid">
              <button
                type="button"
                class="channel-card"
                :class="{ 'is-selected': paymentForm.method === 'CASH' }"
                @click="selectPaymentMethod('CASH')"
              >
                <span class="channel-card__icon">
                  <i class="bi bi-cash-stack"></i>
                </span>
                <span class="channel-card__label">{{ $t('common.cash') }}</span>
                <span class="channel-card__check">
                  <i class="bi bi-check2"></i>
                </span>
              </button>
              <button
                type="button"
                class="channel-card"
                :class="{ 'is-selected': paymentForm.method === 'KHQR' }"
                @click="selectPaymentMethod('KHQR')"
              >
                <span class="channel-card__icon">
                  <i class="bi bi-qr-code-scan"></i>
                </span>
                <span class="channel-card__label">{{ $t('common.khqr') }}</span>
                <span class="channel-card__check">
                  <i class="bi bi-check2"></i>
                </span>
              </button>
            </div>
          </section>

          <!-- Settlement Currency -->
          <section class="field-group">
            <label class="field-group__label">{{ $t('expenses.currencyLabel') }}</label>
            <div class="currency-switch">
              <button
                type="button"
                class="currency-switch__option tabular"
                :class="{ 'is-selected': paymentForm.currency === 'USD' }"
                @click="selectPaymentCurrency('USD')"
              >
                <span class="currency-switch__code">USD ($)</span>
                <strong class="currency-switch__val">{{ formatUsd(checkoutTotalUsd) }}</strong>
              </button>
              <button
                type="button"
                class="currency-switch__option tabular"
                :class="{ 'is-selected': paymentForm.currency === 'KHR' }"
                @click="selectPaymentCurrency('KHR')"
              >
                <span class="currency-switch__code">KHR (៛)</span>
                <strong class="currency-switch__val">{{ formatKhr(checkoutTotalKhr) }}</strong>
              </button>
            </div>
          </section>

          <!-- Cash Tender Display -->
          <template v-if="paymentForm.method === 'CASH'">
            <div class="cash-tender-summary">
              <div class="cash-tender-summary__label">
                <i class="bi bi-wallet2"></i>
                <span>{{ $t('pos.received') }} ({{ paymentForm.currency }})</span>
              </div>
              <strong class="cash-tender-summary__amount tabular">
                {{
                  paymentForm.currency === 'USD'
                    ? formatUsd(paymentForm.received_amount)
                    : formatKhr(paymentForm.received_amount)
                }}
              </strong>
            </div>
          </template>

          <!-- KHQR Bank / Wallet Details -->
          <template v-else>
            <section class="field-group">
              <label class="field-group__label">{{ $t('pos.bankWalletName') }}</label>
              <div class="bank-strip">
                <button
                  v-for="b in ['ABA KHQR', 'ACLEDA', 'Wing', 'Bakong', 'Canadia']"
                  :key="b"
                  type="button"
                  class="bank-chip"
                  :class="{ 'is-selected': paymentForm.bank_name === b }"
                  @click="paymentForm.bank_name = b"
                >
                  {{ b }}
                </button>
              </div>
            </section>

            <section class="field-group mb-0">
              <label class="field-group__label">{{ $t('pos.transactionRef') }}</label>
              <div class="input-with-icon">
                <i class="bi bi-hash input-with-icon__glyph"></i>
                <input
                  v-model="paymentForm.reference"
                  type="text"
                  class="pos-input pos-input--padded"
                  :placeholder="$t('pos.transactionRefPlaceholder')"
                  maxlength="150"
                />
              </div>
              <div class="checkout-verify-hint">
                <i class="bi bi-shield-check"></i>
                <span>
                  {{
                    $t('pos.verifyTransferHint', {
                      amount:
                        paymentForm.currency === 'USD'
                          ? formatUsd(checkoutTotalUsd)
                          : formatKhr(checkoutTotalKhr),
                    })
                  }}
                </span>
              </div>
            </section>
          </template>
        </div>

        <footer class="pos-dialog__foot">
          <button
            type="button"
            class="pos-btn pos-btn--ghost"
            :disabled="isProcessingPayment"
            @click="closePaymentModal"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="pos-btn pos-btn--primary pos-btn--split flex-grow-1 tabular"
            :disabled="isProcessingPayment || !isCashSufficient"
            @click="handleConfirmPayment"
          >
            <span class="d-inline-flex align-items-center gap-2">
              <span v-if="isProcessingPayment" class="spinner-border spinner-border-sm"></span>
              <i v-else class="bi bi-check2-circle"></i>
              <span>{{ $t('common.confirm') }}</span>
            </span>
            <span>
              {{
                paymentForm.currency === 'USD'
                  ? formatUsd(checkoutTotalUsd)
                  : formatKhr(checkoutTotalKhr)
              }}
            </span>
          </button>
        </footer>
      </div>
    </div>

    <!-- ================= MODAL 5: OPEN ORDERS LIST ================= -->
    <div
      v-if="showOpenOrdersModal"
      class="pos-dialog-backdrop"
      @click.self="showOpenOrdersModal = false"
    >
      <div class="pos-dialog pos-dialog--wide" role="dialog" aria-modal="true">
        <header class="pos-dialog__head">
          <div>
            <h3 class="pos-dialog__title">{{ $t('pos.activeOpenOrdersTitle') }}</h3>
            <div class="pos-dialog__subtitle">{{ $t('pos.activeOpenOrdersDesc') }}</div>
          </div>
          <button type="button" class="pos-dialog__close" @click="showOpenOrdersModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="pos-dialog__body">
          <div v-if="isLoadingOpenOrders" class="board-state py-4">
            <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
            <p class="board-state__desc">{{ $t('pos.loadingOpenOrders') }}</p>
          </div>

          <div v-else-if="openOrdersList.length === 0" class="board-state py-4">
            <div class="board-state__glyph" aria-hidden="true">
              <i class="bi bi-check2-all"></i>
            </div>
            <h4 class="board-state__title">{{ $t('pos.noOpenOrders') }}</h4>
            <p class="board-state__desc">{{ $t('pos.noOpenOrdersDesc') }}</p>
          </div>

          <div v-else class="open-queue-list">
            <div
              v-for="ord in openOrdersList"
              :key="ord.id"
              class="open-queue-row"
            >
              <div class="open-queue-row__info">
                <div class="open-queue-row__top">
                  <strong class="open-queue-row__queue tabular">
                    {{ $t('receipt.queue') }} #{{ ord.queue_no }}
                  </strong>
                  <span class="docket-head__receipt tabular">{{ ord.receipt_no }}</span>
                  <span
                    class="open-queue-row__mode"
                    :class="ord.order_type === 'DINE_IN' ? 'is-dine' : 'is-takeaway'"
                  >
                    {{
                      ord.order_type === 'DINE_IN'
                        ? `${$t('common.dineIn')}${ord.table_no ? ` (${ord.table_no})` : ''}`
                        : $t('common.takeaway')
                    }}
                  </span>
                </div>
                <div class="open-queue-row__meta tabular">
                  <span>{{ $t('orders.itemsCount', { count: ord.total_items }) }}</span>
                  <span class="open-queue-row__sep" aria-hidden="true"></span>
                  <span>{{ formatDateTime(ord.created_at) }}</span>
                </div>
              </div>

              <div class="open-queue-row__actions">
                <div class="open-queue-row__totals">
                  <div class="open-queue-row__usd tabular">{{ formatUsd(ord.total) }}</div>
                  <div class="open-queue-row__khr tabular">{{ formatKhr(usdToKhr(ord.total)) }}</div>
                </div>
                <button
                  type="button"
                  class="pos-btn pos-btn--ghost pos-btn--compact"
                  @click="loadOrderIntoCart(ord.id)"
                >
                  <i class="bi bi-pencil-square"></i>
                  <span>{{ $t('common.edit') }}</span>
                </button>
                <button
                  type="button"
                  class="pos-btn pos-btn--primary pos-btn--compact"
                  @click="payExistingOpenOrder(ord.id)"
                >
                  <i class="bi bi-cash-coin"></i>
                  <span>{{ $t('pos.pay') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 6: RECEIPT PRINT PREVIEW ================= -->
    <div
      v-if="showReceiptModal && completedReceipt"
      class="pos-dialog-backdrop"
      @click.self="closeReceiptModal"
    >
      <div class="pos-dialog pos-dialog--narrow" role="dialog" aria-modal="true">
        <header class="pos-dialog__head no-print">
          <div class="receipt-confirmed-badge">
            <i class="bi bi-check-circle-fill"></i>
            <span>{{ $t('receipt.paymentCompleted') }}</span>
          </div>
          <button type="button" class="pos-dialog__close" @click="closeReceiptModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <div class="pos-dialog__body">
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
              <span>
                {{ $t('receipt.receipt') }}: <strong>{{ completedReceipt.order.receipt_no }}</strong>
              </span>
              <span>
                {{ $t('receipt.queue') }}: <strong>#{{ completedReceipt.order.queue_no }}</strong>
              </span>
            </div>
            <div class="d-flex justify-content-between receipt-meta">
              <span>
                {{ $t('receipt.type') }}:
                {{
                  completedReceipt.order.order_type === 'DINE_IN'
                    ? $t('common.dineIn')
                    : $t('common.takeaway')
                }}
              </span>
              <span v-if="completedReceipt.order.table_no">
                {{ $t('receipt.table') }}: <strong>{{ completedReceipt.order.table_no }}</strong>
              </span>
            </div>
            <div class="d-flex justify-content-between receipt-meta">
              <span>
                {{ $t('receipt.cashier') }}:
                {{ completedReceipt.order.cashier?.name || authStore.user?.name }}
              </span>
              <span>
                {{
                  formatDateTime(
                    completedReceipt.payment?.paid_at || completedReceipt.order.created_at
                  )
                }}
              </span>
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
                  <span v-if="item.sugar_level !== null">
                    {{ $t('receipt.sugar') }} {{ item.sugar_level }}%
                  </span>
                  <span v-if="item.sugar_level !== null && item.ice_level"> / </span>
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
                <span>
                  {{ $t('receipt.paidBy', { method: completedReceipt.payment.method }) }}
                </span>
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

        <footer class="pos-dialog__foot no-print">
          <button type="button" class="pos-btn pos-btn--ghost" @click="printReceipt">
            <i class="bi bi-printer"></i>
            <span>{{ $t('receipt.printReceipt') }}</span>
          </button>
          <button
            type="button"
            class="pos-btn pos-btn--primary flex-grow-1 justify-content-center"
            @click="closeReceiptModal"
          >
            <i class="bi bi-plus-circle"></i>
            <span>{{ $t('receipt.newOrder') }}</span>
          </button>
        </footer>
      </div>
    </div>

    <!-- ================= MODAL 7: QUICK OPEN SHIFT ================= -->
    <div
      v-if="showQuickShiftModal"
      class="pos-dialog-backdrop"
      @click.self="showQuickShiftModal = false"
    >
      <div class="pos-dialog pos-dialog--narrow" role="dialog" aria-modal="true">
        <header class="pos-dialog__head">
          <div>
            <h3 class="pos-dialog__title">{{ $t('pos.openCashierShiftTitle') }}</h3>
            <div class="pos-dialog__subtitle">{{ $t('pos.openCashierShiftDesc') }}</div>
          </div>
          <button type="button" class="pos-dialog__close" @click="showQuickShiftModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </header>

        <form @submit.prevent="submitQuickOpenShift">
          <div class="pos-dialog__body">
            <section class="field-group">
              <label class="field-group__label">{{ $t('pos.openingCashUsd') }}</label>
              <div class="currency-field">
                <span class="currency-field__prefix">$</span>
                <input
                  v-model.number="quickShiftForm.opening_cash_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  class="pos-input currency-field__input tabular"
                  placeholder="0.00"
                  required
                  autofocus
                />
              </div>
            </section>

            <section class="field-group">
              <label class="field-group__label">{{ $t('pos.openingCashKhr') }}</label>
              <div class="currency-field">
                <input
                  v-model.number="quickShiftForm.opening_cash_khr"
                  type="number"
                  step="100"
                  min="0"
                  class="pos-input currency-field__input tabular"
                  placeholder="0"
                  required
                />
                <span class="currency-field__suffix">៛</span>
              </div>
            </section>

            <section class="field-group mb-0">
              <label class="field-group__label">{{ $t('pos.shiftNoteOptional') }}</label>
              <input
                v-model="quickShiftForm.note"
                type="text"
                class="pos-input"
                :placeholder="$t('pos.shiftNotePlaceholder')"
              />
            </section>
          </div>

          <footer class="pos-dialog__foot">
            <button
              type="button"
              class="pos-btn pos-btn--ghost"
              :disabled="quickShiftForm.isSubmitting"
              @click="showQuickShiftModal = false"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="submit"
              class="pos-btn pos-btn--primary flex-grow-1 justify-content-center"
              :disabled="quickShiftForm.isSubmitting"
            >
              <span
                v-if="quickShiftForm.isSubmitting"
                class="spinner-border spinner-border-sm"
              ></span>
              <i v-else class="bi bi-unlock"></i>
              <span>{{ $t('pos.startShift') }}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
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
const { exchangeRate, formatUsd, formatKhr, usdToKhr } = useCurrency()
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

const iceOptions = computed(() => [
  { value: 'NONE', label: t('pos.noIce') },
  { value: 'LESS', label: t('pos.lessIce') },
  { value: 'NORMAL', label: t('pos.normalIce') },
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

const setSugarLevel = (val) => {
  const n = Math.min(100, Math.max(0, Math.round(Number(val) || 0)))
  customForm.sugar_level = n
}

const stepSugar = (delta) => {
  const current = customForm.sugar_level ?? 0
  const next = Math.min(100, Math.max(0, current + delta))
  customForm.sugar_level = next
}

const onSugarSliderChange = (e) => {
  const val = Number(e.target.value)
  setSugarLevel(val)
}

const onSugarInputChange = (e) => {
  const raw = e.target.value
  if (raw === '') {
    customForm.sugar_level = 0
    return
  }
  const val = parseInt(raw, 10)
  if (!isNaN(val)) {
    customForm.sugar_level = Math.min(100, Math.max(0, val))
  }
}

const normalizeSugar = () => {
  if (
    customForm.sugar_level === null ||
    customForm.sugar_level === undefined ||
    isNaN(customForm.sugar_level)
  ) {
    customForm.sugar_level = 0
  } else {
    customForm.sugar_level = Math.min(100, Math.max(0, Math.round(customForm.sugar_level)))
  }
}

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
const activeCategories = computed(() => categories.value.filter((c) => c.is_active))

const getActiveVariants = (product) => {
  if (!Array.isArray(product?.variants)) return []
  return product.variants.filter((v) => v.is_active)
}

const getVariantSizeLabel = (v) => {
  if (!v) return ''
  const rawSize = String(v.size || '').trim()
  if (rawSize) {
    const lower = rawSize.toLowerCase()
    if (lower === 'r' || lower === 'reg') return 'Regular'
    if (lower === 's') return 'Small'
    if (lower === 'm') return 'Medium'
    if (lower === 'l') return 'Large'
    if (lower === 'xl') return 'Extra Large'
    return rawSize
  }
  const cleanName = String(v.name || '')
    .replace(/^(iced|hot|cold|frappe)\s+/i, '')
    .replace(/\s+(iced|hot|cold|frappe)$/i, '')
    .trim()
  return cleanName || v.name || 'Regular'
}

const sellableProducts = computed(() =>
  products.value.filter(
    (p) => p.is_active && p.product_type !== 'ADDON' && getActiveVariants(p).length > 0
  )
)

const totalCatalogCount = computed(() => sellableProducts.value.length)

const getCategoryItemCount = (categoryId) =>
  sellableProducts.value.filter((p) => p.category_id === categoryId).length

const availableAddons = computed(() => {
  const list = []
  for (const p of products.value) {
    if (p.is_active && p.product_type === 'ADDON' && Array.isArray(p.variants)) {
      for (const v of p.variants) {
        if (v.is_active) {
          const displayName =
            v.name === 'Regular' || v.name === 'Standard' ? p.name : `${p.name} (${v.name})`
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
  return sellableProducts.value.filter((p) => {
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

const getRegularVariant = (product) => {
  const vars = getActiveVariants(product)
  if (!vars.length) return null
  const regularMatch = vars.find((v) => {
    const name = String(v.name || '').trim().toLowerCase()
    const size = String(v.size || '').trim().toLowerCase()
    return (
      name.includes('regular') ||
      name.includes('standard') ||
      name.includes('ធម្មតា') ||
      size === 'r' ||
      size === 'reg' ||
      size === 'regular' ||
      size === 'm' ||
      size === 'medium'
    )
  })
  return regularMatch || vars[0]
}

const getStartingPrice = (product) => {
  const regVar = getRegularVariant(product)
  return regVar ? Number(regVar.price) || 0 : 0
}

const getPriceDisplay = (product) => {
  return formatUsd(getStartingPrice(product))
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

  customizingProduct.value = product
  editingCartIndex.value = null

  const defaultVar = getRegularVariant(product) || activeVars[0]
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
    const newSig = buildItemSignature(newItem)
    const existingIdx = cartItems.value.findIndex(
      (existing) =>
        (existing.addons || []).length === 0 &&
        newItem.addons.length === 0 &&
        buildItemSignature(existing) === newSig
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
  if (ice === 'EXTRA') return t('pos.extraIce')
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
    let orderRecord = activeCheckoutOrder.value
    if (!orderRecord) {
      orderRecord = await saveOrUpdateOrderRecord()
      editingOrder.value = orderRecord
    }

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

// ================= METHODS: REFRESH & POLLING =================
const refreshAllData = async () => {
  await Promise.all([fetchCatalog(), fetchOpenOrders()])
}

let openOrdersPollInterval = null

watch(
  () => appStore.currentShift?.id,
  (newShiftId) => {
    if (newShiftId) {
      fetchOpenOrders()
    } else {
      openOrdersList.value = []
      openOrdersCount.value = 0
    }
  }
)

// ================= LIFECYCLE =================
onMounted(async () => {
  await Promise.all([fetchCatalog(), appStore.fetchCurrentShift()])
  await fetchOpenOrders()

  if (route.query.orderId) {
    await loadOrderIntoCart(Number(route.query.orderId))
  }

  // Periodic polling every 15s to keep waiting orders count synchronized
  openOrdersPollInterval = setInterval(() => {
    if (appStore.currentShift?.id && !isLoadingOpenOrders.value && !showOpenOrdersModal.value) {
      fetchOpenOrders()
    }
  }, 15000)
})

onUnmounted(() => {
  if (openOrdersPollInterval) {
    clearInterval(openOrdersPollInterval)
    openOrdersPollInterval = null
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.pos-shell {
  /* Core Token Palette */
  --roast-ink: #1a2820;
  --sage-muted: #5a6f62;
  --botanical-espresso: #2d5a43;
  --botanical-hover: #244936;
  --botanical-tint: #ecf6f0;
  --register-deep: #13261b;
  --register-surface: #1b3526;
  --counter-stone: #f4f8f5;
  --counter-well: #e8f0eb;
  --docket-paper: #ffffff;
  --ledger-line: #dce6e0;
  --ledger-hairline: #e9f1ec;
  --crema-amber: #b45309;
  --crema-tint: #fef3c7;
  --berry-crimson: #b91c1c;
  --berry-tint: #fee2e2;

  font-family: 'Plus Jakarta Sans', 'Kantumruy Pro', 'Noto Sans Khmer', sans-serif;
  color: var(--roast-ink);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: calc(100vh - 96px);
  min-height: 600px;
}

.pos-shell button:focus,
.pos-shell button:focus-visible {
  outline: none;
}

.tabular {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1, 'zero' 1;
}

/* ================= SHIFT CLOSED BAR ================= */
.shift-notice {
  background: var(--docket-paper);
  border: 1px solid var(--ledger-line);
  border-radius: 8px;
  padding: 0.65rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
}

.shift-notice__body {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.shift-notice__indicator {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: var(--crema-tint);
  color: var(--crema-amber);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.shift-notice__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shift-notice__title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--roast-ink);
  line-height: 1.25;
}

.shift-notice__desc {
  font-size: 0.77rem;
  color: var(--sage-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shift-notice__actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.shift-notice__link {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sage-muted);
  text-decoration: none;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
}

.shift-notice__link:hover {
  color: var(--roast-ink);
  background: var(--counter-stone);
}

/* ================= COUNTER STAGE (2-ZONE ASYMMETRIC LAYOUT) ================= */
.counter-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 412px;
  gap: 1.1rem;
  flex: 1;
  min-height: 0;
}

@media (max-width: 1120px) {
  .pos-shell {
    height: auto;
  }
  .counter-stage {
    grid-template-columns: 1fr;
  }
}

/* ================= LEFT ZONE: OPEN COUNTER MENU BOARD ================= */
.menu-board {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.menu-board__header {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ledger-line);
  flex-shrink: 0;
}

.menu-board__controls {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.search-well {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-well__icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sage-muted);
  font-size: 0.86rem;
  pointer-events: none;
}

.search-well__input {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 38px;
  border: 1px solid var(--ledger-line);
  border-radius: 8px;
  background: var(--docket-paper);
  color: var(--roast-ink);
  font-size: 0.86rem;
  font-weight: 500;
  transition: border-color 0.15s ease;
}

.search-well__input::placeholder {
  color: var(--sage-muted);
  font-weight: 400;
}

.search-well__input:focus {
  outline: none;
  border-color: var(--botanical-espresso);
}

.search-well__clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--sage-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  border-radius: 4px;
}

.search-well__clear:hover {
  color: var(--roast-ink);
  background: var(--counter-stone);
}

.menu-board__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.queue-trigger {
  height: 40px;
  padding: 0 0.85rem;
  border: 1.5px solid var(--ledger-line);
  border-radius: 8px;
  background: var(--docket-paper);
  color: var(--roast-ink);
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  transition: all 0.15s ease;
  cursor: pointer;
}

.queue-trigger:hover {
  border-color: var(--botanical-espresso);
  background: #f7faf8;
}

.queue-trigger.has-open {
  border-color: #fca5a5;
  background: #fffafa;
}

.queue-trigger__count {
  background: #dc2626;
  color: #ffffff;
  font-size: 0.74rem;
  font-weight: 800;
  min-width: 20px;
  height: 20px;
  padding: 0 0.42rem;
  border-radius: 5px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(220, 38, 38, 0.3);
}

.icon-trigger {
  width: 40px;
  height: 40px;
  border: 1px solid var(--ledger-line);
  border-radius: 8px;
  background: var(--docket-paper);
  color: var(--roast-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.94rem;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.icon-trigger:hover:not(:disabled) {
  border-color: var(--botanical-espresso);
  color: var(--botanical-espresso);
}

/* Category Filter Rail */
.category-rail {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.category-rail::-webkit-scrollbar {
  display: none;
}

.category-rail__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.38rem 0.78rem;
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  background: var(--docket-paper);
  color: var(--sage-muted);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.category-rail__tab:hover:not(.is-active) {
  color: var(--roast-ink);
  border-color: #b7c6bc;
}

.category-rail__tab.is-active {
  background: var(--botanical-espresso);
  border-color: var(--botanical-espresso);
  color: #ffffff;
}

.category-rail__count {
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0.72;
}

/* Menu Index Grid */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 0.85rem;
  padding: 0.85rem 0.15rem 0.85rem 0;
  overflow-y: auto;
  align-content: start;
  flex: 1;
}

.menu-item {
  background: var(--docket-paper);
  border: 1px solid var(--ledger-line);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.menu-item:hover {
  border-color: #b5c7bc;
  box-shadow: 0 8px 20px -8px rgba(23, 33, 28, 0.1);
}

.menu-item:focus-visible {
  outline: 2px solid var(--botanical-espresso);
  outline-offset: 2px;
}

.menu-item.in-docket {
  border-color: var(--botanical-espresso);
  background: #f9fcfa;
}

.menu-item__visual {
  aspect-ratio: 4 / 3;
  width: 100%;
  background: #f3f6f4;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.menu-item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.menu-item:hover .menu-item__img {
  transform: scale(1.03);
}

.menu-item__fallback {
  font-size: 1.85rem;
  color: #8fa196;
}

.menu-item__overlay-top {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  pointer-events: none;
}

.menu-item__category {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--roast-ink);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(23, 33, 28, 0.08);
  box-shadow: 0 2px 6px rgba(23, 33, 28, 0.06);
  padding: 0.18rem 0.54rem;
  border-radius: 999px;
  line-height: 1.25;
  max-width: 85%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item__qty {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 2;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--botanical-espresso);
  color: #ffffff;
  border: 1.5px solid #ffffff;
  box-shadow: 0 2px 8px rgba(23, 33, 28, 0.22);
  font-size: 0.73rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.menu-item__body {
  padding: 0.72rem 0.82rem 0.78rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.45rem;
}

.menu-item__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin: 0;
  line-height: 1.34;
  letter-spacing: -0.01em;
  text-transform: capitalize;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.menu-item__pricing {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
}

.menu-item__price-group {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.menu-item__usd {
  font-size: 1rem;
  font-weight: 800;
  color: var(--botanical-espresso);
  letter-spacing: -0.015em;
}

.menu-item__khr {
  font-size: 0.73rem;
  font-weight: 500;
  color: var(--sage-muted);
  margin-top: 2px;
}

.menu-item__action {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--botanical-tint);
  color: var(--botanical-espresso);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  flex-shrink: 0;
  transition:
    background-color 0.14s ease,
    color 0.14s ease,
    transform 0.14s ease;
}

.menu-item:hover .menu-item__action {
  background: var(--botanical-espresso);
  color: #ffffff;
}

/* ================= RIGHT ZONE: BARISTA ORDER DOCKET ================= */
.barista-docket {
  background: var(--docket-paper);
  border: 1px solid var(--ledger-line);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.docket-head {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--ledger-line);
  background: var(--docket-paper);
  flex-shrink: 0;
}

.docket-head__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.docket-head__identity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.docket-head__title {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--roast-ink);
  margin: 0;
  letter-spacing: -0.015em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docket-head__receipt {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--botanical-espresso);
  background: var(--botanical-tint);
  padding: 0.12rem 0.45rem;
  border-radius: 4px;
}

.docket-head__clear {
  border: none;
  background: transparent;
  color: var(--berry-crimson);
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.22rem 0.45rem;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}

.docket-head__clear:hover {
  background: var(--berry-tint);
}

.docket-head__routing {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.service-switch {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--counter-stone);
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  padding: 2px;
}

.service-switch__option {
  border: none;
  background: transparent;
  color: var(--sage-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.34rem 0.5rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.service-switch__option.is-selected {
  background: var(--docket-paper);
  color: var(--roast-ink);
  box-shadow: 0 1px 2px rgba(20, 32, 25, 0.06);
}

.table-slot {
  width: 90px;
  flex-shrink: 0;
}

.table-slot__input {
  width: 100%;
  height: 34px;
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  background: var(--docket-paper);
  color: var(--roast-ink);
  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
  padding: 0 0.4rem;
}

.table-slot__input:focus {
  outline: none;
  border-color: var(--botanical-espresso);
}

/* Docket Stream (Line Items) */
.docket-stream {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.docket-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.docket-row {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ledger-hairline);
}

.docket-row:hover {
  background: #fafcfb;
}

.docket-row__main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.docket-row__info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.docket-row__headline {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.docket-row__name {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.docket-row__variant {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--sage-muted);
  background: var(--counter-stone);
  padding: 0.05rem 0.38rem;
  border-radius: 4px;
}

.docket-row__specs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.28rem;
}

.docket-spec {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--sage-muted);
  background: var(--counter-stone);
  padding: 0.05rem 0.38rem;
  border-radius: 4px;
}

.docket-row__addons {
  margin-top: 0.28rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.docket-addon {
  display: flex;
  justify-content: space-between;
  font-size: 0.73rem;
  color: var(--sage-muted);
}

.docket-row__note {
  margin-top: 0.28rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.73rem;
  color: var(--crema-amber);
}

.docket-row__figures {
  text-align: right;
  flex-shrink: 0;
}

.docket-row__line-total {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.docket-row__unit-price {
  font-size: 0.7rem;
  color: var(--sage-muted);
}

.docket-row__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.45rem;
}

.docket-row__edit {
  border: none;
  background: transparent;
  color: var(--sage-muted);
  font-size: 0.74rem;
  font-weight: 600;
  padding: 0.15rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.docket-row__edit:hover {
  color: var(--botanical-espresso);
}

.docket-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  background: var(--docket-paper);
  overflow: hidden;
}

.docket-stepper__btn {
  width: 26px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--roast-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.docket-stepper__btn:hover {
  background: var(--counter-stone);
}

.docket-stepper__btn.is-danger {
  color: var(--berry-crimson);
}

.docket-stepper__qty {
  min-width: 24px;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
}

/* ================= DOCKET FOOTER & DARK ESPRESSO REGISTER BLOCK ================= */
.docket-foot {
  padding: 0.75rem 0.9rem 0.9rem;
  border-top: 1px solid var(--ledger-line);
  background: var(--docket-paper);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex-shrink: 0;
}

.docket-adjustments {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.adjustment-chip {
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  background: var(--counter-stone);
  color: var(--sage-muted);
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.38rem 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: border-color 0.12s ease, color 0.12s ease, background-color 0.12s ease;
}

.adjustment-chip:hover {
  color: var(--roast-ink);
  border-color: #b7c6bc;
}

.adjustment-chip.is-engaged {
  background: var(--botanical-tint);
  border-color: var(--botanical-espresso);
  color: var(--botanical-espresso);
}

/* Focal Anchor: Clean Botanical Register Summary Block */
.register-block {
  background: #f4f8f5;
  border: 1px solid #dbe6df;
  color: var(--roast-ink);
  border-radius: 10px;
  padding: 0.85rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.register-block__Breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px dashed #cfe0d5;
}

.register-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 500;
  color: #52655a;
}

.register-line span:last-child {
  font-weight: 600;
  color: var(--roast-ink);
}

.register-line.is-discount,
.register-line.is-discount span:last-child {
  color: var(--berry-crimson);
  font-weight: 600;
}

.register-block__payable {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}

.register-block__label-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.register-block__label {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.register-block__rate {
  font-size: 0.71rem;
  color: #64776c;
}

.register-block__amount-col {
  text-align: right;
}

.register-block__usd {
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--botanical-espresso);
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.register-block__khr {
  font-size: 0.8rem;
  font-weight: 600;
  color: #4a6355;
  margin-top: 2px;
}

.register-block__actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  padding-top: 0.15rem;
}

.register-btn {
  height: 44px;
  border-radius: 8px;
  font-size: 0.83rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  white-space: nowrap;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease,
    box-shadow 0.14s ease;
}

.register-btn:disabled {
  cursor: not-allowed;
}

.register-btn--hold {
  background: #ffffff;
  color: #1e3a2b;
  border: 1px solid #cbd9d0;
  padding: 0 0.85rem;
}

.register-btn--hold:hover:not(:disabled) {
  background: #ebf2ee;
  border-color: #b4c8bc;
}

.register-btn--hold:disabled {
  background: #f8faf9;
  color: #90a297;
  border-color: #dce7e0;
}

.register-btn--settle {
  background: #2d5a43;
  color: #ffffff;
  border: none;
  padding: 0 0.9rem;
  justify-content: space-between;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.18);
}

.register-btn--settle:hover:not(:disabled) {
  background: #234735;
}

.register-btn--settle:disabled {
  background: #89ae9a;
  color: #ffffff;
  box-shadow: none;
}

.register-btn__settle-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.register-btn__settle-amount {
  background: rgba(255, 255, 255, 0.18);
  padding: 0.18rem 0.52rem;
  border-radius: 6px;
  font-size: 0.82rem;
}

/* ================= EMPTY STATES ================= */
.board-state,
.docket-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.5rem 1.25rem;
}

.board-state__glyph,
.docket-empty__icon {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  background: var(--counter-stone);
  border: 1px solid var(--ledger-line);
  color: var(--sage-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-bottom: 0.65rem;
}

.board-state__title,
.docket-empty__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin: 0 0 0.2rem;
}

.board-state__desc,
.docket-empty__desc {
  font-size: 0.78rem;
  color: var(--sage-muted);
  margin: 0;
  max-width: 34ch;
}

/* ================= SHARED BUTTONS & INPUTS ================= */
.pos-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.52rem 1rem;
  transition: background-color 0.12s ease, border-color 0.12s ease;
}

.pos-btn--compact {
  padding: 0.38rem 0.78rem;
  font-size: 0.79rem;
}

.pos-btn--primary {
  background: var(--botanical-espresso);
  color: #ffffff;
  border: 1px solid var(--botanical-espresso);
  border-radius: 8px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(30, 70, 49, 0.18);
  transition: all 0.14s ease;
}

.pos-btn--primary:hover:not(:disabled) {
  background: var(--botanical-hover);
  border-color: var(--botanical-hover);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(30, 70, 49, 0.24);
}

.pos-btn--ghost {
  background: #ffffff;
  color: #4b5d52;
  border: 1.5px solid #d8e0da;
  border-radius: 8px;
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  transition: all 0.14s ease;
}

.pos-btn--ghost:hover:not(:disabled) {
  background: #ebf2ed;
  color: #17211c;
  border-color: #c5d2c8;
}

.pos-btn--split {
  justify-content: space-between;
}

.pos-btn--split > span:last-child {
  background: rgba(255, 255, 255, 0.18);
  padding: 0.18rem 0.52rem;
  border-radius: 6px;
  font-weight: 800;
  font-size: 0.85rem;
}

.pos-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pos-input {
  width: 100%;
  height: 42px;
  padding: 0 0.85rem;
  border: 1.5px solid var(--ledger-line);
  border-radius: 8px;
  background: #f8faf8;
  color: var(--roast-ink);
  font-size: 0.86rem;
  transition: all 0.15s ease;
}

.pos-input:focus {
  outline: none;
  background: var(--docket-paper);
  border-color: var(--botanical-espresso);
  box-shadow: 0 0 0 3px rgba(30, 70, 49, 0.1);
}

.pos-input--padded {
  padding-left: 34px;
}

.pos-input--textarea {
  height: auto;
  padding: 0.6rem 0.75rem;
}

.pos-input--tender {
  font-size: 1.28rem;
  font-weight: 800;
  height: 46px;
  color: var(--botanical-espresso);
  background: #ffffff !important;
  border: 1.5px solid #cbdcd1 !important;
  box-shadow: inset 0 1px 2px rgba(23, 33, 28, 0.04);
}

/* ================= DIALOGS / MODALS ================= */
.pos-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 32, 25, 0.48);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 1rem;
}

.pos-dialog {
  background: var(--docket-paper);
  border: 1px solid var(--ledger-line);
  border-radius: 10px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 44px rgba(20, 32, 25, 0.18);
}

.pos-dialog--customize {
  max-width: 540px;
}

.pos-dialog--checkout {
  max-width: 480px;
}

.pos-dialog--narrow {
  max-width: 420px;
}

.pos-dialog--wide {
  max-width: 680px;
}

.pos-dialog__head {
  padding: 0.95rem 1.2rem;
  border-bottom: 1px solid var(--ledger-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pos-dialog__title {
  font-size: 0.96rem;
  font-weight: 800;
  color: var(--roast-ink);
  margin: 0;
}

.pos-dialog__subtitle {
  font-size: 0.76rem;
  color: var(--sage-muted);
  margin-top: 2px;
}

.pos-dialog__close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  background: var(--counter-stone);
  color: var(--sage-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pos-dialog__close:hover {
  color: var(--roast-ink);
  background: #e4ebe6;
}

.pos-dialog__body {
  padding: 1.1rem 1.2rem;
  overflow-y: auto;
}

.pos-dialog__foot {
  padding: 0.85rem 1.2rem;
  border-top: 1px solid var(--ledger-hairline);
  background: var(--counter-stone);
  display: flex;
  gap: 0.6rem;
}

/* Customizer Specifics */
.customizer-product {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.customizer-product__thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: var(--counter-stone);
  border: 1px solid var(--ledger-line);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--botanical-espresso);
  flex-shrink: 0;
}

.customizer-product__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customizer-product__title-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.product-kind-tag {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.1rem 0.42rem;
  border-radius: 4px;
}

.product-kind-tag.is-drink {
  background: var(--botanical-tint);
  color: var(--botanical-espresso);
}

.product-kind-tag.is-food {
  background: var(--crema-tint);
  color: var(--crema-amber);
}

.field-group {
  margin-bottom: 1rem;
}

.field-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.field-group__label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sage-muted);
  margin-bottom: 0.4rem;
}

.field-group__head .field-group__label {
  margin-bottom: 0;
}

.field-group__meta {
  font-size: 0.74rem;
  color: var(--sage-muted);
}

.field-group__hint {
  font-size: 0.74rem;
  color: var(--sage-muted);
  margin: 0.35rem 0 0;
}

.variant-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(134px, 1fr));
  gap: 0.5rem;
}

.variant-option {
  border: 1.5px solid #e1ebe5;
  border-radius: 8px;
  background: #f9fbf9;
  padding: 0.65rem 0.8rem;
  min-height: 62px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.variant-option:hover:not(.is-selected) {
  border-color: #bdd1c4;
  background: #f3f8f5;
}

.variant-option.is-selected {
  border-color: #3b7054;
  background: #eaf5ee;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.08);
}

.variant-option__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
}

.variant-option__name {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--roast-ink);
  line-height: 1.25;
}

.variant-option.is-selected .variant-option__name {
  color: #193e2b;
}

.variant-option__check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #cfe0d6;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: transparent;
  flex-shrink: 0;
  transition: all 0.14s ease;
}

.variant-option.is-selected .variant-option__check {
  background: #2d5a43;
  border-color: #2d5a43;
  color: #ffffff;
}

.variant-option__price {
  font-size: 0.92rem;
  font-weight: 800;
  color: #2d5a43;
}

.calibration-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.calibration-strip--ice {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.calibration-strip--ice .calibration-pill {
  width: 100%;
  min-width: 0;
  padding: 0.55rem 0.4rem;
  font-size: 0.81rem;
}

.calibration-pill {
  flex: 1 1 auto;
  min-width: 56px;
  border: 1.5px solid #e1ebe5;
  border-radius: 8px;
  background: #f9fbf9;
  color: #3d5245;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.14s ease;
}

.calibration-pill:hover:not(.is-selected) {
  background: #f1f7f3;
  border-color: #bdd1c4;
  color: var(--roast-ink);
}

.calibration-pill.is-selected {
  background: #e6f3ec;
  border-color: #3b7054;
  color: #193e2b;
  font-weight: 700;
  box-shadow: 0 2px 5px rgba(45, 90, 67, 0.08);
}

/* Flexible Sugar Slider - Soft & Eye-Friendly Botanical Palette */
.sugar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.sugar-stepper-pill {
  display: inline-flex;
  align-items: center;
  background: #eef6f1;
  border: 1px solid #d5e5dc;
  border-radius: 8px;
  padding: 2px;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.sugar-stepper-pill:focus-within {
  border-color: #3b7054;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(45, 90, 67, 0.12);
}

.sugar-stepper-btn {
  width: 24px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: #ffffff;
  color: #2d5a43;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(23, 36, 28, 0.05);
  transition: background-color 0.12s ease, color 0.12s ease;
}

.sugar-stepper-btn:hover:not(:disabled) {
  background: #2d5a43;
  color: #ffffff;
}

.sugar-stepper-btn:disabled {
  opacity: 0.35;
  background: transparent;
  box-shadow: none;
  cursor: not-allowed;
}

.sugar-stepper-value {
  display: inline-flex;
  align-items: center;
  padding: 0 0.35rem;
  gap: 1px;
}

.sugar-stepper-input {
  width: 28px;
  border: none;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 800;
  color: #1e4230;
  text-align: right;
  padding: 0;
  margin: 0;
  outline: none;
  -moz-appearance: textfield;
}

.sugar-stepper-input::-webkit-outer-spin-button,
.sugar-stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.sugar-stepper-unit {
  font-size: 0.72rem;
  font-weight: 700;
  color: #4f6b5b;
}

.sugar-slider-track-wrap {
  background: #f8fbf9;
  border: 1.5px solid #e3ede7;
  border-radius: 10px;
  padding: 0.75rem 0.85rem 0.5rem;
}

.sugar-range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    #467d60 0%,
    #35694e var(--sugar-pct, 100%),
    #dce7e0 var(--sugar-pct, 100%),
    #dce7e0 100%
  );
  outline: none;
  cursor: pointer;
  margin: 0;
  display: block;
}

.sugar-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  border: 2.5px solid #2d5a43;
  box-shadow: 0 2px 5px rgba(45, 90, 67, 0.2);
  cursor: grab;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.sugar-range-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.14);
  box-shadow: 0 3px 8px rgba(45, 90, 67, 0.28);
}

.sugar-range-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  border: 2.5px solid #2d5a43;
  box-shadow: 0 2px 5px rgba(45, 90, 67, 0.2);
  cursor: grab;
}

.sugar-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding: 0;
}

.sugar-tick-btn {
  border: none;
  outline: none;
  background: transparent;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.73rem;
  font-weight: 600;
  color: #63786b;
  cursor: pointer;
  transition: all 0.12s ease;
  line-height: 1.1;
}

.sugar-tick-btn:focus,
.sugar-tick-btn:focus-visible {
  outline: none;
  box-shadow: none;
}

.sugar-tick-btn:hover:not(.is-active) {
  color: #2d5a43;
  background: #eaf3ed;
}

.sugar-tick-btn.is-active {
  color: #193e2b;
  font-weight: 800;
  background: #dceee3;
  border: none;
}

.addon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.45rem;
}

.addon-item {
  border: 1.5px solid #e1ebe5;
  border-radius: 8px;
  padding: 0.48rem 0.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f9fbf9;
}

.addon-item.is-selected {
  border-color: #3b7054;
  background: #eaf5ee;
}

.addon-item__meta {
  display: flex;
  flex-direction: column;
}

.addon-item__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--roast-ink);
}

.addon-item__price {
  font-size: 0.72rem;
  font-weight: 600;
  color: #2d5a43;
}

.addon-item__stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.addon-item__btn {
  width: 24px;
  height: 24px;
  border: 1px solid #d5e3db;
  border-radius: 5px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.74rem;
}

.addon-item__qty {
  font-size: 0.78rem;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.customizer-bottom-row {
  display: grid;
  grid-template-columns: 145px 1fr;
  gap: 0.65rem;
  align-items: end;
}

@media (max-width: 520px) {
  .customizer-bottom-row {
    grid-template-columns: 1fr;
  }
}

.qty-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1.5px solid #e1ebe5;
  border-radius: 8px;
  background: #f5f9f6;
  height: 42px;
  padding: 3px;
}

.qty-control__btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #ffffff;
  color: #2d5a43;
  box-shadow: 0 1px 2px rgba(23, 36, 28, 0.05);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.12s ease;
}

.qty-control__btn:hover:not(:disabled) {
  background: #2d5a43;
  color: #ffffff;
}

.qty-control__btn:disabled {
  opacity: 0.35;
  background: transparent;
  box-shadow: none;
}

.qty-control__val {
  font-size: 0.92rem;
  font-weight: 800;
  color: #193e2b;
}

.input-with-icon {
  position: relative;
}

.input-with-icon__glyph {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sage-muted);
  font-size: 0.82rem;
  pointer-events: none;
}

/* Checkout Modal Specifics */
.checkout-display {
  background: #f2f8f4;
  border: 1px solid #d7e7dd;
  border-radius: 10px;
  padding: 0.9rem 1.15rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.1rem;
}

.checkout-display__col {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.checkout-display__col.is-right {
  text-align: right;
}

.checkout-display__divider {
  width: 1px;
  align-self: stretch;
  background: #d5e6dc;
  margin: 2px 0;
}

.checkout-display__caption {
  font-size: 0.74rem;
  font-weight: 600;
  color: #556c5e;
}

.checkout-display__usd {
  font-size: 1.65rem;
  font-weight: 800;
  color: #193e2b;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.checkout-display__khr {
  font-size: 1.2rem;
  font-weight: 800;
  color: #2d5a43;
  line-height: 1.15;
}

.channel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.channel-card {
  border: 1.5px solid #e1ebe5;
  border-radius: 9px;
  background: #f9fbf9;
  padding: 0.65rem 0.8rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.84rem;
  font-weight: 700;
  color: #3d5245;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.channel-card__icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #edf4f0;
  color: #4a6355;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.channel-card__label {
  flex: 1;
  line-height: 1.25;
}

.channel-card__check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #cfe0d6;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: transparent;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.channel-card:hover:not(.is-selected) {
  border-color: #bdd1c4;
  background: #f3f8f5;
  color: var(--roast-ink);
}

.channel-card.is-selected {
  border-color: #3b7054;
  background: #eaf5ee;
  color: #193e2b;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.08);
}

.channel-card.is-selected .channel-card__icon {
  background: #d7ece0;
  color: #193e2b;
}

.channel-card.is-selected .channel-card__check {
  background: #2d5a43;
  border-color: #2d5a43;
  color: #ffffff;
}

.currency-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.currency-switch__option {
  border: 1.5px solid #e1ebe5;
  border-radius: 9px;
  background: #f9fbf9;
  color: #4f6356;
  padding: 0.62rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.81rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.currency-switch__val {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.currency-switch__option:hover:not(.is-selected) {
  border-color: #bdd1c4;
  background: #f3f8f5;
}

.currency-switch__option.is-selected {
  background: #eaf5ee;
  border-color: #3b7054;
  color: #193e2b;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.08);
}

.currency-switch__option.is-selected .currency-switch__val {
  color: #193e2b;
}

.cash-tender-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.72rem 0.95rem;
  border-radius: 9px;
  background: #f8fbf9;
  border: 1.5px solid #dfeae3;
}

.cash-tender-summary__label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #4f6356;
}

.cash-tender-summary__label i {
  font-size: 0.95rem;
  color: #3b7054;
}

.cash-tender-summary__amount {
  font-size: 1.15rem;
  font-weight: 800;
  color: #193e2b;
}

.bank-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.42rem;
}

.bank-chip {
  border: 1.5px solid #e1ebe5;
  border-radius: 8px;
  background: #f9fbf9;
  padding: 0.44rem 0.35rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: #3d5245;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.14s ease;
}

.bank-chip:hover:not(.is-selected) {
  background: #f1f7f3;
  border-color: #bdd1c4;
  color: var(--roast-ink);
}

.bank-chip.is-selected {
  background: #eaf5ee;
  border-color: #3b7054;
  color: #193e2b;
  font-weight: 700;
  box-shadow: 0 2px 5px rgba(45, 90, 67, 0.08);
}

.checkout-verify-hint {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.55rem;
  padding: 0.48rem 0.7rem;
  border-radius: 7px;
  background: #f4f9f6;
  border: 1px solid #e0ece5;
  font-size: 0.74rem;
  font-weight: 500;
  color: #4e6457;
}

.checkout-verify-hint i {
  color: #3b7054;
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* Open Queue Modal List */
.open-queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.open-queue-row {
  border: 1px solid var(--ledger-line);
  border-radius: 6px;
  padding: 0.75rem 0.95rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  background: var(--docket-paper);
}

.open-queue-row__top {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.open-queue-row__queue {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.open-queue-row__mode {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.44rem;
  border-radius: 4px;
}

.open-queue-row__mode.is-dine {
  background: #e0f2fe;
  color: #0369a1;
}

.open-queue-row__mode.is-takeaway {
  background: var(--counter-stone);
  color: var(--sage-muted);
}

.open-queue-row__meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  color: var(--sage-muted);
  margin-top: 0.2rem;
}

.open-queue-row__sep {
  width: 1px;
  height: 11px;
  background: var(--ledger-line);
}

.open-queue-row__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.open-queue-row__totals {
  text-align: right;
  margin-right: 0.35rem;
}

.open-queue-row__usd {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.open-queue-row__khr {
  font-size: 0.74rem;
  color: var(--sage-muted);
}

/* Quick Shift Currency Field */
.currency-field {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-field__prefix,
.currency-field__suffix {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 700;
  color: var(--sage-muted);
  font-size: 0.86rem;
  pointer-events: none;
}

.currency-field__prefix {
  left: 12px;
}

.currency-field__suffix {
  right: 12px;
}

.currency-field__prefix + .currency-field__input {
  padding-left: 28px;
}

.currency-field__input:has(+ .currency-field__suffix) {
  padding-right: 28px;
}

.receipt-confirmed-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--botanical-espresso);
}

/* Thermal Receipt */
.thermal-receipt {
  background: #fffef9;
  border: 1px dashed #c8c2b8;
  border-radius: 6px;
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

.is-spinning {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
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
