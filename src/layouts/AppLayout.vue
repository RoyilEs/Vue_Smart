<template>
  <div class="layout-page">
    <header class="layout-topbar">
      <div :class="[isAdmin ? 'admin-topbar-inner' : 'page-shell', 'topbar-inner']">
        <div class="brand-block">
          <strong>智能快递柜管理系统</strong>
          <span>{{ isAdmin ? '管理员控制台' : '快递员工作台' }}</span>
        </div>

        <div class="topbar-actions">
          <span class="session-pill">{{ roleLabel }} · {{ auth.currentProfile?.nickname || auth.currentProfile?.username }}</span>
          <el-button plain size="small" @click="router.push('/pickup')">返回用户端</el-button>
          <el-button size="small" type="danger" @click="logout">退出管理端</el-button>
        </div>
      </div>
    </header>

    <div v-if="isAdmin" class="admin-shell">
      <aside class="admin-sidebar">
        <div class="sidebar-title">管理菜单</div>

        <button
          v-for="item in menuItems"
          :key="item.path"
          type="button"
          class="menu-btn"
          :class="{ active: route.path === item.path }"
          @click="router.push(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
      </aside>

      <main class="admin-main">
        <div class="admin-heading">
          <div>
            <h2>{{ route.meta.title || '管理员控制台' }}</h2>
            <p>{{ auth.currentProfile?.phone || auth.currentProfile?.email }}</p>
          </div>
        </div>

        <div class="admin-view">
          <router-view />
        </div>
      </main>
    </div>

    <main v-else class="page-shell courier-shell">
      <div class="courier-heading glass-card">
        <div>
          <h2>{{ route.meta.title || '包裹入柜' }}</h2>
          <p>当前工作台：{{ roleLabel }} · {{ auth.currentProfile?.nickname || auth.currentProfile?.username }}</p>
        </div>
        <span class="status-tag status-stored">在线值守</span>
      </div>

      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Box, Setting, User, Van } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const adminMenus = [
  { path: '/admin/users', label: '用户管理', icon: User },
  { path: '/admin/cabinets', label: '快递柜管理', icon: Box },
  { path: '/admin/packages', label: '包裹管理', icon: Van },
  { path: '/admin/settings', label: '系统设置', icon: Setting }
]

const menuItems = computed(() => adminMenus)
const isAdmin = computed(() => auth.currentRole === 'admin')
const roleLabel = computed(() => auth.currentRole === 'admin' ? '管理员' : '快递员')

function logout() {
  auth.logoutStaff()
  router.push('/login')
}
</script>

<style scoped>
.layout-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.layout-topbar {
  background: #2563eb;
  color: #fff;
  height: 64px;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.22);
}

.topbar-inner {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.admin-topbar-inner {
  width: calc(100% - 32px);
  margin: 0 16px;
}

.brand-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-block strong {
  font-size: 20px;
}

.brand-block span {
  font-size: 12px;
  opacity: 0.9;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-pill {
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(15, 23, 42, 0.25);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.admin-shell {
  width: 100%;
  min-height: calc(100vh - 64px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
}

.admin-sidebar {
  background: #1f2937;
  color: #fff;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 20px;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.menu-btn {
  border: none;
  background: transparent;
  color: inherit;
  width: 100%;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: background-color 0.18s ease;
}

.menu-btn:hover,
.menu-btn.active {
  background: #374151;
}

.admin-main {
  padding: 24px;
  min-width: 0;
}

.admin-view :deep(.page-shell) {
  width: 100%;
  margin: 0;
}

.admin-heading {
  margin-bottom: 18px;
}

.admin-heading h2 {
  margin: 0;
  font-size: 24px;
}

.admin-heading p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.courier-shell {
  padding: 24px 0 36px;
}

.courier-heading {
  margin-bottom: 20px;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.courier-heading h2 {
  margin: 0;
}

.courier-heading p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

@media (max-width: 980px) {
  .topbar-inner,
  .topbar-actions,
  .courier-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-topbar-inner {
    width: calc(100% - 20px);
    margin: 0 10px;
  }
}
</style>

