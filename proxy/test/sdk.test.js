import Anthropic from '@anthropic-ai/sdk';
import { afterEach, expect, it, vi } from 'vitest';
import worker from '../worker.js';

// The app's proxy mode, end to end: the real SDK (configured as in
// app/src/claude/client.ts) talks to the worker, which talks to a fake upstream.
const ORIGIN = 'https://app.example.com';
const env = { ANTHROPIC_API_KEY: 'sk-ant-real', ACCESS_CODE: 'open-sesame', ALLOWED_ORIGINS: ORIGIN };

afterEach(() => vi.unstubAllGlobals());

function sdkThroughWorker(accessCode) {
  return new Anthropic({
    apiKey: accessCode,
    baseURL: 'https://proxy.example.com',
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    fetch: (url, init) => {
      const headers = new Headers(init.headers);
      headers.set('origin', ORIGIN); // a browser adds this
      return worker.fetch(new Request(url, { ...init, headers }), env);
    },
  });
}

it('works with the SDK and the right access code', async () => {
  const upstream = vi.fn(async () => Response.json({ type: 'model', id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', created_at: '2026-01-01T00:00:00Z' }));
  vi.stubGlobal('fetch', upstream);
  const model = await sdkThroughWorker('open-sesame').models.retrieve('claude-opus-5-5');
  expect(model.display_name).toBe('Claude Opus 5.5');
  const init = upstream.mock.calls[0][1];
  expect(init.headers.get('x-api-key')).toBe('sk-ant-real');
  expect(init.headers.get('authorization')).toBeNull();
  expect(init.headers.get('anthropic-version')).toBeTruthy();
});

it('gives the SDK an AuthenticationError for a wrong code', async () => {
  vi.stubGlobal('fetch', vi.fn());
  await expect(sdkThroughWorker('wrong').models.retrieve('claude-opus-5-5')).rejects.toBeInstanceOf(Anthropic.AuthenticationError);
});
