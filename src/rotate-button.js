let isRotating = false

const rotateComponent = {
  init() {
    const btn = document.getElementById('rotate-button')
    const pivot = document.getElementById('rotation_pivot')

    btn.addEventListener('click', () => {
      isRotating = !isRotating
      console.log('Rotation toggled:', isRotating)

      if (isRotating) {
        pivot.setAttribute('animation__spin', {
          property: 'rotation',
          to: '360 0 0',
          loop: true,
          dur: 3000,
          easing: 'linear',
        })
      } else {
        pivot.removeAttribute('animation__spin')
      }
    })
  },
}

export {rotateComponent}
