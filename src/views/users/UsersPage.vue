<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import api from '@/api/api'
import { t } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import { useFormatDate } from '@/composables/useFormatDate'
import BaseInput from '@/components/base/BaseInput.vue'

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

const setRoleFilter = (role) => {
  selectedRole.value = role
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedRole.value = ''
  selectedStatus.value = ''
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
    .filter(Boolean)
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
    errors.name = t('users.validationNameRequired')
    valid = false
  } else if (cleanName.length < 2) {
    errors.name = t('users.validationNameMin')
    valid = false
  }

  const cleanEmail = form.email.trim()
  if (!cleanEmail) {
    errors.email = t('users.validationEmailRequired')
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.email = t('users.validationEmailInvalid')
    valid = false
  }

  if (!editingUserId.value) {
    if (!form.password) {
      errors.password = t('users.validationPasswordRequired')
      valid = false
    } else if (form.password.length < 6) {
      errors.password = t('users.validationPasswordMin')
      valid = false
    }
  } else if (form.password && form.password.length < 6) {
    errors.password = t('users.validationPasswordMin')
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
  <div class="users-page">
    <!-- Top Segmented Role Tabs & Primary Add CTA -->
    <div class="users-top-bar">
      <div class="users-segmented-tabs" role="tablist">
        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: selectedRole === '' }"
          @click="setRoleFilter('')"
        >
          <i class="bi bi-people"></i>
          <span>{{ $t('users.allRoles') }}</span>
          <span v-if="selectedRole === '' && pagination.total > 0" class="seg-tab-count tabular">
            {{ pagination.total }}
          </span>
        </button>

        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: selectedRole === 'OWNER' }"
          @click="setRoleFilter('OWNER')"
        >
          <i class="bi bi-shield-check"></i>
          <span>{{ $t('common.owner') }}</span>
        </button>

        <button
          type="button"
          class="seg-tab-btn"
          :class="{ active: selectedRole === 'STAFF' }"
          @click="setRoleFilter('STAFF')"
        >
          <i class="bi bi-person-badge"></i>
          <span>{{ $t('common.staff') }}</span>
        </button>
      </div>

      <button type="button" class="btn-add-staff" @click="openCreateUser">
        <i class="bi bi-plus-lg"></i>
        <span>{{ $t('users.addStaff') }}</span>
      </button>
    </div>

    <!-- Main Users Card -->
    <div class="clean-card">
      <!-- Filter Toolbar -->
      <div class="filter-bar">
        <div class="filter-bar__left">
          <div class="search-wrap">
            <i class="bi bi-search search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              class="filter-input search-input"
              :placeholder="$t('users.searchPlaceholder')"
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

          <select v-model="selectedStatus" class="filter-input filter-select">
            <option value="">{{ $t('common.allStatus') }}</option>
            <option value="true">{{ $t('common.active') }}</option>
            <option value="false">{{ $t('common.inactive') }}</option>
          </select>
        </div>

        <div class="filter-bar__right">
          <button
            type="button"
            class="toolbar-btn toolbar-btn--icon"
            :title="$t('common.reset')"
            @click="resetFilters"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="empty-box">
        <div class="spinner-border spinner-border-sm text-secondary mb-2"></div>
        <div class="small text-muted">{{ $t('users.loadingUsers') }}</div>
      </div>

      <!-- Empty -->
      <div v-else-if="users.length === 0" class="empty-box">
        <div class="empty-box__icon">
          <i class="bi bi-people"></i>
        </div>
        <div class="empty-box__title">{{ $t('users.noUsersFound') }}</div>
        <div class="empty-box__desc">{{ $t('users.noUsersFoundDesc') }}</div>
      </div>

      <!-- Users Table -->
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0 clean-table">
          <thead>
            <tr>
              <th>{{ $t('users.colUser') }}</th>
              <th>{{ $t('users.colRole') }}</th>
              <th>{{ $t('users.colLastLogin') }}</th>
              <th>{{ $t('common.status') }}</th>
              <th class="text-end">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>
                <div class="user-cell">
                  <div
                    class="user-avatar"
                    :class="u.role === 'OWNER' ? 'is-owner' : 'is-staff'"
                  >
                    {{ getInitials(u.name) }}
                  </div>
                  <div class="user-cell__meta">
                    <div class="user-cell__name">
                      <span>{{ u.name }}</span>
                      <span v-if="isSelf(u.id)" class="self-tag">({{ $t('common.you') }})</span>
                    </div>
                    <div class="user-cell__email">{{ u.email }}</div>
                  </div>
                </div>
              </td>

              <td>
                <span
                  class="role-text"
                  :class="u.role === 'OWNER' ? 'is-owner' : 'is-staff'"
                >
                  {{ u.role === 'OWNER' ? $t('common.owner') : $t('common.staff') }}
                </span>
              </td>

              <td>
                <span class="datetime-text tabular">
                  {{ formatDateTime(u.last_login_at) }}
                </span>
              </td>

              <td>
                <span
                  class="status-text"
                  :class="u.is_active ? 'active' : 'inactive'"
                >
                  {{ u.is_active ? $t('common.active') : $t('common.inactive') }}
                </span>
              </td>

              <td class="text-end">
                <div class="action-group">
                  <button
                    type="button"
                    class="btn-action-icon"
                    :title="$t('common.edit')"
                    @click="openEditUser(u)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-action-icon is-danger"
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
      <div v-if="pagination.totalPages > 1" class="pagination-bar">
        <div class="pagination-info tabular">
          {{ $t('common.pageOf', { page: pagination.page, total: pagination.totalPages }) }}
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page <= 1"
            @click="fetchUsers(pagination.page - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>{{ $t('common.prev') }}</span>
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchUsers(pagination.page + 1)"
          >
            <span>{{ $t('common.next') }}</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: CREATE / EDIT USER                -->
    <!-- ========================================== -->
    <Teleport to="body">
      <div
        v-if="showUserModal"
        class="modal-backdrop-custom"
        @click.self="closeUserModal"
      >
        <div class="modal-sheet" style="max-width: 420px">
          <div class="modal-head">
            <h6 class="modal-heading">
              {{ editingUserId ? $t('users.editAccount') : $t('users.newStaffAccount') }}
            </h6>
            <button type="button" class="btn-close-quiet" @click="closeUserModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <form class="modal-form" @submit.prevent="handleSaveUser">
            <div class="form-stack">
              <BaseInput
                v-model="form.name"
                size="sm"
                no-margin
                :label="$t('users.fullNameLabel')"
                :placeholder="$t('users.fullNamePlaceholder')"
                :error="errors.name"
                required
                autofocus
              />

              <BaseInput
                v-model="form.email"
                type="email"
                size="sm"
                no-margin
                :label="$t('users.workEmailLabel')"
                :placeholder="$t('users.workEmailPlaceholder')"
                :error="errors.email"
                required
              />

              <BaseInput
                v-model="form.password"
                type="password"
                size="sm"
                no-margin
                :label="editingUserId ? $t('users.newPasswordKeepCurrent') : $t('auth.passwordLabel')"
                :placeholder="$t('users.min6Characters')"
                :error="errors.password"
                :required="!editingUserId"
              />

              <div class="role-field">
                <label class="field-label-clean">{{ $t('users.colRole') }}</label>
                <div class="role-segmented">
                  <button
                    type="button"
                    class="role-seg-btn"
                    :class="{ active: form.role === 'STAFF' }"
                    :disabled="isSelf(editingUserId)"
                    @click="form.role = 'STAFF'"
                  >
                    {{ $t('users.staffCashier') }}
                  </button>
                  <button
                    type="button"
                    class="role-seg-btn"
                    :class="{ active: form.role === 'OWNER' }"
                    :disabled="isSelf(editingUserId)"
                    @click="form.role = 'OWNER'"
                  >
                    {{ $t('users.ownerAdmin') }}
                  </button>
                </div>
              </div>

              <label
                for="userActive"
                class="status-inline-row"
                :class="{ 'is-disabled': isSelf(editingUserId) }"
              >
                <span class="status-inline-label">{{ $t('users.accountActiveTitle') }}</span>
                <span class="switch-control">
                  <input
                    id="userActive"
                    v-model="form.is_active"
                    type="checkbox"
                    class="switch-control__input"
                    :disabled="isSelf(editingUserId)"
                  />
                  <span class="switch-control__track"></span>
                </span>
              </label>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-modal-cancel" @click="closeUserModal">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn-modal-submit" :disabled="isSaving">
                <span v-if="isSaving" class="spinner-border spinner-border-sm"></span>
                <span>{{ editingUserId ? $t('common.saveChanges') : $t('users.createAccount') }}</span>
              </button>
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
        class="modal-backdrop-custom"
        @click.self="deleteModal.show = false"
      >
        <div class="modal-sheet" style="max-width: 380px">
          <div class="modal-head">
            <h6 class="modal-heading is-danger">{{ $t('users.deleteUserTitle') }}</h6>
            <button type="button" class="btn-close-quiet" @click="deleteModal.show = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <p class="delete-modal-desc">
            {{ $t('users.deleteUserDesc', { name: deleteModal.name }) }}
          </p>
          <div class="modal-actions">
            <button
              type="button"
              class="btn-modal-cancel"
              :disabled="deleteModal.isDeleting"
              @click="deleteModal.show = false"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn-modal-danger"
              :disabled="deleteModal.isDeleting"
              @click="handleConfirmDelete"
            >
              <span v-if="deleteModal.isDeleting" class="spinner-border spinner-border-sm"></span>
              <span>{{ $t('common.delete') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.users-page {
  --roast-ink: #14231a;
  --sage-muted: #54665b;
  --botanical-primary: #2d5a43;
  --botanical-deep: #1e3f2f;
  --botanical-tint: #eaf3ee;
  --botanical-border: #3b7054;
  --ledger-line: #dce6e0;
  --ledger-hairline: #edf3ef;

  padding-bottom: 1.5rem;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* ── Top Bar: Segmented Role Tabs & Primary Action ── */
.users-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.users-segmented-tabs {
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
  background: var(--botanical-tint);
  color: var(--botanical-primary);
}

.btn-add-staff {
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

.btn-add-staff:hover {
  background: var(--botanical-deep);
  border-color: var(--botanical-deep);
}

/* ── Main Ledger Card & Filter Toolbar ── */
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
  flex: 0 1 300px;
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

.toolbar-btn--icon {
  width: 36px;
  padding: 0;
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

/* ── Clean Table ── */
.clean-table th {
  background: #f4f8f5;
  font-size: 0.75rem;
  color: #4f6356;
  font-weight: 700;
  padding: 0.72rem 1.05rem;
  border-bottom: 1px solid var(--ledger-line);
  white-space: nowrap;
}

.clean-table td {
  padding: 0.8rem 1.05rem;
  border-bottom: 1px solid var(--ledger-hairline);
  font-size: 0.84rem;
  color: var(--roast-ink);
}

.clean-table tbody tr:last-child td {
  border-bottom: none;
}

.clean-table tbody tr:hover td {
  background-color: #fafcfb;
}

/* User Cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 800;
}

.user-avatar.is-owner {
  background-color: #e6f2eb;
  color: var(--botanical-deep);
  border: 1px solid #cce0d4;
}

.user-avatar.is-staff {
  background-color: #f3f7f4;
  color: #485e50;
  border: 1px solid #e1ebe4;
}

.user-cell__meta {
  min-width: 0;
}

.user-cell__name {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  font-weight: 700;
  color: var(--roast-ink);
  font-size: 0.86rem;
  line-height: 1.25;
}

.self-tag {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--botanical-primary);
}

.user-cell__email {
  font-size: 0.76rem;
  color: var(--sage-muted);
  margin-top: 2px;
}

/* Role & Status Text (Clean, Unboxed, No Dots) */
.role-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.role-text.is-owner {
  color: var(--botanical-primary);
}

.role-text.is-staff {
  color: #3d5245;
}

.datetime-text {
  font-size: 0.8rem;
  color: #485c50;
  white-space: nowrap;
}

.status-text {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-text.active {
  color: #1e6b43;
}

.status-text.inactive {
  color: #64748b;
}

/* Action Buttons */
.action-group {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-action-icon {
  width: 31px;
  height: 31px;
  border-radius: 7px;
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: #54665b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-action-icon:hover:not(:disabled) {
  background: #f0f6f2;
  color: var(--botanical-primary);
  border-color: #b8ccc0;
}

.btn-action-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-action-icon.is-danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

/* Pagination & Empty States */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.72rem 1.05rem;
  border-top: 1px solid var(--ledger-hairline);
  background: #fafcfb;
}

.pagination-info {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sage-muted);
}

.empty-box {
  padding: 3.5rem 1rem;
  text-align: center;
}

.empty-box__icon {
  width: 50px;
  height: 50px;
  margin: 0 auto 0.75rem;
  border-radius: 12px;
  background: #f2f7f4;
  border: 1px solid #dce6e0;
  color: var(--botanical-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.empty-box__title {
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--roast-ink);
  margin-bottom: 0.25rem;
}

.empty-box__desc {
  font-size: 0.8rem;
  color: var(--sage-muted);
  max-width: 340px;
  margin: 0 auto;
}

/* ── Modals (rendered inside Teleport body, so declare tokens directly) ── */
.modal-backdrop-custom {
  --roast-ink: #14231a;
  --sage-muted: #5f7065;
  --botanical-primary: #2d5a43;
  --botanical-deep: #1e3f2f;
  position: fixed;
  inset: 0;
  background-color: rgba(20, 35, 26, 0.42);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1060;
}

.modal-sheet {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  padding: 1.35rem 1.45rem;
  border: 1px solid #e2e8e4;
  box-shadow: 0 20px 44px rgba(15, 28, 20, 0.14);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.15rem;
}

.modal-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--roast-ink);
  letter-spacing: -0.01em;
}

.modal-heading.is-danger {
  color: #b91c1c;
}

.btn-close-quiet {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #7a8a80;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;
}

.btn-close-quiet:hover {
  background: #f1f5f3;
  color: var(--roast-ink);
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.modal-form :deep(.text-label) {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--roast-ink);
  margin-bottom: 0.35rem;
}

.modal-form :deep(.form-control-sm) {
  height: 38px;
  font-size: 0.84rem;
  border-color: #dce6e0;
  border-radius: 8px;
}

.modal-form :deep(.input-group-text) {
  border-color: #dce6e0;
}

/* Segmented Role Control */
.role-field {
  display: flex;
  flex-direction: column;
}

.field-label-clean {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--roast-ink);
  margin-bottom: 0.35rem;
}

.role-segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: #f1f5f3;
  border: 1px solid #e4ece7;
}

.role-seg-btn {
  height: 33px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #54665b;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s ease;
  padding: 0 0.6rem;
  white-space: nowrap;
}

.role-seg-btn:hover:not(:disabled):not(.active) {
  color: var(--roast-ink);
}

.role-seg-btn.active {
  background: #ffffff;
  color: #1e3f2f;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(20, 35, 26, 0.08);
}

.role-seg-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Borderless Active Switch Row */
.status-inline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0 0.05rem;
  cursor: pointer;
  user-select: none;
}

.status-inline-row.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-inline-label {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--roast-ink);
}

