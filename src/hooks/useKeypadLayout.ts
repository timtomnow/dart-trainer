import { useCallback, useEffect, useState } from 'react';
import { UI_PREFS_EVENT, readUiPrefs, writeUiPrefs, type KeypadLayout } from '@/storage/uiPrefs';

export type UseKeypadLayoutResult = {
  keypadLayout: KeypadLayout;
  setKeypadLayout: (layout: KeypadLayout) => void;
};

export function useKeypadLayout(): UseKeypadLayoutResult {
  const [keypadLayout, setKeypadLayoutState] = useState<KeypadLayout>(
    () => readUiPrefs().keypadLayout ?? 'sequential'
  );

  useEffect(() => {
    const sync = () => setKeypadLayoutState(readUiPrefs().keypadLayout ?? 'sequential');
    window.addEventListener(UI_PREFS_EVENT, sync);
    return () => window.removeEventListener(UI_PREFS_EVENT, sync);
  }, []);

  const setKeypadLayout = useCallback((layout: KeypadLayout) => {
    setKeypadLayoutState(layout);
    writeUiPrefs({ keypadLayout: layout });
  }, []);

  return { keypadLayout, setKeypadLayout };
}
