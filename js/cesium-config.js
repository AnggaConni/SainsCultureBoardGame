/*
 * Cesium ion public-client configuration.
 *
 * Add an app-specific, restricted access token from https://ion.cesium.com/tokens.
 * This file is served to browsers, so the token is public: do not use an admin/private token.
 * Recommended restrictions:
 *   - Scope: assets:read only
 *   - Allowed URL: https://anggaconni.github.io/SainsCultureBoardGame/
 *   - Allowed asset: Cesium OSM Buildings (asset 96188), if asset restrictions are enabled
 *
 * Leave empty until a restricted token has been created. The app will show a visible
 * status message rather than silently using Cesium's limited demo token.
 */
window.CESIUM_ION_ACCESS_TOKEN = "";
