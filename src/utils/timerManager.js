export const timerManager = {
  _interval: null,
  _endsAt: 0,
  start(durationSecs, onTick, onDone) {
    this.clear()
    this._endsAt = Date.now() + durationSecs * 1000
    const tick = () => {
      const remaining = Math.max(0, Math.round((this._endsAt - Date.now()) / 1000))
      onTick(remaining)
      if (remaining <= 0) {
        this.clear()
        onDone()
      }
    }
    tick()
    this._interval = setInterval(tick, 500)
  },
  clear() {
    if (this._interval) { clearInterval(this._interval); this._interval = null }
  },
}
