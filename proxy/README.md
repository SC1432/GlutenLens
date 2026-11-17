# GlutenLens proxy

Optional. A Cloudflare Worker that holds your Claude API key so the app never stores it. The app sends a private access code; the proxy checks it and forwards only `POST /v1/messages` and `GET /v1/models/{id}`, and only from the app's own address.

Without a proxy, you can paste an API key into the app's Settings instead; it's then stored only in that browser.

## Deploy

1. In `wrangler.toml`, set `ALLOWED_ORIGINS` to the address you serve the app from (for local development add `http://localhost:5173`).
2. From this folder:

   ```bash
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put ACCESS_CODE
   npx wrangler deploy
   ```

   For the access code, use a long random string, e.g. `openssl rand -base64 24`.
3. In the app: Settings → Claude connection → My proxy. Enter the `https://….workers.dev` address and the access code, then **Save and test**.

Set a monthly spend limit on the API key in the Claude Console either way.
