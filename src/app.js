// Copyright (c) 2022 8th Wall, Inc.
import './index.css'
import {nextButtonComponent} from './next-button'
import {rotateComponent} from './rotate-button'
import {selectComponent} from './selectcomponent'

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

      // Prefer attaching rotate gestures to a camera pivot so the camera (not the models)
      // pivots around a higher point. Fall back to #group if #camera_pivot is missing.
      const cameraPivot = scene.querySelector('#camera_pivot')
      const gestureTarget = cameraPivot || group

      if (!gestureTarget.hasAttribute('xrextras-gesture-detector')) {
        gestureTarget.setAttribute('xrextras-gesture-detector', '')
      }

      // Only attach rotation gestures to the gesture target so models remain static
      gestureTarget.setAttribute('xrextras-two-finger-rotate', '')

      console.log('Gestures attached to', gestureTarget.id ? `#${gestureTarget.id}` : 'unknown')
    }

    // Enable gestures and interactions for XR start and desktop
    scene.addEventListener('xrstart', enableInteraction)
    scene.addEventListener('loaded', enableInteraction)
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
        node.material.envMapIntensity = 2.0
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
