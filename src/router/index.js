import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginPage from '@/views/auth/LoginPage.vue'
import ForgotPassword from '@/views/auth/ForgotPassword.vue'
import VerifyOtp from '@/views/auth/VerifyOtp.vue'
import ResetPassword from '@/views/auth/ResetPassword.vue'
import SettingsPage from '@/views/settings/SettingsPage.vue'
import ProductsPage from '@/views/products/ProductsPage.vue'
import UsersPage from '@/views/users/UsersPage.vue'
import ProfilePage from '@/views/profile/ProfilePage.vue'
import ShiftsPage from '@/views/shifts/ShiftsPage.vue'
import PosPage from '@/views/pos/PosPage.vue'
import OrdersPage from '@/views/orders/OrdersPage.vue'
import InventoryPage from '@/views/inventory/InventoryPage.vue'
import RecipesPage from '@/views/recipes/RecipesPage.vue'
import ExpensesPage from '@/views/expenses/ExpensesPage.vue'
import DashboardPage from '@/views/dashboard/DashboardPage.vue'
import ReportsPage from '@/views/reports/ReportsPage.vue'
import AuditLogsPage from '@/views/audit-logs/AuditLogsPage.vue'
import NotFoundPage from '@/views/common/NotFoundPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: 'Sign In', guestOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPassword,
      meta: { title: 'Forgot Password', guestOnly: true },
    },
    {
      path: '/verify-otp',
      name: 'verify-otp',
      component: VerifyOtp,
      meta: { title: 'Verify OTP', guestOnly: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPassword,
      meta: { title: 'Reset Password', guestOnly: true },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: () => {
            const authStore = useAuthStore()
            return authStore.defaultRoute
          },
        },
        // Phase 2: Master Data Setup
        {
          path: 'settings',
          name: 'settings',
          component: SettingsPage,
          meta: {
            title: 'Shop Settings',
            icon: 'bi-gear',
            roles: ['OWNER'],
          },
        },
        {
          path: 'products',
          name: 'products',
          component: ProductsPage,
          meta: {
            title: 'Products & Categories',
            icon: 'bi-cup-hot',
            roles: ['OWNER', 'STAFF'],
          },
        },
        {
          path: 'users',
          name: 'users',
          component: UsersPage,
          meta: {
            title: 'Staff & Users Management',
            icon: 'bi-people',
            roles: ['OWNER'],
          },
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfilePage,
          meta: {
            title: 'My Profile & Security',
            icon: 'bi-person-badge',
            roles: ['OWNER', 'STAFF'],
          },
        },
        // Phase 3: Core POS & Cashier Operations
        {
          path: 'shifts',
          name: 'shifts',
          component: ShiftsPage,
          meta: {
            title: 'Shifts & Cash Drawer',
            icon: 'bi-safe2',
            roles: ['OWNER', 'STAFF'],
          },
        },
        {
          path: 'pos',
          name: 'pos',
          component: PosPage,
          meta: {
            title: 'POS Terminal',
            icon: 'bi-calculator',
            roles: ['OWNER', 'STAFF'],
          },
        },
        {
          path: 'orders',
          name: 'orders',
          component: OrdersPage,
          meta: {
            title: 'Orders & Receipts History',
            icon: 'bi-receipt',
            roles: ['OWNER', 'STAFF'],
          },
        },
        // Phase 4: Inventory & Recipes
        {
          path: 'inventory',
          name: 'inventory',
          component: InventoryPage,
          meta: {
            title: 'Inventory & Stock Movements',
            icon: 'bi-boxes',
            roles: ['OWNER', 'STAFF'],
          },
        },
        {
          path: 'recipes',
          name: 'recipes',
          component: RecipesPage,
          meta: {
            title: 'Drink Recipes (BOM)',
            icon: 'bi-journal-text',
            roles: ['OWNER', 'STAFF'],
          },
        },
        // Phase 5: Expenses
        {
          path: 'expenses',
          name: 'expenses',
          component: ExpensesPage,
          meta: {
            title: 'Daily Expenses',
            icon: 'bi-wallet2',
            roles: ['OWNER', 'STAFF'],
          },
        },
        // Phase 6: Dashboard, Reports & Audit Logs
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardPage,
          meta: {
            title: 'Executive Dashboard',
            icon: 'bi-grid-1x2',
            roles: ['OWNER'],
          },
        },
        {
          path: 'reports',
          name: 'reports',
          component: ReportsPage,
          meta: {
            title: 'Reports & Analytics',
            icon: 'bi-bar-chart-line',
            roles: ['OWNER', 'STAFF'],
          },
        },
        {
          path: 'audit-logs',
          name: 'audit-logs',
          component: AuditLogsPage,
          meta: {
            title: 'System Audit Logs',
            icon: 'bi-shield-check',
            roles: ['OWNER'],
          },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
      meta: { title: 'Page Not Found' },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  document.title = to.meta?.title ? `${to.meta.title} • BrewPOS` : 'BrewPOS'

  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)
  const isGuestOnly = to.matched.some((record) => record.meta?.guestOnly)

  if (requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    }
  }

  if (isGuestOnly && authStore.isAuthenticated) {
    return authStore.defaultRoute
  }

  const allowedRoles = to.meta?.roles
  if (allowedRoles && authStore.user?.role && !allowedRoles.includes(authStore.user.role)) {
    return authStore.defaultRoute
  }

  return true
})

export default router
