# Map view modes

The map boots in **Street Map** mode using OpenStreetMap imagery with Cesium World Terrain and the existing UNESCO point overlays. The toolbar button **Earth View** switches only the base imagery to Google's satellite map tiles distributed through Cesium ion; terrain and UNESCO markers remain in the same Cesium scene. Press **Street Map** to return.

## Enabling Earth View

The toggle calls \`Cesium.Google2DImageryProvider.fromIonAssetId({ assetId: 3830184, mapType: "satellite", language: "en_US", region: "ID" })\`. It uses the deployed Cesium ion token; the token must be allowed to access the Google 2D imagery asset 3830184 as well as the existing World Terrain and OSM Buildings assets. If access is restricted to a fixed asset list, add asset 3830184 to that allowlist in the Cesium ion dashboard. If it is not allowed, the toggle retains the current base imagery and shows a message.

The Google imagery attribution/logo in Cesium's credit display is kept visible while Earth View is active. Do not hide, crop, or obscure this required attribution.

## Important distinction

This mode provides Google satellite imagery with Cesium's existing terrain. It is not the full Google Maps Platform **Photorealistic 3D Tiles** experience. That product requires a Google Maps Platform project, Map Tiles API enabled, a restricted Google API key and billing configuration. To add that 3D city mesh later, configure a separate Google Maps API key, follow the applicable Google Maps Platform policies, and display all returned attributions. Do not treat an ordinary Google imagery toggle as the complete Google Earth desktop application.

References:
- CesiumJS Google 2D imagery provider: https://cesium.com/learn/cesiumjs/ref-doc/Google2DImageryProvider.html
- CesiumJS imagery layers: https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/
- Google Photorealistic 3D Tiles: https://developers.google.com/maps/documentation/tile/3d-tiles
- Google Map Tiles policies: https://developers.google.com/maps/documentation/tile/policies
