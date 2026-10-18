# World Heritage Atlas — Learning Expedition

Browser-based educational exploration prototype: learn about UNESCO-designated places through a 3D globe, location journal, quizzes and lightweight progression.

Live preview: https://anggaconni.github.io/UNESCO-Designated-Site-Explorer/

## Redesign branch
`redesign/unesco-sites-explorer`. The existing `main` branch and its 3D board-game prototype are preserved.

## Features
- Interactive CesiumJS 3D globe with map pins for UNESCO-designated places. Switch between the default OpenStreetMap navigation map and Google satellite imagery through Cesium ion (CesiumJS 1.134+); Cesium World Terrain and the UNESCO overlays remain active. See `docs/MAP_VIEW_MODES.md` for the token requirement and the distinction from Google's full Photorealistic 3D Tiles.
- Streamed Cesium OSM Buildings layer for 3D building geometry where OpenStreetMap data is available.
- Filter locations by culture, nature or cultural landscape.
- Short learning notes, inscription year, coordinates, why-it-matters cards and links to official UNESCO records.
- JSON-based quiz bank with general questions for all sites, site-specific questions, and UNESCO programme/type questions; answers include explanations and source links.
- Field XP, discovery tracking and badge progression saved locally in the browser.
- Responsive desktop/mobile interface.

## Technology
Vanilla HTML/CSS/JavaScript; CesiumJS loaded from unpkg CDN; `js/sites.js` is the content dataset; `js/app.js` is application logic; `css/atlas.css` is the redesigned theme.

## Caveats
- MVP, not yet browser-tested end-to-end. Verify Cesium imagery/terrain provider behaviour in the deployed environment.
- Starter set contains six Indonesian World Heritage properties only. World Heritage, Biosphere Reserves, Global Geoparks, Creative Cities and Intangible Cultural Heritage are distinct programmes and should not be conflated.
- Verify official designation details and learning copy before institutional publication.
- Cesium OSM Buildings is an extruded/vector-style building dataset, not photogrammetric imagery; coverage, heights and roof detail vary by place. Google Photorealistic 3D Tiles are still not integrated and require separate API configuration, billing and compliance with relevant use and attribution policies.
- Images load from a third-party source; validate their availability and licensing before publication.
- Progress stays in localStorage on one browser/device. There are no accounts, analytics, online leaderboard or offline map tiles.

## Cesium OSM Buildings layer

The app calls `Cesium.createOsmBuildingsAsync({ enableShowOutline: false })` during globe initialization. Failure to load the buildings layer is non-fatal: the OSM basemap, camera, markers and site models remain usable. The tileset stays hidden above 500 km camera height and visibility is re-evaluated on every pre-render; global globe view therefore stays clean, while building geometry appears for local exploration.

A token from your own Cesium ion account is required for the buildings layer. Store it as the GitHub repository Actions secret `CESIUM_ION_ACCESS_TOKEN`; do not commit its value. The workflow `.github/workflows/deploy-pages-with-cesium-token.yml` writes the secret into `js/cesium-config.js` only in its deployment workspace, then publishes the site. Because GitHub Pages is public, the token will be visible to browsers in the deployed JS: create a token specifically for this app with `assets:read` only, restrict its allowed URL to the origin `https://anggaconni.github.io` (default cross-origin Referrer-Policy can omit the path, so use the origin unless you explicitly configure and verify a path-bearing Referer header), and allow access to both Cesium World Terrain (asset ID `1`) and Cesium OSM Buildings (asset ID `96188`) if asset restrictions are enabled. The current viewer needs both assets so the imagery, ground and building footprints line up. Never use an admin/private token. Before using the workflow, change **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Then open Actions, select **Deploy World Heritage Atlas with Cesium token**, and choose **Run workflow**. This token-enabled workflow currently runs manually so it will not try to deploy before the Pages source is switched.

