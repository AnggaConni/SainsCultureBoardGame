# Map view modes

The map boots in **Street Map** mode using OpenStreetMap imagery with Cesium World Terrain and the existing UNESCO point overlays. The toolbar button **Earth View** switches only the base imagery to Google's satellite map tiles distributed through Cesium ion; terrain and UNESCO markers remain in the same Cesium scene. Press **Street Map** to return.

## Enabling Earth View

**Prerequisite:** CesiumJS 1.134.0 or newer. The previous 1.132.0 build does not contain `Google2DImageryProvider`.

The toggle calls \`Cesium.Google2DImageryProvider.fromIonAssetId({ assetId: 3830184, mapType: "satellite", language: "en_US", region: "ID" })\`. The app pins CesiumJS 1.134.0 or newer because CesiumJS 1.134 introduced `Google2DImageryProvider`. The provider uses the documented Google 2D imagery service asset ID 3830184 with `mapType: "satellite"`; do not confuse this service ID with the separate fixed imagery layers listed in the ion imagery-assets sample. It uses the deployed Cesium ion token; the token must be allowed to access the Google 2D imagery asset 3830184 as well as the existing World Terrain and OSM Buildings assets. If access is restricted to a fixed asset list, add asset 3830184 to that allowlist in the Cesium ion dashboard. If it is not allowed, the toggle retains the current base imagery and shows the provider error message. The button error text includes the actual error detail so you can distinguish unsupported CesiumJS versions from token/asset access failures.

The Google imagery attribution/logo in Cesium's credit display is kept visible while Earth View is active. Do not hide, crop, or obscure this required attribution.

## Important distinction

This mode provides Google satellite imagery with Cesium's existing terrain. It is not the full Google Maps Platform **Photorealistic 3D Tiles** experience. That product requires a Google Maps Platform project, Map Tiles API enabled, a restricted Google API key and billing configuration. To add that 3D city mesh later, configure a separate Google Maps API key, follow the applicable Google Maps Platform policies, and display all returned attributions. Do not treat an ordinary Google imagery toggle as the complete Google Earth desktop application.

References:
- CesiumJS Google 2D imagery provider: https://cesium.com/learn/cesiumjs/ref-doc/Google2DImageryProvider.html
- CesiumJS imagery layers: https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/
- Google Photorealistic 3D Tiles: https://developers.google.com/maps/documentation/tile/3d-tiles
- Google Map Tiles policies: https://developers.google.com/maps/documentation/tile/policies
