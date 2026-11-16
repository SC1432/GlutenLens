import { useCallback, useState } from 'react';
import { loadSettings, saveSettings, type AppSettings } from './settings.ts';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [saveFailed, setSaveFailed] = useState(false);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      setSaveFailed(!saveSettings(next));
      return next;
    });
  }, []);

  return { settings, update, saveFailed };
}
