<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { getAssetUrl } from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import { useCurrency } from '@/composables/useCurrency'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const authStore = useAuthStore()
const toast = useToast()
const { formatUsd } = useCurrency()

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
</script>

<template>
  <div class="products-page mx-auto">
    <!-- Top Bar: Tabs & Action Button -->
    <div
      class="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4"
    >
      <div class="tab-switcher d-inline-flex p-1 rounded-3 bg-white border">
        <button
          type="button"
          class="tab-btn px-3 py-1 rounded-2"
          :class="{ active: activeTab === 'products' }"
          @click="activeTab = 'products'"
        >
          Products ({{ pagination.total || products.length }})
        </button>
        <button
          type="button"
          class="tab-btn px-3 py-1 rounded-2"
          :class="{ active: activeTab === 'categories' }"
          @click="activeTab = 'categories'"
        >
          Categories ({{ categories.length }})
        </button>
      </div>

      <div v-if="isOwner">
        <BaseButton
          v-if="activeTab === 'products'"
          variant="primary"
          size="md"
          @click="openCreateProduct"
        >
          <template #prefix><i class="bi bi-plus-lg"></i></template>
          Add Product
        </BaseButton>
        <BaseButton
          v-else
          variant="primary"
          size="md"
          @click="openCreateCategory"
        >
          <template #prefix><i class="bi bi-plus-lg"></i></template>
          Add Category
        </BaseButton>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: PRODUCTS VIEW                       -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'products'">
      <!-- Filters Card -->
      <div class="clean-card bg-white p-3 mb-3">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-5">
            <BaseInput
              v-model="searchQuery"
              type="search"
              placeholder="Search product name..."
              size="sm"
              clearable
              class="mb-0"
            />
          </div>

          <div class="col-6 col-md-4">
            <select v-model="selectedCategoryId" class="form-select form-select-sm clean-select">
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }} ({{ cat.total_products }})
              </option>
            </select>
          </div>

          <div class="col-6 col-md-3">
            <select v-model="selectedProductType" class="form-select form-select-sm clean-select">
              <option value="">All Types</option>
              <option value="DRINK">Drink</option>
              <option value="FOOD">Food</option>
              <option value="ADDON">Add-on</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Products Table Card -->
      <div class="clean-card bg-white overflow-hidden">
        <div v-if="isLoadingProducts" class="text-center py-5 text-muted small">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Loading products...
        </div>

        <div v-else-if="products.length === 0" class="text-center py-5 px-3">
          <i class="bi bi-cup-hot fs-2 text-muted d-block mb-2"></i>
          <div class="fw-semibold mb-1">No products found</div>
          <p class="text-muted small mb-3">
            Add your drinks, food, and add-ons so they appear on the POS screen.
          </p>
          <BaseButton v-if="isOwner" variant="primary" size="sm" @click="openCreateProduct">
            Add First Product
          </BaseButton>
        </div>

        <div v-else class="table-responsive">
          <table class="table align-middle mb-0 clean-table">
            <thead>
              <tr>
                <th class="ps-4">Product</th>
                <th>Category</th>
                <th>Type</th>
                <th>Variants & Price</th>
                <th>Status</th>
                <th v-if="isOwner" class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prod in products" :key="prod.id">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-3">
                    <div
                      class="prod-thumb d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
                    >
                      <img
                        v-if="prod.image"
                        :src="getAssetUrl(prod.image)"
                        :alt="prod.name"
                        class="w-100 h-100 object-fit-cover"
                      />
                      <i
                        v-else
                        class="bi text-muted"
                        :class="
                          prod.product_type === 'FOOD'
                            ? 'bi-cake2'
                            : prod.product_type === 'ADDON'
                              ? 'bi-plus-circle'
                              : 'bi-cup-hot'
                        "
                      ></i>
                    </div>
                    <div>
                      <div class="fw-semibold text-dark">{{ prod.name }}</div>
                      <div v-if="prod.description" class="text-muted small text-truncate" style="max-width: 220px">
                        {{ prod.description }}
                      </div>
                    </div>
                  </div>
                </td>

                <td>
                  <span class="text-secondary small fw-medium">{{ prod.category_name }}</span>
                </td>

                <td>
                  <span class="type-pill" :class="`type-pill--${prod.product_type.toLowerCase()}`">
                    {{ prod.product_type }}
                  </span>
                </td>

                <td>
                  <div class="d-flex flex-wrap gap-1">
                    <span
                      v-for="v in prod.variants"
                      :key="v.id"
                      class="variant-chip numeric-tabular"
                      :class="{ 'opacity-50': !v.is_active }"
                    >
                      <span>{{ v.name }}</span>
                      <strong class="ms-1">{{ formatUsd(v.price) }}</strong>
                    </span>
                  </div>
                </td>

                <td>
                  <span
                    class="status-dot-badge"
                    :class="prod.is_active ? 'status-active' : 'status-inactive'"
                  >
                    {{ prod.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>

                <td v-if="isOwner" class="text-end pe-4">
                  <div class="d-inline-flex gap-1">
                    <button
                      type="button"
                      class="btn-action"
                      title="Edit product"
                      @click="openEditProduct(prod)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      class="btn-action btn-action--danger"
                      title="Delete product"
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
          class="d-flex align-items-center justify-content-between px-4 py-3 border-top small text-muted"
        >
          <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
          <div class="d-flex gap-2">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="pagination.page <= 1"
              @click="fetchProducts(pagination.page - 1)"
            >
              Previous
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="pagination.page >= pagination.totalPages"
              @click="fetchProducts(pagination.page + 1)"
            >
              Next
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: CATEGORIES VIEW                     -->
    <!-- ========================================== -->
    <div v-else>
      <div class="clean-card bg-white overflow-hidden">
        <div v-if="isLoadingCategories" class="text-center py-5 text-muted small">
          <span class="spinner-border spinner-border-sm me-2"></span>
          Loading categories...
        </div>

        <div v-else-if="categories.length === 0" class="text-center py-5 px-3">
          <i class="bi bi-tags fs-2 text-muted d-block mb-2"></i>
          <div class="fw-semibold mb-1">No categories yet</div>
          <p class="text-muted small mb-3">
            Create categories like Coffee, Non-Coffee, Bakery, or Add-ons first.
          </p>
          <BaseButton v-if="isOwner" variant="primary" size="sm" @click="openCreateCategory">
            Create First Category
          </BaseButton>
        </div>

        <div v-else class="table-responsive">
          <table class="table align-middle mb-0 clean-table">
            <thead>
              <tr>
                <th class="ps-4" style="width: 90px">Order</th>
                <th>Category Name</th>
                <th>Products</th>
                <th>Status</th>
                <th v-if="isOwner" class="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in categories" :key="cat.id">
                <td class="ps-4 text-muted small numeric-tabular">#{{ cat.sort_order }}</td>
                <td class="fw-semibold text-dark">{{ cat.name }}</td>
                <td>
                  <span class="text-muted small numeric-tabular">
                    {{ cat.total_products }} item(s)
                  </span>
                </td>
                <td>
                  <span
                    class="status-dot-badge"
                    :class="cat.is_active ? 'status-active' : 'status-inactive'"
                  >
                    {{ cat.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td v-if="isOwner" class="text-end pe-4">
                  <div class="d-inline-flex gap-1">
                    <button
                      type="button"
                      class="btn-action"
                      title="Edit category"
                      @click="openEditCategory(cat)"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      type="button"
                      class="btn-action btn-action--danger"
                      title="Delete category"
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
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CREATE / EDIT CATEGORY            -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div v-if="showCategoryModal" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="modal-card bg-white p-4" style="max-width: 420px">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0">
              {{ editingCategoryId ? 'Edit Category' : 'New Category' }}
            </h5>
            <button type="button" class="btn-close btn-sm" @click="closeCategoryModal"></button>
          </div>

          <form @submit.prevent="handleSaveCategory">
            <BaseInput
              v-model="categoryForm.name"
              label="Category name"
              placeholder="e.g. Espresso & Coffee"
              :error="categoryError"
              required
              autofocus
            />

            <BaseInput
              v-model="categoryForm.sort_order"
              type="number"
              label="Display order"
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
                Active (visible on POS menu)
              </label>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-2 border-top">
              <BaseButton type="button" variant="secondary" @click="closeCategoryModal">
                Cancel
              </BaseButton>
              <BaseButton type="submit" variant="primary" :loading="isSavingCategory">
                {{ editingCategoryId ? 'Save Changes' : 'Create' }}
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
              {{ editingProductId ? 'Edit Product' : 'New Product' }}
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
                  <div class="small fw-medium text-dark">Product Image</div>
                  <div class="text-muted" style="font-size: 12px">JPG, PNG or WEBP (Max 5MB)</div>
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
                  {{ currentProductPreviewUrl ? 'Change' : 'Upload' }}
                </BaseButton>
                <BaseButton
                  v-if="currentProductPreviewUrl"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-danger"
                  @click="handleClearProductImage"
                >
                  Remove
                </BaseButton>
              </div>
            </div>

            <!-- Basic Info -->
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <BaseInput
                  v-model="productForm.name"
                  label="Product name"
                  placeholder="e.g. Caramel Macchiato"
                  :error="productErrors.name"
                  required
                />
              </div>

              <div class="col-6 col-md-3 mb-3">
                <label class="form-label mb-1 fw-medium small text-dark">
                  Category <span class="text-danger">*</span>
                </label>
                <select v-model="productForm.category_id" class="form-select clean-select-input">
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                  </option>
                </select>
                <div v-if="productErrors.category_id" class="text-danger small mt-1">
                  {{ productErrors.category_id }}
                </div>
              </div>

              <div class="col-6 col-md-3 mb-3">
                <label class="form-label mb-1 fw-medium small text-dark">Type</label>
                <select v-model="productForm.product_type" class="form-select clean-select-input">
                  <option value="DRINK">Drink</option>
                  <option value="FOOD">Food</option>
                  <option value="ADDON">Add-on</option>
                </select>
              </div>
            </div>

            <div class="row g-3 align-items-center mb-3">
              <div class="col-12 col-md-9">
                <BaseInput
                  v-model="productForm.description"
                  label="Description (optional)"
                  placeholder="Short note or flavor profile..."
                  class="mb-0"
                />
              </div>
              <div class="col-12 col-md-3 pt-md-3">
                <div class="form-check">
                  <input
                    id="prodActive"
                    v-model="productForm.is_active"
                    type="checkbox"
                    class="form-check-input custom-check"
                  />
                  <label for="prodActive" class="form-check-label small fw-medium">
                    Product Active
                  </label>
                </div>
              </div>
            </div>

            <!-- Variants Section -->
            <div class="variants-box p-3 rounded-3 mb-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <span class="fw-semibold small text-dark">Variants & Pricing</span>
                  <span class="text-muted small ms-2">({{ productForm.variants.length }})</span>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-link text-decoration-none p-0 fw-semibold add-variant-btn"
                  @click="addVariantRow"
                >
                  + Add Variant
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
                      placeholder="Variant name (e.g. Iced Regular)"
                      required
                    />
                  </div>

                  <div class="col-4 col-sm-2">
                    <input
                      v-model="v.size"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Size (R/L)"
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

                  <div class="col-12 col-sm-2 d-flex align-items-center justify-content-end gap-2">
                    <div class="form-check mb-0" title="Variant active">
                      <input
                        v-model="v.is_active"
                        type="checkbox"
                        class="form-check-input custom-check"
                      />
                    </div>
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
                Cancel
              </BaseButton>
              <BaseButton type="submit" variant="primary" :loading="isSavingProduct">
                {{ editingProductId ? 'Save Changes' : 'Create Product' }}
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
          <h5 class="fw-semibold mb-2">Delete {{ deleteModal.type }}?</h5>
          <p class="text-muted small mb-4">
            Are you sure you want to delete <strong>{{ deleteModal.name }}</strong>? This action cannot be undone.
          </p>
          <div class="d-flex justify-content-end gap-2">
            <BaseButton
              type="button"
              variant="secondary"
              :disabled="deleteModal.isDeleting"
              @click="deleteModal.show = false"
            >
              Cancel
            </BaseButton>
            <BaseButton
              type="button"
              variant="danger"
              :loading="deleteModal.isDeleting"
              @click="handleConfirmDelete"
            >
              Delete
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.products-page {
  max-width: 1080px;
}

.clean-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

/* Tab Switcher */
.tab-switcher {
  border-color: var(--border-hairline, #e6e4e0) !important;
}

.tab-btn {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface-variant, #504440);
  transition: all 0.15s ease;
}

.tab-btn.active {
  background-color: var(--primary, #2c1810);
  color: #ffffff;
  font-weight: 600;
}

/* Filter Select */
.clean-select {
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  font-size: 13px;
  box-shadow: none !important;
}

.clean-select:focus,
.clean-select-input:focus {
  border-color: var(--primary, #2c1810);
  box-shadow: none !important;
}

.clean-select-input {
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  font-size: 14px;
}

/* Clean Table */
.clean-table th {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--outline, #827470);
  background-color: var(--surface-container-low, #f6f3f2);
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  padding-top: 12px;
  padding-bottom: 12px;
}

.clean-table td {
  padding-top: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  font-size: 14px;
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.prod-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  font-size: 18px;
}

.type-pill {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.type-pill--drink {
  background-color: var(--secondary-fixed, #ffdcc5);
  color: var(--on-secondary-fixed, #2b1707);
}

.type-pill--food {
  background-color: #fef3c7;
  color: #92400e;
}

.type-pill--addon {
  background-color: var(--surface-container, #f0eded);
  color: var(--on-surface-variant, #504440);
}

.variant-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  font-size: 12px;
  color: var(--on-surface, #1c1b1b);
}

.status-dot-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-dot-badge::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-active {
  color: #166534;
}
.status-active::before {
  background-color: #16a34a;
}

.status-inactive {
  color: var(--outline, #827470);
}
.status-inactive::before {
  background-color: #9ca3af;
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  background: #ffffff;
  color: var(--on-surface-variant, #504440);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.15s ease;
}

.btn-action:hover {
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface, #1c1b1b);
}

.btn-action--danger:hover {
  background-color: var(--error-container, #ffdad6);
  border-color: #fca5a5;
  color: var(--error, #ba1a1a);
}

/* Modal Styles */
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background-color: rgba(28, 27, 27, 0.45);
  backdrop-filter: blur(2px);
  z-index: 1060;
}

.modal-card {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-card--lg {
  max-width: 680px;
}

.prod-image-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.variants-box {
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.add-variant-btn {
  color: var(--primary, #2c1810);
  font-size: 13px;
}

.custom-check:checked {
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
}
</style>
