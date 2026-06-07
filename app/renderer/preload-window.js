const { contextBridge, ipcRenderer } = require('electron')

// Build config dir path without node modules (not available in sandboxed preload)
const home = process.env.HOME || process.env.USERPROFILE || ''
const sep = process.platform === 'win32' ? '\\' : '/'
function configDir() {
  return home + sep + '.devdocs' + sep + Array.prototype.join.call(arguments, sep)
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  getConfig: function (key) { return ipcRenderer.invoke('config:get', key) },
  setConfig: function (key, value) { return ipcRenderer.invoke('config:set', key, value) },

  configDir: configDir,

  openExternal: function (url) { return ipcRenderer.invoke('shell:openExternal', url) },

  maximize: function () { return ipcRenderer.invoke('window:maximize') },

  onIPC: function (channel, callback) {
    var valid = ['open-search', 'focus-webview', 'link', 'zoom-in', 'zoom-out', 'zoom-reset']
    if (valid.indexOf(channel) !== -1) {
      var listener = function (_event) { callback.apply(null, Array.prototype.slice.call(arguments, 1)) }
      ipcRenderer.on(channel, listener)
      return function () { ipcRenderer.removeListener(channel, listener) }
    }
  },

  sendIPC: function (channel) { ipcRenderer.send.apply(ipcRenderer, arguments) },

  showMessageBox: function (options) { return ipcRenderer.invoke('dialog:messageBox', options) },

  fileExists: function (p) { return ipcRenderer.invoke('fs:exists', p) },
  readFile: function (p) { return ipcRenderer.invoke('fs:readFile', p) },
  writeFile: function (p, data) { return ipcRenderer.invoke('fs:writeFile', p, data) }
})
