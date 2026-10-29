import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api from '@/api/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const login = async (credentials) => {
    try {
      const res = await api.post('/auth/login', credentials)
      const data = res.data?.data

      if (data?.token) {
        token.value = data.token
        user.value = data.user
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      return res.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  }
})
