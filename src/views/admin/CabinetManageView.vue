<template>
  <div class="page-shell">
    <div class="page-title">
      <div>
        <h1>快递柜格口管理</h1>
        <p>查看格口矩阵状态、新增格口，并对格口进行批量管理。</p>
      </div>
      <el-button plain @click="loadGrilles">刷新数据</el-button>
    </div>

    <div class="metric-grid" style="margin-bottom: 20px">
      <div class="metric-card">
        <div class="label">格口总数</div>
        <div class="value">{{ grilles.length }}</div>
      </div>
      <div class="metric-card">
        <div class="label">空闲</div>
        <div class="value">{{ grilles.filter((item) => item.status === 'idle').length }}</div>
      </div>
      <div class="metric-card">
        <div class="label">占用</div>
        <div class="value">{{ grilles.filter((item) => item.status === 'occupied').length }}</div>
      </div>
      <div class="metric-card">
        <div class="label">停用</div>
        <div class="value">{{ grilles.filter((item) => item.status === 'disabled').length }}</div>
      </div>
    </div>

    <div class="two-column">
      <!-- 左侧操作面板 -->
      <section class="glass-card content-panel" v-loading="loading">
        <div class="panel-title">
          <div>
            <h3>格口配置</h3>
            <p>新增格口或批量调整格口状态。</p>
          </div>
        </div>

        <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
          <el-form-item label="每层矩阵列数" prop="matrix">
            <el-input-number v-model="createForm.matrix" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="新增数量" prop="count">
            <el-input-number v-model="createForm.count" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="格口尺寸" prop="size">
            <el-select v-model="createForm.size" style="width: 100%">
              <el-option label="小格口" value="small" />
              <el-option label="中格口" value="medium" />
              <el-option label="大格口" value="large" />
            </el-select>
          </el-form-item>
          <el-button type="primary" @click="handleCreate">新增格口</el-button>
        </el-form>

        <el-divider />

        <el-form label-position="top">
          <el-form-item label="批量格口">
            <el-select v-model="batchForm.ids" multiple filterable placeholder="选择格口" style="width: 100%">
              <el-option v-for="item in grilles" :key="item.id" :label="item.id" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标状态">
            <el-segmented v-model="batchForm.status" :options="batchOptions" />
          </el-form-item>
          <el-button plain @click="handleBatch">应用批量操作</el-button>
        </el-form>

        <el-divider />

        <div v-if="selectedGrille">
          <h3>当前选中</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="格口">{{ selectedGrille.id }}</el-descriptions-item>
            <el-descriptions-item label="尺寸">{{ selectedGrille.sizeType || selectedGrille.size }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedGrille.status }}</el-descriptions-item>
            <el-descriptions-item label="位置" v-if="selectedGrille.matrixRow && selectedGrille.matrixColumn">
              {{ selectedGrille.matrixRow }} 行, {{ selectedGrille.matrixColumn }} 列
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <!-- 右侧平面网格展示 -->
      <section class="glass-card content-panel right-panel" v-loading="loading">
        <div class="panel-title">
          <div>
            <h3>格口矩阵平面图</h3>
            <p>点击任意格子查看详情，通过标签页切换不同主柜。</p>
          </div>
        </div>

        <!-- 标签页选择主柜 - 添加滚动支持 -->
        <div class="tabs-wrapper">
          <el-tabs v-model="activeCabinet" type="card" @tab-click="handleCabinetChange">
            <el-tab-pane v-for="cabinet in cabinetList" :key="cabinet.letter" :name="cabinet.letter">
              <template #label>
                <div class="cabinet-tab-label">
                  <span class="cabinet-badge" :style="{ backgroundColor: cabinet.color }"></span>
                  <span>{{ cabinet.letter }}区</span>
                  <span class="cabinet-count">({{ cabinet.grilles.length }})</span>
                </div>
              </template>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 当前选中的柜体格口展示（响应式网格） -->
        <div v-if="currentCabinet" class="current-cabinet-content">
          <div class="cabinet-stats">
            <el-tag type="success" size="large">空闲: {{ getStatusCount(currentCabinet.grilles, 'idle') }}</el-tag>
            <el-tag type="primary" size="large">占用: {{ getStatusCount(currentCabinet.grilles, 'occupied') }}</el-tag>
            <el-tag type="danger" size="large">停用: {{ getStatusCount(currentCabinet.grilles, 'disabled') }}</el-tag>
          </div>

          <!-- 响应式格口网格 -->
          <div class="grille-grid">
            <div
                v-for="grille in currentCabinet.grilles"
                :key="grille.id"
                class="grille-card"
                :class="{
                'card-idle': grille.status === 'idle',
                'card-occupied': grille.status === 'occupied',
                'card-disabled': grille.status === 'disabled',
                'card-selected': selectedId === grille.id
              }"
                @click="selectedId = grille.id"
            >
              <div class="grille-header">
                <span class="grille-id">{{ grille.displayId }}</span>
                <span class="grille-size-badge" :class="getSizeClass(grille)">
                  {{ getSizeLabel(grille) }}
                </span>
              </div>
              <div class="grille-body">
                <div class="grille-status-icon">
                  <span v-if="grille.status === 'idle'"></span>
                  <span v-else-if="grille.status === 'occupied'">  </span>
                  <span v-else>  </span>
                </div>
                <div class="grille-status-text">{{ getStatusText(grille.status) }}</div>
              </div>
              <div class="grille-footer" v-if="grille.matrixRow && grille.matrixColumn">
                {{ grille.matrixRow }}行{{ grille.matrixColumn }}列
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else description="暂无格口数据，请先新增" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { batchUpdateGrilles, createGrilles, fetchGrilles } from '../../api'

