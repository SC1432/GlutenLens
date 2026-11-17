// GlutenLens Claude API proxy (Cloudflare Worker).
//
// Holds the Anthropic API key so the app never ships it. The app sends a
// private access code in place of an API key (the SDK sends it as
// "Authorization: Bearer …"; "x-api-key" also works); the proxy checks it, swaps in the
// real key and forwards only the two endpoints the app uses.
//
// Env: ANTHROPIC_API_KEY (secret), ACCESS_CODE (secret), ALLOWED_ORIGINS (var).

const UPSTREAM = 'https://api.anthropic.com';
const FORWARD_HEADERS = ['content-type', 'anthropic-version', 'anthropic-beta'];

/** Requests the app is allowed to make. */
function allowedRoute(method, path) {
  if (method === 'POST' && path === '/v1/messages') return true;
  if (method === 'GET' && /^\/v1\/models\/[A-Za-z0-9._-]+$/.test(path)) return true;
  return false;
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function apiError(status, type, message, origin) {
  return new Response(JSON.stringify({ type: 'error', error: { type, message } }), {
    status,
    headers: { 'content-type': 'application/json', ...(origin ? corsHeaders(origin) : {}) },
  });
}

/** The access code, from either header the SDK may use for an API key. */
function accessCodeFrom(request) {
  const auth = request.headers.get('authorization');
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '');
  return request.headers.get('x-api-key');
}

/** Compare without leaking how many leading characters match. */
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !b) return false;
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < eb.length; i++) diff |= (ea[i] ?? 0) ^ eb[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const allowed = String(env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const origin = request.headers.get('origin');
    const okOrigin = origin && allowed.includes(origin) ? origin : null;

    if (!okOrigin) return apiError(403, 'permission_error', 'Origin not allowed.', null);

    if (request.method === 'OPTIONS') {
      // Echo the requested headers: the SDK adds several x-stainless-* headers.
      const reqHeaders = request.headers.get('access-control-request-headers') ?? '';
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders(okOrigin), 'access-control-allow-headers': reqHeaders },
      });
    }

    const url = new URL(request.url);
    if (!allowedRoute(request.method, url.pathname)) {
      return apiError(404, 'not_found_error', 'Not available through this proxy.', okOrigin);
    }

    if (!sameSecret(accessCodeFrom(request), env.ACCESS_CODE)) {
      return apiError(401, 'authentication_error', 'Invalid access code.', okOrigin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return apiError(500, 'api_error', 'Proxy has no API key configured.', okOrigin);
    }

    const headers = new Headers({ 'x-api-key': env.ANTHROPIC_API_KEY });
    for (const h of FORWARD_HEADERS) {
      const v = request.headers.get(h);
      if (v) headers.set(h, v);
    }

    const upstream = await fetch(UPSTREAM + url.pathname, {
      method: request.method,
      headers,
      body: request.method === 'POST' ? request.body : undefined,
    });

    const out = new Headers(corsHeaders(okOrigin));
    for (const h of ['content-type', 'request-id', 'retry-after', 'x-should-retry']) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    out.set('access-control-expose-headers', 'request-id, retry-after, x-should-retry');
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
