<template>
  <div class="recipes-page">
    <div class="recipes-layout">
      <!-- ================= LEFT PANEL: PRODUCT LIST ================= -->
      <div class="products-sidebar-card">
        <div class="sidebar-header">
          <div class="sidebar-top-row">
            <span class="sidebar-title">
              {{ $t('recipes.productsCount', { count: filteredProducts.length }) }}
            </span>
            <span class="catalog-badge">{{ $t('recipes.catalog') }}</span>
          </div>

          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="productSearch"
              type="text"
              class="search-input"
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

          <select v-model="selectedCategoryId" class="category-select">
            <option value="ALL">{{ $t('recipes.allCategoriesCount', { count: products.length }) }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ $tCategory(cat.name) }}
            </option>
          </select>
        </div>

        <div v-if="isLoadingProducts" class="empty-side">
          <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
          <div class="empty-side-text">{{ $t('products.loadingProducts') }}</div>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="empty-side">
          <div class="empty-icon-circle empty-icon-circle--sm">
            <i class="bi bi-inbox"></i>
          </div>
          <div class="empty-side-text">{{ $t('products.noProductsFound') }}</div>
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

            <div class="prod-info-col">
              <div class="prod-name-sm text-truncate">{{ prod.name }}</div>
              <div class="prod-meta-sm text-truncate">{{ $tCategory(prod.category_name) }}</div>
            </div>

            <span class="variant-pill-sm tabular">
              {{ $t('pos.sizesCount', { count: prod.variants?.length || 0 }) }}
            </span>
          </button>
        </div>
      </div>

      <!-- ================= RIGHT PANEL: VARIANT RECIPES ================= -->
      <div class="variants-recipe-panel">
        <div v-if="!selectedProduct" class="surface-card empty-main">
          <div class="empty-icon-circle">
            <i class="bi bi-journal-text"></i>
          </div>
          <div class="empty-main-title">{{ $t('recipes.selectAProduct') }}</div>
          <div class="empty-main-desc">
            {{ $t('recipes.selectAProductDesc') }}
          </div>
        </div>

        <template v-else>
          <!-- Selected Product Banner -->
          <div class="surface-card product-banner">
            <div class="banner-inner">
              <div class="banner-product-info">
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
                <div class="banner-text-col">
                  <div class="banner-title-row">
                    <h5 class="banner-product-title">{{ selectedProduct.name }}</h5>
                  </div>
                  <div class="banner-meta-row">
                    <span class="banner-meta-item">{{ $tCategory(selectedProduct.category_name) }}</span>
                    <span class="meta-dot">•</span>
                    <span class="banner-meta-item tabular">{{ $t('pos.sizesCount', { count: productVariantsRecipes.length }) }}</span>
                  </div>
                </div>
              </div>

              <div class="banner-actions">
                <router-link to="/inventory" class="btn-toolbar">
                  <i class="bi bi-boxes"></i>
                  <span>{{ $t('inventory.tabIngredients') }}</span>
                </router-link>
                <button
                  type="button"
                  class="btn-toolbar-icon"
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
          <div v-if="isLoadingProductRecipes" class="surface-card empty-main">
            <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
            <div class="empty-main-desc">{{ $t('recipes.loadingVariantRecipes') }}</div>
          </div>

          <!-- Empty Variants -->
          <div v-else-if="productVariantsRecipes.length === 0" class="surface-card empty-main">
            <div class="empty-icon-circle">
              <i class="bi bi-box-seam"></i>
            </div>
            <div class="empty-main-title">{{ $t('recipes.noVariantsAvailable') }}</div>
            <div class="empty-main-desc">
              {{ $t('recipes.noVariantsAvailableDesc') }}
            </div>
          </div>

          <!-- Variants Recipe Table View -->
          <div v-else class="surface-card">
            <div class="table-responsive">
              <table class="clean-table">
                <thead>
                  <tr>
                    <th style="min-width: 160px;">{{ $t('recipes.colVariant') }}</th>
                    <th style="min-width: 100px;">{{ $t('recipes.colPrice') }}</th>
                    <th style="min-width: 280px;">{{ $t('recipes.colRecipeIngredients') }}</th>
                    <th style="min-width: 130px;">{{ $t('recipes.colEstYield') }}</th>
                    <th style="min-width: 130px;" class="text-end">{{ $t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in productVariantsRecipes" :key="v.id">
                    <!-- Variant Name -->
                    <td>
                      <div class="variant-name">{{ v.variant_name }}</div>
                    </td>

                    <!-- Price -->
                    <td>
                      <span class="price-val tabular">{{ formatUsd(v.price) }}</span>
                    </td>

                    <!-- Recipe Ingredients -->
                    <td>
                      <div v-if="!v.recipe || v.recipe.length === 0" class="no-recipe-wrap">
                        <span class="no-recipe-pill">{{ $t('recipes.noRecipeSet') }}</span>
                        <div v-if="getSiblingsWithRecipes(v).length > 0" class="copy-siblings-group">
                          <span class="copy-label">{{ $t('recipes.copy') }}</span>
                          <button
                            v-for="sib in getSiblingsWithRecipes(v)"
                            :key="sib.id"
                            type="button"
                            class="btn-copy-sibling"
                            :title="`Copy recipe from ${sib.variant_name}`"
                            @click="quickCopyRecipe(sib, v)"
                          >
                            <i class="bi bi-copy"></i>
                            <span>{{ sib.variant_name }}</span>
                          </button>
                        </div>
                      </div>

                      <div v-else class="recipe-dropdown-wrap">
                        <select
                          class="form-select form-select-sm recipe-select tabular"
                          :title="$t('recipes.colRecipeIngredients')"
                        >
                          <option
                            v-for="item in v.recipe"
                            :key="item.id"
                            :value="item.id"
                          >
                            {{ item.ingredient_name }} — {{ formatQty(item.quantity) }} {{ item.unit }}
                          </option>
                        </select>
                      </div>
                    </td>

                    <!-- Est. Yield -->
                    <td>
                      <template v-if="v.recipe && v.recipe.length > 0">
                        <span
                          class="yield-text tabular"
                          :class="getMaxMakeableUnits(v.recipe) <= 5 ? 'is-low' : 'is-ok'"
                        >
                          {{ $t('recipes.cupsCount', { count: getMaxMakeableUnits(v.recipe) }) }}
                        </span>
                      </template>
                      <span v-else class="text-muted-dash">—</span>
                    </td>

                    <!-- Actions -->
                    <td class="text-end">
                      <div v-if="authStore.isOwner" class="action-group">
                        <template v-if="v.recipe && v.recipe.length > 0">
                          <button
                            type="button"
                            class="btn-action-icon"
                            :title="$t('common.edit')"
                            @click="openRecipeBuilderModal(v)"
                          >
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            class="btn-action-icon is-danger"
                            :title="$t('common.clear')"
                            @click="handleDeleteVariantRecipe(v)"
                          >
                            <i class="bi bi-trash3"></i>
                          </button>
                        </template>
                        <button
                          v-else
                          type="button"
                          class="btn-set-recipe"
                          @click="openRecipeBuilderModal(v)"
                        >
                          <i class="bi bi-plus-lg"></i>
                          <span>{{ $t('recipes.setRecipe') }}</span>
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
            <h6 class="modal-title-custom">
              {{ $t('recipes.recipeBuilderTitle', { product: selectedProduct?.name, variant: editingVariant.variant_name }) }}
            </h6>
            <div class="modal-subtitle-custom">
              {{ $t('recipes.recipeBuilderSubtitle') }}
            </div>
          </div>
          <button type="button" class="btn-close-custom" @click="showBuilderModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <!-- Toolbar: Copy from sibling variant or Add Ingredient Row -->
          <div class="builder-toolbar">
            <div v-if="siblingVariantsWithRecipes.length > 0" class="copy-siblings-group">
              <span class="copy-label">{{ $t('recipes.copyFrom') }}</span>
              <button
                v-for="sib in siblingVariantsWithRecipes"
                :key="sib.id"
                type="button"
                class="btn-copy-sibling"
                @click="copyFromSiblingVariant(sib)"
              >
                <i class="bi bi-files"></i>
                <span>{{ sib.variant_name }}</span>
              </button>
            </div>

            <button
              type="button"
              class="btn-toolbar ms-auto"
              @click="addBuilderRow"
            >
              <i class="bi bi-plus-lg"></i>
              <span>{{ $t('recipes.addIngredientRow') }}</span>
            </button>
          </div>

          <div v-if="builderItems.length === 0" class="empty-builder-box">
            <div class="empty-main-title">{{ $t('recipes.noIngredientsInRecipe') }}</div>
            <div class="empty-main-desc mb-3">
              {{ $t('recipes.noIngredientsInRecipeDesc') }}
            </div>
            <button type="button" class="btn-primary-action" @click="addBuilderRow">
              <i class="bi bi-plus-lg"></i>
              <span>{{ $t('recipes.addFirstIngredient') }}</span>
            </button>
          </div>

          <div v-else class="builder-rows">
            <div
              v-for="(row, idx) in builderItems"
              :key="idx"
              class="builder-row"
            >
              <div class="flex-grow-1">
                <label class="form-label-clean">{{ $t('inventory.colIngredient') }}</label>
                <select
                  v-model.number="row.ingredient_id"
                  class="form-select form-control-clean"
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

              <div class="builder-qty-col">
                <label class="form-label-clean">{{ $t('recipes.quantityRequired') }}</label>
                <div class="qty-input-group">
                  <input
                    v-model.number="row.quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    class="form-control form-control-clean tabular"
                    placeholder="0.00"
                    required
                  />
                  <span class="qty-unit-addon">
                    {{ getIngredientUnit(row.ingredient_id) || 'Unit' }}
                  </span>
                </div>
              </div>

              <div class="builder-remove-col">
                <button
                  type="button"
                  class="btn-action-icon is-danger"
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
          <button type="button" class="btn-cancel-clean" @click="showBuilderModal = false">
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn-primary-action flex-grow-1 justify-content-center"
            :disabled="isSavingRecipe"
            @click="handleSaveRecipe"
          >
            <span v-if="isSavingRecipe" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-check2-circle"></i>
            <span>{{ $t('recipes.saveRecipeBtn', { count: builderItems.length }) }}</span>
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
import { useI18n } from '@/i18n'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()
const { t } = useI18n()

const getProductTypeLabel = (type) => {
  if (!type) return ''
  const upper = String(type).toUpperCase()
  if (upper === 'DRINK') return t('common.drink')
  if (upper === 'FOOD') return t('common.food')
  if (upper === 'ADDON') return t('common.addon')
  return type
}

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
  --botanical-deep: #1e3f2e;
  --botanical-primary: #2d5a43;
  --botanical-hover: #234735;
  --botanical-tint: #eaf5ee;
  --botanical-surface: #f4f9f6;
  --ledger-border: #dce6e0;
  --ledger-border-soft: #e8efe9;
  --text-strong: #16241c;
  --text-body: #3f5247;
  --text-muted: #6c7f74;
  width: 100%;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.recipes-layout {
  display: grid;
  grid-template-columns: 315px 1fr;
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 992px) {
  .recipes-layout {
    grid-template-columns: 1fr;
  }
}

/* ================= LEFT SIDEBAR: PRODUCT NAVIGATOR ================= */
.products-sidebar-card {
  background: #ffffff;
  border: 1px solid var(--ledger-border);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  box-shadow: 0 2px 10px rgba(22, 36, 28, 0.03);
  position: sticky;
  top: 1rem;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--ledger-border-soft);
  background: #fcfefd;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sidebar-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-title {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-strong);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.catalog-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--botanical-primary);
  background: var(--botanical-surface);
  border: 1px solid var(--ledger-border);
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
}

.search-wrap {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.82rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 28px 0 32px;
  border-radius: 9px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  font-size: 0.83rem;
  color: var(--text-strong);
  transition: all 0.15s ease;
}

.search-input::placeholder {
  color: #8fa096;
}

.search-input:focus {
  outline: none;
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.1);
}

