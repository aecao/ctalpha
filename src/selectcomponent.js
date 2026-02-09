import {modelDescriptions, setSelectedIndex} from './data.js'
import {openPopup, closePopup} from './popup.js'
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
        emissive: node.material.emissive ? node.material.emissive.clone() : new THREE.Color(0x000000),
        emissiveIntensity: node.material.emissiveIntensity || 0,
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
        emissive: node.material.emissive ? node.material.emissive.clone() : new THREE.Color(0x000000),
        emissiveIntensity: node.material.emissiveIntensity || 0,
      })
    }
    node.material.transparent = false
    node.material.opacity = 1
    node.material.depthWrite = true
    if (highlight) {
      // Keep original color, only add emissive glow
      node.material.color.copy(originalMaterials.get(node).color)
      if (node.material.emissive) {
        node.material.emissive.set(0x4488ff)
        node.material.emissiveIntensity = 0.4
      }
    } else {
      node.material.color.copy(originalMaterials.get(node).color)
      // Reset emissive for unselected components
      if (node.material.emissive) {
        node.material.emissive.copy(originalMaterials.get(node).emissive)
        node.material.emissiveIntensity = originalMaterials.get(node).emissiveIntensity
      }
    }
  })
}

export function updateModelVisibility(selectedModelId) {
  document.querySelectorAll('.cantap').forEach((el) => {
    if (el.id === selectedModelId) {
      setOpacity(el, 1, true)
    } else if (el.id === 'xray_tube') {
      setOpacity(el, 1)
    } else {
      setOpacity(el, 1)
    }
  })
}

export function resetModelOpacity() {
  originalMaterials.forEach((mat, node) => {
    node.material.transparent = mat.transparent
    node.material.opacity = mat.opacity
    node.material.color.copy(mat.color)
    if (node.material.emissive) {
      node.material.emissive.copy(mat.emissive)
      node.material.emissiveIntensity = mat.emissiveIntensity
    }
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
          // Model alignment removed to avoid shifting assets out of place
          if (modelElement.id === 'xray_tube') {
            const mesh = modelElement.getObject3D('mesh')
            if (mesh) {
              mesh.traverse((node) => {
                if (!node.isMesh && !node.isSkinnedMesh) return
                node.renderOrder = 10
              })
            }
          }
        })

        const handleSelect = (e) => {
          e.preventDefault()
          e.stopPropagation()
          if (locked) return
          locked = true
          setTimeout(() => (locked = false), 250)

          const modelId = modelElement.id

          if (currentlySelected === modelId) {
            currentlySelected = null
            // Close the popup and restore model visuals
            closePopup()
            setSelectedIndex(-1)
            updateButtonVisibility()
            return
          }

          const index = modelDescriptions.findIndex(d => d.Modelname === modelId)
          if (index === -1) return

          currentlySelected = modelId
          setSelectedIndex(index)
          openPopup(index, modelDescriptions)
          updateModelVisibility(modelId)
          updateButtonVisibility()
        }

        // Attach the select handler to the model element
        modelElement.addEventListener('click', handleSelect)
      })
    })
  },
}


