import QRCode from 'qrcode'

// Detect mobile devices
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Generate QR code for the current site
const initQRCode = () => {
  const qrContainer = document.getElementById('qr-code-container')
  if (!qrContainer) return

  const isMobileDevice = isMobile()

  // On mobile, hide QR code container
  if (isMobileDevice) {
    qrContainer.style.display = 'none'
    return
  }

  // On desktop, show QR code
  qrContainer.style.display = 'flex'
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
