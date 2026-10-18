# Map view modes

The map boots in **Street Map** mode using OpenStreetMap imagery with Cesium World Terrain and the existing UNESCO point overlays. The toolbar button **Earth View** switches only the base imagery to **Google Maps 2D Satellite with Labels** served through Cesium ion; terrain and UNESCO markers remain in the same Cesium scene. Press **Street Map** to return.

## Enabling Earth View

The app uses `Cesium.IonImageryProvider.fromAssetId(3830183)`, the documented Cesium ion asset for Google Maps 2D Satellite with Labels. The public site pins CesiumJS 1.134.0.

The deployed Cesium ion token needs the public `assets:read` scope. For a public site, restrict its Allowed URL to the origin `https://anggaconni.github.io`. **Do not add the project path** unless the browser sends a matching path in its Referer header: Cesium ion URL restrictions require a Referer header, and the browser's default cross-origin referrer policy can send only the origin when requesting Cesium ion. Cesium's documentation describes URL restrictions and the need for a Referer header: https://cesium.com/learn/ion/cesium-ion-access-tokens/

Leave **All assets** enabled while testing. If using **Selected assets**, permit:
- Cesium World Terrain — asset `1`
- Cesium OSM Buildings — asset `96188`
- Google Maps 2D Satellite with Labels — asset `3830183`

If the provider cannot load, the toggle keeps the existing base imagery and shows the provider's error. The OSM Buildings setup also displays an error detail when the tileset fails to initialise.

The Google Maps attribution/logo supplied by Cesium must remain visible while Earth View is active. Do not hide, crop, or obscure the attribution.

## Important distinction

This mode provides Google satellite imagery with Cesium terrain. It is not the full Google Maps Platform **Photorealistic 3D Tiles** experience. That product requires a Google Maps Platform project, Map Tiles API enabled, a restricted Google API key and billing configuration. To add that 3D city mesh later, follow the applicable Google Maps Platform policies and display all returned attributions.

References:
- Cesium ion access tokens: https://cesium.com/learn/ion/cesium-ion-access-tokens/
- Google Maps 2D Satellite with Labels asset 3830183: https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/
- CesiumJS imagery layers: https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/
- Google Photorealistic 3D Tiles: https://developers.google.com/maps/documentation/tile/3d-tiles
- Google Map Tiles policies: https://developers.google.com/maps/documentation/tile/policies
