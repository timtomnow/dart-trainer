import { useCallback, useState } from 'react';
import { readUiPrefs, writeUiPrefs, type KeypadLayout } from '@/storage/uiPrefs';

export type UseKeypadLayoutResult = {
  keypadLayout: KeypadLayout;
  setKeypadLayout: (layout: KeypadLayout) => void;
};

export function useKeypadLayout(): UseKeypadLayoutResult {
  const [keypadLayout, setKeypadLayoutState] = useState<KeypadLayout>(
    () => readUiPrefs().keypadLayout ?? 'sequential'
  );

  const setKeypadLayout = useCallback((layout: KeypadLayout) => {
    setKeypadLayoutState(layout);
    writeUiPrefs({ keypadLayout: layout });
  }, []);

  return { keypadLayout, setKeypadLayout };
}
