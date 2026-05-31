<template>
  <div class="page-shell">
    <div class="page-title">
      <div>
        <h1>数据统计分析看板</h1>
        <p>实时监控快递柜运营数据，包括格口状态、包裹流转、用户活跃度等核心指标。</p>
      </div>
      <div class="title-actions">
        <el-button plain @click="refreshAllData" :loading="refreshing">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-dropdown @command="handleTimeRangeChange">
          <el-button plain>
            {{ timeRangeLabel }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="week">近7天</el-dropdown-item>
              <el-dropdown-item command="month">近30天</el-dropdown-item>
              <el-dropdown-item command="quarter">近90天</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metric-grid">
      <div class="metric-card" v-for="metric in coreMetrics" :key="metric.label">
        <div class="metric-header">
          <span class="metric-label">{{ metric.label }}</span>
          <el-icon :size="20" :color="metric.color">
            <component :is="metric.icon" />
          </el-icon>
        </div>
        <div class="metric-value">{{ metric.value }}</div>
        <div class="metric-trend">
          <span class="trend-up" v-if="metric.trend > 0">↑ {{ metric.trend }}%</span>
          <span class="trend-down" v-else-if="metric.trend < 0">↓ {{ Math.abs(metric.trend) }}%</span>
          <span v-else>-</span>
          <span>较昨日</span>
        </div>
      </div>
    </div>

    <!-- 第一行图表 -->
    <div class="chart-row">
      <div class="chart-card">
        <div class="chart-header">
          <h3>格口状态分布</h3>
          <span class="chart-subtitle">各状态格口数量及占比</span>
        </div>
        <div ref="grilleChartRef" class="chart-container" v-loading="loading"></div>
        <div class="chart-legend-stats">
          <div class="stat-item" v-for="item in grilleStats" :key="item.name">
            <span class="dot" :style="{ background: item.color }"></span>
            <span class="name">{{ item.name }}</span>
            <span class="num">{{ item.value }}</span>
            <span class="percent">({{ item.percent }}%)</span>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>包裹状态趋势</h3>
          <span class="chart-subtitle">基于Item表Status字段统计</span>
        </div>
        <div ref="packageTrendChartRef" class="chart-container" v-loading="trendLoading"></div>
      </div>
    </div>

    <!-- 第二行图表 -->
    <div class="chart-row">
      <div class="chart-card">
        <div class="chart-header">
          <h3>用户角色分布</h3>
          <span class="chart-subtitle">不同角色用户数量占比</span>
        </div>
        <div ref="userChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>柜体使用率排行</h3>
          <span class="chart-subtitle">各柜体格口使用率排行</span>
        </div>
        <div ref="cabinetChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 第四行：统计数据表格 -->
    <div class="stats-table">
      <div class="chart-card">
        <div class="chart-header">
          <h3>柜体详细统计</h3>
          <span class="chart-subtitle">各柜体格口配置与使用详情</span>
        </div>
        <el-table :data="cabinetStatsTable" style="width: 100%" v-loading="loading" size="small">
          <el-table-column prop="letter" label="柜体" width="80" />
          <el-table-column prop="total" label="总格口" width="100" />
          <el-table-column prop="idle" label="空闲" width="100">
            <template #default="{ row }">
              <span class="status-idle">{{ row.idle }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="occupied" label="占用" width="100">
            <template #default="{ row }">
              <span class="status-occupied">{{ row.occupied }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="disabled" label="停用" width="100">
            <template #default="{ row }">
              <span class="status-disabled">{{ row.disabled }}</span>
            </template>
          </el-table-column>
          <el-table-column label="使用率" min-width="180">
            <template #default="{ row }">
              <el-progress
                  :percentage="row.usageRate"
                  :color="getProgressColor(row.usageRate)"
                  :stroke-width="8"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, ArrowDown, OfficeBuilding, Box, User, Tickets } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { fetchGrilles, fetchPackages, fetchUsers, fetchPackageAllLogs } from '../../api'

const loading = ref(false)
const refreshing = ref(false)
const trendLoading = ref(false)

// 图表ref
const grilleChartRef = ref(null)
const packageTrendChartRef = ref(null)
const userChartRef = ref(null)
const cabinetChartRef = ref(null)

// 时间范围
const timeRange = ref('week')
const timeRangeLabel = computed(() => {
  const map = { week: '近7天', month: '近30天', quarter: '近90天' }
  return map[timeRange.value]
})
const trendDays = computed(() => {
  const map = { week: 7, month: 30, quarter: 90 }
  return map[timeRange.value]
})

// 数据存储
const grilles = ref([])
const items = ref([])      // Item表数据（包裹信息）
const users = ref([])
const packages = ref([])   // Package表数据（操作日志，暂未使用但保留）

// 趋势数据 - 基于Item表的Status
const trendData = ref({ dates: [], createdCounts: [], storedCounts: [], pickedUpCounts: [] })

// 昨日数据用于计算趋势
let yesterdayPickUpCount = 0
let yesterdayStoredCount = 0

// 核心指标
const coreMetrics = ref([
  { label: '总格口数', value: 0, icon: 'OfficeBuilding', color: '#3b82f6', trend: 0 },
  { label: '已取件', value: 0, icon: 'Box', color: '#f59e0b', trend: 0 },
  { label: '待取件', value: 0, icon: 'Tickets', color: '#10b981', trend: 0 },
  { label: '活跃用户', value: 0, icon: 'User', color: '#8b5cf6', trend: 0 }
])

// 格口统计
const grilleStats = computed(() => {
  const total = grilles.value.length
  const idle = grilles.value.filter(g => g.status === 'idle').length
  const occupied = grilles.value.filter(g => g.status === 'occupied').length
  const disabled = grilles.value.filter(g => g.status === 'disabled').length

  return [
    { name: '空闲', value: idle, percent: total ? ((idle / total) * 100).toFixed(1) : 0, color: '#10b981' },
    { name: '占用', value: occupied, percent: total ? ((occupied / total) * 100).toFixed(1) : 0, color: '#3b82f6' },
    { name: '停用', value: disabled, percent: total ? ((disabled / total) * 100).toFixed(1) : 0, color: '#ef4444' }
  ]
})

// 柜体统计表格
const cabinetStatsTable = computed(() => {
  const cabinetMap = new Map()

  for (const g of grilles.value) {
    const letter = getCabinetLetter(g)
    if (!cabinetMap.has(letter)) {
      cabinetMap.set(letter, { total: 0, idle: 0, occupied: 0, disabled: 0 })
    }
    const stats = cabinetMap.get(letter)
    stats.total++
    if (g.status === 'idle') stats.idle++
    if (g.status === 'occupied') stats.occupied++
    if (g.status === 'disabled') stats.disabled++
  }

  const result = []
  for (const [letter, stats] of cabinetMap.entries()) {
    const usageRate = stats.total ? ((stats.occupied / stats.total) * 100).toFixed(1) : 0
    result.push({
      letter,
      ...stats,
      usageRate: parseFloat(usageRate)
    })
  }

  return result.sort((a, b) => b.usageRate - a.usageRate)
})

// 辅助函数
const getCabinetLetter = (grille) => {
  const cabinetId = grille.cabinet_id || grille.cabinetId || ''
  const match = cabinetId.match(/^([A-Z])/)
  return match ? match[1] : '默认'
}

// 格式化日期 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 判断两个日期是否同一天
function isSameDay(date1, date2) {
  return formatDate(date1) === formatDate(date2)
}

// 解析时间字符串（支持多种格式）
function parseDateString(dateStr) {
  if (!dateStr) return null
  let d = new Date(dateStr)
  if (isNaN(d.getTime())) {
    const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (parts) {
      d = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]))
    }
  }
  return d
}

