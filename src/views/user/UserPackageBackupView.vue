<template>
  <div class="public-page">
    <PublicTopNav />

    <div class="page-shell backup-wrap">
      <section class="glass-card backup-card">
        <div class="card-heading">
          <div>
            <h2>退换包裹</h2>
            <p>该页面复用入柜主流程，用于用户发起退换件申请并占用新格口。</p>
          </div>
          <el-button plain @click="fillFromProfile">读取当前用户信息</el-button>
        </div>

        <el-alert
          class="profile-alert"
          type="info"
          :closable="false"
          show-icon
          :title="`当前会话用户：${auth.userProfile?.nickname || '未识别'}`"
          :description="auth.userProfile?.phone ? `手机号：${auth.userProfile.phone}` : '请先完成用户验证后再使用该页面'"
        />

        <div class="backup-grid">
          <section class="form-panel">
            <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
              <el-row :gutter="16">
                <el-col :span="12"><el-form-item label="收件人" prop="receiverName"><el-input v-model="form.receiverName" /></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="收件手机号" prop="receiverPhone"><el-input v-model="form.receiverPhone" /></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="寄件人" prop="senderName"><el-input v-model="form.senderName" /></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="寄件手机号" prop="senderPhone"><el-input v-model="form.senderPhone" /></el-form-item></el-col>
                <el-col :span="24"><el-form-item label="退换商品" prop="itemName"><el-input v-model="form.itemName" /></el-form-item></el-col>
                <el-col :span="8"><el-form-item label="数量" prop="itemNum"><el-input-number v-model="form.itemNum" :min="1" style="width: 100%" /></el-form-item></el-col>
                <el-col :span="8"><el-form-item label="重量(kg)" prop="itemWeight"><el-input-number v-model="form.itemWeight" :min="0.1" :step="0.1" style="width: 100%" /></el-form-item></el-col>
                <el-col :span="8"><el-form-item label="包裹数" prop="packageNums"><el-input-number v-model="form.packageNums" :min="1" style="width: 100%" /></el-form-item></el-col>
                <el-col :span="24"><el-form-item label="退换原因" prop="remark"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item></el-col>
              </el-row>
              <el-button type="primary" :loading="submitting" @click="submitBackup">提交退换件</el-button>
            </el-form>
          </section>

          <section class="result-panel">
            <h3>处理结果</h3>
            <p>提交成功后会返回新的格口和取件码。</p>

            <el-empty v-if="!result" description="还没有生成退换件记录" />

            <el-descriptions v-else :column="1" border>
              <el-descriptions-item label="物流单号">{{ result.logisticsId }}</el-descriptions-item>
              <el-descriptions-item label="取件码">{{ result.pickupCode }}</el-descriptions-item>
              <el-descriptions-item label="格口">{{ result.grille_id }}</el-descriptions-item>
              <el-descriptions-item label="柜体">{{ result.cabinetCode }}</el-descriptions-item>
            </el-descriptions>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PublicTopNav from '../../components/PublicTopNav.vue'
import { assignGrilles, createItem } from '../../api'
import { useAuthStore } from '../../stores/auth'

const phonePattern = /^1\d{10}$/

const auth = useAuthStore()
const formRef = ref(null)
const submitting = ref(false)
const result = ref(null)

const form = reactive({
  receiverName: '',
  receiverPhone: '',
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
  remark: '退换申请'
})

const rules = {
  receiverName: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  receiverPhone: [
    { required: true, message: '请输入收件手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  senderName: [{ required: true, message: '请输入寄件人', trigger: 'blur' }],
  senderPhone: [
    { required: true, message: '请输入寄件手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  itemName: [{ required: true, message: '请输入退换商品', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入退换原因', trigger: 'blur' }]
}

function fillFromProfile() {
  Object.assign(form, {
    senderName: auth.userProfile?.nickname || '',
    senderPhone: auth.userProfile?.phone || ''
  })
}

async function submitBackup() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const created = await createItem({ ...form })
    const assigned = await assignGrilles({
      logistics_ids: [created.data.logisticsId]
    })
    result.value = assigned.data.list[0]
    ElMessage.success('退换件已提交并分配格口')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fillFromProfile)
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
}

.card-heading h2 {
  margin: 0;
  font-size: 22px;
}

.card-heading p,
.result-panel p {
  margin: 10px 0 0;
  color: var(--text-muted);
}

.profile-alert {
  margin-top: 18px;
}

.backup-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 18px;
}

.form-panel,
.result-panel {
  border: 1px solid var(--line-color);
  border-radius: 10px;
  padding: 18px;
  background: #f9fafb;
}

.result-panel h3 {
  margin: 0;
  font-size: 18px;
}

@media (max-width: 980px) {
  .card-heading,
  .backup-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
