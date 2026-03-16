import {modelDescriptions, setSelectedIndex} from './data.js'
import {openPopup, closePopup} from './popup.js'
import {updateButtonVisibility} from './next-button.js'

const originalMaterials = new Map()
const DIM_OPACITY = 0.24
const DIM_UNIFORM_COLOR = 0x8c95a6
const DIM_UNIFORM_EMISSIVE = 0x1e2532
const DIM_UNIFORM_EMISSIVE_INTENSITY = 0.08
const DIM_UNIFORM_SHADER_INTENSITY = 0.36
const LASER_SURFACE_IDS = ['laser_surface_1', 'laser_surface_2', 'laser_surface_3']

const isLaserEntity = (id) => id === 'laser_positioning_lights' || LASER_SURFACE_IDS.includes(id)

const setLaserVisibility = (selectedModelId) => {
  const showLasers = selectedModelId === 'laser_positioning_lights'
  LASER_SURFACE_IDS.forEach((id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.setAttribute('visible', showLasers ? 'true' : 'false')
  })
}

const getSafeColor = (material) => {
  if (material && material.color && material.color.isColor) return material.color.clone()
  return new THREE.Color(0xffffff)
}

const getSafeEmissive = (material) => {
  if (material && material.emissive && material.emissive.isColor) return material.emissive.clone()
  return new THREE.Color(0x000000)
}

const getSafeShaderUniformColor = (uniformValue, fallbackColor) => {
  if (uniformValue && uniformValue.isColor) return uniformValue.clone()
  return new THREE.Color(fallbackColor)
}

function cacheOriginalMaterials(modelElement) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return
    const material = node.material
    if (!material) return
    if (!originalMaterials.has(node)) {
      originalMaterials.set(node, {
        transparent: material.transparent,
        opacity: typeof material.opacity === 'number' ? material.opacity : 1,
        depthWrite: material.depthWrite,
        depthTest: material.depthTest,
        color: getSafeColor(material),
        emissive: getSafeEmissive(material),
        emissiveIntensity: material.emissiveIntensity || 0,
        shaderOpacity: typeof material.uniforms?.uOpacity?.value === 'number'
          ? material.uniforms.uOpacity.value
          : null,
        shaderInnerColor: getSafeShaderUniformColor(material.uniforms?.uInnerColor?.value, 0xff2a2a),
        shaderOuterColor: getSafeShaderUniformColor(material.uniforms?.uOuterColor?.value, 0x7a0000),
        shaderIntensity: typeof material.uniforms?.uIntensity?.value === 'number'
          ? material.uniforms.uIntensity.value
          : null,
      })
    }
  })
}


