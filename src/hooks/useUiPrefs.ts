import { useCallback, useEffect, useState } from 'react';
import { UI_PREFS_EVENT, readUiPrefs, writeUiPrefs } from '@/storage/uiPrefs';

export type UiFeedbackPrefs = {
  sound: boolean;
  haptics: boolean;
};

export type UseUiPrefsResult = UiFeedbackPrefs & {
  setSound: (enabled: boolean) => void;
  setHaptics: (enabled: boolean) => void;
};

export function useUiPrefs(): UseUiPrefsResult {
  const [sound, setSoundState] = useState<boolean>(() => readUiPrefs().sound ?? true);
  const [haptics, setHapticsState] = useState<boolean>(() => readUiPrefs().haptics ?? true);

  useEffect(() => {
    const sync = () => {
      const fresh = readUiPrefs();
      setSoundState(fresh.sound ?? true);
      setHapticsState(fresh.haptics ?? true);
    };
    window.addEventListener(UI_PREFS_EVENT, sync);
    return () => window.removeEventListener(UI_PREFS_EVENT, sync);
  }, []);

  const setSound = useCallback((enabled: boolean) => {
    setSoundState(enabled);
    writeUiPrefs({ sound: enabled });
  }, []);

  const setHaptics = useCallback((enabled: boolean) => {
    setHapticsState(enabled);
    writeUiPrefs({ haptics: enabled });
  }, []);

  return { sound, haptics, setSound, setHaptics };
}
