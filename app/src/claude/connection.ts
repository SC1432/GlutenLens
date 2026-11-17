/**
 * How the app reaches the Claude API. Two options, neither ships a key in the
 * app's code (CLAUDE.md step 2):
 *  - `key`:   the user's own API key, kept only in this browser's storage.
 *  - `proxy`: a small proxy (see /proxy) that holds the key; the app sends a
 *             private access code instead.
 */
export type ConnectionMode = 'key' | 'proxy';

export interface Connection {
  mode: ConnectionMode;
  apiKey: string;
  proxyUrl: string;
  accessCode: string;
}

export const CONNECTION_STORAGE_KEY = 'glutenlens.connection.v1';

export const EMPTY_CONNECTION: Connection = { mode: 'key', apiKey: '', proxyUrl: '', accessCode: '' };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function parseConnection(raw: string | null): Connection {
  if (!raw) return { ...EMPTY_CONNECTION };
  try {
    const d: unknown = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return { ...EMPTY_CONNECTION };
    const o = d as Record<string, unknown>;
    return {
      mode: o.mode === 'proxy' ? 'proxy' : 'key',
      apiKey: str(o.apiKey),
      proxyUrl: str(o.proxyUrl),
      accessCode: str(o.accessCode),
    };
  } catch {
    return { ...EMPTY_CONNECTION };
  }
}

/** A proxy must be HTTPS, except on this device for development. */
export function validProxyUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

/** Why the connection can't be used yet, or null if it is complete. */
export function connectionProblem(c: Connection): string | null {
  if (c.mode === 'key') {
    if (!c.apiKey) return 'Add your Claude API key.';
    if (!c.apiKey.startsWith('sk-ant-')) return 'That doesn’t look like a Claude API key (they start with “sk-ant-”).';
    return null;
  }
  if (!c.proxyUrl) return 'Add your proxy address.';
  if (!validProxyUrl(c.proxyUrl)) return 'The proxy address must start with https://';
  if (!c.accessCode) return 'Add the proxy’s access code.';
  return null;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): KV | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadConnection(storage: KV | undefined = defaultStorage()): Connection {
  try {
    return parseConnection(storage?.getItem(CONNECTION_STORAGE_KEY) ?? null);
  } catch {
    return { ...EMPTY_CONNECTION };
  }
}

export function saveConnection(c: Connection, storage: KV | undefined = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(c));
    return true;
  } catch {
    return false;
  }
}

export function clearConnection(storage: KV | undefined = defaultStorage()): void {
  try {
    storage?.removeItem(CONNECTION_STORAGE_KEY);
  } catch {
    // nothing stored, nothing to clear
  }
}

/** "sk-ant-…a1b2": enough to recognise the key without showing it. */
export function maskKey(key: string): string {
  return key.length > 12 ? `${key.slice(0, 7)}…${key.slice(-4)}` : '••••';
}