// 图表实例
let grilleChart = null
let packageTrendChart = null
let userChart = null
let cabinetChart = null

// 初始化图表
function initCharts() {
  initGrilleChart()
  initPackageTrendChart()
  initUserChart()
  initCabinetChart()
}

// 格口分布饼图
function initGrilleChart() {
  if (!grilleChartRef.value) return
  grilleChart = echarts.init(grilleChartRef.value)
  updateGrilleChart()
  window.addEventListener('resize', () => grilleChart?.resize())
}

function updateGrilleChart() {
  if (!grilleChart) return
  grilleChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { show: false },
    series: [{
      name: '格口状态',
      type: 'pie',
      radius: ['45%', '70%'],
      data: grilleStats.value.map(item => ({
        name: item.name,
        value: item.value,
        itemStyle: { color: item.color }
      }))
    }]
  })
}

// 包裹趋势折线图 - 基于Item表的Status
function initPackageTrendChart() {
  if (!packageTrendChartRef.value) return
  packageTrendChart = echarts.init(packageTrendChartRef.value)
  updatePackageTrendChart()
  window.addEventListener('resize', () => packageTrendChart?.resize())
}

function updatePackageTrendChart() {
  if (!packageTrendChart) return
  packageTrendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['已取件(picked_up)', '待取件(stored)'], bottom: 0 },
    grid: { top: 40, left: 50, right: 20, bottom: 50, containLabel: true },
    xAxis: { type: 'category', data: trendData.value.dates, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '包裹数量' },
    series: [
      {
        name: '已取件(picked_up)',
        type: 'line',
        smooth: true,
        data: trendData.value.pickedUpCounts,
        lineStyle: { color: '#f59e0b', width: 2 },
        areaStyle: { opacity: 0.1, color: '#f59e0b' },
        symbol: 'circle',
        symbolSize: 6
      },
      {
        name: '待取件(stored)',
        type: 'line',
        smooth: true,
        data: trendData.value.storedCounts,
        lineStyle: { color: '#10b981', width: 2 },
        areaStyle: { opacity: 0.1, color: '#10b981' },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  })
}

