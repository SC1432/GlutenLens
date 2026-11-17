import { registerSW } from 'virtual:pwa-register';

type Listener = (update: () => void) => void;
let onNeedRefresh: Listener | undefined;
let pending: (() => void) | undefined;

/** Register the service worker. A new version waits until the user taps "Reload". */
export function startPwa() {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      pending = () => void updateSW(true);
      onNeedRefresh?.(pending);
    },
  });
}

export function subscribeUpdate(listener: Listener) {
  onNeedRefresh = listener;
  if (pending) listener(pending);
  return () => {
    onNeedRefresh = undefined;
  };
}
