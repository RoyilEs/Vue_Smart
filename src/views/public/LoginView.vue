<template>
  <div class="public-page">
    <PublicTopNav />

    <div class="page-shell login-wrap">
      <section class="glass-card login-card">
        <div class="card-heading">
          <h2>管理员/快递员登录</h2>
          <p>选择角色后使用对应演示账号登录。</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
          <el-form-item label="登录角色">
            <el-select v-model="form.role" placeholder="请选择角色" @change="applyDemoAccount">
              <el-option label="管理员" value="admin" />
              <el-option label="快递员" value="courier" />
            </el-select>
          </el-form-item>

          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" placeholder="请输入账号" />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" show-password placeholder="请输入密码" />
          </el-form-item>

          <el-button type="primary" :loading="submitting" class="submit-btn" @click="handleSubmit">
            登录
          </el-button>
        </el-form>

        <p class="account-tip">管理员：admin / 123456　快递员：courier / 123456</p>

        <div class="quick-links">
          <el-button text @click="router.push('/pickup')">用户取件入口</el-button>
          <el-button text @click="router.push('/query')">公共快递查询</el-button>
        </div>

      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PublicTopNav from '../../components/PublicTopNav.vue'
import { login } from '../../api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref(null)
const submitting = ref(false)

const form = reactive({
  role: 'admin',
  username: 'admin',
  password: '123456'
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

function applyDemoAccount(role) {
  form.username = role === 'admin' ? 'admin' : 'courier'
  form.password = '123456'
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const response = await login({
      username: form.username,
      password: form.password
    })
    const actualRole = response.data.profile.role || response.data.profile.permission

    if (actualRole !== form.role) {
      ElMessage.error('当前账号与所选登录角色不一致')
      return
    }

    auth.setStaffSession({
      token: response.data.token,
      role: actualRole,
      profile: response.data.profile
    })
    ElMessage.success(response.msg)
    router.push(actualRole === 'admin' ? '/admin/users' : '/courier/inbound')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '登录失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.public-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.login-wrap {
  min-height: calc(100vh - 64px);
  display: grid;
  place-items: center;
  padding: 24px 0;
}

.login-card {
  width: min(100%, 460px);
  padding: 28px;
}

.card-heading {
  margin-bottom: 20px;
}

.card-heading h2 {
  margin: 0;
  font-size: 22px;
}

.card-heading p {
  margin: 10px 0 0;
  color: var(--text-muted);
}

.submit-btn {
  width: 100%;
}

.account-tip {
  margin: 14px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.quick-links {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}

</style>
