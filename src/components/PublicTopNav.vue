<template>
  <header class="public-nav">
    <div class="page-shell nav-inner">
      <div class="brand-block">
        <button class="brand" type="button" @click="router.push('/pickup')">
          智能快递柜管理系统
        </button>
        <span class="scene-text">{{ sceneLabel }}</span>
      </div>

      <div class="nav-actions">
        <div class="nav-links">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="nav-btn"
            :class="{ active: item.active }"
            @click="item.onClick()"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="showUserSession" class="session-actions">
          <div class="session-chip user">
            <span>用户端会话</span>
            <strong>{{ userSessionLabel }}</strong>
          </div>
          <button
            type="button"
            class="nav-btn danger"
            @click="logoutUser"
          >
            退出用户验证
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isUserScene = computed(() => route.path.startsWith('/pickup') || route.path.startsWith('/backup'))
const showUserSession = computed(() => isUserScene.value && !!auth.userToken)

const sceneLabel = computed(() => {
  if (route.path.startsWith('/pickup') || route.path.startsWith('/backup')) return '用户端入口'
  if (route.path.startsWith('/query')) return '公共查询入口'
  if (route.path.startsWith('/login')) return '管理端入口'
  return '公共服务入口'
})

const userSessionLabel = computed(() => {
  const name = auth.userProfile?.nickname || '已验证用户'
  const phone = auth.userProfile?.phone || ''
  return phone ? `${name} · ${phone}` : name
})

const staffEntryLabel = computed(() => {
  if (!auth.staffToken) return '管理端登录'
  return auth.currentRole === 'admin' ? '返回管理员控制台' : '返回快递员工作台'
})

const navItems = computed(() => [
  {
    key: 'pickup',
    label: '用户取件',
    active: route.path.startsWith('/pickup') || route.path.startsWith('/backup'),
    onClick: () => router.push('/pickup')
  },
  {
    key: 'query',
    label: '公共查询',
    active: route.path === '/query',
    onClick: () => router.push('/query')
  },
  {
    key: 'staff-entry',
    label: staffEntryLabel.value,
    active: route.path === '/login',
    onClick: () => {
      if (!auth.staffToken) {
        router.push('/login')
        return
      }
      router.push(auth.currentRole === 'admin' ? '/admin/users' : '/courier/inbound')
    }
  }
])

function logoutUser() {
  auth.logoutUser()
  if (route.path.startsWith('/backup')) {
    router.push('/pickup')
  }
}
</script>

<style scoped>
.public-nav {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.22);
}

.nav-inner {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.scene-text {
  font-size: 12px;
  opacity: 0.9;
}

.nav-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.nav-links,
.session-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.nav-btn {
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #2563eb;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease;
}

.nav-btn:hover {
  transform: translateY(-1px);
}

.nav-btn.active {
  background: #dbeafe;
}

.session-chip {
  min-height: 38px;
  border-radius: 10px;
  padding: 7px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  color: #fff;
}

.session-chip span {
  font-size: 11px;
  opacity: 0.85;
}

.session-chip strong {
  font-size: 13px;
  font-weight: 700;
}

.session-chip.user {
  background: rgba(5, 150, 105, 0.3);
}

.nav-btn.danger {
  background: #ef4444;
  color: #fff;
}

@media (max-width: 768px) {
  .nav-inner {
    padding: 12px 0;
    flex-direction: column;
    align-items: flex-start;
  }

  .nav-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .nav-links,
  .session-actions {
    width: 100%;
  }
}
</style>
