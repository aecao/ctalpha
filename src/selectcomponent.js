import {modelDescriptions, getSelectedIndex, setSelectedIndex} from './data.js'
import {openPopup, closePopup} from './popup.js'
import {updateButtonVisibility} from './next-button.js'

const originalMaterials = new Map()

// ── Outline (screen-space silhouette stroke) ────────────────────────────────
// Vertices are offset along their clip-space normal direction by a fixed
// NDC amount, so the stroke is a uniform flat 2D ring around the silhouette.
const OUTLINE_THICKNESS = 0.005
const outlineMaterial = new THREE.ShaderMaterial({
  uniforms: {
    outlineThickness: { value: OUTLINE_THICKNESS },
  },
  vertexShader: /* glsl */`
    uniform float outlineThickness;
    void main() {
      vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 viewNormal = normalize(normalMatrix * normal);
      vec2 n = viewNormal.xy;
      float len = length(n);
      vec2 screenOffset = (len > 0.0001) ? (n / len) : vec2(0.0, 1.0);
      clipPos.xy += screenOffset * outlineThickness * clipPos.w;
      gl_Position = clipPos;
    }
  `,
  fragmentShader: /* glsl */`
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthTest: true,
  depthWrite: false,
})

function addOutlines(modelElement) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse((node) => {
    if (node._isOutline) return
    if (!node.isMesh && !node.isSkinnedMesh) return
    if (!node.geometry) return
    if (node.children.some((c) => c._isOutline)) return // already added
    const outline = new THREE.Mesh(node.geometry, outlineMaterial)
    outline._isOutline = true
    outline.renderOrder = node.renderOrder - 1
    node.add(outline)
  })
}

function removeOutlines(modelElement) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse((node) => {
    if (node._isOutline) return
    const toRemove = node.children.filter((c) => c._isOutline)
    toRemove.forEach((c) => node.remove(c))
  })
}
// ─────────────────────────────────────────────────────────────────────────────

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
    if (node._isOutline) return
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
    if (node._isOutline) return
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
    document.querySelectorAll('[gltf-model]').forEach((el) => removeOutlines(el))
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
      addOutlines(el)
    } else if (!isLaserSelected && isLaserSurface) {
      // Hidden laser surfaces are excluded from dimming when lasers are off
      setOpacity(el, 1, false)
      removeOutlines(el)
    } else {
      setOpacity(el, DIM_OPACITY, true)
      removeOutlines(el)
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
    const popupElement = document.getElementById('popup')
    const offscreenBanner = document.getElementById('offscreen-status-banner')
    const tempPointer = new THREE.Vector2()
    const tempRaycaster = new THREE.Raycaster()
    const tempWorldPos = new THREE.Vector3()
    const tempNDC = new THREE.Vector3()
    const tempBox = new THREE.Box3()
    const tempSphere = new THREE.Sphere()
    const tempProjectionMatrix = new THREE.Matrix4()
    const tempFrustum = new THREE.Frustum()
    let locked = false
    let lastTouchInteractionAt = 0
    const TOUCH_CLICK_SUPPRESSION_MS = 900

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

    const getActiveCamera = () => {
      const camera = scene.camera
      if (!camera) return null
      if (camera.isArrayCamera && Array.isArray(camera.cameras) && camera.cameras.length > 0) {
        return camera.cameras
      }
      return [camera]
    }

    const clearSelection = () => {
      closePopup()
      setSelectedIndex(-1)
      updateButtonVisibility()
      updateModelVisibility(null)
      setOffscreenBannerVisible(false)
    }

    const isModelOffscreen = (modelId) => {
      const selectedModel = document.getElementById(modelId)
      if (!selectedModel) return false

      const cameras = getActiveCamera()
      if (!cameras || cameras.length === 0) return false
      selectedModel.object3D.updateMatrixWorld(true)

      const mesh = selectedModel.getObject3D('mesh')
      if (mesh) {
        tempBox.setFromObject(mesh)
        if (!tempBox.isEmpty()) {
          tempBox.getBoundingSphere(tempSphere)

          const visibleInAnyCamera = cameras.some((camera) => {
            camera.updateMatrixWorld(true)
            tempProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
            tempFrustum.setFromProjectionMatrix(tempProjectionMatrix)
            return tempFrustum.intersectsSphere(tempSphere)
          })

          return !visibleInAnyCamera
        }
      }

      selectedModel.object3D.getWorldPosition(tempWorldPos)

      const visibleInAnyCamera = cameras.some((camera) => {
        tempNDC.copy(tempWorldPos).project(camera)
        return tempNDC.z >= -1 && tempNDC.z <= 1 && Math.abs(tempNDC.x) <= 1.05 && Math.abs(tempNDC.y) <= 1.05
      })

      return !visibleInAnyCamera
    }

    const getEventClientPoint = (event) => {
      if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        return {x: event.clientX, y: event.clientY}
      }

      const touch = event.changedTouches?.[0] || event.touches?.[0]
      if (touch && typeof touch.clientX === 'number' && typeof touch.clientY === 'number') {
        return {x: touch.clientX, y: touch.clientY}
      }

      return null
    }

    const getPrimaryRaycastCamera = () => {
      const cameraEl = document.getElementById('camera')
      const cameraObj = cameraEl?.getObject3D?.('camera')
      if (cameraObj) return cameraObj

      const cameras = getActiveCamera()
      if (!cameras || cameras.length === 0) return null
      return cameras[0]
    }

    const pickModelFromScreenPoint = (event) => {
      const point = getEventClientPoint(event)
      if (!point) return null

      const camera = getPrimaryRaycastCamera()
      if (!camera) return null

      const canvas = scene.canvas || scene.renderer?.domElement
      const rect = canvas?.getBoundingClientRect ? canvas.getBoundingClientRect() : null
      if (!rect || rect.width <= 0 || rect.height <= 0) return null

      tempPointer.x = ((point.x - rect.left) / rect.width) * 2 - 1
      tempPointer.y = -((point.y - rect.top) / rect.height) * 2 + 1

      camera.updateMatrixWorld(true)
      tempRaycaster.setFromCamera(tempPointer, camera)

      const candidateMeshes = []
      const meshToElement = new Map()
      document.querySelectorAll('.cantap').forEach((el) => {
        const mesh = el.getObject3D('mesh')
        if (!mesh) return
        mesh.traverse((node) => {
          if (!node.isMesh && !node.isSkinnedMesh) return
          candidateMeshes.push(node)
          meshToElement.set(node, el)
        })
      })

      if (candidateMeshes.length === 0) return null

      const intersections = tempRaycaster.intersectObjects(candidateMeshes, false)
      for (const hit of intersections) {
        let current = hit.object
        while (current) {
          const matched = meshToElement.get(current)
          if (matched) return matched
          current = current.parent
        }
      }

      return null
    }

    const updateOffscreenBanner = () => {
      const selectedIndex = getSelectedIndex()
      if (selectedIndex < 0 || selectedIndex >= modelDescriptions.length) {
        setOffscreenBannerVisible(false)
        if (popupElement && popupElement.style.display !== 'none') {
          popupElement.style.display = 'none'
        }
        return
      }

      const modelId = modelDescriptions[selectedIndex].Modelname
      setOffscreenBannerVisible(isModelOffscreen(modelId), modelId)
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
      const handleSceneSelection = (e) => {
        if (locked) return

        const isTouchLikeEvent = e.type === 'touchend' || e.pointerType === 'touch' || e.pointerType === 'pen'
        const now = performance.now()

        // Some tablets emit synthetic click after touch/pointer tap.
        // Ignore that follow-up click to avoid tap toggling selection twice.
        if (e.type === 'click' && now - lastTouchInteractionAt < TOUCH_CLICK_SUPPRESSION_MS) {
          return
        }

        if (isTouchLikeEvent) {
          lastTouchInteractionAt = now
        }

        let modelElement = e.target?.closest ? e.target.closest('.cantap') : null
        if (!modelElement) {
          modelElement = pickModelFromScreenPoint(e)
        }

        if (!modelElement) {
          if (getSelectedIndex() !== -1) {
            clearSelection()
          }
          return
        }

        locked = true
        setTimeout(() => (locked = false), 250)

        const modelId = modelElement.id
        const selectedIndex = getSelectedIndex()
        const selectedModelId = selectedIndex >= 0 && selectedIndex < modelDescriptions.length
          ? modelDescriptions[selectedIndex].Modelname
          : null

        if (selectedModelId === modelId) {
          clearSelection()
          return
        }

        const index = modelDescriptions.findIndex(d => d.Modelname === modelId)
        if (index === -1) return

        setSelectedIndex(index)
        openPopup(index, modelDescriptions)
        updateButtonVisibility()
        updateModelVisibility(modelId)
        updateOffscreenBanner()
      }

      scene.addEventListener('click', handleSceneSelection)

      const sceneCanvas = scene.canvas || scene.renderer?.domElement
      if (sceneCanvas) {
        sceneCanvas.addEventListener('touchend', handleSceneSelection, {passive: true})
        sceneCanvas.addEventListener('pointerup', (event) => {
          if (event.pointerType === 'touch' || event.pointerType === 'pen') {
            handleSceneSelection(event)
          }
        }, {passive: true})
      }
    })
  },
}


