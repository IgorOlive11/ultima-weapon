const MAX_ENTRIES = 30
const buffer = []
let patched = false

function serializeArg(arg) {
  if (arg instanceof Error) return arg.stack || arg.message
  if (typeof arg === 'string') return arg
  try { return JSON.stringify(arg) } catch { return String(arg) }
}

export function installErrorBuffer() {
  if (patched) return
  patched = true

  const originalError = console.error
  console.error = (...args) => {
    buffer.push({ ts: new Date().toISOString(), message: args.map(serializeArg).join(' ') })
    if (buffer.length > MAX_ENTRIES) buffer.shift()
    originalError.apply(console, args)
  }

  window.addEventListener('error', (e) => {
    buffer.push({ ts: new Date().toISOString(), message: `[window.onerror] ${e.message} @ ${e.filename}:${e.lineno}` })
    if (buffer.length > MAX_ENTRIES) buffer.shift()
  })

  window.addEventListener('unhandledrejection', (e) => {
    buffer.push({ ts: new Date().toISOString(), message: `[unhandledrejection] ${serializeArg(e.reason)}` })
    if (buffer.length > MAX_ENTRIES) buffer.shift()
  })
}

export function getRecentErrors() {
  return [...buffer]
}
