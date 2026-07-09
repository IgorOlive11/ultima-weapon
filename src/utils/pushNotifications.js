// Web Push — assinatura/cancelamento no navegador. A chave pública VAPID é segura de
// expor no cliente (é assim que o protocolo funciona); a privada fica só como secret
// no backend (edge function schedule-rest-push), nunca aqui.
const VAPID_PUBLIC_KEY = 'BBSiMJk02RxgltjzNG_Hbuj38P8NtX4HOZJkTIgPw6SVUcoApInttGYFaVeHZFU0e--n46bz3doZenbDmdvmwgI'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// Pede permissão (só deve ser chamado a partir de um gesto do usuário — ex. ligar o
// toggle nas configurações) e assina o push. Retorna a subscription (JSON serializável,
// pronta pra persistir/sincronizar) ou null se negado/indisponível.
export async function subscribeToPush() {
  if (!isPushSupported()) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  return sub.toJSON()
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}
