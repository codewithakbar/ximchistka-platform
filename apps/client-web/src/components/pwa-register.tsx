'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update())
      .catch(console.error);

    // Reload once when a new service worker takes over so users
    // never run a page against stale build assets.
    let refreshed = false;
    const onControllerChange = () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);
  return null;
}
