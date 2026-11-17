import Anthropic from '@anthropic-ai/sdk';
import type { Connection } from './connection.ts';

/** Model for label transcription and dish recognition. */
export const MODEL = 'claude-opus-5-5';

/**
 * Build an SDK client for the browser. `dangerouslyAllowBrowser` makes the SDK
 * send the `anthropic-dangerous-direct-browser-access` header the API needs
 * for CORS. In key mode the key lives only in this browser's storage; in
 * proxy mode the SDK sends the proxy's access code as its "key" and the proxy
 * swaps in the real one.
 */
export function createClient(c: Connection): Anthropic {
  const common = { dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 120_000 } as const;
  if (c.mode === 'proxy') {
    return new Anthropic({ ...common, apiKey: c.accessCode, baseURL: c.proxyUrl.replace(/\/+$/, '') });
  }
  return new Anthropic({ ...common, apiKey: c.apiKey });
}

/** Plain-language message for anything thrown by the API layer. */
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'The API key or access code was rejected. Check it in Settings.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'This key isn’t allowed to use that model, or the proxy refused this app.';
  if (err instanceof Anthropic.NotFoundError) return 'The model or proxy address wasn’t found. Check the proxy address in Settings.';
  if (err instanceof Anthropic.RateLimitError) return 'Too many requests right now. Wait a minute and try again.';
  if (err instanceof Anthropic.BadRequestError) {
    const m = err.message.toLowerCase();
    if (m.includes('credit') || m.includes('billing')) return 'The API account is out of credit. Add credit in the Claude Console.';
    return 'Claude couldn’t process this request. Try another photo.';
  }
  if (err instanceof Anthropic.InternalServerError) return 'Claude is busy or having problems. Try again shortly.';
  if (err instanceof Anthropic.APIConnectionTimeoutError) return 'Claude took too long to answer. Check your connection and try again.';
  if (err instanceof Anthropic.APIConnectionError) return 'Couldn’t reach Claude. Check your internet connection (or the proxy address).';
  if (err instanceof Anthropic.APIError) return `Claude API error (${err.status ?? 'unknown'}).`;
  if (err instanceof Error) return err.message;
  return 'Something went wrong talking to Claude.';
}

/** Cheap check that the key or proxy works: looks up the model, no tokens used. */
export async function testConnection(client: Anthropic): Promise<string> {
  const model = await client.models.retrieve(MODEL);
  return model.display_name;
}
