const path = require('path')
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const debug = require('debug')('devdocs-desktop:index')
const createMenu = require('./menu')
const config = require('./config')
const tray = require('./tray')
const updater = require('./updater')
const { toggleGlobalShortcut } = require('./utils')

app.setAppUserModelId('sh.egoist.devdocs')

let mainWindow
let isQuitting = false
let urlToOpen

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
  }
})

// --- IPC handlers for renderer ---

ipcMain.handle('config:get', (_event, key) => {
  return config.get(key)
})

ipcMain.handle('config:set', (_event, key, value) => {
  config.set(key, value)
})

ipcMain.handle('shell:openExternal', (_event, url) => {
  shell.openExternal(url)
})

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.maximize()
})

ipcMain.handle('dialog:messageBox', async (event, options) => {
  const { dialog } = require('electron')
  const win = BrowserWindow.fromWebContents(event.sender)
  return dialog.showMessageBox(win, options)
})

ipcMain.handle('fs:readFile', (_event, filePath) => {
  const fs = require('fs')
  return fs.readFileSync(filePath, 'utf8')
})

ipcMain.handle('fs:writeFile', (_event, filePath, data) => {
  const fs = require('fs')
  const path = require('path')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, data, 'utf8')
})

ipcMain.handle('fs:exists', (_event, filePath) => {
  const fs = require('fs')
  return fs.existsSync(filePath)
})



// --- Window ---

function toggleWindow() {
  if (!mainWindow) return
  if (mainWindow.isFocused()) {
    Menu.sendActionToFirstResponder('hide:')
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function createMainWindow() {
  const lastWindowState = config.get('lastWindowState')

  const win = new BrowserWindow({
    title: app.name,
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    minWidth: 600,
    minHeight: 400,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload-window.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  })

  if (process.platform === 'darwin') {
    win.setSheetOffset(24)
  }

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  // Context menu on the main window itself
  win.webContents.on('context-menu', (_event, params) => {
    const template = buildContextMenu(params)
    if (template.length > 0) {
      Menu.buildFromTemplate(template).popup()
    }
  })

  // Context menu for embedded webviews
  win.webContents.on('did-attach-webview', (_event, webviewWC) => {
    webviewWC.on('context-menu', (_ev, params) => {
      const template = buildContextMenu(params, webviewWC)
      if (template.length > 0) {
        Menu.buildFromTemplate(template).popup()
      }
    })
  })

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      if (process.platform === 'darwin') {
        app.hide()
      } else {
        win.hide()
      }
    }
  })

  return win
}

function buildContextMenu(params, webContents) {
  const template = []

  if (webContents && params.misspelledWord) {
    for (const suggestion of params.dictionarySuggestions || []) {
      template.push({
        label: suggestion,
        click: () => webContents.replaceMisspelling(suggestion),
      })
    }
    if (template.length > 0) {
      template.push({ type: 'separator' })
    }
  }

  if (params.isEditable) {
    template.push({ role: 'undo' })
    template.push({ role: 'redo' })
    template.push({ type: 'separator' })
    template.push({ role: 'cut' })
    template.push({ role: 'copy' })
    template.push({ role: 'paste' })
    template.push({ role: 'selectAll' })
  } else if (params.selectionText) {
    template.push({ role: 'copy' })
  }

  if (params.linkURL) {
    if (template.length > 0) template.push({ type: 'separator' })
    template.push({
      label: 'Open Link in Browser',
      click: () => shell.openExternal(params.linkURL),
    })
  }

  if (params.selectionText && params.selectionText.trim().length > 0) {
    if (template.length > 0) template.push({ type: 'separator' })
    template.push({
      label: 'Search Google for "' + params.selectionText + '"',
      click: () =>
        shell.openExternal(
          'https://www.google.com/search?q=' + encodeURIComponent(params.selectionText)
        ),
    })
    template.push({
      label: 'Search DuckDuckGo for "' + params.selectionText + '"',
      click: () =>
        shell.openExternal(
          'https://duckduckgo.com/?q=' + encodeURIComponent(params.selectionText)
        ),
    })
  }

  if (webContents) {
    if (template.length > 0) template.push({ type: 'separator' })
    template.push({
      label: 'Inspect Element',
      click: () => {
        if (webContents.isDevToolsOpened()) {
          webContents.devToolsWebContents.focus()
        } else {
          webContents.openDevTools()
        }
      },
    })
  }

  return template
}

// --- App lifecycle ---

app.on('ready', () => {
  const shortcut = config.get('shortcut')
  for (const name in shortcut) {
    const accelerator = shortcut[name]
    if (accelerator) {
      toggleGlobalShortcut({
        name,
        accelerator,
        registered: false,
        action: toggleWindow,
      })
    }
  }

  Menu.setApplicationMenu(createMenu({ toggleWindow }))
  mainWindow = createMainWindow()
  tray.create(mainWindow)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    updater.init()
    if (urlToOpen) {
      mainWindow.webContents.send('link', urlToOpen)
    }
  })
})

app.on('activate', () => {
  mainWindow.show()
})

let hasOpenedOnce = false
app.on('browser-window-focus', () => {
  if (hasOpenedOnce) {
    mainWindow.webContents.send('focus-webview')
  } else {
    hasOpenedOnce = true
  }
})

app.on('before-quit', () => {
  isQuitting = true
  if (!mainWindow.isFullScreen()) {
    config.set('lastWindowState', mainWindow.getBounds())
  }
})

app.setAsDefaultProtocolClient('devdocs')

app.on('will-finish-launching', () => {
  app.on('open-url', (_e, url) => {
    if (mainWindow) {
      mainWindow.webContents.send('link', url)
    } else {
      urlToOpen = url
    }
  })
})
