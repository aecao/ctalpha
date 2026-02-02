// start-button.js

export const startButton = {
  init() {
    const startBtn = document.getElementById('startbutton')
    const message = document.getElementById('message')
    const rotateBtn = document.getElementById('rotate-button')
    const pivot = document.getElementById('rotation_pivot')

    if (!startBtn) {
      console.warn('startButton: #startbutton not found')
      return
    }

    const onStart = (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Hide intro UI
      startBtn.style.display = 'none'
      if (message) message.style.display = 'none'

      // 🚫 DO NOT touch isRotating here
      // 🚫 DO NOT remove animation attributes

      // ✅ If rotation was already on, restore animation (mobile-safe)
      if (
        pivot &&
        pivot.hasAttribute('animation__spin')
      ) {
        pivot.setAttribute('animation__spin', {
          property: 'rotation',
          from: '0 0 0',
          to: '0 360 0',
          loop: true,
          dur: 3000,
          easing: 'linear',
        })
      }

      console.log('Start pressed')
    }

    // Mobile + desktop
    startBtn.addEventListener('touchstart', onStart)
    startBtn.addEventListener('click', onStart)
  },
}
