<template>
  <div class="public-page">
    <PublicTopNav />

    <div class="page-shell pickup-wrap">
      <section class="glass-card pickup-card">
        <div class="card-heading">
          <div>
            <h2>用户取件</h2>
            <p>新用户：输入手机号或取件码。老用户：直接点"我的快递"。</p>
          </div>
          <div class="heading-actions">
            <el-button plain @click="router.push('/backup')">退换包裹</el-button>
            <el-button
                v-if="packages.length > 0 && getSelectablePackages().length > 0"
                plain
                @click="selectAllPackages"
            >
              {{ isAllSelected ? '取消全选' : '全选' }}
            </el-button>
            <el-button
                type="primary"
                :disabled="!selectedPackages.length || pickuping"
                @click="batchPickup"
            >
              {{ pickuping ? '取件中...' : `批量取件 (${selectedPackages.length})` }}
            </el-button>
          </div>
        </div>

        <el-alert
            v-if="route.query.notice === 'backup-auth'"
            class="notice-card"
            title="退换包裹需要先完成用户验证"
            description="请先输入手机号或取件码完成身份校验。校验成功后会自动返回退换页面。"
            type="warning"
            :closable="false"
            show-icon
        />

        <div class="query-toolbar">
          <el-radio-group v-model="searchMode">
            <el-radio-button :value="'pickupCode'">取件码</el-radio-button>
            <el-radio-button :value="'phone'">手机号</el-radio-button>
          </el-radio-group>
          <el-input
              v-model="queryKeyword"
              :placeholder="searchMode === 'pickupCode' ? '输入取件码' : '输入手机号'"
              clearable
              @keyup.enter="verifyByInput"
          />
          <el-button type="success" :loading="verifying" @click="verifyByInput">确认取件</el-button>
          <el-button type="primary" plain :loading="loadingPackages" @click="loadMyPackages()">我的快递</el-button>
        </div>

        <p class="toolbar-tip">查询输入已和公共查询统一为单输入模式，可按手机号或取件码切换查询。</p>

        <!-- 平面网格展示区 -->
        <div class="cabinet-visual">
          <div class="pagination-header">
            <el-button :disabled="currentPage <= 1" @click="prevPage" size="small">
              <el-icon><ArrowLeft /></el-icon> 上一页
            </el-button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <el-button :disabled="currentPage >= totalPages" @click="nextPage" size="small">
              下一页 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>

          <div class="status-grid" v-if="currentPageGrilles.length">
            <div
                v-for="item in currentPageGrilles"
                :key="item.grille_id"
                class="status-cell"
                :class="[
                getStatusClass(item.status),
                { active: targetGrilleId === item.grille_id }
              ]"
            >
              <strong>{{ item.grille_id }}</strong>
              <span>{{ getStatusText(item.status) }}</span>
              <small class="position">{{ item.matrix_row }}-{{ item.matrix_column }}</small>
              <div v-if="item.logisticsId && item.logisticsId !== ''" class="package-badge">
                📦
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无格口数据" />

          <div class="pagination-footer" v-if="totalPages > 1">
            <el-pagination
                background
                layout="prev, pager, next"
                :total="sortedGrilles.length"
                :page-size="pageSize"
                :current-page="currentPage"
                @current-change="handlePageChange"
                small
            />
          </div>
        </div>

        <!-- 取件结果和待取包裹区域 -->
        <div class="result-panel">
          <!-- 取件结果 -->
          <section class="result-main">
            <h3>📋 取件结果</h3>
            <div class="result-content">
              <div v-if="pickupResult" class="result-message" :class="{ success: pickupSuccess, error: !pickupSuccess }">
                {{ pickupResult }}
              </div>
              <div v-else class="result-message info">
                请先选择包裹并点击"批量取件"
              </div>

              <el-descriptions v-if="selectedPackages.length === 1" :column="1" border class="package-detail">
                <el-descriptions-item label="包裹名称">
                  <strong>{{ selectedPackages[0]?.itemName || selectedPackages[0]?.item_name || '-' }}</strong>
                </el-descriptions-item>
                <el-descriptions-item label="物流单号">{{ selectedPackages[0]?.logisticsId || selectedPackages[0]?.logistics_id || '-' }}</el-descriptions-item>
                <el-descriptions-item label="收件手机号">{{ selectedPackages[0]?.receiverPhone || selectedPackages[0]?.receiver_phone || '-' }}</el-descriptions-item>
                <el-descriptions-item label="取件码">
                  <span class="pickup-code">{{ selectedPackages[0]?.pickupCode || selectedPackages[0]?.pickup_code || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="目标格口">
                  <span class="grille-highlight">{{ selectedPackages[0]?.grille_id || '未分配' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="入柜时间">{{ selectedPackages[0]?.inbound_at || selectedPackages[0]?.created_at || '-' }}</el-descriptions-item>
              </el-descriptions>
              <div v-else-if="selectedPackages.length > 1" class="multi-select-info">
                <el-alert
                    :title="`已选中 ${selectedPackages.length} 个包裹`"
                    type="info"
                    :closable="false"
                    show-icon
                >
                  <template #default>
                    <div class="multi-select-list">
                      <div v-for="pkg in selectedPackages" :key="pkg.logisticsId" class="multi-select-item">
                        {{ pkg.itemName || pkg.item_name }} - {{ pkg.grille_id || '未分配' }}
                      </div>
                    </div>
                  </template>
                </el-alert>
              </div>
              <el-empty v-else description="暂无选中包裹" :image-size="80" />
            </div>
          </section>

          <!-- 待取包裹列表 -->
          <section class="result-side">
            <div class="side-head">
              <h3>📦 待取包裹</h3>
              <div class="side-head-right">
                <el-badge :value="getSelectablePackages().length" :hidden="!getSelectablePackages().length" type="primary">
                  <span class="package-count">待取: {{ getSelectablePackages().length }}</span>
                </el-badge>
                <span class="package-divider">|</span>
                <span class="package-count">已取: {{ getPickedPackages().length }}</span>
              </div>
            </div>

            <div v-if="packages.length" class="package-strip">
              <div
                  v-for="item in packages"
                  :key="item.logisticsId || item.logistics_id"
                  class="package-chip"
                  :class="{
                  active: selectedPackages.some(p => (p.logisticsId || p.logistics_id) === (item.logisticsId || item.logistics_id)),
                  picked: item.status === 'picked_up'
                }"
                  @click="togglePackageSelection(item)"
              >
                <div class="package-chip-header">
                  <el-checkbox
                      :model-value="selectedPackages.some(p => (p.logisticsId || p.logistics_id) === (item.logisticsId || item.logistics_id))"
                      :disabled="item.status === 'picked_up'"
                      @click.stop
                      @change="() => togglePackageSelection(item)"
                  />
                  <strong>{{ item.itemName || item.item_name || '未命名包裹' }}</strong>
                  <span class="status-badge" :class="getPackageStatusClass(item.status)">
                    {{ getPackageStatusText(item.status) }}
                  </span>
                </div>
                <div class="package-chip-info">
                  <template v-if="item.status !== 'picked_up'">
                    <span>格口: {{ item.grille_id || '未分配' }}</span>
                    <span>取件码: {{ item.pickupCode || item.pickup_code || '-' }}</span>
                  </template>
                  <template v-else>
                    <span class="picked-info">✓ 已取件</span>
                  </template>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无待取包裹" :image-size="100">
              <template #description>
                <span>暂无待取包裹<br>请先输入手机号或取件码验证</span>
              </template>
            </el-empty>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import PublicTopNav from '../../components/PublicTopNav.vue'
import { createUserProfile, fetchGrilles, fetchUserItems, packageOut, verifyPickup } from '../../api'
import { useAuthStore } from '../../stores/auth'

const phonePattern = /^1\d{10}$/

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 响应式数据
const verifying = ref(false)
const loadingPackages = ref(false)
const pickuping = ref(false)
const packages = ref([])
const grilles = ref([])
const selectedPackages = ref([])
const pickupResult = ref('')
const pickupSuccess = ref(false)
const searchMode = ref('pickupCode')
const queryKeyword = ref('')
const targetGrilleId = ref('')

// 分页相关
const pageSize = ref(24)
const currentPage = ref(1)

if (auth.userProfile?.phone) {
  searchMode.value = 'phone'
  queryKeyword.value = auth.userProfile.phone
}

// 计算属性
const sortedGrilles = computed(() => {
  return [...grilles.value].sort((left, right) => {
    if (left.matrix_row !== right.matrix_row) return left.matrix_row - right.matrix_row
    return left.matrix_column - right.matrix_column
  })
})

const totalPages = computed(() => Math.ceil(sortedGrilles.value.length / pageSize.value))

const currentPageGrilles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedGrilles.value.slice(start, end)
})

const isAllSelected = computed(() => {
  const selectable = getSelectablePackages()
  return selectable.length > 0 && selectedPackages.value.length === selectable.length
})

// 辅助函数
function getStatusClass(status) {
  const classMap = {
    idle: 'status-idle',
    occupied: 'status-occupied',
    disabled: 'status-disabled'
  }
  return classMap[status] || 'status-idle'
}

function getStatusText(status) {
  const textMap = {
    idle: '空闲',
    occupied: '占用',
    disabled: '停用'
  }
  return textMap[status] || '空闲'
}

function getPackageStatusClass(status) {
  const classMap = {
    created: 'status-created',
    stored: 'status-stored',
    picked_up: 'status-picked'
  }
  return classMap[status] || 'status-created'
}

function getPackageStatusText(status) {
  const textMap = {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已取件'
  }
  return textMap[status] || '处理中'
}

function getSelectablePackages() {
  return packages.value.filter(p => p.status !== 'picked_up')
}

function getPickedPackages() {
  return packages.value.filter(p => p.status === 'picked_up')
}

function buildPayload() {
  const keyword = queryKeyword.value.trim()
  if (!keyword) {
    ElMessage.warning(`请输入${searchMode.value === 'pickupCode' ? '取件码' : '手机号'}`)
    return null
  }

  const phone = searchMode.value === 'phone' ? keyword : ''
  const pickupCode = searchMode.value === 'pickupCode' ? keyword : ''

  if (phone && !phonePattern.test(phone)) {
    ElMessage.warning('请输入合法的 11 位手机号')
    return null
  }

  if (pickupCode && pickupCode.length !== 6) {
    ElMessage.warning('取件码应为 6 位')
    return null
  }

  return { phone, pickupCode }
}

// 数据加载函数
async function loadGrilleData() {
  try {
    const response = await fetchGrilles()
    grilles.value = response.data?.list || []
    console.log('格口数据加载完成:', grilles.value.length)
  } catch (error) {
    console.error('加载格口数据失败:', error)
    ElMessage.error(error?.response?.data?.msg || error?.message || '格口数据加载失败')
  }
}

function jumpToGrillePage(grilleId) {
  if (!grilleId) return
  const index = sortedGrilles.value.findIndex(g => g.grille_id === grilleId)
  if (index !== -1) {
    const targetPage = Math.floor(index / pageSize.value) + 1
    if (targetPage !== currentPage.value) {
      currentPage.value = targetPage
    }
  }
}

// 包裹选择相关函数
function togglePackageSelection(pkg) {
  const pkgId = pkg.logisticsId || pkg.logistics_id

  // 已取件的包裹不可选择
  if (pkg.status === 'picked_up') {
    ElMessage.warning('该包裹已完成取件，不可重复选择')
    return
  }

  const index = selectedPackages.value.findIndex(p => (p.logisticsId || p.logistics_id) === pkgId)
  if (index === -1) {
    selectedPackages.value.push(pkg)
    ElMessage.success(`已选中包裹: ${pkg.itemName || pkg.item_name}`)
    // 如果只选中一个，跳转到对应格口
    if (selectedPackages.value.length === 1 && pkg.grille_id) {
      targetGrilleId.value = pkg.grille_id
      jumpToGrillePage(pkg.grille_id)
    }
  } else {
    selectedPackages.value.splice(index, 1)
    ElMessage.info(`已取消选中包裹: ${pkg.itemName || pkg.item_name}`)
    // 如果没有选中包裹，清除高亮
    if (selectedPackages.value.length === 0) {
      targetGrilleId.value = ''
    } else if (selectedPackages.value.length === 1 && selectedPackages.value[0].grille_id) {
      targetGrilleId.value = selectedPackages.value[0].grille_id
      jumpToGrillePage(selectedPackages.value[0].grille_id)
    }
  }
}

// 全选/取消全选
function selectAllPackages() {
  const selectablePackages = getSelectablePackages()
  if (isAllSelected.value) {
    selectedPackages.value = []
    ElMessage.info('已取消全选')
  } else {
    selectedPackages.value = [...selectablePackages]
    ElMessage.success(`已选中 ${selectedPackages.value.length} 个包裹`)
    // 如果有选中的包裹，跳转到第一个的格口
    if (selectedPackages.value[0]?.grille_id) {
      targetGrilleId.value = selectedPackages.value[0].grille_id
      jumpToGrillePage(selectedPackages.value[0].grille_id)
    }
  }
}

// 批量取件
async function batchPickup() {
  if (!selectedPackages.value.length) {
    ElMessage.warning('请先选择要取出的包裹')
    return
  }

  const invalidPackages = selectedPackages.value.filter(p => !p.grille_id)
  if (invalidPackages.length) {
    ElMessage.warning(`${invalidPackages.map(p => p.itemName || p.item_name).join(', ')} 尚未分配格口，无法取件`)
    return
  }

  pickuping.value = true
  pickupResult.value = ''

  try {
    const logisticsIds = selectedPackages.value.map(p => p.logisticsId || p.logistics_id)
    await packageOut({ logistics_ids: logisticsIds })

    pickupResult.value = `✅ 成功取出 ${selectedPackages.value.length} 个包裹！`
    pickupSuccess.value = true

    // 刷新数据
    await loadGrilleData()
    await loadMyPackages({ silent: true, preserveMessage: true })

    // 清空选中
    selectedPackages.value = []
    targetGrilleId.value = ''

    ElMessage.success(`成功取出 ${logisticsIds.length} 个包裹！`)
  } catch (error) {
    console.error('取件失败:', error)
    pickupResult.value = `❌ 取件失败: ${error?.response?.data?.msg || error?.message || '请重试'}`
    pickupSuccess.value = false
    ElMessage.error(error?.response?.data?.msg || error?.message || '取件失败')
  } finally {
    pickuping.value = false
  }
}

async function loadMyPackages(options = {}) {
  const { silent = false, preserveMessage = false } = options
  const phone = auth.userProfile?.phone || queryKeyword.value.trim()

  if (!phone) {
    if (!silent) ElMessage.warning('请先输入手机号或完成一次取件校验')
    return false
  }

  if (!phonePattern.test(phone)) {
    if (!silent) ElMessage.warning('请输入合法的 11 位手机号')
    return false
  }

  loadingPackages.value = true
  try {
    const response = await fetchUserItems(phone)
    packages.value = response.data?.list || []

    console.log('包裹数据加载完成:', packages.value)

    if (packages.value.length) {
      // 默认选中第一个未取件的包裹
      const firstSelectable = packages.value.find(p => p.status !== 'picked_up')
      if (firstSelectable && selectedPackages.value.length === 0) {
        selectedPackages.value = [firstSelectable]
        if (firstSelectable.grille_id) {
          targetGrilleId.value = firstSelectable.grille_id
          jumpToGrillePage(targetGrilleId.value)
        }
      }
    } else {
      selectedPackages.value = []
      targetGrilleId.value = ''
    }

    if (!preserveMessage) {
      const selectableCount = getSelectablePackages().length
      pickupResult.value = selectableCount > 0
          ? `✅ 已加载 ${selectableCount} 个待取包裹，请选择包裹后点击"批量取件"`
          : '⚠️ 当前暂无待取包裹'
      pickupSuccess.value = selectableCount > 0
    }

    await loadGrilleData()
    return true
  } catch (error) {
    console.error('加载包裹失败:', error)
    if (!silent) {
      ElMessage.error(error?.response?.data?.msg || error?.message || '查询失败')
    }
    return false
  } finally {
    loadingPackages.value = false
  }
}

async function verifyByInput() {
  const payload = buildPayload()
  if (!payload) return

  verifying.value = true
  try {
    const created = await createUserProfile(payload)
    const profile = created.data.profile || null

    auth.setUserSession({
      token: created.data.token,
      profile
    })

    if (profile?.phone) {
      searchMode.value = 'phone'
      queryKeyword.value = profile.phone
    }

    let list = []
    if (profile?.phone) {
      const response = await fetchUserItems(profile.phone)
      list = response.data?.list || []
    } else {
      const response = await verifyPickup(payload)
      list = response.data?.list || []
    }

    packages.value = list

    let targetPkg = null
    if (payload.pickupCode) {
      targetPkg = packages.value.find((item) => (item.pickupCode || item.pickup_code) === payload.pickupCode)
    }

    if (targetPkg && targetPkg.status !== 'picked_up') {
      selectedPackages.value = [targetPkg]
      if (targetPkg.grille_id) {
        targetGrilleId.value = targetPkg.grille_id
        jumpToGrillePage(targetGrilleId.value)
      }
    } else if (packages.value.length) {
      const firstSelectable = packages.value.find(p => p.status !== 'picked_up')
      if (firstSelectable) {
        selectedPackages.value = [firstSelectable]
        if (firstSelectable.grille_id) {
          targetGrilleId.value = firstSelectable.grille_id
          jumpToGrillePage(targetGrilleId.value)
        }
      } else {
        selectedPackages.value = []
      }
    } else {
      selectedPackages.value = []
      targetGrilleId.value = ''
    }

    const shouldAutoPickup = Boolean(payload.pickupCode && targetPkg && targetPkg.status !== 'picked_up')
    const selectableCount = getSelectablePackages().length

    if (selectableCount > 0) {
      pickupResult.value = shouldAutoPickup
          ? `✅ 身份校验成功，找到 ${selectableCount} 个包裹，正在自动开启取件...`
          : `✅ 身份校验成功，已同步 ${selectableCount} 个待取包裹`
      pickupSuccess.value = true
    } else {
      pickupResult.value = packages.value.length > 0 ? '⚠️ 所有包裹均已取件' : '⚠️ 身份校验成功，但当前暂无待取包裹'
      pickupSuccess.value = false
    }

    await loadGrilleData()

    if (route.query.redirect) {
      router.push(String(route.query.redirect))
      return
    }

    if (shouldAutoPickup) {
      ElMessage.success('身份校验成功，已自动开始取件')
      await batchPickup()
      return
    }

    ElMessage.success('包裹校验成功')
  } catch (error) {
    console.error('校验失败:', error)
    pickupResult.value = `❌ 校验失败: ${error?.response?.data?.msg || error?.message || '请重试'}`
    pickupSuccess.value = false
    ElMessage.error(error?.response?.data?.msg || error?.message || '校验失败')
  } finally {
    verifying.value = false
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function handlePageChange(page) {
  currentPage.value = page
}

// 初始化
onMounted(async () => {
  try {
    await loadGrilleData()

    if (auth.userProfile?.phone) {
      searchMode.value = 'phone'
      queryKeyword.value = auth.userProfile.phone
      await loadMyPackages({ silent: true })
    }
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error(error?.response?.data?.msg || error?.message || '数据加载失败')
  }
})
</script>

<style scoped>
.public-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.pickup-wrap {
  padding: 24px 0 36px;
}

.pickup-card {
  padding: 24px;
}

.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.card-heading h2 {
  margin: 0;
  font-size: 22px;
}

.card-heading p {
  margin: 10px 0 0;
  color: var(--text-muted);
}

.heading-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.notice-card {
  margin-top: 18px;
}

.query-toolbar {
  margin-top: 18px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 12px;
}

.toolbar-tip {
  margin: 12px 0 18px;
  color: var(--text-muted);
  font-size: 13px;
}

.cabinet-visual {
  background: #f8fafc;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid var(--line-color);
  margin-bottom: 20px;
}

.pagination-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-color);
}

.page-info {
  font-size: 14px;
  color: var(--text-muted);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  min-height: 320px;
}

.status-cell {
  border: 2px solid var(--line-color);
  border-radius: 10px;
  padding: 12px 6px;
  background: #fff;
  transition: all 0.18s ease;
  text-align: center;
  position: relative;
}

.status-cell strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.status-cell span {
  display: block;
  font-size: 11px;
}

.status-cell .position {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

.status-cell.active {
  border-color: #f59e0b;
  background: #fffbeb;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
  animation: pulse 0.5s ease-in-out;
}

.package-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
    background-color: #fef3c7;
  }
}

