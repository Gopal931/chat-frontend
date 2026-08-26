import { useEffect } from 'react';
import api from '@/api/axios';
import { PUSH } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const initPush = async () => {
      try {
        // 1. Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // 2. Request Notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 3. Fetch VAPID public key
        const { data } = await api.get<{ publicKey: string }>(PUSH.VAPID_KEY);
        if (!data?.publicKey) return;

        // 4. Existing subscription check or subscribe
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const applicationServerKey = urlBase64ToUint8Array(data.publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        // 5. Send subscription object to backend
        await api.post(PUSH.SUBSCRIBE, { subscription: subscription.toJSON() });
      } catch (err) {
        console.warn('[usePushNotifications]', err);
      }
    };

    initPush();
  }, [isAuthenticated, user]);
};
