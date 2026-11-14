<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { getAssetUrl } from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import { useCurrency } from '@/composables/useCurrency'
import { useI18n } from '@/i18n'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()
const { t } = useI18n()

const getProductTypeLabel = (type) => {
  if (type === 'DRINK') return t('common.drink')
  if (type === 'FOOD') return t('common.food')
  if (type === 'ADDON') return t('common.addon')
  return type || '—'
}

const isOwner = computed(() => authStore.isOwner)

// Tabs: 'products' | 'categories'
const activeTab = ref('products')

// Data State
const categories = ref([])
const products = ref([])
const pagination = ref({ page: 1, limit: 50, total: 0, totalPages: 1 })
const isLoadingProducts = ref(false)
const isLoadingCategories = ref(false)

// Filters
const searchQuery = ref('')
const debouncedSearch = useDebounce(searchQuery, 300)
const selectedCategoryId = ref('')
const selectedProductType = ref('')

// Fetch Categories
const fetchCategories = async () => {
  isLoadingCategories.value = true
  try {
    const res = await api.get('/categories')
    categories.value = res.data?.data || []
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load categories')
  } finally {
    isLoadingCategories.value = false
  }
}

// Fetch Products
const fetchProducts = async (page = 1) => {
  isLoadingProducts.value = true
  try {
    const params = {
      page,
      limit: pagination.value.limit,
    }
    if (selectedCategoryId.value) params.category_id = selectedCategoryId.value
    if (selectedProductType.value) params.product_type = selectedProductType.value
    if (debouncedSearch.value?.trim()) params.search = debouncedSearch.value.trim()

    const res = await api.get('/products', { params })
    products.value = res.data?.data || []
    if (res.data?.pagination) {
      pagination.value = res.data.pagination
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load products')
  } finally {
    isLoadingProducts.value = false
  }
}

watch([debouncedSearch, selectedCategoryId, selectedProductType], () => {
  fetchProducts(1)
})

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchProducts(1)])
})

// ==========================================
// CATEGORY MODAL LOGIC
// ==========================================
const showCategoryModal = ref(false)
const isSavingCategory = ref(false)
const editingCategoryId = ref(null)

const categoryForm = reactive({
  name: '',
  sort_order: 0,
  is_active: true,
})

const categoryError = ref('')

const openCreateCategory = () => {
  editingCategoryId.value = null
  categoryForm.name = ''
  categoryForm.sort_order = categories.value.length
  categoryForm.is_active = true
  categoryError.value = ''
  showCategoryModal.value = true
}

const openEditCategory = (cat) => {
  editingCategoryId.value = cat.id
  categoryForm.name = cat.name
  categoryForm.sort_order = Number(cat.sort_order || 0)
  categoryForm.is_active = Boolean(cat.is_active)
  categoryError.value = ''
  showCategoryModal.value = true
}

const closeCategoryModal = () => {
  showCategoryModal.value = false
}

const handleSaveCategory = async () => {
  categoryError.value = ''
  const cleanName = categoryForm.name.trim()
  if (!cleanName) {
    categoryError.value = 'Category name is required'
    return
  }

  isSavingCategory.value = true
  try {
    const payload = {
      name: cleanName,
      sort_order: Math.max(0, parseInt(categoryForm.sort_order, 10) || 0),
      is_active: Boolean(categoryForm.is_active),
    }

    if (editingCategoryId.value) {
      const res = await api.put(`/categories/${editingCategoryId.value}`, payload)
      toast.success(res.data?.message || 'Category updated')
    } else {
      const res = await api.post('/categories', payload)
      toast.success(res.data?.message || 'Category created')
    }

    closeCategoryModal()
    await Promise.all([fetchCategories(), fetchProducts(pagination.value.page)])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save category')
  } finally {
    isSavingCategory.value = false
  }
}

// ==========================================
// PRODUCT MODAL LOGIC
// ==========================================
const showProductModal = ref(false)
const isSavingProduct = ref(false)
const editingProductId = ref(null)
const productImageInputRef = ref(null)
const pendingImageFile = ref(null)
const pendingImagePreview = ref('')
const existingImagePath = ref(null)
const removeExistingImage = ref(false)

const productForm = reactive({
  name: '',
  category_id: '',
  product_type: 'DRINK',
  description: '',
  is_active: true,
  variants: [],
})

