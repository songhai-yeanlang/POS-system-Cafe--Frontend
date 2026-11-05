<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)
const isLoggingOut = ref(false)

onMounted(() => {
  if (authStore.isAuthenticated) {
    appStore.initAppData()
  }
})

watch(
  () => route.fullPath,
  () => {
    isMobileSidebarOpen.value = false
  },
)

const navGroups = computed(() => {
  const role = authStore.user?.role || 'STAFF'

  const groups = [
    {
      label: 'Operations',
      items: [
        {
          name: 'POS Terminal',
          path: '/pos',
          icon: 'bi-calculator',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: 'Orders & Receipts',
          path: '/orders',
          icon: 'bi-receipt',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: 'Shifts & Drawer',
          path: '/shifts',
          icon: 'bi-safe2',
          roles: ['OWNER', 'STAFF'],
          badge: appStore.hasOpenShift ? 'OPEN' : null,
          badgeType: 'success',
        },
        {
          name: 'Daily Expenses',
          path: '/expenses',
          icon: 'bi-wallet2',
          roles: ['OWNER', 'STAFF'],
        },
      ],
    },
    {
      label: 'Catalog & Stock',
      items: [
        {
          name: 'Products & Menu',
          path: '/products',
          icon: 'bi-cup-hot',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: 'Inventory & Stock',
          path: '/inventory',
          icon: 'bi-boxes',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: 'Drink Recipes',
          path: '/recipes',
          icon: 'bi-journal-text',
          roles: ['OWNER', 'STAFF'],
        },
      ],
    },
    {
      label: 'Analytics & Admin',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: 'bi-grid-1x2',
          roles: ['OWNER'],
        },
        {
          name: 'Reports',
          path: '/reports',
          icon: 'bi-bar-chart-line',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: 'Staff & Users',
          path: '/users',
          icon: 'bi-people',
          roles: ['OWNER'],
        },
        {
          name: 'Audit Logs',
          path: '/audit-logs',
          icon: 'bi-shield-check',
          roles: ['OWNER'],
        },
      ],
    },
  ]

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
})

const formattedRate = computed(() => {
  return Number(appStore.exchangeRate || 4100).toLocaleString('en-US')
})

