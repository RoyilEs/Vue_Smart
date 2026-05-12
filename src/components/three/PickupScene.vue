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
  Scene,
  Sprite,
  SpriteMaterial,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const props = defineProps({
  grilles: {
    type: Array,
    default: () => []
  },
  targetPackage: {
    type: Object,
    default: null
  },
  triggerKey: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['finished'])

const containerRef = ref(null)
let renderer
let scene
let camera
let controls
let animationId = 0
let phaseStart = 0
let activePackageMesh = null
let stageMesh = null
let cabinetGroup = null
const meshMap = new Map()

function getGrilleLabel(grille) {
  return String(grille.id || grille.grille_id || `${grille.matrixRow}-${grille.matrixColumn}`)
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

function clearActivePackage() {
  if (!activePackageMesh) return
  cabinetGroup?.remove(activePackageMesh)
  disposeMesh(activePackageMesh)
  activePackageMesh = null
}

function createScene() {
  scene = new Scene()
  scene.fog = new Fog(0x0a1612, 10, 28)

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  camera = new PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(0, 4.8, 11.8)
  camera.lookAt(0, 0, 0)

  renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  containerRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 8
  controls.maxDistance = 16
  controls.minPolarAngle = Math.PI / 4
  controls.maxPolarAngle = Math.PI / 2.05

  scene.add(new AmbientLight(0xffffff, 1.25))

  const light = new DirectionalLight(0xffffff, 1.8)
  light.position.set(5, 10, 8)
  scene.add(light)

  cabinetGroup = new Group()
  cabinetGroup.rotation.y = -0.45
  scene.add(cabinetGroup)

  stageMesh = new Mesh(
    new BoxGeometry(12, 0.3, 5.5),
    new MeshStandardMaterial({ color: 0x1c3a30, metalness: 0.22, roughness: 0.68 })
  )
  stageMesh.position.y = -1.8
  cabinetGroup.add(stageMesh)

  rebuildMeshes()
  animate()
  window.addEventListener('resize', handleResize)
}

function rebuildMeshes() {
  clearMeshMap()
  clearActivePackage()

  props.grilles.forEach((grille) => {
    const mesh = new Mesh(
      new BoxGeometry(1.05, 0.92, 0.92),
      new MeshStandardMaterial({
        color: grille.status === 'occupied' ? 0x2563eb : 0x34d399,
        emissive: 0x09241b,
        metalness: 0.2,
        roughness: 0.35
      })
    )
    mesh.position.set((grille.matrixColumn - 3.5) * 1.4, (2.5 - grille.matrixRow) * 1.25, 0)
    mesh.userData = { grilleId: grille.id }

    const labelSprite = createLabelSprite(getGrilleLabel(grille))
    mesh.add(labelSprite)
    mesh.userData.labelSprite = labelSprite

    cabinetGroup.add(mesh)
    meshMap.set(grille.id, mesh)
  })
}

function animate() {
  animationId = window.requestAnimationFrame(animate)

  if (props.targetPackage && phaseStart) {
    runSequence()
  } else if (cabinetGroup) {
    cabinetGroup.rotation.y += 0.0035
  }

  controls?.update()
  renderer.render(scene, camera)
}

function runSequence() {
  const mesh = meshMap.get(props.targetPackage.grille_id)
  if (!mesh) return

  const elapsed = performance.now() - phaseStart
  if (elapsed <= 600) {
    const pulse = 1 + Math.sin(elapsed / 70) * 0.15
    mesh.scale.set(pulse, pulse, pulse)
    mesh.material.emissive.setHex(0xffd166)
  } else if (elapsed <= 1400) {
    mesh.rotation.y = -Math.min((elapsed - 600) / 500, 1) * 1.2
    if (!activePackageMesh) {
      activePackageMesh = new Mesh(
        new BoxGeometry(0.55, 0.4, 0.55),
        new MeshStandardMaterial({ color: 0xf97316, metalness: 0.12, roughness: 0.72 })
      )
      activePackageMesh.position.copy(mesh.position)
      activePackageMesh.position.z = 0.18
      cabinetGroup.add(activePackageMesh)
    }
  } else if (elapsed <= 2200) {
    if (activePackageMesh) {
      activePackageMesh.position.z = 0.18 + ((elapsed - 1400) / 800) * 2.6
      activePackageMesh.material.opacity = 1 - (elapsed - 1400) / 800
      activePackageMesh.material.transparent = true
    }
  } else if (elapsed <= 2800) {
    mesh.rotation.y = -1.2 + ((elapsed - 2200) / 600) * 1.2
  } else {
    mesh.scale.set(1, 1, 1)
    mesh.rotation.y = 0
    mesh.material.emissive.setHex(0x09241b)
    clearActivePackage()
    phaseStart = 0
    emit('finished')
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

function disposeScene() {
  clearMeshMap()
  clearActivePackage()

  if (stageMesh) {
    cabinetGroup?.remove(stageMesh)
    disposeMesh(stageMesh)
    stageMesh = null
  }

  if (cabinetGroup) {
    scene?.remove(cabinetGroup)
    cabinetGroup = null
  }

  controls?.dispose()
  controls = null

  if (renderer?.domElement) {
    renderer.domElement.remove()
  }

  renderer?.dispose()
  scene = null
  camera = null
}

watch(() => props.grilles, rebuildMeshes, { deep: true })

watch(() => props.triggerKey, () => {
  if (!props.targetPackage) return
  phaseStart = performance.now()
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
