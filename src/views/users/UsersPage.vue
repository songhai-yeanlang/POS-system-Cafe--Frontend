<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import api from '@/api/api'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import { useFormatDate } from '@/composables/useFormatDate'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const authStore = useAuthStore()
const toast = useToast()
const { formatDateTime } = useFormatDate()

const users = ref([])
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })
const isLoading = ref(false)

// Filters
const searchQuery = ref('')
const debouncedSearch = useDebounce(searchQuery, 300)
const selectedRole = ref('')
const selectedStatus = ref('')

const fetchUsers = async (page = 1) => {
  isLoading.value = true
  try {
    const params = {
      page,
      limit: pagination.value.limit,
    }
    if (selectedRole.value) params.role = selectedRole.value
    if (selectedStatus.value !== '') params.is_active = selectedStatus.value === 'true'
    if (debouncedSearch.value?.trim()) params.search = debouncedSearch.value.trim()

    const res = await api.get('/users', { params })
    users.value = (res.data?.data || []).map((u) => ({
      ...u,
      is_active: Boolean(u.is_active),
    }))
    if (res.data?.pagination) {
      pagination.value = res.data.pagination
    }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load users')
  } finally {
    isLoading.value = false
  }
}

watch([debouncedSearch, selectedRole, selectedStatus], () => {
  fetchUsers(1)
})

onMounted(() => {
  fetchUsers(1)
})

const getInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const isSelf = (userId) => Number(userId) === Number(authStore.user?.id)

// ==========================================
// CREATE / EDIT USER MODAL
// ==========================================
const showUserModal = ref(false)
const isSaving = ref(false)
const editingUserId = ref(null)

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'STAFF',
  is_active: true,
})

const errors = reactive({
  name: '',
  email: '',
  password: '',
})

const clearErrors = () => {
  errors.name = ''
  errors.email = ''
  errors.password = ''
}

const openCreateUser = () => {
  editingUserId.value = null
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = 'STAFF'
  form.is_active = true
  clearErrors()
  showUserModal.value = true
}

const openEditUser = (u) => {
  editingUserId.value = u.id
  form.name = u.name || ''
  form.email = u.email || ''
  form.password = ''
  form.role = u.role || 'STAFF'
  form.is_active = Boolean(u.is_active)
  clearErrors()
  showUserModal.value = true
}

const closeUserModal = () => {
  showUserModal.value = false
}

const validateForm = () => {
  clearErrors()
  let valid = true

  const cleanName = form.name.trim()
  if (!cleanName) {
    errors.name = 'Name is required'
    valid = false
  } else if (cleanName.length < 2) {
    errors.name = 'Name must be at least 2 characters'
    valid = false
  }

  const cleanEmail = form.email.trim()
  if (!cleanEmail) {
    errors.email = 'Email is required'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.email = 'Invalid email format'
    valid = false
  }

  if (!editingUserId.value) {
    if (!form.password) {
      errors.password = 'Password is required'
      valid = false
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
      valid = false
    }
  } else if (form.password && form.password.length < 6) {
    errors.password = 'New password must be at least 6 characters'
    valid = false
  }

  return valid
}

const handleSaveUser = async () => {
  if (!validateForm()) return

  isSaving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      is_active: Boolean(form.is_active),
    }

    if (form.password) {
      payload.password = form.password
    }

    if (editingUserId.value) {
      const res = await api.put(`/users/${editingUserId.value}`, payload)
      toast.success(res.data?.message || 'User updated successfully')

      // If current user edited their own name/email, sync authStore
      if (isSelf(editingUserId.value) && res.data?.data) {
        authStore.setUser({
          ...authStore.user,
          name: res.data.data.name,
          email: res.data.data.email,
        })
      }
    } else {
      const res = await api.post('/users', payload)
      toast.success(res.data?.message || 'User created successfully')
    }

    closeUserModal()
    await fetchUsers(pagination.value.page)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save user')
  } finally {
    isSaving.value = false
  }
}

// ==========================================
// DELETE CONFIRMATION MODAL
// ==========================================
const deleteModal = reactive({
  show: false,
  id: null,
  name: '',
  isDeleting: false,
})

const confirmDeleteUser = (u) => {
  if (isSelf(u.id)) {
    toast.warning('You cannot delete your own account.')
    return
  }
  deleteModal.id = u.id
  deleteModal.name = u.name
  deleteModal.show = true
}

const handleConfirmDelete = async () => {
  if (!deleteModal.id || deleteModal.isDeleting) return
  deleteModal.isDeleting = true
  try {
    const res = await api.delete(`/users/${deleteModal.id}`)
    toast.success(res.data?.message || 'User deleted successfully')
    deleteModal.show = false
    await fetchUsers(1)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete user')
  } finally {
    deleteModal.isDeleting = false
  }
}
</script>

