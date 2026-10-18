# Site Intelligence — shared Worker setup

The World Heritage Atlas uses the existing CivilAegis TinyFish proxy so both apps can share the same Cloudflare Worker and TinyFish secret without exposing keys in the browser.

## Active API contract

The frontend calls:

`https://civilaegis-tinyfish-proxy.conniezz-cool.workers.dev/site-intel`

Endpoints:

- Health check: `GET /health`
- News: `GET /site-intel?scope=news&site=Borobudur%20Temple&country=Indonesia`
- Research: `GET /site-intel?scope=research&site=Borobudur%20Temple&country=Indonesia`

The existing CivilAegis safety endpoint `/nearby-intel?lat=...&lng=...` remains unchanged. Do not point the Heritage Atlas News or Research tabs at `/nearby-intel`: it has a different purpose and response schema.

## Worker configuration

The shared Worker source is in [AnggaConni/aegis/tinyfish-worker.js](https://github.com/AnggaConni/aegis/blob/main/tinyfish-worker.js). The Site Intelligence route is additive:

- **News** calls TinyFish Search with the existing Cloudflare Worker secret `TINYFISH_API_KEY`.
- **Research** calls OpenAlex and can use the optional `OPENALEX_API_KEY` Worker secret.
- **CORS** defaults to `https://anggaconni.github.io`. Add other origins to the Cloudflare variable `ALLOWED_ORIGINS` only when needed.
- **Caching** is separated by scope/site/country: News 3 hours; Research 24 hours.
- News results are unverified source leads, not independently verified claims. OpenAlex results are relevance-ranked records and should be checked against each publication and abstract.
- **Environment** bypasses this Worker and queries public APIs directly: GBIF Occurrence Search (about 25 km from the site's map anchor), NASA EONET v3 (active events during the previous 90 days within about 100 km, filtered by distance), and Open-Meteo (model-based current weather at the anchor). No API keys or additional Worker routes are needed for these three sources.

## Deploy the updated shared Worker

After the matching change in the Aegis repository is available, deploy the Worker using the deployment method already used for CivilAegis. From an authenticated checkout of [AnggaConni/aegis](https://github.com/AnggaConni/aegis), run:

```bash
npx wrangler deploy --config wrangler.jsonc
```

Ensure `TINYFISH_API_KEY` is present as a Cloudflare Worker **secret**. `OPENALEX_API_KEY` is optional; neither key belongs in frontend code or Git history.

## Verify the integration

1. Open [Worker health](https://civilaegis-tinyfish-proxy.conniezz-cool.workers.dev/health). The expected response is JSON with `ok: true`.
2. Test [Borobudur News](https://civilaegis-tinyfish-proxy.conniezz-cool.workers.dev/site-intel?scope=news&site=Borobudur%20Temple&country=Indonesia).
3. Test [Borobudur Research](https://civilaegis-tinyfish-proxy.conniezz-cool.workers.dev/site-intel?scope=research&site=Borobudur%20Temple&country=Indonesia).
4. Reload the Atlas and open News or Research. If `/health` loads directly but the app fails, check the browser console for CORS errors and confirm `ALLOWED_ORIGINS` includes exactly `https://anggaconni.github.io`.

Interpret response statuses carefully:

- `status: "not_configured"`: the route is reachable, but the TinyFish secret is missing on the shared Worker.
- `status: "upstream_error"`, `"timeout"`, or `"unavailable"`: the Worker was reached, but the provider request failed.
- Browser `Failed to fetch`: check the Worker hostname, deployment, network access, and CORS. This differs from an upstream provider error.


## Environmental connector verification
1. Open the Atlas and choose a site with coordinates, such as Borobudur.
2. Open **Environment** in the Site Intelligence dossier.
3. Check that the panel independently reports GBIF, NASA EONET and Open-Meteo; an individual upstream provider can fail without hiding other sources.
4. Verify source links: [GBIF occurrence search](https://techdocs.gbif.org/en/openapi/v1/occurrence), [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3), and [Open-Meteo](https://open-meteo.com/en/docs).

Environmental results use the curated coordinate as a proximity anchor, not an official UNESCO property boundary. A no-result response does not certify the absence of species or environmental hazards. For large, serial, coastal and marine properties, use a verified boundary polygon before making within-site claims.
