import { useCallback, useEffect, useState } from 'react';
import { UI_PREFS_EVENT, readUiPrefs, writeUiPrefs } from '@/storage/uiPrefs';

const HINT_THRESHOLD = 0.85;
const HINT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isHintActive(): boolean {
  const prefs = readUiPrefs();
  if (!prefs.lastQuotaHint) return false;
  const setAt = Date.parse(prefs.lastQuotaHint);
  if (!Number.isFinite(setAt)) return false;
  if (Date.now() - setAt > HINT_TTL_MS) return false;
  if (prefs.quotaHintDismissedAt) {
    const dismissedAt = Date.parse(prefs.quotaHintDismissedAt);
    if (Number.isFinite(dismissedAt) && dismissedAt >= setAt) return false;
  }
  return true;
}

export async function checkQuotaAndMaybeFlag(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage !== 'number' || typeof quota !== 'number' || quota <= 0) return;
    if (usage / quota > HINT_THRESHOLD) {
      writeUiPrefs({ lastQuotaHint: new Date().toISOString() });
    }
  } catch {
    /* ignore — quota estimation is advisory only */
  }
}

export function useQuotaHint() {
  const [active, setActive] = useState<boolean>(() => isHintActive());

  useEffect(() => {
    const sync = () => setActive(isHintActive());
    window.addEventListener(UI_PREFS_EVENT, sync);
    return () => window.removeEventListener(UI_PREFS_EVENT, sync);
  }, []);

  const dismiss = useCallback(() => {
    writeUiPrefs({ quotaHintDismissedAt: new Date().toISOString() });
  }, []);

  return { active, dismiss };
}
