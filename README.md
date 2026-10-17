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
