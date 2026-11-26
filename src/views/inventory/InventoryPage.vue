<template>
  <div class="inventory-page">
    <!-- Top Segmented Tabs & Primary Actions -->
    <div class="inventory-top-bar">
      <div class="inventory-segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'INGREDIENTS' }"
          @click="switchTab('INGREDIENTS')"
        >
          <i class="bi bi-boxes"></i>
          <span>{{ $t('inventory.tabIngredients') }}</span>
          <span class="seg-tab-count tabular">{{ ingredientPagination.total || ingredientsList.length }}</span>
          <span v-if="lowStockCount > 0" class="low-stock-count-pill tabular">
            {{ $t('inventory.lowCount', { count: lowStockCount }) }}
          </span>
        </button>
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'MOVEMENTS' }"
          @click="switchTab('MOVEMENTS')"
        >
          <i class="bi bi-arrow-left-right"></i>
          <span>{{ $t('inventory.tabMovements') }}</span>
        </button>
      </div>

      <div v-if="authStore.isOwner" class="inventory-top-bar__right">
        <button
          type="button"
          class="btn-secondary-action"
          @click="openStockMovementModal()"
        >
          <i class="bi bi-plus-slash-minus"></i>
          <span>{{ $t('inventory.recordMovement') }}</span>
        </button>
        <button
          type="button"
          class="btn-primary-action"
          @click="openCreateIngredientModal"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('inventory.addIngredient') }}</span>
        </button>
      </div>
    </div>

    <!-- ================= TAB 1: INGREDIENTS ================= -->
    <div v-if="activeTab === 'INGREDIENTS'" class="clean-card">
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="ingredientFilters.search"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('inventory.searchIngredientPlaceholder')"
              @keyup.enter="fetchIngredients(1)"
            />
            <button
              v-if="ingredientFilters.search"
              type="button"
              class="search-clear"
              @click="ingredientFilters.search = ''; fetchIngredients(1)"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <select
            v-model="ingredientFilters.unit"
            class="filter-input filter-select"
            @change="fetchIngredients(1)"
          >
            <option value="">{{ $t('inventory.allUnits') }}</option>
            <option value="G">{{ $t('inventory.grams') }}</option>
            <option value="ML">{{ $t('inventory.milliliters') }}</option>
            <option value="PCS">{{ $t('inventory.pieces') }}</option>
          </select>

          <select
            v-model="ingredientFilters.is_active"
            class="filter-input filter-select"
            @change="fetchIngredients(1)"
          >
            <option value="">{{ $t('common.allStatus') }}</option>
            <option value="true">{{ $t('inventory.activeOnly') }}</option>
            <option value="false">{{ $t('common.inactive') }}</option>
          </select>

          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-warning-active': ingredientFilters.low_stock }"
            @click="toggleLowStockQuickFilter"
          >
            <i class="bi bi-exclamation-circle"></i>
            <span>{{ $t('inventory.lowStockOnly') }}</span>
          </button>
        </div>

        <div class="filter-bar__right">
          <button
            type="button"
            class="toolbar-btn"
            @click="resetIngredientFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.reset') }}</span>
          </button>
        </div>
      </div>

      <!-- Loading / Empty / Table -->
      <div v-if="isLoadingIngredients" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('inventory.loadingIngredients') }}</div>
      </div>

      <div v-else-if="ingredientsList.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-boxes"></i>
        </div>
        <div class="empty-box__title">{{ $t('inventory.noIngredientsFound') }}</div>
        <div class="empty-box__desc">{{ $t('inventory.noIngredientsFoundDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table mobile-card-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('inventory.colIngredient') }}</th>
              <th>{{ $t('inventory.colCurrentStock') }}</th>
              <th>{{ $t('inventory.colMinAlert') }}</th>
              <th>{{ $t('inventory.colStockHealth') }}</th>
              <th>{{ $t('inventory.colRecipes') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ing in ingredientsList" :key="ing.id">
              <td>
                <span class="ing-name-text">{{ ing.name }}</span>
              </td>
              <td :data-label="$t('inventory.colCurrentStock')">
                <div class="stock-qty-cell tabular">
                  <strong
                    class="stock-qty-val"
                    :class="
                      Number(ing.current_stock) <= 0
                        ? 'is-out'
                        : ing.is_low_stock
                          ? 'is-low'
                          : ''
                    "
                  >
                    {{ formatStockQty(ing.current_stock) }}
                  </strong>
                  <span class="unit-tag">{{ ing.unit }}</span>
                </div>
              </td>
              <td :data-label="$t('inventory.colMinAlert')">
                <div class="stock-qty-cell tabular">
                  <span class="min-stock-val">{{ formatStockQty(ing.minimum_stock) }}</span>
                  <span class="unit-tag">{{ ing.unit }}</span>
                </div>
              </td>
              <td :data-label="$t('inventory.colStockHealth')">
                <span
                  class="stock-text"
                  :class="
                    Number(ing.current_stock) <= 0
                      ? 'out'
                      : ing.is_low_stock
                        ? 'low'
                        : 'ok'
                  "
                >
                  {{
                    Number(ing.current_stock) <= 0
                      ? $t('inventory.outOfStock')
                      : ing.is_low_stock
                        ? $t('inventory.lowStock')
                        : $t('inventory.inStock')
                  }}
                </span>
              </td>
              <td :data-label="$t('inventory.colRecipes')">
                <span class="recipes-text tabular">
                  {{ ing.total_recipes || 0 }}
                </span>
              </td>
              <td :data-label="$t('common.status')">
                <span
                  class="status-text"
                  :class="ing.is_active ? 'active' : 'inactive'"
                >
                  {{ ing.is_active ? $t('common.active') : $t('common.inactive') }}
                </span>
              </td>
              <td class="text-end mobile-card-actions">
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('inventory.tabMovements')"
                    @click="viewIngredientMovements(ing)"
                  >
                    <i class="bi bi-clock-history"></i>
                  </button>

                  <template v-if="authStore.isOwner">
                    <button
                      v-if="ing.is_active"
                      type="button"
                      class="btn-action-icon is-adjust"
                      :title="$t('inventory.recordMovement')"
                      @click="openStockMovementModal(ing)"
                    >
                      <i class="bi bi-plus-slash-minus"></i>
                    </button>
                    <button
                      type="button"
                      class="btn-action-icon"
                      :title="$t('inventory.editIngredient')"
                      @click="openEditIngredientModal(ing)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      class="btn-action-icon is-danger"
                      :title="$t('common.delete')"
                      @click="confirmDeleteIngredient(ing)"
                    >
                      <i class="bi bi-trash3"></i>
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="ingredientPagination.totalPages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: ingredientPagination.page, total: ingredientPagination.totalPages }) }}
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="ingredientPagination.page <= 1"
            @click="fetchIngredients(ingredientPagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="ingredientPagination.page >= ingredientPagination.totalPages"
            @click="fetchIngredients(ingredientPagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= TAB 2: STOCK MOVEMENTS LEDGER ================= -->
    <div v-if="activeTab === 'MOVEMENTS'" class="clean-card">
      <div class="filter-bar">
        <div class="filter-bar__left">
          <select
            v-model="movementFilters.ingredient_id"
            class="filter-input filter-select"
            @change="fetchMovements(1)"
          >
            <option value="">{{ $t('inventory.allIngredients') }}</option>
            <option v-for="ing in allIngredientsDropdown" :key="ing.id" :value="ing.id">
              {{ ing.name }} ({{ ing.unit }})
            </option>
          </select>

          <select
            v-model="movementFilters.movement_type"
            class="filter-input filter-select"
            @change="fetchMovements(1)"
          >
            <option value="">{{ $t('inventory.allMovementTypes') }}</option>
            <option value="PURCHASE">{{ $t('inventory.purchasePlus') }}</option>
            <option value="SALE">{{ $t('inventory.saleMinus') }}</option>
            <option value="WASTE">{{ $t('inventory.wasteMinus') }}</option>
            <option value="ADJUSTMENT">{{ $t('inventory.adjustmentPlusMinus') }}</option>
            <option value="RETURN">{{ $t('inventory.returnPlus') }}</option>
          </select>

          <div class="date-range-group">
            <i class="bi bi-calendar3 date-range-group__icon"></i>
            <input
              v-model="movementFilters.start_date"
              type="date"
              class="date-range-group__input"
              @change="fetchMovements(1)"
            />
            <span class="date-range-group__sep">→</span>
            <input
              v-model="movementFilters.end_date"
              type="date"
              class="date-range-group__input"
              @change="fetchMovements(1)"
            />
          </div>
        </div>

        <div class="filter-bar__right">
          <button
            type="button"
            class="toolbar-btn"
            @click="resetMovementFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.reset') }}</span>
          </button>
        </div>
      </div>

      <div v-if="isLoadingMovements" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('inventory.loadingMovements') }}</div>
      </div>

      <div v-else-if="movementsList.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-journal-x"></i>
        </div>
        <div class="empty-box__title">{{ $t('inventory.noMovementsFound') }}</div>
        <div class="empty-box__desc">{{ $t('inventory.noMovementsFoundDesc') }}</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table mobile-card-table align-middle mb-0">
          <thead>
            <tr>
              <th>{{ $t('orders.colDateTime') }}</th>
              <th>{{ $t('inventory.colIngredient') }}</th>
              <th>{{ $t('inventory.colMovementType') }}</th>
              <th>{{ $t('inventory.colQuantityChange') }}</th>
              <th>{{ $t('inventory.colUnitCostTotal') }}</th>
              <th>{{ $t('inventory.colReasonOrder') }}</th>
              <th>{{ $t('inventory.colRecordedBy') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mov in movementsList" :key="mov.id">
              <td>
                <span class="ing-name-text d-md-none">{{ mov.ingredient_name }}</span>
                <div class="date-cell tabular">
                  <span class="date-cell__time">{{ formatDateTime(mov.created_at) }}</span>
                  <span class="date-cell__id">#{{ mov.id }}</span>
                </div>
              </td>
              <td class="d-none d-md-table-cell">
                <span class="ing-name-text">{{ mov.ingredient_name }}</span>
              </td>
              <td :data-label="$t('inventory.colMovementType')">
                <span class="mov-badge" :class="mov.movement_type.toLowerCase()">
                  <i
                    class="bi"
                    :class="
                      mov.movement_type === 'PURCHASE'
                        ? 'bi-box-arrow-in-down'
                        : mov.movement_type === 'SALE'
                          ? 'bi-cart-check'
                          : mov.movement_type === 'WASTE'
                            ? 'bi-trash3'
                            : mov.movement_type === 'RETURN'
                              ? 'bi-arrow-counterclockwise'
                              : 'bi-sliders'
                    "
                  ></i>
                  <span>{{ getMovementTypeLabel(mov.movement_type) }}</span>
                </span>
              </td>
              <td :data-label="$t('inventory.colQuantityChange')">
                <span
                  class="qty-change-pill tabular"
                  :class="Number(mov.quantity_change) >= 0 ? 'is-plus' : 'is-minus'"
                >
                  {{ Number(mov.quantity_change) > 0 ? '+' : '' }}{{ formatStockQty(mov.quantity_change) }}
                  {{ mov.ingredient_unit }}
                </span>
              </td>
              <td :data-label="$t('inventory.colUnitCostTotal')">
                <div v-if="mov.unit_cost !== null && mov.unit_cost !== undefined" class="cost-cell tabular">
                  <strong class="cost-cell__total">{{ formatUsd(mov.total_cost) }}</strong>
                  <span class="cost-cell__unit">{{ formatUsd(mov.unit_cost) }} / {{ mov.ingredient_unit }}</span>
                </div>
                <span v-else class="small text-muted">—</span>
              </td>
              <td :data-label="$t('inventory.colReasonOrder')">
                <div>
                  <div v-if="mov.order_receipt_no" class="mb-1">
                    <span class="order-ref-badge tabular">
                      <i class="bi bi-receipt"></i>
                      <span>{{ mov.order_receipt_no }}</span>
                    </span>
                  </div>
                  <div v-if="mov.reason" class="reason-text">
                    {{ mov.reason }}
                  </div>
                  <span v-if="!mov.order_receipt_no && !mov.reason" class="small text-muted">—</span>
                </div>
              </td>
              <td :data-label="$t('inventory.colRecordedBy')">
                <span class="recorder-name">{{ mov.created_by_name || $t('common.system') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="movementPagination.totalPages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: movementPagination.page, total: movementPagination.totalPages }) }}
          ({{ movementPagination.total }})
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="movementPagination.page <= 1"
            @click="fetchMovements(movementPagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="movementPagination.page >= movementPagination.totalPages"
            @click="fetchMovements(movementPagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 1: CREATE / EDIT INGREDIENT ================= -->
    <div v-if="showIngredientModal" class="modal-backdrop-custom" @click.self="showIngredientModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">
            {{ editingIngredient ? $t('inventory.editIngredient') : $t('inventory.addNewIngredient') }}
          </h6>
          <button type="button" class="btn-close-custom" @click="showIngredientModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSaveIngredient">
          <div class="modal-body-custom">
            <div class="mb-3">
              <label class="form-label-clean">{{ $t('inventory.ingredientNameLabel') }} <span class="text-danger">*</span></label>
              <input
                v-model="ingredientForm.name"
                type="text"
                class="form-control form-control-clean"
                :placeholder="$t('inventory.ingredientNamePlaceholder')"
                maxlength="150"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('inventory.measurementUnitLabel') }} <span class="text-danger">*</span></label>
              <div class="option-pills">
                <button
                  v-for="u in ['G', 'ML', 'PCS']"
                  :key="u"
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: ingredientForm.unit === u }"
                  :disabled="editingIngredient && editingIngredient.total_recipes > 0 && editingIngredient.unit !== u"
                  @click="ingredientForm.unit = u"
                >
                  {{ u === 'G' ? $t('inventory.grams') : u === 'ML' ? $t('inventory.milliliters') : $t('inventory.pieces') }}
                </button>
              </div>
              <div
                v-if="editingIngredient && editingIngredient.total_recipes > 0"
                class="form-text small text-muted mt-1"
              >
                Unit cannot be changed while used in {{ editingIngredient.total_recipes }} recipe(s).
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label-clean">
                  {{ editingIngredient ? $t('inventory.colCurrentStock') : $t('inventory.initialStock') }}
                </label>
                <div class="input-group input-group-sm">
                  <input
                    v-model.number="ingredientForm.current_stock"
                    type="number"
                    step="0.01"
                    min="0"
                    class="form-control form-control-clean"
                    required
                  />
                  <span class="input-group-text bg-light">{{ ingredientForm.unit }}</span>
                </div>
              </div>

              <div class="col-6">
                <label class="form-label-clean">{{ $t('inventory.lowStockAlertAt') }}</label>
                <div class="input-group input-group-sm">
                  <input
                    v-model.number="ingredientForm.minimum_stock"
                    type="number"
                    step="0.01"
                    min="0"
                    class="form-control form-control-clean"
                    required
                  />
                  <span class="input-group-text bg-light">{{ ingredientForm.unit }}</span>
                </div>
              </div>
            </div>

            <div class="form-check form-switch">
              <input
                id="ingActiveSwitch"
                v-model="ingredientForm.is_active"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label small fw-semibold" for="ingActiveSwitch">
                {{ $t('inventory.activeIngredientCheck') }}
              </label>
            </div>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="btn btn-light-coffee" @click="showIngredientModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-coffee flex-grow-1" :disabled="isSavingIngredient">
              <span v-if="isSavingIngredient" class="spinner-border spinner-border-sm me-1"></span>
              {{ editingIngredient ? $t('common.saveChanges') : $t('inventory.createIngredient') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL 2: RECORD STOCK MOVEMENT ================= -->
    <div v-if="showMovementModal" class="modal-backdrop-custom" @click.self="showMovementModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">{{ $t('inventory.recordStockMovementTitle') }}</h6>
          <button type="button" class="btn-close-custom" @click="showMovementModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSaveMovement">
          <div class="modal-body-custom">
            <div class="mb-3">
              <label class="form-label-clean">{{ $t('inventory.colIngredient') }} <span class="text-danger">*</span></label>
              <select
                v-model.number="movementForm.ingredient_id"
                class="form-select form-control-clean"
                required
              >
                <option :value="null" disabled>{{ $t('inventory.selectActiveIngredient') }}</option>
                <option
                  v-for="ing in activeIngredientsDropdown"
                  :key="ing.id"
                  :value="ing.id"
                >
                  {{ ing.name }} ({{ formatStockQty(ing.current_stock) }} {{ ing.unit }})
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label-clean">{{ $t('inventory.colMovementType') }} <span class="text-danger">*</span></label>
              <div class="option-pills">
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: movementForm.movement_type === 'PURCHASE' }"
                  @click="movementForm.movement_type = 'PURCHASE'"
                >
                  {{ $t('inventory.purchasePlus') }}
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: movementForm.movement_type === 'WASTE' }"
                  @click="movementForm.movement_type = 'WASTE'"
                >
                  {{ $t('inventory.wasteMinus') }}
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: movementForm.movement_type === 'ADJUSTMENT' }"
                  @click="movementForm.movement_type = 'ADJUSTMENT'"
                >
                  {{ $t('inventory.adjustmentPlusMinus') }}
                </button>
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div :class="movementForm.movement_type === 'PURCHASE' ? 'col-6' : 'col-12'">
                <label class="form-label-clean">
                  {{ $t('receipt.colQty') }}
                  <span v-if="selectedMovementIngredient">
                    ({{ selectedMovementIngredient.unit }})
                  </span>
                  <span class="text-danger">*</span>
                </label>
                <input
                  v-model.number="movementForm.quantity"
                  type="number"
                  step="0.01"
                  :min="movementForm.movement_type === 'ADJUSTMENT' ? undefined : 0.01"
                  class="form-control form-control-clean"
                  :placeholder="movementForm.movement_type === 'ADJUSTMENT' ? 'e.g. 500 or -200' : 'e.g. 1000'"
                  required
                />
              </div>

              <div v-if="movementForm.movement_type === 'PURCHASE'" class="col-6">
                <label class="form-label-clean">{{ $t('inventory.unitCostOptional') }}</label>
                <input
                  v-model.number="movementForm.unit_cost"
                  type="number"
                  step="0.0001"
                  min="0"
                  class="form-control form-control-clean"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div class="mb-1">
              <label class="form-label-clean">
                {{ $t('inventory.reasonNoteLabel') }}
                <span v-if="movementForm.movement_type !== 'PURCHASE'" class="text-danger">*</span>
              </label>
              <textarea
                v-model="movementForm.reason"
                rows="2"
                class="form-control form-control-clean"
                :placeholder="
                  movementForm.movement_type === 'PURCHASE'
                    ? 'Optional supplier or invoice note...'
                    : 'Required: explain why stock was wasted or adjusted...'
                "
                :required="movementForm.movement_type !== 'PURCHASE'"
                maxlength="500"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="btn btn-light-coffee" @click="showMovementModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-coffee flex-grow-1" :disabled="isSavingMovement">
              <span v-if="isSavingMovement" class="spinner-border spinner-border-sm me-1"></span>
              {{ $t('inventory.saveStockMovement') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL 3: DELETE INGREDIENT CONFIRMATION ================= -->
    <div v-if="deleteIngredientModal.show" class="modal-backdrop-custom" @click.self="deleteIngredientModal.show = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold text-danger">{{ $t('inventory.deleteIngredientTitle') }}</h6>
          <button type="button" class="btn-close-custom" @click="deleteIngredientModal.show = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <p class="small text-muted mb-0">
            {{ $t('inventory.deleteIngredientDesc', { name: deleteIngredientModal.name }) }}
          </p>
        </div>

        <div class="modal-footer-custom">
          <button
            type="button"
            class="btn btn-light-coffee"
            :disabled="deleteIngredientModal.isDeleting"
            @click="deleteIngredientModal.show = false"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-danger flex-grow-1"
            :disabled="deleteIngredientModal.isDeleting"
            @click="handleConfirmDeleteIngredient"
          >
            <span v-if="deleteIngredientModal.isDeleting" class="spinner-border spinner-border-sm me-1"></span>
            {{ $t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'
import { useI18n } from '@/i18n'
import { useDebounce } from '@/composables/useDebounce'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()
const { formatDateTime } = useFormatDate()
const { t } = useI18n()

const getMovementTypeLabel = (type) => {
  if (type === 'PURCHASE') return t('inventory.purchasePlus').replace(/\s*\(\+\)\s*$/, '')
  if (type === 'SALE') return t('inventory.saleMinus').replace(/\s*\(-\)\s*$/, '')
  if (type === 'WASTE') return t('inventory.wasteMinus').replace(/\s*\(-\)\s*$/, '')
  if (type === 'ADJUSTMENT') return t('inventory.adjustmentPlusMinus').replace(/\s*\(\+\/-\)\s*$/, '')
  if (type === 'RETURN') return t('inventory.returnPlus').replace(/\s*\(\+\)\s*$/, '')
  return type || '—'
}

const activeTab = ref('INGREDIENTS')

// ================= STATE: INGREDIENTS =================
const ingredientsList = ref([])
const allIngredientsDropdown = ref([])
const isLoadingIngredients = ref(false)
const lowStockCount = ref(0)

const ingredientPagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
})

const ingredientFilters = reactive({
  search: '',
  unit: '',
  is_active: '',
  low_stock: false,
})

// ================= STATE: STOCK MOVEMENTS =================
const movementsList = ref([])
const isLoadingMovements = ref(false)
const movementPagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
})

const movementFilters = reactive({
  ingredient_id: '',
  movement_type: '',
  start_date: '',
  end_date: '',
})

// ================= STATE: MODALS =================
const showIngredientModal = ref(false)
const editingIngredient = ref(null)
const isSavingIngredient = ref(false)

const ingredientForm = reactive({
  name: '',
  unit: 'G',
  current_stock: 0,
  minimum_stock: 0,
  is_active: true,
})

const showMovementModal = ref(false)
const isSavingMovement = ref(false)
const movementForm = reactive({
  ingredient_id: null,
  movement_type: 'PURCHASE',
  quantity: null,
  unit_cost: null,
  reason: '',
})

// ================= COMPUTED =================
const ingredientsSummary = computed(() => {
  const total = allIngredientsDropdown.value.length
  const low = allIngredientsDropdown.value.filter((i) => i.is_active && i.is_low_stock).length
  return {
    total,
    healthy: Math.max(0, total - low),
  }
})

const activeIngredientsDropdown = computed(() =>
  allIngredientsDropdown.value.filter((i) => i.is_active)
)

const selectedMovementIngredient = computed(() =>
  allIngredientsDropdown.value.find((i) => i.id === movementForm.ingredient_id)
)

// ================= METHODS: HELPERS =================
const formatStockQty = (val) => {
  const n = Number(val) || 0
  return Number.isInteger(n) ? n.toLocaleString() : Number(n.toFixed(2)).toLocaleString()
}

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'INGREDIENTS') fetchIngredients(1)
  if (tab === 'MOVEMENTS') fetchMovements(1)
}

// ================= METHODS: FETCH INGREDIENTS =================
const fetchAllIngredientsSummary = async () => {
  try {
    const res = await api.get('/inventory/ingredients')
    allIngredientsDropdown.value = res.data?.data || []
    lowStockCount.value = allIngredientsDropdown.value.filter(
      (i) => i.is_active && i.is_low_stock
    ).length
  } catch {
    // ignore
  }
}

const fetchIngredients = async (page = 1) => {
  isLoadingIngredients.value = true
  try {
    const params = {
      page,
      limit: ingredientPagination.limit,
    }
    if (ingredientFilters.search?.trim()) params.search = ingredientFilters.search.trim()
    if (ingredientFilters.unit) params.unit = ingredientFilters.unit
    if (ingredientFilters.is_active !== '') params.is_active = ingredientFilters.is_active
    if (ingredientFilters.low_stock) params.low_stock = true

    const res = await api.get('/inventory/ingredients', { params })
    ingredientsList.value = res.data?.data || []
    if (res.data?.pagination) {
      Object.assign(ingredientPagination, res.data.pagination)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load ingredients')
  } finally {
    isLoadingIngredients.value = false
  }
}

const toggleLowStockQuickFilter = () => {
  activeTab.value = 'INGREDIENTS'
  ingredientFilters.low_stock = !ingredientFilters.low_stock
  fetchIngredients(1)
}

const resetIngredientFilters = () => {
  ingredientFilters.search = ''
  ingredientFilters.unit = ''
  ingredientFilters.is_active = ''
  ingredientFilters.low_stock = false
  fetchIngredients(1)
}

const debouncedFetchIngredients = useDebounce(() => fetchIngredients(1), 300)

watch(
  () => ingredientFilters.search,
  () => {
    debouncedFetchIngredients()
  }
)

// ================= METHODS: FETCH MOVEMENTS =================
const fetchMovements = async (page = 1) => {
  isLoadingMovements.value = true
  try {
    const params = {
      page,
      limit: movementPagination.limit,
    }
    if (movementFilters.ingredient_id) params.ingredient_id = movementFilters.ingredient_id
    if (movementFilters.movement_type) params.movement_type = movementFilters.movement_type
    if (movementFilters.start_date) params.start_date = movementFilters.start_date
    if (movementFilters.end_date) params.end_date = movementFilters.end_date

    const res = await api.get('/inventory/stock-movements', { params })
    movementsList.value = res.data?.data || []
    if (res.data?.pagination) {
      Object.assign(movementPagination, res.data.pagination)
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load stock movements')
  } finally {
    isLoadingMovements.value = false
  }
}

const resetMovementFilters = () => {
  movementFilters.ingredient_id = ''
  movementFilters.movement_type = ''
  movementFilters.start_date = ''
  movementFilters.end_date = ''
  fetchMovements(1)
}

const viewIngredientMovements = (ing) => {
  movementFilters.ingredient_id = ing.id
  activeTab.value = 'MOVEMENTS'
  fetchMovements(1)
}

// ================= METHODS: CREATE / EDIT / DELETE INGREDIENT =================
const openCreateIngredientModal = () => {
  editingIngredient.value = null
  ingredientForm.name = ''
  ingredientForm.unit = 'G'
  ingredientForm.current_stock = 0
  ingredientForm.minimum_stock = 0
  ingredientForm.is_active = true
  showIngredientModal.value = true
}

const openEditIngredientModal = (ing) => {
  editingIngredient.value = ing
  ingredientForm.name = ing.name
  ingredientForm.unit = ing.unit
  ingredientForm.current_stock = Number(ing.current_stock) || 0
  ingredientForm.minimum_stock = Number(ing.minimum_stock) || 0
  ingredientForm.is_active = Boolean(ing.is_active)
  showIngredientModal.value = true
}

const handleSaveIngredient = async () => {
  if (!ingredientForm.name.trim()) {
    toast.warning('Ingredient name is required')
    return
  }
  isSavingIngredient.value = true
  try {
    const payload = {
      name: ingredientForm.name.trim(),
      unit: ingredientForm.unit,
      current_stock: Number(ingredientForm.current_stock) || 0,
      minimum_stock: Number(ingredientForm.minimum_stock) || 0,
      is_active: Boolean(ingredientForm.is_active),
    }

    if (editingIngredient.value) {
      await api.put(`/inventory/ingredients/${editingIngredient.value.id}`, payload)
      toast.success(`Ingredient '${payload.name}' updated`)
    } else {
      await api.post('/inventory/ingredients', payload)
      toast.success(`Ingredient '${payload.name}' created`)
    }

    showIngredientModal.value = false
    await Promise.all([fetchIngredients(ingredientPagination.page), fetchAllIngredientsSummary()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save ingredient')
  } finally {
    isSavingIngredient.value = false
  }
}

const deleteIngredientModal = reactive({
  show: false,
  id: null,
  name: '',
  isDeleting: false,
})

const confirmDeleteIngredient = (ing) => {
  deleteIngredientModal.id = ing.id
  deleteIngredientModal.name = ing.name
  deleteIngredientModal.show = true
}

const handleConfirmDeleteIngredient = async () => {
  if (!deleteIngredientModal.id || deleteIngredientModal.isDeleting) return
  deleteIngredientModal.isDeleting = true
  try {
    await api.delete(`/inventory/ingredients/${deleteIngredientModal.id}`)
    toast.success(`Ingredient '${deleteIngredientModal.name}' deleted`)
    deleteIngredientModal.show = false
    await Promise.all([fetchIngredients(ingredientPagination.page), fetchAllIngredientsSummary()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Cannot delete ingredient')
  } finally {
    deleteIngredientModal.isDeleting = false
  }
}

// ================= METHODS: RECORD STOCK MOVEMENT =================
const openStockMovementModal = (preselectedIng = null) => {
  movementForm.ingredient_id = preselectedIng ? preselectedIng.id : (activeIngredientsDropdown.value[0]?.id || null)
  movementForm.movement_type = 'PURCHASE'
  movementForm.quantity = null
  movementForm.unit_cost = null
  movementForm.reason = ''
  showMovementModal.value = true
}

const handleSaveMovement = async () => {
  if (!movementForm.ingredient_id) {
    toast.warning('Please select an ingredient')
    return
  }
  if (!movementForm.quantity || Number(movementForm.quantity) === 0) {
    toast.warning('Quantity cannot be 0')
    return
  }
  if (movementForm.movement_type !== 'PURCHASE' && !movementForm.reason.trim()) {
    toast.warning(`Reason is required for ${movementForm.movement_type} movements`)
    return
  }

  isSavingMovement.value = true
  try {
    const payload = {
      ingredient_id: Number(movementForm.ingredient_id),
      movement_type: movementForm.movement_type,
      quantity: Number(movementForm.quantity),
      reason: movementForm.reason.trim() || null,
    }
    if (
      movementForm.movement_type === 'PURCHASE' &&
      movementForm.unit_cost !== null &&
      movementForm.unit_cost !== ''
    ) {
      payload.unit_cost = Number(movementForm.unit_cost)
    }

    await api.post('/inventory/stock-movements', payload)
    toast.success('Stock movement recorded successfully')
    showMovementModal.value = false

    await Promise.all([
      fetchIngredients(ingredientPagination.page),
      fetchAllIngredientsSummary(),
      activeTab.value === 'MOVEMENTS' ? fetchMovements(1) : Promise.resolve(),
    ])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to record stock movement')
  } finally {
    isSavingMovement.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchIngredients(1), fetchAllIngredientsSummary()])
})
</script>

<style scoped>
.inventory-page {
  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
}

/* ── Top Bar: Segmented Tabs & Primary Actions ── */
.inventory-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.inventory-segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #e9f0ec;
  border: 1px solid var(--ledger-line);
  border-radius: 10px;
}

.low-stock-count-pill {
  background: #dc2626;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.08rem 0.48rem;
  border-radius: 999px;
}

.inventory-top-bar__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.toolbar-btn.is-warning-active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
  font-weight: 700;
}

/* Ingredient Name Cell */
.ing-name-text {
  font-weight: 700;
  color: var(--roast-ink);
  font-size: 0.86rem;
}

/* Stock Quantity & Unit Tag */
.stock-qty-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
}

.stock-qty-val {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--roast-ink);
}

.stock-qty-val.is-low {
  color: #b45309;
}

.stock-qty-val.is-out {
  color: #dc2626;
}

.min-stock-val {
  font-size: 0.84rem;
  font-weight: 600;
  color: #4b5e52;
}

.unit-tag {
  font-size: 0.74rem;
  font-weight: 600;
  color: #6c7f74;
}

/* Stock Health Text */
.stock-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.stock-text.ok {
  color: #166534;
}

.stock-text.low {
  color: #b45309;
}

.stock-text.out {
  color: #dc2626;
}

.recipes-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--roast-ink);
}