export function setOpacity(modelElement, opacity, dimmed = false, highlight = false) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse((node) => {
    if (!node.isMesh && !node.isSkinnedMesh) return
    const material = node.material
    if (!material) return
    if (!originalMaterials.has(node)) {
      originalMaterials.set(node, {
        transparent: material.transparent,
        opacity: typeof material.opacity === 'number' ? material.opacity : 1,
        depthWrite: material.depthWrite,
        depthTest: material.depthTest,
        color: getSafeColor(material),
        emissive: getSafeEmissive(material),
        emissiveIntensity: material.emissiveIntensity || 0,
        shaderOpacity: typeof material.uniforms?.uOpacity?.value === 'number'
          ? material.uniforms.uOpacity.value
          : null,
        shaderInnerColor: getSafeShaderUniformColor(material.uniforms?.uInnerColor?.value, 0xff2a2a),
        shaderOuterColor: getSafeShaderUniformColor(material.uniforms?.uOuterColor?.value, 0x7a0000),
        shaderIntensity: typeof material.uniforms?.uIntensity?.value === 'number'
          ? material.uniforms.uIntensity.value
          : null,
      })
    }
    const original = originalMaterials.get(node)

    if (dimmed) {
      material.transparent = true
      material.opacity = Math.min(opacity, original.opacity)
      material.depthWrite = false

      if (material.color && material.color.isColor) {
        material.color.set(DIM_UNIFORM_COLOR)
      }

      if (material.emissive && material.emissive.isColor) {
        material.emissive.set(DIM_UNIFORM_EMISSIVE)
        material.emissiveIntensity = DIM_UNIFORM_EMISSIVE_INTENSITY
      }

      if (material.uniforms?.uOpacity) {
        material.uniforms.uOpacity.value = Math.min(opacity, 1)
      }

      if (material.uniforms?.uInnerColor?.value && material.uniforms.uInnerColor.value.isColor) {
        material.uniforms.uInnerColor.value.set(DIM_UNIFORM_COLOR)
      }

      if (material.uniforms?.uOuterColor?.value && material.uniforms.uOuterColor.value.isColor) {
        material.uniforms.uOuterColor.value.set(DIM_UNIFORM_COLOR)
      }

      if (material.uniforms?.uIntensity) {
        material.uniforms.uIntensity.value = DIM_UNIFORM_SHADER_INTENSITY
      }
    } else {
      material.transparent = original.transparent
      material.opacity = original.opacity
      material.depthWrite = original.depthWrite
      material.depthTest = original.depthTest

      if (material.color && material.color.isColor) {
        material.color.copy(original.color)
      }

      if (material.emissive && material.emissive.isColor) {
        if (highlight) {
          material.emissive.set(0x4488ff)
          material.emissiveIntensity = 0.4
        } else {
          material.emissive.copy(original.emissive)
          material.emissiveIntensity = original.emissiveIntensity
        }
      }

      if (material.uniforms?.uOpacity && typeof original.shaderOpacity === 'number') {
        material.uniforms.uOpacity.value = original.shaderOpacity
      }

      if (material.uniforms?.uInnerColor?.value && material.uniforms.uInnerColor.value.isColor) {
        material.uniforms.uInnerColor.value.copy(original.shaderInnerColor)
      }

      if (material.uniforms?.uOuterColor?.value && material.uniforms.uOuterColor.value.isColor) {
        material.uniforms.uOuterColor.value.copy(original.shaderOuterColor)
      }

      if (material.uniforms?.uIntensity && typeof original.shaderIntensity === 'number') {
        material.uniforms.uIntensity.value = original.shaderIntensity
      }
    }

    material.needsUpdate = true
  })
}

export function updateModelVisibility(selectedModelId) {
  if (!selectedModelId) {
    resetModelOpacity()
    setLaserVisibility(null)
    return
  }

  const isLaserSelected = selectedModelId === 'laser_positioning_lights'
  setLaserVisibility(selectedModelId)

  document.querySelectorAll('[gltf-model]').forEach((el) => {
    const isLaserSurface = el.id === 'laser_surface_1' || el.id === 'laser_surface_2' || el.id === 'laser_surface_3'

    if (el.id === selectedModelId) {
      setOpacity(el, 1, false, true)
    } else if (!isLaserSelected && isLaserSurface) {
      // Hidden laser surfaces are excluded from dimming when lasers are off
      setOpacity(el, 1, false)
    } else {
      setOpacity(el, DIM_OPACITY, true)
    }
  })
}

export function resetModelOpacity() {
  originalMaterials.forEach((mat, node) => {
    const material = node.material
    if (!material) return

    material.transparent = mat.transparent
    material.opacity = mat.opacity
    material.depthWrite = mat.depthWrite
    material.depthTest = mat.depthTest

    if (material.color && material.color.isColor) {
      material.color.copy(mat.color)
    }

    if (material.emissive && material.emissive.isColor) {
      material.emissive.copy(mat.emissive)
      material.emissiveIntensity = mat.emissiveIntensity
    }

    if (material.uniforms?.uOpacity && typeof mat.shaderOpacity === 'number') {
      material.uniforms.uOpacity.value = mat.shaderOpacity
    }

    if (material.uniforms?.uInnerColor?.value && material.uniforms.uInnerColor.value.isColor) {
      material.uniforms.uInnerColor.value.copy(mat.shaderInnerColor)
    }

    if (material.uniforms?.uOuterColor?.value && material.uniforms.uOuterColor.value.isColor) {
      material.uniforms.uOuterColor.value.copy(mat.shaderOuterColor)
    }

    if (material.uniforms?.uIntensity && typeof mat.shaderIntensity === 'number') {
      material.uniforms.uIntensity.value = mat.shaderIntensity
    }

    material.needsUpdate = true
  })
}

