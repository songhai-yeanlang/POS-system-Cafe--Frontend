<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import LanguageSwitcher from '@/components/base/LanguageSwitcher.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const { t } = useI18n()

const isSidebarCollapsed = ref(false)
const isMoreSheetOpen = ref(false)
const isLoggingOut = ref(false)
const showLogoutModal = ref(false)

onMounted(() => {
  if (authStore.isAuthenticated) {
    appStore.initAppData()
  }
})

watch(
  () => route.fullPath,
  () => {
    isMoreSheetOpen.value = false
  },
)

const pageTitle = computed(() => {
  if (route.name) {
    const key = `routeTitles.${String(route.name)}`
    const translated = t(key)
    if (translated !== key) return translated
  }
  return route.meta?.title || 'BrewPOS Workspace'
})

const roleLabel = computed(() => {
  const role = authStore.user?.role || 'STAFF'
  return role === 'OWNER' ? t('common.owner') : t('common.staff')
})

const userInitials = computed(() => {
  const name = authStore.user?.name || 'U'
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
})

const navGroups = computed(() => {
  const role = authStore.user?.role || 'STAFF'

  const groups = [
    {
      label: t('nav.operations'),
      items: [
        {
          name: t('nav.pos'),
          path: '/pos',
          icon: 'bi-calculator',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: t('nav.orders'),
          path: '/orders',
          icon: 'bi-receipt',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: t('nav.shifts'),
          path: '/shifts',
          icon: 'bi-safe2',
          roles: ['OWNER', 'STAFF'],
          badge: appStore.hasOpenShift ? t('nav.openBadge') : null,
          badgeType: 'success',
        },
        {
          name: t('nav.expenses'),
          path: '/expenses',
          icon: 'bi-wallet2',
          roles: ['OWNER', 'STAFF'],
        },
      ],
    },
    {
      label: t('nav.catalogStock'),
      items: [
        {
          name: t('nav.products'),
          path: '/products',
          icon: 'bi-cup-hot',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: t('nav.discountCodes'),
          path: '/discount-codes',
          icon: 'bi-ticket-perforated',
          roles: ['OWNER'],
        },
        {
          name: t('nav.inventory'),
          path: '/inventory',
          icon: 'bi-boxes',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: t('nav.recipes'),
          path: '/recipes',
          icon: 'bi-journal-text',
          roles: ['OWNER', 'STAFF'],
        },
      ],
    },
    {
      label: t('nav.analyticsAdmin'),
      items: [
        {
          name: t('nav.dashboard'),
          path: '/dashboard',
          icon: 'bi-grid-1x2',
          roles: ['OWNER'],
        },
        {
          name: t('nav.reports'),
          path: '/reports',
          icon: 'bi-bar-chart-line',
          roles: ['OWNER', 'STAFF'],
        },
        {
          name: t('nav.users'),
          path: '/users',
          icon: 'bi-people',
          roles: ['OWNER'],
        },
        {
          name: t('nav.auditLogs'),
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

const mobilePrimaryTabs = computed(() => {
  if (authStore.isOwner) {
    return [
      {
        key: 'pos',
        label: t('nav.tabPos'),
        path: '/pos',
        icon: 'bi-calculator',
        activeIcon: 'bi-calculator-fill',
      },
      {
        key: 'orders',
        label: t('nav.tabOrders'),
        path: '/orders',
        icon: 'bi-receipt',
        activeIcon: 'bi-receipt-cutoff',
      },
      {
        key: 'shifts',
        label: t('nav.tabShifts'),
        path: '/shifts',
        icon: 'bi-safe2',
        activeIcon: 'bi-safe2-fill',
        dot: appStore.hasOpenShift ? 'open' : 'closed',
      },
      {
        key: 'dashboard',
        label: t('nav.tabDashboard'),
        path: '/dashboard',
        icon: 'bi-grid-1x2',
        activeIcon: 'bi-grid-1x2-fill',
      },
    ]
  }

  return [
    {
      key: 'pos',
      label: t('nav.tabPos'),
      path: '/pos',
      icon: 'bi-calculator',
      activeIcon: 'bi-calculator-fill',
    },
    {
      key: 'orders',
      label: t('nav.tabOrders'),
      path: '/orders',
      icon: 'bi-receipt',
      activeIcon: 'bi-receipt-cutoff',
    },
    {
      key: 'shifts',
      label: t('nav.tabShifts'),
      path: '/shifts',
      icon: 'bi-safe2',
      activeIcon: 'bi-safe2-fill',
      dot: appStore.hasOpenShift ? 'open' : 'closed',
    },
    {
      key: 'expenses',
      label: t('nav.tabExpenses'),
      path: '/expenses',
      icon: 'bi-wallet2',
      activeIcon: 'bi-wallet-fill',
    },
  ]
})

const isSecondaryMobileRoute = computed(() => {
  const primaryPaths = mobilePrimaryTabs.value.map((tab) => tab.path)
  return !primaryPaths.some((p) => route.path === p || route.path.startsWith(`${p}/`))
})

const formattedRate = computed(() => {
  return Number(appStore.exchangeRate || 4100).toLocaleString('en-US')
})

const isActiveRoute = (path) => {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const openLogoutModal = () => {
  isMoreSheetOpen.value = false
  showLogoutModal.value = true
}

const handleLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await authStore.logout()
    appStore.resetAppData()
    showLogoutModal.value = false
    router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="app-shell d-flex min-vh-100">
    <!-- Desktop Sidebar (lg and up) -->
    <aside
      class="app-sidebar d-none d-lg-flex flex-column"
      :class="{
        'sidebar-collapsed': isSidebarCollapsed,
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
              <span>{{ t('nav.portal', { role: roleLabel }) }}</span>
            </div>
          </div>
        </router-link>
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
          :title="isSidebarCollapsed ? t('nav.settings') : ''"
        >
          <div class="d-flex align-items-center gap-3 text-truncate">
            <i class="bi bi-gear nav-icon"></i>
            <span v-if="!isSidebarCollapsed" class="text-truncate">{{ t('nav.settings') }}</span>
          </div>
        </router-link>

        <router-link
          v-else
          to="/profile"
          class="nav-item-link d-flex align-items-center justify-content-between px-3 py-2 text-decoration-none"
          :class="{ active: isActiveRoute('/profile') }"
          :title="isSidebarCollapsed ? t('nav.profile') : ''"
        >
          <div class="d-flex align-items-center gap-3 text-truncate">
            <i class="bi bi-person-badge nav-icon"></i>
            <span v-if="!isSidebarCollapsed" class="text-truncate">{{ t('nav.profile') }}</span>
          </div>
        </router-link>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="app-main d-flex flex-column flex-grow-1 min-w-0">
      <!-- Desktop Top Header -->
      <header class="app-topbar d-none d-lg-flex align-items-center justify-content-between px-4">
        <div class="d-flex align-items-center gap-3 min-w-0">
          <button
            type="button"
            class="btn btn-icon-toggle d-flex align-items-center justify-content-center"
            :class="{ 'is-collapsed': isSidebarCollapsed }"
            :title="t('nav.toggleNav')"
            :aria-label="t('nav.toggleNav')"
            @click="toggleSidebar"
          >
            <svg
              class="toggle-sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M9 3v18" />
              <path d="m14 9-2.5 3 2.5 3" class="toggle-arrow" />
            </svg>
          </button>

          <div class="text-truncate">
            <h1 class="topbar-title mb-0 text-truncate">
              {{ pageTitle }}
            </h1>
          </div>
        </div>

        <!-- Topbar Right Indicators & Quick Actions -->
        <div class="d-flex align-items-center gap-3">
          <LanguageSwitcher />

          <span class="topbar-divider"></span>

          <div
            class="topbar-rate d-inline-flex align-items-center gap-2"
            :title="t('nav.exchangeRateTitle')"
          >
            <i class="bi bi-currency-exchange text-muted"></i>
            <span class="numeric-tabular fw-semibold text-dark">$1 = {{ formattedRate }} ៛</span>
          </div>

          <span class="topbar-divider"></span>

          <router-link
            to="/shifts"
            class="topbar-shift-link d-inline-flex align-items-center gap-2 text-decoration-none"
            :class="appStore.hasOpenShift ? 'shift-open' : 'shift-closed'"
            :title="t('nav.manageShiftTitle')"
          >
            <span class="shift-dot"></span>
            <span v-if="appStore.hasOpenShift" class="numeric-tabular fw-semibold">
              {{ t('nav.shiftOpen', { id: appStore.currentShift?.id }) }}
            </span>
            <span v-else class="fw-semibold">{{ t('nav.shiftClosed') }}</span>
          </router-link>

          <span class="topbar-divider"></span>

          <button
            type="button"
            class="btn-topbar-logout d-inline-flex align-items-center gap-2"
            :title="t('nav.logout')"
            :disabled="isLoggingOut"
            @click="openLogoutModal"
          >
            <span v-if="isLoggingOut" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-box-arrow-right"></i>
            <span>{{ t('nav.logout') }}</span>
          </button>
        </div>
      </header>

      <!-- Native Mobile App Top Bar (< 992px) -->
      <header class="mobile-app-header d-lg-none">
        <div class="mobile-app-header__inner">
          <div class="mobile-app-header__left">
            <router-link
              :to="authStore.defaultRoute"
              class="mobile-brand-badge"
              aria-label="Home"
            >
              <img
                v-if="appStore.shopLogoUrl"
                :src="appStore.shopLogoUrl"
                alt="Shop logo"
                class="w-100 h-100 object-fit-cover"
              />
              <i v-else class="bi bi-cup-hot-fill"></i>
            </router-link>

            <div class="mobile-app-header__titles">
              <h1 class="mobile-screen-title text-truncate">{{ pageTitle }}</h1>
              <div class="mobile-screen-sub text-truncate">
                {{ appStore.shopName }}
              </div>
            </div>
          </div>

          <div class="mobile-app-header__right">
            <router-link
              to="/shifts"
              class="mobile-shift-pill numeric-tabular"
              :class="appStore.hasOpenShift ? 'is-open' : 'is-closed'"
              :title="t('nav.manageShiftTitle')"
            >
              <span class="mobile-shift-pill__dot"></span>
              <span v-if="appStore.hasOpenShift">#{{ appStore.currentShift?.id }}</span>
              <i v-else class="bi bi-lock-fill"></i>
            </router-link>

            <LanguageSwitcher />

            <button
              type="button"
              class="mobile-avatar-btn"
              :aria-label="t('nav.moreMenuTitle')"
              @click="isMoreSheetOpen = true"
            >
              {{ userInitials }}
            </button>
          </div>
        </div>
      </header>

      <!-- Page View Container -->
      <main
        class="app-content flex-grow-1 p-3 p-md-4"
        :class="{ 'is-pos-mobile-view': route.path.startsWith('/pos') }"
      >
        <router-view />
      </main>
    </div>

    <!-- Native Mobile Bottom Tab Bar (< 992px) -->
    <nav class="mobile-bottom-nav d-lg-none" aria-label="Primary mobile navigation">
      <router-link
        v-for="tab in mobilePrimaryTabs"
        :key="tab.key"
        :to="tab.path"
        class="mobile-tab-item"
        :class="{ 'is-active': isActiveRoute(tab.path) && !isMoreSheetOpen }"
        @click="isMoreSheetOpen = false"
      >
        <span class="mobile-tab-item__pill">
          <i
            class="bi"
            :class="isActiveRoute(tab.path) && !isMoreSheetOpen ? tab.activeIcon : tab.icon"
          ></i>
          <span
            v-if="tab.dot"
            class="mobile-tab-item__dot"
            :class="`is-${tab.dot}`"
          ></span>
        </span>
        <span class="mobile-tab-item__label">{{ tab.label }}</span>
      </router-link>

      <button
        type="button"
        class="mobile-tab-item"
        :class="{ 'is-active': isMoreSheetOpen || isSecondaryMobileRoute }"
        @click="isMoreSheetOpen = !isMoreSheetOpen"
      >
        <span class="mobile-tab-item__pill">
          <i
            class="bi"
            :class="
              isMoreSheetOpen || isSecondaryMobileRoute
                ? 'bi-grid-3x3-gap-fill'
                : 'bi-grid-3x3-gap'
            "
          ></i>
        </span>
        <span class="mobile-tab-item__label">{{ t('nav.tabMore') }}</span>
      </button>
    </nav>

    <!-- Native Mobile App Launcher ("More") Bottom Sheet -->
    <Teleport to="body">
      <Transition name="mobile-sheet-fade">
        <div
          v-if="isMoreSheetOpen"
          class="mobile-more-backdrop d-lg-none"
          @click.self="isMoreSheetOpen = false"
        >
          <div class="mobile-more-sheet" role="dialog" aria-modal="true">
            <div class="mobile-more-sheet__handle" aria-hidden="true"></div>

            <!-- User Profile & Shop Quick Banner -->
            <div class="mobile-more-profile">
              <router-link
                :to="authStore.isOwner ? '/settings' : '/profile'"
                class="mobile-more-profile__card"
                @click="isMoreSheetOpen = false"
              >
                <div class="mobile-more-profile__avatar">
                  {{ userInitials }}
                </div>
                <div class="mobile-more-profile__info">
                  <div class="mobile-more-profile__name-row">
                    <span class="mobile-more-profile__name text-truncate">
                      {{ authStore.user?.name || roleLabel }}
                    </span>
                    <span class="mobile-more-profile__role">{{ roleLabel }}</span>
                  </div>
                  <div class="mobile-more-profile__meta text-truncate numeric-tabular">
                    {{ authStore.user?.email || appStore.shopName }} · $1 = {{ formattedRate }} ៛
                  </div>
                </div>
                <i class="bi bi-chevron-right mobile-more-profile__chevron"></i>
              </router-link>
            </div>

            <!-- Categorized App Icon Grid -->
            <div class="mobile-more-body">
              <div
                v-for="group in navGroups"
                :key="group.label"
                class="mobile-more-group"
              >
                <div class="mobile-more-group__title">{{ group.label }}</div>
                <div class="mobile-more-grid">
                  <router-link
                    v-for="item in group.items"
                    :key="item.path"
                    :to="item.path"
                    class="mobile-app-tile"
                    :class="{ 'is-active': isActiveRoute(item.path) }"
                    @click="isMoreSheetOpen = false"
                  >
                    <div class="mobile-app-tile__icon">
                      <i :class="['bi', item.icon]"></i>
                      <span v-if="item.badge" class="mobile-app-tile__dot"></span>
                    </div>
                    <span class="mobile-app-tile__label">{{ item.name }}</span>
                  </router-link>
                </div>
              </div>

              <!-- Settings / Profile + Sign Out Footer -->
              <div class="mobile-more-footer">
                <router-link
                  :to="authStore.isOwner ? '/settings' : '/profile'"
                  class="mobile-more-action-btn"
                  :class="{
                    'is-active': isActiveRoute(authStore.isOwner ? '/settings' : '/profile'),
                  }"
                  @click="isMoreSheetOpen = false"
                >
                  <i :class="['bi', authStore.isOwner ? 'bi-gear-fill' : 'bi-person-badge-fill']"></i>
                  <span>{{ authStore.isOwner ? t('nav.settings') : t('nav.profile') }}</span>
                </router-link>

                <button
                  type="button"
                  class="mobile-more-action-btn is-danger"
                  :disabled="isLoggingOut"
                  @click="openLogoutModal"
                >
                  <i class="bi bi-box-arrow-right"></i>
                  <span>{{ t('nav.logout') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Logout Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showLogoutModal"
        class="logout-modal-backdrop"
        @click.self="!isLoggingOut && (showLogoutModal = false)"
      >
        <div class="logout-modal-card">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="logout-icon-box">
              <i class="bi bi-box-arrow-right"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-1 text-dark">{{ t('nav.logoutConfirmTitle') }}</h6>
              <p class="small text-muted mb-0">{{ t('nav.logoutConfirmDesc') }}</p>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 pt-3 border-top">
            <button
              type="button"
              class="btn-logout-cancel"
              :disabled="isLoggingOut"
              @click="showLogoutModal = false"
            >
              {{ t('nav.logoutNo') }}
            </button>
            <button
              type="button"
              class="btn-logout-confirm"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              <span v-if="isLoggingOut" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-box-arrow-right me-1"></i>
              {{ t('nav.logoutYes') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.app-shell {
  background-color: var(--background, #faf9f7);
  color: var(--on-surface, #1c1b1b);
}

/* Desktop Sidebar */
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
  background-color: var(--primary, #2d5a43);
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
  scrollbar-width: thin;
  scrollbar-color: rgba(45, 90, 67, 0.16) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 5px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: rgba(45, 90, 67, 0.14);
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}

.sidebar-nav:hover::-webkit-scrollbar-thumb {
  background-color: rgba(45, 90, 67, 0.28);
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background-color: var(--primary, #2d5a43) !important;
}

.sidebar-nav::-webkit-scrollbar-button {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
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
  background-color: var(--primary, #2d5a43);
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
  background-color: var(--secondary-fixed, #d6ede0);
  color: var(--on-secondary-fixed, #2b1707);
}

/* Desktop Topbar */
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
  border-radius: 9px;
  border: 1px solid var(--border-hairline, #e6e4e0);
  background-color: var(--surface-container-lowest, #ffffff);
  color: var(--on-surface-variant, #4f5f56);
  box-shadow: 0 1px 2px rgba(23, 33, 28, 0.04);
  transition: all 0.16s ease;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-icon-toggle:hover {
  background-color: var(--primary-container, #e8f2ec);
  border-color: rgba(45, 90, 67, 0.28);
  color: var(--primary, #2d5a43);
  box-shadow: 0 2px 6px rgba(45, 90, 67, 0.08);
}

.btn-icon-toggle:active {
  transform: scale(0.95);
}

.toggle-sidebar-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.toggle-arrow {
  transform-origin: 13px 12px;
  transition: transform 0.24s cubic-bezier(0.2, 0, 0, 1);
}

.btn-icon-toggle.is-collapsed .toggle-arrow {
  transform: rotate(180deg);
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

/* ==========================================================================
   Native Mobile App Shell (< 992px)
   ========================================================================== */
@media (max-width: 991.98px) {
  .app-shell {
    background-color: #f4f7f5;
    width: 100%;
    max-width: 100vw;
    overflow-x: clip;
  }

  .app-main {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .app-content {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0.65rem 0.75rem calc(var(--mobile-bottom-offset) + 0.9rem) !important;
  }

  .app-content.is-pos-mobile-view {
    padding-bottom: calc(var(--mobile-bottom-offset) + 4.75rem) !important;
  }
}

.mobile-app-header {
  position: sticky;
  top: 0;
  z-index: 1025;
  padding-top: var(--safe-top);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(220, 230, 224, 0.9);
}

.mobile-app-header__inner {
  height: var(--mobile-header-h);
  padding: 0 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.mobile-app-header__left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}

.mobile-brand-badge {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #35694e 0%, #1e3f2f 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.98rem;
  flex-shrink: 0;
  overflow: hidden;
  text-decoration: none;
  box-shadow: 0 2px 6px rgba(30, 63, 47, 0.18);
}

.mobile-app-header__titles {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.18;
}

.mobile-screen-title {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 800;
  color: #16241c;
  letter-spacing: -0.015em;
}

.mobile-screen-sub {
  font-size: 0.69rem;
  font-weight: 600;
  color: #64786c;
  margin-top: 1px;
}

.mobile-sub-dot {
  margin: 0 3px;
}

.mobile-app-header__right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.mobile-shift-pill {
  height: 30px;
  padding: 0 0.52rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  text-decoration: none;
  border: 1px solid transparent;
}

.mobile-shift-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.mobile-shift-pill.is-open {
  background: #eaf7ef;
  border-color: #c2e5cf;
  color: #15803d;
}

.mobile-shift-pill.is-open .mobile-shift-pill__dot {
  background: #16a34a;
}

.mobile-shift-pill.is-closed {
  background: #fef3c7;
  border-color: #fde68a;
  color: #b45309;
}

.mobile-shift-pill.is-closed .mobile-shift-pill__dot {
  background: #d97706;
}

.mobile-avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid #cde2d5;
  background: #eaf5ee;
  color: #1e3f2f;
  font-size: 0.72rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

/* Native Fixed Bottom Tab Bar */
.mobile-bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1035;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  height: calc(var(--mobile-tabbar-h) + var(--safe-bottom));
  padding: 4px 6px calc(4px + var(--safe-bottom));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(216, 228, 220, 0.95);
  box-shadow: 0 -4px 20px rgba(18, 32, 24, 0.06);
}

.mobile-tab-item {
  border: none;
  background: transparent;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 3px 2px;
  color: #617468;
  cursor: pointer;
  min-width: 0;
  transition: color 0.15s ease;
}

.mobile-tab-item__pill {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.08rem;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.14s ease;
}

.mobile-tab-item.is-active {
  color: #1e3f2f;
}

.mobile-tab-item.is-active .mobile-tab-item__pill {
  background: #e1f0e7;
  color: #1e3f2f;
}

.mobile-tab-item__label {
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.42;
  padding-bottom: 1px;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-tab-item__dot {
  position: absolute;
  top: 4px;
  right: 11px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid #ffffff;
}

.mobile-tab-item__dot.is-open {
  background: #16a34a;
}

.mobile-tab-item__dot.is-closed {
  background: #d97706;
}

/* Native App Launcher ("More") Sheet */
.mobile-more-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1065;
  background: rgba(14, 24, 18, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.mobile-more-sheet {
  width: 100%;
  max-height: calc(88dvh - var(--safe-top));
  background: #f5f9f6;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: calc(0.85rem + var(--safe-bottom));
  box-shadow: 0 -14px 42px rgba(12, 22, 16, 0.24);
}

.mobile-more-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #c8d6ce;
  margin: 10px auto 8px;
  flex-shrink: 0;
}

.mobile-more-profile {
  padding: 0 0.9rem 0.65rem;
  flex-shrink: 0;
}

.mobile-more-profile__card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  background: #ffffff;
  border: 1px solid #dfeae3;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 8px rgba(20, 35, 26, 0.03);
}

.mobile-more-profile__avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2d5a43, #1e3f2f);
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-more-profile__info {
  flex: 1;
  min-width: 0;
}

.mobile-more-profile__name-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.mobile-more-profile__name {
  font-size: 0.92rem;
  font-weight: 800;
  color: #16241c;
}

.mobile-more-profile__role {
  font-size: 0.66rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: #e6f2eb;
  color: #2d5a43;
  flex-shrink: 0;
}

.mobile-more-profile__meta {
  font-size: 0.74rem;
  color: #64786c;
  margin-top: 2px;
}

.mobile-more-profile__chevron {
  color: #84968b;
  font-size: 0.88rem;
}

.mobile-more-body {
  padding: 0 0.9rem 0.35rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.mobile-more-group__title {
  font-size: 0.71rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #617468;
  margin-bottom: 0.42rem;
  padding-left: 0.2rem;
}

.mobile-more-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

@media (max-width: 374.98px) {
  .mobile-more-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.mobile-app-tile {
  background: #ffffff;
  border: 1px solid #e1ece5;
  border-radius: 14px;
  padding: 0.68rem 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.38rem;
  text-decoration: none;
  color: #26382e;
  transition: transform 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;
}

.mobile-app-tile:active {
  transform: scale(0.95);
}

.mobile-app-tile__icon {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #eff6f2;
  color: #2d5a43;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.mobile-app-tile.is-active {
  background: #eaf5ee;
  border-color: #2d5a43;
  color: #193b29;
}

.mobile-app-tile.is-active .mobile-app-tile__icon {
  background: #2d5a43;
  color: #ffffff;
}

.mobile-app-tile__dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #16a34a;
  border: 1.5px solid #ffffff;
}

.mobile-app-tile__label {
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-more-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  padding-top: 0.25rem;
}

.mobile-more-action-btn {
  height: 44px;
  border-radius: 12px;
  border: 1px solid #dbe6df;
  background: #ffffff;
  color: #26382e;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  text-decoration: none;
  cursor: pointer;
}

.mobile-more-action-btn.is-active {
  background: #2d5a43;
  border-color: #2d5a43;
  color: #ffffff;
}

.mobile-more-action-btn.is-danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

/* Sheet Transition */
.mobile-sheet-fade-enter-active,
.mobile-sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-sheet-fade-enter-active .mobile-more-sheet,
.mobile-sheet-fade-leave-active .mobile-more-sheet {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.mobile-sheet-fade-enter-from,
.mobile-sheet-fade-leave-to {
  opacity: 0;
}

.mobile-sheet-fade-enter-from .mobile-more-sheet,
.mobile-sheet-fade-leave-to .mobile-more-sheet {
  transform: translateY(100%);
}

/* Logout Confirmation Modal */
.logout-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(28, 25, 23, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1080;
}

.logout-modal-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e6e2dc;
  width: 100%;
  max-width: 400px;
  padding: 1.25rem;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.16);
}

.logout-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.btn-logout-cancel {
  padding: 0.45rem 1rem;
  border-radius: 9px;
  border: 1px solid #e2ddd5;
  background: #f6f4f0;
  color: #44403c;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-logout-cancel:hover:not(:disabled) {
  background: #ebe7e0;
}

.btn-logout-confirm {
  padding: 0.45rem 1.1rem;
  border-radius: 9px;
  border: none;
  background: #dc2626;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-logout-confirm:hover:not(:disabled) {
  background: #b91c1c;
}
</style>
