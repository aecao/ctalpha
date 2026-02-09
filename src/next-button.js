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

    const bindNavButtons = () => {
      const nextButton = document.getElementById('nextbutton')
      const backButton = document.getElementById('backbutton')

      if (!nextButton || !backButton) return
      if (nextButton.dataset.bound === 'true' && backButton.dataset.bound === 'true') return

      const handleNext = (event) => {
        event.preventDefault()
        event.stopPropagation()
        const currentIndex = getSelectedIndex()
        const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1
        if (nextIndex < modelDescriptions.length) {
          setSelectedIndex(nextIndex)
          const nextModelId = modelDescriptions[nextIndex].Modelname
          openPopup(getSelectedIndex(), modelDescriptions)
          updateButtonVisibility()
          updateModelVisibility(nextModelId)
        }
      }

      const handleBack = (event) => {
        event.preventDefault()
        event.stopPropagation()
        const currentIndex = getSelectedIndex()
        if (currentIndex > 0) {
          const prevIndex = currentIndex - 1
          setSelectedIndex(prevIndex)
          const prevModelId = modelDescriptions[prevIndex].Modelname
          openPopup(getSelectedIndex(), modelDescriptions)
          updateButtonVisibility()
          updateModelVisibility(prevModelId)
        }
      }

      nextButton.addEventListener('click', handleNext)
      nextButton.addEventListener('touchend', handleNext)
      backButton.addEventListener('click', handleBack)
      backButton.addEventListener('touchend', handleBack)

      nextButton.dataset.bound = 'true'
      backButton.dataset.bound = 'true'
    }

    bindNavButtons()
    this.el.addEventListener('loaded', bindNavButtons)
    document.addEventListener('DOMContentLoaded', bindNavButtons)
  },
})

export {nextButtonComponent, updateButtonVisibility}
