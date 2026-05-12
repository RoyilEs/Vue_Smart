import Mock from 'mockjs'
import {
  appendLog,
  generateLogisticsId,
  generatePickupCode,
  getDatabase,
  sanitizeUser,
  saveDatabase
} from './database'

Mock.setup({
  timeout: '300-700'
})

function ok(data, msg = '操作成功') {
  return { code: 0, data, msg }
}

function fail(msg = '操作失败', code = 1) {
  return { code, data: null, msg }
}

function getPathSegments(url) {
  return url.replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('/').filter(Boolean)
}

function parseBody(options) {
  return options.body ? JSON.parse(options.body) : {}
}

function withDatabase(mutator) {
  const db = structuredClone(getDatabase())
  const result = mutator(db)
  saveDatabase(db)
  return result
}

function enrichPackage(item, db) {
  const grille = db.grilles.find((grid) => grid.id === item.grille_id)
  return {
    ...item,
    cabinetId: grille?.cabinetId || item.cabinetId || '',
    cabinetCode: grille?.cabinetCode || item.cabinetCode || '',
    x: grille?.x || item.x || 0,
    y: grille?.y || item.y || 0,
    z: grille?.z || item.z || 0,
    grilleStatus: grille?.status || item.grilleStatus || 'idle'
  }
}

Mock.mock(/\/api\/user_login$/, 'post', (options) => withDatabase((db) => {
  const { username, password } = parseBody(options)
  const user = db.users.find((item) => item.username === username && item.password === password)

  if (!user) {
    return fail('账号或密码不正确')
  }

  if (!['admin', 'courier'].includes(user.role)) {
    return fail('当前入口仅支持管理员和快递员登录')
  }

  user.lastLoginAt = new Date().toISOString()
  user.UpdatedAt = new Date().toISOString()
  return ok({
    token: user.token,
    profile: sanitizeUser(user)
  }, '登录成功')
}))

Mock.mock(/\/api\/user_update_password$/, 'put', (options) => withDatabase((db) => {
  const token = options.headers.token
  const { old_password: oldPassword, new_password: newPassword } = parseBody(options)
  const user = db.users.find((item) => item.token === token)

  if (!user) return fail('登录状态已失效')
  if (user.password !== oldPassword) return fail('旧密码不正确')

  user.password = newPassword
  user.UpdatedAt = new Date().toISOString()
  return ok({}, '密码修改成功')
}))

Mock.mock(/\/api\/users$/, 'get', () => {
  const db = getDatabase()
  return ok({
    count: db.users.length,
    list: db.users.map((item) => sanitizeUser(item))
  })
})

Mock.mock(/\/api\/users$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)
  const nextId = Math.max(...db.users.map((item) => item.ID), 0) + 1
  const item = {
    ID: nextId,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    DeletedAt: null,
    username: payload.username,
    email: payload.email || '',
    phone: payload.phone || '',
    password: payload.password || '123456',
    permission: payload.role,
    avatar: payload.avatar || '',
    token: `${payload.role}-${nextId}-${Mock.Random.string('lower', 8)}`,
    role_id: payload.role === 'admin' ? 1 : payload.role === 'courier' ? 2 : 3,
    role: payload.role,
    status: payload.status || 'enabled',
    lastLoginAt: '',
    nickname: payload.nickname || payload.username
  }
  db.users.unshift(item)
  return ok(sanitizeUser(item), '用户创建成功')
}))

Mock.mock(/\/api\/users\/\d+$/, 'put', (options) => withDatabase((db) => {
  const userId = Number(getPathSegments(options.url).at(-1))
  const payload = parseBody(options)
  const user = db.users.find((item) => item.ID === userId)

  if (!user) return fail('用户不存在')

  Object.assign(user, payload, {
    permission: payload.role || user.permission,
    UpdatedAt: new Date().toISOString()
  })

  return ok(sanitizeUser(user), '用户更新成功')
}))

