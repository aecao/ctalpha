// Copyright (c) 2022 8th Wall, Inc.
import './index.css'
import {nextButtonComponent} from './next-button'
import {rotateComponent} from './rotate-button'
import {selectComponent} from './selectcomponent'
import {initQRCode} from './qr-code'

// Initialize QR code for desktop users
initQRCode()

let envMapTexture = null

const getEnvMapTexture = () => {
  if (envMapTexture) return envMapTexture
  const imgEl = document.getElementById('hospital_env')
  if (!imgEl || !imgEl.complete) return null

  const texture = new THREE.Texture(imgEl)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.encoding = THREE.sRGBEncoding
  texture.needsUpdate = true
  envMapTexture = texture
  return envMapTexture
}

// Register your existing components
AFRAME.registerComponent('next-button', nextButtonComponent())
AFRAME.registerComponent('rotate-button', rotateComponent)
AFRAME.registerComponent('selectcomponent', selectComponent)

// Combined interaction + gestures component
AFRAME.registerComponent('enable-interaction-and-gestures', {
  init() {
    const scene = this.el
    const camera = scene.querySelector('#camera')
    const group = scene.querySelector('#group')

    const enableInteraction = () => {
      console.log('Enabling interaction & gestures')

      // Camera setup for raycasting taps
      camera.setAttribute('raycaster', 'objects: .cantap, .interactable')
      camera.setAttribute('cursor', 'rayOrigin: mouse; fuse: false')

      // Attach gestures directly to the group (models rotate, camera stays fixed)
      if (!group.hasAttribute('xrextras-gesture-detector')) {
        group.setAttribute('xrextras-gesture-detector', '')
      }

      group.setAttribute('xrextras-two-finger-rotate', '')
      group.setAttribute('xrextras-pinch-scale', '')

      console.log('Gestures attached to #group')

      // Fix occasional bad anchoring by clamping group Y shortly after XR starts
      const clampGroupHeight = () => {
        const group = scene.querySelector('#group')
        const camera = scene.querySelector('#camera')
        if (!group || !camera) return
        const groupY = group.object3D.position.y
        const cameraY = camera.object3D.getWorldPosition(new THREE.Vector3()).y
        const maxAllowedY = cameraY + 0.5 // don't allow group to be more than 0.5m above camera
        const minAllowedY = -5 // avoid extremely low placements
        if (groupY > maxAllowedY) {
          group.object3D.position.y = maxAllowedY
        } else if (groupY < minAllowedY) {
          group.object3D.position.y = minAllowedY
        }
      }

      scene.addEventListener('xrstart', () => {
        // Run clamp repeatedly for a short time to catch any late anchor updates
        let ticks = 0
        const interval = setInterval(() => {
          clampGroupHeight()
          ticks += 1
          if (ticks > 10) clearInterval(interval)
        }, 200)
      })

    }

    // Enable gestures and interactions for XR start and desktop
    scene.addEventListener('xrstart', enableInteraction)
    scene.addEventListener('loaded', enableInteraction)
  },
})

// Clamp the group position to prevent sudden jumps out of view
AFRAME.registerComponent('clamp-group', {
  schema: {
    maxDistance: {type: 'number', default: 6},
    minDistance: {type: 'number', default: 0.5},
    maxYOffset: {type: 'number', default: 2},
    minYOffset: {type: 'number', default: -2},
  },
  init() {
    this.camera = this.el.sceneEl.querySelector('#camera')
  },
  tick() {
    if (!this.camera) return
    const groupPos = this.el.object3D.position
    const camPos = this.camera.object3D.position

    const dx = groupPos.x - camPos.x
    const dz = groupPos.z - camPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > this.data.maxDistance && dist > 0) {
      const scale = this.data.maxDistance / dist
      groupPos.x = camPos.x + dx * scale
      groupPos.z = camPos.z + dz * scale
    } else if (dist < this.data.minDistance && dist > 0) {
      const scale = this.data.minDistance / dist
      groupPos.x = camPos.x + dx * scale
      groupPos.z = camPos.z + dz * scale
    }

    const minY = camPos.y + this.data.minYOffset
    const maxY = camPos.y + this.data.maxYOffset
    if (groupPos.y < minY) groupPos.y = minY
    if (groupPos.y > maxY) groupPos.y = maxY
  },
})

// Metallic finish for gantry ring
AFRAME.registerComponent('slip-ring-assembly-metal', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        // Clone material so other models aren't affected
        node.material = node.material.clone()

        // Medical-grade metallic finish
        node.material.color.set('#F2F2F2')
        node.material.metalness = 0.95
        node.material.roughness = 0.22
        node.material.emissive.set('#000000')
        const envMap = getEnvMapTexture()
        if (envMap) node.material.envMap = envMap
        node.material.envMapIntensity = 2.0
        node.material.needsUpdate = true
      })
    })
  },
})

// General metallic finish component for other models
AFRAME.registerComponent('metallic', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh && !node.isSkinnedMesh) return

        // Clone material so other models aren't affected
        node.material = node.material.clone()

        // Neutral metallic appearance
        node.material.color.set('#E6E6E6')
        node.material.metalness = 0.92
        node.material.roughness = 0.18
        node.material.emissive.set('#000000')
        const envMap = getEnvMapTexture()
        if (envMap) node.material.envMap = envMap
        node.material.envMapIntensity = 2.2
        node.material.needsUpdate = true
      })
    })
  },
})

// light plastic finish for detector array
AFRAME.registerComponent('light-plastic', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        // Clone material so other models aren't affected
        node.material = node.material.clone()

        // plastic finish
        node.material.color.set('#BBCEED')
        node.material.metalness = 0.0
        node.material.roughness = 0.45
        const envMap = getEnvMapTexture()
        if (envMap) node.material.envMap = envMap
        node.material.envMapIntensity = 1.2
        node.material.needsUpdate = true
      })
    })
  },
})

// med plastic finish
AFRAME.registerComponent('med-plastic', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        // Clone material so other models aren't affected
        node.material = node.material.clone()

        // plastic finish
        node.material.color.set('#465369')
        node.material.metalness = 0.0
        node.material.roughness = 0.45
        const envMap = getEnvMapTexture()
        if (envMap) node.material.envMap = envMap
        node.material.envMapIntensity = 1.2
        node.material.needsUpdate = true
      })
    })
  },
})

// dark plastic finish
AFRAME.registerComponent('dark-plastic', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        // Clone material so other models aren't affected
        node.material = node.material.clone()

        // plastic finish
        node.material.color.set('#09090A')
        node.material.metalness = 0.0
        node.material.roughness = 0.45
        const envMap = getEnvMapTexture()
        if (envMap) node.material.envMap = envMap
        node.material.envMapIntensity = 1.2
        node.material.needsUpdate = true
      })
    })
  },
})

// iOS fix for image decoding
const IS_IOS =
  /^(iPad|iPhone|iPod)/.test(window.navigator.platform) ||
  (/^Mac/.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1)
if (IS_IOS) window.createImageBitmap = undefined
