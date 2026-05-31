<template>
  <div class="public-page">
    <PublicTopNav />

    <div class="page-shell backup-wrap">
      <section class="glass-card backup-card">
        <div class="card-heading">
          <div>
            <h2>退换包裹</h2>
            <p>选择需要退换的包裹，系统将自动填充信息并分配新格口。</p>
          </div>
        </div>

        <el-alert
            class="profile-alert"
            type="info"
            :closable="false"
            show-icon
            :title="`当前会话用户：${userDisplayName}`"
            :description="userDisplayPhone"
        />

        <div class="backup-grid">
          <!-- 左侧：包裹选择列表 -->
          <section class="packages-panel">
            <div class="panel-header">
              <h3>📦 选择需要退换的包裹</h3>
              <el-button type="primary" plain size="small" :loading="loadingPackages" @click="loadMyPackages">
                刷新包裹列表
              </el-button>
            </div>

            <div v-if="packages.length" class="packages-list">
              <div
                  v-for="item in packages"
                  :key="item.logisticsId || item.logistics_id"
                  class="package-card"
                  :class="{
                  active: selectedPackageId === (item.logisticsId || item.logistics_id),
                  disabled: item.status === 'picked_up'
                }"
                  @click="selectPackage(item)"
              >
                <div class="package-card-header">
                  <el-radio
                      :model-value="selectedPackageId === (item.logisticsId || item.logistics_id)"
                      :disabled="item.status === 'picked_up'"
                      @click.stop
                      @change="() => selectPackage(item)"
                  />
                  <strong>{{ item.itemName || item.item_name || '未命名包裹' }}</strong>
                  <span class="status-badge" :class="getPackageStatusClass(item.status)">
                    {{ getPackageStatusText(item.status) }}
                  </span>
                </div>
                <div class="package-card-info">
                  <div class="info-row">
                    <span>📋 物流单号：{{ (item.logisticsId || item.logistics_id || '-').slice(-12) }}</span>
                    <span>🔢 取件码：{{ item.pickupCode || item.pickup_code || '-' }}</span>
                  </div>
                  <div class="info-row">
                    <span>📍 格口：{{ item.grille_id || '未分配' }}</span>
                    <span>📅 入柜时间：{{ formatDate(item.inbound_at || item.created_at) }}</span>
                  </div>
                  <div class="info-row" v-if="item.receiverPhone || item.receiver_phone">
                    <span>📞 收件人：{{ item.receiverName || item.receiver_name || '-' }} / {{ item.receiverPhone || item.receiver_phone }}</span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无待取包裹" :image-size="120">
              <template #description>
                <span>暂无待取包裹<br>请先完成用户验证</span>
              </template>
            </el-empty>
          </section>

          <!-- 右侧：退换表单 -->
          <section class="form-panel">
            <div class="panel-header">
              <h3>📝 退换申请表单</h3>
              <span class="form-tip">请填写退换原因</span>
            </div>

            <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="寄件人" prop="senderName">
                    <el-input v-model="form.senderName" placeholder="自动填充" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="寄件手机号" prop="senderPhone">
                    <el-input v-model="form.senderPhone" placeholder="自动填充" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="收件人" prop="receiverName">
                    <el-input v-model="form.receiverName" placeholder="退换中心" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="收件手机号" prop="receiverPhone">
                    <el-input v-model="form.receiverPhone" placeholder="退换中心电话" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="退换商品" prop="itemName">
                    <el-input v-model="form.itemName" placeholder="原包裹商品名称" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="数量" prop="itemNum">
                    <el-input-number v-model="form.itemNum" :min="1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="重量(kg)" prop="itemWeight">
                    <el-input-number v-model="form.itemWeight" :min="0.1" :step="0.1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="包裹数" prop="packageNums">
                    <el-input-number v-model="form.packageNums" :min="1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="退换原因" prop="remark">
                    <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请详细描述退换原因" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-button type="primary" :loading="submitting" @click="submitBackup" :disabled="!selectedPackageId">
                {{ submitting ? '处理中...' : '提交退换申请' }}
              </el-button>
            </el-form>

            <!-- 提交结果 -->
            <div v-if="result" class="result-box">
              <h4>✅ 退换申请成功</h4>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="原包裹物流单号">{{ result.originalLogisticsId }}</el-descriptions-item>
                <el-descriptions-item label="原包裹状态">
                  <span class="status-success">✓ 已取件</span>
                </el-descriptions-item>
                <el-descriptions-item label="新物流单号">{{ result.newLogisticsId }}</el-descriptions-item>
                <el-descriptions-item label="新取件码">
                  <span class="pickup-code">{{ result.newPickupCode }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="新格口">{{ result.newGrilleId }}</el-descriptions-item>
                <el-descriptions-item label="柜体">{{ result.newCabinetCode }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PublicTopNav from '../../components/PublicTopNav.vue'
import { assignGrilles, createItem, fetchUserItems, packageOut } from '../../api'
import { useAuthStore } from '../../stores/auth'

const phonePattern = /^1\d{10}$/

const auth = useAuthStore()
const formRef = ref(null)
const submitting = ref(false)
const loadingPackages = ref(false)
const result = ref(null)
const packages = ref([])
const selectedPackageId = ref('')
const selectedOriginalPackage = ref(null) // 保存选中的原包裹信息

const form = reactive({
  receiverName: '退换中心',
  receiverPhone: '4008886666',
  receiverEmail: '',
  receiverCity: '上海市',
  receiverArea: '静安区',
  receiverAddress: '品牌退换中心',
  senderName: '',
  senderPhone: '',
  senderEmail: '',
  senderCity: '上海市',
  senderArea: '静安区',
  senderAddress: '用户上门寄件',
  itemName: '',
  itemNum: 1,
  itemWeight: 0.5,
  packageNums: 1,
  remark: ''
})

const rules = {
  senderName: [{ required: true, message: '请输入寄件人', trigger: 'blur' }],
  senderPhone: [
    { required: true, message: '请输入寄件手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  receiverName: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  receiverPhone: [
    { required: true, message: '请输入收件手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  itemName: [{ required: true, message: '请输入退换商品', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入退换原因', trigger: 'blur' }]
}

// 计算属性显示用户信息
const userDisplayName = computed(() => {
  if (auth.userProfile) {
    return auth.userProfile.nickname || auth.userProfile.name || auth.userProfile.username || '已登录用户'
  }
  return '未登录（请先完成用户验证）'
})

const userDisplayPhone = computed(() => {
  if (auth.userProfile?.phone) {
    return `手机号：${auth.userProfile.phone}`
  }
  return '请先完成用户验证后再使用该页面'
})

// 获取包裹状态样式
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

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 加载用户的包裹列表
async function loadMyPackages() {
  const phone = auth.userProfile?.phone

  if (!phone) {
    ElMessage.warning('请先完成用户验证')
    return
  }

  loadingPackages.value = true
  try {
    const response = await fetchUserItems(phone)
    // 只显示待取件和待入柜的包裹（已取件的不显示）
    const allPackages = response.data?.list || []
    packages.value = allPackages.filter(p => p.status !== 'picked_up')

    if (packages.value.length === 0) {
      ElMessage.info('暂无待取包裹')
    } else {
      ElMessage.success(`加载了 ${packages.value.length} 个待取包裹`)
    }
  } catch (error) {
    console.error('加载包裹失败:', error)
    ElMessage.error(error?.response?.data?.msg || error?.message || '加载失败')
  } finally {
    loadingPackages.value = false
  }
}

// 选择包裹并自动填充表单
function selectPackage(pkg) {
  if (pkg.status === 'picked_up') {
    ElMessage.warning('该包裹已取件，无法退换')
    return
  }

  const pkgId = pkg.logisticsId || pkg.logistics_id
  selectedPackageId.value = pkgId
  selectedOriginalPackage.value = pkg // 保存原包裹信息

  // 自动填充表单信息
  form.senderName = pkg.receiverName || pkg.receiver_name || auth.userProfile?.nickname || ''
  form.senderPhone = pkg.receiverPhone || pkg.receiver_phone || auth.userProfile?.phone || ''
  form.itemName = `[退换] ${pkg.itemName || pkg.item_name || ''}`
  form.itemNum = pkg.itemNum || pkg.item_num || 1
  form.itemWeight = pkg.itemWeight || pkg.item_weight || 0.5
  form.packageNums = pkg.packageNums || pkg.package_nums || 1
  form.receiverEmail = "qq3392313023@163.com"
  form.senderEmail = "qq3392313023@163.com"

  ElMessage.success(`已选中包裹：${pkg.itemName || pkg.item_name}，请填写退换原因后提交`)
}

// 填充用户信息（从auth）
function fillUserInfo() {
  if (auth.userProfile) {
    if (!form.senderName) form.senderName = auth.userProfile.nickname || auth.userProfile.name || ''
    if (!form.senderPhone) form.senderPhone = auth.userProfile.phone || ''
  }
}

// 提交退换申请
async function submitBackup() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (!selectedPackageId.value || !selectedOriginalPackage.value) {
    ElMessage.warning('请先选择一个需要退换的包裹')
    return
  }

  submitting.value = true
  result.value = null

  try {
    const originalLogisticsId = selectedOriginalPackage.value.logisticsId || selectedOriginalPackage.value.logistics_id
    console.log('标记原包裹为已取件:', originalLogisticsId)

    await packageOut({ logistics_ids: [originalLogisticsId] })

    const created = await createItem({ ...form })
    const newLogisticsId = created.data.logisticsId

    const assigned = await assignGrilles({
      logistics_ids: [newLogisticsId]
    })

    const newPackageInfo = assigned.data.list[0]

    // 设置结果显示
    result.value = {
      originalLogisticsId: originalLogisticsId,
      newLogisticsId: newLogisticsId,
      newPickupCode: newPackageInfo.pickup_code,
      newGrilleId: newPackageInfo.grille_id,
      newCabinetCode: newPackageInfo.cabinet_code
    }

    ElMessage.success('退换申请已提交，原包裹已取出，新格口已分配')

    // 刷新包裹列表（原包裹已被标记为已取件，不会再显示）
    await loadMyPackages()

    selectedPackageId.value = ''
    selectedOriginalPackage.value = null

    form.itemName = ''
    form.remark = ''

  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error?.response?.data?.msg || error?.message || '提交失败')

    // 如果出错，提示用户联系客服
    if (error?.response?.data?.msg?.includes('already') || error?.message?.includes('already')) {
      ElMessage.error('包裹状态异常，请刷新页面后重试')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fillUserInfo()
  if (auth.userProfile?.phone) {
    loadMyPackages()
  }
})
</script>

<style scoped>
.public-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.backup-wrap {
  padding: 24px 0 36px;
}

.backup-card {
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

.profile-alert {
  margin-top: 18px;
}

.backup-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(400px, 0.8fr);
  gap: 18px;
}

.packages-panel,
.form-panel {
  border: 1px solid var(--line-color);
  border-radius: 12px;
  padding: 18px;
  background: #f9fafb;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.form-tip {
  font-size: 12px;
  color: var(--text-muted);
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.package-card {
  border: 2px solid var(--line-color);
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.package-card:hover:not(.disabled) {
  transform: translateX(4px);
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.package-card.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.package-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f1f5f9;
}

.package-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.package-card-header strong {
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

.package-card-info {
  margin-left: 28px;
}

.info-row {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.info-row:last-child {
  margin-bottom: 0;
}

.result-box {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--line-color);
}

.result-box h4 {
  margin: 0 0 12px 0;
  color: #10b981;
}

.pickup-code {
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  color: #f59e0b;
}

.status-success {
  color: #10b981;
  font-weight: bold;
}

@media (max-width: 980px) {
  .card-heading,
  .backup-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>