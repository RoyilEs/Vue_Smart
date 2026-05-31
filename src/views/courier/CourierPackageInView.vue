<template>
  <div class="courier-page">
    <div class="page-title">
      <div>
        <h1>快递员 - 包裹入柜</h1>
        <p>先选择空闲格口，再生成取件码并完成入柜。</p>
      </div>
      <el-button plain @click="fillDemo">填充演示数据</el-button>
    </div>

    <div class="glass-card courier-card" v-loading="dashboardLoading">
      <div class="top-grid">
        <section class="entry-panel">
          <div class="panel-heading">
            <h3>入柜表单</h3>
            <p>填写手机号并手动选择一个空闲格口。</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="收件人手机号" prop="receiverPhone">
              <el-input v-model="form.receiverPhone" placeholder="输入收件人手机号" />
            </el-form-item>

            <el-form-item label="物品名称" prop="itemName">
              <el-input v-model="form.itemName" placeholder="输入包裹名称" />
            </el-form-item>

            <el-form-item label="选择格口" prop="preferredGrilleId">
              <el-select v-model="form.preferredGrilleId" placeholder="请选择空闲格口" @change="handleSelectChange">
                <el-option
                    v-for="item in idleGrilles"
                    :key="item.grille_id"
                    :label="`${item.grille_id}（${item.matrix_row}行${item.matrix_column}列）`"
                    :value="item.grille_id"
                />
              </el-select>
            </el-form-item>

            <p class="selected-tip">{{ selectedTip }}</p>

            <el-button type="success" :loading="submitting" class="submit-btn" @click="submitInbound">
              生成取件码并入柜
            </el-button>
          </el-form>

          <div class="result-box">
            <template v-if="result">
              <strong>入柜成功</strong>
              <span>收件人：{{ result.receiverPhone }}</span>
              <span>格口编号：{{ result.grille_id }}</span>
              <span>取件码：{{ result.pickupCode }}</span>
              <span>包裹ID：{{ result.logisticsId }}</span>
            </template>
            <template v-else>
              <strong>等待入柜</strong>
              <span>当前尚未生成取件码。</span>
            </template>
          </div>
        </section>

        <section class="cabinet-panel">
          <div class="panel-heading">
            <h3>快递柜格口状态</h3>
            <p>点击格口卡片选择空闲格口，支持翻页浏览。</p>
          </div>

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
                  { active: activeGrilleId === item.grille_id }
                ]"
                  @click.stop="handleGrilleClick(item.grille_id)"
              >
                <strong>{{ item.grille_id }}</strong>
                <span>{{ getStatusText(item.status) }}</span>
                <small class="position">{{ item.matrix_row }}-{{ item.matrix_column }}</small>
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
        </section>
      </div>

      <section class="table-panel">
        <div class="panel-heading">
          <h3>已录入包裹列表</h3>
        </div>

        <el-table :data="packages" border stripe>
          <el-table-column type="index" label="序号" width="70" />
          <el-table-column prop="logisticsId" label="包裹ID" min-width="180" />
          <el-table-column prop="pickup_code" label="取件码" width="110" />
          <el-table-column prop="receiverPhone" label="收件人手机号" width="140" />
          <el-table-column prop="grille_id" label="格口编号" width="120" />
          <el-table-column prop="inbound_at" label="入柜时间" min-width="180" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="status-tag" :class="getStatusClass(row.status)">
                {{ getPackageStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { assignGrilles, createItem, fetchGrilles, fetchPackages } from '../../api'

const phonePattern = /^1\d{10}$/

const formRef = ref(null)
const dashboardLoading = ref(false)
const submitting = ref(false)
const result = ref(null)
const grilles = ref([])
const packages = ref([])
const activeGrilleId = ref('')
const pageSize = ref(24)
const currentPage = ref(1)

const form = reactive({
  receiverPhone: '',
  receiverName: '',
  receiverEmail: 'user@example.com',
  receiverCity: '上海市',
  receiverArea: '浦东新区',
  receiverAddress: '智能柜站点',
  senderName: '直营网点',
  senderPhone: '17700000001',
  senderEmail: 'courier@example.com',
  senderCity: '上海市',
  senderArea: '浦东新区',
  senderAddress: '1号分拣中心',
  itemName: '',
  itemNum: 1,
  itemWeight: 1,
  packageNums: 1,
  remark: '快递员入柜',
  preferredGrilleId: ''
})

const rules = {
  receiverPhone: [
    { required: true, message: '请输入收件人手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  itemName: [{ required: true, message: '请输入包裹名称', trigger: 'blur' }],
  preferredGrilleId: [{ required: true, message: '请选择空闲格口', trigger: 'change' }]
}

// 排序后的格口（使用下划线字段）
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

const idleGrilles = computed(() => {
  return sortedGrilles.value.filter((item) => item.status === 'idle')
})

const selectedTip = computed(() => {
  if (!form.preferredGrilleId) return '请从右侧网格中选择一个空闲格口。'
  const current = grilles.value.find((item) => item.grille_id === form.preferredGrilleId)
  if (!current) return '当前选中的格口不可用。'
  const statusText = current.status === 'idle' ? '空闲' : current.status === 'occupied' ? '占用中' : '已停用'
  return `当前选中：${current.grille_id}（${current.matrix_row}行${current.matrix_column}列）- ${statusText}`
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

// 包裹状态文字
function getPackageStatusText(status) {
  const textMap = {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已取件'
  }
  return textMap[status] || '处理中'
}

// 格口点击处理
function handleGrilleClick(grilleId) {
  const target = grilles.value.find((item) => item.grille_id === grilleId)
  if (!target) {
    console.warn('格口不存在:', grilleId)
    return
  }

  activeGrilleId.value = grilleId

  if (target.status === 'idle') {
    form.preferredGrilleId = grilleId
    ElMessage.success(`已选中格口 ${target.grille_id}，可进行入柜操作`)
  } else {
    const message = target.status === 'occupied' ? '该格口已被占用' : '该格口已停用，不可使用'
    ElMessage.warning(message)
  }
}

// 下拉选择变化
function handleSelectChange(grilleId) {
  if (!grilleId) return

  const target = grilles.value.find((item) => item.grille_id === grilleId)
  if (target && target.status === 'idle') {
    activeGrilleId.value = grilleId
    jumpToGrillePage(grilleId)
  }
}

// 跳转到格口所在页面
function jumpToGrillePage(grilleId) {
  const index = sortedGrilles.value.findIndex(g => g.grille_id === grilleId)
  if (index !== -1) {
    const targetPage = Math.floor(index / pageSize.value) + 1
    if (targetPage !== currentPage.value) {
      currentPage.value = targetPage
    }
  }
}

// 同步选中状态
function syncPreferredGrille() {
  if (form.preferredGrilleId) {
    const existing = grilles.value.find(g => g.grille_id === form.preferredGrilleId)
    if (existing && existing.status === 'idle') {
      activeGrilleId.value = form.preferredGrilleId
      jumpToGrillePage(form.preferredGrilleId)
      return
    }
  }

  if (idleGrilles.value.length) {
    const firstIdle = idleGrilles.value[0].grille_id
    form.preferredGrilleId = firstIdle
    activeGrilleId.value = firstIdle
    jumpToGrillePage(firstIdle)
  } else {
    form.preferredGrilleId = ''
    activeGrilleId.value = ''
    ElMessage.warning('当前没有可用的空闲格口')
  }
}

async function loadDashboard() {
  dashboardLoading.value = true
  try {
    const [grilleResponse, packageResponse] = await Promise.all([
      fetchGrilles(),
      fetchPackages()
    ])
    // 直接使用后端返回的数据，不做字段转换
    grilles.value = grilleResponse.data.list || []
    packages.value = packageResponse.data.list || []
    syncPreferredGrille()
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '数据加载失败')
  } finally {
    dashboardLoading.value = false
  }
}

function applyInboundResult(item) {
  packages.value = [item, ...packages.value.filter((current) => current.logisticsId !== item.logisticsId)]

  const target = grilles.value.find((grille) => grille.grille_id === item.grille_id)
  if (target) {
    target.status = 'occupied'
    target.logisticsId = item.logisticsId
  }
}

function fillDemo() {
  form.receiverPhone = '13688889999'
  form.itemName = '待配送包裹'
  form.receiverName = '陈一'
  form.receiverEmail = "qq3392313023@163.com"
  if (idleGrilles.value.length) {
    const firstIdle = idleGrilles.value[0].grille_id
    form.preferredGrilleId = firstIdle
    activeGrilleId.value = firstIdle
    jumpToGrillePage(firstIdle)
  }
}

async function submitInbound() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const selectedGrille = grilles.value.find(g => g.grille_id === form.preferredGrilleId)
  if (!selectedGrille || selectedGrille.status !== 'idle') {
    ElMessage.error('请选择一个空闲格口')
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form,
      receiverName: form.receiverName || `用户${form.receiverPhone.slice(-4)}`
    }
    const created = await createItem(payload)
    const assigned = await assignGrilles({
      logistics_ids: [created.data.logisticsId],
      preferred_grille_id: form.preferredGrilleId
    })
    result.value = assigned.data.list[0]
    applyInboundResult(result.value)

    // 重新加载数据以获取最新状态
    await loadDashboard()

    ElMessage.success('包裹已完成入柜')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '入柜失败')
  } finally {
    submitting.value = false
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

// 监听数据变化
watch(grilles, () => {
  syncPreferredGrille()
}, { deep: true })

onMounted(loadDashboard)
</script>

<style scoped>
.courier-page {
  padding: 24px 0 36px;
}

.courier-card {
  padding: 24px;
}

.top-grid {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.panel-heading {
  margin-bottom: 16px;
}

.panel-heading h3 {
  margin: 0;
  font-size: 18px;
}

.panel-heading p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.selected-tip {
  margin: 0 0 14px;
  color: var(--text-muted);
  font-size: 13px;
}

.submit-btn {
  width: 100%;
}

.result-box {
  margin-top: 18px;
  border: 1px solid var(--line-color);
  border-radius: 10px;
  background: #f9fafb;
  padding: 16px;
  display: grid;
  gap: 8px;
}

.result-box strong,
.result-box span {
  display: block;
}

.result-box span {
  color: var(--text-muted);
  font-size: 14px;
}

.cabinet-visual {
  background: #f8fafc;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid var(--line-color);
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
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: center;
}

.status-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
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

.table-panel {
  border-top: 1px solid var(--line-color);
  padding-top: 20px;
}

@media (max-width: 1080px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .status-cell {
    padding: 8px 4px;
  }

  .status-cell strong {
    font-size: 11px;
  }

  .status-cell span {
    font-size: 10px;
  }
}
</style>