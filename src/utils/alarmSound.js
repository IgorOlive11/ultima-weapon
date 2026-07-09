// Alarme sonoro do fim do descanso — gerado via Web Audio API (osciladores), sem
// depender de um arquivo de áudio externo. Vibração (navigator.vibrate) não funciona
// no Safari/iOS, então o som é a garantia real de feedback em primeiro plano.
let ctx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  return ctx
}

function beep(audioCtx, { freq, start, duration, gain = 0.25 }) {
  const osc = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime + start)
  gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + start + 0.02)
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + start + duration)
  osc.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  osc.start(audioCtx.currentTime + start)
  osc.stop(audioCtx.currentTime + start + duration + 0.05)
}

// Chamar dentro de um gesto do usuário (ex. ao tocar "série concluída", que dispara o
// rest timer) — cria/retoma o AudioContext enquanto ainda conta como interação direta.
// Sem isso, navegadores estritos (Safari/iOS) podem bloquear o áudio quando o alarme
// tenta tocar sozinho, minutos depois, disparado só por um setInterval/setTimeout.
export function warmAlarmAudio() {
  const audioCtx = getAudioContext()
  if (audioCtx?.state === 'suspended') audioCtx.resume().catch(() => {})
}

// Duas notas curtas ascendentes — reconhecível como "pronto", sem ser agressivo
export function playRestDoneAlarm() {
  const audioCtx = getAudioContext()
  if (!audioCtx) return
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  beep(audioCtx, { freq: 660, start: 0,    duration: 0.16 })
  beep(audioCtx, { freq: 880, start: 0.18, duration: 0.22 })
}