Mock.mock(/\/api\/users\/\d+$/, 'delete', (options) => withDatabase((db) => {
  const userId = Number(getPathSegments(options.url).at(-1))
  db.users = db.users.filter((item) => item.ID !== userId)
  return ok({}, '用户删除成功')
}))

Mock.mock(/\/api\/users\/\d+\/reset_password$/, 'put', (options) => withDatabase((db) => {
  const userId = Number(getPathSegments(options.url).at(-2))
  const user = db.users.find((item) => item.ID === userId)

  if (!user) return fail('用户不存在')

  user.password = '123456'
  user.UpdatedAt = new Date().toISOString()
  return ok({}, '密码已重置为 123456')
}))

Mock.mock(/\/api\/settings\/[^/]+$/, 'get', (options) => {
  const db = getDatabase()
  const key = decodeURIComponent(getPathSegments(options.url).at(-1))
  const setting = db.settings[key]

  if (!setting) return fail('配置不存在', 404)
  return ok(setting)
})

Mock.mock(/\/api\/settings\/[^/]+$/, 'put', (options) => withDatabase((db) => {
  const key = decodeURIComponent(getPathSegments(options.url).at(-1))
  const payload = parseBody(options)
  const current = db.settings[key]

  if (!current) return fail('配置不存在', 404)

  db.settings[key] = { ...current, ...payload, value: payload.value || current.value }
  return ok(db.settings[key], '配置保存成功')
}))

Mock.mock(/\/api\/item_create$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)
  const nextId = Math.max(...db.packages.map((item) => item.ID), 0) + 1
  const item = {
    ID: nextId,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    DeletedAt: null,
    ...payload,
    logisticsId: generateLogisticsId(),
    pickupCode: generatePickupCode(),
    status: 'created',
    inboundAt: '',
    outboundAt: '',
    cabinetId: '',
    cabinetCode: '',
    x: 0,
    y: 0,
    z: 0,
    grille_id: '',
    grilleStatus: 'idle',
    remark: payload.remark || '',
    receiverToken: ''
  }

  db.packages.unshift(item)
  appendLog(db, item.logisticsId, 'created', '新包裹已创建，待入柜', '配送员')
  return ok(item, '包裹创建成功')
}))

Mock.mock(/\/api\/items\/[^/]+$/, 'get', (options) => {
  const db = getDatabase()
  const keyword = decodeURIComponent(getPathSegments(options.url).at(-1))
  const list = db.packages
    .filter((item) => [item.logisticsId, item.receiverPhone, item.itemName, item.receiverName].some((value) => value?.includes(keyword)))
    .map((item) => enrichPackage(item, db))

  return ok({ count: list.length, list }, list.length ? '查询成功' : '暂无匹配包裹')
})

Mock.mock(/\/api\/user_items\/[^/]+$/, 'get', (options) => {
  const db = getDatabase()
  const key = decodeURIComponent(getPathSegments(options.url).at(-1))
  const user = db.users.find((item) => item.phone === key || item.username === key)
  const list = db.packages
    .filter((item) => item.receiverPhone === user?.phone && item.status === 'stored')
    .map((item) => enrichPackage(item, db))

  return ok({ count: list.length, list }, list.length ? '查询成功' : '暂无待取包裹')
})

Mock.mock(/\/api\/grille_form_item_create$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)
  const logisticsIds = payload.logistics_ids || []
  const idleGrilles = [...db.grilles.filter((item) => item.status === 'idle')]

  if (idleGrilles.length < logisticsIds.length) return fail('空闲格口不足')

  const list = []
  for (let index = 0; index < logisticsIds.length; index += 1) {
    const logisticsId = logisticsIds[index]
    const targetPackage = db.packages.find((item) => item.logisticsId === logisticsId)

    let grille
    if (index === 0 && payload.preferred_grille_id) {
      const preferredIndex = idleGrilles.findIndex((item) => item.id === payload.preferred_grille_id)
      if (preferredIndex === -1) return fail('所选格口不可用')
      grille = idleGrilles.splice(preferredIndex, 1)[0]
    } else {
      grille = idleGrilles.shift()
    }

    if (!targetPackage || !grille) continue

    grille.status = 'occupied'
    grille.currentLogisticsId = logisticsId

    Object.assign(targetPackage, {
      status: 'stored',
      inboundAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      cabinetId: grille.cabinetId,
      cabinetCode: grille.cabinetCode,
      grille_id: grille.id,
      x: grille.x,
      y: grille.y,
      z: grille.z,
      grilleStatus: 'occupied'
    })

    list.push(enrichPackage(targetPackage, db))
    appendLog(db, logisticsId, 'stored', `已分配格口 ${grille.id}`, '配送员')
  }

  return ok({ count: list.length, list }, '格口分配成功')
}))

