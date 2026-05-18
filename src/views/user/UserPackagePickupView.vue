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
            <el-button type="primary" :disabled="!selectedPackage || pickuping" @click="startPickup">
              {{ pickuping ? '取件中...' : '开始取件' }}
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

        <div class="result-panel">
          <section class="result-main">
            <h3>取件结果</h3>
            <p class="result-message">{{ resultMessage }}</p>

            <el-descriptions v-if="selectedPackage" :column="1" border>
              <el-descriptions-item label="包裹名称">{{ selectedPackage.itemName }}</el-descriptions-item>
              <el-descriptions-item label="物流单号">{{ selectedPackage.logisticsId }}</el-descriptions-item>
              <el-descriptions-item label="收件手机号">{{ selectedPackage.receiverPhone }}</el-descriptions-item>
              <el-descriptions-item label="目标格口">{{ selectedPackage.grille_id || '未分配' }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="result-side">
            <div class="side-head">
              <h3>待取包裹</h3>
              <span>{{ packages.length }} 件</span>
            </div>

            <div v-if="packages.length" class="package-strip">
              <button
                  v-for="item in packages"
                  :key="item.logisticsId"
                  type="button"
                  class="package-chip"
                  :class="{ active: selectedPackage?.logisticsId === item.logisticsId }"
                  @click="selectPackage(item)"
              >
                <strong>{{ item.itemName }}</strong>
                <span>{{ item.grille_id || '未分配' }} / {{ item.pickupCode }}</span>
              </button>
            </div>
            <el-empty v-else description="暂无待取包裹" :image-size="70" />
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

const verifying = ref(false)
const loadingPackages = ref(false)
const pickuping = ref(false)
const packages = ref([])
const grilles = ref([])
const selectedPackage = ref(null)
const pickupResult = ref('')
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

// 排序后的格口
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

const resultMessage = computed(() => {
  if (pickupResult.value) return pickupResult.value
  if (selectedPackage.value) {
    return searchMode.value === 'pickupCode'
        ? '已锁定目标格口，校验成功后会自动执行取件动画。'
        : '已锁定目标格口，点击"开始取件"执行取件。'
  }
  return '请先输入手机号或取件码完成校验。'
})

// 状态样式类
function getStatusClass(status) {
  const classMap = {
    idle: 'status-idle',
    occupied: 'status-occupied',
    disabled: 'status-disabled'
  }
  return classMap[status] || 'status-idle'
}

// 状态显示文字
function getStatusText(status) {
  const textMap = {
    idle: '空闲',
    occupied: '占用',
    disabled: '停用'
  }
  return textMap[status] || '空闲'
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

async function loadGrilleData() {
  const response = await fetchGrilles()
  grilles.value = response.data.list || []
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

function selectPackage(pkg) {
  selectedPackage.value = pkg
  targetGrilleId.value = pkg.grille_id || ''
  if (targetGrilleId.value) {
    jumpToGrillePage(targetGrilleId.value)
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
      list = response.data.list || []
    } else {
      const response = await verifyPickup(payload)
      list = response.data.list || []
    }

    packages.value = list

    let targetPkg = null
    if (payload.pickupCode) {
      targetPkg = packages.value.find((item) => item.pickupCode === payload.pickupCode)
    }

    if (!targetPkg && packages.value.length) {
      targetPkg = packages.value[0]
    }

    selectedPackage.value = targetPkg || null
    if (selectedPackage.value) {
      targetGrilleId.value = selectedPackage.value.grille_id || ''
      jumpToGrillePage(targetGrilleId.value)
    }

    const shouldAutoPickup = Boolean(payload.pickupCode && selectedPackage.value)
    pickupResult.value = packages.value.length
        ? shouldAutoPickup
            ? '身份校验成功，正在为当前取件码自动开启取件流程'
            : '身份校验成功，已同步当前用户全部待取包裹'
        : '当前暂无待取包裹'

    await loadGrilleData()

    if (route.query.redirect) {
      router.push(String(route.query.redirect))
      return
    }

    if (shouldAutoPickup) {
      ElMessage.success('身份校验成功，已自动开始取件')
      await autoStartPickup()
      return
    }

    ElMessage.success('包裹校验成功')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '校验失败')
  } finally {
    verifying.value = false
  }
}

async function loadMyPackages(options = {}) {
  const { silent = false, preserveMessage = false } = options
  const currentKeyword = queryKeyword.value.trim()
  const phone = (auth.userProfile?.phone || (searchMode.value === 'phone' ? currentKeyword : '') || '').trim()

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
    packages.value = response.data.list || []
    selectedPackage.value = packages.value[0] || null
    if (selectedPackage.value) {
      targetGrilleId.value = selectedPackage.value.grille_id || ''
      jumpToGrillePage(targetGrilleId.value)
    }
    if (!preserveMessage) {
      pickupResult.value = packages.value.length ? '已加载当前用户待取包裹' : '当前暂无待取包裹'
    }
    await loadGrilleData()
    return true
  } catch (error) {
    if (!silent) {
      ElMessage.error(error?.response?.data?.msg || error?.message || '查询失败')
    }
    return false
  } finally {
    loadingPackages.value = false
  }
}

