# Site Intelligence Worker — setup guide

This adds an independent intelligence endpoint for the World Heritage Atlas. It does **not** reuse CivilAegis's /nearby-intel endpoint, which remains dedicated to safety intelligence.

## What it enables

- **Overview:** curated UNESCO/site metadata already in the local catalogue, with direct official source links; no external request.
- **News:** one TinyFish Search query when a visitor opens the News tab. Results remain source leads, not verified incident reports.
- **Research:** one OpenAlex works search when a visitor opens the Research tab. The panel displays title, year, authors, source, DOI, citation count and open-access link where available.
- **Environment:** currently a clearly labelled phase-two placeholder. GBIF observations and NASA EONET event context can be added after validating site polygons and geospatial precision.

The frontend calls sources lazily (only when the respective tab is opened). The Worker caches news for 3 hours and research for 24 hours. It applies origin validation, input validation, an isolate-local best-effort rate guard, timeouts and source provenance. The guard is not a globally atomic quota.

## Deploy to Cloudflare

### Option A — Deploy through GitHub Actions (recommended)

1. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Add the following repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API token with permission to edit Workers Scripts for the correct account.
   - `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.
   - `TINYFISH_API_KEY`: the TinyFish API key (required for News).
   - `OPENALEX_API_KEY`: optional; improves the OpenAlex API budget when using a verified key.
3. Open [Deploy Site Intelligence Worker](https://github.com/AnggaConni/SainsCultureBoardGame/actions/workflows/deploy-site-intelligence.yml), choose **Run workflow**, and run it on `main`.
4. The workflow deploys the Worker, attaches the secrets to the Worker, and checks the `/health` endpoint. Do not put any provider keys in frontend files or commit them.

### Option B — Deploy from a local terminal

Run from the repository root with Node.js installed and authenticated Cloudflare credentials:

```bash
npx wrangler deploy --config wrangler.site-intelligence.jsonc
npx wrangler secret put TINYFISH_API_KEY --config wrangler.site-intelligence.jsonc
npx wrangler secret put OPENALEX_API_KEY --config wrangler.site-intelligence.jsonc
```

The secret commands prompt for the key; paste each key privately. The OpenAlex key is optional.

The default worker name is heritage-site-intelligence. The existing Aegis deployment uses the Cloudflare workers.dev subdomain conniezz-cool.workers.dev; after deployment, the frontend expects:

https://heritage-site-intelligence.conniezz-cool.workers.dev/site-intel

If your Cloudflare account's active Workers subdomain differs, update SITE_INTEL_API_URL near the top of js/app.js to the actual endpoint. Verify health first:

https://heritage-site-intelligence.conniezz-cool.workers.dev/health

Expected result: JSON with ok: true and the service name.

## Set Worker variables and secrets

In Cloudflare Dashboard → Workers & Pages → heritage-site-intelligence → Settings → Variables and Secrets:

- ALLOWED_ORIGINS (plain text variable): https://anggaconni.github.io
- TINYFISH_API_KEY (secret): the TinyFish key used for web search. Copy it through the Cloudflare dashboard; do not commit the value.
- OPENALEX_API_KEY (secret, recommended but optional): an OpenAlex key. Basic queries can work without a key, but current OpenAlex docs state that a verified free key increases the daily budget tenfold. See [OpenAlex authentication](https://help.openalex.org/api/authentication/) and [pricing](https://help.openalex.org/access/pricing/).

Secrets are scoped per Worker: the Aegis secret does not automatically appear in this new Worker. Add them to this service explicitly. The browser does not receive either key.

For local testing, add a comma-separated allowed origin such as http://localhost:8000 to ALLOWED_ORIGINS; remove it from production configuration if not needed.

## Test the service

```bash
node --check --input-type=module < site-intelligence-worker.js
node --test tests/site-intelligence-worker.test.mjs
```

The tests mock upstream providers and do not require actual API keys.

## API contract

GET /health returns service health without exposing secret configuration.

GET /site-intel?scope=news&site=Borobudur%20Temple%20Compounds&country=Indonesia

GET /site-intel?scope=research&site=Borobudur%20Temple%20Compounds&country=Indonesia

Each result contains schemaVersion, site, scope, provider, status, fetchedAt, count, items, and provenance. Provider failure is reported per-source; it does not imply that no news or scholarship exists.

## Current limitations and responsible use

- OpenAlex relevance is not proof of exclusive site-specific relevance. Verify each work's title, abstract, DOI and destination.
- TinyFish results are original web-source links; publication dates can be absent and must remain unconfirmed rather than guessed.
- The map coordinates for large/serial UNESCO properties can be representative anchors rather than official property boundaries.
- The current Environment tab is not yet querying GBIF/EONET. It describes the next connector stage rather than fabricating results.
- Third-party availability, API limits, terms and prices can change. Cache and monitor usage.


## Diagnosing “Failed to fetch”
- If `/health` fails to load or DNS returns an error, the Worker is not deployed at that hostname or the hostname is incorrect. Deploy the Worker, then copy the active workers.dev URL from Cloudflare.
- If `/health` works when opened directly but the app cannot fetch it, verify `ALLOWED_ORIGINS` includes exactly `https://anggaconni.github.io` and check the browser console for CORS errors.
- If the Worker returns JSON with `status: "not_configured"`, the service is reachable, but the `TINYFISH_API_KEY` secret is missing. This is different from “Failed to fetch”.
- The Environment tab is an explicitly unimplemented Phase 2 connector; it does not make a live API request yet.