const loading = ref(false)
const grilles = ref([])
const selectedId = ref('')
const activeCabinet = ref('')
const createFormRef = ref(null)

const createForm = reactive({
  matrix: 6,
  count: 6,
  size: 'medium'
})

const createRules = {
  matrix: [{ required: true, message: '请输入矩阵列数', trigger: 'change' }],
  count: [{ required: true, message: '请输入新增数量', trigger: 'change' }],
  size: [{ required: true, message: '请选择格口尺寸', trigger: 'change' }]
}

const batchForm = reactive({
  ids: [],
  status: 'disabled'
})

const batchOptions = [
  { label: '停用', value: 'disabled' },
  { label: '启用为空闲', value: 'idle' }
]

// 辅助函数：获取柜子首字母
const getCabinetLetter = (grille) => {
  const cabinetId = grille.cabinet_id || grille.cabinet_id || grille.cabinetId || ''
  const match = cabinetId.match(/^([A-Z])/)
  return match ? match[1] : '默认'
}

// 预定义柜子颜色
const cabinetColorMap = {
  'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#8b5cf6',
  'E': '#ec489a', 'F': '#06b6d4', 'G': '#f97316', 'H': '#a855f7',
  'I': '#14b8a6', '默认': '#9ca3af'
}

// 柜体列表
const cabinetList = computed(() => {
  if (!grilles.value.length) return []

  const groups = new Map()
  for (const g of grilles.value) {
    const letter = getCabinetLetter(g)
    if (!groups.has(letter)) groups.set(letter, [])

    const enriched = {
      ...g,
      cabinetLetter: letter,
      displayId: g.id || g.grille_id || `${g.matrixRow || g.matrix_row || 1}-${g.matrixColumn || g.matrix_column || 1}`,
      sizeType: g.sizeType || g.size,
      status: g.status,
      logisticsId: g.logisticsId,
      matrixRow: g.matrixRow || g.matrix_row,
      matrixColumn: g.matrixColumn || g.matrix_column
    }
    groups.get(letter).push(enriched)
  }

  const result = []
  for (const [letter, grilleList] of groups.entries()) {
    result.push({
      letter,
      color: cabinetColorMap[letter] || cabinetColorMap['默认'],
      grilles: grilleList.sort((a, b) => {
        const rowA = a.matrixRow || 0
        const rowB = b.matrixRow || 0
        if (rowA !== rowB) return rowA - rowB
        const colA = a.matrixColumn || 0
        const colB = b.matrixColumn || 0
        return colA - colB
      })
    })
  }

  result.sort((a, b) => a.letter.localeCompare(b.letter))

  if (result.length > 0 && !activeCabinet.value) {
    activeCabinet.value = result[0].letter
  }

  return result
})

const currentCabinet = computed(() => {
  return cabinetList.value.find(c => c.letter === activeCabinet.value)
})

const selectedGrille = computed(() => {
  return grilles.value.find((item) => (item.id || item.grille_id) === selectedId.value)
})

const getStatusCount = (grilleList, status) => {
  return grilleList.filter(g => g.status === status).length
}

const getStatusText = (status) => {
  const map = { 'idle': '空闲', 'occupied': '占用中', 'disabled': '已停用' }
  return map[status] || status
}

const getSizeClass = (grille) => {
  const size = grille.size_type || grille.size
  const classMap = { 'small': 'size-small', 'medium': 'size-medium', 'large': 'size-large' }
  return classMap[size] || 'size-medium'
}