function startPickup() {
  if (!selectedPackage.value) {
    ElMessage.warning('请先选择要取出的包裹')
    return
  }

  if (!selectedPackage.value.grille_id) {
    ElMessage.warning('该包裹尚未分配格口')
    return
  }

  pickuping.value = true
  pickupResult.value = ''
  // 触发取件动画效果
  flashTargetGrille()
}

function flashTargetGrille() {
  targetGrilleId.value = selectedPackage.value.grille_id
  jumpToGrillePage(targetGrilleId.value)

  // 高亮闪烁效果
  setTimeout(() => {
    completePickup()
  }, 1500)
}

async function autoStartPickup() {
  if (!selectedPackage.value || pickuping.value) return
  await nextTick()
  startPickup()
}

async function completePickup() {
  if (!selectedPackage.value) return

  try {
    const packageName = selectedPackage.value.itemName
    const grilleId = selectedPackage.value.grille_id
    await packageOut({ logistics_ids: [selectedPackage.value.logisticsId] })
    pickupResult.value = `${packageName} 已从 ${grilleId} 成功取出`

    // 刷新格口状态
    await loadGrilleData()
    // 刷新包裹列表
    await loadMyPackages({ silent: true, preserveMessage: true })

    // 清空高亮
    targetGrilleId.value = ''
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '出库失败')
  } finally {
    pickuping.value = false
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

// 监听选中包裹变化，自动跳转到对应格口所在页
watch(selectedPackage, (newPkg) => {
  if (newPkg?.grille_id) {
    targetGrilleId.value = newPkg.grille_id
    jumpToGrillePage(newPkg.grille_id)
  }
})

onMounted(async () => {
  try {
    await loadGrilleData()
    if (auth.userProfile?.phone) {
      searchMode.value = 'phone'
      queryKeyword.value = auth.userProfile.phone
      await loadMyPackages({ silent: true })
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '格口数据加载失败')
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

/* 柜体可视化区域 */
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
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
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
  margin: 0;
  font-size: 18px;
}

.result-message {
  margin: 12px 0 16px;
  color: var(--text-muted);
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.side-head span {
  color: var(--text-muted);
  font-size: 13px;
}

.package-strip {
  display: grid;
  gap: 12px;
}

.package-chip {
  border: 1px solid var(--line-color);
  border-radius: 10px;
  background: #fff;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.package-chip strong,
.package-chip span {
  display: block;
}

.package-chip span {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.package-chip.active {
  border-color: #2563eb;
  box-shadow: inset 0 0 0 1px #2563eb;
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
    flex-direction: column;
  }

  .status-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>