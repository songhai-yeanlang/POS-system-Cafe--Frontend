import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api from '@/api/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isOwner = computed(() => user.value?.role === 'OWNER')
  const isStaff = computed(() => user.value?.role === 'STAFF')

  const defaultRoute = computed(() => {
    if (!user.value) return '/login'
    return user.value.role === 'OWNER' ? '/dashboard' : '/pos'
  })

  const setTokens = (newToken, newRefreshToken) => {
    if (newToken) {
      token.value = newToken
      localStorage.setItem('token', newToken)
    }
    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
      localStorage.setItem('refreshToken', newRefreshToken)
    }
  }

  const setUser = (userData) => {
    user.value = userData
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }

  const clearAuth = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  const login = async (credentials) => {
    try {
      const res = await api.post('/auth/login', credentials)
      const data = res.data?.data

      if (data?.token) {
        setTokens(data.token, data.refreshToken)
        setUser(data.user)
      }

      return res.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const fetchMe = async () => {
    if (!token.value) return null
    try {
      const res = await api.get('/auth/me')
      const userData = res.data?.data
      if (userData) {
        setUser(userData)
      }
      return userData
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const logout = async () => {
    const currentRefreshToken = refreshToken.value
    clearAuth()
    if (currentRefreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken: currentRefreshToken })
      } catch {
        // Ignore network/token errors during logout cleanup
      }
    }
  }

  const logoutAll = async () => {
    try {
      await api.post('/auth/logout-all')
    } finally {
      clearAuth()
    }
  }

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    isOwner,
    isStaff,
    defaultRoute,
    setTokens,
    setUser,
    clearAuth,
    login,
    fetchMe,
    logout,
    logoutAll,
  }
})
