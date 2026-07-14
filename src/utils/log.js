// Log helper mínimo: debug (equivalente a console.log) só aparece em dev — silencia
// ruído de fluxo ([sync]/[save-student]/etc.) que não deveria vazar pro console de
// quem usa o app em produção. warn/error sempre aparecem — são diagnóstico de bug
// real, inclusive o console.error passa pelo errorBuffer.js (que intercepta
// console.error pra alimentar o botão de feedback do admin).
const isDev = import.meta.env.DEV

export function logDebug(...args) {
  if (isDev) console.log(...args)
}

export function logWarn(...args) {
  console.warn(...args)
}

export function logError(...args) {
  console.error(...args)
}
