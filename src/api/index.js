import http from './http'

export function login(payload) {
  return http.post('/user_login', payload)
}

export function updatePassword(payload) {
  return http.put('/user_update_password', payload)
}

export function fetchUsers() {
  return http.get('/users')
}

export function createUser(payload) {
  return http.post('/users', payload)
}

export function updateUser(id, payload) {
  return http.put(`/users/${id}`, payload)
}

export function deleteUser(id) {
  return http.delete(`/users/${id}`)
}

export function resetUserPassword(id) {
  return http.put(`/users/${id}/reset_password`)
}

export function fetchSettings(name) {
  return http.get(`/settings/${name}`)
}

export function saveSettings(name, payload) {
  return http.put(`/settings/${name}`, payload)
}

export function createItem(payload) {
  return http.post('/item_create', payload)
}

export function searchItems(name) {
  return http.get(`/items/${encodeURIComponent(name)}`)
}

export function fetchUserItems(name) {
  return http.get(`/user_items/${encodeURIComponent(name)}`, {
    headers: { 'X-User-Scene': 'user' }
  })
}

export function assignGrilles(payload) {
  return http.post('/grille_form_item_create', payload)
}

export function createGrilles(payload) {
  return http.post('/grille_create', payload)
}

export function fetchGrilles(params) {
  return http.get('/grilles', { params })
}

export function updateGrille(id, payload) {
  return http.put(`/grilles/${id}`, payload)
}

export function batchUpdateGrilles(payload) {
  return http.post('/grilles/batch', payload)
}

export function packageOut(payload) {
  return http.post('/item_out_grille', payload, {
    headers: { 'X-User-Scene': 'user' }
  })
}

export function getItemsByPhone(phone) {
  return http.get(`/grille_phone_get_item/${phone}`)
}

export function fetchPackages(params) {
  return http.get('/packages', { params })
}

export function updatePackage(id, payload) {
  return http.put(`/packages/${id}`, payload)
}

export function fetchPackageLogs(params) {
  return http.get(`/packages/logs`, { params })
}

export function createUserProfile(payload) {
  return http.post('/user_smart_create', payload, {
    headers: { 'X-User-Scene': 'user' }
  })
}

export function verifyPickup(payload) {
  return http.post('/pickup/verify', payload, {
    headers: { 'X-User-Scene': 'user' }
  })
}
