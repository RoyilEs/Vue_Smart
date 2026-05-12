import Mock from 'mockjs'
import { STORAGE_KEYS, readJson, writeJson } from '../utils/storage'

const now = () => new Date().toISOString()

function createSeedGrilles() {
  const items = []

  for (let index = 0; index < 18; index += 1) {
    const row = Math.floor(index / 6) + 1
    const column = (index % 6) + 1

    items.push({
      id: `G-${String(index + 1).padStart(3, '0')}`,
      cabinetId: 'CAB-01',
      cabinetCode: 'A区主柜',
      grille_id: `G-${String(index + 1).padStart(3, '0')}`,
      matrixRow: row,
      matrixColumn: column,
      layer: row,
      x: column,
      y: row,
      z: 1,
      sizeType: column % 3 === 0 ? 'large' : column % 2 === 0 ? 'medium' : 'small',
      status: 'idle',
      currentLogisticsId: '',
      remark: ''
    })
  }

  return items
}

function createSeedPackages(grilles) {
  const samples = [
    {
      logisticsId: 'KD202603200001',
      pickupCode: '681924',
      receiverName: '李四',
      receiverPhone: '13800138000',
      receiverEmail: 'lisi@example.com',
      receiverCity: '北京市',
      receiverArea: '朝阳区',
      receiverAddress: '建国路88号某某大厦10层1001室',
      senderName: '顺达供应链',
      senderPhone: '17353878918',
      senderEmail: 'sender@example.com',
      senderCity: '上海市',
      senderArea: '浦东新区',
      senderAddress: '张江高科技园区博云路2号',
      itemName: '小米14 Pro智能手机',
      itemNum: 1,
      itemWeight: 0.85,
      packageNums: 1,
      status: 'stored',
      inboundAt: now(),
      outboundAt: '',
      remark: '优先派送',
      receiverToken: 'user-token-lisi'
    },
    {
      logisticsId: 'KD202603200002',
      pickupCode: '734812',
      receiverName: '王敏',
      receiverPhone: '13900139000',
      receiverEmail: 'wangmin@example.com',
      receiverCity: '杭州市',
      receiverArea: '西湖区',
      receiverAddress: '转塘街道艺术园区9栋',
      senderName: '仓配中心',
      senderPhone: '18000000000',
      senderEmail: 'warehouse@example.com',
      senderCity: '广州市',
      senderArea: '天河区',
      senderAddress: '天河智慧物流园',
      itemName: '办公显示器',
      itemNum: 1,
      itemWeight: 2.4,
      packageNums: 1,
      status: 'stored',
      inboundAt: now(),
      outboundAt: '',
      remark: '',
      receiverToken: 'user-token-wangmin'
    },
    {
      logisticsId: 'KD202603200003',
      pickupCode: '945117',
      receiverName: '赵蕾',
      receiverPhone: '13700137000',
      receiverEmail: 'zhaolei@example.com',
      receiverCity: '成都市',
      receiverArea: '高新区',
      receiverAddress: '天府软件园E区2栋',
      senderName: '退换服务中心',
      senderPhone: '18600000000',
      senderEmail: 'service@example.com',
      senderCity: '深圳市',
      senderArea: '南山区',
      senderAddress: '科技园南区',
      itemName: '无线耳机',
      itemNum: 2,
      itemWeight: 0.3,
      packageNums: 1,
      status: 'created',
      inboundAt: '',
      outboundAt: '',
      remark: '待分配格口',
      receiverToken: 'user-token-zhaolei'
    }
  ]

  return samples.map((item, index) => {
    const grille = grilles[index]
    const base = {
      ID: index + 1,
      CreatedAt: now(),
      UpdatedAt: now(),
      DeletedAt: null,
      cabinetId: grille?.cabinetId || '',
      cabinetCode: grille?.cabinetCode || '',
      grille_id: grille?.id || '',
      grilleStatus: grille?.status || 'idle',
      x: grille?.x || 0,
      y: grille?.y || 0,
      z: grille?.z || 0
    }

    if (item.status === 'stored' && grille) {
      grille.status = 'occupied'
      grille.currentLogisticsId = item.logisticsId
    }

    return {
      ...base,
      ...item
    }
  })
}

