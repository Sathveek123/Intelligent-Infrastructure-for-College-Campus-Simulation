import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
})

const TOKEN_KEY = 'i2sf_token'
const REFRESH_TOKEN_KEY = 'i2sf_refresh_token'
const USER_KEY = 'i2sf_user'

type ApiSuccess<T> = { success: true; data: T }
type ApiFailure = { success: false; error: string }
type ApiResponse<T> = ApiSuccess<T> | ApiFailure

type RefreshResponse = {
  token: string
  refreshToken?: string
}

type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean
}

let isRefreshing = false
let refreshPromise: Promise<string> | null = null
let subscribers: Array<(token: string) => void> = []

function logoutAndRedirect() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

function isAuthPath(url?: string) {
  if (!url) return false
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')
}

function subscribeTokenRefresh(cb: (token: string) => void) {
  subscribers.push(cb)
}

function onRefreshed(token: string) {
  subscribers.forEach((cb) => cb(token))
  subscribers = []
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) throw new Error('Missing refresh token')

  const res = await api.post<ApiResponse<RefreshResponse>>(
    '/auth/refresh',
    { refreshToken },
    {
      headers: {
        ...(api.defaults.headers.common ?? {}),
        Authorization: '',
      },
    },
  )
  if (!res.data.success) throw new Error(res.data.error)

  const nextToken = res.data.data.token
  const nextRefreshToken = res.data.data.refreshToken
  localStorage.setItem(TOKEN_KEY, nextToken)
  if (nextRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)

  return nextToken
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const status = err.response?.status
    const originalConfig = (err.config ?? {}) as RetryConfig

    if (status !== 401) return Promise.reject(err)
    if (originalConfig._retry) return Promise.reject(err)
    if (isAuthPath(originalConfig.url)) return Promise.reject(err)

    originalConfig._retry = true

    if (isRefreshing && refreshPromise) {
      return await new Promise<AxiosResponse>((resolve, reject) => {
        subscribeTokenRefresh((t) => {
          const nextConfig: AxiosRequestConfig = {
            ...originalConfig,
            headers: {
              ...(originalConfig.headers ?? {}),
              Authorization: `Bearer ${t}`,
            },
          }
          api.request(nextConfig).then(resolve).catch(reject)
        })
      })
    }

    isRefreshing = true
    refreshPromise = refreshAccessToken()

    try {
      const token = await refreshPromise
      onRefreshed(token)

      const nextConfig: AxiosRequestConfig = {
        ...originalConfig,
        headers: {
          ...(originalConfig.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      }

      return await api.request(nextConfig)
    } catch (e) {
      logoutAndRedirect()
      return Promise.reject(e)
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  },
)
