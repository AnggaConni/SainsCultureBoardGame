import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const config = await readFile(new URL("../js/cesium-config.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../css/atlas.css", import.meta.url), "utf8");

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
