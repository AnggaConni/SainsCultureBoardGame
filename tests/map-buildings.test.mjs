import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");

test("Cesium OSM Buildings layer is requested during map initialization", () => {
  assert.match(app, /async function initOsmBuildings\(viewer\)/);
  assert.match(app, /await Cesium\.createOsmBuildingsAsync\(\{enableShowOutline:false\}\)/);
  assert.match(app, /viewer\.scene\.primitives\.add\(tileset\)/);
  assert.match(app, /initOsmBuildings\(v\);/);
});

test("OSM Buildings supports a restricted user-provided ion token", () => {
  assert.match(app, /window\.CESIUM_ION_ACCESS_TOKEN/);
  assert.match(app, /Cesium\.Ion\.defaultAccessToken=window\.CESIUM_ION_ACCESS_TOKEN/);
});

test("building-layer failures are non-fatal and expose an actionable diagnostic", () => {
  assert.match(app, /state\.buildingsStatus="unavailable"/);
  assert.match(app, /Cesium OSM Buildings could not load/);
  assert.match(app, /The globe and site markers will remain available/);
});
