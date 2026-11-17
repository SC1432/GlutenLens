import { useEffect, useState } from 'react';
import { Home } from './screens/Home.tsx';
import { SettingsScreen } from './screens/Settings.tsx';
import { subscribeUpdate } from './pwa.ts';
import { useSettings } from './useSettings.ts';

type Screen = 'home' | 'settings';

function screenFromHash(): Screen {
  return location.hash === '#settings' ? 'settings' : 'home';
}

export function App() {
  const { settings, update, saveFailed } = useSettings();
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [reload, setReload] = useState<(() => void) | null>(null);

  useEffect(() => {
    const onHash = () => setScreen(screenFromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => subscribeUpdate((fn) => setReload(() => fn)), []);

  // Hash routing keeps the back button and iOS edge-swipe working.
  const go = (s: Screen) => {
    location.hash = s === 'home' ? '' : s;
    setScreen(s);
  };

  return (
    <div className="app">
      <header className="topbar">
        {screen === 'settings' ? (
          <button type="button" className="topbar-btn" onClick={() => history.length > 1 ? history.back() : go('home')}>
            ‹ Back
          </button>
        ) : (
          <span className="topbar-spacer" />
        )}
        <h1 className="topbar-title">{screen === 'settings' ? 'Settings' : 'GlutenLens'}</h1>
        {screen === 'home' ? (
          <button type="button" className="topbar-btn" onClick={() => go('settings')}>
            Settings
          </button>
        ) : (
          <span className="topbar-spacer" />
        )}
      </header>

      {reload && (
        <div className="banner" role="status">
          <span>A new version of GlutenLens is ready.</span>
          <button type="button" onClick={reload}>
            Reload
          </button>
        </div>
      )}

      <main className="content">
        {screen === 'home' ? (
          <Home settings={settings} onOpenSettings={() => go('settings')} />
        ) : (
          <SettingsScreen settings={settings} update={update} saveFailed={saveFailed} />
        )}
      </main>
    </div>
  );
}
