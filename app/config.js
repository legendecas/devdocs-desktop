const path = require('path')
const fs = require('fs')
const { app } = require('electron')

const configPath = path.join(app.getPath('userData'), 'config.json')

const defaults = {
  lastWindowState: { width: 800, height: 600 },
  shortcut: { toggleApp: null },
  mode: 'dark'
}

let data

function load() {
  data = { ...defaults }
  try {
    if (fs.existsSync(configPath)) {
      data = { ...defaults, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) }
    }
  } catch (err) {
    console.error('Failed to load config, using defaults:', err.message)
  }
}

function save() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save config, write error:', err.message)
  }
}

load()

module.exports = {
  get(key) {
    return data[key]
  },
  set(key, value) {
    data[key] = value
    save()
  },
  delete(key) {
    delete data[key]
    save()
  }
}
