// Copyright (c) 2022 8th Wall, Inc.
import './index.css'
import {nextButtonComponent} from './next-button'
import {rotateComponent} from './rotate-button'
import {selectComponent} from './selectcomponent'
import {initQRCode} from './qr-code'

// Initialize QR code for desktop users
initQRCode()

let envMapTexture = null
let envMapPromise = null

const getEnvMapPath = () => {
  const envAsset = document.getElementById('hospital_env')
  return envAsset?.getAttribute('src') || 'assets/hospital_env.exr'
}

const loadEnvMapTexture = () => {
  if (envMapTexture) return Promise.resolve(envMapTexture)
  if (envMapPromise) return envMapPromise
  if (!THREE.EXRLoader) {
    return Promise.reject(new Error('THREE.EXRLoader is not available'))
  }

  envMapPromise = new Promise((resolve, reject) => {
    const loader = new THREE.EXRLoader()
    loader.load(
      getEnvMapPath(),
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        texture.needsUpdate = true
        envMapTexture = texture
        resolve(texture)
      },
      undefined,
      (error) => {
        console.warn('Failed to load EXR environment map:', error)
        envMapPromise = null
        reject(error)
      }
    )
  })

  return envMapPromise
}

const applyEnvMapToMaterial = (material, intensity) => {
  material.envMapIntensity = intensity

  if (envMapTexture) {
    material.envMap = envMapTexture
    material.needsUpdate = true
    return
  }

  loadEnvMapTexture()
    .then((texture) => {
      material.envMap = texture
      material.needsUpdate = true
    })
    .catch(() => {})
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
        node.material.color.set('#4A4A4A')
        node.material.metalness = 0.95
        node.material.roughness = 0.04
        node.material.emissive.set('#000000')
        applyEnvMapToMaterial(node.material, 4.6)
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
        node.material.color.set('#3F3F3F')
        node.material.metalness = 0.92
        node.material.roughness = 0.06
        node.material.emissive.set('#000000')
        applyEnvMapToMaterial(node.material, 4.2)
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
        node.material.roughness = 0.16
        applyEnvMapToMaterial(node.material, 1.45)
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
        node.material.roughness = 0.16
        applyEnvMapToMaterial(node.material, 1.45)
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
        node.material.roughness = 0.16
        applyEnvMapToMaterial(node.material, 1.45)
        node.material.needsUpdate = true
      })
    })
  },
})

// Fabric finish for patient table
AFRAME.registerComponent('fabric', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        node.material = node.material.clone()

        node.material.color.set('#C7C2B8')
        node.material.metalness = 0.0
        node.material.roughness = 0.6
        applyEnvMapToMaterial(node.material, 0.45)
        node.material.needsUpdate = true
      })
    })
  },
})

// SSAO (Screen Space Ambient Occlusion) component for post-processing depth
AFRAME.registerComponent('ssao', {
  init() {
    const scene = this.el
    const renderer = this.el.renderer
    
    scene.addEventListener('loaded', () => {
      // Delay to ensure renderer is fully ready
      setTimeout(() => {
        setupSSAO(scene, renderer)
      }, 500)
    })
  },
})

function setupSSAO(scene, renderer) {
  if (!renderer || !renderer.getPixelRatio) return
  
  const camera = scene.querySelector('#camera')?.object3D
  if (!camera) return
  
  try {
    // Create effect composer for post-processing
    const composer = new THREE.EffectComposer(renderer)
    const renderPass = new THREE.RenderPass(scene.object3D, camera)
    composer.addPass(renderPass)
    
    // Configure SSAO pass
    const ssaoPass = new THREE.SSAOPass(scene.object3D, camera, renderer.domElement.offsetWidth, renderer.domElement.offsetHeight)
    ssaoPass.radius = 20 // Radius of the SSAO effect
    ssaoPass.onlyAO = false // Show SSAO with lighting
    ssaoPass.intensity = 4.0 // Darkness intensity (0-20, higher = more visible)
    ssaoPass.scale = 1.0
    ssaoPass.bias = 0.5
    composer.addPass(ssaoPass)
    
    // Store composer for rendering
    scene.userData.composer = composer
    
    // Override render loop to use composer
    const originalRender = renderer.render.bind(renderer)
    renderer.render = function(s, c) {
      if (scene.userData.composer) {
        scene.userData.composer.render()
      } else {
        originalRender(s, c)
      }
    }
    
    console.log('SSAO initialized successfully')
  } catch (e) {
    console.warn('SSAO setup failed:', e.message)
  }
}

// iOS fix for image decoding
const IS_IOS =
  /^(iPad|iPhone|iPod)/.test(window.navigator.platform) ||
  (/^Mac/.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1)
if (IS_IOS) window.createImageBitmap = undefined
