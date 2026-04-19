const KEY = 'dt.ui';

export type UiPrefs = {
  theme?: 'light' | 'dark' | 'system';
  haptics?: boolean;
};

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
}
