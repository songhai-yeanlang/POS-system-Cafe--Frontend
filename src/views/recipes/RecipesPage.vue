<template>
  <div class="recipes-page">
    <!-- Top Header -->
    <div class="page-header-bar mb-3">
      <div>
        <h5 class="fw-bold mb-1 text-dark">Drink Recipes & Bill of Materials (BOM)</h5>
        <p class="text-muted small mb-0">
          Define exact ingredient quantities per product variant for automatic stock deduction on every paid order.
        </p>
      </div>

      <router-link to="/inventory" class="btn btn-light-coffee btn-sm">
        <i class="bi bi-boxes me-1"></i>Manage Ingredients
      </router-link>
    </div>

    <div class="recipes-layout">
      <!-- ================= LEFT PANEL: PRODUCT LIST ================= -->
      <div class="products-sidebar-card">
        <div class="sidebar-header">
          <div class="search-wrap mb-2">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="productSearch"
              type="text"
              class="form-control form-control-sm search-input"
              placeholder="Search product..."
            />
          </div>

          <div class="category-chips">
            <button
              type="button"
              class="cat-chip"
              :class="{ active: selectedCategoryId === 'ALL' }"
              @click="selectedCategoryId = 'ALL'"
            >
              All
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              class="cat-chip"
              :class="{ active: selectedCategoryId === cat.id }"
              @click="selectedCategoryId = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>

        <div v-if="isLoadingProducts" class="empty-side">
          <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
          <div class="small text-muted">Loading products...</div>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="empty-side">
          <div class="small text-muted">No products match your search.</div>
        </div>

        <div v-else class="product-select-list">
          <button
            v-for="prod in filteredProducts"
            :key="prod.id"
            type="button"
            class="product-select-item"
            :class="{ active: selectedProduct?.id === prod.id }"
            @click="selectProduct(prod)"
          >
            <div class="prod-thumb-sm">
              <img
                v-if="prod.image"
                :src="getAssetUrl(prod.image)"
                :alt="prod.name"
              />
              <i
                v-else
                class="bi"
                :class="prod.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot-fill'"
              ></i>
            </div>

            <div class="flex-grow-1 text-start overflow-hidden">
              <div class="prod-name-sm text-truncate">{{ prod.name }}</div>
              <div class="prod-meta-sm">
                {{ prod.category_name }} • {{ prod.product_type }}
              </div>
            </div>

            <span class="variant-pill-sm">
              {{ prod.variants?.length || 0 }} var
            </span>
          </button>
        </div>
      </div>

      <!-- ================= RIGHT PANEL: VARIANT RECIPES ================= -->
      <div class="variants-recipe-panel">
        <div v-if="!selectedProduct" class="clean-card empty-main">
          <i class="bi bi-journal-text fs-1 text-muted mb-2 d-block"></i>
          <div class="fw-bold text-dark">Select a Product</div>
          <div class="small text-muted">
            Choose any drink, food, or add-on on the left to view or configure its variant recipes.
          </div>
        </div>

        <template v-else>
          <!-- Selected Product Banner -->
          <div class="clean-card product-banner mb-3">
            <div class="d-flex align-items-center gap-3">
              <div class="prod-thumb-lg">
                <img
                  v-if="selectedProduct.image"
                  :src="getAssetUrl(selectedProduct.image)"
                  :alt="selectedProduct.name"
                />
                <i
                  v-else
                  class="bi"
                  :class="selectedProduct.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot-fill'"
                ></i>
              </div>
              <div>
                <div class="d-flex align-items-center gap-2">
                  <h6 class="fw-bold mb-0 text-dark">{{ selectedProduct.name }}</h6>
                  <span class="type-pill">{{ selectedProduct.product_type }}</span>
                </div>
                <div class="small text-muted mt-1">
                  {{ selectedProduct.category_name }} • {{ productVariantsRecipes.length }} variant(s)
                </div>
              </div>
            </div>

            <button
              type="button"
              class="btn btn-light-coffee btn-sm"
              :disabled="isLoadingProductRecipes"
              @click="fetchProductRecipes(selectedProduct.id)"
            >
              <i class="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>

          <!-- Variants Loading -->
          <div v-if="isLoadingProductRecipes" class="clean-card empty-main">
            <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
            <div class="small text-muted">Loading variant recipes...</div>
          </div>

          <!-- Variant Recipe Cards -->
          <div v-else class="variants-grid">
            <div
              v-for="v in productVariantsRecipes"
              :key="v.id"
              class="clean-card variant-recipe-card"
            >
              <div class="variant-card-header">
                <div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark">{{ v.variant_name }}</span>
                    <span
                      v-if="v.temperature && v.temperature !== 'NONE'"
                      class="temp-badge"
                      :class="v.temperature.toLowerCase()"
                    >
                      {{ v.temperature }}
                    </span>
                    <span v-if="v.size" class="size-badge">{{ v.size }}</span>
                  </div>
                  <div class="small text-muted mt-1">
                    Selling Price: <strong class="text-dark">{{ formatUsd(v.price) }}</strong>
                    <span v-if="v.recipe.length > 0" class="ms-2">
                      • Est. Makeable:
                      <strong :class="getMaxMakeableUnits(v.recipe) <= 5 ? 'text-danger' : 'text-success'">
                        {{ getMaxMakeableUnits(v.recipe) }} cup(s)
                      </strong>
                    </span>
                  </div>
                </div>

                <div v-if="authStore.isOwner" class="d-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-coffee btn-sm"
                    @click="openRecipeBuilderModal(v)"
                  >
                    <i class="bi bi-sliders me-1"></i>
                    {{ v.recipe.length > 0 ? 'Edit Recipe' : 'Set Recipe' }}
                  </button>
                  <button
                    v-if="v.recipe.length > 0"
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    title="Clear Recipe"
                    @click="handleDeleteVariantRecipe(v)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </div>

              <!-- Recipe Ingredients Table -->
              <div v-if="v.recipe.length === 0" class="no-recipe-box">
                <i class="bi bi-info-circle me-1 text-muted"></i>
                <span class="small text-muted">
                  No recipe configured yet. Selling this variant will not deduct any stock.
                </span>
              </div>

              <div v-else class="table-responsive">
                <table class="table clean-subtable align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Qty per 1 Unit</th>
                      <th>Current Stock</th>
                      <th class="text-end">Max Servings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in v.recipe" :key="item.id">
                      <td>
                        <span class="fw-semibold text-dark">{{ item.ingredient_name }}</span>
                      </td>
                      <td>
                        <span class="qty-chip">
                          {{ formatQty(item.quantity) }} {{ item.unit }}
                        </span>
                      </td>
                      <td>
                        <span class="small text-muted">
                          {{ formatQty(item.current_stock) }} {{ item.unit }}
                        </span>
                      </td>
                      <td class="text-end">
                        <span
                          class="small fw-bold"
                          :class="
                            Math.floor(Number(item.current_stock) / Number(item.quantity)) <= 5
                              ? 'text-danger'
                              : 'text-success'
                          "
                        >
                          {{ Math.max(0, Math.floor(Number(item.current_stock) / Number(item.quantity))) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ================= MODAL: RECIPE BUILDER (OWNER) ================= -->
    <div v-if="showBuilderModal && editingVariant" class="modal-backdrop-custom" @click.self="showBuilderModal = false">
      <div class="modal-card-custom modal-lg-custom">
        <div class="modal-header-custom">
          <div>
            <h6 class="mb-0 fw-bold">
              Recipe Builder — {{ selectedProduct?.name }} ({{ editingVariant.variant_name }})
            </h6>
            <div class="small text-muted">
              Specify exact ingredient quantities deducted per 1 unit sold.
            </div>
          </div>
          <button type="button" class="btn-close-custom" @click="showBuilderModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <!-- Toolbar: Copy from sibling variant or Add Ingredient Row -->
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div v-if="siblingVariantsWithRecipes.length > 0" class="d-flex align-items-center gap-2">
              <span class="small text-muted">Copy from:</span>
              <button
                v-for="sib in siblingVariantsWithRecipes"
                :key="sib.id"
                type="button"
                class="btn btn-light-coffee btn-xs"
                @click="copyFromSiblingVariant(sib)"
              >
                <i class="bi bi-files me-1"></i>{{ sib.variant_name }}
              </button>
            </div>

            <button
              type="button"
              class="btn btn-outline-coffee btn-sm ms-auto"
              @click="addBuilderRow"
            >
              <i class="bi bi-plus-lg me-1"></i>Add Ingredient Row
            </button>
          </div>

          <div v-if="builderItems.length === 0" class="empty-builder-box">
            <div class="fw-semibold text-dark mb-1">No Ingredients in Recipe</div>
            <div class="small text-muted mb-2">
              Click "Add Ingredient Row" to add raw materials (coffee beans, milk, syrup, cup) to this variant.
            </div>
            <button type="button" class="btn btn-coffee btn-sm" @click="addBuilderRow">
              <i class="bi bi-plus-lg me-1"></i>Add First Ingredient
            </button>
          </div>

          <div v-else class="builder-rows">
            <div
              v-for="(row, idx) in builderItems"
              :key="idx"
              class="builder-row"
            >
              <div class="flex-grow-1">
                <label class="form-label-xs">Ingredient</label>
                <select
                  v-model.number="row.ingredient_id"
                  class="form-select form-select-sm form-control-clean"
                  required
                >
                  <option :value="null" disabled>Choose active ingredient...</option>
                  <option
                    v-for="ing in activeIngredients"
                    :key="ing.id"
                    :value="ing.id"
                    :disabled="isIngredientUsedInOtherRow(ing.id, idx)"
                  >
                    {{ ing.name }} ({{ ing.unit }} — Stock: {{ formatQty(ing.current_stock) }})
                  </option>
                </select>
              </div>

              <div style="width: 170px">
                <label class="form-label-xs">Quantity Required</label>
                <div class="input-group input-group-sm">
                  <input
                    v-model.number="row.quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    class="form-control form-control-clean"
                    placeholder="0.00"
                    required
                  />
                  <span class="input-group-text bg-light">
                    {{ getIngredientUnit(row.ingredient_id) || 'Unit' }}
                  </span>
                </div>
              </div>

              <div class="pt-3">
                <button
                  type="button"
                  class="btn btn-action-icon text-danger"
                  title="Remove Row"
                  @click="removeBuilderRow(idx)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn btn-light-coffee" @click="showBuilderModal = false">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-coffee flex-grow-1"
            :disabled="isSavingRecipe"
            @click="handleSaveRecipe"
          >
            <span v-if="isSavingRecipe" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check2-circle me-1"></i>
            Save Recipe ({{ builderItems.length }} ingredient{{ builderItems.length === 1 ? '' : 's' }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { getAssetUrl } from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useCurrency } from '@/composables/useCurrency'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()

// ================= STATE =================
const categories = ref([])
const products = ref([])
const ingredients = ref([])
const isLoadingProducts = ref(false)

const productSearch = ref('')
const selectedCategoryId = ref('ALL')

const selectedProduct = ref(null)
const productVariantsRecipes = ref([])
const isLoadingProductRecipes = ref(false)

// Recipe Builder Modal State
const showBuilderModal = ref(false)
const editingVariant = ref(null)
const builderItems = ref([])
const isSavingRecipe = ref(false)

// ================= COMPUTED =================
const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase()
  return products.value.filter((p) => {
    if (selectedCategoryId.value !== 'ALL' && p.category_id !== selectedCategoryId.value) {
      return false
    }
    if (q) {
      return (
        p.name?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q)
      )
    }
    return true
  })
})

