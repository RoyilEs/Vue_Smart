<template>
  <div ref="containerRef" class="scene-shell"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  grilles: {
    type: Array,
    default: () => []
  },
  activeId: {
    type: String,
    default: ''
  },
  flashId: {
    type: String,
    default: ''
  },
  triggerKey: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['select'])

const containerRef = ref(null)
let renderer
let scene
let camera
let controls
let animationId = 0
let flashStart = 0
let raycaster
let mouse
let groundMesh = null
let cabinetGroup = null
const meshMap = new Map()

function statusColor(status, isActive) {
  if (isActive) return 0xf59e0b
  if (status === 'occupied') return 0x3b82f6
  if (status === 'disabled') return 0xef4444
  return 0x2dd4bf
}

function getGrilleLabel(grille) {
  // 优先使用 grille_id，若没有则回退到行列拼接
  const id = grille.grille_id || grille.id || `${grille.matrix_row}-${grille.matrix_column}`
  return String(id)
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function createLabelSprite(label) {
  const fontSize = 28
  const paddingX = 22
  const width = Math.max(144, Math.ceil(label.length * fontSize * 0.72) + paddingX * 2)
  const height = 64
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  context.clearRect(0, 0, width, height)
  context.fillStyle = 'rgba(17, 24, 39, 0.84)'
  drawRoundedRect(context, 0, 0, width, height, 16)
  context.fill()

  context.font = `600 ${fontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`
  context.fillStyle = '#f8fafc'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, width / 2, height / 2 + 1)

  const texture = new CanvasTexture(canvas)
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  })
  const sprite = new Sprite(material)
  sprite.scale.set(Math.max(0.82, label.length * 0.15), 0.22, 1)
  sprite.position.set(0, 0, 0.58)
  sprite.renderOrder = 3
  return sprite
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose())
    return
  }
  material?.dispose()
}

function disposeSprite(sprite) {
  sprite.material?.map?.dispose()
  sprite.material?.dispose()
}

function disposeMesh(mesh) {
  mesh.geometry?.dispose()
  disposeMaterial(mesh.material)
}

function clearMeshMap() {
  meshMap.forEach((mesh) => {
    if (mesh.userData.labelSprite) {
      mesh.remove(mesh.userData.labelSprite)
      disposeSprite(mesh.userData.labelSprite)
      mesh.userData.labelSprite = null
    }
    cabinetGroup?.remove(mesh)
    disposeMesh(mesh)
  })
  meshMap.clear()
}

function createScene() {
  scene = new Scene()
  scene.fog = new Fog(0x0d1d17, 12, 32)

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera = new PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 8, 14)
  camera.lookAt(0, 0, 0)

  renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 8
  controls.maxDistance = 18
  controls.minPolarAngle = Math.PI / 4
  controls.maxPolarAngle = Math.PI / 2.02

  scene.add(new AmbientLight(0xffffff, 1.4))

  const directionalLight = new DirectionalLight(0xffffff, 1.8)
  directionalLight.position.set(6, 12, 8)
  scene.add(directionalLight)

  cabinetGroup = new Group()
  cabinetGroup.rotation.y = -0.28
  scene.add(cabinetGroup)

  groundMesh = new Mesh(
    new BoxGeometry(14, 0.4, 6),
    new MeshStandardMaterial({ color: 0x1f4b3d, metalness: 0.3, roughness: 0.6 })
  )
  groundMesh.position.y = -2.1
  cabinetGroup.add(groundMesh)

  raycaster = new Raycaster()
  mouse = new Vector2()

  rebuildMeshes()
  syncMeshes()
  animate()
  renderer.domElement.addEventListener('click', handleClick)
  window.addEventListener('resize', handleResize)
}

function rebuildMeshes() {
  clearMeshMap()

  props.grilles.forEach((grille) => {
    const geometry = new BoxGeometry(1.1, 1, 1)
    const material = new MeshStandardMaterial({
      color: statusColor(grille.status, grille.grille_id === props.activeId),
      emissive: grille.grille_id === props.activeId ? 0x8b5e00 : 0x0b2f23,
      metalness: 0.22,
      roughness: 0.32
    })
    const mesh = new Mesh(geometry, material)
    // 使用 matrix_row 和 matrix_column（下划线命名）
    mesh.position.set(
        (grille.matrix_column - 3.5) * 1.45,
        (2.5 - grille.matrix_row) * 1.3,
        0
    )
    mesh.userData = { grilleId: grille.grille_id }

    const labelSprite = createLabelSprite(getGrilleLabel(grille))
    mesh.add(labelSprite)
    mesh.userData.labelSprite = labelSprite

    cabinetGroup.add(mesh)
    meshMap.set(grille.grille_id, mesh)
  })
}

function syncMeshes() {
  props.grilles.forEach((grille) => {
    const mesh = meshMap.get(grille.grille_id)
    if (!mesh) return
    mesh.material.color.setHex(statusColor(grille.status, grille.grille_id === props.activeId))
    mesh.material.emissive.setHex(grille.grille_id === props.activeId ? 0x8b5e00 : 0x0b2f23)
    mesh.scale.setScalar(grille.grille_id === props.activeId ? 1.08 : 1)
  })
}

function handleClick(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects([...meshMap.values()])
  if (intersects.length) {
    emit('select', intersects[0].object.userData.grilleId)
  }
}

function handleResize() {
  if (!renderer || !camera || !containerRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function animate() {
  animationId = window.requestAnimationFrame(animate)
  if (!scene || !renderer || !camera) return
  if (props.flashId && flashStart) runFlashSequence()
  controls?.update()
  renderer.render(scene, camera)
}

function runFlashSequence() {
  const mesh = meshMap.get(props.flashId)
  if (!mesh) return

  const elapsed = performance.now() - flashStart
  if (elapsed <= 1500) {
    const pulse = 1 + Math.sin(elapsed / 70) * 0.14
    mesh.scale.setScalar(pulse)
    mesh.material.emissive.setHex(0x22c55e)
  } else {
    flashStart = 0
    syncMeshes()
  }
}

function disposeScene() {
  clearMeshMap()

  if (groundMesh) {
    cabinetGroup?.remove(groundMesh)
    disposeMesh(groundMesh)
    groundMesh = null
  }

  if (cabinetGroup) {
    scene?.remove(cabinetGroup)
    cabinetGroup = null
  }

  controls?.dispose()
  controls = null

  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('click', handleClick)
    renderer.domElement.remove()
  }

  renderer?.dispose()
  scene = null
  camera = null
}

watch(() => props.grilles, () => {
  if (!scene) return
  rebuildMeshes()
  syncMeshes()
}, { deep: true })

watch(() => props.activeId, () => {
  syncMeshes()
})

watch(() => props.triggerKey, () => {
  if (!props.flashId) return
  flashStart = performance.now()
})

onMounted(createScene)

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  disposeScene()
})
</script>

<style scoped>
.scene-shell {
  width: 100%;
  min-height: 460px;
}
</style>
