import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const config = await readFile(new URL("../js/cesium-config.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../css/atlas.css", import.meta.url), "utf8");
const deployWorkflow = await readFile(new URL("../.github/workflows/deploy-pages-with-cesium-token.yml", import.meta.url), "utf8");

test("Cesium OSM Buildings layer is requested during map initialization", () => {
  assert.match(app, /async function initOsmBuildings\(viewer\)/);
  assert.match(app, /await Cesium\.createOsmBuildingsAsync\(\{enableShowOutline:false\}\)/);
  assert.match(app, /viewer\.scene\.primitives\.add\(tileset\)/);
  assert.match(app, /initOsmBuildings\(v\);/);
});

test("OSM Buildings supports a restricted user-provided ion token", () => {
  assert.match(app, /window\.CESIUM_ION_ACCESS_TOKEN/);
  assert.match(app, /defaultAccessToken=token/);
});

test("building-layer failures are non-fatal and expose an actionable diagnostic", () => {
  assert.match(app, /state\.buildingsStatus="unavailable"/);
  assert.match(app, /Cesium OSM Buildings could not initialize/);
  assert.match(app, /3D BUILDINGS UNAVAILABLE · CHECK ION/);
});

test("Cesium token config loads before CesiumJS and is explicit", () => {
  assert.match(html, /src="js\/cesium-config\.js"><\/script><script src="https:\/\/unpkg\.com\/cesium@1\.132\.0\/Build\/Cesium\/Cesium\.js"/);
  assert.match(config, /window\.CESIUM_ION_ACCESS_TOKEN = ""/);
});

test("missing ion token is reported instead of silently claiming buildings are online", () => {
  assert.match(app, /if\(!token\)/);
  assert.match(app, /state\.buildingsStatus="token-required"/);
  assert.match(app, /3D BUILDINGS NEED ION TOKEN/);
});

test("tile streaming failures produce an actionable diagnostic", () => {
  assert.match(app, /tileset\.tileFailed\.addEventListener/);
  assert.match(app, /3D BUILDINGS AUTH ERROR · CHECK TOKEN/);
  assert.match(app, /3D BUILDINGS TILE ERROR/);
});

test("persistent map badge explains missing token and is not tied to the header status", () => {
  assert.match(html, /id="buildingsStatus" class="buildings-status"/);
  assert.match(app, /function setBuildingsUi\(message,tone\)/);
  assert.match(app, /setBuildingsUi\("3D BUILDINGS DISABLED · Add a restricted Cesium ion token in js\/cesium-config\.js\.","warn"\)/);
  assert.match(css, /\.buildings-status\[hidden\]\{display:none\}/);
  assert.match(css, /\.buildings-status\.error/);
});

test("Pages deployment injects the GitHub secret only into the generated artifact", () => {
  assert.match(deployWorkflow, /workflow_dispatch/);
  assert.match(deployWorkflow, /CESIUM_ION_ACCESS_TOKEN: \$\{\{ secrets\.CESIUM_ION_ACCESS_TOKEN \}\}/);
  assert.match(deployWorkflow, /Generate browser config for deployment artifact/);
  assert.match(deployWorkflow, /JSON\.stringify\(token\)/);
  assert.match(deployWorkflow, /actions\/upload-pages-artifact@v4/);
  assert.match(deployWorkflow, /actions\/deploy-pages@v4/);
  assert.match(deployWorkflow, /value will not be printed/);
});

test("Cesium OSM Buildings is paired with Cesium World Terrain", () => {
  assert.match(app, /terrain:worldTerrain/);
  assert.match(app, /Cesium\.Terrain\.fromWorldTerrain\(\{requestVertexNormals:true\}\)/);
  assert.match(app, /worldTerrain\.errorEvent\.addEventListener/);
  assert.match(app, /v\.scene\.globe\.getHeight\(cartographic\)/);
  assert.match(app, /LOCAL_MODEL_GROUND_CLEARANCE_METERS=1\.2/);
  assert.doesNotMatch(app, /model\.pivot\.position\.y=model\.basePivotY\+Math\.sin\(time\*1\.15\)\*0\.11/);
});

test("terrain and building token diagnostics identify both required asset IDs", () => {
  assert.match(app, /World Terrain \(asset 1\)/);
  assert.match(app, /OSM Buildings \(asset 96188\)/);
  assert.match(app, /WORLD TERRAIN \+ OSM BUILDINGS ACTIVE/);
});

test("Cesium ion token is applied before the world terrain provider is created", () => {
  const tokenIndex = app.indexOf("if(appIonToken&&Cesium.Ion)Cesium.Ion.defaultAccessToken=appIonToken");
  const terrainIndex = app.indexOf("Cesium.Terrain.fromWorldTerrain", tokenIndex);
  assert.ok(tokenIndex >= 0, "token assignment is present in initMap");
  assert.ok(terrainIndex > tokenIndex, "ion token is assigned before terrain creation");
});

test("terrain failures fall back to ellipsoid instead of leaving a black globe", () => {
  assert.match(app, /v\.scene\.setTerrain\(new Cesium\.Terrain\(Promise\.resolve\(new Cesium\.EllipsoidTerrainProvider\(\)\)\)\)/);
  assert.match(app, /Globe restored with a smooth ellipsoid/);
});

test("terrain shading does not darken the entire OSM basemap", () => {
  assert.match(app, /v\.scene\.globe\.enableLighting=false/);
});

test("map markers and labels remain visible above terrain tiles", () => {
  assert.match(app, /heightReference:Cesium\.HeightReference\.CLAMP_TO_GROUND,disableDepthTestDistance:Number\.POSITIVE_INFINITY\},label:/);
  assert.match(app, /distanceDisplayCondition:new Cesium\.DistanceDisplayCondition\(0,450000\),disableDepthTestDistance:Number\.POSITIVE_INFINITY/);
});
