type BeforeInstallPromptEvent = Event & {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
};

const EVENT = 'dt-install-availability-change';

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let initialized = false;

export function initInstallPromptCapture(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(EVENT));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    window.dispatchEvent(new CustomEvent(EVENT));
  });
}

export function canTriggerInstall(): boolean {
  return deferred !== null;
}

export function isInstalled(): boolean {
  if (installed) return true;
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const evt = deferred;
  deferred = null;
  window.dispatchEvent(new CustomEvent(EVENT));
  await evt.prompt();
  const result = await evt.userChoice;
  return result.outcome;
}

export function onInstallAvailabilityChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
