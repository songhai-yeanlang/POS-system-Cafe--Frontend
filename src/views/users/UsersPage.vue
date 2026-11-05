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
              placeholder="Search name or email..."
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
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="STAFF">Staff</option>
          </select>

          <select
            v-model="selectedStatus"
            class="form-select form-select-sm clean-select"
            style="width: auto; min-width: 130px"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <BaseButton variant="primary" size="sm" @click="openCreateUser">
          <template #prefix><i class="bi bi-plus-lg"></i></template>
          Add Staff
        </BaseButton>
      </div>
    </div>

    <!-- Users Table Card -->
    <div class="clean-card bg-white overflow-hidden">
      <div v-if="isLoading" class="text-center py-5 text-muted small">
        <span class="spinner-border spinner-border-sm me-2"></span>
        Loading users...
      </div>

      <div v-else-if="users.length === 0" class="text-center py-5 px-3">
        <i class="bi bi-people fs-2 text-muted d-block mb-2"></i>
        <div class="fw-semibold mb-1">No users found</div>
        <p class="text-muted small mb-0">Try adjusting your search or filter criteria.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th class="ps-4">User</th>
              <th>Role</th>
              <th>Last Login</th>
              <th>Status</th>
              <th class="text-end pe-4">Actions</th>
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
                      <span v-if="isSelf(u.id)" class="you-badge">You</span>
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
                  {{ u.role }}
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
                  {{ u.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <td class="text-end pe-4">
                <div class="d-inline-flex gap-1">
                  <button
                    type="button"
                    class="btn-action"
                    title="Edit user"
                    @click="openEditUser(u)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-action btn-action--danger"
                    :disabled="isSelf(u.id)"
                    :title="isSelf(u.id) ? 'Cannot delete your own account' : 'Delete user'"
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
        <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
        <div class="d-flex gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="fetchUsers(pagination.page - 1)"
          >
            Previous
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchUsers(pagination.page + 1)"
          >
            Next
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
              {{ editingUserId ? 'Edit Account' : 'New Staff Account' }}
            </h5>
            <button type="button" class="btn-close btn-sm" @click="closeUserModal"></button>
          </div>

          <form @submit.prevent="handleSaveUser">
            <BaseInput
              v-model="form.name"
              label="Full name"
              placeholder="e.g. Sokha Chan"
              :error="errors.name"
              required
              autofocus
            />

            <BaseInput
              v-model="form.email"
              type="email"
              label="Work email"
              placeholder="e.g. sokha@brewpos.com"
              :error="errors.email"
              required
            />

            <BaseInput
              v-model="form.password"
              type="password"
              :label="editingUserId ? 'New password (leave blank to keep current)' : 'Password'"
              placeholder="At least 6 characters"
              :error="errors.password"
              :required="!editingUserId"
            />

            <div class="mb-3">
              <label class="form-label mb-1 fw-medium small text-dark">Role</label>
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="role-btn flex-grow-1"
                  :class="{ active: form.role === 'STAFF' }"
                  :disabled="isSelf(editingUserId)"
                  @click="form.role = 'STAFF'"
                >
                  STAFF (Cashier)
                </button>
                <button
                  type="button"
                  class="role-btn flex-grow-1"
                  :class="{ active: form.role === 'OWNER' }"
                  :disabled="isSelf(editingUserId)"
                  @click="form.role = 'OWNER'"
                >
                  OWNER (Admin)
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
                Account Active (allowed to sign in)
              </label>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
              <BaseButton type="button" variant="secondary" @click="closeUserModal">
                Cancel
              </BaseButton>
              <BaseButton type="submit" variant="primary" :loading="isSaving">
                {{ editingUserId ? 'Save Changes' : 'Create Account' }}
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
          <h5 class="fw-semibold mb-2">Delete user account?</h5>
          <p class="text-muted small mb-4">
            Are you sure you want to delete <strong>{{ deleteModal.name }}</strong>? If this user has past sales history, deactivate their account instead.
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
  border-color: var(--primary, #2c1810);
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
  color: var(--primary, #2c1810);
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
  background-color: var(--secondary-fixed, #ffdcc5);
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
  border: 1px solid var(--border-hairline, #e6e4e0);
  background: #ffffff;
  color: var(--on-surface-variant, #504440);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.15s ease;
}

.btn-action:hover:not(:disabled) {
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface, #1c1b1b);
}

.btn-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-action--danger:hover:not(:disabled) {
  background-color: var(--error-container, #ffdad6);
  border-color: #fca5a5;
  color: var(--error, #ba1a1a);
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
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
  color: #ffffff;
}

.role-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.custom-check:checked {
  background-color: var(--primary, #2c1810);
  border-color: var(--primary, #2c1810);
}
</style>
