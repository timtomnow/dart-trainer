import { useEffect, useState } from 'react';
import {
  canTriggerInstall,
  isInstalled,
  onInstallAvailabilityChange,
  triggerInstall
} from '@/app/install';

type Platform = 'ios' | 'android' | 'desktop' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)) {
    return 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  if (/Chrome|Edg|Edge/.test(ua) && !/Mobile/.test(ua)) return 'desktop';
  return 'other';
}

export function InstallSection() {
  const [platform] = useState<Platform>(() => detectPlatform());
  const [available, setAvailable] = useState<boolean>(() => canTriggerInstall());
  const [alreadyInstalled, setAlreadyInstalled] = useState<boolean>(() => isInstalled());
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    const off = onInstallAvailabilityChange(() => {
      setAvailable(canTriggerInstall());
      setAlreadyInstalled(isInstalled());
    });
    return off;
  }, []);

  if (alreadyInstalled) {
    return (
      <section aria-labelledby="install-heading" className="mt-10">
        <h2
          id="install-heading"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Install this app
        </h2>
        <p className="mt-2 rounded-md border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          The app is installed on this device.
        </p>
      </section>
    );
  }

  const onInstallClick = async () => {
    setBusy(true);
    setOutcome(null);
    try {
      const result = await triggerInstall();
      if (result === 'accepted') setOutcome('Installing…');
      else if (result === 'dismissed') setOutcome('Install dismissed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="install-heading" className="mt-10">
      <h2
        id="install-heading"
        className="text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        Install this app
      </h2>
      <div className="mt-3 rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
        {platform === 'ios' && (
          <p className="text-slate-700 dark:text-slate-200">
            On iOS Safari, tap the Share button, then choose{' '}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        )}

        {platform === 'android' && (
          <>
            {available ? (
              <>
                <p className="text-slate-700 dark:text-slate-200">
                  Install the app on this device for offline access.
                </p>
                <button
                  type="button"
                  onClick={onInstallClick}
                  disabled={busy}
                  className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Working…' : 'Install app'}
                </button>
              </>
            ) : (
              <p className="text-slate-700 dark:text-slate-200">
                On Android Chrome, open the browser menu and choose{' '}
                <span className="font-medium">Install app</span>.
              </p>
            )}
          </>
        )}

        {platform === 'desktop' && (
          <>
            {available ? (
              <>
                <p className="text-slate-700 dark:text-slate-200">
                  Install the app on this device for offline access.
                </p>
                <button
                  type="button"
                  onClick={onInstallClick}
                  disabled={busy}
                  className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Working…' : 'Install app'}
                </button>
              </>
            ) : (
              <p className="text-slate-700 dark:text-slate-200">
                Look for the install icon in the address bar of Chrome or Edge.
              </p>
            )}
          </>
        )}

        {platform === 'other' && (
          <p className="text-slate-700 dark:text-slate-200">
            Use a recent Chrome, Edge, or Safari browser to install this app to
            your home screen.
          </p>
        )}

        {outcome && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{outcome}</p>
        )}
      </div>
    </section>
  );
}
