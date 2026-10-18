# Map view modes

The map boots in **Street Map** mode using OpenStreetMap imagery with Cesium World Terrain and the existing UNESCO point overlays. The **Earth View** toolbar button switches the base imagery to Google satellite imagery using CesiumJS's `Google2DImageryProvider`; all terrain and UNESCO markers remain in the same Cesium scene. Press **Street Map** to return.

## Requirements

- The website pins CesiumJS 1.134.0, which includes `Google2DImageryProvider`.
- The deployed Cesium ion token needs the public `assets:read` scope.
- For GitHub Pages, start with the Allowed URL origin `https://anggaconni.github.io`. Browser referrer policies can omit URL paths on cross-origin requests, so a path-only restriction may reject otherwise valid requests.
- Leave **All assets** enabled while testing. If using **Selected assets**, allow Cesium World Terrain (asset `1`), Cesium OSM Buildings (asset `96188`) and the Google 2D imagery service (asset `3830184`).

Earth View uses:

```js
Cesium.Google2DImageryProvider.fromIonAssetId({
  assetId: 3830184,
  mapType: "satellite",
  language: "en_US",
  region: "ID"
});
```

If the imagery provider fails, the toggle preserves the current base imagery and displays the provider error. If World Terrain or OSM Buildings fails, inspect the Cesium ion token, asset access, quota and network separately; a successful imagery switch does not prove that the terrain/building assets are accessible.

Keep Cesium's Google imagery attribution visible whenever Earth View is active.

## Not the full Google Earth 3D mesh

This mode is satellite imagery with Cesium terrain. It is not the Google Maps Platform **Photorealistic 3D Tiles** experience, which requires a separate Google Maps Platform project, enabled Map Tiles API, restricted Google API key and billing setup. Follow Google Maps Platform policies and display all returned attribution if adding that later.

References:
- CesiumJS Google 2D imagery provider: https://cesium.com/learn/cesiumjs/ref-doc/Google2DImageryProvider.html
- Cesium ion access tokens: https://cesium.com/learn/ion/cesium-ion-access-tokens/
- Google Photorealistic 3D Tiles: https://developers.google.com/maps/documentation/tile/3d-tiles
- Google Map Tiles policies: https://developers.google.com/maps/documentation/tile/policies
