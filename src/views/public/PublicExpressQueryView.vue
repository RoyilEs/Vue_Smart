<template>
  <div class="public-page">
    <PublicTopNav />

    <div class="page-shell public-wrap">
      <section class="glass-card query-card">
        <!-- 头部区域 -->
        <div class="card-heading">
          <div class="heading-left">
            <div class="icon-wrapper">
              <el-icon :size="32"><Search /></el-icon>
            </div>
            <div>
              <h2>公共快递查询</h2>
              <p>支持按快递单号或手机号查询包裹状态、格口位置和处理进度</p>
            </div>
          </div>
          <el-button type="primary" plain @click="router.push('/pickup')" class="pickup-btn">
            <el-icon><Goods /></el-icon>
            去取件
          </el-button>
        </div>

        <!-- 查询工具栏 -->
        <div class="query-toolbar">
          <el-radio-group v-model="searchMode" size="large">
            <el-radio-button :value="'logistics'">
              <el-icon><Tickets /></el-icon>
              快递单号
            </el-radio-button>
            <el-radio-button :value="'phone'">
              <el-icon><Iphone /></el-icon>
              手机号
            </el-radio-button>
          </el-radio-group>

          <el-input
              v-model="keyword"
              :placeholder="searchMode === 'logistics' ? '请输入快递单号' : '请输入收件人手机号'"
              clearable
              size="large"
              @keyup.enter="handleSearch"
              class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-button type="primary" size="large" :loading="loading" @click="handleSearch" class="search-btn">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon total-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">查询结果</div>
              <div class="stat-value">{{ list.length }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon pending-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">待取件</div>
              <div class="stat-value">{{ list.filter((item) => item.status === 'stored').length }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon created-icon">
              <el-icon><Box /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">待入柜</div>
              <div class="stat-value">{{ list.filter((item) => item.status === 'created').length }}</div>
            </div>
          </div>
        </div>

        <!-- 结果列表 -->
        <div class="result-grid">
          <transition-group name="package-list" tag="div" class="package-grid">
            <article v-for="item in list" :key="item.logisticsId" class="package-card" :class="getCardStatusClass(item.status)">
              <!-- 卡片头部 -->
              <div class="package-head">
                <div class="package-title">
                  <div class="package-icon" :class="getIconStatusClass(item.status)">
                    <el-icon :size="24"><Box /></el-icon>
                  </div>
                  <div>
                    <h3>{{ item.itemName || '未命名包裹' }}</h3>
                    <p class="logistics-id">{{ item.logisticsId }}</p>
                  </div>
                </div>
                <div class="status-group">
                  <span class="status-tag" :class="statusClass(item.status)">
                    <span class="status-dot"></span>
                    {{ statusText(item.status) }}
                  </span>
                  <h2 class="status-badge-title" :class="getStatusTitleClass(item.status)">
                    {{ getStatusTitle(item.status) }}
                  </h2>
                </div>
              </div>

              <!-- 详细信息 -->
              <div class="package-details">
                <!-- 待入柜状态显示 -->
                <div v-if="item.status === 'created'" class="status-info created-info">
                  <el-icon><InfoFilled /></el-icon>
                  <span>包裹已创建，等待放入格口</span>
                </div>

                <!-- 待取件状态显示 -->
                <div v-else-if="item.status === 'stored'" class="status-info stored-info">
                  <el-icon><Position /></el-icon>
                  <span>包裹已入柜，请及时取件</span>
                </div>

                <!-- 已取件状态显示 -->
                <div v-else-if="item.status === 'picked_up'" class="status-info picked-info">
                  <el-icon><SuccessFilled /></el-icon>
                  <span>包裹已取件，感谢使用</span>
                </div>

                <div class="detail-row">
                  <div class="detail-item">
                    <div class="detail-label">
                      <el-icon><User /></el-icon>
                      收件人
                    </div>
                    <div class="detail-value">{{ item.receiverName || '-' }}</div>
                    <div class="detail-sub">{{ item.receiverPhone || '-' }}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">
                      <el-icon><OfficeBuilding /></el-icon>
                      柜体
                    </div>
                    <div class="detail-value">{{ getCabinetDisplay(item) }}</div>
                  </div>
                </div>

                <div class="detail-row">
                  <div class="detail-item">
                    <div class="detail-label">
                      <el-icon><Grid /></el-icon>
                      格口
                    </div>
                    <div class="detail-value grille-id">{{ getGrilleDisplay(item) }}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">
                      <el-icon><Clock /></el-icon>
                      {{ getTimeLabel(item.status) }}
                    </div>
                    <div class="detail-value time-text">{{ formatTime(getStatusTime(item)) }}</div>
                  </div>
                </div>

                <!-- 已取件包裹显示取件时间 -->
                <div v-if="item.status === 'picked_up' && item.outboundAt" class="detail-row">
                  <div class="detail-item full-width">
                    <div class="detail-label">
                      <el-icon><Timer /></el-icon>
                      取件时间
                    </div>
                    <div class="detail-value">{{ formatDateTime(item.outboundAt) }}</div>
                  </div>
                </div>
              </div>

              <!-- 底部操作 - 只有待取件才显示去取件按钮 -->
              <div class="package-footer" v-if="item.status === 'stored'">
                <el-button type="primary" link @click="goToPickup(item)">
                  <el-icon><Right /></el-icon>
                  去取件
                </el-button>
              </div>
            </article>
          </transition-group>

          <el-empty
              v-if="!loading && !list.length"
              description="暂无查询结果"
              :image-size="120"
              class="empty-block"
          >
            <template #description>
              <span class="empty-description">还没有找到相关包裹<br>试试输入其他快递单号或手机号</span>
            </template>
          </el-empty>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search, Tickets, Iphone, Goods, Document, Clock, Box, User,
  OfficeBuilding, Grid, Right, InfoFilled, Position,
  SuccessFilled, Timer
} from '@element-plus/icons-vue'
import PublicTopNav from '../../components/PublicTopNav.vue'
import { getItemsByPhone, searchItems } from '../../api'

const router = useRouter()
const keyword = ref('')
const searchMode = ref('logistics')
const loading = ref(false)
const list = ref([])

// 根据状态获取卡片样式
function getCardStatusClass(status) {
  return {
    created: 'card-created',
    stored: 'card-stored',
    picked_up: 'card-picked',
    occupied: 'card-occupied'
  }[status] || ''
}

// 根据状态获取图标样式
function getIconStatusClass(status) {
  return {
    created: 'icon-created',
    stored: 'icon-stored',
    picked_up: 'icon-picked',
    occupied: 'icon-occupied'
  }[status] || ''
}

// 获取状态标题
function getStatusTitle(status) {
  const titles = {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已完成',
    occupied: '已占用'
  }
  return titles[status] || '处理中'
}

// 获取状态标题样式
function getStatusTitleClass(status) {
  return {
    created: 'title-created',
    stored: 'title-stored',
    picked_up: 'title-picked',
    occupied: 'title-occupied'
  }[status] || ''
}

// 获取柜体显示
function getCabinetDisplay(item) {
  if (item.status === 'picked_up') {
    return '已取件'
  }
  if (item.status === 'created') {
    return '待入柜'
  }
  return item.cabinet_code || '未入柜'
}

// 获取格口显示
function getGrilleDisplay(item) {
  if (item.status === 'picked_up') {
    return '已取件'
  }
  if (item.status === 'created') {
    return '待分配'
  }
  return item.grille_id || '未分配'
}

// 获取时间标签
function getTimeLabel(status) {
  const labels = {
    created: '创建时间',
    stored: '入柜时间',
    picked_up: '完成时间',
    occupied: '占用时间'
  }
  return labels[status] || '更新时间'
}

// 获取状态时间
function getStatusTime(item) {
  if (item.status === 'picked_up') {
    return item.outboundAt || item.UpdatedAt
  }
  if (item.status === 'stored') {
    return item.inboundAt || item.UpdatedAt
  }
  return item.CreatedAt || item.UpdatedAt
}

function statusClass(status) {
  return {
    created: 'status-created',
    stored: 'status-stored',
    occupied: 'status-occupied',
    picked_up: 'status-picked'
  }[status] || 'status-idle'
}

function statusText(status) {
  return {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已取件',
    occupied: '已占用'
  }[status] || '空闲'
}

function formatTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

async function handleSearch() {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入查询内容')
    return
  }

  loading.value = true
  try {
    const response = searchMode.value === 'phone'
        ? await getItemsByPhone(keyword.value.trim())
        : await searchItems(keyword.value.trim())
    list.value = response.data.list || []

    if (list.value.length === 0) {
      ElMessage.info('未找到相关包裹')
    } else {
      ElMessage.success(`找到 ${list.value.length} 个包裹`)
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

function goToPickup(item) {
  router.push({
    path: '/pickup',
    query: { phone: item.receiverPhone, logisticsId: item.logisticsId }
  })
}
</script>

<style scoped>
.public-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%);
}

.public-wrap {
  padding: 24px 0 36px;
}

.query-card {
  padding: 28px 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.1);
}

