export const timerManager = {
  _interval: null,
  start(durationSecs, onTick, onDone) {
    this.clear()
    let remaining = durationSecs
    onTick(remaining)
    this._interval = setInterval(() => {
      remaining--
      onTick(remaining)
      if (remaining <= 0) {
        this.clear()
        onDone()
      }
    }, 1000)
  },
  clear() {
    if (this._interval) { clearInterval(this._interval); this._interval = null }
  },
}
