(() => {"use strict";
const $=s=>document.querySelector(s),state={filter:"all",selected:null,visited:new Set(),xp:0,answered:new Set(),viewer:null,entities:new Map(),globeModelEntities:new Map(),catalog:null,hovered:null,globeOverlay:null,globeOverlayReady:false,globeOverlayCleanup:null,explorationZones:new Map(),toastTimer:null,local3d:null,local3dFrame:null,local3dModel:null},KEY="world-heritage-atlas-progress-v1",cat={culture:"CULTURE",nature:"NATURE",mixed:"MIXED"};
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>e.classList.remove("show"),2500)}
function save(){try{localStorage.setItem(KEY,JSON.stringify({visited:[...state.visited],answered:[...state.answered],xp:state.xp}));$("#saveStatus").textContent="PROGRESS SAVED LOCALLY"}catch(e){$("#saveStatus").textContent="LOCAL SAVE UNAVAILABLE"}}
function load(){try{const p=JSON.parse(localStorage.getItem(KEY)||"{}");state.visited=new Set(p.visited||[]);state.answered=new Set(p.answered||[]);state.xp=Number(p.xp)||0}catch(e){}}
function renderSites(){const list=HERITAGE_SITES.filter(s=>state.filter==="all"||s.category===state.filter);$("#siteCount").textContent=String(list.length).padStart(2,"0")+" SITES";$("#siteList").innerHTML=list.map(s=>`<button class="site-card ${state.selected===s.id?"selected":""}" data-site="${s.id}" type="button"><span class="site-thumb"><span class="thumb-icon">${s.icon}</span><img loading="lazy" src="${esc(s.image)}" alt="" onerror="this.remove()"></span><span class="site-info"><strong>${esc(s.name)}</strong><small>${esc(s.location)}</small><span class="site-meta"><i class="type-pill ${s.category}">${cat[s.category]}</i>${state.visited.has(s.id)?'<i class="type-pill nature">DISCOVERED</i>':""}</span></span><span class="site-arrow">↗</span></button>`).join("");$("#siteList").querySelectorAll("[data-site]").forEach(b=>b.addEventListener("click",()=>openSite(b.dataset.site,true)))}
function progress(){const n=state.xp%500;$("#xpValue").textContent=state.xp;$("#xpBar").style.width=n/500*100+"%";$("#levelValue").textContent=String(Math.floor(state.xp/500)+1).padStart(2,"0");$("#discoveriesValue").textContent=state.visited.size+" "+(state.visited.size===1?"discovery":"discoveries");$("#badgeValue").textContent=state.visited.size>=6?"Heritage Guardian":state.visited.size>=3?"Curious Cartographer":state.visited.size?"Field Observer":"First steps";const yes=state.visited.size>0;$("#missionProgressBar").style.width=yes?"100%":"0%";$("#missionProgressText").textContent=yes?"1 / 1 completed":"0 / 1 completed";$("#missionTitle").textContent=yes?"Field notes updated":"The curious traveller";$("#missionDescription").textContent=yes?"Your first discovery is recorded. Pick another site to continue.":"Visit a designated site and complete its knowledge check.";renderSites()}
function fly(s){if(!state.viewer)return;const ranges={borobudur:9000,prambanan:9000,"bali-cultural-landscape":20000,komodo:32000,sangiran:10000,lorentz:70000};const target=state.entities.get(s.id);const range=Number(s.mapRange)||ranges[s.id]||14000;if(target){state.viewer.flyTo(target,{duration:2.0,offset:new Cesium.HeadingPitchRange(Cesium.Math.toRadians(24),Cesium.Math.toRadians(-38),range)})}else{const [lon,lat]=s.coordinates;state.viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lon,lat,range),orientation:{heading:Cesium.Math.toRadians(24),pitch:Cesium.Math.toRadians(-65),roll:0},duration:2.0})}$("#coordReadout").textContent=s.coordinates[1].toFixed(3)+"°, "+s.coordinates[0].toFixed(3)+"°";$("#mapStatus").textContent="EXPLORING · "+s.name.toUpperCase()}
function setSelectedMarker(id){state.entities.forEach((entity,key)=>{const active=key===id,hovered=key===state.hovered;if(entity.label)entity.label.show=active||hovered;if(entity.point){entity.point.pixelSize=active?19:hovered?16:12;entity.point.outlineWidth=active?3:hovered?2.5:2;entity.point.outlineColor=active||hovered?Cesium.Color.fromCssColorString("#ffffff"):Cesium.Color.fromCssColorString("#dcece7")}})}
function markers(){
 HERITAGE_SITES.forEach(s=>{
  const [lon,lat]=s.coordinates;
  const e=state.viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat,2),point:{pixelSize:12,color:Cesium.Color.fromCssColorString(s.color),outlineColor:Cesium.Color.fromCssColorString("#dcece7"),outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},label:{show:false,text:s.name,font:"14px sans-serif",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.fromCssColorString("#08232d"),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString("#08232d").withAlpha(0.94),backgroundPadding:new Cesium.Cartesian2(9,6),verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-25),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,450000),disableDepthTestDistance:Number.POSITIVE_INFINITY}});
  e.siteId=s.id;state.entities.set(s.id,e);
 });
 // Deliberately do not attach GLB meshes to Cesium's render loop until each asset
 // is validated against Cesium's glTF renderer. The site GLB remains in the
 // isolated Three.js site viewer so a bad model cannot stop the whole globe.
}
function hideGlobeOverlay(){const el=$("#globeModelOverlay");if(el)el.hidden=true}
function initGlobeModelOverlay(){
 const site=HERITAGE_SITES.find(s=>s.globeModel);
 if(!site||!site.globeModel||!window.THREE||!THREE.GLTFLoader){console.info("[Heritage Atlas] No on-globe GLB configured or Three.js unavailable.");return}
 const host=$("#globeModelCanvasHost"),wrapper=$("#globeModelOverlay");
 if(!host||!wrapper)return;
 wrapper.hidden=true;
 const scene=new THREE.Scene();
 scene.background=null;
 scene.add(new THREE.HemisphereLight(0xfff4dc,0x334b51,2.0));
 const keyLight=new THREE.DirectionalLight(0xffffff,2.4);keyLight.position.set(5,8,6);scene.add(keyLight);
 const fillLight=new THREE.DirectionalLight(0x9bd9ce,0.9);fillLight.position.set(-5,4,-5);scene.add(fillLight);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
 renderer.setPixelRatio(1);
 renderer.setClearColor(0x000000,0);
 renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 host.innerHTML="";host.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(35,2,0.01,1000);
 const modelState={site,asset:site.globeModel,scene,renderer,camera,host,wrapper,loaded:false,basePixel:new THREE.Vector2(),targetHeight:35,aspect:2,pivot:null,basePivotY:0.08};
 state.globeOverlay=modelState;
 wrapper.setAttribute("role","button");
 wrapper.setAttribute("tabindex","0");
 wrapper.setAttribute("aria-label","Toggle the indicative exploration zone around "+site.name);
 wrapper.title="Click the 3D temple to show or hide the indicative exploration zone";
 if(!wrapper.dataset.interactionBound){
  wrapper.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();toggleExplorationZone(site,true)});
  wrapper.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggleExplorationZone(site,true)}});
  wrapper.dataset.interactionBound="true";
 }
 const loader=new THREE.GLTFLoader();
 loader.load(modelState.asset.path,gltf=>{
  try{
   const model=gltf.scene;
   const bounds=new THREE.Box3().setFromObject(model);
   const size=bounds.getSize(new THREE.Vector3());
   const center=bounds.getCenter(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<=0||!Number.isFinite(size.x)||!Number.isFinite(size.z))throw new Error("GLB has invalid or empty bounding dimensions");
   const normalizedHeight=4.2;
   const modelScale=normalizedHeight/size.y;
   model.scale.setScalar(modelScale);
   const pivot=new THREE.Group();
   model.position.set(-center.x*modelScale,-bounds.min.y*modelScale,-center.z*modelScale);
   pivot.add(model);
   pivot.position.y=0.08;
   scene.add(pivot);
   modelState.pivot=pivot;
   modelState.basePivotY=0.08;
   const horizontalWidth=Math.max(size.x,size.z)*modelScale;
   modelState.aspect=Math.max(1.35,Math.min(4.8,(horizontalWidth/normalizedHeight)*1.12));
   const canvasHeight=512,canvasWidth=Math.round(canvasHeight*modelState.aspect);
   renderer.setSize(canvasWidth,canvasHeight,false);
   camera.aspect=modelState.aspect;camera.fov=35;camera.position.set(Math.min(3.4,horizontalWidth*0.23),5.0,7.3);camera.lookAt(0,1.65,0);camera.updateProjectionMatrix();
   renderer.render(scene,camera);
   const baseProjected=new THREE.Vector3(0,0,0).project(camera);
   modelState.basePixel.set((baseProjected.x+1)*0.5*canvasWidth,(1-baseProjected.y)*0.5*canvasHeight);
   const topProjected=new THREE.Vector3(0,normalizedHeight,0).project(camera);
   modelState.renderedHeight=Math.abs(modelState.basePixel.y-(1-topProjected.y)*0.5*canvasHeight);
   modelState.canvasWidth=canvasWidth;modelState.canvasHeight=canvasHeight;modelState.normalizedHeight=normalizedHeight;
   modelState.loaded=true;
   wrapper.hidden=false;
   console.info("[Heritage Atlas] GLB loaded for geospatial overlay",site.name,{sourceBounds:{width:size.x,depth:size.z,height:size.y},targetHeightMeters:modelState.targetHeight,asset:modelState.asset.path});
   updateGlobeModelOverlay();
  }catch(error){console.error("[Heritage Atlas] Could not prepare GLB overlay",error);hideGlobeOverlay()}
 },undefined,error=>{console.error("[Heritage Atlas] GLB overlay failed to load",modelState.asset.path,error);hideGlobeOverlay()});
 const onPostRender=()=>{try{updateGlobeModelOverlay()}catch(error){console.error("[Heritage Atlas] 3D overlay update failed; hiding overlay to keep the globe running.",error);hideGlobeOverlay()}};
 state.viewer.scene.postRender.addEventListener(onPostRender);
 state.globeOverlayCleanup=()=>{try{state.viewer&&state.viewer.scene.postRender.removeEventListener(onPostRender)}catch(_){};renderer.dispose();state.globeOverlay=null;state.globeOverlayReady=false};
}
function refreshZoneButton(siteId){
 const button=$("#zoneToggleBtn");if(!button)return;
 const current=state.explorationZones.get(siteId);
 button.textContent=current&&current.visible?"Hide exploration zone on map":"Show exploration zone on map ↗";
}
function toggleExplorationZone(site,closeDrawerAfter=true){
 const target=site||state.globeOverlay&&state.globeOverlay.site||HERITAGE_SITES.find(s=>s.id===state.selected);
 if(!target||!state.viewer){toast("Map is not ready yet.");return}
 // A genuine UNESCO buffer zone is based on approved boundaries. This is an explicitly
 // illustrative 350 m learning radius until an authoritative polygon is sourced.
 const radius=target.id==="borobudur"?350:Number(target.catalogRecord&&target.catalogRecord.map&&target.catalogRecord.map.explorationZoneRadiusMeters)||0;
 if(!radius){toast("No mapped exploration zone is configured for this site yet.");return}
 let record=state.explorationZones.get(target.id);
 if(record){
  record.visible=!record.visible;
  record.entities.forEach(entity=>entity.show=record.visible);
 }else{
  const lon=Number(target.coordinates[0]),lat=Number(target.coordinates[1]);
  const center=Cesium.Cartesian3.fromDegrees(lon,lat,4);
  const zone=state.viewer.entities.add({
   id:"indicative-exploration-zone-"+target.id,show:true,position:center,
   ellipse:{semiMajorAxis:radius,semiMinorAxis:radius,height:4,material:Cesium.Color.fromCssColorString("#58d9b5").withAlpha(0.19),outline:true,outlineColor:Cesium.Color.fromCssColorString("#f2c66d").withAlpha(0.95),outlineWidth:3}
  });
  const inner=state.viewer.entities.add({
   id:"indicative-exploration-zone-inner-"+target.id,show:true,position:center,
   ellipse:{semiMajorAxis:radius*0.68,semiMinorAxis:radius*0.68,height:5,material:Cesium.Color.fromCssColorString("#58d9b5").withAlpha(0.05),outline:true,outlineColor:Cesium.Color.fromCssColorString("#62dcb8").withAlpha(0.9),outlineWidth:2}
  });
  const label=state.viewer.entities.add({
   id:"indicative-exploration-zone-label-"+target.id,show:true,
   position:Cesium.Cartesian3.fromDegrees(lon+0.0014,lat+0.0019,8),
   label:{text:"INDICATIVE EXPLORATION ZONE\n350 m radius · not official UNESCO boundary",font:"12px sans-serif",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.fromCssColorString("#08232d"),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString("#08232d").withAlpha(0.94),backgroundPadding:new Cesium.Cartesian2(9,6),verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-9),disableDepthTestDistance:0,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,18000)}
  });
  record={entities:[zone,inner,label],visible:true,radiusMeters:radius};state.explorationZones.set(target.id,record);
 }
 refreshZoneButton(target.id);
 if(closeDrawerAfter)close("siteDrawer");
 toast(record.visible?"Indicative exploration zone shown · "+radius+" m radius":"Exploration zone hidden");
}
function projectWorldToWindow(scene,position){
 const transforms=Cesium.SceneTransforms;
 // Cesium 1.121+ removed wgs84ToWindowCoordinates in favour of worldToWindowCoordinates.
 const fn=transforms&&(transforms.worldToWindowCoordinates||transforms.wgs84ToWindowCoordinates);
 if(typeof fn!=="function")return undefined;
 try{return fn.call(transforms,scene,position,new Cesium.Cartesian2())}
 catch(error){console.warn("[Heritage Atlas] Map coordinate projection failed",error);return undefined}
}
function updateGlobeModelOverlay(){
 const model=state.globeOverlay,v=state.viewer;
 if(!model||!model.loaded||!v)return;
 const {site,asset,wrapper,renderer,camera}=model;
 const lon=Number(site.coordinates[0]),lat=Number(site.coordinates[1]);
 const anchorHeight=Number(site.catalogRecord&&site.catalogRecord.map&&site.catalogRecord.map.modelAnchorHeightMeters||0)+Number(asset.offsetMeters&&asset.offsetMeters.up||0);
 const surface=Cesium.Cartesian3.fromDegrees(lon,lat,anchorHeight);
 const cameraDistance=Cesium.Cartesian3.distance(v.camera.positionWC,surface);
 if(!Number.isFinite(cameraDistance)||cameraDistance>180000){wrapper.hidden=true;return}
 // Subtle 3D motion: slow yaw + small vertical bob, rendered only while nearby.
 const time=(window.performance&&performance.now?performance.now():Date.now())*0.001;
 if(model.pivot){
  model.pivot.rotation.y=time*0.24;
  model.pivot.position.y=model.basePivotY+Math.sin(time*1.15)*0.11;
  renderer.render(model.scene,camera);
 }
 const groundPixel=projectWorldToWindow(v.scene,surface);
 const heightMeters=Number(asset.targetSizeMeters&&asset.targetSizeMeters.height)||35;
 const top=Cesium.Cartesian3.fromDegrees(lon,lat,anchorHeight+heightMeters);
 const topPixel=projectWorldToWindow(v.scene,top);
 if(!groundPixel||!topPixel||!Number.isFinite(groundPixel.x)||!Number.isFinite(groundPixel.y)||!Number.isFinite(topPixel.x)||!Number.isFinite(topPixel.y)){wrapper.hidden=true;return}
 const width=v.container.clientWidth,height=v.container.clientHeight;
 if(groundPixel.x<-100||groundPixel.x>width+100||groundPixel.y<-150||groundPixel.y>height+150){wrapper.hidden=true;return}
 const projectedHeight=Math.hypot(topPixel.x-groundPixel.x,topPixel.y-groundPixel.y);
 if(!Number.isFinite(projectedHeight)||projectedHeight<0.5){wrapper.hidden=true;return}
 // Keep the model large enough to be discoverable at the initial site zoom,
 // but cap it so users can still read the surrounding map.
 const displayHeight=Math.max(22,Math.min(projectedHeight,245));
 const canvasHeight=model.canvasHeight,canvasWidth=model.canvasWidth;
 const cssScale=displayHeight/Math.max(1,model.renderedHeight);
 const displayWidth=canvasWidth*cssScale;
 const left=groundPixel.x-model.basePixel.x*cssScale;
 const topPos=groundPixel.y-model.basePixel.y*cssScale;
 wrapper.style.left=Math.round(left)+"px";wrapper.style.top=Math.round(topPos)+"px";
 wrapper.style.width=Math.round(displayWidth)+"px";wrapper.style.height=Math.round(canvasHeight*cssScale)+"px";
 wrapper.hidden=false;
}
function updateMapHover(position){
 if(!state.viewer)return;
 let entity=null;
 try{
  const picked=state.viewer.scene.pick(position);
  if(Cesium.defined(picked)&&picked.id&&picked.id.siteId&&!picked.id.isSiteModel)entity=picked.id;
 }catch(error){console.debug("Map hover pick skipped",error)}
 const nextId=entity?entity.siteId:null;
 if(state.hovered!==nextId){
  const previous=state.entities.get(state.hovered);
  if(previous&&previous.label)previous.label.show=state.hovered===state.selected;
  state.hovered=nextId;
  const next=state.entities.get(nextId);
  if(next&&next.label){
   const site=HERITAGE_SITES.find(s=>s.id===nextId);
   next.label.text=site?site.name:"";
   next.label.show=true;
  }
  setSelectedMarker(state.selected);
 }
 const tooltip=$("#mapHoverTooltip");
 if(!tooltip)return;
 if(!entity){tooltip.hidden=true;return}
 const site=HERITAGE_SITES.find(s=>s.id===nextId);
 if(!site){tooltip.hidden=true;return}
 $("#mapHoverName").textContent=site.name;
 $("#mapHoverType").textContent=(site.designation||"UNESCO designated place")+" · "+(site.country||"");
 $("#mapHoverCoords").textContent=site.coordinates[1].toFixed(4)+"°, "+site.coordinates[0].toFixed(4)+"°";
 tooltip.hidden=false;
 const maxX=Math.max(8,state.viewer.container.clientWidth-tooltip.offsetWidth-10);
 const maxY=Math.max(8,state.viewer.container.clientHeight-tooltip.offsetHeight-10);
 tooltip.style.left=Math.max(8,Math.min(position.x+15,maxX))+"px";
 tooltip.style.top=Math.max(8,Math.min(position.y+15,maxY))+"px";
}
function initMap(){if(!window.Cesium){fallback();return}try{const v=new Cesium.Viewer("cesiumContainer",{animation:false,baseLayer:false,baseLayerPicker:false,geocoder:false,homeButton:false,infoBox:false,sceneModePicker:false,selectionIndicator:false,timeline:false,navigationHelpButton:false,fullscreenButton:false,shouldAnimate:false});state.viewer=v;v.imageryLayers.removeAll();v.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({url:"https://tile.openstreetmap.org/"}));v.scene.globe.enableLighting=true;v.scene.globe.baseColor=Cesium.Color.fromCssColorString("#78979a");v.scene.backgroundColor=Cesium.Color.fromCssColorString("#071a24");v.scene.globe.show=true;v.scene.globe.depthTestAgainstTerrain=false;v.scene.fog.enabled=false;v.scene.screenSpaceCameraController.enableRotate=true;v.scene.screenSpaceCameraController.enableZoom=true;v.scene.screenSpaceCameraController.enableTilt=true;v.camera.setView({destination:Cesium.Cartesian3.fromDegrees(112,4,22500000),orientation:{heading:0,pitch:Cesium.Math.toRadians(-88),roll:0}});markers();initGlobeModelOverlay();$("#mapStatus").textContent="OPEN MAP · OPENSTREETMAP";v.screenSpaceEventHandler.setInputAction(e=>{const p=v.scene.pick(e.position);if(Cesium.defined(p)&&p.id&&p.id.siteId)openSite(p.id.siteId,true)},Cesium.ScreenSpaceEventType.LEFT_CLICK);v.screenSpaceEventHandler.setInputAction(e=>updateMapHover(e.endPosition),Cesium.ScreenSpaceEventType.MOUSE_MOVE);$("#cesiumContainer").addEventListener("mouseleave",()=>{$("#mapHoverTooltip").hidden=true;const old=state.entities.get(state.hovered);if(old&&old.label)old.label.show=state.hovered===state.selected;state.hovered=null;setSelectedMarker(state.selected)});v.scene.globe.tileLoadProgressEvent.addEventListener(n=>{if(n===0&&$("#mapStatus").textContent==="OPEN MAP · OPENSTREETMAP")$("#mapStatus").textContent="3D GLOBE ONLINE · OSM"})}catch(e){console.error("Cesium / OpenStreetMap initialization failed",e);fallback()}}
function fallback(){$("#mapStatus").textContent="MAP OFFLINE";$("#mapFallback").hidden=false}
function renderLocalModelPicker(site){
 const zoneButton=$("#zoneToggleBtn");
 if(zoneButton){zoneButton.hidden=site.id!=="borobudur";refreshZoneButton(site.id)}
 const models=Array.isArray(site.models)?site.models:[];
 const select=$("#localModelSelect"),expected=$("#localModelExpected");
 select.innerHTML="";
 if(!models.length){select.disabled=true;$("#loadLocalModelBtn").disabled=true;$("#loadLocalModelBtn").textContent="No model";expected.textContent="Belum ada model lokal untuk situs ini. Lihat ASSET_CATALOG.md untuk rencana aset berikutnya.";$("#localModelStage").hidden=true;$("#localModelCredit").hidden=true;return}
 select.disabled=false;$("#loadLocalModelBtn").disabled=false;$("#loadLocalModelBtn").textContent="Open 3D ↗";
 models.forEach((m,i)=>{const o=document.createElement("option");o.value=m.path;o.textContent=m.label;select.appendChild(o)});
 expected.textContent="Upload path: "+models[0].path;
 const active=models[0];
 $("#localModelCredit").hidden=!active.credit;
 $("#localModelCredit").textContent=active.credit||"";
 select.onchange=()=>{const m=models.find(x=>x.path===select.value)||models[0];expected.textContent="Upload path: "+m.path;$("#localModelCredit").hidden=!m.credit;$("#localModelCredit").textContent=m.credit||"";$("#localModelStage").hidden=true};
}
function disposeLocal3D(){
 if(state.local3dFrame)cancelAnimationFrame(state.local3dFrame);
 state.local3dFrame=null;
 if(state.local3d){
  const v=state.local3d;
  if(v.controls)v.controls.dispose();
  if(v.renderer){v.renderer.dispose();if(v.renderer.domElement.parentNode)v.renderer.domElement.parentNode.removeChild(v.renderer.domElement)}
  state.local3d=null;
 }
 const host=$("#modelCanvasHost");if(host)host.innerHTML="";
}
function loadLocal3D(){
 const site=HERITAGE_SITES.find(x=>x.id===state.selected),path=$("#localModelSelect").value;
 if(!site||!path){toast("Pilih situs dan model lokal dahulu.");return}
 if(!window.THREE||!THREE.GLTFLoader||!THREE.OrbitControls){$("#localModelExpected").textContent="Three.js belum berhasil dimuat. Periksa koneksi CDN.";return}
 $("#localModelStage").hidden=false;$("#localModelStatus").textContent="Memuat "+path+" …";$("#localModelExpected").textContent="Model dimuat dari path lokal repository.";disposeLocal3D();
 $("#localModelStage").hidden=false;
 requestAnimationFrame(()=>{
  const host=$("#modelCanvasHost"),w=Math.max(260,host.clientWidth),h=Math.max(200,host.clientHeight);
  const scene=new THREE.Scene();scene.background=new THREE.Color("#0c2028");
  scene.add(new THREE.HemisphereLight(0xfff1d6,0x34434b,2.0));
  const keyLight=new THREE.DirectionalLight(0xffffff,2.4);keyLight.position.set(5,8,6);scene.add(keyLight);
  const fillLight=new THREE.DirectionalLight(0x9ad9d0,0.8);fillLight.position.set(-5,3,-4);scene.add(fillLight);
  const grid=new THREE.GridHelper(12,12,0x315c5b,0x1c393d);grid.position.y=-0.02;scene.add(grid);
  const camera=new THREE.PerspectiveCamera(42,w/h,0.01,1000);camera.position.set(5,3.5,6);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setSize(w,h);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  host.innerHTML="";host.appendChild(renderer.domElement);
  const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=0.07;controls.target.set(0,1.4,0);controls.minDistance=1.1;controls.maxDistance=18;
  state.local3d={scene,camera,renderer,controls,host};
  const loader=new THREE.GLTFLoader();
  loader.load(path,gltf=>{
   if(!state.local3d||state.selected!==site.id)return;
   const model=gltf.scene;model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),maxDim=Math.max(size.x,size.y,size.z)||1,scale=4.2/maxDim;
   model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);scene.add(model);state.local3dModel=model;
   const fittedBox=new THREE.Box3().setFromObject(model),fittedSize=fittedBox.getSize(new THREE.Vector3());
   controls.target.set(0,Math.max(0.45,fittedSize.y*0.45),0);camera.position.set(4.8,Math.max(2.2,fittedSize.y*0.8),5.5);camera.near=0.01;camera.far=1000;camera.updateProjectionMatrix();controls.update();
   $("#localModelStatus").textContent="Model loaded · drag to orbit · scroll to zoom";
   $("#localModelCredit").hidden=false;
   const opt=site.models.find(x=>x.path===path);
   $("#localModelCredit").textContent=(opt&&opt.credit?opt.credit+" · ":"")+"Local asset: "+path;
  },progress=>{if(progress.total>0)$("#localModelStatus").textContent="Loading model "+Math.round(progress.loaded/progress.total*100)+"%"},err=>{
   console.warn("Local GLB could not be loaded:",path,err);
   $("#localModelStatus").textContent="Model belum ditemukan / gagal dimuat.";
   $("#localModelExpected").textContent="Pastikan file diunggah tepat di: "+path+" (huruf besar-kecil harus sama), lalu reload GitHub Pages.";
   toast("3D asset belum tersedia di path tersebut.");
  });
  const animate=()=>{if(!state.local3d||state.local3d.renderer!==renderer)return;state.local3dFrame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};
  animate();
 });
}
function resizeLocal3D(){if(!state.local3d)return;const {host,camera,renderer}=state.local3d,w=Math.max(260,host.clientWidth),h=Math.max(200,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}
function openSite(id,zoom){const s=HERITAGE_SITES.find(x=>x.id===id);if(!s)return;state.selected=id;setSelectedMarker(id);$("#drawerTitle").textContent=s.name;$("#drawerLocation").textContent=s.location;$("#drawerRegion").textContent=s.region;$("#heroCoordinates").textContent=s.coordinates[1].toFixed(3)+" / "+s.coordinates[0].toFixed(3);$("#drawerHero").style.background="linear-gradient(135deg,#123e47dd,#387966bb),url('"+s.image+"') center/cover";$("#drawerHero .drawer-category").textContent=s.designation.toUpperCase();$("#visitedPill").textContent=state.visited.has(id)?"DISCOVERY RECORDED":"NOT YET EXPLORED";$("#visitedPill").classList.toggle("done",state.visited.has(id));$("#drawerTags").innerHTML=s.tags.map(t=>"<span>"+esc(t)+"</span>").join("");$("#drawerDescription").textContent=s.description;$("#drawerFacts").innerHTML='<div class="fact"><span>Designation</span><b>'+esc(s.designation)+'</b></div><div class="fact"><span>Inscribed</span><b>'+esc(s.year)+'</b></div><div class="fact"><span>Why it matters</span><b>'+esc(s.why)+'</b></div><div class="fact"><span>Quick fact</span><b>'+esc(s.fact)+'</b></div>';renderLocalModelPicker(s);$("#officialLink").href=s.official;$("#citationLine").textContent="Source: UNESCO World Heritage Centre · "+s.official+" Educational summary; verify details in official record.";$("#quizQuestion").textContent=s.challenge.question;$("#quizFeedback").hidden=true;const done=state.answered.has(id);$("#quizOptions").innerHTML=s.challenge.options.map((o,i)=>'<button type="button" class="quiz-option" data-answer="'+i+'" '+(done?"disabled":"")+'>'+String.fromCharCode(65+i)+". "+esc(o)+'</button>').join("");if(done){$("#quizFeedback").hidden=false;$("#quizFeedback").textContent="Challenge already completed. Explore another site to keep earning discoveries."}$("#quizOptions").querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(s,Number(b.dataset.answer))));$("#visitBtn").textContent=state.visited.has(id)?"Discovery recorded ✓":"Start exploration →";$("#visitBtn").onclick=()=>visit(s);$("#siteDrawer").hidden=false;renderSites();if(zoom)fly(s)}
function answer(s,i){const ok=i===s.challenge.answer;$("#quizOptions").querySelectorAll("button").forEach((b,n)=>{b.disabled=true;if(n===s.challenge.answer)b.classList.add("correct");else if(n===i)b.classList.add("incorrect")});$("#quizFeedback").hidden=false;if(ok){if(!state.answered.has(s.id)){state.answered.add(s.id);state.xp+=100;save();progress()}$("#quizFeedback").textContent="Correct! +100 Field XP. "+s.challenge.explanation;toast("Knowledge unlocked · +100 Field XP")}else $("#quizFeedback").textContent="Not quite. "+s.challenge.explanation+" Try another challenge.";$("#visitedPill").textContent="CHALLENGE COMPLETED";$("#visitedPill").classList.add("done")}
function visit(s){if(!state.visited.has(s.id)){state.visited.add(s.id);state.xp+=50;save();progress();toast("Discovery recorded · +50 Field XP")}$("#visitedPill").textContent="DISCOVERY RECORDED";$("#visitedPill").classList.add("done");$("#visitBtn").textContent="Discovery recorded ✓"}
function close(id){$("#"+id).hidden=true}
function bind(){document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{state.filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderSites()}));document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>close(b.dataset.close)));["siteDrawer","helpModal"].forEach(id=>$("#"+id).addEventListener("click",e=>{if(e.target.id===id)close(id)}));$("#resetViewBtn").addEventListener("click",()=>{if(state.viewer)state.viewer.camera.flyHome(1.5);$("#coordReadout").textContent="SELECT A PIN TO BEGIN"});$("#retryMapBtn").addEventListener("click",()=>{if(state.viewer){state.viewer.destroy();state.viewer=null}$("#mapFallback").hidden=true;initMap()});$("#helpBtn").addEventListener("click",()=>$("#helpModal").hidden=false);$("#missionGoBtn").addEventListener("click",()=>{const s=HERITAGE_SITES.find(x=>!state.visited.has(x.id))||HERITAGE_SITES[0];openSite(s.id,true)});$("#locateBtn").addEventListener("click",()=>{if(!navigator.geolocation){toast("Location is not available in this browser.");return}navigator.geolocation.getCurrentPosition(p=>{if(state.viewer){state.viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(p.coords.longitude,p.coords.latitude,25000),duration:1.6});$("#coordReadout").textContent=p.coords.latitude.toFixed(3)+"°, "+p.coords.longitude.toFixed(3)+"°"}},()=>toast("Location permission was not granted."),{timeout:8000})});$("#loadLocalModelBtn").addEventListener("click",loadLocal3D);$("#zoneToggleBtn").addEventListener("click",()=>toggleExplorationZone(HERITAGE_SITES.find(s=>s.id===state.selected),true));$("#resetLocalModelBtn").addEventListener("click",()=>{if(state.local3d){const {camera,controls}=state.local3d;camera.position.set(4.8,3.5,5.5);controls.target.set(0,1.4,0);controls.update()}});window.addEventListener("resize",()=>{resizeLocal3D();if(state.globeOverlay&&state.globeOverlay.loaded){const m=state.globeOverlay;m.renderer.render(m.scene,m.camera);updateGlobeModelOverlay()}});$("#soundBtn").addEventListener("click",()=>toast("Ambient sound is not included in this prototype."));document.addEventListener("keydown",e=>{if(e.key==="Escape"){close("siteDrawer");close("helpModal")}})}
async function loadSiteCatalog(){
 try{
  const response=await fetch("data/sites.json",{cache:"no-cache"});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const catalog=await response.json();
  state.catalog=catalog;
  const byId=new Map((catalog.sites||[]).map(site=>[site.id,site]));
  HERITAGE_SITES.forEach(site=>{
   const item=byId.get(site.id);if(!item)return;
   const lon=Number(item.location&&item.location.longitude),lat=Number(item.location&&item.location.latitude);
   if(Number.isFinite(lon)&&Number.isFinite(lat))site.coordinates=[lon,lat];
   site.catalogRecord=item;
   site.mapRange=item.map&&item.map.initialCameraRangeMeters;
   site.models=(item.models||[]).map(m=>({
    ...m,path:m.file||m.path,label:m.label||m.id,
    credit:[m.creator||"Creator not recorded",m.license||"License to verify",m.sourceUrl||""].filter(Boolean).join(" · ")
   }));
   site.globeModel=site.models.find(m=>m.placement==="globe"&&m.status==="available")||null;
  });
  console.info("[Heritage Atlas] loaded curated catalog",catalog.schemaVersion,(catalog.sites||[]).length,"sites");
 }catch(error){console.warn("[Heritage Atlas] curated data/sites.json unavailable; using JS fallbacks",error)}
}
async function boot(){load();bind();await loadSiteCatalog();renderSites();progress();initMap()}
boot();
})();