.switch-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.switch-control__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-control__track {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #cbd5cf;
  position: relative;
  transition: background-color 0.16s ease;
}

.switch-control__track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
  transition: transform 0.16s ease;
}

.switch-control__input:checked + .switch-control__track {
  background: #2d5a43;
}

.switch-control__input:checked + .switch-control__track::after {
  transform: translateX(16px);
}

.switch-control__input:focus-visible + .switch-control__track {
  box-shadow: 0 0 0 3px rgba(45, 90, 67, 0.2);
}

/* Footer Actions */
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid #edf2ef;
}

.btn-modal-cancel,
.btn-modal-submit,
.btn-modal-danger {
  height: 36px;
  padding: 0 1rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.14s ease;
}

.btn-modal-cancel {
  border: 1px solid #dce6e0;
  background: #ffffff;
  color: #54665b;
}

.btn-modal-cancel:hover:not(:disabled) {
  background: #f5f8f6;
  color: var(--roast-ink);
}

.btn-modal-submit {
  border: 1px solid #2d5a43;
  background: #2d5a43;
  color: #ffffff;
}

.btn-modal-submit:hover:not(:disabled) {
  background: #234936;
  border-color: #234936;
}

.btn-modal-danger {
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #ffffff;
}

.btn-modal-danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.btn-modal-cancel:disabled,
.btn-modal-submit:disabled,
.btn-modal-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-modal-desc {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.55;
  color: var(--sage-muted);
}

@media (max-width: 440px) {
  .role-segmented {
    grid-template-columns: 1fr;
  }
}
</style>