const isActiveRoute = (path) => {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const toggleSidebar = () => {
  if (window.innerWidth < 992) {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value
  } else {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }
}

const handleLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await authStore.logout()
    appStore.resetAppData()
    router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="app-shell d-flex min-vh-100">
    <!-- Mobile Backdrop -->
    <div
      v-if="isMobileSidebarOpen"
      class="sidebar-backdrop d-lg-none"
      @click="isMobileSidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside
      class="app-sidebar d-flex flex-column"
      :class="{
        'sidebar-collapsed': isSidebarCollapsed,
        'sidebar-mobile-open': isMobileSidebarOpen,
      }"
    >
      <!-- Brand Header -->
      <div class="sidebar-brand d-flex align-items-center justify-content-between px-3">
        <router-link
          :to="authStore.defaultRoute"
          class="d-flex align-items-center gap-2 text-decoration-none overflow-hidden"
        >
          <div class="brand-avatar d-flex align-items-center justify-content-center flex-shrink-0">
            <img
              v-if="appStore.shopLogoUrl"
              :src="appStore.shopLogoUrl"
              alt="Shop logo"
              class="w-100 h-100 object-fit-cover rounded-3"
            />
            <i v-else class="bi bi-cup-hot-fill fs-5"></i>
          </div>
          <div v-if="!isSidebarCollapsed" class="text-truncate">
            <div class="brand-name text-truncate">{{ appStore.shopName }}</div>
            <div class="brand-role-sub d-flex align-items-center gap-1">
              <span class="role-dot"></span>
              <span>{{ authStore.user?.role || 'STAFF' }} PORTAL</span>
            </div>
          </div>
        </router-link>

        <button
          type="button"
          class="btn btn-sm btn-link text-muted d-lg-none p-1"
          @click="isMobileSidebarOpen = false"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav px-2 py-3 flex-grow-1">
        <div v-for="group in navGroups" :key="group.label" class="nav-group mb-3">
          <div v-if="!isSidebarCollapsed" class="nav-group-label px-2 mb-1">
            {{ group.label }}
          </div>
          <ul class="list-unstyled mb-0 d-flex flex-column gap-1">
            <li v-for="item in group.items" :key="item.path">
              <router-link
                :to="item.path"
                class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 text-decoration-none"
                :class="{ active: isActiveRoute(item.path) }"
                :title="isSidebarCollapsed ? item.name : ''"
              >
                <div class="d-flex align-items-center gap-3 text-truncate">
                  <i :class="['bi', item.icon, 'nav-icon']"></i>
                  <span v-if="!isSidebarCollapsed" class="text-truncate">{{ item.name }}</span>
                </div>
                <span
                  v-if="!isSidebarCollapsed && item.badge"
                  class="nav-badge badge rounded-pill"
                >
                  {{ item.badge }}
                </span>
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Bottom Pinned Link (Shop Settings for Owner, My Profile for Staff) -->
      <div class="sidebar-bottom p-2">
        <router-link
          v-if="authStore.isOwner"
          to="/settings"
          class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 text-decoration-none"
          :class="{ active: isActiveRoute('/settings') }"
          :title="isSidebarCollapsed ? 'Shop Settings' : ''"
        >
          <div class="d-flex align-items-center gap-3 text-truncate">
            <i class="bi bi-gear nav-icon"></i>
            <span v-if="!isSidebarCollapsed" class="text-truncate">Shop Settings</span>
          </div>
        </router-link>

        <router-link
          v-else
          to="/profile"
          class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 text-decoration-none"
          :class="{ active: isActiveRoute('/profile') }"
          :title="isSidebarCollapsed ? 'My Profile' : ''"
        >
          <div class="d-flex align-items-center gap-3 text-truncate">
            <i class="bi bi-person-badge nav-icon"></i>
            <span v-if="!isSidebarCollapsed" class="text-truncate">My Profile</span>
          </div>
        </router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="app-main d-flex flex-column flex-grow-1 min-w-0">
      <!-- Top Header -->
      <header class="app-topbar d-flex align-items-center justify-content-between px-3 px-md-4">
        <div class="d-flex align-items-center gap-3 min-w-0">
          <button
            type="button"
            class="btn btn-icon-toggle d-flex align-items-center justify-content-center"
            title="Toggle navigation"
            @click="toggleSidebar"
          >
            <i class="bi bi-layout-sidebar-inset fs-5"></i>
          </button>

          <div class="text-truncate">
            <h1 class="topbar-title mb-0 text-truncate">
              {{ route.meta?.title || 'BrewPOS Workspace' }}
            </h1>
          </div>
        </div>

        <!-- Topbar Right Indicators & Quick Actions -->
        <div class="d-flex align-items-center gap-3">
          <!-- Exchange Rate -->
          <div
            class="topbar-rate d-none d-sm-inline-flex align-items-center gap-2"
            title="Current Shop Exchange Rate"
          >
            <i class="bi bi-currency-exchange text-muted"></i>
            <span class="numeric-tabular fw-semibold text-dark">$1 = {{ formattedRate }} ៛</span>
          </div>

          <span class="topbar-divider d-none d-sm-inline"></span>

          <!-- Active Shift Status Link -->
          <router-link
            to="/shifts"
            class="topbar-shift-link d-inline-flex align-items-center gap-2 text-decoration-none"
            :class="appStore.hasOpenShift ? 'shift-open' : 'shift-closed'"
            title="Click to manage shift & cash drawer"
          >
            <span class="shift-dot"></span>
            <span v-if="appStore.hasOpenShift" class="numeric-tabular fw-semibold">
              Shift #{{ appStore.currentShift?.id }} Open
            </span>
            <span v-else class="fw-semibold">Shift Closed</span>
          </router-link>

          <span class="topbar-divider"></span>

          <!-- Topbar Logout Button -->
          <button
            type="button"
            class="btn-topbar-logout d-inline-flex align-items-center gap-2"
            title="Sign out"
            :disabled="isLoggingOut"
            @click="handleLogout"
          >
            <span v-if="isLoggingOut" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <!-- Page View Container -->
      <main class="app-content flex-grow-1 p-3 p-md-4">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  background-color: var(--background, #faf9f7);
  color: var(--on-surface, #1c1b1b);
}

/* Sidebar */
.app-sidebar {
  width: 260px;
  flex-shrink: 0;
  background-color: var(--surface-container-lowest, #ffffff);
  border-right: 1px solid var(--border-hairline, #e6e4e0);
  transition: width 0.2s ease, transform 0.2s ease;
  z-index: 1040;
  position: sticky;
  top: 0;
  height: 100vh;
}

.app-sidebar.sidebar-collapsed {
  width: 76px;
}

.sidebar-brand {
  height: 64px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
}

.brand-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: var(--primary, #2c1810);
  color: var(--on-primary, #ffffff);
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface, #1c1b1b);
  letter-spacing: -0.015em;
}

.brand-role-sub {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--on-surface-variant, #504440);
}

.role-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--amber-honey, #d97706);
}

.sidebar-nav {
  overflow-y: auto;
  min-height: 0;
}

.sidebar-bottom {
  flex-shrink: 0;
  border-top: 1px solid var(--border-hairline, #e6e4e0);
  background-color: var(--surface-container-lowest, #ffffff);
}

.app-sidebar.sidebar-collapsed .nav-item-link {
  justify-content: center !important;
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

.app-sidebar.sidebar-collapsed .nav-item-link > div {
  justify-content: center;
}

.nav-group-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--outline, #827470);
}

.nav-item-link {
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface-variant, #504440);
  transition: all 0.15s ease;
}

.nav-item-link:hover {
  background-color: var(--surface-container-low, #f6f3f2);
  color: var(--on-surface, #1c1b1b);
}

.nav-item-link.active {
  background-color: var(--primary, #2c1810);
  color: var(--on-primary, #ffffff);
  font-weight: 600;
}

.nav-icon {
  font-size: 17px;
  line-height: 1;
}

.nav-badge {
  font-size: 10px;
  font-weight: 700;
  background-color: #dcfce7;
  color: #15803d;
  padding: 0.2rem 0.5rem;
}

.nav-item-link.active .nav-badge {
  background-color: var(--secondary-fixed, #ffdcc5);
  color: var(--on-secondary-fixed, #2b1707);
}

/* Topbar Logout Text Link */
.btn-topbar-logout {
  border: none;
  background: transparent;
  padding: 0 4px;
  color: var(--on-surface-variant, #504440);
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s ease;
  cursor: pointer;
  line-height: 1;
}

.btn-topbar-logout:hover {
  color: var(--error, #ba1a1a);
}

/* Topbar */
.app-topbar {
  height: 64px;
  background-color: var(--surface-container-lowest, #ffffff);
  border-bottom: 1px solid var(--border-hairline, #e6e4e0);
  position: sticky;
  top: 0;
  z-index: 1020;
}

.btn-icon-toggle {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  background-color: var(--surface-container-lowest, #ffffff);
  color: var(--on-surface, #1c1b1b);
}

.btn-icon-toggle:hover {
  background-color: var(--surface-container-low, #f6f3f2);
}

.topbar-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--on-surface, #1c1b1b);
}

.topbar-rate {
  font-size: 13px;
}

.topbar-divider {
  width: 1px;
  height: 16px;
  background-color: var(--border-hairline, #e6e4e0);
}

.topbar-shift-link {
  font-size: 13px;
  transition: opacity 0.15s ease;
}

.topbar-shift-link:hover {
  opacity: 0.8;
}

.shift-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.shift-open {
  color: #16a34a;
}

.shift-open .shift-dot {
  background-color: #16a34a;
}

.shift-closed {
  color: #d97706;
}

.shift-closed .shift-dot {
  background-color: #d97706;
}

/* Responsive Mobile Drawer */
@media (max-width: 991.98px) {
  .app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    width: 260px !important;
  }

  .app-sidebar.sidebar-mobile-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(28, 27, 27, 0.45);
    backdrop-filter: blur(2px);
    z-index: 1035;
  }
}
</style>
