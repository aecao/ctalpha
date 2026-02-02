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

          // Move the camera pivot to the selected model's world position so gestures pivot around it
          const cameraPivot = document.querySelector('#camera_pivot')
          if (cameraPivot) {
            const worldPos = new THREE.Vector3()
            modelElement.object3D.getWorldPosition(worldPos)
            // Raise pivot slightly above model center for better framing
            const raise = 0.3
            cameraPivot.setAttribute('position', `${worldPos.x} ${worldPos.y + raise} ${worldPos.z}`)
          }
        }

        // Attach the select handler to the model element
        modelElement.addEventListener('click', handleSelect)
      })
    })
  },
}


