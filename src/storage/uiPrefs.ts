const KEY = 'dt.ui';

import type { KeypadLayout } from '@/domain/types';

export type { KeypadLayout };

export type UiPrefs = {
  theme?: 'light' | 'dark' | 'system';
  haptics?: boolean;
  sound?: boolean;
  keypadLayout?: KeypadLayout;
  lastQuotaHint?: string;
  quotaHintDismissedAt?: string;
};

export const UI_PREFS_EVENT = 'dt-ui-prefs-change';

export function readUiPrefs(): UiPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as UiPrefs) : {};
  } catch {
    return {};
  }
}

export function writeUiPrefs(patch: Partial<UiPrefs>): void {
  if (typeof window === 'undefined') return;
  const next = { ...readUiPrefs(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be blocked (private mode / quota); UI prefs are non-essential. */
  }
  try {
    window.dispatchEvent(new CustomEvent(UI_PREFS_EVENT, { detail: next }));
  } catch {
    /* CustomEvent may not be available in some environments. */
  }
}
