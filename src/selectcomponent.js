import {modelDescriptions, setSelectedIndex} from './data.js'
import {openPopup} from './popup.js'
import {updateButtonVisibility} from './next-button.js'

const originalMaterials = new Map()

function cacheOriginalMaterials(modelElement) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return
    if (!originalMaterials.has(node)) {
      originalMaterials.set(node, {
        transparent: node.material.transparent,
        opacity: node.material.opacity,
        color: node.material.color.clone(),
      })
    }
  })
}

export function setOpacity(modelElement, opacity, highlight = false) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return
    if (!originalMaterials.has(node)) {
      originalMaterials.set(node, {
        transparent: node.material.transparent,
        opacity: node.material.opacity,
        color: node.material.color.clone(),
      })
    }
    node.material.transparent = true
    node.material.opacity = opacity
    if (highlight) node.material.color.set(0xff0000)
    else node.material.color.copy(originalMaterials.get(node).color)
  })
}

export function updateModelVisibility(selectedModelId) {
  document.querySelectorAll('.cantap').forEach((el) => {
    if (el.id === selectedModelId) setOpacity(el, 1, true)
    else setOpacity(el, 0.3)
  })
}

export function resetModelOpacity() {
  originalMaterials.forEach((mat, node) => {
    node.material.transparent = mat.transparent
    node.material.opacity = mat.opacity
    node.material.color.copy(mat.color)
  })
}

export const selectComponent = {
  init() {
    const scene = this.el
    let currentlySelected = null
    let locked = false

    const ensureCameraPivot = () => {
      let pivot = scene.querySelector('#camera_pivot')
      const camera = scene.querySelector('#camera')
      if (!pivot) {
        pivot = document.createElement('a-entity')
        pivot.setAttribute('id', 'camera_pivot')
        // Append pivot to scene and reparent camera while preserving world transform
        const camWorldPos = new THREE.Vector3()
        const camWorldQuat = new THREE.Quaternion()
        camera.object3D.getWorldPosition(camWorldPos)
        camera.object3D.getWorldQuaternion(camWorldQuat)

        scene.appendChild(pivot)

        // Place camera under pivot and set local transform to preserve world transform
        pivot.appendChild(camera)
        pivot.object3D.worldToLocal(camWorldPos)
        camera.object3D.position.copy(camWorldPos)
        const inv = pivot.object3D.quaternion.clone().invert()
        const localQuat = inv.multiply(camWorldQuat)
        camera.object3D.quaternion.copy(localQuat)
      }
      return pivot
    }

    scene.addEventListener('loaded', () => {
      document.querySelectorAll('.cantap').forEach((modelElement) => {
        // Cache immediately if mesh exists
        cacheOriginalMaterials(modelElement)
        // Also wait for model-loaded in case mesh is async
        modelElement.addEventListener('model-loaded', () => {
          cacheOriginalMaterials(modelElement)
        })

        const handleSelect = (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (locked) return
          locked = true
          setTimeout(() => (locked = false), 250)

          const modelId = modelElement.id
          const group = document.querySelector('#group')
          const camera = document.querySelector('#camera')

          if (currentlySelected === modelId) {
            // Deselect: restore state
            currentlySelected = null
            resetModelOpacity()
            setSelectedIndex(-1)
            updateButtonVisibility()

            // Move pivot back to origin so rotation is about origin
            const pivot = ensureCameraPivot()

            const camWorldPos = new THREE.Vector3()
            const camWorldQuat = new THREE.Quaternion()
            camera.object3D.getWorldPosition(camWorldPos)
            camera.object3D.getWorldQuaternion(camWorldQuat)

            pivot.object3D.position.set(0, 0, 0)

            pivot.object3D.worldToLocal(camWorldPos)
            camera.object3D.position.copy(camWorldPos)
            const inv = pivot.object3D.quaternion.clone().invert()
            const localQuat = inv.multiply(camWorldQuat)
            camera.object3D.quaternion.copy(localQuat)

            return
          }

          const index = modelDescriptions.findIndex(d => d.Modelname === modelId)
          if (index === -1) return

          // Selecting a model: pivot camera around the selected model's center
          currentlySelected = modelId
          setSelectedIndex(index)
          openPopup(index, modelDescriptions)
          updateModelVisibility(modelId)
          updateButtonVisibility()

          const pivot = ensureCameraPivot()

          // Preserve camera world transform while moving pivot to selected model center
          const camWorldPos = new THREE.Vector3()
          const camWorldQuat = new THREE.Quaternion()
          camera.object3D.getWorldPosition(camWorldPos)
          camera.object3D.getWorldQuaternion(camWorldQuat)

          const target = new THREE.Vector3()
          modelElement.object3D.getWorldPosition(target)

          pivot.object3D.position.copy(target)

          pivot.object3D.worldToLocal(camWorldPos)
          camera.object3D.position.copy(camWorldPos)
          const inv = pivot.object3D.quaternion.clone().invert()
          const localQuat = inv.multiply(camWorldQuat)
          camera.object3D.quaternion.copy(localQuat)

          // Ensure two-finger rotate is attached to the pivot so rotating gestures pivot the camera around the selected model
          if (!pivot.hasAttribute('xrextras-two-finger-rotate')) {
            pivot.setAttribute('xrextras-two-finger-rotate', '')
          }
        }

        modelElement.addEventListener('mousedown', handleSelect)
        modelElement.addEventListener('touchstart', handleSelect, {passive: false})
      })
    })
  },
}
