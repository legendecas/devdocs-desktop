;(async function () {
  var api = window.electronAPI

  // Ensure custom CSS/JS files exist
  await ensureCustomFiles()

  // Platform class
  document.body.classList.add('is-' + api.platform)

  // Dark mode
  var mode = await api.getConfig('mode')
  if (mode === 'dark') {
    document.body.classList.add('is-dark-mode')
  }

  // WebView
  var webview
  var pendingNavigate

  function navigateTo(url) {
    if (webview && webview.__ready) {
      if (url.indexOf('devdocs://') === 0) {
        var route = url.replace('devdocs://', '')
        var match = route.match(/^search\/(.+)$/)
        if (match) {
          webview.src = 'https://devdocs.io/#q=' + encodeURIComponent(match[1])
        }
      } else {
        webview.src = url
      }
    } else {
      pendingNavigate = url
    }
  }

  webview = await createWebView()

  if (pendingNavigate) {
    navigateTo(pendingNavigate)
    pendingNavigate = null
  }

  // Debounced resize
  var resizeTimer
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(function () {
      webview.reload()
    }, 1000)
  })

  // Searcher for in-page find
  var searcher = new window.Searcher(webview)
  searcher.on('close', function () { webview.focus() })

  // IPC from main process
  api.onIPC('open-search', function () { searcher.open() })
  api.onIPC('focus-webview', function () { webview.focus() })
  api.onIPC('zoom-in', function () { webview.send('zoom-in') })
  api.onIPC('zoom-out', function () { webview.send('zoom-out') })
  api.onIPC('zoom-reset', function () { webview.send('zoom-reset') })

  api.onIPC('navigate', function (url) {
    navigateTo(url)
  })

  // Expose tab creation for new-window events from webview
  window._createTab = function (url) {
    api.sendIPC('create-tab', url)
  }

  async function ensureCustomFiles() {
    var cssPath = api.configDir('custom.css')
    var jsPath = api.configDir('custom.js')

    if (!(await api.fileExists(cssPath))) {
      await api.writeFile(cssPath, '')
    }
    if (!(await api.fileExists(jsPath))) {
      await api.writeFile(jsPath, '')
    }
  }

  function createWebView() {
    return new Promise(function (resolve, reject) {
      var wv = document.createElement('webview')
      wv.className = 'webview'
      wv.src = 'https://devdocs.io'
      wv.preload = 'preload.js'

      wv.addEventListener('ipc-message', async function (e) {
        if (e.channel === 'switch-mode') {
          var m = e.args[0]
          await api.setConfig('mode', m)
          if (m === 'dark') {
            document.body.classList.add('is-dark-mode')
          } else {
            document.body.classList.remove('is-dark-mode')
          }
        } else if (e.channel === 'zoom-changed') {
          await api.setConfig('zoomFactor', e.args[0])
        }
      })

      wv.addEventListener('dom-ready', async function () {
        // Insert custom CSS
        var baseCSS =
          '._app button:focus { outline: none; }\n' +
          '._app button._search-clear { top: .5rem; }\n'
        var customCSS = await api.readFile(api.configDir('custom.css'))
        wv.insertCSS(baseCSS + customCSS)

        // Inject custom JS
        var customJS = await api.readFile(api.configDir('custom.js'))
        if (customJS.trim()) {
          wv.executeJavaScript(customJS)
        }

        // Apply saved zoom
        var zoomFactor = await api.getConfig('zoomFactor')
        if (zoomFactor && zoomFactor !== 1) {
          wv.send('set-zoom', zoomFactor)
        }

        wv.focus()
        wv.__ready = true
        resolve(wv)
      })

      wv.addEventListener('did-stop-loading', function () {
        document.title = wv.getTitle()
      })

      wv.addEventListener('page-title-updated', function (e) {
        document.title = e.title
      })

      wv.addEventListener('new-window', function (e) {
        e.preventDefault()
        // Create a new native tab on macOS
        window._createTab(e.url)
      })

      wv.addEventListener('did-fail-load', function (e) {
        if (e.isMainFrame && e.errorCode !== -3) {
          reject(new Error('Page load failed: ' + e.errorDescription))
        }
      })

      document.body.append(wv)
    })
  }
})()
