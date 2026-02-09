import {modelDescriptions, getSelectedIndex, setSelectedIndex} from './data.js'
import {openPopup} from './popup.js'
import {selectComponent} from './selectcomponent.js'
import {updateModelVisibility} from './selectcomponent.js'

// Safely update button visibility
const updateButtonVisibility = () => {
  const nextButton = document.getElementById('nextbutton')
  const backButton = document.getElementById('backbutton')
  const currentIndex = getSelectedIndex()

  if (backButton) backButton.style.display = currentIndex > 0 ? 'block' : 'none'
  if (nextButton) nextButton.style.display = currentIndex < modelDescriptions.length - 1 ? 'block' : 'none'
}

const nextButtonComponent = () => ({
  init() {
    let startButtonClicked = false

    const startButton = document.getElementById('startbutton')
    const placeButton = document.getElementById('placebutton')
    const message = document.getElementById('message')

    if (message) message.style.display = 'block'
    if (startButton) startButton.style.display = 'block'

    const enableExtraFeatures = () => {
      const modelElements = document.querySelectorAll('.cantap')
      const group = document.getElementById('group')

      if (!group) return
      modelElements.forEach((modelElement) => {
        const clonedModel = modelElement.cloneNode(true)
        group.appendChild(clonedModel)
        modelElement.remove()
      })
      group.setAttribute('xrextras-hold-drag', 'rise-height: 0')
      group.setAttribute('xrextras-two-finger-rotate', '')
    }

    if (startButton) {
      startButton.onclick = () => {
        if (!startButtonClicked) {
          startButtonClicked = true
          startButton.style.display = 'none'
          if (placeButton) placeButton.style.display = 'block'
          if (message) message.style.display = 'none'
          enableExtraFeatures()
        }
      }
    }

    if (placeButton) {
      placeButton.onclick = () => {
        placeButton.style.display = 'none'
        setSelectedIndex(0)
      selectComponent.init?.()
      updateButtonVisibility()
      }
    }

    const nextButton = document.getElementById('nextbutton')
    nextButton.onclick = () => {
      const currentIndex = getSelectedIndex()
      if (currentIndex < modelDescriptions.length - 1) {
        setSelectedIndex(currentIndex + 1)
        const nextModelId = modelDescriptions[currentIndex + 1].Modelname
        openPopup(getSelectedIndex(), modelDescriptions)
        updateButtonVisibility()
        updateModelVisibility(nextModelId)
      }
    }

    const backButton = document.getElementById('backbutton')
    backButton.onclick = () => {
      const currentIndex = getSelectedIndex()
      if (currentIndex > 0) {
        setSelectedIndex(currentIndex - 1)
        const prevModelId = modelDescriptions[currentIndex - 1].Modelname
        openPopup(getSelectedIndex(), modelDescriptions)
        updateButtonVisibility()
        updateModelVisibility(prevModelId)
      }
    }
  },
})

export {nextButtonComponent, updateButtonVisibility}
