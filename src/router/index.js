import { createRouter, createWebHistory } from 'vue-router'
import pinia from '../stores'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/query' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/public/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/query',
    name: 'query',
    component: () => import('../views/public/PublicExpressQueryView.vue'),
    meta: { public: true }
  },
  {
    path: '/pickup',
    name: 'pickup',
    component: () => import('../views/user/UserPackagePickupView.vue'),
    meta: { public: true }
  },
  {
    path: '/backup',
    name: 'backup',
    component: () => import('../views/user/UserPackageBackupView.vue'),
    meta: { public: true, userSessionRequired: true }
  },
  {
    path: '/admin',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { roles: ['admin'] },
    children: [
      { path: '', redirect: '/admin/users' },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('../views/admin/UserManageView.vue'),
        meta: { roles: ['admin'], title: '用户管理' }
      },
      {
        path: 'cabinets',
        name: 'admin-cabinets',
        component: () => import('../views/admin/CabinetManageView.vue'),
        meta: { roles: ['admin'], title: '格口管理' }
      },
      {
        path: 'packages',
        name: 'admin-packages',
        component: () => import('../views/admin/PackageManageView.vue'),
        meta: { roles: ['admin'], title: '包裹管理' }
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: () => import('../views/admin/SettingsView.vue'),
        meta: { roles: ['admin'], title: '系统设置' }
      }
    ]
  },
  {
    path: '/courier',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { roles: ['courier'] },
    children: [
      { path: '', redirect: '/courier/inbound' },
      {
        path: 'inbound',
        name: 'courier-inbound',
        component: () => import('../views/courier/CourierPackageInView.vue'),
        meta: { roles: ['courier'], title: '包裹入柜' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/shared/NotFoundView.vue'),
    meta: { public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore(pinia)

  if (to.meta.public && !to.meta.userSessionRequired) {
    return true
  }

  if (to.meta.userSessionRequired) {
    if (!auth.userToken) {
      return {
        path: '/pickup',
        query: {
          notice: 'backup-auth',
          redirect: to.fullPath
        }
      }
    }
    return true
  }

  if (!auth.staffToken) {
    return '/login'
  }

  if (to.meta.roles?.length && !to.meta.roles.includes(auth.currentRole)) {
    return auth.currentRole === 'admin' ? '/admin/users' : '/courier/inbound'
  }

  return true
})

export default router
