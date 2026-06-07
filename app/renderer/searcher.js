window.Searcher = class Searcher {
  constructor(target) {
    this.target = target
    this._listeners = {}
  }

  on(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn)
  }

  _emit(event) {
    for (const fn of this._listeners[event] || []) fn()
  }

  toggle() {
    return this.opened ? this.close() : this.open()
  }

  open() {
    if (!this.initialized) this._initialize()
    this.opened = true
    this.$searcher.classList.remove('searcher__hidden')
    this.$input.focus()
    this.$input.select()
    this._emit('open')
  }

  close() {
    this.opened = false
    this.target.stopFindInPage('clearSelection')
    this._hideSearcher()
    this._emit('close')
  }

  _initialize() {
    this.initialized = true
    const $wrapper = document.createElement('div')
    $wrapper.innerHTML =
      '<div class="searcher searcher__hidden">' +
      '<input autofocus type="search" class="searcher-input" placeholder="Search..." />' +
      '<span class="searcher-progress searcher-progress__disabled"></span>' +
      '<button class="searcher-action searcher-prev">' +
      '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">' +
      '<path d="M30 20 L16 8 2 20" /></svg></button>' +
      '<button class="searcher-action searcher-next">' +
      '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">' +
      '<path d="M30 12 L16 24 2 12" /></svg></button>' +
      '<button class="searcher-action searcher-close">' +
      '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">' +
      '<path d="M2 30 L30 2 M30 30 L2 2" /></svg></button></div>'
    document.body.append($wrapper)
    this.$searcher = $wrapper.querySelector('.searcher')
    this.$progress = this.$searcher.querySelector('.searcher-progress')
    this.$input = this.$searcher.querySelector('.searcher-input')
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._findNext(e.target.value)
      } else if (e.key === 'Escape') {
        this.close()
      }
    })
    this.$prev = this.$searcher.querySelector('.searcher-prev')
    this.$next = this.$searcher.querySelector('.searcher-next')
    this.$close = this.$searcher.querySelector('.searcher-close')
    this.$prev.addEventListener('click', () => this._findPrev(this.$input.value))
    this.$next.addEventListener('click', () => this._findNext(this.$input.value))
    this.$close.addEventListener('click', () => this.close())

    this.target.addEventListener('found-in-page', (e) => {
      var r = e.result
      this._showProgress(r.activeMatchOrdinal, r.matches)
      this.$input.focus()
    })
    this._emit('initialized')
  }

  _findNext(value, opts) {
    if (value) this.target.findInPage(value, opts)
    return this
  }

  _findPrev(value, opts) {
    if (value) this.target.findInPage(value, Object.assign({ forward: false }, opts))
    return this
  }

  _showProgress(current, total) {
    this.$progress.classList.remove('searcher-progress__disabled')
    this.$progress.textContent = current + '/' + total
  }

  _hideSearcher() {
    this.$progress.classList.add('searcher-progress__disabled')
    this.$searcher.classList.add('searcher__hidden')
    this.$input.value = ''
  }
}