function createSeedSettings() {
  return {
    basic: {
      name: 'basic',
      label: '基础配置',
      description: '柜机、营业时间与告警阈值',
      group: 'system',
      valueType: 'object',
      value: {
        siteName: '城市驿站 A 区',
        pickupTimeoutHours: 48,
        temperatureThreshold: 28,
        supportPhone: '400-800-9000'
      }
    },
    pickup: {
      name: 'pickup',
      label: '取件规则',
      description: '取件码长度与提醒策略',
      group: 'pickup',
      valueType: 'object',
      value: {
        codeLength: 6,
        smsReminder: true,
        allowAnonymousLookup: true,
        animationSpeed: 'normal'
      }
    }
  }
}

function createSeedUsers() {
  return [
    {
      ID: 1,
      CreatedAt: now(),
      UpdatedAt: now(),
      DeletedAt: null,
      username: 'admin',
      email: 'admin@example.com',
      phone: '13600000001',
      password: '123456',
      permission: 'admin',
      avatar: '',
      token: 'staff-admin-token',
      role_id: 1,
      role: 'admin',
      status: 'enabled',
      lastLoginAt: now(),
      nickname: '系统管理员'
    },
    {
      ID: 2,
      CreatedAt: now(),
      UpdatedAt: now(),
      DeletedAt: null,
      username: 'courier',
      email: 'courier@example.com',
      phone: '13600000002',
      password: '123456',
      permission: 'courier',
      avatar: '',
      token: 'staff-courier-token',
      role_id: 2,
      role: 'courier',
      status: 'enabled',
      lastLoginAt: now(),
      nickname: '配送员林川'
    },
    {
      ID: 3,
      CreatedAt: now(),
      UpdatedAt: now(),
      DeletedAt: null,
      username: 'user_13800138000',
      email: 'lisi@example.com',
      phone: '13800138000',
      password: '123456',
      permission: 'user',
      avatar: '',
      token: 'user-token-lisi',
      role_id: 3,
      role: 'user',
      status: 'enabled',
      lastLoginAt: '',
      nickname: '李四'
    }
  ]
}

function createSeedLogs(packages) {
  return packages.flatMap((item) => {
    const logs = [
      {
        id: Mock.mock('@guid'),
        logisticsId: item.logisticsId,
        action: 'created',
        operator: '系统',
        createdAt: item.CreatedAt,
        detail: '包裹单已生成'
      }
    ]

    if (item.status === 'stored') {
      logs.push({
        id: Mock.mock('@guid'),
        logisticsId: item.logisticsId,
        action: 'stored',
        operator: '配送员',
        createdAt: item.inboundAt,
        detail: `已入柜 ${item.grille_id}`
      })
    }

    return logs
  })
}

function createSeedDatabase() {
  const grilles = createSeedGrilles()
  const packages = createSeedPackages(grilles)

  return {
    users: createSeedUsers(),
    settings: createSeedSettings(),
    grilles,
    packages,
    logs: createSeedLogs(packages)
  }
}

function loadDatabase() {
  return readJson(STORAGE_KEYS.mockDatabase, null) || createSeedDatabase()
}

let database = loadDatabase()

function persist() {
  writeJson(STORAGE_KEYS.mockDatabase, database)
}

persist()

export function getDatabase() {
  return database
}

export function saveDatabase(nextDb) {
  database = nextDb
  persist()
}

export function sanitizeUser(user) {
  if (!user) return null
  const { password, ...safeUser } = user
  return safeUser
}

export function generateLogisticsId() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const prefix = `KD${datePart}`
  const maxSerial = database.packages
    .filter((item) => item.logisticsId?.startsWith(prefix))
    .reduce((currentMax, item) => {
      const serial = Number(item.logisticsId.slice(prefix.length)) || 0
      return Math.max(currentMax, serial)
    }, 0)

  return `${prefix}${String(maxSerial + 1).padStart(4, '0')}`
}

export function generatePickupCode() {
  return Mock.Random.string('number', 6)
}

export function appendLog(db, logisticsId, action, detail, operator = '系统') {
  db.logs.unshift({
    id: Mock.mock('@guid'),
    logisticsId,
    action,
    operator,
    createdAt: now(),
    detail
  })
}