const activeIngredients = computed(() =>
  ingredients.value.filter((i) => i.is_active)
)

const siblingVariantsWithRecipes = computed(() => {
  if (!editingVariant.value) return []
  return productVariantsRecipes.value.filter(
    (v) => v.id !== editingVariant.value.id && v.recipe && v.recipe.length > 0
  )
})

// ================= METHODS =================
const formatQty = (val) => {
  const n = Number(val) || 0
  return Number.isInteger(n) ? n.toLocaleString() : Number(n.toFixed(4)).toLocaleString()
}

const getMaxMakeableUnits = (recipeList) => {
  if (!Array.isArray(recipeList) || recipeList.length === 0) return 0
  const counts = recipeList.map((r) => {
    const qty = Number(r.quantity) || 0
    if (qty <= 0) return 9999
    return Math.max(0, Math.floor((Number(r.current_stock) || 0) / qty))
  })
  return Math.min(...counts)
}

const fetchInitialData = async () => {
  isLoadingProducts.value = true
  try {
    const [catRes, prodRes, ingRes] = await Promise.all([
      api.get('/categories'),
      api.get('/products', { params: { limit: 200 } }),
      api.get('/ingredients'),
    ])
    categories.value = catRes.data?.data || []
    products.value = prodRes.data?.data || []
    ingredients.value = ingRes.data?.data || []

    if (products.value.length > 0 && !selectedProduct.value) {
      await selectProduct(products.value[0])
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load recipes data')
  } finally {
    isLoadingProducts.value = false
  }
}

const selectProduct = async (prod) => {
  selectedProduct.value = prod
  await fetchProductRecipes(prod.id)
}

const fetchProductRecipes = async (productId) => {
  isLoadingProductRecipes.value = true
  try {
    const res = await api.get(`/recipes/product/${productId}`)
    productVariantsRecipes.value = res.data?.data?.variants || []
  } catch {
    productVariantsRecipes.value = []
  } finally {
    isLoadingProductRecipes.value = false
  }
}

// ================= RECIPE BUILDER MODAL =================
const openRecipeBuilderModal = (variant) => {
  editingVariant.value = variant
  builderItems.value = (variant.recipe || []).map((r) => ({
    ingredient_id: r.ingredient_id,
    quantity: Number(r.quantity),
  }))
  if (builderItems.value.length === 0 && activeIngredients.value.length > 0) {
    builderItems.value.push({
      ingredient_id: activeIngredients.value[0].id,
      quantity: 1,
    })
  }
  showBuilderModal.value = true
}

const addBuilderRow = () => {
  const usedIds = new Set(builderItems.value.map((r) => r.ingredient_id))
  const nextAvailable = activeIngredients.value.find((i) => !usedIds.has(i.id))
  builderItems.value.push({
    ingredient_id: nextAvailable ? nextAvailable.id : null,
    quantity: 1,
  })
}

const removeBuilderRow = (idx) => {
  builderItems.value.splice(idx, 1)
}

const isIngredientUsedInOtherRow = (ingId, currentIndex) => {
  return builderItems.value.some(
    (row, idx) => idx !== currentIndex && row.ingredient_id === ingId
  )
}

const getIngredientUnit = (ingId) => {
  const found = ingredients.value.find((i) => i.id === ingId)
  return found ? found.unit : ''
}

const copyFromSiblingVariant = (sibling) => {
  builderItems.value = (sibling.recipe || []).map((r) => ({
    ingredient_id: r.ingredient_id,
    quantity: Number(r.quantity),
  }))
  toast.info(`Copied recipe from ${sibling.variant_name}`)
}

const handleSaveRecipe = async () => {
  // Validate rows
  for (const row of builderItems.value) {
    if (!row.ingredient_id) {
      toast.warning('Please select an ingredient for every row')
      return
    }
    if (!row.quantity || Number(row.quantity) <= 0) {
      toast.warning('Quantity must be greater than 0')
      return
    }
  }

  isSavingRecipe.value = true
  try {
    const payload = {
      items: builderItems.value.map((r) => ({
        ingredient_id: Number(r.ingredient_id),
        quantity: Number(r.quantity),
      })),
    }

    await api.put(`/recipes/variant/${editingVariant.value.id}`, payload)
    toast.success(`Recipe saved for ${editingVariant.value.variant_name}`)
    showBuilderModal.value = false

    await fetchProductRecipes(selectedProduct.value.id)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save recipe')
  } finally {
    isSavingRecipe.value = false
  }
}

const handleDeleteVariantRecipe = async (variant) => {
  if (!window.confirm(`Clear all recipe ingredients for "${variant.variant_name}"?`)) return
  try {
    await api.delete(`/recipes/variant/${variant.id}`)
    toast.success(`Recipe cleared for ${variant.variant_name}`)
    await fetchProductRecipes(selectedProduct.value.id)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to clear recipe')
  }
}

onMounted(async () => {
  await fetchInitialData()
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

.recipes-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 992px) {
  .recipes-layout {
    grid-template-columns: 1fr;
  }
}

/* Left Sidebar */
.products-sidebar-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 165px);
}