/* 头部区域 */
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}

.heading-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-heading h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-heading p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.pickup-btn {
  border-radius: 12px;
  padding: 10px 20px;
}

/* 查询工具栏 */
.query-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  margin-bottom: 28px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.search-btn {
  border-radius: 12px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.total-icon {
  background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
  color: #667eea;
}

.pending-icon {
  background: linear-gradient(135deg, #f59e0b20 0%, #f9731620 100%);
  color: #f59e0b;
}

.created-icon {
  background: linear-gradient(135deg, #10b98120 0%, #05966920 100%);
  color: #10b981;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

/* 结果网格 */
.result-grid {
  margin-top: 0;
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

/* 卡片样式 */
.package-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  transition: all 0.3s ease;
  border: 1px solid #e5e7eb;
  position: relative;
  overflow: hidden;
}

.package-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.package-card.card-created::before {
  background: linear-gradient(90deg, #10b981, #059669);
  opacity: 1;
}

.package-card.card-stored::before {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  opacity: 1;
}

.package-card.card-picked::before {
  background: linear-gradient(90deg, #6b7280, #4b5563);
  opacity: 1;
}

.package-card.card-occupied::before {
  background: linear-gradient(90deg, #ef4444, #dc2626);
  opacity: 1;
}

.package-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

/* 卡片头部 */
.package-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.package-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.package-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #6b7280;
  transition: all 0.3s ease;
}

.package-icon.icon-created {
  background: #dcfce7;
  color: #059669;
}

.package-icon.icon-stored {
  background: #dbeafe;
  color: #2563eb;
}

.package-icon.icon-picked {
  background: #f3f4f6;
  color: #6b7280;
}

.package-icon.icon-occupied {
  background: #fee2e2;
  color: #dc2626;
}

.package-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.logistics-id {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
}

/* 状态组 */
.status-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

/* 状态标题 */
.status-badge-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 16px;
}

.title-created {
  background: #dcfce7;
  color: #059669;
}

.title-stored {
  background: #dbeafe;
  color: #2563eb;
}

.title-picked {
  background: #f3f4f6;
  color: #6b7280;
}

.title-occupied {
  background: #fee2e2;
  color: #dc2626;
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-created {
  background: #fef3c7;
  color: #d97706;
}

.status-stored {
  background: #dbeafe;
  color: #2563eb;
}

.status-picked {
  background: #dcfce7;
  color: #059669;
}

.status-occupied {
  background: #fee2e2;
  color: #dc2626;
}

/* 状态信息条 */
.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 500;
}

.created-info {
  background: #dcfce7;
  color: #059669;
}

.stored-info {
  background: #dbeafe;
  color: #2563eb;
}

.picked-info {
  background: #f3f4f6;
  color: #6b7280;
}

/* 详细信息 */
.package-details {
  margin-bottom: 16px;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-item {
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.detail-sub {
  font-size: 12px;
  color: #6b7280;
}

.grille-id {
  font-family: monospace;
  font-size: 14px;
  color: #667eea;
}

.time-text {
  font-size: 12px;
  font-weight: normal;
  color: #6b7280;
}

/* 底部操作 */
.package-footer {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}

.package-footer .el-button {
  font-size: 13px;
}

/* 动画 */
.package-list-enter-active,
.package-list-leave-active {
  transition: all 0.3s ease;
}

.package-list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.package-list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 空状态 */
.empty-block {
  grid-column: 1 / -1;
  padding: 48px;
  background: white;
  border-radius: 20px;
  border: 2px dashed #e5e7eb;
}

.empty-description {
  color: #9ca3af;
  font-size: 14px;
  line-height: 1.6;
}

/* 响应式 */
@media (max-width: 768px) {
  .query-card {
    padding: 20px;
  }

  .card-heading {
    flex-direction: column;
  }

  .heading-left {
    width: 100%;
  }

  .query-toolbar {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .package-grid {
    grid-template-columns: 1fr;
  }

  .detail-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>