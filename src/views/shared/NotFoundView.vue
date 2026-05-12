<template>
  <div class="not-found page-shell">
    <section class="glass-card panel">
      <p class="eyebrow">404</p>
      <h1>页面不存在</h1>
      <p>当前地址没有对应页面。你可以回到公共查询页，或者进入管理端/用户端入口。</p>
      <div class="actions">
        <el-button type="primary" @click="router.push('/query')">公共查询</el-button>
        <el-button plain @click="router.push('/login')">管理端登录</el-button>
        <el-button plain @click="router.push('/pickup')">用户取件</el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

.panel {
  padding: 36px;
  max-width: 640px;
}

.eyebrow {
  margin: 0;
  color: var(--text-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 12px;
}

h1 {
  margin: 12px 0;
}

p {
  color: var(--text-muted);
  line-height: 1.8;
}

.actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
