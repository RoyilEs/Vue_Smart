<template>
  <div class="page-shell" v-loading="loading">
    <div class="page-title">
      <div>
        <h1>系统设置</h1>
        <p>按配置分组展示系统参数，支持读取与保存。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="saveAll">保存配置</el-button>
    </div>

    <div class="metric-grid" style="margin-bottom: 20px">
      <div class="metric-card">
        <div class="label">站点名称</div>
        <div class="value">{{ basic.siteName || '-' }}</div>
      </div>
      <div class="metric-card">
        <div class="label">取件时限</div>
        <div class="value">{{ basic.pickupTimeoutHours || 0 }}h</div>
      </div>
      <div class="metric-card">
        <div class="label">取件码长度</div>
        <div class="value">{{ pickup.codeLength || 0 }}</div>
      </div>
    </div>

    <div class="two-column">
      <section class="glass-card content-panel">
        <div class="page-title">
          <div>
            <h3>基础配置</h3>
            <p>柜机站点、支持电话、营业阈值。</p>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="站点名称"><el-input v-model="basic.siteName" /></el-form-item>
          <el-form-item label="支持电话"><el-input v-model="basic.supportPhone" /></el-form-item>
          <el-form-item label="取件时限(小时)"><el-input-number v-model="basic.pickupTimeoutHours" :min="1" style="width: 100%" /></el-form-item>
          <el-form-item label="温度告警阈值"><el-input-number v-model="basic.temperatureThreshold" :min="1" style="width: 100%" /></el-form-item>
        </el-form>
      </section>

      <section class="glass-card content-panel">
        <div class="page-title">
          <div>
            <h3>取件规则</h3>
            <p>取件码长度、短信提醒、匿名查询等。</p>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="取件码长度"><el-input-number v-model="pickup.codeLength" :min="4" :max="8" style="width: 100%" /></el-form-item>
          <el-form-item label="动画速度">
            <el-select v-model="pickup.animationSpeed" style="width: 100%">
              <el-option label="慢速" value="slow" />
              <el-option label="正常" value="normal" />
              <el-option label="快速" value="fast" />
            </el-select>
          </el-form-item>
          <el-form-item label="短信提醒"><el-switch v-model="pickup.smsReminder" /></el-form-item>
          <el-form-item label="允许匿名查询"><el-switch v-model="pickup.allowAnonymousLookup" /></el-form-item>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchSettings, saveSettings } from '../../api'

const loading = ref(false)
const saving = ref(false)

const basic = reactive({
  siteName: '',
  supportPhone: '',
  pickupTimeoutHours: 48,
  temperatureThreshold: 28
})

const pickup = reactive({
  codeLength: 6,
  animationSpeed: 'normal',
  smsReminder: true,
  allowAnonymousLookup: true
})

async function loadSettings() {
  loading.value = true
  try {
    const [basicResponse, pickupResponse] = await Promise.all([
      fetchSettings('basic'),
      fetchSettings('pickup')
    ])
    Object.assign(basic, basicResponse.data)
    Object.assign(pickup, pickupResponse.data)
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '系统配置加载失败')
  } finally {
    loading.value = false
  }
}

async function saveAll() {
  saving.value = true
  try {
    await Promise.all([
      saveSettings('basic', { ...basic }),
      saveSettings('pickup', { ...pickup })
    ])
    ElMessage.success('系统配置已保存')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>
