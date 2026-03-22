import axios from 'axios'

const DEVICE_KEY = 'admin_device_id'

export function getAdminDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token')
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  config.headers['X-Device-Id'] = getAdminDeviceId()
  return config
})

api.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body.code === 'number' && body.code !== 0) {
      return Promise.reject(new Error(body.message || 'request failed'))
    }
    return res
  },
  (err) => {
    const data = err.response?.data as { message?: string } | undefined
    const msg = data?.message
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(new Error(msg || (err instanceof Error ? err.message : 'request failed')))
  }
)

export type ApiBody<T> = { code: number; message: string; data: T }

export function unwrap<T>(res: { data: ApiBody<T> }): T {
  return res.data.data as T
}

export default api
