<template>
  <div class="page-shell">
    <div class="page-title">
      <div>
        <h1>包裹总管理</h1>
        <p>全量查询、筛选、编辑包裹信息，并可查看出入库记录与强制出库。</p>
      </div>
      <el-button plain @click="loadPackages">刷新列表</el-button>
    </div>

    <section class="glass-card content-panel">
      <div class="toolbar">
        <el-input v-model="filters.keyword" placeholder="按物流单号、收件人、手机号搜索" clearable />
        <el-select v-model="filters.status" placeholder="状态筛选" clearable>
          <el-option label="待入柜" value="created" />
          <el-option label="待取件" value="stored" />
          <el-option label="已取件" value="picked_up" />
        </el-select>
        <el-button type="primary" @click="applyFilters">查询</el-button>
      </div>

      <el-table :data="pagedPackages" style="width: 100%" v-loading="loading">
        <el-table-column prop="logisticsId" label="物流单号" min-width="180" />
        <el-table-column prop="itemName" label="包裹名称" min-width="150" />
        <el-table-column prop="receiverName" label="收件人" min-width="120" />
        <el-table-column prop="receiverPhone" label="手机号" min-width="140" />
        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <span class="status-tag" :class="statusClass(row.status)">{{ statusText(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="grille_id" label="格口" min-width="120" />
        <el-table-column label="操作" fixed="right" width="280">
          <template #default="{ row }">
            <el-button text @click="openEdit(row)">编辑</el-button>
            <el-button text @click="openLogs(row)">记录</el-button>
            <el-button text type="danger" :disabled="row.status !== 'stored'" @click="forceOut(row)">强制出库</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="list-footer">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          background
          layout="total, prev, pager, next"
          :total="packages.length"
        />
      </div>
    </section>

    <el-dialog v-model="editVisible" title="编辑包裹" width="560px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-position="top">
        <el-form-item label="包裹名称" prop="itemName"><el-input v-model="editForm.itemName" /></el-form-item>
        <el-form-item label="收件人" prop="receiverName"><el-input v-model="editForm.receiverName" /></el-form-item>
        <el-form-item label="手机号" prop="receiverPhone"><el-input v-model="editForm.receiverPhone" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="editForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="logVisible" title="出入库记录" size="420px" v-loading="logLoading">
      <el-timeline>
        <el-timeline-item v-for="item in logs" :key="item.id" :timestamp="item.createdAt" placement="top">
          <strong>{{ item.action }}</strong>
          <p>{{ item.detail }}</p>
          <span>{{ item.operator }}</span>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchPackageLogs, fetchPackages, packageOut, updatePackage } from '../../api'

const phonePattern = /^1\d{10}$/

const packages = ref([])
const logs = ref([])
const loading = ref(false)
const logLoading = ref(false)
const logVisible = ref(false)
const editVisible = ref(false)
const editingId = ref(0)
const editFormRef = ref(null)

const filters = reactive({
  keyword: '',
  status: ''
})

const log_id = reactive({
  id: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 8
})

const editForm = reactive({
  itemName: '',
  receiverName: '',
  receiverPhone: '',
  remark: ''
})

const editRules = {
  itemName: [{ required: true, message: '请输入包裹名称', trigger: 'blur' }],
  receiverName: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  receiverPhone: [
    { required: true, message: '请输入收件手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ]
}

const pagedPackages = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return packages.value.slice(start, start + pagination.pageSize)
})

function statusClass(status) {
  return {
    created: 'status-created',
    stored: 'status-stored',
    picked_up: 'status-picked'
  }[status] || 'status-idle'
}

function statusText(status) {
  return {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已取件'
  }[status] || status
}

async function loadPackages() {
  loading.value = true
  try {
    const response = await fetchPackages({ ...filters })
    packages.value = response.data.list
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '包裹列表加载失败')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
  loadPackages()
}

function openEdit(row) {
  editingId.value = row.ID
  Object.assign(editForm, structuredClone({
    itemName: row.itemName,
    receiverName: row.receiverName,
    receiverPhone: row.receiverPhone,
    remark: row.remark || ''
  }))
  editVisible.value = true
}

async function submitEdit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await updatePackage(editingId.value, { ...editForm })
    ElMessage.success('包裹信息已更新')
    editVisible.value = false
    loadPackages()
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '更新失败')
  }
}

async function openLogs(row) {
  logLoading.value = true
  logVisible.value = true
  log_id.id = row.logisticsId
  console.log(log_id)
  try {
    const response = await fetchPackageLogs({ id: log_id.id })
    logs.value = response.data.list
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '日志加载失败')
  } finally {
    logLoading.value = false
  }
}

async function forceOut(row) {
  try {
    await ElMessageBox.confirm(`确认强制出库 ${row.logisticsId}？`, '提示')
    await packageOut({ logistics_ids: [row.logisticsId] })
    ElMessage.success('包裹已强制出库')
    loadPackages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.msg || error?.message || '强制出库失败')
    }
  }
}

onMounted(loadPackages)
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px auto;
  gap: 14px;
  margin-bottom: 18px;
}

@media (max-width: 768px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