// 用户角色分布饼图
function initUserChart() {
  if (!userChartRef.value) return
  userChart = echarts.init(userChartRef.value)
  updateUserChart()
  window.addEventListener('resize', () => userChart?.resize())
}

function updateUserChart() {
  if (!userChart) return
  const roleMap = { admin: '管理员', courier: '快递员', user: '普通用户' }
  const roleColors = { admin: '#ef4444', courier: '#f59e0b', user: '#3b82f6' }

  const roleCount = {}
  for (const u of users.value) {
    const role = u.role || 'user'
    roleCount[role] = (roleCount[role] || 0) + 1
  }

  const data = Object.entries(roleCount).map(([role, count]) => ({
    name: roleMap[role] || role,
    value: count,
    itemStyle: { color: roleColors[role] || '#9ca3af' }
  }))

  userChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { orient: 'vertical', left: 'left', top: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      label: { show: true, formatter: '{b}', position: 'outside' },
      data
    }]
  })
}

// 柜体使用率柱状图
function initCabinetChart() {
  if (!cabinetChartRef.value) return
  cabinetChart = echarts.init(cabinetChartRef.value)
  updateCabinetChart()
  window.addEventListener('resize', () => cabinetChart?.resize())
}

function updateCabinetChart() {
  if (!cabinetChart) return
  const topCabinets = cabinetStatsTable.value.slice(0, 8)

  cabinetChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c}%' },
    grid: { left: '10%', right: '5%', top: 30, bottom: 20, containLabel: true },
    xAxis: { type: 'value', name: '使用率 (%)', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: topCabinets.map(c => `${c.letter}区`), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: topCabinets.map(c => c.usageRate),
      itemStyle: {
        borderRadius: [0, 8, 8, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#8b5cf6' }]
        }
      },
      label: { show: true, position: 'right', formatter: '{c}%' }
    }]
  })
}

// 从Item表中按日期统计Status数量（无分页，全量获取）
async function loadTrendData() {
  trendLoading.value = true
  try {
    const days = trendDays.value
    const dates = []
    const createdCounts = []
    const storedCounts = []
    const pickedUpCounts = []

    // 获取所有Item数据（无分页参数）
    const response = await fetchPackages()
    const allItems = response.data.list || []
    items.value = allItems

    console.log('加载到Item数据数量:', allItems.length)

    // 计算起始日期
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // 按日期分组统计
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      const dateStr = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
      dates.push(dateStr)

      let created = 0
      let stored = 0
      let pickedUp = 0

      for (const item of allItems) {
        const createdAt = item.CreatedAt || item.createdAt || item.InboundAt || item.inbound_at
        if (!createdAt) continue

        const itemDate = parseDateString(createdAt)
        if (itemDate && isSameDay(itemDate, currentDate)) {
          const status = item.Status || item.status
          if (status === 'created') created++
          else if (status === 'stored') stored++
          else if (status === 'picked_up') pickedUp++
        }
      }

      createdCounts.push(created)
      storedCounts.push(stored)
      pickedUpCounts.push(pickedUp)

      // 记录昨天数据用于趋势
      if (i === days - 2) {
        yesterdayPickUpCount = pickedUp
        yesterdayStoredCount = stored
      }
    }

    console.log('趋势数据:', { dates, storedCounts, pickedUpCounts })

    trendData.value = { dates, createdCounts, storedCounts, pickedUpCounts }
    updatePackageTrendChart()
  } catch (error) {
    console.error('加载趋势数据失败', error)
    ElMessage.error('加载包裹趋势数据失败: ' + (error?.message || '未知错误'))
  } finally {
    trendLoading.value = false
  }
}

