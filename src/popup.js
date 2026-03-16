import {resetModelOpacity, updateModelVisibility} from './selectcomponent.js'

function openPopup(modelIndex, modelDescriptions) {
  const popup = document.getElementById('popup')
  const popupTitle = document.getElementById('popup-title')
  const popupContent = document.getElementById('popup-content')
  const closePopupButton = document.getElementById('close-popup')
  const progressFill = document.getElementById('popup-progress-fill')

  if (progressFill && modelDescriptions.length > 0) {
    const pct = ((modelIndex + 1) / modelDescriptions.length) * 100
    progressFill.style.width = `${pct}%`
  }

  if (modelIndex >= 0 && modelIndex < modelDescriptions.length) {
    const {Title, Subtitle, Description} = modelDescriptions[modelIndex]
    let htmlTitle = `
        <div class="title">${Title}</div>
    `
    if (Subtitle) {
      htmlTitle += `<div class="subtitle">${Subtitle}</div>`
    }
    popupTitle.innerHTML = htmlTitle

    const paragraphs = Description.split('\n\n')
    let htmlContent = ''
    htmlContent += '<div class="content">'
    paragraphs.forEach((paragraph) => {
      if (paragraph.trim() !== '') {
        htmlContent += `<p>${paragraph}</p>`
      }
    })
    htmlContent += '</div>'
    htmlContent += '</div>'
    popupContent.innerHTML = htmlContent
    popup.style.display = 'flex'
  }

  closePopupButton.onclick = () => {
    popup.style.display = 'none'
    if (progressFill) progressFill.style.width = '0%'
    resetModelOpacity()
  }
}

// Programmatic close for other components to call
function closePopup() {
  const popup = document.getElementById('popup')
  const progressFill = document.getElementById('popup-progress-fill')
  if (popup) popup.style.display = 'none'
  if (progressFill) progressFill.style.width = '0%'
  resetModelOpacity()
}

export {openPopup, closePopup}
