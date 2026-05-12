<template>
  <div class="page-shell">
    <div class="page-title">
      <div>
        <h1>用户管理</h1>
        <p>管理系统用户、角色、状态，并支持新增、编辑、删除与密码重置。</p>
      </div>
      <el-button type="primary" @click="openCreate">新增用户</el-button>
    </div>

    <section class="glass-card content-panel">
      <div class="toolbar">
        <el-input v-model="filters.keyword" placeholder="按账号、昵称、手机号搜索" clearable />
        <el-select v-model="filters.role" placeholder="角色筛选" clearable>
          <el-option label="管理员" value="admin" />
          <el-option label="快递员" value="courier" />
          <el-option label="普通用户" value="user" />
        </el-select>
        <el-button type="primary" @click="applyFilters">查询</el-button>
      </div>

      <el-table :data="pagedUsers" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="账号" min-width="140" />
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="角色" min-width="120">
          <template #default="{ row }">{{ roleText(row.role) }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <span class="status-tag" :class="row.status === 'enabled' ? 'status-idle' : 'status-disabled'">
              {{ row.status === 'enabled' ? '启用' : '停用' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最近登录" min-width="180" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="{ row }">
            <el-button text @click="openEdit(row)">编辑</el-button>
            <el-button text @click="handleResetPassword(row)">重置密码</el-button>
            <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="list-footer">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          background
          layout="total, prev, pager, next"
          :total="filteredUsers.length"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑用户' : '新增用户'" width="540px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="账号" prop="username"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="昵称" prop="nickname"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="手机号" prop="phone"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱" prop="email"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="快递员" value="courier" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-segmented v-model="form.status" :options="statusOptions" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始密码" prop="password">
          <el-input v-model="form.password" show-password />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createUser, deleteUser, fetchUsers, resetUserPassword, updateUser } from '../../api'

const phonePattern = /^1\d{10}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const users = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(0)
const formRef = ref(null)

const filters = reactive({
  keyword: '',
  role: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 8
})

const form = reactive({
  username: '',
  nickname: '',
  phone: '',
  email: '',
  role: 'courier',
  status: 'enabled',
  password: '123456'
})

const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' }
]

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: phonePattern, message: '请输入合法的 11 位手机号', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { pattern: emailPattern, message: '请输入合法邮箱', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }]
}

const filteredUsers = computed(() => users.value.filter((item) => {
  const keyword = filters.keyword.trim()
  const matchKeyword = !keyword || [item.username, item.nickname, item.phone, item.email].some((value) => value?.includes(keyword))
  const matchRole = !filters.role || item.role === filters.role
  return matchKeyword && matchRole
}))

const pagedUsers = computed(() => {
  const start = (pagination.page - 1) * pagination.pageSize
  return filteredUsers.value.slice(start, start + pagination.pageSize)
})

watch(() => [filters.keyword, filters.role], () => {
  pagination.page = 1
})

function roleText(role) {
  return { admin: '管理员', courier: '快递员', user: '普通用户' }[role] || role
}

function resetForm() {
  Object.assign(form, {
    username: '',
    nickname: '',
    phone: '',
    email: '',
    role: 'courier',
    status: 'enabled',
    password: '123456'
  })
}

async function loadUsers() {
  loading.value = true
  try {
    const response = await fetchUsers()
    users.value = response.data.list
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
}

function openCreate() {
  editingId.value = 0
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.ID
  Object.assign(form, structuredClone({
    username: row.username,
    nickname: row.nickname,
    phone: row.phone,
    email: row.email,
    role: row.role,
    status: row.status,
    password: '123456'
  }))
  dialogVisible.value = true
}

async function submitUser() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    if (editingId.value) {
      await updateUser(editingId.value, { ...form })
    } else {
      await createUser({ ...form })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadUsers()
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error?.message || '保存失败')
  }
}

async function handleResetPassword(row) {
  try {
    await ElMessageBox.confirm(`确认重置 ${row.username} 的密码？`, '提示')
    await resetUserPassword(row.ID)
    ElMessage.success('密码已重置为 123456')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.msg || error?.message || '重置失败')
    }
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除 ${row.username}？`, '提示')
    await deleteUser(row.ID)
    ElMessage.success('用户已删除')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.msg || error?.message || '删除失败')
    }
  }
}

onMounted(loadUsers)
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