Mock.mock(/\/api\/grille_create$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)
  const count = Number(payload.count || 0)
  const matrix = Number(payload.matrix || 0)

  if (!matrix) {
    return fail('缺少 matrix 参数')
  }

  const startIndex = db.grilles.length

  for (let index = 0; index < count; index += 1) {
    const serial = startIndex + index + 1
    db.grilles.push({
      id: `G-${String(serial).padStart(3, '0')}`,
      cabinetId: 'CAB-01',
      cabinetCode: 'A区主柜',
      grille_id: `G-${String(serial).padStart(3, '0')}`,
      matrixRow: Math.floor((serial - 1) / matrix) + 1,
      matrixColumn: ((serial - 1) % matrix) + 1,
      layer: Math.floor((serial - 1) / matrix) + 1,
      x: ((serial - 1) % matrix) + 1,
      y: Math.floor((serial - 1) / matrix) + 1,
      z: 1,
      sizeType: payload.size || 'medium',
      status: 'idle',
      currentLogisticsId: '',
      remark: payload.remark || ''
    })
  }

  return ok({ count, list: db.grilles.slice(-count) }, '格口创建成功')
}))

Mock.mock(/\/api\/grilles$/, 'get', () => {
  const db = getDatabase()
  return ok({ count: db.grilles.length, list: db.grilles })
})

Mock.mock(/\/api\/grilles\/batch$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)

  db.grilles.forEach((item) => {
    if (payload.ids?.includes(item.id)) {
      item.status = payload.status || item.status
    }
  })

  return ok({}, '批量操作成功')
}))

Mock.mock(/\/api\/grilles\/[^/]+$/, 'put', (options) => withDatabase((db) => {
  const grilleId = decodeURIComponent(getPathSegments(options.url).at(-1))
  const payload = parseBody(options)
  const grille = db.grilles.find((item) => item.id === grilleId)

  if (!grille) return fail('格口不存在')

  Object.assign(grille, payload)
  return ok(grille, '格口更新成功')
}))

Mock.mock(/\/api\/item_out_grille$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)
  const logisticsIds = []

  ;(payload.logistics_ids || []).forEach((logisticsId) => {
    const targetPackage = db.packages.find((item) => item.logisticsId === logisticsId)
    if (!targetPackage) return

    const targetGrille = db.grilles.find((item) => item.id === targetPackage.grille_id)
    targetPackage.status = 'picked_up'
    targetPackage.outboundAt = new Date().toISOString()
    targetPackage.UpdatedAt = new Date().toISOString()
    targetPackage.grilleStatus = 'idle'

    if (targetGrille) {
      targetGrille.status = 'idle'
      targetGrille.currentLogisticsId = ''
    }

    appendLog(db, logisticsId, 'picked_up', `包裹已出库，释放格口 ${targetPackage.grille_id}`, '用户')
    logisticsIds.push(logisticsId)
  })

  return ok({ logistics_ids: logisticsIds }, '出库成功')
}))

Mock.mock(/\/api\/grille_phone_get_item\/[^/]+$/, 'get', (options) => {
  const db = getDatabase()
  const phone = decodeURIComponent(getPathSegments(options.url).at(-1))
  const list = db.packages
    .filter((item) => item.receiverPhone === phone && ['stored', 'created'].includes(item.status))
    .map((item) => enrichPackage(item, db))

  return ok({
    count: list.length,
    list_msg: list.length ? `找到 ${list.length} 个包裹` : '暂无待处理包裹',
    list
  })
})

