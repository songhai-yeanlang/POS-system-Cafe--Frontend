<template>
  <div class="recipes-page">
    <div class="recipes-layout">
      <!-- ================= LEFT PANEL: PRODUCT LIST ================= -->
      <div class="products-sidebar-card">
        <div class="sidebar-header">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="sidebar-title fw-bold text-dark small text-uppercase tracking-wider">
              {{ $t('recipes.productsCount', { count: filteredProducts.length }) }}
            </span>
            <span class="badge bg-light text-muted border smaller">{{ $t('recipes.catalog') }}</span>
          </div>

          <div class="search-wrap mb-2">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="productSearch"
              type="text"
              class="form-control form-control-sm search-input"
              :placeholder="$t('recipes.searchProduct')"
            />
            <button
              v-if="productSearch"
              type="button"
              class="btn-search-clear"
              :title="$t('common.clear')"
              @click="productSearch = ''"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>

          <select v-model="selectedCategoryId" class="form-select form-select-sm category-select">
            <option value="ALL">{{ $t('recipes.allCategoriesCount', { count: products.length }) }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ $tCategory(cat.name) }}
            </option>
          </select>
        </div>

        <div v-if="isLoadingProducts" class="empty-side">
          <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
          <div class="small text-muted">{{ $t('products.loadingProducts') }}</div>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="empty-side">
          <i class="bi bi-inbox fs-3 text-muted mb-2 d-block"></i>
          <div class="small text-muted">{{ $t('products.noProductsFound') }}</div>
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
                :class="prod.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot'"
              ></i>
            </div>

            <div class="flex-grow-1 text-start overflow-hidden">
              <div class="prod-name-sm text-truncate">{{ prod.name }}</div>
              <div class="prod-meta-sm text-muted text-truncate">{{ $tCategory(prod.category_name) }}</div>
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
          <div class="fw-bold text-dark">{{ $t('recipes.selectAProduct') }}</div>
          <div class="small text-muted">
            {{ $t('recipes.selectAProductDesc') }}
          </div>
        </div>

        <template v-else>
          <!-- Selected Product Banner -->
          <div class="clean-card product-banner mb-3 p-3 px-4">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
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
                    :class="selectedProduct.product_type === 'FOOD' ? 'bi-egg-fried' : 'bi-cup-hot'"
                  ></i>
                </div>
                <div>
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <h5 class="fw-bold mb-0 text-dark">{{ selectedProduct.name }}</h5>
                    <span class="type-pill" :class="selectedProduct.product_type?.toLowerCase()">
                      {{ selectedProduct.product_type }}
                    </span>
                  </div>
                  <div class="small text-muted d-flex align-items-center flex-wrap gap-2">
                    <span>{{ $tCategory(selectedProduct.category_name) }}</span>
                    <span>•</span>
                    <span>{{ productVariantsRecipes.length }} variant(s)</span>
                    <span>•</span>
                    <span
                      class="badge rounded-pill px-2 py-1 small"
                      :class="configuredRecipesCount === productVariantsRecipes.length && productVariantsRecipes.length > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'"
                    >
                      <i class="bi" :class="configuredRecipesCount === productVariantsRecipes.length && productVariantsRecipes.length > 0 ? 'bi-check-circle-fill me-1' : 'bi-exclamation-circle me-1'"></i>
                      {{ $t('recipes.configuredCount', { configured: configuredRecipesCount, total: productVariantsRecipes.length }) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="d-flex align-items-center gap-2">
                <router-link to="/inventory" class="btn btn-outline-coffee btn-sm d-inline-flex align-items-center gap-1">
                  <i class="bi bi-boxes"></i>
                  <span>{{ $t('inventory.tabIngredients') }}</span>
                </router-link>
                <button
                  type="button"
                  class="btn btn-light-coffee btn-sm"
                  :title="$t('common.refresh')"
                  :disabled="isLoadingProductRecipes"
                  @click="fetchProductRecipes(selectedProduct.id)"
                >
                  <i class="bi bi-arrow-clockwise" :class="{ 'spin-icon': isLoadingProductRecipes }"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Variants Loading -->
          <div v-if="isLoadingProductRecipes" class="clean-card empty-main">
            <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
            <div class="small text-muted">{{ $t('recipes.loadingVariantRecipes') }}</div>
          </div>

          <!-- Empty Variants -->
          <div v-else-if="productVariantsRecipes.length === 0" class="clean-card empty-main">
            <i class="bi bi-box-seam fs-1 text-muted mb-2 d-block"></i>
            <div class="fw-bold text-dark">{{ $t('recipes.noVariantsAvailable') }}</div>
            <div class="small text-muted">
              {{ $t('recipes.noVariantsAvailableDesc') }}
            </div>
          </div>

          <!-- Variants Recipe Table View -->
          <div v-else class="clean-card">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-head-clean">
                  <tr>
                    <th style="min-width: 170px;">{{ $t('recipes.colVariant') }}</th>
                    <th style="min-width: 90px;">{{ $t('recipes.colPrice') }}</th>
                    <th style="min-width: 290px;">{{ $t('recipes.colRecipeIngredients') }}</th>
                    <th style="min-width: 120px;">{{ $t('recipes.colEstYield') }}</th>
                    <th style="min-width: 120px;" class="text-end">{{ $t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in productVariantsRecipes" :key="v.id">
                    <!-- Variant Name & Spec -->
                    <td>
                      <div class="fw-semibold text-dark">{{ v.variant_name }}</div>
                      <div class="small text-muted d-flex align-items-center gap-1 mt-0.5">
                        <span
                          v-if="v.temperature && v.temperature !== 'NONE'"
                          class="badge-variant-temp"
                          :class="v.temperature.toLowerCase()"
                        >
                          {{ v.temperature }}
                        </span>
                        <span v-if="v.size" class="badge-variant-size">{{ v.size }}</span>
                      </div>
                    </td>

                    <!-- Price -->
                    <td>
                      <span class="fw-semibold text-dark font-monospace">{{ formatUsd(v.price) }}</span>
                    </td>

                    <!-- Recipe Ingredients -->
                    <td>
                      <div v-if="!v.recipe || v.recipe.length === 0" class="d-flex align-items-center flex-wrap gap-2">
                        <span class="badge bg-light text-muted border fw-normal">{{ $t('recipes.noRecipeSet') }}</span>
                        <div v-if="getSiblingsWithRecipes(v).length > 0" class="d-inline-flex align-items-center gap-1">
                          <span class="smaller text-muted">{{ $t('recipes.copy') }}</span>
                          <button
                            v-for="sib in getSiblingsWithRecipes(v)"
                            :key="sib.id"
                            type="button"
                            class="btn btn-xs btn-outline-secondary py-0 px-1.5"
                            :title="`Copy recipe from ${sib.variant_name}`"
                            @click="quickCopyRecipe(sib, v)"
                          >
                            <i class="bi bi-copy me-1"></i>{{ sib.variant_name }}
                          </button>
                        </div>
                      </div>

                      <div v-else class="d-flex flex-wrap gap-1">
                        <span
                          v-for="item in v.recipe"
                          :key="item.id"
                          class="recipe-ing-tag"
                          :title="`Stock: ${formatQty(item.current_stock)} ${item.unit}`"
                        >
                          <span class="ing-name">{{ item.ingredient_name }}</span>
                          <span class="ing-qty">{{ formatQty(item.quantity) }} {{ item.unit }}</span>
                        </span>
                      </div>
                    </td>

                    <!-- Est. Yield -->
                    <td>
                      <template v-if="v.recipe && v.recipe.length > 0">
                        <span
                          class="badge rounded-pill fw-semibold px-2 py-1"
                          :class="getMaxMakeableUnits(v.recipe) <= 5 ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'"
                        >
                          {{ $t('recipes.cupsCount', { count: getMaxMakeableUnits(v.recipe) }) }}
                        </span>
                      </template>
                      <span v-else class="text-muted small">—</span>
                    </td>

                    <!-- Actions -->
                    <td class="text-end">
                      <div v-if="authStore.isOwner" class="d-inline-flex align-items-center gap-1">
                        <template v-if="v.recipe && v.recipe.length > 0">
                          <button
                            type="button"
                            class="btn-action"
                            :title="$t('common.edit')"
                            @click="openRecipeBuilderModal(v)"
                          >
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            class="btn-action btn-action--danger"
                            :title="$t('common.clear')"
                            @click="handleDeleteVariantRecipe(v)"
                          >
                            <i class="bi bi-trash3"></i>
                          </button>
                        </template>
                        <button
                          v-else
                          type="button"
                          class="btn btn-sm btn-coffee"
                          @click="openRecipeBuilderModal(v)"
                        >
                          <i class="bi bi-plus-lg"></i>
                          <span class="ms-1">{{ $t('recipes.setRecipe') }}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
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
            <h6 class="mb-0 fw-bold text-dark">
              {{ $t('recipes.recipeBuilderTitle', { product: selectedProduct?.name, variant: editingVariant.variant_name }) }}
            </h6>
            <div class="small text-muted">
              {{ $t('recipes.recipeBuilderSubtitle') }}
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
              <span class="small text-muted">{{ $t('recipes.copyFrom') }}</span>
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
              <i class="bi bi-plus-lg me-1"></i>{{ $t('recipes.addIngredientRow') }}
            </button>
          </div>

          <div v-if="builderItems.length === 0" class="empty-builder-box">
            <div class="fw-semibold text-dark mb-1">{{ $t('recipes.noIngredientsInRecipe') }}</div>
            <div class="small text-muted mb-3">
              {{ $t('recipes.noIngredientsInRecipeDesc') }}
            </div>
            <button type="button" class="btn btn-coffee btn-sm" @click="addBuilderRow">
              <i class="bi bi-plus-lg me-1"></i>{{ $t('recipes.addFirstIngredient') }}
            </button>
          </div>

          <div v-else class="builder-rows">
            <div
              v-for="(row, idx) in builderItems"
              :key="idx"
              class="builder-row"
            >
              <div class="flex-grow-1">
                <label class="form-label-xs">{{ $t('inventory.colIngredient') }}</label>
                <select
                  v-model.number="row.ingredient_id"
                  class="form-select form-select-sm form-control-clean"
                  required
                >
                  <option :value="null" disabled>{{ $t('recipes.chooseActiveIngredient') }}</option>
                  <option
                    v-for="ing in activeIngredients"
                    :key="ing.id"
                    :value="ing.id"
                    :disabled="isIngredientUsedInOtherRow(ing.id, idx)"
                  >
                    {{ ing.name }} ({{ ing.unit }} — {{ formatQty(ing.current_stock) }})
                  </option>
                </select>
              </div>

              <div style="width: 170px">
                <label class="form-label-xs">{{ $t('recipes.quantityRequired') }}</label>
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
                  <span class="input-group-text bg-light text-muted small">
                    {{ getIngredientUnit(row.ingredient_id) || 'Unit' }}
                  </span>
                </div>
              </div>

              <div class="pt-3">
                <button
                  type="button"
                  class="btn btn-action-icon"
                  :title="$t('common.remove')"
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
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-coffee flex-grow-1"
            :disabled="isSavingRecipe"
            @click="handleSaveRecipe"
          >
            <span v-if="isSavingRecipe" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check2-circle me-1"></i>
            {{ $t('recipes.saveRecipeBtn', { count: builderItems.length }) }}
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

const configuredRecipesCount = computed(() => {
  return productVariantsRecipes.value.filter((v) => v.recipe && v.recipe.length > 0).length
})

const getSiblingsWithRecipes = (currentVariant) => {
  return productVariantsRecipes.value.filter(
    (v) => v.id !== currentVariant.id && v.recipe && v.recipe.length > 0
  )
}

const quickCopyRecipe = async (sibling, targetVariant) => {
  if (!sibling.recipe || sibling.recipe.length === 0) return
  try {
    const payload = {
      items: sibling.recipe.map((r) => ({
        ingredient_id: Number(r.ingredient_id),
        quantity: Number(r.quantity),
      })),
    }
    await api.put(`/inventory/recipes/variant/${targetVariant.id}`, payload)
    toast.success(`Copied recipe from ${sibling.variant_name} to ${targetVariant.variant_name}`)
    await fetchProductRecipes(selectedProduct.value.id)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to copy recipe')
  }
}

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
      api.get('/inventory/ingredients'),
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
    const res = await api.get(`/inventory/recipes/product/${productId}`)
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

    await api.put(`/inventory/recipes/variant/${editingVariant.value.id}`, payload)
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
  try {
    await api.delete(`/inventory/recipes/variant/${variant.id}`)
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
.recipes-page {
  width: 100%;
}

.recipes-layout {
  display: grid;
  grid-template-columns: 310px 1fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 992px) {
  .recipes-layout {
    grid-template-columns: 1fr;
  }
}

/* Left Sidebar: Product Navigator */
.products-sidebar-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  box-shadow: 0 1px 3px rgba(45, 90, 67, 0.04), 0 4px 14px rgba(45, 90, 67, 0.02);
  position: sticky;
  top: 1rem;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-hairline, #eeeae4);
  background: #ffffff;
}

.search-wrap {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #8a7f78;
  font-size: 0.85rem;
  pointer-events: none;
}

.search-input {
  padding-left: 32px;
  padding-right: 30px;
  border-radius: 10px;
  border: 1px solid #dedad4;
  height: 38px;
  font-size: 0.85rem;
}

.search-input:focus {
  border-color: #2d5a43;
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.btn-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: #8a7f78;
  padding: 0 4px;
  font-size: 1rem;
  line-height: 1;
}

/* Category Select (Clean Dropdown) */
.category-select {
  border-radius: 9px;
  border: 1px solid #dedad4;
  font-size: 0.82rem;
  color: #44403c;
  background-color: #faf9f7;
  height: 36px;
}

.category-select:focus {
  border-color: #2d5a43;
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

/* Product list */
.product-select-list {
  overflow-y: auto;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.product-select-item {
  border: 1px solid transparent;
  background: #ffffff;
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.15s ease;
  width: 100%;
  cursor: pointer;
  outline: none !important;
}

.product-select-item:hover {
  background: #f7f4f0;
}

.product-select-item.active {
  background: #f2f7f4;
  border-color: #2d5a43;
  box-shadow: 0 1px 3px rgba(45, 90, 67, 0.08);
}

.product-select-item.active .prod-name-sm {
  color: #1b3829;
  font-weight: 700;
}

.prod-thumb-sm {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f2efeb;
  color: #8c6d58;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 1.1rem;
  border: 1px solid #ebe6df;
}

.prod-thumb-sm img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prod-name-sm {
  font-weight: 600;
  font-size: 0.875rem;
  color: #1c1917;
  line-height: 1.25;
}

.prod-meta-sm {
  font-size: 0.72rem;
  color: #78716c;
  margin-top: 2px;
}

.variant-pill-sm {
  font-size: 0.7rem;
  font-weight: 600;
  background: #f2efeb;
  color: #574c45;
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  white-space: nowrap;
}

.empty-side {
  padding: 3rem 1rem;
  text-align: center;
}

/* Right Panel: Clean Card & Banners */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--border-hairline, #e6e4e0);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(45, 90, 67, 0.04), 0 4px 14px rgba(45, 90, 67, 0.02);
}

.empty-main {
  padding: 4.5rem 1.5rem;
  text-align: center;
}

.product-banner {
  border-radius: 16px;
}

.prod-thumb-lg {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #f4f1ed;
  color: #2d5a43;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  overflow: hidden;
  border: 1px solid #e8e4de;
  flex-shrink: 0;
}

.prod-thumb-lg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-pill {
  font-size: 0.7rem;
  font-weight: 700;
  background: #f3efe9;
  color: #2d5a43;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  text-transform: uppercase;
}

.type-pill.drink {
  background: #e0f2fe;
  color: #0369a1;
}

.type-pill.food {
  background: #fef3c7;
  color: #92400e;
}

.type-pill.addon {
  background: #f3e8ff;
  color: #6b21a8;
}

/* Table View Styles */
.table-head-clean th {
  background-color: #faf9f7;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.badge-variant-temp {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.12rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-variant-temp.hot {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-variant-temp.iced,
.badge-variant-temp.frappe {
  background: #e0f2fe;
  color: #0369a1;
}

.badge-variant-size {
  font-size: 0.68rem;
  font-weight: 500;
  padding: 0.12rem 0.4rem;
  border-radius: 4px;
  background: #f3f4f6;
  color: #4b5563;
}

.recipe-ing-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f8faf9;
  border: 1px solid #d9e3dc;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.76rem;
  line-height: 1.25;
}

.recipe-ing-tag .ing-name {
  color: #374151;
  font-weight: 500;
}

.recipe-ing-tag .ing-qty {
  color: #2d5a43;
  font-weight: 700;
}

/* Buttons */
.btn-coffee {
  background: #2d5a43;
  color: #ffffff;
  border: none;
  border-radius: 9px;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  transition: all 0.15s ease;
}

.btn-coffee:hover {
  background: #244a37;
  color: #ffffff;
}

.btn-outline-coffee {
  background: #ffffff;
  color: #2d5a43;
  border: 1px solid #2d5a43;
  border-radius: 9px;
  font-weight: 500;
  padding: 0.4rem 0.85rem;
  transition: all 0.15s ease;
}

.btn-outline-coffee:hover {
  background: #f7f4f0;
  color: #2d5a43;
}

.btn-light-coffee {
  background: #f4f1ed;
  color: #2d5a43;
  border: 1px solid #e6e1da;
  border-radius: 9px;
  font-weight: 500;
  padding: 0.4rem 0.75rem;
  transition: all 0.15s ease;
}

.btn-light-coffee:hover {
  background: #e9e4dc;
  color: #2d5a43;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
}

.spin-icon {
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  padding: 1.15rem 1.4rem;
  border-bottom: 1px solid #eeeae4;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-body-custom {
  padding: 1.25rem 1.4rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 1rem 1.4rem;
  border-top: 1px solid #eeeae4;
  background: #faf9f7;
  display: flex;
  gap: 0.75rem;
}

.btn-close-custom {
  border: none;
  background: #f4f1ed;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #716762;
  transition: all 0.15s ease;
}

.btn-close-custom:hover {
  background: #e8e3dc;
  color: #1c1b1b;
}

.empty-builder-box {
  border: 1px dashed #d8d2c9;
  border-radius: 12px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  background: #faf9f7;
}

.builder-rows {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.builder-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #faf9f7;
  border: 1px solid #e8e4de;
  border-radius: 11px;
  padding: 0.75rem 0.9rem;
}

.form-label-xs {
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b5b52;
  margin-bottom: 3px;
  display: block;
}

.form-control-clean {
  border-radius: 9px;
  border: 1px solid #dedad4;
}

.form-control-clean:focus {
  border-color: #2d5a43;
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
}

.btn-action:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.btn-action--danger:hover {
  background-color: #fef2f2;
  color: #dc2626;
}

.btn-action-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
}

.btn-action-icon:hover {
  background: #fef2f2;
  color: #dc2626;
}

.smaller {
  font-size: 11px;
}

.tracking-wider {
  letter-spacing: 0.5px;
}
</style>
