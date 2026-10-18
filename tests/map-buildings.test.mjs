import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const config = await readFile(new URL("../js/cesium-config.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../css/atlas.css", import.meta.url), "utf8");
const quizBank = JSON.parse(await readFile(new URL("../data/quizzes.json", import.meta.url), "utf8"));
const musicPlaylist = JSON.parse(await readFile(new URL("../music/playlist.json", import.meta.url), "utf8"));
const sitesJs = await readFile(new URL("../js/sites.js", import.meta.url), "utf8");
const deployWorkflow = await readFile(new URL("../.github/workflows/deploy-pages-with-cesium-token.yml", import.meta.url), "utf8");
const cesiumConfig = await readFile(new URL("../js/cesium-config.js", import.meta.url), "utf8");

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
  assert.match(html, /src="js\/cesium-config\.js"><\/script><script src="https:\/\/unpkg\.com\/cesium@1\.134\.0\/Build\/Cesium\/Cesium\.js"/);
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

test("terrain and building status is based on actual local visibility", () => {
  assert.ok(app.includes("if(state.buildingsVisibilitySync)state.buildingsVisibilitySync()"));
  assert.ok(app.includes("3D BUILDINGS ACTIVE · Local detail view"));
  assert.ok(app.includes("3D BUILDINGS READY · Zoom closer to reveal buildings"));
  assert.ok(!app.includes("WORLD TERRAIN + OSM BUILDINGS ACTIVE · Local GLB clearance: 1.2 m."));
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

test("markers use dark cores with bright category-colored glow", () => {
  assert.ok(app.includes("function markerPalette(site)"));
  assert.ok(app.includes('world_heritage:{glow:"#FFC857",core:"#101923"}'));
  assert.ok(app.includes('global_geopark:{glow:"#B7A4FF",core:"#19162F"}'));
  assert.ok(app.includes('biosphere_reserve:{glow:"#55F2B0",core:"#0D2923"}'));
  assert.ok(app.includes('creative_cities:{glow:"#FF86AA",core:"#321725"}'));
  assert.ok(app.includes("function createMarkerImage(site)"));
  assert.ok(app.includes("ctx.createRadialGradient(32,32,4,32,32,31)"));
  assert.ok(app.includes("billboard:{image:createMarkerImage(s)"));
  assert.ok(app.includes("heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND"));
  assert.equal((app.match(/disableDepthTestDistance:Number\.POSITIVE_INFINITY/g)||[]).length,2);
  assert.ok(app.includes("function syncFrontHemisphereMarkers()"));
  assert.ok(app.includes("e._mapSurfacePosition=surfacePosition"));
  assert.ok(app.includes("e._mapSurfaceNormal=surfaceNormal"));
  assert.ok(app.includes("entity.show=entity._mapFilterVisible!==false&&frontSide"));
  assert.ok(app.includes("v.scene.preRender.addEventListener(syncFrontHemisphereMarkers)"));
  assert.doesNotMatch(app, /disableDepthTestDistance:18000/);
  assert.ok(!app.includes("entity.point.pixelSize"));
});

test("front-side markers bypass terrain artifacts while the far hemisphere is manually culled", () => {
  assert.match(app, /billboard:\{image:createMarkerImage\(s\)[^}]*disableDepthTestDistance:Number\.POSITIVE_INFINITY/);
  assert.match(app, /label:\{show:false[^}]*disableDepthTestDistance:Number\.POSITIVE_INFINITY/);
  assert.match(app, /Cesium\.Ellipsoid\.WGS84\.geodeticSurfaceNormal\(surfacePosition/);
  assert.match(app, /Cesium\.Cartesian3\.dot\(normal,markerVisibilityScratch\)>0/);
  assert.match(app, /entity\.show=entity\._mapFilterVisible!==false&&frontSide/);
  assert.match(app, /syncFrontHemisphereMarkers\(\);initGlobeModelOverlay\(\)/);
  assert.doesNotMatch(app, /disableDepthTestDistance:0/);
});

test("world view fills the globe while selected site views stay oblique", () => {
  assert.ok(app.includes("pitch:Cesium.Math.toRadians(-90),roll:0}});markers();"));
  assert.ok(app.includes("Cesium.Cartesian3.fromDegrees(118,-2,22500000)"));
  assert.ok(app.includes('$("#resetViewBtn").addEventListener("click",()=>{if(state.viewer)state.viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(118,-2,22500000),orientation:{heading:0,pitch:Cesium.Math.toRadians(-90),roll:0},duration:1.5})'));
  assert.ok(app.includes("new Cesium.HeadingPitchRange(Cesium.Math.toRadians(24),Cesium.Math.toRadians(-38),range)"));
});

test("OSM buildings are hidden at planetary scale and shown only after zoom-in", () => {
  assert.ok(app.includes("const BUILDINGS_MAX_VISIBLE_CAMERA_HEIGHT_METERS=350000"));
  assert.ok(app.includes("tileset.show=false"));
  assert.ok(app.includes("function cameraAltitudeMeters(viewer)"));
  assert.ok(app.includes("Cesium.Cartesian3.magnitude(worldPosition)-Cesium.Ellipsoid.WGS84.maximumRadius"));
  assert.ok(app.includes("viewer.scene.primitives.add(tileset)"));
  assert.ok(app.includes("OSM Buildings added only at local camera height"));
  assert.ok(app.includes("OSM Buildings tileset prepared; it remains outside the render scene until local zoom."));
  assert.ok(app.includes("viewer.camera.changed.addEventListener(syncBuildingVisibility)"));
  assert.ok(app.includes("viewer.scene.preRender.addEventListener(syncBuildingVisibility)"));
  assert.ok(app.includes("viewer.scene.preRender.removeEventListener(syncBuildingVisibility)"));
  assert.ok(app.includes("3D BUILDINGS READY · Zoom closer to reveal buildings"));
});

test("Tentative List is a distinct selectable status, not an inscribed World Heritage site", () => {
  assert.ok(app.includes('key:"world_heritage_tentative",label:"World Heritage Tentative List"'));
  assert.ok(app.includes('programme==="world_heritage_tentative"'));
  assert.ok(app.includes("Tentative status means a State Party may consider a future nomination; it is not an inscription."));
  assert.ok(app.includes("no map marker is plotted until coordinates can be verified"));
});


test("Environment tab queries GBIF, NASA EONET and Open-Meteo using the site's coordinate", () => {
  assert.ok(app.includes("async function fetchSiteEnvironment(site)"));
  assert.ok(app.includes("https://api.gbif.org/v1/occurrence/search"));
  assert.ok(app.includes('gbifUrl.searchParams.set("decimalLatitude",String(lat))'));
  assert.ok(app.includes('gbifUrl.searchParams.set("decimalLongitude",String(lon))'));
  assert.ok(app.includes('gbifUrl.searchParams.set("geo_distance","25km,"+lat+","+lon)'));
  assert.ok(app.includes('const body=await response.text()'));
  assert.ok(app.includes('String(detail).replace(/\\s+/g," ").slice(0,160)'));
  assert.ok(app.includes("https://eonet.gsfc.nasa.gov/api/v3/events"));
  assert.ok(app.includes('eventsUrl.searchParams.set("days","90")'));
  assert.ok(app.includes("https://api.open-meteo.com/v1/forecast"));
  assert.ok(app.includes("function renderSiteEnvironment(site,payload)"));
  assert.ok(app.includes("siteIntelCache.set(key,payload)"));
  assert.ok(!app.includes("Environmental intelligence is next"));
  assert.ok(app.includes("not an official UNESCO property boundary"));
});


test("ambient playlist is editable JSON in the music folder, with every listed audio file present", async () => {
  assert.equal(musicPlaylist.schemaVersion, "1.0.0");
  assert.equal(musicPlaylist.defaultVolume, 0.4);
  assert.ok(musicPlaylist.folders.framelens);
  assert.ok(musicPlaylist.folders.cc4);
  assert.equal(musicPlaylist.folders.framelens.creditMode, "folder");
  assert.equal(musicPlaylist.folders.cc4.creditMode, "track");
  assert.ok(Array.isArray(musicPlaylist.tracks));
  assert.ok(musicPlaylist.tracks.length >= 1);
  assert.equal(new Set(musicPlaylist.tracks.map(track => track.id)).size, musicPlaylist.tracks.length);
  for (const track of musicPlaylist.tracks) {
    assert.ok(track.id && track.title && track.credit && track.detail);
    assert.ok(musicPlaylist.folders[track.folder], "unknown music folder for " + track.id);
    assert.ok(track.src.startsWith(track.folder + "/"), "track path must be relative to its matching folder");
    assert.match(track.src, /^(framelens|cc4)\/[^/]+\.(mp3|ogg|wav|m4a|aac|opus)$/i);
    assert.match(track.sourceUrl, /^https:\/\//);
    await access(new URL("../music/" + track.src, import.meta.url));
    if (track.folder === "cc4") assert.ok(track.credit.includes(track.title), "CC BY credit should name " + track.title);
  }
});

test("ambient player loads playlist JSON and keeps playback controls", () => {
  assert.match(app, /fetch\(playlistUrl\.href,\{cache:"no-cache"\}\)/);
  assert.match(app, /new URL\("music\/playlist\.json",document\.baseURI\)/);
  assert.match(app, /AMBIENT_TRACKS=tracks/);
  assert.match(app, /AMBIENT_FOLDERS=folders/);
  assert.match(app, /audio\.src=new URL\(track\.src,new URL\("music\/",document\.baseURI\)\)\.href/);
  assert.match(app, /folder\.creditMode==="folder"\?folder\.credit:track\.credit/);
  assert.match(app, /document\.addEventListener\("pointerdown",firstInteraction,\{capture:true\}\)/);
  assert.match(app, /document\.addEventListener\("keydown",firstInteraction,\{capture:true\}\)/);
  assert.match(app, /ambientAudio\.volume=AMBIENT_DEFAULT_VOLUME/);
  assert.match(app, /volumeControl\.value=String\(AMBIENT_DEFAULT_VOLUME\)/);
  assert.match(app, /event\.currentTarget\.dataset\.userAdjusted="true"/);
  assert.match(app, /"#musicNextBtn"\)\.addEventListener\("click"/);
  assert.match(app, /"#musicVolume"\)\.addEventListener\("input"/);
  assert.match(app, /playButton\.textContent=playing\?"Ⅱ Pause":"▶ Play"/);
  assert.doesNotMatch(app, /const AMBIENT_TRACKS=\[/);
});

test("ambient player has accessible controls, responsive styling and visible attribution", () => {
  assert.match(html, /id="musicPanel"[^>]*aria-label="Background music player"/);
  assert.match(html, /id="musicPlayBtn"/);
  assert.match(html, /id="musicNextBtn"/);
  assert.match(html, /id="musicVolume"[^>]*value="0\.4"/);
  assert.match(html, /id="musicSourceLink"/);
  assert.match(css, /\.music-panel\[hidden\]\{display:none!important\}/);
  assert.match(css, /#soundBtn\.is-playing/);
  assert.match(css, /@media\(max-width:760px\)\{\s*#soundBtn\{display:grid/);
  assert.ok(musicPlaylist.folders.framelens.credit.includes("framelens_id"));
  assert.ok(musicPlaylist.tracks.some(track => track.title === "Al Andalus" && track.credit.includes(track.title)));
  assert.ok(musicPlaylist.tracks.some(track => track.title === "All The Tea In China" && track.credit.includes(track.title)));
  assert.ok(musicPlaylist.tracks.some(track => track.title === "The Medieval Banquet" && track.credit.includes(track.title)));
  assert.ok(app.includes('folder.creditMode==="folder"?folder.credit:track.credit'));
  assert.ok(musicPlaylist.folders.framelens.name.includes("Framelens ID"));
  assert.ok(musicPlaylist.folders.cc4.name.includes("Creative Commons Attribution 4.0"));
});


test("SEO and social metadata uses the current Pages URL and root thumbnail image", () => {
  const siteUrl = "https://anggaconni.github.io/UNESCO-Designated-Site-Explorer/";
  const thumbnailUrl = siteUrl + "thumbnail.png";
  assert.ok(html.includes('<link rel="canonical" href="' + siteUrl + '">'));
  assert.ok(html.includes('<meta property="og:url" content="' + siteUrl + '">'));
  assert.ok(html.includes('<meta property="og:image" content="' + thumbnailUrl + '">'));
  assert.ok(html.includes('<meta property="og:image:type" content="image/png">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(html.includes('<meta name="twitter:image" content="' + thumbnailUrl + '">'));
  assert.ok(html.includes('name="description"'));
  assert.ok(html.includes('name="robots" content="index,follow,max-image-preview:large"'));
});


test("Quiz bank is external JSON with all three scopes and valid unique questions", () => {
  assert.equal(quizBank.schemaVersion, "1.0.0");
  assert.ok(Array.isArray(quizBank.quizzes));
  assert.equal(quizBank.quizzes.length, 72);
  assert.equal(new Set(quizBank.quizzes.map(quiz => quiz.id)).size, quizBank.quizzes.length);
  for (const scope of ["general", "specialized", "site_type"]) {
    assert.ok(quizBank.quizzes.some(quiz => quiz.scope === scope), "missing quiz scope " + scope);
  }
  for (const quiz of quizBank.quizzes) {
    assert.ok(quiz.id && quiz.question && quiz.explanation);
    assert.ok(Array.isArray(quiz.options) && quiz.options.length >= 2);
    assert.ok(Number.isInteger(quiz.answerIndex) && quiz.answerIndex >= 0 && quiz.answerIndex < quiz.options.length);
    assert.match(quiz.sourceUrl, /^https:\/\//);
    if (quiz.scope === "specialized") assert.ok(Array.isArray(quiz.targetSiteIds) && quiz.targetSiteIds.length);
    if (quiz.scope === "site_type") assert.ok(Array.isArray(quiz.targetSiteTypes) && quiz.targetSiteTypes.length);
  }
  assert.equal(quizBank.quizzes.filter(quiz => quiz.scope === "general").length, 24);
  assert.equal(quizBank.quizzes.filter(quiz => quiz.scope === "specialized").length, 24);
  assert.equal(quizBank.quizzes.filter(quiz => quiz.scope === "site_type").length, 24);
  for (const scope of ["general", "specialized", "site_type"]) {
    const positions = quizBank.quizzes.filter(quiz => quiz.scope === scope).reduce((counts, quiz) => (counts[quiz.answerIndex]++, counts), [0, 0, 0, 0]);
    assert.ok(positions.filter(count => count > 0).length >= 3, scope + " correct answers should not all use the same option position");
  }
});

test("Quiz runtime targets general questions, exact site IDs, and programme types", () => {
  assert.ok(app.includes('fetch("data/quizzes.json",{cache:"no-cache"})'));
  assert.ok(app.includes('quiz.scope==="general"'));
  assert.ok(app.includes('quiz.targetSiteIds.includes(site.id)'));
  assert.ok(app.includes('quiz.targetSiteTypes.includes(site.programmeKey)'));
  assert.ok(app.includes("function advanceSiteQuiz(site)"));
  assert.ok(app.includes("function answerSiteQuiz(site,quiz,selectedIndex)"));
  assert.ok(app.includes('state.answered.has(quiz.id)'));
  assert.ok(app.includes('state.xp+=100'));
});

test("Inline site challenges are removed and quiz scope/navigation metadata is rendered", () => {
  assert.doesNotMatch(sitesJs, /challenge:\{/);
  assert.match(app, /renderSiteQuiz\(s\)/);
  assert.match(html, /id="quizScopeBadge"/);
  assert.match(html, /id="quizCounter"/);
  assert.match(html, /id="quizSource"/);
  assert.match(html, /id="quizNextBtn"/);
  assert.match(css, /\.quiz-scope-badge/);
  assert.match(css, /\.quiz-next-btn/);
});


test("Map mode toggle switches between OSM navigation and Google satellite imagery", () => {
  assert.match(html, /id="baseMapToggleBtn"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(app, /function toggleBaseMap\(\)/);
  assert.match(app, /new Cesium\.OpenStreetMapImageryProvider\(\{url:"https:\/\/tile\.openstreetmap\.org\/"\}\)/);
  assert.match(app, /Cesium\.Google2DImageryProvider\.fromIonAssetId\(\{assetId:3830184,mapType:"satellite",language:"en_US",region:"ID"\}\)/);
  assert.match(html, /cesium@1\.134\.0/);
  assert.match(app, /state\.imageryMode=nextMode/);
  assert.match(app, /stage\.classList\.toggle\("earth-mode",nextMode==="earth"\)/);
  assert.match(app, /#baseMapToggleBtn"\)\.addEventListener\("click",toggleBaseMap\)/);
  assert.match(app, /keeping the current base layer/);
});

test("Google imagery attribution is visible when Earth View is active and token scope is documented", () => {
  assert.match(css, /\.map-stage\.earth-mode #cesiumContainer \.cesium-viewer-bottom\{display:block!important/);
  assert.match(css, /\.map-stage\.earth-mode #cesiumContainer \.cesium-widget-credits/);
  assert.ok(cesiumConfig.includes("Google 2D imagery service (asset 3830184)"));
});