const productErrors = reactive({
  name: '',
  category_id: '',
  variants: '',
})

const createDefaultVariant = (type = 'DRINK') => ({
  name: type === 'DRINK' ? 'Iced Regular' : 'Standard',
  size: type === 'DRINK' ? 'R' : '',
  temperature: type === 'DRINK' ? 'ICED' : 'NONE',
  price: '',
  is_active: true,
})

const clearProductErrors = () => {
  productErrors.name = ''
  productErrors.category_id = ''
  productErrors.variants = ''
}

const openCreateProduct = () => {
  if (categories.value.length === 0) {
    toast.warning('Please create at least one category first.')
    activeTab.value = 'categories'
    openCreateCategory()
    return
  }

  editingProductId.value = null
  productForm.name = ''
  productForm.category_id = selectedCategoryId.value || categories.value[0]?.id || ''
  productForm.product_type = 'DRINK'
  productForm.description = ''
  productForm.is_active = true
  productForm.variants = [createDefaultVariant('DRINK')]

  pendingImageFile.value = null
  pendingImagePreview.value = ''
  existingImagePath.value = null
  removeExistingImage.value = false

  clearProductErrors()
  showProductModal.value = true
}

const openEditProduct = (prod) => {
  editingProductId.value = prod.id
  productForm.name = prod.name || ''
  productForm.category_id = prod.category_id
  productForm.product_type = prod.product_type || 'DRINK'
  productForm.description = prod.description || ''
  productForm.is_active = Boolean(prod.is_active)

  productForm.variants =
    Array.isArray(prod.variants) && prod.variants.length > 0
      ? prod.variants.map((v) => ({
          id: v.id,
          name: v.name,
          size: v.size || '',
          temperature: v.temperature || 'NONE',
          price: Number(v.price),
          is_active: Boolean(v.is_active),
        }))
      : [createDefaultVariant(prod.product_type)]

  pendingImageFile.value = null
  pendingImagePreview.value = ''
  existingImagePath.value = prod.image || null
  removeExistingImage.value = false

  clearProductErrors()
  showProductModal.value = true
}

const closeProductModal = () => {
  if (pendingImagePreview.value) {
    URL.revokeObjectURL(pendingImagePreview.value)
  }
  showProductModal.value = false
}

const currentProductPreviewUrl = computed(() => {
  if (pendingImagePreview.value) return pendingImagePreview.value
  if (!removeExistingImage.value && existingImagePath.value) {
    return getAssetUrl(existingImagePath.value)
  }
  return ''
})

const triggerProductImageSelect = () => {
  productImageInputRef.value?.click()
}

const handleProductImageSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Only JPG, PNG, or WEBP images are allowed.')
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error('Product image must be under 5MB.')
    event.target.value = ''
    return
  }

  if (pendingImagePreview.value) {
    URL.revokeObjectURL(pendingImagePreview.value)
  }

  pendingImageFile.value = file
  pendingImagePreview.value = URL.createObjectURL(file)
  removeExistingImage.value = false
  event.target.value = ''
}

const handleClearProductImage = () => {
  if (pendingImagePreview.value) {
    URL.revokeObjectURL(pendingImagePreview.value)
  }
  pendingImageFile.value = null
  pendingImagePreview.value = ''
  if (existingImagePath.value) {
    removeExistingImage.value = true
  }
}

const addVariantRow = () => {
  productForm.variants.push({
    name: '',
    size: '',
    temperature: productForm.product_type === 'DRINK' ? 'ICED' : 'NONE',
    price: '',
    is_active: true,
  })
}

const removeVariantRow = (index) => {
  if (productForm.variants.length <= 1) {
    toast.warning('A product must have at least one variant.')
    return
  }
  productForm.variants.splice(index, 1)
}

const validateProductForm = () => {
  clearProductErrors()
  let valid = true

  if (!productForm.name.trim()) {
    productErrors.name = 'Product name is required'
    valid = false
  }

  if (!productForm.category_id) {
    productErrors.category_id = 'Please select a category'
    valid = false
  }

  if (!productForm.variants.length) {
    productErrors.variants = 'At least one variant is required'
    return false
  }

  const seenNames = new Set()
  for (let i = 0; i < productForm.variants.length; i++) {
    const v = productForm.variants[i]
    const vName = (v.name || '').trim()
    if (!vName) {
      productErrors.variants = `Variant #${i + 1}: Name is required`
      valid = false
      break
    }
    const lower = vName.toLowerCase()
    if (seenNames.has(lower)) {
      productErrors.variants = `Duplicate variant name "${vName}"`
      valid = false
      break
    }
    seenNames.add(lower)

    if (v.price === '' || v.price === null || isNaN(Number(v.price)) || Number(v.price) < 0) {
      productErrors.variants = `Variant "${vName}": Valid price is required`
      valid = false
      break
    }
  }

  return valid
}

