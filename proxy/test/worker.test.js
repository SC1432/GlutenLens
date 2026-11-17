import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../worker.js';

const ORIGIN = 'https://app.example.com';
const env = { ANTHROPIC_API_KEY: 'sk-ant-real', ACCESS_CODE: 'open-sesame', ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:5173` };

function req(path, init = {}) {
  return new Request(`https://proxy.example.com${path}`, {
    ...init,
    // The Anthropic SDK sends its key as a bearer token.
    headers: { origin: ORIGIN, authorization: 'Bearer open-sesame', ...(init.headers ?? {}) },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('proxy worker', () => {
  it('rejects unknown origins', async () => {
    const res = await worker.fetch(req('/v1/messages', { method: 'POST', headers: { origin: 'https://evil.example' } }), env);
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers preflight with the requested headers', async () => {
    const res = await worker.fetch(
      req('/v1/messages', { method: 'OPTIONS', headers: { 'access-control-request-headers': 'x-api-key, x-stainless-os' } }),
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('access-control-allow-headers')).toBe('x-api-key, x-stainless-os');
  });

  it('rejects a wrong access code', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await worker.fetch(req('/v1/messages', { method: 'POST', headers: { authorization: 'Bearer nope' } }), env);
    expect(res.status).toBe(401);
    const noCode = await worker.fetch(req('/v1/messages', { method: 'POST', headers: { authorization: '' } }), env);
    expect(noCode.status).toBe(401);
    expect((await res.json()).error.type).toBe('authentication_error');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('only forwards the endpoints the app uses', async () => {
    vi.stubGlobal('fetch', vi.fn());
    for (const [method, path] of [['GET', '/v1/messages'], ['POST', '/v1/files'], ['GET', '/v1/models'], ['DELETE', '/v1/models/x']]) {
      const res = await worker.fetch(req(path, { method }), env);
      expect(res.status, `${method} ${path}`).toBe(404);
    }
  });

  it('swaps in the real key and forwards only safe headers', async () => {
    const fetchSpy = vi.fn(async () => new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_1' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await worker.fetch(
      req('/v1/messages', {
        method: 'POST',
        body: '{"model":"m"}',
        headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-beta': 'b1', cookie: 'x=1' },
      }),
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('request-id')).toBe('req_1');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers.get('x-api-key')).toBe('sk-ant-real');
    expect(init.headers.get('anthropic-beta')).toBe('b1');
    expect(init.headers.get('cookie')).toBeNull();
    expect(init.headers.get('authorization')).toBeNull(); // the access code never goes upstream
    expect(init.headers.get('origin')).toBeNull();
  });

  it('also accepts the code as x-api-key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const res = await worker.fetch(req('/v1/models/claude-opus-5-5', { method: 'GET', headers: { authorization: '', 'x-api-key': 'open-sesame' } }), env);
    expect(res.status).toBe(200);
  });

  it('forwards a model lookup', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await worker.fetch(req('/v1/models/claude-opus-5-5', { method: 'GET' }), env);
    expect(res.status).toBe(200);
    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/models/claude-opus-5-5');
  });
});
