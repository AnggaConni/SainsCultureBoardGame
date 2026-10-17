# World Heritage Atlas — Learning Expedition

Browser-based educational exploration prototype: learn about UNESCO-designated places through a 3D globe, location journal, quizzes and lightweight progression.

Preview: https://anggaconni.github.io/SainsCultureBoardGame/ (after the redesign is merged and Pages is configured).

## Redesign branch
`redesign/unesco-sites-explorer`. The existing `main` branch and its 3D board-game prototype are preserved.

## Features
- Interactive CesiumJS 3D globe with map pins for six Indonesian World Heritage properties.
- Filter locations by culture, nature or cultural landscape.
- Short learning notes, inscription year, coordinates, why-it-matters cards and links to official UNESCO records.
- Site-specific knowledge checks with explanations.
- Field XP, discovery tracking and badge progression saved locally in the browser.
- Responsive desktop/mobile interface.

## Technology
Vanilla HTML/CSS/JavaScript; CesiumJS loaded from unpkg CDN; `js/sites.js` is the content dataset; `js/app.js` is application logic; `css/atlas.css` is the redesigned theme.

## Caveats
- MVP, not yet browser-tested end-to-end. Verify Cesium imagery/terrain provider behaviour in the deployed environment.
- Starter set contains six Indonesian World Heritage properties only. World Heritage, Biosphere Reserves, Global Geoparks, Creative Cities and Intangible Cultural Heritage are distinct programmes and should not be conflated.
- Verify official designation details and learning copy before institutional publication.
- The prototype does not integrate Google Photorealistic 3D Tiles. That requires separate API configuration, billing and compliance with relevant use and attribution policies.
- Images load from a third-party source; validate their availability and licensing before publication.
- Progress stays in localStorage on one browser/device. There are no accounts, analytics, online leaderboard or offline map tiles.

## Run locally
Serve the repository root over HTTP (e.g. `python -m http.server 8000`) and open `http://localhost:8000`.

## Next
1. Verify rendering and choose an explicitly configured base imagery/terrain source.
2. Expand from a verified, provenance-tracked UNESCO data source.
3. Add search, region explorer and richer source/provenance panel.
4. In phase two, add lightweight GLB scenes for selected sites and optional PWA app-shell caching.


## Basemap / navigation patch
- Explicitly disables Cesium's default ion-backed base layer and adds OpenStreetMap raster tiles, so the map does not depend on Google Maps or a Google key.
- Site marker clicks and site-card clicks animate to an oblique close-up; drag rotates, right-drag tilts, and the wheel zooms.
- This is a 3D globe/camera exploration with a 2D OSM basemap, **not** photogrammetric 3D buildings or detailed elevation. For true site-specific 3D models, use properly licensed GLB assets or a non-Google 3D tiles/terrain source in a later step.


## Map readability patch
- Hides every site-name label by default to prevent long UNESCO site names overlapping at regional zoom levels.
- Reveals only the selected site's label, with a readable dark label background; highlights the selected map marker.
- Reduces the dark overlay over the base map so the raster map labels and geographic context remain easier to read.
- Turns off atmospheric fog that can soften map imagery.


## Site catalog, model placement and automated data refresh

- `data/sites.json` is the curated site/asset catalog: programme identity, coordinate pair, map camera range, model path, placement mode, target size metadata, scale, heading, offsets, source, creator and licence-review status.
- The existing Borobudur GLB is configured as a globe model anchored near the curated monument-centre coordinate. The app reads the JSON catalog before building markers. The model loader estimates the GLB's vertical bounds and scales to the configured target height (currently an approximate 35 m display target); check visual fit and position in a live browser. Map data uses an ellipsoid rather than detailed terrain, so the anchor height is not a survey-grade terrain elevation.
- `scripts/update_data.py` fetches UNESCO DataHub Explore API v2.1 datasets `whc001`, `eg0001`, `mab001`, `ich001`, and `cce001`, plus World Bank WDI tourism/economy indicators. It writes raw snapshots and normalized records under `data/generated/`; it never overwrites curated `data/sites.json`, quiz content or model metadata.
- Run manually: `python scripts/update_data.py --scope all --force`. Use `--scope unesco` or `--scope economy` to limit the sources.
- GitHub Actions can refresh monthly and has a manual `workflow_dispatch` trigger with source scope and force-refresh inputs. The workflow commits only generated outputs.
- Unit tests: `python scripts/test_update_data.py`.
- World Bank tourism/economy series are country-level context, not site-level economic impact estimates. Intangible heritage elements and some designated areas lack a single point, so records with missing coordinates are retained but not mapped.
- Review current data licences/attribution and source terms before redistribution. In particular, use UNESCO DataHub's published dataset/API rather than scraping UNESCO World Heritage Centre pages directly; the Centre's own conditions restrict republication and non-syndicated scraping without permission.


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
The site drawer now contains a lazily loaded Site Intelligence dossier. **Overview** uses curated catalogue metadata and official source links; **News** searches via a dedicated Cloudflare Worker + TinyFish; **Research** queries OpenAlex; **Environment** is a clearly marked next-phase connector slot. External calls only run when a user opens News or Research. Provider output is shown with provenance and direct links, and news leads are explicitly not treated as verified facts.

Deploy the shared Worker from the Aegis repository with `npx wrangler deploy --config wrangler.jsonc` after updating its route, then configure `TINYFISH_API_KEY` and optional `OPENALEX_API_KEY` as Cloudflare Worker secrets. See `SITE_INTELLIGENCE_SETUP.md`. The public app never contains provider keys.


## Site Intelligence dossier
The site drawer includes a lazily loaded Site Intelligence dossier. **Overview** uses curated catalogue metadata and official source links; **News** searches via a dedicated Cloudflare Worker + TinyFish; **Research** queries OpenAlex; **Environment** is a clearly marked next-phase connector slot. External calls only run when a user opens News or Research. Provider output is shown with provenance and direct links, and news leads are explicitly not treated as verified facts.

Deploy the shared Worker from the Aegis repository with `npx wrangler deploy --config wrangler.jsonc` after updating its route, then configure `TINYFISH_API_KEY` and optional `OPENALEX_API_KEY` as Cloudflare Worker secrets. See `SITE_INTELLIGENCE_SETUP.md`. The public app never contains provider keys.


### Deploy Site Intelligence Worker
The News and Research dossier tabs use the shared CivilAegis TinyFish proxy via `/site-intel`; the existing CivilAegis `/nearby-intel` safety endpoint remains unchanged. The News and Research tabs call the shared CivilAegis Worker route. Follow `SITE_INTELLIGENCE_SETUP.md` to deploy and verify the shared endpoint, and diagnose endpoint/CORS errors. The Environment tab is still a Phase 2 placeholder.


## GLB runtime compatibility
The curated GLB uploads use different glTF extensions: Borobudur requires `KHR_draco_mesh_compression`, Prambanan requires `EXT_meshopt_compression`, and the Komodo dragon model uses `KHR_materials_pbrSpecularGlossiness`. The app pins Three.js r146 because it supports the two geometry decoder workflows while retaining the legacy specular/glossiness material extension; the loader is configured with both the Draco and Meshopt decoders. See the GLB validation step in GitHub Actions.
