export const STORAGE_KEYS = {
  staffSession: 'smart-cabinet-staff-session',
  userSession: 'smart-cabinet-user-session',
  mockDatabase: 'smart-cabinet-mock-db'
}

export function readJson(key, fallback = null) {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw)
  } catch (error) {
    return fallback
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeJson(key) {
  localStorage.removeItem(key)
}