const getSizeLabel = (grille) => {
  const size = grille.size_type || grille.size
  const labelMap = { 'small': '小', 'medium': '中', 'large': '大' }
  return labelMap[size] || '中'
}

const handleCabinetChange = () => {
  selectedId.value = ''
}

async function loadGrilles() {
  loading.value = true
  try {
    const response = await fetchGrilles()
    console.log(response)
    const list = response.data.list || []
    grilles.value = list.map(item => ({
      ...item,
      id: item.id || item.grille_id,
      sizeType: item.size_type || item.size,
      matrixRow: item.matrixRow || item.matrix_row,
      matrixColumn: item.matrixColumn || item.matrix_column,
      logisticsId: item.logisticsId,
      cabinetId: item.cabinetId || item.cabinet_id
    }))

    if (cabinetList.value.length > 0 && !cabinetList.value.find(c => c.letter === activeCabinet.value)) {
      activeCabinet.value = cabinetList.value[0]?.letter || ''
    }

    if (!grilles.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = ''
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '格口数据加载失败')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await createGrilles(createForm)
    ElMessage.success('格口已新增')
    loadGrilles()
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '新增失败')
  }
}

async function handleBatch() {
  if (!batchForm.ids.length) {
    ElMessage.warning('请先选择要批量处理的格口')
    return
  }

  try {
    await batchUpdateGrilles(batchForm)
    ElMessage.success('批量操作完成')
    loadGrilles()
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '批量操作失败')
  }
}

onMounted(loadGrilles)
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page-shell {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  overflow-x: hidden;
}

.two-column {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
}

/* 右侧面板限制宽度 */
.right-panel {
  min-width: 0;
  overflow-x: hidden;
}

.page-title, .panel-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title h1, .panel-title h3 {
  margin: 0 0 4px 0;
}

.page-title p, .panel-title p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.metric-card .label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
}

.metric-card .value {
  font-size: 32px;
  font-weight: bold;
  color: #0f172a;
}

/* 标签页容器 - 支持滚动 */
.tabs-wrapper {
  margin-bottom: 20px;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-wrapper :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.tabs-wrapper :deep(.el-tabs__nav-wrap) {
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-wrapper :deep(.el-tabs__nav-scroll) {
  overflow-x: auto;
}

.cabinet-tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.cabinet-badge {
  width: 8px;
  height: 20px;
  border-radius: 4px;
}

.cabinet-count {
  font-size: 12px;
  color: #94a3b8;
}

.current-cabinet-content {
  padding: 8px 0 0 0;
}

.cabinet-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

/* 响应式格口网格 - 使用 CSS Grid 自适应宽度 */
.grille-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 4px 2px 4px 0;
}

/* 格口卡片 */
.grille-card {
  background: #f8fafc;
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-width: 0;
}

.grille-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.card-idle {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
}

.card-idle:hover {
  border-color: #22c55e;
}

.card-occupied {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #93c5fd;
}

.card-occupied:hover {
  border-color: #3b82f6;
}

.card-disabled {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-color: #fca5a5;
}

.card-disabled:hover {
  border-color: #ef4444;
}

.card-selected {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.grille-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.grille-id {
  font-weight: bold;
  font-size: 13px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grille-size-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 20px;
  font-weight: 500;
}

.size-small {
  background: #e0f2fe;
  color: #0369a1;
}

.size-medium {
  background: #f1f5f9;
  color: #475569;
}

.size-large {
  background: #fef3c7;
  color: #b45309;
}

.grille-body {
  text-align: center;
  margin: 8px 0;
}

.grille-status-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.grille-status-text {
  font-size: 11px;
  font-weight: 500;
}

.card-idle .grille-status-text { color: #15803d; }
.card-occupied .grille-status-text { color: #1e40af; }
.card-disabled .grille-status-text { color: #b91c1c; }

.grille-footer {
  font-size: 10px;
  text-align: center;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  color: #64748b;
}

/* 滚动条 */
.grille-grid::-webkit-scrollbar,
.tabs-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.grille-grid::-webkit-scrollbar-track,
.tabs-wrapper::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.grille-grid::-webkit-scrollbar-thumb,
.tabs-wrapper::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.grille-grid::-webkit-scrollbar-thumb:hover,
.tabs-wrapper::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 响应式 */
@media (max-width: 1200px) {
  .grille-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
}

@media (max-width: 1000px) {
  .two-column {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .page-shell {
    padding: 16px;
  }

  .glass-card {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .grille-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
  }

  .grille-card {
    padding: 8px;
  }

  .grille-status-icon {
    font-size: 22px;
  }

  .grille-id {
    font-size: 11px;
  }
}
</style>