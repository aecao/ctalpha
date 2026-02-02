// visibility.js
const originalMaterials = new Map()

export function cacheOriginalMaterials() {
  document.querySelectorAll('.cantap').forEach(el => {
    const mesh = el.getObject3D('mesh')
    if (!mesh) return
    mesh.traverse(node => {
      if (node.isMesh && !originalMaterials.has(node)) {
        originalMaterials.set(node, {
          transparent: node.material.transparent,
          opacity: node.material.opacity,
          color: node.material.color.clone()
        })
      }
    })
  })
}

export function setOpacity(modelElement, opacity, highlight = false) {
  const mesh = modelElement.getObject3D('mesh')
  if (!mesh) return
  mesh.traverse(node => {
    if (!node.isMesh) return
    if (!originalMaterials.has(node)) return

    const orig = originalMaterials.get(node)
    node.material.transparent = true
    node.material.opacity = opacity
    node.material.color.copy(highlight ? { r:1, g:0, b:0 } : orig.color)
  })
}

export function resetModelOpacity() {
  originalMaterials.forEach((orig, node) => {
    node.material.transparent = orig.transparent
    node.material.opacity = orig.opacity
    node.material.color.copy(orig.color)
  })
}

export function updateModelVisibility(selectedId) {
  document.querySelectorAll('.cantap').forEach(el => {
    if (el.id === selectedId) {
      setOpacity(el, 1, true)
    } else {
      setOpacity(el, 0.3)
    }
  })
}

export { originalMaterials }
