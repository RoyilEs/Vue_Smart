<template>
  <div class="public-page">
    <PublicTopNav />

    <div class="page-shell public-wrap">
      <section class="glass-card query-card">
        <div class="card-heading">
          <div>
            <h2>公共快递查询</h2>
            <p>支持按快递单号或手机号查询包裹状态、格口位置和处理进度。</p>
          </div>
          <el-button type="primary" plain @click="router.push('/pickup')">去取件</el-button>
        </div>

        <div class="query-toolbar">
          <el-radio-group v-model="searchMode">
            <el-radio-button :value="'logistics'">快递单号</el-radio-button>
            <el-radio-button :value="'phone'">手机号</el-radio-button>
          </el-radio-group>

          <el-input
            v-model="keyword"
            :placeholder="searchMode === 'logistics' ? '输入快递单号' : '输入收件手机号'"
            clearable
            @keyup.enter="handleSearch"
          />

          <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
        </div>

        <div class="metric-grid stats-grid">
          <div class="metric-card">
            <div class="label">查询结果</div>
            <div class="value">{{ list.length }}</div>
          </div>
          <div class="metric-card">
            <div class="label">待取件</div>
            <div class="value">{{ list.filter((item) => item.status === 'stored').length }}</div>
          </div>
          <div class="metric-card">
            <div class="label">待入柜</div>
            <div class="value">{{ list.filter((item) => item.status === 'created').length }}</div>
          </div>
        </div>

        <div class="result-grid">
          <article v-for="item in list" :key="item.logisticsId" class="package-card">
            <div class="package-head">
              <div>
                <h3>{{ item.itemName }}</h3>
                <p>{{ item.logisticsId }}</p>
              </div>
              <span class="status-tag" :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
            </div>

            <div class="info-grid">
              <div>
                <span>收件人</span>
                <strong>{{ item.receiverName }} / {{ item.receiverPhone }}</strong>
              </div>
              <div>
                <span>柜体</span>
                <strong>{{ item.cabinetCode || '未入柜' }}</strong>
              </div>
              <div>
                <span>格口</span>
                <strong>{{ item.grille_id || '未分配' }}</strong>
              </div>
              <div>
                <span>状态时间</span>
                <strong>{{ item.outboundAt || item.inboundAt || item.UpdatedAt || item.CreatedAt || '-' }}</strong>
              </div>
            </div>
          </article>

          <el-empty v-if="!loading && !list.length" description="暂无查询结果" class="empty-block" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PublicTopNav from '../../components/PublicTopNav.vue'
import { getItemsByPhone, searchItems } from '../../api'

const router = useRouter()
const keyword = ref('')
const searchMode = ref('logistics')
const loading = ref(false)
const list = ref([])

function statusClass(status) {
  return {
    created: 'status-created',
    stored: 'status-stored',
    occupied: 'status-occupied',
    picked_up: 'status-picked'
  }[status] || 'status-idle'
}

function statusText(status) {
  return {
    created: '待入柜',
    stored: '待取件',
    picked_up: '已取件',
    occupied: '已占用'
  }[status] || '空闲'
}

async function handleSearch() {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入查询内容')
    return
  }

  loading.value = true
  try {
    const response = searchMode.value === 'phone'
      ? await getItemsByPhone(keyword.value.trim())
      : await searchItems(keyword.value.trim())
    list.value = response.data.list || []
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '查询失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.public-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.public-wrap {
  padding: 24px 0 36px;
}

.query-card {
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

.card-heading p {
  margin: 10px 0 0;
  color: var(--text-muted);
}

.query-toolbar {
  margin-top: 20px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.stats-grid {
  margin-top: 20px;
}

.result-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.package-card {
  border: 1px solid var(--line-color);
  border-radius: 10px;
  padding: 18px;
  background: #f9fafb;
}

.package-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.package-head h3 {
  margin: 0;
  font-size: 18px;
}

.package-head p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.info-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.info-grid span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-block {
  grid-column: 1 / -1;
  border: 1px dashed var(--line-color);
  border-radius: 10px;
  background: #f9fafb;
}

@media (max-width: 768px) {
  .card-heading {
    flex-direction: column;
  }

  .query-toolbar {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
