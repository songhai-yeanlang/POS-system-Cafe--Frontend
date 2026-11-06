<template>
  <div class="inventory-page">
    <!-- Clean Tab Switcher & Primary Actions -->
    <div class="inventory-nav-tabs d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div class="d-flex align-items-center gap-4">
        <button
          type="button"
          class="nav-tab-btn"
          :class="{ active: activeTab === 'INGREDIENTS' }"
          @click="switchTab('INGREDIENTS')"
        >
          <i class="bi bi-boxes"></i>
          <span>Ingredients</span>
          <span v-if="lowStockCount > 0" class="low-stock-count-pill ms-1">
            {{ lowStockCount }} Low
          </span>
        </button>
        <button
          type="button"
          class="nav-tab-btn"
          :class="{ active: activeTab === 'MOVEMENTS' }"
          @click="switchTab('MOVEMENTS')"
        >
          <i class="bi bi-arrow-left-right"></i>
          <span>Stock Movements</span>
        </button>
      </div>

      <div v-if="authStore.isOwner" class="d-flex align-items-center gap-2 pb-2">
        <button
          type="button"
          class="btn btn-outline-coffee btn-sm"
          @click="openStockMovementModal()"
        >
          <i class="bi bi-plus-slash-minus me-1"></i>Record Movement
        </button>
        <button
          type="button"
          class="btn btn-coffee btn-sm"
          @click="openCreateIngredientModal"
        >
          <i class="bi bi-plus-lg me-1"></i>Add Ingredient
        </button>
      </div>
    </div>

    <!-- ================= TAB 1: INGREDIENTS ================= -->
    <div v-if="activeTab === 'INGREDIENTS'" class="clean-card">
      <div class="filter-bar">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="ingredientFilters.search"
              type="text"
              class="form-control form-control-sm search-input"
              placeholder="Search ingredient name..."
              @keyup.enter="fetchIngredients(1)"
            />
          </div>

          <select
            v-model="ingredientFilters.unit"
            class="form-select form-select-sm filter-select"
            @change="fetchIngredients(1)"
          >
            <option value="">All Units</option>
            <option value="G">Grams (G)</option>
            <option value="ML">Milliliters (ML)</option>
            <option value="PCS">Pieces (PCS)</option>
          </select>

          <select
            v-model="ingredientFilters.is_active"
            class="form-select form-select-sm filter-select"
            @change="fetchIngredients(1)"
          >
            <option value="">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive</option>
          </select>

          <button
            type="button"
            class="btn btn-sm"
            :class="ingredientFilters.low_stock ? 'btn-warning text-dark fw-bold' : 'btn-light-coffee'"
            @click="toggleLowStockQuickFilter"
          >
            <i class="bi bi-exclamation-circle me-1"></i>Low Stock Only
          </button>
        </div>

        <button
          type="button"
          class="btn btn-light-coffee btn-sm"
          @click="resetIngredientFilters"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
        </button>
      </div>

      <!-- Loading / Empty / Table -->
      <div v-if="isLoadingIngredients" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">Loading ingredients...</div>
      </div>

      <div v-else-if="ingredientsList.length === 0" class="empty-box">
        <i class="bi bi-boxes fs-2 text-muted mb-2 d-block"></i>
        <div class="fw-semibold text-dark">No Ingredients Found</div>
        <div class="small text-muted">Add raw ingredients to track stock and build drink recipes.</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Current Stock</th>
              <th>Min Alert</th>
              <th>Stock Health</th>
              <th>Recipes</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ing in ingredientsList" :key="ing.id">
              <td>
                <div class="fw-semibold text-dark">{{ ing.name }}</div>
              </td>
              <td>
                <span
                  class="fw-bold"
                  :class="ing.is_low_stock ? 'text-danger' : 'text-dark'"
                >
                  {{ formatStockQty(ing.current_stock) }}
                </span>
                <span class="small text-muted ms-1">{{ ing.unit }}</span>
              </td>
              <td>
                <span class="text-muted small">
                  {{ formatStockQty(ing.minimum_stock) }} {{ ing.unit }}
                </span>
              </td>
              <td>
                <span
                  v-if="Number(ing.current_stock) <= 0"
                  class="stock-pill out"
                >
                  Out of Stock
                </span>
                <span
                  v-else-if="ing.is_low_stock"
                  class="stock-pill low"
                >
                  Low Stock
                </span>
                <span v-else class="stock-pill ok">
                  In Stock
                </span>
              </td>
              <td>
                <span class="text-muted small">
                  {{ ing.total_recipes || 0 }}
                </span>
              </td>
              <td>
                <span
                  class="status-dot-badge"
                  :class="ing.is_active ? 'active' : 'inactive'"
                >
                  {{ ing.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="text-end">
                <div class="d-inline-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-action-icon"
                    title="View Movement History"
                    @click="viewIngredientMovements(ing)"
                  >
                    <i class="bi bi-clock-history"></i>
                  </button>

                  <template v-if="authStore.isOwner">
                    <button
                      v-if="ing.is_active"
                      type="button"
                      class="btn btn-action-icon text-success"
                      title="Restock / Adjust Stock"
                      @click="openStockMovementModal(ing)"
                    >
                      <i class="bi bi-plus-slash-minus"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-action-icon text-primary"
                      title="Edit Ingredient"
                      @click="openEditIngredientModal(ing)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-action-icon text-danger"
                      title="Delete Ingredient"
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
        <div class="small text-muted">
          Page {{ ingredientPagination.page }} of {{ ingredientPagination.totalPages }}
        </div>
        <div class="d-flex gap-1">
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="ingredientPagination.page <= 1"
            @click="fetchIngredients(ingredientPagination.page - 1)"
          >
            Prev
          </button>
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="ingredientPagination.page >= ingredientPagination.totalPages"
            @click="fetchIngredients(ingredientPagination.page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- ================= TAB 2: STOCK MOVEMENTS LEDGER ================= -->
    <div v-if="activeTab === 'MOVEMENTS'" class="clean-card">
      <div class="filter-bar">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <select
            v-model="movementFilters.ingredient_id"
            class="form-select form-select-sm filter-select"
            @change="fetchMovements(1)"
          >
            <option value="">All Ingredients</option>
            <option v-for="ing in allIngredientsDropdown" :key="ing.id" :value="ing.id">
              {{ ing.name }} ({{ ing.unit }})
            </option>
          </select>

          <select
            v-model="movementFilters.movement_type"
            class="form-select form-select-sm filter-select"
            @change="fetchMovements(1)"
          >
            <option value="">All Movement Types</option>
            <option value="PURCHASE">Purchase (+)</option>
            <option value="SALE">Order Sale (-)</option>
            <option value="WASTE">Waste (-)</option>
            <option value="ADJUSTMENT">Adjustment (+/-)</option>
            <option value="RETURN">Refund Return (+)</option>
          </select>

          <input
            v-model="movementFilters.start_date"
            type="date"
            class="form-control form-control-sm filter-date"
            @change="fetchMovements(1)"
          />
          <input
            v-model="movementFilters.end_date"
            type="date"
            class="form-control form-control-sm filter-date"
            @change="fetchMovements(1)"
          />
        </div>

        <button
          type="button"
          class="btn btn-light-coffee btn-sm"
          @click="resetMovementFilters"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
        </button>
      </div>

      <div v-if="isLoadingMovements" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">Loading stock movements...</div>
      </div>

      <div v-else-if="movementsList.length === 0" class="empty-box">
        <i class="bi bi-journal-x fs-2 text-muted mb-2 d-block"></i>
        <div class="fw-semibold text-dark">No Stock Movements Found</div>
        <div class="small text-muted">Stock additions, sales deductions, and adjustments appear here.</div>
      </div>

      <div v-else class="table-responsive">
        <table class="table clean-table align-middle mb-0">
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Ingredient</th>
              <th>Movement Type</th>
              <th>Quantity Change</th>
              <th>Unit Cost / Total</th>
              <th>Reason / Order</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mov in movementsList" :key="mov.id">
              <td>
                <div class="small text-dark">{{ formatDateTime(mov.created_at) }}</div>
                <div class="text-muted" style="font-size: 0.7rem">#{{ mov.id }}</div>
              </td>
              <td>
                <div class="fw-bold text-dark">{{ mov.ingredient_name }}</div>
              </td>
              <td>
                <span class="mov-badge" :class="mov.movement_type.toLowerCase()">
                  {{ mov.movement_type }}
                </span>
              </td>
              <td>
                <span
                  class="fw-bold"
                  :class="Number(mov.quantity_change) >= 0 ? 'text-success' : 'text-danger'"
                >
                  {{ Number(mov.quantity_change) > 0 ? '+' : '' }}{{ formatStockQty(mov.quantity_change) }}
                  {{ mov.ingredient_unit }}
                </span>
              </td>
              <td>
                <div v-if="mov.unit_cost !== null && mov.unit_cost !== undefined" class="small">
                  <div class="fw-semibold">{{ formatUsd(mov.total_cost) }} total</div>
                  <div class="text-muted">{{ formatUsd(mov.unit_cost) }} / {{ mov.ingredient_unit }}</div>
                </div>
                <span v-else class="small text-muted">—</span>
              </td>
              <td>
                <div v-if="mov.order_receipt_no" class="small">
                  <span class="badge bg-light text-dark border">
                    Order {{ mov.order_receipt_no }}
                  </span>
                </div>
                <div v-if="mov.reason" class="small text-muted">
                  {{ mov.reason }}
                </div>
                <span v-if="!mov.order_receipt_no && !mov.reason" class="small text-muted">—</span>
              </td>
              <td>
                <span class="small fw-semibold">{{ mov.created_by_name || 'System' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="movementPagination.totalPages > 1" class="pagination-bar">
        <div class="small text-muted">
          Page {{ movementPagination.page }} of {{ movementPagination.totalPages }}
          ({{ movementPagination.total }} records)
        </div>
        <div class="d-flex gap-1">
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="movementPagination.page <= 1"
            @click="fetchMovements(movementPagination.page - 1)"
          >
            Prev
          </button>
          <button
            type="button"
            class="btn btn-light-coffee btn-sm"
            :disabled="movementPagination.page >= movementPagination.totalPages"
            @click="fetchMovements(movementPagination.page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 1: CREATE / EDIT INGREDIENT ================= -->
    <div v-if="showIngredientModal" class="modal-backdrop-custom" @click.self="showIngredientModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">
            {{ editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient' }}
          </h6>
          <button type="button" class="btn-close-custom" @click="showIngredientModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSaveIngredient">
          <div class="modal-body-custom">
            <div class="mb-3">
              <label class="form-label-clean">Ingredient Name <span class="text-danger">*</span></label>
              <input
                v-model="ingredientForm.name"
                type="text"
                class="form-control form-control-clean"
                placeholder="e.g. Espresso Beans, Fresh Milk, Paper Cup 16oz"
                maxlength="150"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label-clean">Measurement Unit <span class="text-danger">*</span></label>
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
                  {{ u === 'G' ? 'Grams (G)' : u === 'ML' ? 'Milliliters (ML)' : 'Pieces (PCS)' }}
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
                  {{ editingIngredient ? 'Current Stock' : 'Initial Stock' }}
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
                <label class="form-label-clean">Low-Stock Alert At</label>
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
                Active (Available for Recipes & Stock Movements)
              </label>
            </div>
          </div>

          <div class="modal-footer-custom">
            <button type="button" class="btn btn-light-coffee" @click="showIngredientModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-coffee flex-grow-1" :disabled="isSavingIngredient">
              <span v-if="isSavingIngredient" class="spinner-border spinner-border-sm me-1"></span>
              {{ editingIngredient ? 'Save Changes' : 'Create Ingredient' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================= MODAL 2: RECORD STOCK MOVEMENT ================= -->
    <div v-if="showMovementModal" class="modal-backdrop-custom" @click.self="showMovementModal = false">
      <div class="modal-card-custom modal-sm-custom">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold">Record Stock Movement</h6>
          <button type="button" class="btn-close-custom" @click="showMovementModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSaveMovement">
          <div class="modal-body-custom">
            <div class="mb-3">
              <label class="form-label-clean">Ingredient <span class="text-danger">*</span></label>
              <select
                v-model.number="movementForm.ingredient_id"
                class="form-select form-control-clean"
                required
              >
                <option :value="null" disabled>Select an active ingredient...</option>
                <option
                  v-for="ing in activeIngredientsDropdown"
                  :key="ing.id"
                  :value="ing.id"
                >
                  {{ ing.name }} (Current: {{ formatStockQty(ing.current_stock) }} {{ ing.unit }})
                </option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label-clean">Movement Type <span class="text-danger">*</span></label>
              <div class="option-pills">
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: movementForm.movement_type === 'PURCHASE' }"
                  @click="movementForm.movement_type = 'PURCHASE'"
                >
                  Purchase (+)
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: movementForm.movement_type === 'WASTE' }"
                  @click="movementForm.movement_type = 'WASTE'"
                >
                  Waste (-)
                </button>
                <button
                  type="button"
                  class="opt-pill flex-grow-1"
                  :class="{ active: movementForm.movement_type === 'ADJUSTMENT' }"
                  @click="movementForm.movement_type = 'ADJUSTMENT'"
                >
                  Adjust (+/-)
                </button>
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div :class="movementForm.movement_type === 'PURCHASE' ? 'col-6' : 'col-12'">
                <label class="form-label-clean">
                  Quantity
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
                <div v-if="movementForm.movement_type === 'ADJUSTMENT'" class="form-text small">
                  Use positive number to add stock or negative (e.g. -100) to deduct.
                </div>
              </div>

              <div v-if="movementForm.movement_type === 'PURCHASE'" class="col-6">
                <label class="form-label-clean">Unit Cost ($ Optional)</label>
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
                Reason / Note
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
              Cancel
            </button>
            <button type="submit" class="btn btn-coffee flex-grow-1" :disabled="isSavingMovement">
              <span v-if="isSavingMovement" class="spinner-border spinner-border-sm me-1"></span>
              Save Stock Movement
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'
import { useFormatDate } from '@/composables/useFormatDate'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()
const { formatDateTime } = useFormatDate()

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

const confirmDeleteIngredient = async (ing) => {
  if (!window.confirm(`Delete ingredient "${ing.name}"?`)) return
  try {
    await api.delete(`/inventory/ingredients/${ing.id}`)
    toast.success(`Ingredient '${ing.name}' deleted`)
    await Promise.all([fetchIngredients(ingredientPagination.page), fetchAllIngredientsSummary()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Cannot delete ingredient')
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
.page-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.inventory-nav-tabs {
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
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

.low-stock-count-pill {
  background: #dc2626;
  color: #ffffff;
  font-size: 0.68rem;
  padding: 0.08rem 0.45rem;
  border-radius: 999px;
  margin-left: 4px;
}

/* KPI Strip */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.85rem;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 14px;
  padding: 0.9rem 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.kpi-card.clickable {
  cursor: pointer;
}

.kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.bg-coffee-soft {
  background: #f4eee8;
  color: #2c1810;
}

.bg-success-soft {
  background: #dcfce7;
  color: #15803d;
}

.bg-warning-soft {
  background: #fef3c7;
  color: #b45309;
}

.kpi-label {
  font-size: 0.76rem;
  color: #78716c;
  font-weight: 600;
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1c1917;
  line-height: 1.15;
}

/* Clean Card & Table */
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

.search-wrap {
  position: relative;
  min-width: 220px;
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
}

.filter-select,
.filter-date {
  width: auto;
  border-radius: 9px;
  border: 1px solid #dedad4;
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

.unit-badge {
  background: #f4f1ed;
  color: #2c1810;
  font-weight: 700;
  font-size: 0.74rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.stock-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.stock-pill.ok {
  background: #dcfce7;
  color: #15803d;
}

.stock-pill.low {
  background: #fef3c7;
  color: #b45309;
}

.stock-pill.out {
  background: #fee2e2;
  color: #b91c1c;
}

.status-dot-badge {
  font-size: 0.74rem;
  font-weight: 600;
}

.status-dot-badge.active {
  color: #15803d;
}

.status-dot-badge.inactive {
  color: #78716c;
}

.mov-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
}

.mov-badge.purchase {
  background: #dcfce7;
  color: #15803d;
}

.mov-badge.sale {
  background: #e0f2fe;
  color: #0369a1;
}

.mov-badge.waste {
  background: #fee2e2;
  color: #b91c1c;
}

.mov-badge.adjustment {
  background: #fef3c7;
  color: #b45309;
}

.mov-badge.return {
  background: #f3e8ff;
  color: #7e22ce;
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

.btn-outline-coffee {
  background: #ffffff;
  color: #2c1810;
  border: 1px solid #2c1810;
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

/* Modals */
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
  max-width: 440px;
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

.option-pills {
  display: flex;
  gap: 0.4rem;
}

.opt-pill {
  border: 1px solid #e2ddd6;
  background: #faf9f7;
  color: #4f433d;
  border-radius: 9px;
  padding: 0.4rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.opt-pill.active {
  background: #2c1810;
  color: #ffffff;
  border-color: #2c1810;
}
</style>
