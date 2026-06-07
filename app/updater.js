const { app } = require('electron')
const log = require('electron-log')
const { autoUpdater } = require('electron-updater')

exports.init = () => {
  if (!app.isPackaged || process.platform === 'linux') {
    return
  }

  autoUpdater.logger = log
  autoUpdater.logger.transports.file.level = 'info'
  autoUpdater.checkForUpdatesAndNotify()
}
