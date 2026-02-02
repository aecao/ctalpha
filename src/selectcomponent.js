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

          if (currentlySelected === modelId) {
            // Deselect: restore gestures to the group
            currentlySelected = null
            resetModelOpacity()
            setSelectedIndex(-1)
            updateButtonVisibility()

            // Move two-finger rotate back to the group
            if (modelElement.hasAttribute('xrextras-two-finger-rotate')) {
              modelElement.removeAttribute('xrextras-two-finger-rotate')
              if (!group.hasAttribute('xrextras-two-finger-rotate')) {
                group.setAttribute('xrextras-two-finger-rotate', '')
              }
            }

            return
          }

          const index = modelDescriptions.findIndex(d => d.Modelname === modelId)
          if (index === -1) return

          // Selecting a model: give the two-finger rotate to the selected model
          currentlySelected = modelId
          setSelectedIndex(index)
          openPopup(index, modelDescriptions)
          updateModelVisibility(modelId)
          updateButtonVisibility()

          // Transfer two-finger rotate from the group to the selected model so rotation occurs around its center
          if (group.hasAttribute('xrextras-two-finger-rotate')) {
            group.removeAttribute('xrextras-two-finger-rotate')
          }
          modelElement.setAttribute('xrextras-two-finger-rotate', '')
        }

        modelElement.addEventListener('mousedown', handleSelect)
        modelElement.addEventListener('touchstart', handleSelect, {passive: false})
      })
    })
  },
}