<template>
  <div class="users-page mx-auto">
    <!-- Single Compact Filter & Action Bar -->
    <div class="clean-card bg-white p-3 mb-3">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center flex-wrap gap-2 flex-grow-1">
          <div style="min-width: 240px; max-width: 340px" class="flex-grow-1">
            <BaseInput
              v-model="searchQuery"
              type="search"
              :placeholder="$t('users.searchPlaceholder')"
              size="sm"
              clearable
              class="mb-0"
            />
          </div>

          <select
            v-model="selectedRole"
            class="form-select form-select-sm clean-select"
            style="width: auto; min-width: 140px"
          >
            <option value="">{{ $t('users.allRoles') }}</option>
            <option value="OWNER">{{ $t('common.owner') }}</option>
            <option value="STAFF">{{ $t('common.staff') }}</option>
          </select>

          <select
            v-model="selectedStatus"
            class="form-select form-select-sm clean-select"
            style="width: auto; min-width: 130px"
          >
            <option value="">{{ $t('common.allStatus') }}</option>
            <option value="true">{{ $t('common.active') }}</option>
            <option value="false">{{ $t('common.inactive') }}</option>
          </select>
        </div>

        <BaseButton variant="primary" size="sm" @click="openCreateUser">
          <template #prefix><i class="bi bi-plus-lg"></i></template>
          {{ $t('users.addStaff') }}
        </BaseButton>
      </div>
    </div>

    <!-- Users Table Card -->
    <div class="clean-card bg-white overflow-hidden">
      <div v-if="isLoading" class="text-center py-5 text-muted small">
        <span class="spinner-border spinner-border-sm me-2"></span>
        {{ $t('users.loadingUsers') }}
      </div>

      <div v-else-if="users.length === 0" class="text-center py-5 px-3">
        <i class="bi bi-people fs-2 text-muted d-block mb-2"></i>
        <div class="fw-semibold mb-1">{{ $t('users.noUsersFound') }}</div>
        <p class="text-muted small mb-0">{{ $t('users.noUsersFoundDesc') }}</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th class="ps-4">{{ $t('users.colUser') }}</th>
              <th>{{ $t('users.colRole') }}</th>
              <th>{{ $t('users.colLastLogin') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th class="text-end pe-4">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                  <div
                    class="user-avatar d-flex align-items-center justify-content-center flex-shrink-0"
                  >
                    {{ getInitials(u.name) }}
                  </div>
                  <div>
                    <div class="fw-semibold text-dark d-flex align-items-center gap-2">
                      <span>{{ u.name }}</span>
                      <span v-if="isSelf(u.id)" class="you-badge">{{ $t('common.you') }}</span>
                    </div>
                    <div class="text-muted small">{{ u.email }}</div>
                  </div>
                </div>
              </td>

              <td>
                <span
                  class="role-pill"
                  :class="u.role === 'OWNER' ? 'role-pill--owner' : 'role-pill--staff'"
                >
                  {{ u.role === 'OWNER' ? $t('common.owner') : $t('common.staff') }}
                </span>
              </td>

              <td class="text-muted small">
                {{ formatDateTime(u.last_login_at) }}
              </td>

              <td>
                <span
                  class="status-dot-badge"
                  :class="u.is_active ? 'status-active' : 'status-inactive'"
                >
                  {{ u.is_active ? $t('common.active') : $t('common.inactive') }}
                </span>
              </td>

              <td class="text-end pe-4">
                <div class="d-inline-flex gap-1">
                  <button
                    type="button"
                    class="btn-action"
                    :title="$t('common.edit')"
                    @click="openEditUser(u)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-action btn-action--danger"
                    :disabled="isSelf(u.id)"
                    :title="isSelf(u.id) ? 'Cannot delete your own account' : $t('common.delete')"
                    @click="confirmDeleteUser(u)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="d-flex align-items-center justify-content-between px-4 py-3 border-top small text-muted"
      >
        <span>{{ $t('common.pageOf', { page: pagination.page, total: pagination.totalPages }) }}</span>
        <div class="d-flex gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="fetchUsers(pagination.page - 1)"
          >
            {{ $t('common.previous') }}
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchUsers(pagination.page + 1)"
          >
            {{ $t('common.next') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CREATE / EDIT USER                -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="showUserModal"
        class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      >
        <div class="modal-card bg-white p-4" style="max-width: 440px">
          <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
            <h5 class="fw-semibold mb-0">
              {{ editingUserId ? $t('users.editAccount') : $t('users.newStaffAccount') }}
            </h5>
            <button type="button" class="btn-close btn-sm" @click="closeUserModal"></button>
          </div>

          <form @submit.prevent="handleSaveUser">
            <BaseInput
              v-model="form.name"
              :label="$t('users.fullNameLabel')"
              placeholder="e.g. Sokha Chan"
              :error="errors.name"
              required
              autofocus
            />

            <BaseInput
              v-model="form.email"
              type="email"
              :label="$t('users.workEmailLabel')"
              placeholder="e.g. sokha@brewpos.com"
              :error="errors.email"
              required
            />

            <BaseInput
              v-model="form.password"
              type="password"
              :label="editingUserId ? $t('users.newPasswordKeepCurrent') : $t('auth.password')"
              :placeholder="$t('auth.min6Characters')"
              :error="errors.password"
              :required="!editingUserId"
            />

            <div class="mb-3">
              <label class="form-label mb-1 fw-medium small text-dark">{{ $t('users.colRole') }}</label>
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="role-btn flex-grow-1"
                  :class="{ active: form.role === 'STAFF' }"
                  :disabled="isSelf(editingUserId)"
                  @click="form.role = 'STAFF'"
                >
                  {{ $t('users.staffCashier') }}
                </button>
                <button
                  type="button"
                  class="role-btn flex-grow-1"
                  :class="{ active: form.role === 'OWNER' }"
                  :disabled="isSelf(editingUserId)"
                  @click="form.role = 'OWNER'"
                >
                  {{ $t('users.ownerAdmin') }}
                </button>
              </div>
            </div>

            <div class="form-check mb-4">
              <input
                id="userActive"
                v-model="form.is_active"
                type="checkbox"
                class="form-check-input custom-check"
                :disabled="isSelf(editingUserId)"
              />
              <label for="userActive" class="form-check-label small fw-medium">
                {{ $t('users.accountActiveCheck') }}
              </label>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
              <BaseButton type="button" variant="secondary" @click="closeUserModal">
                {{ $t('common.cancel') }}
              </BaseButton>
              <BaseButton type="submit" variant="primary" :loading="isSaving">
                {{ editingUserId ? $t('common.saveChanges') : $t('users.createAccount') }}
              </BaseButton>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ========================================== -->
    <!-- MODAL 2: DELETE CONFIRMATION               -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="deleteModal.show"
        class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3"
      >
        <div class="modal-card bg-white p-4" style="max-width: 400px">
          <h5 class="fw-semibold mb-2">{{ $t('users.deleteUserTitle') }}</h5>
          <p class="text-muted small mb-4">
            {{ $t('users.deleteUserDesc', { name: deleteModal.name }) }}
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
.users-page {
  max-width: 1000px;
}

.title-text {
  font-size: 20px;
  color: var(--on-surface, #1c1b1b);
  letter-spacing: -0.02em;
}

.subtitle-text {
  font-size: 13px;
  color: var(--on-surface-variant, #504440);
}

.clean-card {
  border-radius: 16px;
  border: 1px solid var(--border-hairline, #e6e4e0);
}

.clean-select {
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  font-size: 13px;
  box-shadow: none !important;
}

.clean-select:focus {
  border-color: var(--primary, #2d5a43);
}

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

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  color: var(--primary, #2d5a43);
  font-size: 13px;
  font-weight: 700;
}

.you-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
  background-color: var(--surface-container, #f0eded);
  color: var(--on-surface-variant, #504440);
}

.role-pill {
  display: inline-block;
  padding: 0.18rem 0.6rem;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.role-pill--owner {
  background-color: var(--secondary-fixed, #d6ede0);
  color: var(--on-secondary-fixed, #2b1707);
}

.role-pill--staff {
  background-color: var(--surface-container-low, #f6f3f2);
  border: 1px solid var(--border-hairline, #e6e4e0);
  color: var(--on-surface-variant, #504440);
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
  border: none;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
}

.btn-action:hover:not(:disabled) {
  background-color: #f1f5f9;
  color: #1e293b;
}

.btn-action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-action--danger:hover:not(:disabled) {
  background-color: #fef2f2;
  color: #dc2626;
}

/* Modal */
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
}

.role-btn {
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  background-color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface, #1c1b1b);
  transition: all 0.15s ease;
}

.role-btn.active {
  background-color: var(--primary, #2d5a43);
  border-color: var(--primary, #2d5a43);
  color: #ffffff;
}

.role-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.custom-check:checked {
  background-color: var(--primary, #2d5a43);
  border-color: var(--primary, #2d5a43);
}
</style>
