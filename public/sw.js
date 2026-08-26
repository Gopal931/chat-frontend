// Service Worker for Incoming Web Push Call Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    if (data.type === 'incoming-call') {
      const title = data.title || `${data.callerName} is calling you`;
      const options = {
        body: data.body || `Incoming ${data.callType === 'video' ? 'Video' : 'Voice'} Call`,
        icon: data.callerAvatar || '/pwa-icon-192.png',
        badge: '/badge-icon.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: `call-${data.callId}`,
        renotify: true,
        data: {
          url: '/chat',
          callId: data.callId,
          conversationId: data.conversationId,
          callType: data.callType,
        },
        actions: [
          { action: 'open', title: 'Open Call' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (err) {
    console.error('[sw.js push error]', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing open window if available
      for (const client of clientList) {
        if (client.url.includes('/chat') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
