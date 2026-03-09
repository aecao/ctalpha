// Copyright (c) 2022 8th Wall, Inc.
import './index.css'
import {nextButtonComponent} from './next-button'
import {rotateComponent} from './rotate-button'
import {selectComponent} from './selectcomponent'
import {initQRCode} from './qr-code'

// Initialize QR code for desktop users
initQRCode()

const initTransformLockModes = () => {
  const realScaleButton = document.getElementById('real-scale-button')
  const fixInPlaceButton = document.getElementById('fix-in-place-button')
  const scene = document.querySelector('a-scene')
  const group = document.getElementById('group')

  if (!realScaleButton || !fixInPlaceButton || !scene || !group) return

  const trueScale = group.object3D.scale.clone()
  let isRealScaleEnabled = false
  let isFixInPlaceEnabled = false
  let lockFrameId = null
  let fixedTransform = null

  const applyGestureModes = () => {
    if (!group.hasAttribute('xrextras-gesture-detector')) {
      group.setAttribute('xrextras-gesture-detector', '')
    }

    if (isFixInPlaceEnabled) {
      group.removeAttribute('xrextras-two-finger-rotate')
      group.removeAttribute('xrextras-hold-drag')
    } else {
      group.setAttribute('xrextras-two-finger-rotate', '')
      group.setAttribute('xrextras-hold-drag', 'rise-height: 0')
    }

    if (isRealScaleEnabled) {
      group.removeAttribute('xrextras-pinch-scale')
    } else {
      group.setAttribute('xrextras-pinch-scale', '')
    }
  }

  const applyLocks = () => {
    if (isRealScaleEnabled) {
      group.object3D.scale.copy(trueScale)
    }

    if (isFixInPlaceEnabled && fixedTransform) {
      group.object3D.position.copy(fixedTransform.position)
      group.object3D.quaternion.copy(fixedTransform.quaternion)
    }
  }

  const startLockLoop = () => {
    const tick = () => {
      applyLocks()
      if (isRealScaleEnabled || isFixInPlaceEnabled) {
        lockFrameId = requestAnimationFrame(tick)
      }
    }
    lockFrameId = requestAnimationFrame(tick)
  }

  const stopLockLoop = () => {
    if (lockFrameId !== null) {
      cancelAnimationFrame(lockFrameId)
      lockFrameId = null
    }
  }

  const updateLockLoop = () => {
    stopLockLoop()
    if (isRealScaleEnabled || isFixInPlaceEnabled) {
      startLockLoop()
    }
  }

  const setRealScaleMode = (enabled) => {
    isRealScaleEnabled = enabled
    realScaleButton.classList.toggle('active', enabled)

    if (enabled) {
      group.object3D.scale.copy(trueScale)
    }

    applyGestureModes()
    updateLockLoop()
  }

  const setFixInPlaceMode = (enabled) => {
    isFixInPlaceEnabled = enabled
    fixInPlaceButton.classList.toggle('active', enabled)

    if (enabled) {
      fixedTransform = {
        position: group.object3D.position.clone(),
        quaternion: group.object3D.quaternion.clone(),
      }
    }

    applyGestureModes()
    updateLockLoop()
  }

  realScaleButton.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    setRealScaleMode(!isRealScaleEnabled)
  })

  fixInPlaceButton.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    setFixInPlaceMode(!isFixInPlaceEnabled)
  })

  scene.addEventListener('xrstart', () => {
    applyLocks()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTransformLockModes)
} else {
  initTransformLockModes()
}

let envMapTexture = null
let envMapPromise = null

const getRenderer = () => {
  const sceneEl = document.querySelector('a-scene')
  return sceneEl?.renderer || AFRAME?.scenes?.[0]?.renderer || null
}

const applyEnvMapToScene = (texture) => {
  const sceneEl = document.querySelector('a-scene')
  if (!sceneEl?.object3D) return
  sceneEl.object3D.environment = texture
}

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
        const renderer = getRenderer()

        if (renderer && THREE.PMREMGenerator) {
          const pmremGenerator = new THREE.PMREMGenerator(renderer)
          pmremGenerator.compileEquirectangularShader()
          const pmremResult = pmremGenerator.fromEquirectangular(texture)
          texture.dispose()
          pmremGenerator.dispose()
          envMapTexture = pmremResult.texture
        } else {
          texture.mapping = THREE.EquirectangularReflectionMapping
          texture.needsUpdate = true
          envMapTexture = texture
        }

        applyEnvMapToScene(envMapTexture)
        resolve(envMapTexture)
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
    applyEnvMapToScene(envMapTexture)
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

const addMetalRimBoost = (material, rimStrength, rimPower) => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMetalRimStrength = {value: rimStrength}
    shader.uniforms.uMetalRimPower = {value: rimPower}

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uMetalRimStrength;
uniform float uMetalRimPower;`
      )
      .replace(
        '#include <output_fragment>',
        `