export const selectComponent = {
  init() {
    const scene = this.el
    const offscreenBanner = document.getElementById('offscreen-status-banner')
    const tempWorldPos = new THREE.Vector3()
    const tempNDC = new THREE.Vector3()
    const tempBox = new THREE.Box3()
    let currentlySelected = null
    let locked = false

    const getSelectedTitle = (modelId) => {
      const match = modelDescriptions.find((item) => item.Modelname === modelId)
      return match?.Title || 'Selected Component'
    }

    const setOffscreenBannerVisible = (visible, modelId = null) => {
      if (!offscreenBanner) return
      if (!visible || !modelId) {
        offscreenBanner.style.display = 'none'
        offscreenBanner.textContent = ''
        return
      }

      offscreenBanner.textContent = `${getSelectedTitle(modelId)} is off-screen`
      offscreenBanner.style.display = 'block'
    }

    const isSelectedModelOffscreen = () => {
      if (!currentlySelected) return false
      const selectedModel = document.getElementById(currentlySelected)
      if (!selectedModel) return false

      // scene.camera is the actual THREE.js camera A-Frame renders with,
      // including the XR camera in AR mode — more reliable than querying the entity.
      const camera = scene.camera
      if (!camera) return false

      // Compute world-space bounding box center of the mesh so models sharing
      // the group origin (0,0,0) are located correctly.
      const mesh = selectedModel.getObject3D('mesh')
      if (mesh) {
        tempBox.setFromObject(mesh)
        if (!tempBox.isEmpty()) {
          tempBox.getCenter(tempWorldPos)
        } else {
          selectedModel.object3D.getWorldPosition(tempWorldPos)
        }
      } else {
        selectedModel.object3D.getWorldPosition(tempWorldPos)
      }

      // Project to NDC [-1..1] in x/y. After project(), z > 1 means behind
      // the camera; |x| or |y| > 1 means outside the viewport.
      // A small margin (1.05) avoids jitter right at the edges.
      tempNDC.copy(tempWorldPos).project(camera)
      if (tempNDC.z > 1) return true
      if (Math.abs(tempNDC.x) > 1.05 || Math.abs(tempNDC.y) > 1.05) return true
      return false
    }

    const updateOffscreenBanner = () => {
      if (!currentlySelected) {
        setOffscreenBannerVisible(false)
        return
      }

      setOffscreenBannerVisible(isSelectedModelOffscreen(), currentlySelected)
    }

    const bannerLoop = () => {
      updateOffscreenBanner()
      requestAnimationFrame(bannerLoop)
    }

    requestAnimationFrame(bannerLoop)

    scene.addEventListener('loaded', () => {
      setLaserVisibility(null)
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
      })

      // Single delegated handler on the scene so only the actual clicked
      // target determines currentlySelected — avoids A-Frame event bubbling
      // causing multiple per-element handlers to overwrite each other.
      scene.addEventListener('click', (e) => {
        const modelElement = e.target
        if (!modelElement || !modelElement.classList.contains('cantap')) return

        if (locked) return
        locked = true
        setTimeout(() => (locked = false), 250)

        const modelId = modelElement.id

        if (currentlySelected === modelId) {
          currentlySelected = null
          closePopup()
          setSelectedIndex(-1)
          updateButtonVisibility()
          updateModelVisibility(null)
          setOffscreenBannerVisible(false)
          return
        }

        const index = modelDescriptions.findIndex(d => d.Modelname === modelId)
        if (index === -1) return

        currentlySelected = modelId
        setSelectedIndex(index)
        openPopup(index, modelDescriptions)
        updateButtonVisibility()
        updateModelVisibility(modelId)
        updateOffscreenBanner()
      })
    })
  },
}