The Cesium ion Community plan is free for individual personal/non-commercial use and has a streaming quota; check [current plan and quotas](https://cesium.com/platform/cesium-ion/pricing/) before wider distribution. Cesium automatically provides the required OpenStreetMap attribution for this asset; see [Cesium OSM Buildings terms](https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/).

## Run locally
Serve the repository root over HTTP (e.g. `python -m http.server 8000`) and open `http://localhost:8000`.

## Next
1. Verify rendering and choose an explicitly configured base imagery/terrain source.
2. Expand from a verified, provenance-tracked UNESCO data source.
3. Add search, region explorer and richer source/provenance panel.
4. In phase two, add lightweight GLB scenes for selected sites and optional PWA app-shell caching.


## Basemap / navigation patch
- Explicitly disables Cesium's default ion-backed base layer and adds OpenStreetMap raster tiles, so the basemap does not depend on Google Maps or a Google key. The separate Cesium OSM Buildings layer streams through Cesium ion.
- Site marker clicks and site-card clicks animate to an oblique close-up; drag rotates, right-drag tilts, and the wheel zooms.
- The map now combines a 3D globe/camera, OpenStreetMap raster imagery draped over Cesium World Terrain, and Cesium OSM Buildings geometry. Cesium OSM Buildings is aligned to Cesium World Terrain; both assets must be allowed by the ion token. Local GLB overlays sample the currently loaded terrain height and sit on a small 1.2 m visual clearance without the earlier floating animation. OSM building models may be simple blocks and are not a guaranteed representation of every monument. Keep using properly licensed GLB assets for site-specific heritage models.


## Map readability patch
- Hides every site-name label by default to prevent long UNESCO site names overlapping at regional zoom levels.
- Reveals only the selected site's label, with a readable dark label background; highlights the selected map marker.
- Reduces the dark overlay over the base map so the raster map labels and geographic context remain easier to read.
- Turns off atmospheric fog that can soften map imagery.


## Site catalog, model placement and automated data refresh

- `data/sites.json` is the curated site/asset catalog: programme identity, coordinate pair, map camera range, model path, placement mode, target size metadata, scale, heading, offsets, source, creator and licence-review status.
- The existing Borobudur GLB is configured as a globe model anchored near the curated monument-centre coordinate. The app reads the JSON catalog before building markers. The model loader estimates the GLB's vertical bounds and scales to the configured target height (currently an approximate 35 m display target); check visual fit and position in a live browser. Map data uses an ellipsoid rather than detailed terrain, so the anchor height is not a survey-grade terrain elevation.
- `scripts/update_data.py` fetches UNESCO DataHub Explore API v2.1 datasets `whc001`, `eg0001`, `mab001`, `ich001`, and `cce001`, plus World Bank WDI tourism/economy indicators. `whc001` is the inscribed World Heritage List, not the Tentative List. A separate parser consumes UNESCO World Heritage Centre's official report [WHC/26/48.COM/8A](https://whc.unesco.org/document/226485), the list snapshot as of 15 April 2026, and adds `world_heritage_tentative` records to the registry without merging them with inscribed properties. It writes raw snapshots and normalized records under `data/generated/`; it never overwrites curated `data/sites.json`, quiz content or model metadata.
- Run manually: install the PDF text parser with `python -m pip install pypdf`, then run `python scripts/update_data.py --scope all --force`. Use `--scope unesco` or `--scope economy` to limit the sources.
- GitHub Actions can refresh monthly and has a manual `workflow_dispatch` trigger with source scope and force-refresh inputs. The workflow commits only generated outputs. Its generated dataset commit is separate from the website build; after refreshing source data, publish the latest main branch with the `Deploy World Heritage Atlas with Cesium token` workflow so the Pages artifact includes the new registry.
- Unit tests: `python scripts/test_update_data.py`.
- World Bank tourism/economy series are country-level context, not site-level economic impact estimates. Intangible heritage elements and some designated areas lack a single point, so records with missing coordinates are retained but not mapped. The Tentative List report does not provide central point coordinates in Annex 3, so tentative candidates appear in the list but are not plotted until coordinates are independently verified.
- Tentative List entries are explicitly labelled candidates, not inscriptions. The current snapshot is as of 15 April 2026 and must be updated when UNESCO publishes a newer complete report. Its document page states © UNESCO and does not state an open licence; attribution and official links are retained, but reuse terms should be reviewed before redistribution. The pipeline uses the published report rather than scraping individual World Heritage Centre pages.


## Render stability and map hover tooltips
The inherited Borobudur GLB is isolated in the Three.js site-detail viewer rather than loaded into Cesium's native rendering loop, because the deployed build showed a Cesium render-stopping `RangeError: Invalid array length` after the globe-model integration. Map points stay on the globe and clicking one opens the site journal/model viewer. A custom hover tooltip shows site name, designation, coordinates, and a click-to-explore hint. Re-enable a native Cesium mesh only after validating or converting the GLB with a local browser test.


## Borobudur model on the map
The Borobudur asset is configured with `placement: "globe"`, but deliberately does **not** use Cesium's native GLB renderer. A transparent Three.js overlay projects the anchor coordinate and a target-height point through the active Cesium camera, then positions/scales the rendered model above the OpenStreetMap tile. This makes the model visible at close site zoom without reintroducing the previous Cesium GLB render-loop crash. The overlay does not provide real terrain occlusion or surveyed footprint alignment; it is a visual MVP and must be inspected in a live browser.


## Favicon and page metadata
The site uses a custom vector temple favicon at `favicon.svg` with an explicit SVG favicon declaration. The document head includes a canonical URL, application name, theme colour, description, author and Open Graph/Twitter summary metadata.


## Animated Borobudur model and indicative exploration zone
- The globe overlay rotates slowly and gently bobs vertically while Borobudur is in the visible close-up range.
- Clicking the transparent model canvas toggles an indicative 350 m exploration zone on the map. The site drawer includes the same control so the zone can be switched while the drawer is open.
- The circle is explicitly labelled as illustrative, **not the official UNESCO buffer zone**. Replace it with a validated boundary polygon from an authoritative source before presenting it as an official buffer zone.


## Dynamic UNESCO explorer
The application reads the curated `data/sites.json` and generated `data/generated/site_registry.json`. The registry currently contains 3,568 records across five distinct programmes; roughly 1,824 source records have map coordinates. The UI now includes site search, programme filters and incremental list rendering. Records without coordinates stay searchable in the list but are not given invented map pins. Curated records reuse the stable local IDs, notes and GLB configuration.
The Borobudur overlay uses a square transparent canvas and fits the complete GLB bounding sphere to the camera before display. This should reduce the previous clipping caused by a wide canvas and too-close fixed camera. The selected model's own marker label is suppressed behind the mesh.


## Globe marker occlusion and exploration-zone label
Map points and site labels use depth testing rather than disabling it at infinite distance. This prevents markers on the far hemisphere (for example Africa when the camera faces Asia) from being drawn over the visible side of the globe. The exploration zone is labelled by a responsive HTML card instead of a tiny geospatial Cesium label, so the radius and non-official-boundary disclaimer remain legible.


## 3D asset folder and monthly completeness audit
All GLB model files are consolidated in assets/models/. Keep the original filename conventions simple and use lowercase snake_case ending in .glb. The canonical expected-file list is data/asset_manifest.json.

Read ASSET_UPLOAD_GUIDE.md for the exact filenames and download-to-upload instructions. ASSET_AUDIT_REPORT.md is generated by scripts/audit_assets.py and lists runtime files that are missing, planned site models, newly added or unregistered assets, invalid formats and files that need optimization.

Run locally with python scripts/audit_assets.py. Force a full inventory/checksum scan with python scripts/audit_assets.py --force. GitHub Actions also runs the audit monthly and supports a manual run.


## Asset audit workflow
The Monthly 3D Asset Audit workflow scans the unified assets/models/ folder on the first day of each month and can also be forced from GitHub Actions. It only checks assets already uploaded to the repository; it does not automatically search for or download new models. The root ASSET_AUDIT_REPORT.md lists current/missing assets, new unregistered models, moved files, integrity/name checks and size warnings. The previous inventory is stored in data/asset_audit_state.json.


## Komodo 3D model
Komodo National Park now uses a visible 3D Komodo dragon map overlay instead of a generic island placeholder. The app streams a small CC0 GLB preview from 3DAssets.dev and builds a procedural 3D lizard if the remote source fails. The visual size is intentionally exaggerated for map exploration. A local copy at `assets/models/komodo_dragon.glb` is optional for self-hosting/offline use and remains tracked by the asset audit.


## Uploaded Komodo models
The uploaded `komodo_dragon.glb` is now the primary on-map model for Komodo National Park. The file previously named `elin.glb` is renamed to `komodo_island.glb` and exposed as an optional local site-detail scene. Both are self-hosted under `assets/models/`; the Komodo map overlay no longer depends on a third-party GLB preview URL. Their current sizes exceed the recommended 5 MiB web asset budget, so consider mesh/texture optimisation later.


## Site Intelligence dossier
The site drawer now contains a lazily loaded Site Intelligence dossier. **Overview** uses curated catalogue metadata and official source links; **News** searches via a dedicated Cloudflare Worker + TinyFish; **Research** queries OpenAlex; **Environment** queries nearby biodiversity records from GBIF, mapped natural events from NASA EONET, and current model weather from Open-Meteo. External calls run only when a user opens News, Research, or Environment. Provider output is shown with provenance and direct links, and news leads are explicitly not treated as verified facts.

Deploy the shared Worker from the Aegis repository with `npx wrangler deploy --config wrangler.jsonc` after updating its route, then configure `TINYFISH_API_KEY` and optional `OPENALEX_API_KEY` as Cloudflare Worker secrets. See `SITE_INTELLIGENCE_SETUP.md`. The public app never contains provider keys.


## Site Intelligence dossier
The site drawer includes a lazily loaded Site Intelligence dossier. **Overview** uses curated catalogue metadata and official source links; **News** searches via a dedicated Cloudflare Worker + TinyFish; **Research** queries OpenAlex; **Environment** queries nearby biodiversity records from GBIF, mapped natural events from NASA EONET, and current model weather from Open-Meteo. External calls run only when a user opens News, Research, or Environment. Provider output is shown with provenance and direct links, and news leads are explicitly not treated as verified facts.

Deploy the shared Worker from the Aegis repository with `npx wrangler deploy --config wrangler.jsonc` after updating its route, then configure `TINYFISH_API_KEY` and optional `OPENALEX_API_KEY` as Cloudflare Worker secrets. See `SITE_INTELLIGENCE_SETUP.md`. The public app never contains provider keys.


### Deploy Site Intelligence Worker
The News and Research dossier tabs use the shared CivilAegis TinyFish proxy via `/site-intel`; the existing CivilAegis `/nearby-intel` safety endpoint remains unchanged. The News and Research tabs call the shared CivilAegis Worker route. Follow `SITE_INTELLIGENCE_SETUP.md` to deploy and verify the shared endpoint, and diagnose endpoint/CORS errors. The Environment tab calls GBIF, NASA EONET and Open-Meteo directly; it does not require a Worker secret.


## GLB runtime compatibility
The curated GLB uploads use different glTF extensions: Borobudur requires `KHR_draco_mesh_compression`, Prambanan requires `EXT_meshopt_compression`, and the Komodo dragon model uses `KHR_materials_pbrSpecularGlossiness`. The app pins Three.js r146 because it supports the two geometry decoder workflows while retaining the legacy specular/glossiness material extension; the loader is configured with both the Draco and Meshopt decoders. See the GLB validation step in GitHub Actions.


## Environmental intelligence connectors
The Environment tab loads live public APIs only when opened for a site with a curated map coordinate:
- **GBIF Occurrence Search** — indexed occurrence records within approximately 25 km of the map anchor, with individual occurrence links.
- **NASA EONET v3** — active events from the previous 90 days, searched around an approximately 100 km bounding area and filtered by distance to the anchor.
- **Open-Meteo Forecast API** — model-based current weather context at the map coordinate (temperature, relative humidity, precipitation, and wind).

The data is fetched directly in the browser and cached for the current session; these environmental calls require no API key or Worker deployment. Provider failures are handled separately. Results are contextual signals, not an official site-boundary intersection, species inventory, ecological assessment, or emergency alert. Large, marine, serial and multi-component designated properties may be poorly represented by one curated point. A zero-result response is not proof of absence.

Provider references: [GBIF API](https://techdocs.gbif.org/en/openapi/v1/occurrence), [NASA EONET API v3](https://eonet.gsfc.nasa.gov/docs/v3), and [Open-Meteo API](https://open-meteo.com/en/docs).