const handleSaveProduct = async () => {
  if (!validateProductForm()) return

  isSavingProduct.value = true
  try {
    const formattedVariants = productForm.variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      name: v.name.trim(),
      size: v.size?.trim() ? v.size.trim() : null,
      temperature: productForm.product_type === 'DRINK' ? v.temperature || 'NONE' : 'NONE',
      price: Number(Number(v.price).toFixed(2)),
      is_active: Boolean(v.is_active),
    }))

    const payload = {
      category_id: Number(productForm.category_id),
      name: productForm.name.trim(),
      product_type: productForm.product_type,
      description: productForm.description?.trim() ? productForm.description.trim() : null,
      is_active: Boolean(productForm.is_active),
      variants: formattedVariants,
    }

    let savedProductId = editingProductId.value

    if (editingProductId.value) {
      await api.put(`/products/${editingProductId.value}`, payload)
    } else {
      const res = await api.post('/products', payload)
      savedProductId = res.data?.data?.id
    }

    // Handle Image Upload or Removal
    if (savedProductId) {
      if (pendingImageFile.value) {
        const formData = new FormData()
        formData.append('image', pendingImageFile.value)
        await api.put(`/products/${savedProductId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else if (removeExistingImage.value && existingImagePath.value) {
        await api.delete(`/products/${savedProductId}/image`)
      }
    }

    toast.success(editingProductId.value ? 'Product updated' : 'Product created')
    closeProductModal()
    await Promise.all([fetchProducts(pagination.value.page), fetchCategories()])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save product')
  } finally {
    isSavingProduct.value = false
  }
}

// ==========================================
// DELETE CONFIRMATION MODAL
// ==========================================
const deleteModal = reactive({
  show: false,
  type: '', // 'product' | 'category'
  id: null,
  name: '',
  isDeleting: false,
})

const confirmDeleteProduct = (prod) => {
  deleteModal.type = 'product'
  deleteModal.id = prod.id
  deleteModal.name = prod.name
  deleteModal.show = true
}

const confirmDeleteCategory = (cat) => {
  deleteModal.type = 'category'
  deleteModal.id = cat.id
  deleteModal.name = cat.name
  deleteModal.show = true
}

const handleConfirmDelete = async () => {
  if (!deleteModal.id || deleteModal.isDeleting) return
  deleteModal.isDeleting = true
  try {
    if (deleteModal.type === 'product') {
      const res = await api.delete(`/products/${deleteModal.id}`)
      toast.success(res.data?.message || 'Product deleted')
    } else {
      const res = await api.delete(`/categories/${deleteModal.id}`)
      toast.success(res.data?.message || 'Category deleted')
      if (selectedCategoryId.value === deleteModal.id) {
        selectedCategoryId.value = ''
      }
    }
    deleteModal.show = false
    await Promise.all([fetchCategories(), fetchProducts(1)])
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete item')
  } finally {
    deleteModal.isDeleting = false
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategoryId.value = ''
  selectedProductType.value = ''
}
</script>

<template>
  <div class="products-page">
    <!-- Top Segmented Tabs & Primary Action Bar -->
    <div class="products-top-bar">
      <div class="products-segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'products' }"
          @click="activeTab = 'products'"
        >
          <i class="bi bi-cup-hot"></i>
          <span>{{ $t('products.tabProducts') }}</span>
          <span class="seg-tab-count tabular">{{ pagination.total || products.length }}</span>
        </button>
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: activeTab === 'categories' }"
          @click="activeTab = 'categories'"
        >
          <i class="bi bi-tags"></i>
          <span>{{ $t('products.tabCategories') }}</span>
          <span class="seg-tab-count tabular">{{ categories.length }}</span>
        </button>
      </div>

      <div v-if="isOwner" class="products-top-bar__right">
        <button
          v-if="activeTab === 'products'"
          type="button"
          class="btn-primary-action"
          @click="openCreateProduct"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('products.addProduct') }}</span>
        </button>
        <button
          v-else
          type="button"
          class="btn-primary-action"
          @click="openCreateCategory"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('products.addCategory') }}</span>
        </button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: PRODUCTS VIEW                       -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'products'" class="clean-card">
      <!-- Single-Row Filter Toolbar -->
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('products.searchProduct')"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear"
              @click="searchQuery = ''"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <select
            v-model="selectedCategoryId"
            class="filter-input filter-select"
          >
            <option value="">{{ $t('common.allCategories') }}</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ $tCategory(cat.name) }} ({{ cat.total_products }})
            </option>
          </select>

          <select
            v-model="selectedProductType"
            class="filter-input filter-select"
          >
            <option value="">{{ $t('common.allTypes') }}</option>
            <option value="DRINK">{{ $t('common.drink') }}</option>
            <option value="FOOD">{{ $t('common.food') }}</option>
            <option value="ADDON">{{ $t('common.addon') }}</option>
          </select>
        </div>

        <div class="filter-bar__right">
          <button
            v-if="searchQuery || selectedCategoryId || selectedProductType"
            type="button"
            class="toolbar-btn"
            @click="clearFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ $t('common.reset') }}</span>
          </button>
        </div>
      </div>

      <div v-if="isLoadingProducts" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('products.loadingProducts') }}</div>
      </div>

      <div v-else-if="products.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-cup-hot"></i>
        </div>
        <div class="empty-box__title">{{ $t('products.noProductsFound') }}</div>
        <div class="empty-box__desc">{{ $t('products.noProductsFoundDesc') }}</div>
        <button
          v-if="isOwner"
          type="button"
          class="btn-primary-action mt-3"
          @click="openCreateProduct"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('products.addFirstProduct') }}</span>
        </button>
      </div>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th>{{ $t('products.colProduct') }}</th>
              <th>{{ $t('products.colCategory') }}</th>
              <th>{{ $t('products.colType') }}</th>
              <th>{{ $t('products.colVariantsPrice') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th v-if="isOwner" class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prod in products" :key="prod.id">
              <td>
                <div class="product-cell">
                  <div class="prod-thumb">
                    <img
                      v-if="prod.image"
                      :src="getAssetUrl(prod.image)"
                      :alt="prod.name"
                      class="w-100 h-100 object-fit-cover"
                    />
                    <i
                      v-else
                      class="bi"
                      :class="
                        prod.product_type === 'FOOD'
                          ? 'bi-cake2'
                          : prod.product_type === 'ADDON'
                            ? 'bi-plus-circle'
                            : 'bi-cup-hot'
                      "
                    ></i>
                  </div>
                  <div class="product-cell__info">
                    <div class="product-cell__name">{{ prod.name }}</div>
                    <div v-if="prod.description" class="product-cell__desc text-truncate">
                      {{ prod.description }}
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <span class="cat-text">{{ $tCategory(prod.category_name) }}</span>
              </td>

              <td>
                <span class="type-text" :class="`type-text--${prod.product_type.toLowerCase()}`">
                  {{ getProductTypeLabel(prod.product_type) }}
                </span>
              </td>

              <td>
                <div v-if="prod.variants && prod.variants.length > 0" class="variant-dropdown-wrap">
                  <select
                    class="form-select form-select-sm variant-select tabular"
                    title="Select variant to view price"
                  >
                    <option
                      v-for="v in prod.variants"
                      :key="v.id"
                      :value="v.id"
                    >
                      {{ v.name }} — {{ formatUsd(v.price) }}{{ !v.is_active ? ` (${$t('common.inactive')})` : '' }}
                    </option>
                  </select>
                </div>
                <span v-else class="text-muted small">—</span>
              </td>

              <td>
                <span
                  class="status-text"
                  :class="prod.is_active ? 'active' : 'inactive'"
                >
                  {{ prod.is_active ? $t('common.active') : $t('common.inactive') }}
                </span>
              </td>

              <td v-if="isOwner" class="text-end">
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.edit')"
                    @click="openEditProduct(prod)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-action-icon is-danger"
                    :title="$t('common.delete')"
                    @click="confirmDeleteProduct(prod)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div
        v-if="pagination.totalPages > 1"
        class="pagination-bar"
      >
        <span class="pagination-info tabular">
          {{ $t('common.pageOf', { page: pagination.page, total: pagination.totalPages }) }}
        </span>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page <= 1"
            @click="fetchProducts(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.previous') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchProducts(pagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: CATEGORIES VIEW                     -->
    <!-- ========================================== -->
    <div v-else class="clean-card">
      <div v-if="isLoadingCategories" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('products.loadingCategories') }}</div>
      </div>

      <div v-else-if="categories.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-tags"></i>
        </div>
        <div class="empty-box__title">{{ $t('products.noCategoriesYet') }}</div>
        <div class="empty-box__desc">{{ $t('products.noCategoriesYetDesc') }}</div>
        <button
          v-if="isOwner"
          type="button"
          class="btn-primary-action mt-3"
          @click="openCreateCategory"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ $t('products.createFirstCategory') }}</span>
        </button>
      </div>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th style="width: 100px">{{ $t('products.colOrder') }}</th>
              <th>{{ $t('products.colCategoryName') }}</th>
              <th>{{ $t('products.colProducts') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th v-if="isOwner" class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id">
              <td>
                <span class="order-text tabular">#{{ cat.sort_order }}</span>
              </td>
              <td>
                <span class="product-cell__name">{{ $tCategory(cat.name) }}</span>
              </td>
              <td>
                <span class="items-text tabular">
                  {{ $t('orders.itemsCount', { count: cat.total_products }) }}
                </span>
              </td>
              <td>
                <span
                  class="status-text"
                  :class="cat.is_active ? 'active' : 'inactive'"
                >
                  {{ cat.is_active ? $t('common.active') : $t('common.inactive') }}
                </span>
              </td>
              <td v-if="isOwner" class="text-end">
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.edit')"
                    @click="openEditCategory(cat)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-action-icon is-danger"
                    :title="$t('common.delete')"
                    @click="confirmDeleteCategory(cat)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CREATE / EDIT CATEGORY            -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div v-if="showCategoryModal" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="modal-card bg-white p-4" style="max-width: 420px">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0">
              {{ editingCategoryId ? $t('products.editCategory') : $t('products.newCategory') }}
            </h5>
            <button type="button" class="btn-close btn-sm" @click="closeCategoryModal"></button>
          </div>

          <form @submit.prevent="handleSaveCategory">
            <BaseInput
              v-model="categoryForm.name"
              :label="$t('products.categoryNameLabel')"
              :placeholder="$t('products.categoryNamePlaceholder')"
              :error="categoryError"
              required
              autofocus
            />

            <BaseInput
              v-model="categoryForm.sort_order"
              type="number"
              :label="$t('products.displayOrderLabel')"
              placeholder="0"
            />

            <div class="form-check mb-4">
              <input
                id="catActive"
                v-model="categoryForm.is_active"
                type="checkbox"
                class="form-check-input custom-check"
              />
              <label for="catActive" class="form-check-label small fw-medium">
                {{ $t('products.activeCategoryCheck') }}
              </label>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-2 border-top">
              <BaseButton type="button" variant="secondary" @click="closeCategoryModal">
                {{ $t('common.cancel') }}
              </BaseButton>
              <BaseButton type="submit" variant="primary" :loading="isSavingCategory">
                {{ editingCategoryId ? $t('common.saveChanges') : $t('common.create') }}
              </BaseButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ========================================== -->
    <!-- MODAL 2: CREATE / EDIT PRODUCT             -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div v-if="showProductModal" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="modal-card modal-card--lg bg-white p-4">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0">
              {{ editingProductId ? $t('products.editProduct') : $t('products.newProduct') }}
            </h5>
            <button type="button" class="btn-close btn-sm" @click="closeProductModal"></button>
          </div>

          <form @submit.prevent="handleSaveProduct">
            <!-- Image Upload Row -->
            <div class="d-flex align-items-center justify-content-between gap-3 pb-3 mb-3 border-bottom">
              <div class="d-flex align-items-center gap-3">
                <div class="prod-image-box d-flex align-items-center justify-content-center overflow-hidden">
                  <img
                    v-if="currentProductPreviewUrl"
                    :src="currentProductPreviewUrl"
                    alt="Product Preview"
                    class="w-100 h-100 object-fit-cover"
                  />
                  <i v-else class="bi bi-image fs-4 text-muted"></i>
                </div>
                <div>
                  <div class="small fw-medium text-dark">{{ $t('products.productImage') }}</div>
                  <div class="text-muted" style="font-size: 12px">{{ $t('products.imageHint') }}</div>
                </div>
              </div>

              <div class="d-flex gap-2">
                <input
                  ref="productImageInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="d-none"
                  @change="handleProductImageSelect"
                />
                <BaseButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  @click="triggerProductImageSelect"
                >
                  {{ currentProductPreviewUrl ? $t('common.change') : $t('common.upload') }}
                </BaseButton>
                <BaseButton
                  v-if="currentProductPreviewUrl"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-danger"
                  @click="handleClearProductImage"
                >
                  {{ $t('common.remove') }}
                </BaseButton>
              </div>
            </div>

            <!-- Basic Info -->
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <BaseInput
                  v-model="productForm.name"
                  :label="$t('products.productNameLabel')"
                  :placeholder="$t('products.productNamePlaceholder')"
                  :error="productErrors.name"
                  required
                />
              </div>

              <div class="col-6 col-md-3 mb-3">
                <label class="form-label mb-1 fw-medium small text-dark">
                  {{ $t('products.colCategory') }} <span class="text-danger">*</span>
                </label>
                <select v-model="productForm.category_id" class="form-select clean-select-input">
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ $tCategory(cat.name) }}
                  </option>
                </select>
                <div v-if="productErrors.category_id" class="text-danger small mt-1">
                  {{ productErrors.category_id }}
                </div>
              </div>

              <div class="col-6 col-md-3 mb-3">
                <label class="form-label mb-1 fw-medium small text-dark">{{ $t('products.colType') }}</label>
                <select v-model="productForm.product_type" class="form-select clean-select-input">
                  <option value="DRINK">{{ $t('common.drink') }}</option>
                  <option value="FOOD">{{ $t('common.food') }}</option>
                  <option value="ADDON">{{ $t('common.addon') }}</option>
                </select>
              </div>
            </div>

            <div class="mb-3">
              <BaseInput
                v-model="productForm.description"
                :label="$t('products.descriptionOptional')"
                :placeholder="$t('products.descriptionPlaceholder')"
                class="mb-0"
              />
            </div>

            <!-- Variants Section -->
            <div class="variants-box p-3 rounded-3 mb-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <span class="fw-semibold small text-dark">{{ $t('products.variantsAndPricing') }}</span>
                  <span class="text-muted small ms-2">({{ productForm.variants.length }})</span>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-link text-decoration-none p-0 fw-semibold add-variant-btn"
                  @click="addVariantRow"
                >
                  {{ $t('products.addVariant') }}
                </button>
              </div>

              <div v-if="productErrors.variants" class="text-danger small fw-medium mb-2">
                {{ productErrors.variants }}
              </div>

              <div class="d-flex flex-column gap-2">
                <div
                  v-for="(v, idx) in productForm.variants"
                  :key="idx"
                  class="variant-row row g-2 align-items-center bg-white p-2 rounded-2 border"
                >
                  <div class="col-12 col-sm-4">
                    <input
                      v-model="v.name"
                      type="text"
                      class="form-control form-control-sm"
                      :placeholder="$t('products.variantNamePlaceholder')"
                      required
                    />
                  </div>

                  <div class="col-4 col-sm-2">
                    <input
                      v-model="v.size"
                      type="text"
                      class="form-control form-control-sm"
                      :placeholder="$t('products.sizePlaceholder')"
                    />
                  </div>

                  <div v-if="productForm.product_type === 'DRINK'" class="col-4 col-sm-2">
                    <select v-model="v.temperature" class="form-select form-select-sm">
                      <option value="ICED">ICED</option>
                      <option value="HOT">HOT</option>
                      <option value="NONE">NONE</option>
                    </select>
                  </div>

                  <div :class="productForm.product_type === 'DRINK' ? 'col-4 col-sm-2' : 'col-6 col-sm-4'">
                    <div class="input-group input-group-sm">
                      <span class="input-group-text bg-light">$</span>
                      <input
                        v-model="v.price"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-control form-control-sm numeric-tabular"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div class="col-12 col-sm-2 d-flex align-items-center justify-content-end">
                    <button
                      type="button"
                      class="btn btn-sm text-danger p-1 border-0"
                      :disabled="productForm.variants.length <= 1"
                      title="Remove variant"
                      @click="removeVariantRow(idx)"
                    >
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
              <BaseButton type="button" variant="secondary" @click="closeProductModal">
                {{ $t('common.cancel') }}
              </BaseButton>
              <BaseButton type="submit" variant="primary" :loading="isSavingProduct">
                {{ editingProductId ? $t('common.saveChanges') : $t('products.createProduct') }}
              </BaseButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ========================================== -->
    <!-- MODAL 3: DELETE CONFIRMATION               -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div v-if="deleteModal.show" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="modal-card bg-white p-4" style="max-width: 400px">
          <h5 class="fw-semibold mb-2">{{ $t('products.deleteConfirmTitle', { type: deleteModal.type }) }}</h5>
          <p class="text-muted small mb-4">
            {{ $t('products.deleteConfirmDesc', { name: deleteModal.name }) }}
          </p>
          <div class="d-flex justify-content-end gap-2">
            <BaseButton
              type="button"
              variant="secondary"
              :disabled="deleteModal.isDeleting"
              @click="deleteModal.show = false"
            >
              {{ $t('common.cancel') }}
            </BaseButton>
            <BaseButton
              type="button"
              variant="danger"
              :loading="deleteModal.isDeleting"
              @click="handleConfirmDelete"
            >
              {{ $t('common.delete') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.products-page {
  --botanical-primary: #2d5a43;
  --botanical-deep: #193e2b;
  --botanical-tint: #eaf5ee;
  --botanical-border: #3b7054;
  --ledger-line: #dce6e0;
  --ledger-hairline: #ecf2ee;
  --roast-ink: #1e2a23;
  --sage-muted: #62756a;

  width: 100%;
  max-width: 1560px;
  margin: 0 auto;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* ── Top Bar: Segmented Tabs & Primary Action ── */
.products-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.products-segmented-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #e9f0ec;
  border: 1px solid var(--ledger-line);
  border-radius: 10px;
}

.seg-tab-btn {
  border: none;
  background: transparent;
  padding: 0.44rem 0.95rem;
  border-radius: 7px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4f6356;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-tab-btn i {
  font-size: 0.9rem;
}

.seg-tab-btn:hover:not(.active) {
  color: var(--roast-ink);
  background: rgba(255, 255, 255, 0.5);
}

.seg-tab-btn.active {
  background: #ffffff;
  color: var(--botanical-deep);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(20, 35, 26, 0.08);
}

.seg-tab-count {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.08rem 0.42rem;
  border-radius: 999px;
  background: #dce8e1;
  color: var(--botanical-primary);
}

.seg-tab-btn.active .seg-tab-count {
  background: var(--botanical-tint);
  color: var(--botanical-deep);
}

.products-top-bar__right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.btn-primary-action {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  height: 38px;
  padding: 0 1.05rem;
  border-radius: 9px;
  background: var(--botanical-primary);
  border: 1px solid var(--botanical-primary);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.16);
}

.btn-primary-action:hover {
  background: var(--botanical-deep);
  border-color: var(--botanical-deep);
}

/* ── Main Card & Filter Toolbar ── */
.clean-card {
  background: #ffffff;
  border: 1px solid var(--ledger-line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.filter-bar {
  padding: 0.78rem 1.05rem;
  border-bottom: 1px solid var(--ledger-hairline);
  background: #f8fbf9;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.filter-bar__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  flex: 1;
}

.filter-bar__right {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.search-wrap {
  position: relative;
  min-width: 245px;
  flex: 0 1 290px;
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sage-muted);
  font-size: 0.8rem;
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--sage-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  cursor: pointer;
}

.search-clear:hover {
  background: #e8f0eb;
  color: var(--roast-ink);
}

.filter-input {
  height: 36px;
  border-radius: 8px;
  border: 1.5px solid #dce6e0;
  background: #ffffff;
  color: var(--roast-ink);
  font-size: 0.81rem;
  font-weight: 500;
  padding: 0 0.75rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}

.filter-input:focus {
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.search-input {
  width: 100%;
  padding-left: 32px;
  padding-right: 28px;
}

.filter-select {
  padding-right: 1.85rem;
  cursor: pointer;
}

/* Toolbar Buttons */
.toolbar-btn {
  height: 36px;
  padding: 0 0.8rem;
  border: 1.5px solid #dce6e0;
  border-radius: 8px;
  background: #ffffff;
  color: #3d5245;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.14s ease;
  white-space: nowrap;
}

.toolbar-btn:hover:not(:disabled) {
  border-color: #b8ccc0;
  background: #f2f7f4;
  color: var(--roast-ink);
}

.toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Clean Ledger Table ── */
.clean-table th {
  background: #f4f8f5;
  font-size: 0.75rem;
  color: #4f6356;
  font-weight: 700;
  padding: 0.72rem 1rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.78rem 1rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.84rem;
  color: var(--roast-ink);
}

.clean-table tbody tr:hover td {
  background-color: #f8fbf9;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

/* Product Cell */
.product-cell {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.prod-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f2f7f4;
  border: 1px solid var(--ledger-line);
  color: var(--botanical-primary);
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.product-cell__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.product-cell__name {
  font-weight: 700;
  color: var(--roast-ink);
  font-size: 0.87rem;
}

.product-cell__desc {
  font-size: 0.75rem;
  color: var(--sage-muted);
  max-width: 240px;
}

/* Category & Type Text */
.cat-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--roast-ink);
  white-space: nowrap;
}

.type-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.type-text--drink {
  color: var(--botanical-deep);
}

.type-text--food {
  color: #92400e;
}

.type-text--addon {
  color: #4b5563;
}

/* Variant Dropdown */
.variant-dropdown-wrap {
  display: inline-block;
  min-width: 175px;
  max-width: 235px;
}

.variant-select {
  height: 33px;
  font-size: 0.79rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1.5px solid #dce6e0;
  background-color: #f8fbf9;
  color: var(--botanical-deep);
  cursor: pointer;
  padding: 0.2rem 1.85rem 0.2rem 0.68rem;
  transition: all 0.14s ease;
  outline: none;
}

.variant-select:hover {
  background-color: #ffffff;
  border-color: #b8ccc0;
}

.variant-select:focus {
  background-color: #ffffff;
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

/* Order & Items Text (Categories Tab) */
.order-text {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--botanical-deep);
}

.items-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--roast-ink);
}

/* Status Text */
.status-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-text.active {
  color: #166534;
}

.status-text.inactive {
  color: #526358;
}

/* Action Buttons */
.action-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.btn-action-icon {
  width: 31px;
  height: 31px;
  border-radius: 7px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: #465a4e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  transition: all 0.14s ease;
  cursor: pointer;
}

.btn-action-icon:hover {
  background: var(--botanical-tint);
  border-color: var(--botanical-border);
  color: var(--botanical-deep);
}

.btn-action-icon.is-danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.btn-action-icon.is-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

/* Pagination & Empty States */
.pagination-bar {
  padding: 0.72rem 1.05rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fbf9;
  border-top: 1px solid var(--ledger-hairline);
}

.pagination-info {
  font-size: 0.8rem;
  font-weight: 600;
  color: #3d5245;
}

.empty-box {
  padding: 3.5rem 1.25rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-box__icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 0.65rem;
  border-radius: 10px;
  background: #f0f6f2;
  border: 1px solid #dce6e0;
  color: #3b7054;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.empty-box__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin-bottom: 2px;
}

.empty-box__desc {
  font-size: 0.8rem;
  color: var(--sage-muted);
  max-width: 380px;
}

/* Modal Styles */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background-color: rgba(18, 28, 22, 0.45);
  backdrop-filter: blur(2px);
  z-index: 1060;
}

.modal-card {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--ledger-line);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 45px rgba(15, 28, 21, 0.16);
}

.modal-card--lg {
  max-width: 680px;
}

.clean-select-input {
  height: 42px;
  border-radius: 9px;
  border: 1.5px solid #dce6e0;
  font-size: 0.85rem;
}

.clean-select-input:focus {
  border-color: var(--botanical-border);
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.08);
}

.prod-image-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background-color: #f2f7f4;
  border: 1px solid var(--ledger-line);
}

.variants-box {
  background-color: #f8fbf9;
  border: 1px solid var(--ledger-line);
}

.add-variant-btn {
  color: var(--botanical-primary);
  font-size: 0.82rem;
}

.custom-check:checked {
  background-color: #2d5a43;
  border-color: #2d5a43;
}
</style>
