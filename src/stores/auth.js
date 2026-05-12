import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS, readJson, removeJson, writeJson } from '../utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const staffSession = ref(readJson(STORAGE_KEYS.staffSession, null))
  const userSession = ref(readJson(STORAGE_KEYS.userSession, null))

  const staffToken = computed(() => staffSession.value?.token || '')
  const currentRole = computed(() => staffSession.value?.role || '')
  const currentProfile = computed(() => staffSession.value?.profile || null)
  const userToken = computed(() => userSession.value?.token || '')
  const userProfile = computed(() => userSession.value?.profile || null)

  function setStaffSession(session) {
    staffSession.value = session
    if (session) writeJson(STORAGE_KEYS.staffSession, session)
    else removeJson(STORAGE_KEYS.staffSession)
  }

  function setUserSession(session) {
    userSession.value = session
    if (session) writeJson(STORAGE_KEYS.userSession, session)
    else removeJson(STORAGE_KEYS.userSession)
  }

  function logoutStaff() {
    setStaffSession(null)
  }

  function logoutUser() {
    setUserSession(null)
  }

  return {
    staffSession,
    userSession,
    staffToken,
    currentRole,
    currentProfile,
    userToken,
    userProfile,
    setStaffSession,
    setUserSession,
    logoutStaff,
    logoutUser
  }
})
