// Handlers de Push/notificationclick, injetados no SW gerado pelo vite-plugin-pwa
// via workbox.importScripts (roda no mesmo escopo global do service worker).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Overload', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Descanso finalizado'
  const options = {
    body: data.body || 'Hora da próxima série.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'overload-rest-done',
    renotify: true,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    })
  )
})