// 加载所有数据（无分页）
async function loadAllData() {
  loading.value = true
  try {
    const [grilleRes, userRes, itemResponse] = await Promise.all([
      fetchGrilles(),
      fetchUsers(),
      fetchPackages()  // 无分页，全量获取Item数据
    ])

    grilles.value = (grilleRes.data.list || []).map(item => ({
      ...item,
      id: item.id || item.grille_id,
      status: item.status
    }))

    users.value = userRes.data.list || []
    const allItems = itemResponse.data.list || []

    // 计算今日数据
    const today = new Date()
    let todayPickUpCount = 0
    let todayStoredCount = 0
    let todayActiveCount = 0

    for (const item of allItems) {
      const createdAt = item.CreatedAt || item.createdAt
      if (createdAt) {
        const itemDate = parseDateString(createdAt)
        if (itemDate && isSameDay(itemDate, today)) {
          const status = item.Status || item.status
          // 修正：已取件应为 picked_up
          if (status === 'picked_up') todayPickUpCount++
          if (status === 'stored') todayStoredCount++
        }
      }
    }

    // 统计今日活跃用户
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    for (const u of users.value) {
      const lastLogin = u.lastLoginAt || u.last_login_at
      if (lastLogin && new Date(lastLogin) > oneDayAgo) {
        todayActiveCount++
      }
    }

    // 计算趋势百分比
    const pickUpTrend = yesterdayPickUpCount ? ((todayPickUpCount - yesterdayPickUpCount) / yesterdayPickUpCount * 100).toFixed(1) : 0
    const storedTrend = yesterdayStoredCount ? ((todayStoredCount - yesterdayStoredCount) / yesterdayStoredCount * 100).toFixed(1) : 0

    coreMetrics.value[0].value = grilles.value.length
    coreMetrics.value[1].value = todayPickUpCount
    coreMetrics.value[1].trend = parseFloat(pickUpTrend)
    coreMetrics.value[2].value = todayStoredCount
    coreMetrics.value[2].trend = parseFloat(storedTrend)
    coreMetrics.value[3].value = todayActiveCount

    console.log('核心指标:', {
      总格口: grilles.value.length,
      今日已取件: todayPickUpCount,
      今日待取件: todayStoredCount,
      活跃用户: todayActiveCount
    })

    updateGrilleChart()
    updateUserChart()
    updateCabinetChart()
  } catch (error) {
    console.error('数据加载失败', error)
    ElMessage.error(error?.response?.data?.msg || error?.message || '数据加载失败')
  } finally {
    loading.value = false
  }
}

// 刷新所有数据
async function refreshAllData() {
  refreshing.value = true
  await Promise.all([loadAllData(), loadTrendData()])
  refreshing.value = false
  ElMessage.success('数据已刷新')
}

function handleTimeRangeChange(command) {
  timeRange.value = command
  loadTrendData()
}

function getProgressColor(percentage) {
  if (percentage >= 70) return '#ef4444'
  if (percentage >= 40) return '#f59e0b'
  return '#10b981'
}

// 监听时间范围变化
watch(timeRange, () => {
  loadTrendData()
})

onMounted(() => {
  loadAllData()
  loadTrendData()
  setTimeout(initCharts, 100)
})

onUnmounted(() => {
  [grilleChart, packageTrendChart, userChart, cabinetChart].forEach(chart => {
    chart?.dispose()
  })
})
</script>

<style scoped>
/* 样式保持不变，与原代码相同 */
.page-shell {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  background: #f0f2f6;
  min-height: 100vh;
}

.page-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-title h1 {
  margin: 0 0 4px 0;
  font-size: 28px;
  color: #1e293b;
}

.page-title p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.title-actions {
  display: flex;
  gap: 12px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.metric-label {
  font-size: 14px;
  color: #64748b;
}

.metric-value {
  font-size: 36px;
  font-weight: bold;
  color: #0f172a;
  margin-bottom: 8px;
}

.metric-trend {
  font-size: 12px;
}

.trend-up { color: #10b981; }
.trend-down { color: #ef4444; }

.chart-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1e293b;
}

.chart-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.chart-legend-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.stat-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.stat-item .name {
  color: #64748b;
}

.stat-item .num {
  font-weight: bold;
  color: #1e293b;
}

.stat-item .percent {
  color: #94a3b8;
  font-size: 12px;
}

.stats-table {
  margin-top: 20px;
}

.status-idle { color: #10b981; font-weight: 500; }
.status-occupied { color: #3b82f6; font-weight: 500; }
.status-disabled { color: #ef4444; font-weight: 500; }

@media (max-width: 1200px) {
  .chart-row { grid-template-columns: 1fr; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .page-shell { padding: 16px; }
  .metric-grid { grid-template-columns: 1fr; }
  .chart-legend-stats { flex-wrap: wrap; gap: 12px; }
  .chart-header { flex-direction: column; align-items: flex-start; }
}
</style>