.sidebar-header {
  padding: 0.9rem;
  border-bottom: 1px solid #eeeae4;
  background: #fcfbfa;
}

.search-wrap {
  position: relative;
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

.category-chips {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cat-chip {
  border: 1px solid #e2ddd6;
  background: #ffffff;
  color: #574c45;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;
}

.cat-chip.active {
  background: #2c1810;
  color: #ffffff;
  border-color: #2c1810;
}

.product-select-list {
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.product-select-item {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 11px;
  padding: 0.55rem 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  transition: all 0.14s ease;
}

.product-select-item:hover {
  background: #f7f4f0;
}

.product-select-item.active {
  background: #fff6ee;
  border-color: #2c1810;
}

.prod-thumb-sm {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: #f2efeb;
  color: #8c6d58;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.prod-thumb-sm img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prod-name-sm {
  font-weight: 700;
  font-size: 0.85rem;
  color: #1c1917;
}

.prod-meta-sm {
  font-size: 0.7rem;
  color: #78716c;
}

.variant-pill-sm {
  font-size: 0.68rem;
  font-weight: 700;
  background: #f2efeb;
  color: #574c45;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.empty-side {
  padding: 2.5rem 1rem;
  text-align: center;
}

/* Right Panel */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
}

.empty-main {
  padding: 4rem 1.5rem;
  text-align: center;
}

.product-banner {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prod-thumb-lg {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: #f4f1ed;
  color: #2c1810;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  overflow: hidden;
}

.prod-thumb-lg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-pill {
  font-size: 0.68rem;
  font-weight: 700;
  background: #ffdcc5;
  color: #2c1810;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.variants-grid {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.variant-card-header {
  padding: 0.95rem 1.2rem;
  border-bottom: 1px solid #eeeae4;
  background: #fcfbfa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.temp-badge,
.size-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.14rem 0.45rem;
  border-radius: 6px;
  background: #f2efeb;
  color: #4f433d;
}

.temp-badge.hot {
  background: #fee2e2;
  color: #b91c1c;
}

.temp-badge.iced,
.temp-badge.frappe {
  background: #e0f2fe;
  color: #0369a1;
}

.no-recipe-box {
  padding: 1.25rem;
  background: #faf9f7;
}

.clean-subtable th {
  background: #faf9f7;
  font-size: 0.72rem;
  text-transform: uppercase;
  color: #6b5b52;
  font-weight: 700;
  padding: 0.6rem 1.2rem;
}

.clean-subtable td {
  padding: 0.65rem 1.2rem;
  font-size: 0.84rem;
}

.qty-chip {
  background: #fff6ee;
  border: 1px solid #f5d0b5;
  color: #2c1810;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
}

/* Builder Modal */
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

.modal-lg-custom {
  max-width: 650px;
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

.empty-builder-box {
  border: 1px dashed #d8d2c9;
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  background: #faf9f7;
}

.builder-rows {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.builder-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: #faf9f7;
  border: 1px solid #e8e4de;
  border-radius: 11px;
  padding: 0.65rem 0.85rem;
}

.form-label-xs {
  font-size: 0.7rem;
  font-weight: 700;
  color: #6b5b52;
  margin-bottom: 2px;
  display: block;
}

.form-control-clean {
  border-radius: 9px;
  border: 1px solid #dedad4;
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

.btn-xs {
  font-size: 0.74rem;
  padding: 0.2rem 0.55rem;
}
</style>
