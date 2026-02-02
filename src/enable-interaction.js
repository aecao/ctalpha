AFRAME.registerComponent('enable-interaction-immediate', {
  init() {
    const scene = this.el
    const camera = scene.querySelector('#camera')
    const group = scene.querySelector('#group')

    const enableInteraction = () => {
      console.log('Enabling interaction')

      // Camera raycaster for taps
      camera.setAttribute('raycaster', 'objects: .cantap, .interactable')
      camera.setAttribute('cursor', 'rayOrigin: mouse; fuse: false')

      // Attach gestures to group
      if (!group.hasAttribute('xrextras-gesture-detector')) {
        group.setAttribute('xrextras-gesture-detector', '')
      }
      group.setAttribute('xrextras-hold-drag', 'rise-height: 0')
      group.setAttribute('xrextras-two-finger-rotate', '')
      group.setAttribute('xrextras-pinch-scale', '')

      console.log('Gestures attached to #group')
    }

    // If running in XR, wait for XR session
    scene.addEventListener('xrstart', enableInteraction)

    // For desktop/mouse testing, also trigger immediately after scene load
    scene.addEventListener('loaded', enableInteraction)
  },
})
