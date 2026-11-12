import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const requestUrl = originalRequest.url || ''
    const isAuthPublicRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh-token') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/verify-otp') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/logout')

    if (status === 401 && !originalRequest._retry && !isAuthPublicRoute) {
      const authStore = useAuthStore()

      if (!authStore.refreshToken) {
        authStore.clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: authStore.refreshToken,
        })
        const data = res.data?.data
        if (data?.token) {
          authStore.setTokens(data.token, data.refreshToken)
          processQueue(null, data.token)
          originalRequest.headers.Authorization = `Bearer ${data.token}`
          return api(originalRequest)
        }
        throw new Error('Refresh failed')
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        authStore.clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export const getAssetUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  const serverOrigin = API_BASE_URL.replace(/\/api\/?$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${serverOrigin}${cleanPath}`
}

export default api