.status-idle {
  background: #dcfce7;
  border-color: #86efac;
}
.status-idle strong {
  color: #15803d;
}

.status-occupied {
  background: #dbeafe;
  border-color: #93c5fd;
}
.status-occupied strong {
  color: #1e40af;
}

.status-disabled {
  background: #fee2e2;
  border-color: #fecaca;
}
.status-disabled strong {
  color: #b91c1c;
}

.pagination-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line-color);
  display: flex;
  justify-content: center;
}

.result-panel {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.result-main,
.result-side {
  border: 1px solid var(--line-color);
  border-radius: 10px;
  padding: 18px;
  background: #f9fafb;
}

.result-main h3,
.result-side h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.result-content {
  min-height: 300px;
}

.result-message {
  margin: 0 0 16px 0;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.result-message.success {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.result-message.error {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.result-message.info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.package-detail {
  margin-top: 12px;
}

.pickup-code {
  font-family: monospace;
  font-size: 16px;
  font-weight: bold;
  color: #f59e0b;
}

.grille-highlight {
  font-weight: bold;
  color: #2563eb;
}

.multi-select-info {
  margin-top: 12px;
}

.multi-select-list {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.multi-select-item {
  padding: 4px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--line-color);
}

.multi-select-item:last-child {
  border-bottom: none;
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.side-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.package-divider {
  color: var(--line-color);
}

.package-count {
  font-size: 14px;
  color: var(--text-muted);
}

.package-strip {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.package-chip {
  border: 2px solid var(--line-color);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.package-chip:hover:not(.picked) {
  transform: translateX(4px);
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.package-chip.picked {
  background: #f1f5f9;
  opacity: 0.7;
  cursor: not-allowed;
}

.package-chip.picked .package-chip-header strong {
  text-decoration: line-through;
  color: #94a3b8;
}

.package-chip.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.package-chip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.package-chip-header strong {
  flex: 1;
  font-size: 14px;
  color: #1e293b;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.status-badge.status-created {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.status-stored {
  background: #dbeafe;
  color: #2563eb;
}

.status-badge.status-picked {
  background: #dcfce7;
  color: #059669;
}

.package-chip-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 28px;
}

.picked-info {
  color: #059669;
  font-style: italic;
}

@media (max-width: 980px) {
  .card-heading,
  .query-toolbar,
  .result-panel {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .heading-actions {
    width: 100%;
  }

  .status-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-panel {
    grid-template-columns: 1fr;
  }
}
</style>