Mock.mock(/\/api\/packages(\?.*)?$/, 'get', (options) => {
  const db = getDatabase()
  const url = new URL(`http://mock${options.url}`)
  const keyword = url.searchParams.get('keyword') || ''
  const status = url.searchParams.get('status') || ''
  const list = db.packages
    .filter((item) => {
      const matchKeyword = !keyword || [item.logisticsId, item.receiverName, item.receiverPhone, item.itemName].some((value) => value?.includes(keyword))
      const matchStatus = !status || item.status === status
      return matchKeyword && matchStatus
    })
    .map((item) => enrichPackage(item, db))

  return ok({ count: list.length, list })
})

Mock.mock(/\/api\/packages\/\d+$/, 'put', (options) => withDatabase((db) => {
  const packageId = Number(getPathSegments(options.url).at(-1))
  const payload = parseBody(options)
  const target = db.packages.find((item) => item.ID === packageId)

  if (!target) return fail('包裹不存在')

  Object.assign(target, payload, { UpdatedAt: new Date().toISOString() })
  appendLog(db, target.logisticsId, 'updated', '管理员更新了包裹信息', '管理员')
  return ok(target, '包裹更新成功')
}))

Mock.mock(/\/api\/packages\/\d+\/logs$/, 'get', (options) => {
  const db = getDatabase()
  const packageId = Number(getPathSegments(options.url).at(-2))
  const target = db.packages.find((item) => item.ID === packageId)

  if (!target) return fail('包裹不存在')

  const list = db.logs.filter((item) => item.logisticsId === target.logisticsId)
  return ok({ count: list.length, list })
})

Mock.mock(/\/api\/user_create$/, 'post', (options) => withDatabase((db) => {
  const payload = parseBody(options)
  if (!payload.phone && !payload.pickupCode) return fail('请提供手机号或取件码')

  const matchedPackage = db.packages.find((item) => {
    const matchPhone = payload.phone ? item.receiverPhone === payload.phone : true
    const matchPickupCode = payload.pickupCode ? item.pickupCode === payload.pickupCode : true
    return item.status === 'stored' && matchPhone && matchPickupCode
  })

  if (!matchedPackage) return fail('手机号或取件码不正确')

  const resolvedPhone = matchedPackage.receiverPhone
  let user = db.users.find((item) => item.phone === resolvedPhone && item.role === 'user')
  if (!user) {
    const nextId = Math.max(...db.users.map((item) => item.ID), 0) + 1
    user = {
      ID: nextId,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      DeletedAt: null,
      username: `user_${resolvedPhone}`,
      email: matchedPackage.receiverEmail || '',
      phone: resolvedPhone,
      password: '123456',
      permission: 'user',
      avatar: '',
      token: `user-token-${resolvedPhone}`,
      role_id: 3,
      role: 'user',
      status: 'enabled',
      lastLoginAt: new Date().toISOString(),
      nickname: matchedPackage.receiverName
    }
    db.users.push(user)
  }

  matchedPackage.receiverToken = user.token
  return ok({
    token: user.token,
    profile: sanitizeUser(user)
  }, '用户会话已创建')
}))

Mock.mock(/\/api\/pickup\/verify$/, 'post', (options) => {
  const db = getDatabase()
  const payload = parseBody(options)
  if (!payload.phone && !payload.pickupCode) return fail('请提供手机号或取件码')

  const list = db.packages
    .filter((item) => {
      const matchPhone = payload.phone ? item.receiverPhone === payload.phone : true
      const matchPickupCode = payload.pickupCode ? item.pickupCode === payload.pickupCode : true
      return item.status === 'stored' && matchPhone && matchPickupCode
    })
    .map((item) => enrichPackage(item, db))

  if (!list.length) return fail('未找到可取件包裹')
  return ok({ count: list.length, list }, '包裹校验成功')
})
