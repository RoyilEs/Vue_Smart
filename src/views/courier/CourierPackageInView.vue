<template>
  <div class="courier-page">
    <div class="page-title">
      <div>
        <h1>快递员 - 包裹入柜</h1>
        <p>分步填写包裹信息，选择空闲格口完成入柜</p>
      </div>
      <el-button plain @click="fillDemo">填充演示数据</el-button>
    </div>

    <div class="glass-card courier-card" v-loading="dashboardLoading">
      <div class="top-grid">
        <!-- 左侧表单 - 分页显示 -->
        <section class="entry-panel">
          <div class="panel-heading">
            <h3>入柜表单</h3>
            <p>第 {{ formCurrentPage }} / {{ formTotalPages }} 页 - 请填写包裹信息</p>
          </div>

          <div class="form-steps">
            <el-steps :active="formCurrentPage - 1" align-center finish-status="success">
              <el-step title="收件人信息" />
              <el-step title="寄件人信息" />
              <el-step title="包裹信息" />
              <el-step title="确认入柜" />
            </el-steps>
          </div>

          <div class="form-container">
            <el-form ref="formRef" :model="form" :rules="rules" label-position="top" label-width="100px">
              <!-- 第1页：收件人信息 -->
              <div v-if="formCurrentPage === 1" class="form-page">
                <div class="form-section">
                  <h4>收件人信息</h4>
                  <el-form-item label="收件人姓名" prop="receiverName">
                    <el-input v-model="form.receiverName" placeholder="请输入收件人姓名" />
                  </el-form-item>

                  <el-form-item label="收件人手机号" prop="receiverPhone">
                    <el-input v-model="form.receiverPhone" placeholder="请输入11位手机号" />
                  </el-form-item>

                  <el-form-item label="收件人邮箱" prop="receiverEmail">
                    <el-input v-model="form.receiverEmail" placeholder="用于发送取件通知" />
                  </el-form-item>

                  <el-form-item label="收件城市" prop="receiverCity">
                    <el-input v-model="form.receiverCity" placeholder="例如：上海市" />
                  </el-form-item>

                  <el-form-item label="收件区域" prop="receiverArea">
                    <el-input v-model="form.receiverArea" placeholder="例如：浦东新区" />
                  </el-form-item>

                  <el-form-item label="收件地址" prop="receiverAddress">
                    <el-input v-model="form.receiverAddress" placeholder="详细地址" />
                  </el-form-item>
                </div>
              </div>

              <!-- 第2页：寄件人信息 -->
              <div v-if="formCurrentPage === 2" class="form-page">
                <div class="form-section">
                  <h4>寄件人信息</h4>
                  <el-form-item label="寄件人姓名" prop="senderName">
                    <el-input v-model="form.senderName" placeholder="请输入寄件人姓名" />
                  </el-form-item>

                  <el-form-item label="寄件人手机号" prop="senderPhone">
                    <el-input v-model="form.senderPhone" placeholder="请输入11位手机号" />
                  </el-form-item>

                  <el-form-item label="寄件人邮箱" prop="senderEmail">
                    <el-input v-model="form.senderEmail" placeholder="寄件人邮箱" />
                  </el-form-item>

                  <el-form-item label="寄件城市" prop="senderCity">
                    <el-input v-model="form.senderCity" placeholder="例如：上海市" />
                  </el-form-item>

                  <el-form-item label="寄件区域" prop="senderArea">
                    <el-input v-model="form.senderArea" placeholder="例如：浦东新区" />
                  </el-form-item>

                  <el-form-item label="寄件地址" prop="senderAddress">
                    <el-input v-model="form.senderAddress" placeholder="详细地址" />
                  </el-form-item>
                </div>
              </div>

              <!-- 第3页：包裹信息 -->
              <div v-if="formCurrentPage === 3" class="form-page">
                <div class="form-section">
                  <h4>包裹信息</h4>
                  <el-form-item label="物品名称" prop="itemName">
                    <el-input v-model="form.itemName" placeholder="例如：衣服、书籍等" />
                  </el-form-item>

                  <el-form-item label="物品数量" prop="itemNum">
                    <el-input-number v-model="form.itemNum" :min="1" :max="99" style="width: 100%" />
                  </el-form-item>

                  <el-form-item label="物品重量(kg)" prop="itemWeight">
                    <el-input-number v-model="form.itemWeight" :min="0.1" :step="0.5" :precision="1" style="width: 100%" />
                  </el-form-item>

                  <el-form-item label="包裹数量" prop="packageNums">
                    <el-input-number v-model="form.packageNums" :min="1" :max="10" style="width: 100%" />
                  </el-form-item>

                  <el-form-item label="备注" prop="remark">
                    <el-input v-model="form.remark" type="textarea" :rows="4" placeholder="其他备注信息" />
                  </el-form-item>
                </div>
              </div>

              <!-- 第4页：确认信息 -->
              <div v-if="formCurrentPage === 4" class="form-page">
                <div class="form-section">
                  <h4>确认入柜信息</h4>
                  <div class="confirm-info">
                    <div class="info-group">
                      <h5>收件人信息</h5>
                      <p><span>姓名：</span>{{ form.receiverName || '未填写' }}</p>
                      <p><span>手机号：</span>{{ form.receiverPhone || '未填写' }}</p>
                      <p><span>邮箱：</span>{{ form.receiverEmail || '未填写' }}</p>
                      <p><span>地址：</span>{{ form.receiverCity }} {{ form.receiverArea }} {{ form.receiverAddress }}</p>
                    </div>
                    <div class="info-group">
                      <h5>寄件人信息</h5>
                      <p><span>姓名：</span>{{ form.senderName || '未填写' }}</p>
                      <p><span>手机号：</span>{{ form.senderPhone || '未填写' }}</p>
                      <p><span>邮箱：</span>{{ form.senderEmail || '未填写' }}</p>
                      <p><span>地址：</span>{{ form.senderCity }} {{ form.senderArea }} {{ form.senderAddress }}</p>
                    </div>
                    <div class="info-group">
                      <h5>包裹信息</h5>
                      <p><span>物品名称：</span>{{ form.itemName || '未填写' }}</p>
                      <p><span>物品数量：</span>{{ form.itemNum }}</p>
                      <p><span>物品重量：</span>{{ form.itemWeight }} kg</p>
                      <p><span>包裹数量：</span>{{ form.packageNums }}</p>
                      <p><span>备注：</span>{{ form.remark || '无' }}</p>
                    </div>
                    <div class="info-group">
                      <h5>格口选择</h5>
                      <p class="selected-grille-info">{{ selectedTip }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </el-form>
          </div>

          <!-- 表单分页器 -->
          <div class="form-pagination">
            <el-button v-if="formCurrentPage > 1" @click="prevFormPage">
              <el-icon><ArrowLeft /></el-icon> 上一步
            </el-button>
            <el-button v-if="formCurrentPage < formTotalPages" type="primary" @click="nextFormPage">
              下一步 <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button v-if="formCurrentPage === formTotalPages" type="success" :loading="submitting" @click="submitInbound">
              生成取件码并入柜
            </el-button>
          </div>

          <!-- 入柜结果 -->
          <div class="result-box" v-if="result">
            <strong>✅ 入柜成功</strong>
            <span>📱 收件人：{{ result.receiverPhone }}</span>
            <span>📦 格口编号：{{ result.grille_id }}</span>
            <span>🔑 取件码：{{ result.pickup_code }}</span>
            <span>📋 包裹ID：{{ result.logisticsId }}</span>
          </div>
          <div class="result-box" v-else>
            <strong>📝 等待入柜</strong>
            <span>完成表单填写后，点击"生成取件码并入柜"按钮。</span>
          </div>
        </section>

        <!-- 右侧格口 - 分页显示 -->
        <section class="cabinet-panel">
          <div class="panel-heading">
            <h3>快递柜格口状态</h3>
            <p>第 {{ currentPage }} / {{ totalPages }} 页 - 点击空闲格口选择</p>
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

            <div class="status-grid">
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
                <small>{{ item.matrix_row }}-{{ item.matrix_column }}</small>
              </div>
            </div>
            <el-empty v-if="!currentPageGrilles.length" description="暂无格口数据" />

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
          <el-table-column prop="receiverName" label="收件人姓名" width="120" />
          <el-table-column prop="grille_id" label="格口编号" width="120" />
          <el-table-column prop="inbound_at" label="入柜时间" min-width="180" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="status-tag" :class="getPackageStatusClass(row.status)">
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
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { assignGrilles, createItem, fetchGrilles, fetchPackages } from '../../api'

const phonePattern = /^1\d{10}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const formRef = ref(null)
const dashboardLoading = ref(false)
const submitting = ref(false)
const result = ref(null)
const grilles = ref([])
const packages = ref([])
const activeGrilleId = ref('')
const pageSize = ref(24)
const currentPage = ref(1)
const formCurrentPage = ref(1)
const formTotalPages = ref(4)

const form = reactive({
  receiverName: '',
  receiverPhone: '',
  receiverEmail: '',
  receiverCity: '',
  receiverArea: '',
  receiverAddress: '',
  senderName: '',
  senderPhone: '',
  senderEmail: '',
  senderCity: '',
  senderArea: '',
  senderAddress: '',
  itemName: '',
  itemNum: 1,
  itemWeight: 1,
  packageNums: 1,
  remark: '',
  preferredGrilleId: ''
})

// 验证规则
const rules = {
  receiverName: [
    { required: true, message: '请输入收件人姓名', trigger: 'blur' }
  ],
  receiverPhone: [
    { required: true, message: '请输入收件人手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  receiverEmail: [
    { required: true, message: '请输入收件人邮箱', trigger: 'blur' },
    { pattern: emailPattern, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  receiverCity: [{ required: true, message: '请输入收件城市', trigger: 'blur' }],
  receiverArea: [{ required: true, message: '请输入收件区域', trigger: 'blur' }],
  receiverAddress: [{ required: true, message: '请输入收件地址', trigger: 'blur' }],
  senderName: [{ required: true, message: '请输入寄件人姓名', trigger: 'blur' }],
  senderPhone: [
    { required: true, message: '请输入寄件人手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  senderEmail: [
    { required: true, message: '请输入寄件人邮箱', trigger: 'blur' },
    { pattern: emailPattern, message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  senderCity: [{ required: true, message: '请输入寄件城市', trigger: 'blur' }],
  senderArea: [{ required: true, message: '请输入寄件区域', trigger: 'blur' }],
  senderAddress: [{ required: true, message: '请输入寄件地址', trigger: 'blur' }],
  itemName: [{ required: true, message: '请输入物品名称', trigger: 'blur' }],
  itemNum: [{ required: true, message: '请输入物品数量', trigger: 'blur' }],
  itemWeight: [{ required: true, message: '请输入物品重量', trigger: 'blur' }],
  preferredGrilleId: [{ required: true, message: '请选择空闲格口', trigger: 'change' }]
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

const idleGrilles = computed(() => {
  return sortedGrilles.value.filter((item) => item.status === 'idle')
})

const selectedTip = computed(() => {
  if (!form.preferredGrilleId) return '⚡ 请从右侧网格中选择一个空闲格口'
  const current = grilles.value.find((item) => item.grille_id === form.preferredGrilleId)
  if (!current) return '⚠️ 当前选中的格口不可用'
  const statusText = current.status === 'idle' ? '✓ 空闲' : current.status === 'occupied' ? '🔴 占用中' : '⛔ 已停用'
  return `📦 ${current.grille_id}（${current.matrix_row}行${current.matrix_column}列）- ${statusText}`
})

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

// 表单分页导航 - 移除验证提示，只做切换
async function nextFormPage() {
  if (formCurrentPage.value < formTotalPages.value) {
    formCurrentPage.value++
  }
}

function prevFormPage() {
  if (formCurrentPage.value > 1) {
    formCurrentPage.value--
  }
}

// 格口点击处理 - 移除所有提示，只更新选中状态
function handleGrilleClick(grilleId) {
  const target = grilles.value.find((item) => item.grille_id === grilleId)
  if (!target) return

  // 只更新高亮状态
  activeGrilleId.value = grilleId

  // 只有空闲格口才能被选中
  if (target.status === 'idle') {
    form.preferredGrilleId = grilleId
  }
}

function jumpToGrillePage(grilleId) {
  const index = sortedGrilles.value.findIndex(g => g.grille_id === grilleId)
  if (index !== -1) {
    const targetPage = Math.floor(index / pageSize.value) + 1
    if (targetPage !== currentPage.value) {
      currentPage.value = targetPage
    }
  }
}

function syncPreferredGrille() {
  if (form.preferredGrilleId) {
    const existing = grilles.value.find(g => g.grille_id === form.preferredGrilleId)
    if (existing && existing.status === 'idle') {
      activeGrilleId.value = form.preferredGrilleId
      jumpToGrillePage(form.preferredGrilleId)
      return
    }
    form.preferredGrilleId = ''
    activeGrilleId.value = ''
  }

  if (!form.preferredGrilleId && idleGrilles.value.length) {
    const firstIdle = idleGrilles.value[0].grille_id
    form.preferredGrilleId = firstIdle
    activeGrilleId.value = firstIdle
    jumpToGrillePage(firstIdle)
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
  const target = grilles.value.find((grille) => grille.grille_id === item.grille_id)
  if (target) {
    target.status = 'occupied'
    target.logisticsId = item.logisticsId
  }
}

// 填充演示数据
function fillDemo() {
  // 先跳转到第一页
  formCurrentPage.value = 1

  // 填充数据
  form.receiverName = '张三'
  form.receiverPhone = '13812345678'
  form.receiverEmail = 'qq3392313023@163.com'
  form.receiverCity = '上海市'
  form.receiverArea = '浦东新区'
  form.receiverAddress = '世纪大道100号'
  form.senderName = '李四'
  form.senderPhone = '13987654321'
  form.senderEmail = 'qq3392313023@163.com'
  form.senderCity = '北京市'
  form.senderArea = '朝阳区'
  form.senderAddress = '建国门外大街1号'
  form.itemName = '电子产品'
  form.itemNum = 1
  form.itemWeight = 2.5
  form.packageNums = 1
  form.remark = '易碎物品，请轻拿轻放'

  // 清除所有表单验证状态
  nextTick(() => {
    formRef.value?.clearValidate()
  })

  if (idleGrilles.value.length) {
    const firstIdle = idleGrilles.value[0].grille_id
    form.preferredGrilleId = firstIdle
    activeGrilleId.value = firstIdle
    jumpToGrillePage(firstIdle)
  }

  ElMessage.success('演示数据已填充')
}

async function submitInbound() {
  // 清除验证状态
  formRef.value?.clearValidate()

  // 验证所有字段
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请填写完整的表单信息')
    return
  }

  const selectedGrille = grilles.value.find(g => g.grille_id === form.preferredGrilleId)
  if (!selectedGrille || selectedGrille.status !== 'idle') {
    ElMessage.error('请选择一个空闲格口')
    return
  }

  submitting.value = true
  try {
    const payload = { ...form }
    const created = await createItem(payload)
    const assigned = await assignGrilles({
      logistics_ids: [created.data.logisticsId],
      preferred_grille_id: form.preferredGrilleId
    })
    result.value = assigned.data.list[0]
    applyInboundResult(result.value)
    await loadDashboard()
    ElMessage.success('🎉 包裹已完成入柜')
    setTimeout(() => {
      if (result.value) {
        result.value = null
      }
    }, 5000)
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
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.entry-panel,
.cabinet-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.panel-heading {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.panel-heading h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.panel-heading p {
  margin: 8px 0 0;
  color: #909399;
  font-size: 13px;
}

.form-steps {
  margin-bottom: 30px;
  padding: 0 10px;
}

.form-container {
  flex: 1;
  min-height: 450px;
}

.form-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.form-section {
  margin-bottom: 20px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  padding-left: 8px;
  border-left: 3px solid #67c23a;
}

.form-pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.confirm-info {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.info-group {
  margin-bottom: 20px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.info-group h5 {
  margin: 0 0 12px 0;
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
}

.info-group p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.6;
}

.info-group p span {
  font-weight: 500;
  color: #606266;
  display: inline-block;
  width: 80px;
}

.selected-grille-info {
  color: #67c23a !important;
  font-weight: 500 !important;
}

.result-box {
  margin-top: 18px;
  border: 1px solid #e4e7ed;
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
  color: #606266;
  font-size: 14px;
}

.cabinet-visual {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pagination-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.page-info {
  font-size: 14px;
  color: #909399;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  min-height: 400px;
  flex: 1;
}

.status-cell {
  border-radius: 8px;
  padding: 12px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  border: 2px solid transparent;
}

.status-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-cell strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.status-cell span {
  display: block;
  font-size: 11px;
}

.status-cell small {
  display: block;
  font-size: 10px;
  margin-top: 4px;
}

.status-cell.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 空闲 - 绿色 */
.status-idle {
  background: #f0f9eb;
  border-color: #b3e19d;
}
.status-idle strong {
  color: #67c23a;
}
.status-idle span {
  color: #67c23a;
}
.status-idle:hover {
  background: #e1f3d8;
  border-color: #95d475;
}

/* 占用 - 蓝色 */
.status-occupied {
  background: #ecf5ff;
  border-color: #a6c9ff;
}
.status-occupied strong {
  color: #409eff;
}
.status-occupied span {
  color: #409eff;
}
.status-occupied:hover {
  background: #d9ecff;
  border-color: #8cb8ff;
}

/* 停用 - 红色 */
.status-disabled {
  background: #fef0f0;
  border-color: #fbc4c4;
  cursor: not-allowed;
}
.status-disabled strong {
  color: #f56c6c;
}
.status-disabled span {
  color: #f56c6c;
}
.status-disabled:hover {
  transform: none;
  box-shadow: none;
}

.pagination-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
}

.table-panel {
  border-top: 1px solid #e4e7ed;
  padding-top: 20px;
  margin-top: 20px;
}

.status-created,
.status-stored,
.status-picked {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
}

.status-created {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-stored {
  background: #ecf5ff;
  color: #409eff;
}

.status-picked {
  background: #f0f9eb;
  color: #67c23a;
}

@media (max-width: 1200px) {
  .status-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1080px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .status-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
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