float metalRim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), uMetalRimPower);
outgoingLight += vec3(metalRim * uMetalRimStrength);
#include <output_fragment>
`
      )
  }
}

const applyHybridMetalMaterial = (node, config) => {
  if (!node.material) return

  node.material = node.material.clone()
  node.material.map = null
  node.material.emissiveMap = null
  node.material.metalnessMap = null
  node.material.roughnessMap = null
  node.material.color.set(config.color)
  node.material.metalness = 0.98
  node.material.roughness = config.roughness
  node.material.emissive.set('#111111')
  node.material.emissiveIntensity = 0.03

  addMetalRimBoost(node.material, config.rimStrength, config.rimPower)
  applyEnvMapToMaterial(node.material, config.envMapIntensity)
  node.material.needsUpdate = true
}

// Metallic finish for gantry ring
AFRAME.registerComponent('slip-ring-assembly-metal', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return
        applyHybridMetalMaterial(node, {
          color: '#f0f0f0',
          roughness: 0.045,
          envMapIntensity: 24.0,
          rimStrength: 0.52,
          rimPower: 1.8,
        })
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
        applyHybridMetalMaterial(node, {
          color: '#e4e4e4',
          roughness: 0.055,
          envMapIntensity: 22.0,
          rimStrength: 0.45,
          rimPower: 1.9,
        })
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
        node.material.roughness = 0.12
        applyEnvMapToMaterial(node.material, 1.8)
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
        node.material.roughness = 0.12
        applyEnvMapToMaterial(node.material, 1.8)
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
        node.material.roughness = 0.12
        applyEnvMapToMaterial(node.material, 1.8)
        node.material.needsUpdate = true
      })
    })
  },
})

AFRAME.registerComponent('laser-positioning-dark', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        node.material = node.material.clone()
        node.material.color.set('#040405')
        node.material.metalness = 0.0
        node.material.roughness = 0.7
        node.material.emissive.set('#000000')
        applyEnvMapToMaterial(node.material, 0.18)
        node.material.needsUpdate = true
      })
    })
  },
})

AFRAME.registerComponent('screen-glow', {
  schema: {
    color: {type: 'color', default: '#ffffff'},
    emissive: {type: 'color', default: '#ffffff'},
    emissiveIntensity: {type: 'number', default: 1.8},
    roughness: {type: 'number', default: 0.08},
  },
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      mesh.traverse((node) => {
        if (!node.isMesh) return

        const previousMaterial = node.material
        const screenMap = previousMaterial.map || previousMaterial.emissiveMap || null

        if (screenMap) {
          screenMap.encoding = THREE.sRGBEncoding
          screenMap.needsUpdate = true
        }

        node.material = new THREE.MeshStandardMaterial({
          map: screenMap,
          color: new THREE.Color(this.data.color),
          metalness: 0.0,
          roughness: this.data.roughness,
          emissive: new THREE.Color(this.data.emissive),
          emissiveMap: screenMap,
          emissiveIntensity: this.data.emissiveIntensity,
          transparent: previousMaterial.transparent === true,
          opacity: typeof previousMaterial.opacity === 'number' ? previousMaterial.opacity : 1,
          side: previousMaterial.side,
          depthWrite: previousMaterial.depthWrite,
        })

        node.material.toneMapped = false
        applyEnvMapToMaterial(node.material, 0.35)
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

AFRAME.registerComponent('laser-surface', {
  schema: {
    innerColor: {type: 'color', default: '#ff2a2a'},
    outerColor: {type: 'color', default: '#7a0000'},
    opacity: {type: 'number', default: 0.32},
    intensity: {type: 'number', default: 2.1},
    alphaPower: {type: 'number', default: 1.8},
    flipGradient: {type: 'boolean', default: false},
  },
  init() {
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh')
      if (!mesh) return

      const innerColor = new THREE.Color(this.data.innerColor)
      const outerColor = new THREE.Color(this.data.outerColor)

      mesh.traverse((node) => {
        if (!node.isMesh) return

        node.raycast = () => null

        node.material = new THREE.ShaderMaterial({
          uniforms: {
            uInnerColor: {value: innerColor},
            uOuterColor: {value: outerColor},
            uOpacity: {value: this.data.opacity},
            uIntensity: {value: this.data.intensity},
            uAlphaPower: {value: this.data.alphaPower},
            uFlip: {value: this.data.flipGradient ? 1.0 : 0.0},
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 uInnerColor;
            uniform vec3 uOuterColor;
            uniform float uOpacity;
            uniform float uIntensity;
            uniform float uAlphaPower;
            uniform float uFlip;
            varying vec2 vUv;

            void main() {
              float t = clamp(mix(vUv.y, 1.0 - vUv.y, uFlip), 0.0, 1.0);
              float fade = pow(1.0 - t, uAlphaPower);
              float core = smoothstep(0.45, 0.0, t);
              vec3 baseColor = mix(uOuterColor, uInnerColor, core);
              vec3 glow = baseColor * (uIntensity * (0.35 + core * 1.1));
              float alpha = clamp(fade * uOpacity, 0.0, 1.0);
              gl_FragColor = vec4(glow, alpha * 0.8);
            }
          `,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })

        node.renderOrder = 30
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
