/*
 * Cesium ion public-client configuration.
 *
 * Add an app-specific, restricted access token from https://ion.cesium.com/tokens.
 * This file is served to browsers, so the token is public: do not use an admin/private token.
 * Recommended restrictions:
 *   - Scope: assets:read only
 *   - Allowed URL/origin: https://anggaconni.github.io (default cross-origin Referrer-Policy may omit the path)
 *   - Account assets: add Cesium World Terrain and Cesium OSM Buildings from Asset Depot to My Assets first; add Google 2D imagery if offered for this account. assets:read only reads available account assets.
 *   - Token resource access: All assets while testing, or Selected assets including 1 (terrain), 96188 (OSM buildings), and 3830184 (Google 2D imagery).
 *
 * Leave empty until a restricted token has been created. The app will show a visible
 * status message rather than silently using Cesium's limited demo token.
 */
window.CESIUM_ION_ACCESS_TOKEN = "";
