const { ipcRenderer } = require('electron')

let zoomFactor = 1

// Listen for zoom commands from host
ipcRenderer.on('set-zoom', (_event, factor) => {
  zoomFactor = factor
  applyZoom()
})

ipcRenderer.on('zoom-in', () => {
  zoomFactor = Math.min(zoomFactor + 0.1, 1.6)
  applyZoom()
  ipcRenderer.sendToHost('zoom-changed', zoomFactor)
})

ipcRenderer.on('zoom-out', () => {
  zoomFactor = Math.max(zoomFactor - 0.1, 0.8)
  applyZoom()
  ipcRenderer.sendToHost('zoom-changed', zoomFactor)
})

ipcRenderer.on('zoom-reset', () => {
  zoomFactor = 1
  applyZoom()
  ipcRenderer.sendToHost('zoom-changed', zoomFactor)
})

function applyZoom() {
  const node = document.querySelector('#zzz-devzoom')
  if (node) {
    node.textContent = 'body {zoom: ' + zoomFactor + ' !important}'
  }
}

// Dark mode detection
document.addEventListener('change', (e) => {
  if (e.target.name === 'dark') {
    ipcRenderer.sendToHost('switch-mode', e.target.checked ? 'dark' : 'light')
  }
})

document.addEventListener('DOMContentLoaded', () => {
  // Create zoom style element
  const style = document.createElement('style')
  style.id = 'zzz-devzoom'
  style.textContent = 'body {zoom: ' + zoomFactor + ' !important}'
  document.body.append(style)

  // Detect initial dark mode
  if (/dark=1;/.test(document.cookie)) {
    ipcRenderer.sendToHost('switch-mode', 'dark')
  } else {
    ipcRenderer.sendToHost('switch-mode', 'light')
  }
})
