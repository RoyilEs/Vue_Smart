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
        <div class="page-title">
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
            <el-descriptions-item label="尺寸">{{ selectedGrille.sizeType || selectedGrille.size_type }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedGrille.status }}</el-descriptions-item>
            <el-descriptions-item label="占用物流">{{ selectedGrille.currentLogisticsId || '-' }}</el-descriptions-item>
            <!-- 若有行列信息可展示 -->
            <el-descriptions-item label="位置" v-if="selectedGrille.matrixRow && selectedGrille.matrixColumn">
              {{ selectedGrille.matrixRow }} 行, {{ selectedGrille.matrixColumn }} 列
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <!-- 右侧平面网格展示 -->
      <section class="glass-card content-panel" v-loading="loading">
        <div class="page-title">
          <div>
            <h3>格口矩阵平面图</h3>
            <p>点击任意格子查看详情，左侧色条区分不同柜体。</p>
          </div>
        </div>
        <div class="grid-matrix" v-if="groupedCabinets.length">
          <div v-for="cabinet in groupedCabinets" :key="cabinet.letter" class="cabinet-group">
            <div class="cabinet-header">
              <span class="cabinet-badge" :style="{ backgroundColor: cabinet.color }"></span>
              <span class="cabinet-name">{{ cabinet.letter }}区主柜 <small>({{ cabinet.grilles.length }}个格口)</small></span>
            </div>
            <!-- 平铺所有格子（flex 换行） -->
            <div class="grille-list">
              <div
                  v-for="cell in cabinet.grilles"
                  :key="cell.id"
                  class="grille-cell"
                  :class="{
              'cell-idle': cell.status === 'idle',
              'cell-occupied': cell.status === 'occupied',
              'cell-disabled': cell.status === 'disabled',
              'cell-selected': selectedId === cell.id
            }"
                  :data-cabinet="cell.cabinetLetter"
                  @click.stop="selectedId = cell.id"
              >
                <span class="cell-id">{{ cell.displayId }}</span>
                <span class="cell-status">{{ cell.status === 'idle' ? '空闲' : cell.status === 'occupied' ? '占用' : '停用' }}</span>
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
  const cabinetId = grille.cabinet_id || grille.cabinetId || ''
  const match = cabinetId.match(/^([A-Z])/)
  return match ? match[1] : '?'
}

// 预定义柜子颜色（可按需要扩展）
const cabinetColorMap = {
  'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#8b5cf6', 'E': '#ec489a', '?': '#9ca3af'
}

// 按柜子字母分组，并生成每个柜子的矩阵布局
const groupedCabinets = computed(() => {
  if (!grilles.value.length) return []

  // 1. 按字母分组
  const groups = new Map()
  for (const g of grilles.value) {
    const letter = getCabinetLetter(g)
    if (!groups.has(letter)) {
      groups.set(letter, [])
    }
    // 增强 grille 对象：添加 cabinetLetter 和 displayId
    const enriched = {
      ...g,
      cabinetLetter: letter,
      displayId: g.id || g.grille_id || `${g.matrixRow || 1}-${g.matrixColumn || 1}`
    }
    groups.get(letter).push(enriched)
  }

  // 按柜子字母分组（不再强制矩阵布局，平铺所有格口）
  const groupedCabinets = computed(() => {
    if (!grilles.value.length) return []

    const groups = new Map()
    for (const g of grilles.value) {
      const letter = getCabinetLetter(g)
      if (!groups.has(letter)) groups.set(letter, [])
      // 增强数据
      const enriched = {
        ...g,
        cabinetLetter: letter,
        displayId: g.id || g.grille_id || `${g.matrixRow || g.matrix_row || 1}-${g.matrixColumn || g.matrix_column || 1}`
      }
      groups.get(letter).push(enriched)
    }

    const result = []
    for (const [letter, grilleList] of groups.entries()) {
      result.push({
        letter,
        color: cabinetColorMap[letter] || cabinetColorMap['?'],
        grilles: grilleList
      })
    }
    result.sort((a, b) => a.letter.localeCompare(b.letter))
    return result
  })

  // 2. 对每个柜子的格口计算矩阵布局
  const result = []
  for (const [letter, grilleList] of groups.entries()) {
    // 获取最大行列（优先使用 matrixRow/Column，否则自动布局）
    let maxRow = 0, maxCol = 0
    for (const g of grilleList) {
      const row = g.matrixRow || g.matrix_row || 0
      const col = g.matrixColumn || g.matrix_column || 0
      if (row > maxRow) maxRow = row
      if (col > maxCol) maxCol = col
    }

    let matrixRows = []
    const columnCount = createForm.matrix || 6

    if (maxRow === 0 || maxCol === 0) {
      // 没有行列信息：按顺序每行 columnCount 个
      for (let i = 0; i < grilleList.length; i += columnCount) {
        matrixRows.push(grilleList.slice(i, i + columnCount))
      }
    } else {
      // 有行列信息：构建二维数组，空位填 null
      const rows = Array(maxRow).fill().map(() => Array(maxCol).fill(null))
      for (const g of grilleList) {
        const row = (g.matrixRow || g.matrix_row) - 1
        const col = (g.matrixColumn || g.matrix_column) - 1
        if (row >= 0 && row < maxRow && col >= 0 && col < maxCol) {
          rows[row][col] = g
        }
      }
      matrixRows = rows.filter(row => row.some(cell => cell !== null))
    }

    result.push({
      letter,
      color: cabinetColorMap[letter] || cabinetColorMap['?'],
      grilles: grilleList,
      matrixRows
    })
  }

  // 按字母顺序排序
  result.sort((a, b) => a.letter.localeCompare(b.letter))
  return result
})