/* Movements Tab Cells & Badges */
.date-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  white-space: nowrap;
}

.date-cell__time {
  font-weight: 600;
  color: var(--roast-ink);
  font-size: 0.81rem;
}

.date-cell__id {
  font-size: 0.71rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.mov-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.mov-badge.purchase {
  color: #166534;
}

.mov-badge.sale {
  color: #0369a1;
}

.mov-badge.waste {
  color: #b91c1c;
}

.mov-badge.adjustment {
  color: #b45309;
}

.mov-badge.return {
  color: #7e22ce;
}

.qty-change-pill {
  display: inline-block;
  font-size: 0.86rem;
  font-weight: 800;
  white-space: nowrap;
}

.qty-change-pill.is-plus {
  color: #15803d;
}

.qty-change-pill.is-minus {
  color: #dc2626;
}

.cost-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  white-space: nowrap;
}

.cost-cell__total {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--roast-ink);
}

.cost-cell__unit {
  font-size: 0.72rem;
  color: var(--sage-muted);
}

.order-ref-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--botanical-deep);
  font-size: 0.78rem;
  font-weight: 700;
}

.reason-text {
  font-size: 0.8rem;
  color: #4a5c51;
}

.recorder-name {
  font-size: 0.81rem;
  font-weight: 600;
  color: #35473c;
  white-space: nowrap;
}

.btn-action-icon.is-adjust {
  background: #eef7f1;
  border-color: #c7e0d0;
  color: var(--botanical-primary);
}

.btn-action-icon.is-adjust:hover {
  background: var(--botanical-primary);
  border-color: var(--botanical-primary);
  color: #ffffff;
}

@media (max-width: 767.98px) {
  .inventory-top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
    margin-bottom: 0.7rem;
  }

  .inventory-top-bar__right {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .inventory-top-bar__right > button {
    width: 100%;
    justify-content: center;
    height: 42px;
    border-radius: 11px;
  }
}
</style>
