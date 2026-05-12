import axios from 'axios'
import { config } from '../config'

export const apiClient = axios.create({
  baseURL: config.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Token is injected at login and stored in memory — this setter is called by the auth store
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

apiClient.interceptors.request.use((req) => {
  if (accessToken) {
    req.headers.Authorization = `Bearer ${accessToken}`
  }
  return req
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setAccessToken(null)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