const selectedGrille = computed(() => {
  console.log(grilles)
  // 兼容 id 和 grille_id
  return grilles.value.find((item) => (item.id || item.grille_id) === selectedId.value)
})

async function loadGrilles() {
  loading.value = true
  try {
    const response = await fetchGrilles()
    const list = response.data.list || []
    // 统一使用 id 字段（若后端返回 grille_id，则映射为 id）
    grilles.value = list.map(item => ({
      ...item,
      id: item.id || item.grille_id,
      sizeType: item.sizeType || item.size,
      matrixRow: item.matrixRow || item.matrix_row,
      matrixColumn: item.matrixColumn || item.matrix_column,
      cabinetId: item.cabinetId || item.cabinet_id
    }))
    if (!grilles.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = grilles.value[0]?.id || ''
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

.grille-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.cabinet-group {
  margin-bottom: 28px;
  border-radius: 16px;
  background: rgba(255,255,255,0.6);
  padding: 12px;
}

.cabinet-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.cabinet-badge {
  width: 12px;
  height: 28px;
  border-radius: 6px;
}

.cabinet-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #1e293b;
}

.matrix-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.matrix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.grille-cell {
  width: 100px;
  height: 100px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  border: 2px solid transparent;
  position: relative;
}

/* 根据柜子字母添加左侧色条 */
.grille-cell::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 4px;
  border-radius: 2px;
  background-color: var(--cabinet-color, #9ca3af);
}

/* 动态绑定 cabinet 颜色需要在模板中行内样式或者使用css变量 */
.grille-cell[data-cabinet="A"] { --cabinet-color: #10b981; }
.grille-cell[data-cabinet="B"] { --cabinet-color: #3b82f6; }
.grille-cell[data-cabinet="C"] { --cabinet-color: #f59e0b; }
.grille-cell[data-cabinet="D"] { --cabinet-color: #8b5cf6; }
.grille-cell[data-cabinet="E"] { --cabinet-color: #ec489a; }
.grille-cell[data-cabinet="?"] { --cabinet-color: #9ca3af; }

.grille-cell:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.cell-idle {
  background: #dcfce7;
  color: #15803d;
}
.cell-occupied {
  background: #dbeafe;
  color: #1e40af;
}
.cell-disabled {
  background: #fee2e2;
  color: #b91c1c;
}
.cell-selected {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245,158,11,0.3);
}

.cell-id {
  font-weight: bold;
  font-size: 14px;
}
.cell-status {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.8;
}

@media (max-width: 1000px) {
  .two-column {
    grid-template-columns: 1fr;
  }
  .grille-cell {
    width: 80px;
    height: 80px;
  }
}
</style>