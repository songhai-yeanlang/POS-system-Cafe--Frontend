<template>
  <div class="recipes-page">
    <div class="recipes-layout">
      <!-- ================= LEFT PANEL: PRODUCT DIRECTORY ================= -->
      <aside class="products-sidebar-card">
        <div class="sidebar-header">
          <div class="sidebar-top-row">
            <h2 class="sidebar-title">
              {{ $t('recipes.productsCount', { count: filteredProducts.length }) }}
            </h2>
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
      </aside>

      <!-- ================= RIGHT PANEL: UNIFIED RECIPE SHEET ================= -->
      <section class="variants-recipe-panel">
        <div v-if="!selectedProduct" class="surface-card empty-main">
          <div class="empty-icon-circle">
            <i class="bi bi-journal-text"></i>
          </div>
          <div class="empty-main-title">{{ $t('recipes.selectAProduct') }}</div>
          <div class="empty-main-desc">
            {{ $t('recipes.selectAProductDesc') }}
          </div>
        </div>

        <div v-else class="surface-card recipe-sheet-card">
          <!-- Integrated Product Header -->
          <header class="sheet-header">
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
                  <h1 class="banner-product-title">{{ selectedProduct.name }}</h1>
                  <span class="product-cat-tag">{{ $tCategory(selectedProduct.category_name) }}</span>
                </div>
                <div class="banner-meta-row tabular">
                  <span>{{ $t('pos.sizesCount', { count: productVariantsRecipes.length }) }}</span>
                  <span v-if="productVariantsRecipes.length > 0" class="configured-stat">
                    {{ $t('recipes.configuredCount', { configured: configuredRecipesCount, total: productVariantsRecipes.length }) }}
                  </span>
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
          </header>

          <!-- Variants Loading -->
          <div v-if="isLoadingProductRecipes" class="empty-main">
            <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
            <div class="empty-main-desc">{{ $t('recipes.loadingVariantRecipes') }}</div>
          </div>

          <!-- Empty Variants -->
          <div v-else-if="productVariantsRecipes.length === 0" class="empty-main">
            <div class="empty-icon-circle">
              <i class="bi bi-box-seam"></i>
            </div>
            <div class="empty-main-title">{{ $t('recipes.noVariantsAvailable') }}</div>
            <div class="empty-main-desc">
              {{ $t('recipes.noVariantsAvailableDesc') }}
            </div>
          </div>

          <!-- Variants Recipe Table View -->
          <div v-else class="table-responsive">
            <table class="clean-table recipe-ledger-table">
              <thead>
                <tr>
                  <th style="width: 150px;">{{ $t('recipes.colVariant') }}</th>
                  <th style="width: 110px;">{{ $t('recipes.colPrice') }}</th>
                  <th>{{ $t('recipes.colRecipeIngredients') }}</th>
                  <th style="width: 145px;">{{ $t('recipes.colEstYield') }}</th>
                  <th style="min-width: 155px; width: 1%; white-space: nowrap;" class="text-end">{{ $t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in productVariantsRecipes" :key="v.id">
                  <!-- Variant Name -->
                  <td>
                    <div class="variant-cell">
                      <span class="variant-name">{{ v.variant_name }}</span>
                    </div>
                  </td>

                  <!-- Price -->
                  <td>
                    <span class="price-val tabular">{{ formatUsd(v.price) }}</span>
                  </td>

                  <!-- Recipe Ingredients (Structured Non-Breaking Chips) -->
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

                    <div v-else class="recipe-chips-flow tabular">
                      <div
                        v-for="item in v.recipe"
                        :key="item.id"
                        class="ing-chip"
                        :class="{
                          'is-sugar-scaled': item.scale_by_sugar && isSelectedProductDrink,
                          'is-inactive': item.is_active === false,
                        }"
                      >
                        <span class="ing-chip__name">{{ item.ingredient_name }}</span>
                        <span class="ing-chip__qty">{{ formatQty(item.quantity) }} {{ item.unit }}</span>
                        <span
                          v-if="item.scale_by_sugar && isSelectedProductDrink"
                          class="ing-chip__sugar"
                          :title="$t('recipes.scaleBySugarHint')"
                        >
                          <i class="bi bi-droplet-half"></i>
                          <span>%</span>
                        </span>
                        <span
                          v-if="item.is_active === false"
                          class="ing-chip__inactive"
                        >
                          {{ $t('common.inactive') }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Est. Yield -->
                  <td>
                    <template v-if="v.recipe && v.recipe.length > 0">
                      <span
                        class="yield-badge tabular"
                        :class="getMaxMakeableUnits(v.recipe) <= 5 ? 'is-low' : 'is-ok'"
                      >
                        <span class="yield-dot"></span>
                        <span>{{ $t('recipes.cupsCount', { count: getMaxMakeableUnits(v.recipe) }) }}</span>
                      </span>
                    </template>
                    <span v-else class="text-muted-dash">—</span>
                  </td>

                  <!-- Actions -->
                  <td class="text-end text-nowrap">
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
      </section>
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
          <button type="button" class="btn-close-plain" @click="showBuilderModal = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <!-- Quiet Copy Bar (only when sibling variants have recipes) -->
          <div v-if="siblingVariantsWithRecipes.length > 0" class="builder-copy-bar">
            <span class="copy-label">{{ $t('recipes.copyFrom') }}</span>
            <div class="copy-links">
              <button
                v-for="sib in siblingVariantsWithRecipes"
                :key="sib.id"
                type="button"
                class="btn-copy-link"
                @click="copyFromSiblingVariant(sib)"
              >
                {{ sib.variant_name }}
              </button>
            </div>
          </div>

          <div v-if="builderItems.length === 0" class="empty-builder-state">
            <div class="empty-main-title">{{ $t('recipes.noIngredientsInRecipe') }}</div>
            <div class="empty-main-desc mb-3">
              {{ $t('recipes.noIngredientsInRecipeDesc') }}
            </div>
            <button type="button" class="btn-add-inline" @click="addBuilderRow">
              <i class="bi bi-plus-lg"></i>
              <span>{{ $t('recipes.addFirstIngredient') }}</span>
            </button>
          </div>

          <div v-else class="builder-list">
            <!-- Quiet Column Labels -->
            <div class="builder-cols-head">
              <span class="builder-col-ing">{{ $t('inventory.colIngredient') }}</span>
              <span class="builder-col-qty">{{ $t('recipes.quantityRequired') }}</span>
              <span
                v-if="isSelectedProductDrink"
                class="builder-col-sugar"
                :title="$t('recipes.scaleBySugarHint')"
              >
                {{ $t('recipes.scaleBySugar') }}
              </span>
              <span class="builder-col-act"></span>
            </div>

            <div class="builder-rows">
              <div
                v-for="(row, idx) in builderItems"
                :key="idx"
                class="builder-row"
              >
                <div class="builder-ing-col">
                  <select
                    v-model.number="row.ingredient_id"
                    class="form-select form-control-clean"
                    :class="{ 'border-danger text-danger': isIngredientInactive(row.ingredient_id) }"
                    required
                  >
                    <option :value="null" disabled>{{ $t('recipes.chooseActiveIngredient') }}</option>
                    <option
                      v-for="ing in getOptionsForRow(row)"
                      :key="ing.id"
                      :value="ing.id"
                      :disabled="isIngredientUsedInOtherRow(ing.id, idx) || !ing.is_active"
                    >
                      {{ ing.name }} ({{ ing.unit }} — {{ formatQty(ing.current_stock) }}){{
                        !ing.is_active ? ` [${$t('common.inactive')}]` : ''
                      }}
                    </option>
                  </select>
                </div>

                <div class="builder-qty-col">
                  <div class="qty-field">
                    <input
                      v-model.number="row.quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      class="form-control form-control-clean qty-field__input tabular"
                      placeholder="0"
                      required
                    />
                    <span class="qty-field__unit">
                      {{ getIngredientUnit(row.ingredient_id) || '' }}
                    </span>
                  </div>
                </div>

                <div v-if="isSelectedProductDrink" class="builder-sugar-col">
                  <button
                    type="button"
                    class="btn-sugar-toggle"
                    :class="{ 'is-active': row.scale_by_sugar }"
                    :title="$t('recipes.scaleBySugarHint')"
                    @click="row.scale_by_sugar = !row.scale_by_sugar"
                  >
                    <i class="bi" :class="row.scale_by_sugar ? 'bi-check-circle-fill' : 'bi-circle'"></i>
                    <span>{{ $t('recipes.scaleBySugarShort') }}</span>
                  </button>
                </div>

                <button
                  type="button"
                  class="btn-remove-plain"
                  :title="$t('common.remove')"
                  @click="removeBuilderRow(idx)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>

            <button
              type="button"
              class="btn-add-inline mt-2 ms-auto"
              @click="addBuilderRow"
            >
              <i class="bi bi-plus-lg"></i>
              <span>{{ $t('recipes.addIngredientRow') }}</span>
            </button>
          </div>
        </div>

        <div class="modal-footer-custom">
          <button type="button" class="btn-cancel-plain" @click="showBuilderModal = false">
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn-primary-action"
            :disabled="isSavingRecipe"
            @click="handleSaveRecipe"
          >
            <span v-if="isSavingRecipe" class="spinner-border spinner-border-sm"></span>
            <span>{{ $t('recipes.saveRecipeBtn', { count: builderItems.length }) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL 2: CLEAR RECIPE CONFIRMATION ================= -->
    <div v-if="clearRecipeModal.show" class="modal-backdrop-custom" @click.self="clearRecipeModal.show = false">
      <div class="modal-card-custom" style="max-width: 420px">
        <div class="modal-header-custom">
          <h6 class="mb-0 fw-bold text-danger">{{ $t('recipes.clearRecipeTitle') }}</h6>
          <button type="button" class="btn-close-custom" @click="clearRecipeModal.show = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body-custom">
          <p class="small text-muted mb-0">
            {{ $t('recipes.clearRecipeDesc', { name: clearRecipeModal.variantName }) }}
          </p>
        </div>

        <div class="modal-footer-custom">
          <button
            type="button"
            class="btn-cancel-clean"
            :disabled="clearRecipeModal.isDeleting"
            @click="clearRecipeModal.show = false"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-danger flex-grow-1"
            :disabled="clearRecipeModal.isDeleting"
            @click="confirmClearVariantRecipe"
          >
            <span v-if="clearRecipeModal.isDeleting" class="spinner-border spinner-border-sm me-1"></span>
            {{ $t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
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

const isSelectedProductDrink = computed(
  () => String(selectedProduct.value?.product_type || 'DRINK').toUpperCase() === 'DRINK'
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

  const inactiveItem = sibling.recipe.find(
    (r) => r.is_active === false || isIngredientInactive(r.ingredient_id)
  )
  if (inactiveItem) {
    openRecipeBuilderModal(targetVariant)
    copyFromSiblingVariant(sibling)
    toast.warning(
      `Cannot add inactive ingredient(s) to recipe: '${inactiveItem.ingredient_name || inactiveItem.ingredient_id}'`
    )
    return
  }

  try {
    const payload = {
      items: sibling.recipe.map((r) => ({
        ingredient_id: Number(r.ingredient_id),
        quantity: Number(r.quantity),
        scale_by_sugar: Boolean(r.scale_by_sugar),
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
  const activeRecipeItems = recipeList.filter((r) => r.is_active !== false)
  if (activeRecipeItems.length === 0) return 0
  const counts = activeRecipeItems.map((r) => {
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
    ingredient_name: r.ingredient_name || '',
    unit: r.unit || '',
    current_stock: r.current_stock ?? 0,
    is_active: r.is_active !== false,
    quantity: Number(r.quantity),
    scale_by_sugar: Boolean(r.scale_by_sugar),
  }))
  if (builderItems.value.length === 0 && activeIngredients.value.length > 0) {
    builderItems.value.push({
      ingredient_id: activeIngredients.value[0].id,
      quantity: 1,
      scale_by_sugar: false,
    })
  }
  showBuilderModal.value = true
}

const isIngredientInactive = (ingId) => {
  if (!ingId) return false
  const found = ingredients.value.find((i) => i.id === ingId)
  if (found) return !found.is_active
  const row = builderItems.value.find((r) => r.ingredient_id === ingId)
  return row ? row.is_active === false : false
}

const getOptionsForRow = (row) => {
  const list = [...activeIngredients.value]
  if (row?.ingredient_id && !list.some((i) => i.id === row.ingredient_id)) {
    const inactiveFromList = ingredients.value.find((i) => i.id === row.ingredient_id)
    if (inactiveFromList) {
      list.unshift(inactiveFromList)
    } else if (row.ingredient_name) {
      list.unshift({
        id: row.ingredient_id,
        name: row.ingredient_name,
        unit: row.unit || '',
        current_stock: row.current_stock ?? 0,
        is_active: false,
      })
    }
  }
  return list
}

const addBuilderRow = () => {
  const usedIds = new Set(builderItems.value.map((r) => r.ingredient_id))
  const nextAvailable = activeIngredients.value.find((i) => !usedIds.has(i.id))
  builderItems.value.push({
    ingredient_id: nextAvailable ? nextAvailable.id : null,
    quantity: 1,
    scale_by_sugar: false,
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
  if (found) return found.unit
  const row = builderItems.value.find((r) => r.ingredient_id === ingId)
  return row ? row.unit || '' : ''
}

const copyFromSiblingVariant = (sibling) => {
  builderItems.value = (sibling.recipe || []).map((r) => ({
    ingredient_id: r.ingredient_id,
    ingredient_name: r.ingredient_name || '',
    unit: r.unit || '',
    current_stock: r.current_stock ?? 0,
    is_active: r.is_active !== false,
    quantity: Number(r.quantity),
    scale_by_sugar: Boolean(r.scale_by_sugar),
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
    if (isIngredientInactive(row.ingredient_id)) {
      const ingObj = ingredients.value.find((i) => i.id === row.ingredient_id)
      const ingName = ingObj?.name || row.ingredient_name || `#${row.ingredient_id}`
      toast.warning(`Cannot add inactive ingredient(s) to recipe: '${ingName}'`)
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
        scale_by_sugar: Boolean(r.scale_by_sugar),
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

const clearRecipeModal = reactive({
  show: false,
  variantId: null,
  variantName: '',
  isDeleting: false,
})

const handleDeleteVariantRecipe = (variant) => {
  clearRecipeModal.variantId = variant.id
  clearRecipeModal.variantName = variant.variant_name
  clearRecipeModal.show = true
}

const confirmClearVariantRecipe = async () => {
  if (!clearRecipeModal.variantId || clearRecipeModal.isDeleting) return
  clearRecipeModal.isDeleting = true
  try {
    await api.delete(`/inventory/recipes/variant/${clearRecipeModal.variantId}`)
    toast.success(`Recipe cleared for ${clearRecipeModal.variantName}`)
    clearRecipeModal.show = false
    await fetchProductRecipes(selectedProduct.value.id)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to clear recipe')
  } finally {
    clearRecipeModal.isDeleting = false
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
  grid-template-columns: 300px 1fr;
  gap: 1.15rem;
  align-items: start;
}

@media (max-width: 992px) {
  .recipes-layout {
    grid-template-columns: 1fr;
  }
}

/* ================= LEFT SIDEBAR: PRODUCT DIRECTORY ================= */
.products-sidebar-card {
  background: #ffffff;
  border: 1px solid var(--ledger-border);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
  position: sticky;
  top: 1rem;
}

.sidebar-header {
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--ledger-border-soft);
  background: #f9fcfb;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.sidebar-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-strong);
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
  font-size: 0.8rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 28px 0 32px;
  border-radius: 8px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  font-size: 0.82rem;
  color: var(--text-strong);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-input::placeholder {
  color: #8fa096;
}

.search-input:focus {
  outline: none;
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
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
  border-radius: 8px;
  border: 1px solid var(--ledger-border);
  font-size: 0.81rem;
  font-weight: 600;
  color: var(--text-body);
  background-color: #ffffff;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%232d5a43' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  background-size: 11px 9px;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.category-select:focus {
  outline: none;
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

/* Product Select List */
.product-select-list {
  overflow-y: auto;
  padding: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.product-select-item {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.68rem;
  transition: background-color 0.14s ease, border-color 0.14s ease;
  width: 100%;
  cursor: pointer;
  outline: none !important;
}

.product-select-item:hover {
  background: #f4f9f6;
}

.product-select-item.active {
  background: #eef6f1;
  border-color: #c3dbd0;
}

.prod-thumb-sm {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: var(--botanical-surface);
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 1rem;
  border: 1px solid var(--ledger-border-soft);
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
  font-size: 0.85rem;
  color: var(--text-strong);
  line-height: 1.25;
}

.product-select-item.active .prod-name-sm {
  color: var(--botanical-deep);
}

.prod-meta-sm {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.variant-pill-sm {
  font-size: 0.7rem;
  font-weight: 600;
  background: #f4f8f5;
  color: var(--text-body);
  border: 1px solid var(--ledger-border-soft);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.product-select-item.active .variant-pill-sm {
  background: #ffffff;
  color: var(--botanical-deep);
  border-color: #bdd6c7;
  font-weight: 700;
}

.empty-side {
  padding: 2.75rem 1rem;
  text-align: center;
}

.empty-side-text {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* ================= RIGHT PANEL: UNIFIED RECIPE SHEET ================= */
.variants-recipe-panel {
  min-width: 0;
}

.surface-card {
  background: #ffffff;
  border: 1px solid var(--ledger-border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.sheet-header {
  padding: 1.05rem 1.25rem;
  background: #ffffff;
  border-bottom: 1px solid var(--ledger-border-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.banner-product-info {
  display: flex;
  align-items: center;
  gap: 0.88rem;
  min-width: 0;
}

.prod-thumb-lg {
  width: 50px;
  height: 50px;
  border-radius: 11px;
  background: var(--botanical-surface);
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
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
  gap: 0.55rem;
}

.banner-product-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-strong);
  line-height: 1.25;
}

.product-cat-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.14rem 0.55rem;
  border-radius: 6px;
  background: #f2f7f4;
  color: var(--botanical-deep);
  font-size: 0.72rem;
  font-weight: 600;
}

.banner-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.configured-stat {
  color: var(--botanical-primary);
  font-weight: 600;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.btn-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 35px;
  padding: 0.35rem 0.82rem;
  border-radius: 8px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-toolbar:hover {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: #bdd1c5;
}

.btn-toolbar-icon {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-toolbar-icon:hover:not(:disabled) {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: #bdd1c5;
}

/* Ledger Table Tweaks */
.recipe-ledger-table th {
  padding: 0.7rem 1.15rem;
  background: #f7faf8;
  border-bottom: 1px solid var(--ledger-border-soft);
}

.recipe-ledger-table td {
  padding: 0.88rem 1.15rem;
}

.variant-cell {
  display: flex;
  align-items: center;
}

.variant-name {
  font-weight: 700;
  color: var(--text-strong);
  font-size: 0.88rem;
}

.price-val {
  font-weight: 700;
  color: var(--text-strong);
  font-size: 0.88rem;
}

/* Recipe Ingredients Cell — Empty & Quick Copy */
.no-recipe-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.no-recipe-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.58rem;
  border-radius: 6px;
  background: #f5f8f6;
  border: 1px solid var(--ledger-border-soft);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.copy-siblings-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.32rem;
}

.copy-label {
  font-size: 0.73rem;
  font-weight: 600;
  color: var(--text-muted);
}

.btn-copy-sibling {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.18rem 0.52rem;
  border-radius: 6px;
  border: 1px solid var(--ledger-border);
  background: #ffffff;
  color: var(--text-body);
  font-size: 0.73rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

.btn-copy-sibling:hover {
  background: var(--botanical-surface);
  color: var(--botanical-deep);
  border-color: var(--botanical-primary);
}

/* Structured Non-Breaking Ingredient Chips */
.recipe-chips-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.42rem;
}

.ing-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.24rem 0.58rem;
  border-radius: 7px;
  background: #f6faf8;
  border: 1px solid #dfeae3;
  font-size: 0.79rem;
  line-height: 1.25;
  white-space: nowrap;
}

.ing-chip__name {
  font-weight: 600;
  color: var(--text-strong);
}

.ing-chip__qty {
  font-weight: 700;
  color: var(--botanical-deep);
  padding-left: 0.35rem;
  border-left: 1px solid #d2e2d8;
}

.ing-chip__sugar {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 0.08rem 0.32rem;
  margin-left: 0.08rem;
  border-radius: 4px;
  background: #e3f2ea;
  color: var(--botanical-deep);
  font-size: 0.68rem;
  font-weight: 700;
  cursor: help;
}

.ing-chip.is-inactive {
  background: #fcf6f6;
  border-color: #f3d6d6;
}

.ing-chip.is-inactive .ing-chip__name,
.ing-chip.is-inactive .ing-chip__qty {
  opacity: 0.55;
  text-decoration: line-through;
}

.ing-chip__inactive {
  padding: 0.06rem 0.35rem;
  border-radius: 4px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 0.66rem;
  font-weight: 700;
}

/* Yield Readout Badge */
.yield-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.yield-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.yield-badge.is-ok {
  color: #1e6b43;
}

.yield-badge.is-low {
  color: #b91c1c;
}

.text-muted-dash {
  color: #9aa8a0;
  font-size: 0.85rem;
}

.btn-set-recipe {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 33px;
  padding: 0.32rem 0.82rem;
  border-radius: 7px;
  border: 1px solid var(--botanical-primary);
  background: var(--botanical-primary);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease;
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
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--botanical-surface);
  border: 1px solid var(--ledger-border);
  color: var(--botanical-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  margin-bottom: 0.7rem;
}

.empty-icon-circle--sm {
  width: 40px;
  height: 40px;
  font-size: 1.05rem;
  margin-bottom: 0.45rem;
}

.empty-main-title {
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 0.25rem;
}

.empty-main-desc {
  font-size: 0.81rem;
  color: var(--text-muted);
  max-width: 380px;
  margin: 0 auto;
}

/* ================= BUILDER MODAL ================= */
.modal-backdrop-custom {
  backdrop-filter: blur(2px);
}

.modal-card-custom {
  border-radius: 14px;
  border-color: var(--ledger-border);
  box-shadow: 0 20px 44px rgba(18, 30, 23, 0.14);
}

.modal-lg-custom {
  max-width: 660px;
}

.modal-header-custom {
  padding: 1.15rem 1.4rem 0.9rem;
  border-bottom: 1px solid var(--ledger-border-soft);
  background: #ffffff;
  align-items: flex-start;
}

.btn-close-plain {
  border: none;
  background: transparent;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.btn-close-plain:hover {
  color: var(--text-strong);
  background: #f3f7f4;
}

.modal-body-custom {
  padding: 1.05rem 1.4rem 1.2rem;
}

.modal-footer-custom {
  padding: 0.85rem 1.4rem 1.1rem;
  border-top: 1px solid var(--ledger-border-soft);
  background: #ffffff;
  justify-content: flex-end;
  gap: 0.5rem;
}

.builder-copy-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ledger-border-soft);
}

.copy-links {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.btn-copy-link {
  border: none;
  background: #f2f7f4;
  color: var(--botanical-deep);
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.22rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.btn-copy-link:hover {
  background: #e2efe7;
  color: var(--botanical-primary);
}

.empty-builder-state {
  padding: 1.75rem 1rem;
  text-align: center;
}

.builder-list {
  display: flex;
  flex-direction: column;
}

.builder-cols-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-bottom: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.builder-col-ing {
  flex: 1;
  min-width: 0;
}

.builder-col-qty {
  width: 135px;
  flex-shrink: 0;
}

.builder-col-sugar {
  width: 118px;
  flex-shrink: 0;
}

.builder-col-act {
  width: 28px;
  flex-shrink: 0;
}

.builder-rows {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.builder-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.builder-ing-col {
  flex: 1;
  min-width: 0;
}

.builder-qty-col {
  width: 135px;
  flex-shrink: 0;
}

.builder-sugar-col {
  width: 118px;
  flex-shrink: 0;
}

.btn-sugar-toggle {
  width: 100%;
  height: 38px;
  padding: 0 0.55rem;
  border-radius: 8px;
  border: 1px solid #d5e0d9;
  background: #f9fbfa;
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-sugar-toggle:hover {
  border-color: #b7cec0;
  color: var(--text-body);
}

.btn-sugar-toggle.is-active {
  background: #edf7f1;
  border-color: var(--botanical-primary);
  color: var(--botanical-deep);
  font-weight: 700;
}

.form-control-clean {
  border: 1px solid #d5e0d9;
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 0.84rem;
  color: var(--text-strong);
  height: 38px;
  min-height: 38px;
}

.form-control-clean:focus {
  border-color: var(--botanical-primary);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.qty-field {
  position: relative;
  display: flex;
  align-items: center;
}

.qty-field__input {
  padding-right: 2.6rem;
  -moz-appearance: textfield;
}

.qty-field__input::-webkit-outer-spin-button,
.qty-field__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qty-field__unit {
  position: absolute;
  right: 0.7rem;
  font-size: 0.73rem;
  font-weight: 700;
  color: var(--text-muted);
  pointer-events: none;
  user-select: none;
}

.btn-remove-plain {
  width: 28px;
  height: 38px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8c9c92;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.14s ease, background-color 0.14s ease;
}

.btn-remove-plain:hover {
  color: #dc2626;
  background: #fef2f2;
}

.btn-add-inline {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: var(--botanical-primary);
  font-size: 0.81rem;
  font-weight: 700;
  padding: 0.35rem 0.15rem;
  cursor: pointer;
  transition: color 0.14s ease;
}

.btn-add-inline:hover {
  color: var(--botanical-deep);
}

.btn-cancel-plain {
  height: 36px;
  padding: 0 0.85rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-body);
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.btn-cancel-plain:hover {
  background: #f3f7f4;
  color: var(--text-strong);
}

.btn-action-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.btn-primary-action {
  height: 36px;
  border-radius: 8px;
  padding: 0 1.1rem;
  font-size: 0.83rem;
  font-weight: 600;
  box-shadow: none;
}
</style>
