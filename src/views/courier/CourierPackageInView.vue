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
              <el-select v-model="form.preferredGrilleId" placeholder="请选择空闲格口" @change="activeGrilleId = form.preferredGrilleId">
                <el-option
                  v-for="item in idleGrilles"
                  :key="item.id"
                  :label="`${item.id}（${item.matrixRow}行${item.matrixColumn}列）`"
                  :value="item.id"
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
            <p>点击 3D 柜体或下方矩阵可直接选择空闲格口。</p>
          </div>

          <CabinetScene
            :grilles="grilles"
            :active-id="activeGrilleId"
            :flash-id="flashGrilleId"
            :trigger-key="sceneTriggerKey"
            @select="handleSceneSelect"
          />

          <div class="status-grid">
            <button
              v-for="item in matrixCells"
              :key="item.id"
              type="button"
              class="status-cell"
              :class="[statusClass(item.status), { active: activeGrilleId === item.id }]"
              @click="handleSceneSelect(item.id)"
            >
              <strong>{{ item.id }}</strong>
              <span>{{ statusText(item.status) }}</span>
            </button>
          </div>
        </section>
      </div>

      <section class="table-panel">
        <div class="panel-heading">
          <h3>已录入包裹列表</h3>
          <p>展示当前 mock 中全部已创建包裹。</p>
        </div>

        <el-table :data="packages" border stripe>
          <el-table-column type="index" label="序号" width="70" />
          <el-table-column prop="logisticsId" label="包裹ID" min-width="180" />
          <el-table-column prop="pickupCode" label="取件码" width="110" />
          <el-table-column prop="receiverPhone" label="收件人手机号" width="140" />
          <el-table-column prop="grille_id" label="格口编号" width="120" />
          <el-table-column prop="inboundAt" label="入柜时间" min-width="180" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="status-tag" :class="statusClass(row.status)">{{ packageStatusText(row.status) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import CabinetScene from '../../components/three/CabinetScene.vue'
import { assignGrilles, createItem, fetchGrilles, fetchPackages } from '../../api'

const phonePattern = /^1\d{10}$/

const formRef = ref(null)
const dashboardLoading = ref(false)
const submitting = ref(false)
const result = ref(null)
const grilles = ref([])
const packages = ref([])
const activeGrilleId = ref('')
const flashGrilleId = ref('')
const sceneTriggerKey = ref(0)

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

const idleGrilles = computed(() => sortGrilles(grilles.value.filter((item) => item.status === 'idle')))
const matrixCells = computed(() => sortGrilles(grilles.value))
const selectedTip = computed(() => {
  if (!form.preferredGrilleId) return '请从右侧 3D 柜体或矩阵中选择一个空闲格口。'
  const current = grilles.value.find((item) => item.id === form.preferredGrilleId)
  if (!current) return '当前选中的格口不可用。'
  return `当前选中：${current.id}（${current.matrixRow}行${current.matrixColumn}列）`
})

function sortGrilles(list) {
  return [...list].sort((left, right) => {
    if (left.matrixRow !== right.matrixRow) return left.matrixRow - right.matrixRow
    return left.matrixColumn - right.matrixColumn
  })
}

function statusClass(status) {
  return {
    idle: 'status-idle',
    occupied: 'status-occupied',
    disabled: 'status-disabled',
    created: 'status-created',
    stored: 'status-stored',
    picked_up: 'status-picked'
  }[status] || 'status-idle'
}

function statusText(status) {
  return {
    idle: '空闲',
    occupied: '占用',
    disabled: '异常'
  }[status] || '空闲'
}

function packageStatusText(status) {
  return {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已取件'
  }[status] || '处理中'
}

function syncPreferredGrille() {
  if (!idleGrilles.value.some((item) => item.id === form.preferredGrilleId)) {
    form.preferredGrilleId = idleGrilles.value[0]?.id || ''
  }

  if (!activeGrilleId.value) {
    activeGrilleId.value = form.preferredGrilleId
  }
}

async function loadDashboard() {
  dashboardLoading.value = true
  try {
    const [grilleResponse, packageResponse] = await Promise.all([
      fetchGrilles(),
      fetchPackages()
    ])
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

  const target = grilles.value.find((grille) => grille.id === item.grille_id)
  if (target) {
    Object.assign(target, {
      status: 'occupied',
      currentLogisticsId: item.logisticsId
    })
  }
}

function handleSceneSelect(grilleId) {
  const target = grilles.value.find((item) => item.id === grilleId)
  if (!target) return

  activeGrilleId.value = grilleId
  if (target.status !== 'idle') {
    ElMessage.warning('该格口当前不可用于入柜')
    return
  }

  form.preferredGrilleId = grilleId
}

function fillDemo() {
  form.receiverPhone = '13688889999'
  form.itemName = '待配送包裹'
  form.receiverName = '陈一'
  if (idleGrilles.value.length) {
    form.preferredGrilleId = idleGrilles.value[0].id
    activeGrilleId.value = idleGrilles.value[0].id
  }
}

async function submitInbound() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

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
    flashGrilleId.value = result.value.grille_id
    sceneTriggerKey.value += 1
    applyInboundResult(result.value)

    const nextIdleId = idleGrilles.value[0]?.id || ''
    form.preferredGrilleId = nextIdleId
    activeGrilleId.value = nextIdleId
    ElMessage.success('包裹已完成入柜')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '入柜失败')
  } finally {
    submitting.value = false
  }
}

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

.status-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.status-cell {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  padding: 10px 6px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.status-cell:hover {
  transform: translateY(-1px);
}

.status-cell strong,
.status-cell span {
  display: block;
}

.status-cell strong {
  font-size: 12px;
}

.status-cell span {
  margin-top: 4px;
  font-size: 11px;
}

.status-cell.active {
  box-shadow: inset 0 0 0 1px #2563eb;
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
  }
}
</style>