.btn-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: 0 4px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.btn-search-clear:hover {
  color: var(--text-strong);
}

.category-select {
  width: 100%;
  height: 36px;
  padding: 0 2rem 0 0.75rem;
  border-radius: 9px;
  border: 1px solid var(--ledger-border);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-body);
  background-color: #ffffff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%232d5a43' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  background-size: 11px 9px;
  appearance: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.category-select:focus {
  outline: none;
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.1);
}

/* Product Select List */
.product-select-list {
  overflow-y: auto;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.product-select-item {
  border: 1px solid transparent;
  background: #ffffff;
  border-radius: 12px;
  padding: 0.58rem 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  transition: all 0.16s ease;
  width: 100%;
  cursor: pointer;
  outline: none !important;
}

.product-select-item:hover {
  background: var(--botanical-surface);
  border-color: var(--ledger-border-soft);
}

.product-select-item.active {
  background: #f0f7f3;
  border-color: var(--botanical-primary);
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.08);
}

.prod-thumb-sm {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--botanical-surface);
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 1.05rem;
  border: 1px solid var(--ledger-border);
}

.prod-thumb-sm img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prod-info-col {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.prod-name-sm {
  font-weight: 700;
  font-size: 0.87rem;
  color: var(--text-strong);
  line-height: 1.25;
}

.product-select-item.active .prod-name-sm {
  color: var(--botanical-deep);
}

.prod-meta-sm {
  font-size: 0.73rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.variant-pill-sm {
  font-size: 0.71rem;
  font-weight: 700;
  background: var(--botanical-surface);
  color: var(--text-body);
  border: 1px solid var(--ledger-border);
  padding: 0.18rem 0.52rem;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.product-select-item.active .variant-pill-sm {
  background: #ffffff;
  color: var(--botanical-deep);
  border-color: #bdd6c7;
}

.empty-side {
  padding: 2.75rem 1rem;
  text-align: center;
}

.empty-side-text {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* ================= RIGHT PANEL: PRODUCT BANNER & TABLE ================= */
.variants-recipe-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.surface-card {
  background: #ffffff;
  border: 1px solid var(--ledger-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(22, 36, 28, 0.03);
}

.product-banner {
  padding: 1rem 1.25rem;
}

.banner-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.banner-product-info {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
}

.prod-thumb-lg {
  width: 54px;
  height: 54px;
  border-radius: 13px;
  background: var(--botanical-surface);
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
  overflow: hidden;
  border: 1px solid var(--ledger-border);
  flex-shrink: 0;
}

.prod-thumb-lg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-text-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.banner-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.banner-product-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--text-strong);
  line-height: 1.25;
}

.banner-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  font-size: 0.81rem;
  color: var(--text-muted);
}

.banner-meta-item {
  font-weight: 600;
  color: var(--text-body);
}

.meta-dot {
  color: #b5c4bc;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  height: 36px;
  padding: 0 0.85rem;
  border-radius: 9px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  font-size: 0.81rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-toolbar:hover {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: #bdd1c5;
}

.btn-toolbar-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-toolbar-icon:hover:not(:disabled) {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: #bdd1c5;
}

/* ================= CLEAN TABLE ================= */
.clean-table {
  width: 100%;
  border-collapse: collapse;
}

.clean-table thead th {
  background: #f8fbf9;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ledger-border);
  white-space: nowrap;
}

.clean-table tbody td {
  padding: 0.88rem 1rem;
  border-bottom: 1px solid var(--ledger-border-soft);
  vertical-align: middle;
  color: var(--text-body);
  font-size: 0.86rem;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.clean-table tbody tr {
  transition: background-color 0.14s ease;
}

.clean-table tbody tr:hover {
  background: #fafdfb;
}

.variant-name {
  font-weight: 700;
  color: var(--text-strong);
  font-size: 0.9rem;
}

.price-val {
  font-weight: 800;
  color: var(--botanical-deep);
  font-size: 0.92rem;
}

/* Recipe Ingredients Cell */
.no-recipe-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.no-recipe-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.6rem;
  border-radius: 7px;
  background: #f4f7f5;
  border: 1px solid var(--ledger-border);
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 600;
}

.copy-siblings-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.copy-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-muted);
}

.btn-copy-sibling {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 7px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copy-sibling:hover {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: var(--botanical-primary);
}

/* Recipe Ingredients Dropdown */
.recipe-dropdown-wrap {
  display: inline-block;
  min-width: 210px;
  max-width: 280px;
  width: 100%;
}

.recipe-select {
  height: 33px;
  font-size: 0.81rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid var(--ledger-border);
  background-color: #fcfdfc;
  color: var(--text-strong);
  padding-left: 0.7rem;
  padding-right: 1.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.recipe-select:focus {
  background-color: #ffffff;
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

/* Yield Text */
.yield-text {
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}

.yield-text.is-ok {
  color: #1e6b43;
}

.yield-text.is-low {
  color: #b91c1c;
}

.text-muted-dash {
  color: #9aa8a0;
  font-size: 0.85rem;
}

/* Actions Column */
.action-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.84rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action-icon:hover {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: #bfd3c7;
}

.btn-action-icon.is-danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.btn-set-recipe {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  height: 32px;
  padding: 0 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--botanical-primary);
  background: var(--botanical-primary);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-set-recipe:hover {
  background: var(--botanical-hover);
  border-color: var(--botanical-hover);
}

/* Empty State */
.empty-main {
  padding: 3.75rem 1.5rem;
  text-align: center;
}

.empty-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--botanical-surface);
  border: 1px solid var(--ledger-border);
  color: var(--botanical-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  margin-bottom: 0.75rem;
}

.empty-icon-circle--sm {
  width: 42px;
  height: 42px;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.empty-main-title {
  font-size: 0.96rem;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 0.25rem;
}

.empty-main-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  max-width: 380px;
  margin: 0 auto;
}

.spin-icon {
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ================= BUILDER MODAL ================= */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(18, 30, 23, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 1rem;
}

.modal-card-custom {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid var(--ledger-border);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 22px 48px rgba(18, 30, 23, 0.16);
}

.modal-lg-custom {
  max-width: 650px;
}

.modal-header-custom {
  padding: 1.1rem 1.35rem;
  border-bottom: 1px solid var(--ledger-border-soft);
  background: #fcfefd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.modal-title-custom {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--text-strong);
}

.modal-subtitle-custom {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.btn-close-custom {
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close-custom:hover {
  background: var(--botanical-surface);
  color: var(--text-strong);
}

.modal-body-custom {
  padding: 1.25rem 1.35rem;
  overflow-y: auto;
}

.modal-footer-custom {
  padding: 0.95rem 1.35rem;
  border-top: 1px solid var(--ledger-border-soft);
  background: #f9fcfa;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.builder-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.95rem;
}

.empty-builder-box {
  border: 1px dashed #c6d8ce;
  border-radius: 12px;
  padding: 2.25rem 1.5rem;
  text-align: center;
  background: #f9fcfa;
}

.builder-rows {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.builder-row {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  background: #f9fcfa;
  border: 1px solid var(--ledger-border);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
}

.builder-qty-col {
  width: 175px;
  flex-shrink: 0;
}

.builder-remove-col {
  padding-bottom: 2px;
}

.form-label-clean {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-body);
  margin-bottom: 0.32rem;
}

.form-control-clean {
  border-radius: 9px;
  border: 1px solid var(--ledger-border);
  font-size: 0.84rem;
  color: var(--text-strong);
  min-height: 36px;
}

.form-control-clean:focus {
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.1);
}

.qty-input-group {
  display: flex;
  align-items: stretch;
}

.qty-input-group .form-control-clean {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.qty-unit-addon {
  display: inline-flex;
  align-items: center;
  padding: 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-body);
  background: var(--botanical-surface);
  border: 1px solid var(--ledger-border);
  border-left: none;
  border-top-right-radius: 9px;
  border-bottom-right-radius: 9px;
  white-space: nowrap;
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 38px;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid var(--botanical-primary);
  background: var(--botanical-primary);
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-primary-action:hover:not(:disabled) {
  background: var(--botanical-hover);
  border-color: var(--botanical-hover);
}

.btn-primary-action:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-cancel-clean {
  height: 38px;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel-clean:hover {
  background: var(--botanical-surface);
  color: var(--text-strong);
}
</style>
