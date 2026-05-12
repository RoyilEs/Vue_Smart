import axios from 'axios'
import { STORAGE_KEYS, readJson } from '../utils/storage'

const http = axios.create({
  baseURL: 'http://127.0.0.1:8080/api',
  timeout: 10000
})

http.interceptors.request.use((config) => {
  config.headers = config.headers || {}

  const staffSession = readJson(STORAGE_KEYS.staffSession, null)
  const userSession = readJson(STORAGE_KEYS.userSession, null)
  const token = config.headers['X-User-Scene'] === 'user'
    ? userSession?.token
    : staffSession?.token

  if (token) {
    config.headers.token = token
  }

  return config
})

http.interceptors.response.use((response) => {
  const payload = response.data

  if (payload?.code === 0) {
    return payload
  }

  const error = new Error(payload?.msg || '请求失败')
  error.response = { data: payload }
  return Promise.reject(error)
})

export default http
