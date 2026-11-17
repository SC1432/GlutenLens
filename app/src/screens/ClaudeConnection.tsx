import { useState } from 'react';
import {
  EMPTY_CONNECTION,
  clearConnection,
  connectionProblem,
  loadConnection,
  maskKey,
  saveConnection,
  type Connection,
  type ConnectionMode,
} from '../claude/connection.ts';

type Status =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string };

export function ClaudeConnection() {
  const [saved, setSaved] = useState<Connection>(() => loadConnection());
  const [draft, setDraft] = useState<Connection>(saved);
  const [editingKey, setEditingKey] = useState(!saved.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const set = (patch: Partial<Connection>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStatus({ kind: 'idle' });
  };

  const save = async () => {
    const problem = connectionProblem(draft);
    if (problem) {
      setStatus({ kind: 'error', text: problem });
      return;
    }
    if (!saveConnection(draft)) {
      setStatus({ kind: 'error', text: 'Couldn’t save on this device (private browsing or storage blocked).' });
      return;
    }
    setSaved(draft);
    setEditingKey(false);
    setShowKey(false);
    setStatus({ kind: 'testing' });
    // The SDK is loaded on demand so it doesn't slow down the app's first screen.
    const { createClient, describeError, testConnection } = await import('../claude/client.ts');
    try {
      const name = await testConnection(createClient(draft));
      setStatus({ kind: 'ok', text: `Connected to ${name}.` });
    } catch (err) {
      setStatus({ kind: 'error', text: describeError(err) });
    }
  };

  const forget = () => {
    clearConnection();
    setSaved({ ...EMPTY_CONNECTION });
    setDraft({ ...EMPTY_CONNECTION });
    setEditingKey(true);
    setStatus({ kind: 'idle' });
  };

  const hasSaved = saved.mode === 'key' ? !!saved.apiKey : !!saved.proxyUrl;

  return (
    <fieldset className="card">
      <legend>Claude connection</legend>
      <p className="muted small">
        Reading labels and recognising dishes uses Claude. Claude only reads the photo; GlutenLens’s own rules decide
        every verdict.
      </p>

      {(['key', 'proxy'] as ConnectionMode[]).map((m) => (
        <label key={m} className="option">
          <input type="radio" name="conn-mode" value={m} checked={draft.mode === m} onChange={() => set({ mode: m })} />
          <span>
            <span className="option-title">{m === 'key' ? 'My own API key' : 'My proxy'}</span>
            <span className="option-note">
              {m === 'key'
                ? 'Simplest. The key is stored only in this browser on this device.'
                : 'A small server you run (for example a Cloudflare Worker) that holds the key.'}
            </span>
          </span>
        </label>
      ))}

      <div className="fields">
        {draft.mode === 'key' ? (
          editingKey ? (
            <>
              <label className="field" htmlFor="api-key">
                <span className="field-label">API key</span>
                <span className="field-row">
                  <input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="sk-ant-…"
                    value={draft.apiKey}
                    onChange={(e) => set({ apiKey: e.target.value.trim() })}
                  />
                  <button type="button" className="secondary" onClick={() => setShowKey((s) => !s)}>
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </span>
              </label>
              <p className="muted small">
                Create a key at platform.claude.com under API keys. Set a monthly spend limit there too: anyone who can
                open this browser on this phone could use the key.
              </p>
            </>
          ) : (
            <div className="field">
              <span className="field-label">API key</span>
              <span className="field-row">
                <code className="masked">{maskKey(draft.apiKey)}</code>
                <button type="button" className="secondary" onClick={() => setEditingKey(true)}>
                  Change
                </button>
              </span>
            </div>
          )
        ) : (
          <>
            <label className="field" htmlFor="proxy-url">
              <span className="field-label">Proxy address</span>
              <input
                id="proxy-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="https://glutenlens-proxy.example.workers.dev"
                value={draft.proxyUrl}
                onChange={(e) => set({ proxyUrl: e.target.value.trim() })}
              />
            </label>
            <label className="field" htmlFor="access-code">
              <span className="field-label">Access code</span>
              <input
                id="access-code"
                type="password"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={draft.accessCode}
                onChange={(e) => set({ accessCode: e.target.value.trim() })}
              />
            </label>
          </>
        )}

        <div className="actions">
          <button type="button" className="primary" onClick={save} disabled={status.kind === 'testing'}>
            {status.kind === 'testing' ? 'Testing…' : 'Save and test'}
          </button>
          {hasSaved && (
            <button type="button" className="secondary" onClick={forget}>
              Remove from this device
            </button>
          )}
        </div>

        <p
          className={`conn-status ${status.kind === 'ok' ? 'ok' : status.kind === 'error' ? 'bad' : ''}`}
          role="status"
          aria-live="polite"
        >
          {status.kind === 'ok' && <>✓ {status.text}</>}
          {status.kind === 'error' && <>✕ {status.text}</>}
          {status.kind === 'testing' && <>Checking the connection…</>}
        </p>
      </div>
    </fieldset>
  );
}
