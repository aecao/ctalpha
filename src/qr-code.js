import QRCode from 'qrcode'

// Detect mobile devices
const isMobile = () => {
  const userAgent = navigator.userAgent || ''
  const isClassicMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isIPadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1

  return isClassicMobile || isIPadDesktopMode
}

// Generate QR code for the current site
const initQRCode = () => {
  const qrContainer = document.getElementById('qr-code-container')
  const realScaleButton = document.getElementById('real-scale-button')
  const fixRotationButton = document.getElementById('fix-in-place-button')

  const setAppControlsVisible = (visible) => {
    const displayValue = visible ? 'block' : 'none'
    if (realScaleButton) realScaleButton.style.display = displayValue
    if (fixRotationButton) fixRotationButton.style.display = displayValue
  }

  if (!qrContainer) return

  const isMobileDevice = isMobile()

  // On mobile, hide QR code container
  if (isMobileDevice) {
    qrContainer.style.display = 'none'
    setAppControlsVisible(true)
    return
  }

  // On desktop, show QR code
  qrContainer.style.display = 'flex'
  setAppControlsVisible(false)
  const siteUrl = window.location.href

  const canvas = document.getElementById('qr-code-canvas')
  QRCode.toCanvas(
    canvas,
    siteUrl,
    {
      errorCorrectionLevel: 'H',
      type: 'image/jpeg',
      quality: 0.95,
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    },
    (error) => {
      if (error) console.error('QR code generation failed:', error)
      else console.log('QR code generated successfully')
    }
  )
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initQRCode)

export { initQRCode, isMobile }
