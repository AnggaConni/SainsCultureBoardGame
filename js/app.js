(() => {"use strict";
const $=s=>document.querySelector(s),SITE_INTEL_API_URL="https://civilaegis-tinyfish-proxy.conniezz-cool.workers.dev/site-intel",state={filter:"all",search:"",listLimit:60,selected:null,visited:new Set(),xp:0,answered:new Set(),viewer:null,buildingsTileset:null,buildingsStatus:"idle",terrainStatus:"idle",entities:new Map(),globeModelEntities:new Map(),catalog:null,registryMeta:null,hovered:null,globeOverlay:null,globeOverlays:new Map(),globeOverlayReady:false,globeOverlayCleanup:null,globeOverlayCleanups:[],komodoOverlay:null,komodoOverlayCleanup:null,explorationZones:new Map(),activeZoneId:null,siteIntelCache:new Map(),siteIntelPending:new Map(),siteIntelTab:"overview",toastTimer:null,local3d:null,local3dFrame:null,local3dModel:null},KEY="world-heritage-atlas-progress-v1",cat={culture:"CULTURE",nature:"NATURE",mixed:"MIXED"};
const LOCAL_MODEL_GROUND_CLEARANCE_METERS=1.2;
const MAP_MARKER_GROUND_CLEARANCE_METERS=12;
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>e.classList.remove("show"),2500)}
function save(){try{localStorage.setItem(KEY,JSON.stringify({visited:[...state.visited],answered:[...state.answered],xp:state.xp}));$("#saveStatus").textContent="PROGRESS SAVED LOCALLY"}catch(e){$("#saveStatus").textContent="LOCAL SAVE UNAVAILABLE"}}
function load(){try{const p=JSON.parse(localStorage.getItem(KEY)||"{}");state.visited=new Set(p.visited||[]);state.answered=new Set(p.answered||[]);state.xp=Number(p.xp)||0}catch(e){}}
function hasCoordinates(site){return Array.isArray(site.coordinates)&&site.coordinates.length>=2&&Number.isFinite(Number(site.coordinates[0]))&&Number.isFinite(Number(site.coordinates[1]))&&Math.abs(Number(site.coordinates[1]))<=90&&Math.abs(Number(site.coordinates[0]))<=180}
function filterMatchesSite(site){
 const filter=state.filter;
 if(filter==="mapped"&&!hasCoordinates(site))return false;
 if(filter==="unmapped"&&hasCoordinates(site))return false;
 if(["world_heritage","global_geopark","biosphere_reserve","intangible_cultural_heritage","creative_cities"].includes(filter)&&site.programmeKey!==filter)return false;
 if(["culture","nature","mixed"].includes(filter)&&site.category!==filter)return false;
 const q=state.search.trim().toLocaleLowerCase();
 if(q){
  const hay=[site.name,site.country,site.location,site.designation,site.programmeLabel,site.region].filter(Boolean).join(" ").toLocaleLowerCase();
  if(!hay.includes(q))return false;
 }
 return true;
}
function renderSites(){
 const list=HERITAGE_SITES.filter(filterMatchesSite);
 const mapCount=HERITAGE_SITES.filter(hasCoordinates).length;
 $("#siteCount").textContent=list.length.toLocaleString()+" MATCHES";
 $("#datasetStatus").textContent=HERITAGE_SITES.length.toLocaleString()+" records · "+mapCount.toLocaleString()+" mapped · "+(HERITAGE_SITES.length-mapCount).toLocaleString()+" without coordinates";
 $("#siteList").innerHTML=list.slice(0,state.listLimit).map(s=>{
  const label=s.programmeShort||cat[s.category]||String(s.category||"SITE").replace(/_/g," ").toUpperCase();
  const img=s.image?`<img loading="lazy" src="${esc(s.image)}" alt="" onerror="this.remove()">`:"";
  const mapPill=hasCoordinates(s)?"":'<i class="type-pill unmapped">NO MAP POINT</i>';
  return `<button class="site-card ${state.selected===s.id?"selected":""} ${hasCoordinates(s)?"":"site-card-unmapped"}" data-site="${esc(s.id)}" type="button"><span class="site-thumb"><span class="thumb-icon">${esc(s.icon||"◎")}</span>${img}</span><span class="site-info"><strong>${esc(s.name)}</strong><small>${esc(s.location||s.country||"Location not specified")}</small><span class="site-meta"><i class="type-pill ${esc(s.category||"other")}">${esc(label)}</i>${mapPill}${state.visited.has(s.id)?'<i class="type-pill nature">DISCOVERED</i>':""}</span></span><span class="site-arrow">${hasCoordinates(s)?"↗":"·"}</span></button>`
 }).join("");
 $("#siteList").querySelectorAll("[data-site]").forEach(b=>b.addEventListener("click",()=>{const selected=HERITAGE_SITES.find(s=>s.id===b.dataset.site);openSite(b.dataset.site,hasCoordinates(selected))}));
 const more=$("#loadMoreSites");
 more.hidden=list.length<=state.listLimit;
 more.textContent="Load more sites · "+Math.min(60,Math.max(0,list.length-state.listLimit)).toLocaleString();
 state.entities.forEach((entity,id)=>{const site=HERITAGE_SITES.find(s=>s.id===id);if(site)entity.show=filterMatchesSite(site)});
}
function progress(){const n=state.xp%500;$("#xpValue").textContent=state.xp;$("#xpBar").style.width=n/500*100+"%";$("#levelValue").textContent=String(Math.floor(state.xp/500)+1).padStart(2,"0");$("#discoveriesValue").textContent=state.visited.size+" "+(state.visited.size===1?"discovery":"discoveries");$("#badgeValue").textContent=state.visited.size>=6?"Heritage Guardian":state.visited.size>=3?"Curious Cartographer":state.visited.size?"Field Observer":"First steps";const yes=state.visited.size>0;$("#missionProgressBar").style.width=yes?"100%":"0%";$("#missionProgressText").textContent=yes?"1 / 1 completed":"0 / 1 completed";$("#missionTitle").textContent=yes?"Field notes updated":"The curious traveller";$("#missionDescription").textContent=yes?"Your first discovery is recorded. Pick another site to continue.":"Visit a designated site and complete its knowledge check.";renderSites()}
function fly(s){if(!state.viewer||!hasCoordinates(s)){toast("This record does not yet have a reliable map coordinate.");return}const ranges={borobudur:9000,prambanan:9000,"bali-cultural-landscape":20000,komodo:32000,sangiran:10000,lorentz:70000};const target=state.entities.get(s.id);const range=Number(s.mapRange)||ranges[s.id]||(s.programmeKey==="global_geopark"||s.programmeKey==="biosphere_reserve"?65000:14000);if(target){state.viewer.flyTo(target,{duration:2.0,offset:new Cesium.HeadingPitchRange(Cesium.Math.toRadians(24),Cesium.Math.toRadians(-38),range)})}else{const [lon,lat]=s.coordinates;state.viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lon,lat,range),orientation:{heading:Cesium.Math.toRadians(24),pitch:Cesium.Math.toRadians(-65),roll:0},duration:2.0})}$("#coordReadout").textContent=s.coordinates[1].toFixed(3)+"°, "+s.coordinates[0].toFixed(3)+"°";$("#mapStatus").textContent="EXPLORING · "+s.name.toUpperCase()}
function setSelectedMarker(id){state.entities.forEach((entity,key)=>{const active=key===id,hovered=key===state.hovered,coveredByModel=!!(((state.globeOverlays&&state.globeOverlays.get(key)&&state.globeOverlays.get(key).loaded)||(state.globeOverlay&&state.globeOverlay.loaded&&state.globeOverlay.site.id===key)||(state.komodoOverlay&&state.komodoOverlay.loaded&&state.komodoOverlay.site.id===key)));if(entity.label)entity.label.show=(active||hovered)&&!coveredByModel;if(entity.point){entity.point.pixelSize=active?17:hovered?14:8;entity.point.outlineWidth=active?3:hovered?2.5:1.5;entity.point.outlineColor=active||hovered?Cesium.Color.fromCssColorString("#ffffff"):Cesium.Color.fromCssColorString("#dcece7")}})}
function markers(){
 HERITAGE_SITES.forEach(s=>{
  if(!hasCoordinates(s))return;
  const lon=Number(s.coordinates[0]),lat=Number(s.coordinates[1]);
  const e=state.viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat,MAP_MARKER_GROUND_CLEARANCE_METERS),point:{pixelSize:8,color:Cesium.Color.fromCssColorString(s.color||"#86c8b4"),outlineColor:Cesium.Color.fromCssColorString("#dcece7"),outlineWidth:1.5,heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,disableDepthTestDistance:0},label:{show:false,text:s.name,font:"13px sans-serif",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.fromCssColorString("#08232d"),outlineWidth:3,heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString("#08232d").withAlpha(0.94),backgroundPadding:new Cesium.Cartesian2(9,6),verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-23),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,450000),disableDepthTestDistance:0}});
  e.siteId=s.id;e.programmeKey=s.programmeKey||"world_heritage";state.entities.set(s.id,e);
 });
 console.info("[Heritage Atlas] rendered",state.entities.size,"georeferenced markers from",HERITAGE_SITES.length,"UNESCO designation records");
}
function hideGlobeOverlay(model){
 if(model){if(model.wrapper)model.wrapper.hidden=true;return}
 if(state.globeOverlays&&state.globeOverlays.size){state.globeOverlays.forEach(item=>{if(item.wrapper)item.wrapper.hidden=true});return}
 const el=$("#globeModelOverlay");if(el)el.hidden=true
}
function initGlobeModelOverlay(){
 const sites=HERITAGE_SITES.filter(site=>site.id!=="komodo"&&site.globeModel&&site.globeModel.path);
 if(!sites.length||!window.THREE||!THREE.GLTFLoader){console.info("[Heritage Atlas] No available on-globe GLB sites or Three.js unavailable.");return}
 const stage=$(".map-stage");
 if(!stage)return;
 state.globeOverlays=new Map();
 state.globeOverlayCleanups=[];
 state.globeOverlay=null;
 sites.forEach(site=>{
  let wrapper,host;
  if(site.id==="borobudur"){
   wrapper=$("#globeModelOverlay");host=$("#globeModelCanvasHost");
  }else{
   const overlayId="globeModelOverlay-"+site.id;
   wrapper=$("#"+overlayId);
   if(!wrapper){
    wrapper=document.createElement("div");wrapper.id=overlayId;wrapper.className="globe-model-overlay site-model-overlay";wrapper.hidden=true;
    host=document.createElement("div");host.id="globeModelCanvasHost-"+site.id;wrapper.appendChild(host);stage.appendChild(wrapper);
   }else host=wrapper.firstElementChild;
  }
  if(!wrapper||!host){console.warn("[Heritage Atlas] Model overlay host missing for",site.id);return}
  initGlobeModelForSite(site,wrapper,host);
 });
 state.globeOverlayCleanup=()=>{state.globeOverlayCleanups.forEach(cleanup=>{try{cleanup()}catch(_){}});state.globeOverlayCleanups=[];if(state.globeOverlays)state.globeOverlays.clear();state.globeOverlay=null;state.globeOverlayReady=false};
}
function initGlobeModelForSite(site,wrapper,host){
 const asset=site.globeModel;
 wrapper.hidden=true;
 wrapper.setAttribute("role","button");wrapper.setAttribute("tabindex","0");
 wrapper.setAttribute("aria-label",site.id==="borobudur"?"Click the Borobudur model to show or hide the indicative exploration zone":"Explore the "+site.name+" 3D model");
 wrapper.title=site.id==="borobudur"?"Click to show or hide the indicative exploration zone":"Click to open "+site.name;
 if(!wrapper.dataset.interactionBound){
  const activate=event=>{event.preventDefault();event.stopPropagation();if(site.id==="borobudur")toggleExplorationZone(site,true);else openSite(site.id,true)};
  wrapper.addEventListener("click",activate);
  wrapper.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();activate(event)}});
  wrapper.dataset.interactionBound="true";
 }
 const scene=new THREE.Scene();scene.background=null;
 scene.add(new THREE.HemisphereLight(0xfff4dc,0x334b51,2.0));
 const keyLight=new THREE.DirectionalLight(0xffffff,2.4);keyLight.position.set(5,8,6);scene.add(keyLight);
 const fillLight=new THREE.DirectionalLight(0x9bd9ce,.9);fillLight.position.set(-5,4,-5);scene.add(fillLight);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
 renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 host.innerHTML="";host.appendChild(renderer.domElement);
 const canvasWidth=768,canvasHeight=768;renderer.setSize(canvasWidth,canvasHeight,false);
 const camera=new THREE.PerspectiveCamera(35,1,.01,1000);
 const targetHeight=Number(asset.targetSizeMeters&&asset.targetSizeMeters.height)||35;
 const modelState={site,asset,scene,renderer,camera,host,wrapper,loaded:false,basePixel:new THREE.Vector2(),targetHeight,aspect:1,pivot:null,basePivotY:0,terrainHeightMeters:null,canvasWidth,canvasHeight,renderedHeight:180};
 state.globeOverlays.set(site.id,modelState);
 if(site.id==="borobudur"||!state.globeOverlay)state.globeOverlay=modelState;
 const loader=new THREE.GLTFLoader();
 loader.load(asset.path,gltf=>{
  try{
   const model=gltf.scene,bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<=0||!Number.isFinite(size.x)||!Number.isFinite(size.z))throw new Error("GLB has invalid or empty bounding dimensions");
   const normalizedHeight=4.2,modelScale=normalizedHeight/size.y;
   model.scale.setScalar(modelScale);
   model.position.set(-center.x*modelScale,-bounds.min.y*modelScale,-center.z*modelScale);
   const pivot=new THREE.Group();pivot.add(model);pivot.position.y=modelState.basePivotY;scene.add(pivot);modelState.pivot=pivot;
   const fitBounds=new THREE.Box3().setFromObject(pivot),fitSphere=new THREE.Sphere();fitBounds.getBoundingSphere(fitSphere);
   const lookAt=new THREE.Vector3(0,normalizedHeight*.48,0),vfov=THREE.MathUtils.degToRad(camera.fov);
   const hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
   const fitDistance=Math.max(3,fitSphere.radius*1.34/Math.sin(Math.min(vfov,hfov)/2));
   camera.position.copy(lookAt).addScaledVector(new THREE.Vector3(.68,.46,1).normalize(),fitDistance);
   camera.lookAt(lookAt);camera.updateProjectionMatrix();renderer.render(scene,camera);
   const baseWorld=pivot.localToWorld(new THREE.Vector3(0,0,0)),baseProjected=baseWorld.clone().project(camera);
   modelState.basePixel.set((baseProjected.x+1)*canvasWidth*.5,(1-baseProjected.y)*canvasHeight*.5);
   const topWorld=pivot.localToWorld(new THREE.Vector3(0,normalizedHeight,0)),topProjected=topWorld.clone().project(camera);
   modelState.renderedHeight=Math.max(1,Math.abs(modelState.basePixel.y-(1-topProjected.y)*canvasHeight*.5));
   modelState.loaded=true;wrapper.hidden=false;clearModelLoadDiagnostic(site);setSelectedMarker(state.selected);
   console.info("[Heritage Atlas] GLB loaded for geospatial overlay",site.name,{asset:asset.path,sourceBounds:{width:size.x,depth:size.z,height:size.y},targetHeightMeters:targetHeight});
   updateGlobeModelOverlay(modelState);
  }catch(error){console.error("[Heritage Atlas] Could not prepare GLB overlay",site.name,asset.path,error);hideGlobeOverlay(modelState)}
 },progress=>{
  if(progress&&progress.total)console.debug("[Heritage Atlas] GLB loading",site.name,Math.round(progress.loaded/progress.total*100)+"%");
 },error=>{
  modelState.loadError=String(error&&error.message||error||"Unknown GLB loader error");
  console.error("[Heritage Atlas] GLB overlay failed to load",site.name,asset.path,error);
  showModelLoadDiagnostic(site,modelState.loadError);
  hideGlobeOverlay(modelState)
 });
 const onPostRender=()=>{try{updateGlobeModelOverlay(modelState)}catch(error){console.error("[Heritage Atlas] 3D overlay update failed",site.name,error);hideGlobeOverlay(modelState)}};
 state.viewer.scene.postRender.addEventListener(onPostRender);
 state.globeOverlayCleanups.push(()=>{try{state.viewer&&state.viewer.scene.postRender.removeEventListener(onPostRender)}catch(_){};try{renderer.dispose()}catch(_){}});
}
function refreshZoneButton(siteId){
 const button=$("#zoneToggleBtn");if(!button)return;
 const current=state.explorationZones.get(siteId);
 button.textContent=current&&current.visible?"Hide exploration zone on map":"Show exploration zone on map ↗";
}
function updateZoneMapCard(site,record){
 const card=$("#zoneMapCard");if(!card)return;
 const visible=!!(record&&record.visible);
 card.hidden=!visible;
 state.activeZoneId=visible&&site?site.id:null;
 if(!visible)return;
 $("#zoneMapTitle").textContent=(site&&site.name)||"Indicative exploration zone";
 $("#zoneMapRadius").textContent=Number(record.radiusMeters).toLocaleString()+" m radius around "+((site&&site.name)||"this site");
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
  const center=Cesium.Cartesian3.fromDegrees(lon,lat,0);
  const zone=state.viewer.entities.add({
   id:"indicative-exploration-zone-"+target.id,show:true,position:center,
   ellipse:{semiMajorAxis:radius,semiMinorAxis:radius,height:0,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,material:Cesium.Color.fromCssColorString("#58d9b5").withAlpha(0.19),outline:true,outlineColor:Cesium.Color.fromCssColorString("#f2c66d").withAlpha(0.95),outlineWidth:3}
  });
  const inner=state.viewer.entities.add({
   id:"indicative-exploration-zone-inner-"+target.id,show:true,position:center,
   ellipse:{semiMajorAxis:radius*0.68,semiMinorAxis:radius*0.68,height:0,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,material:Cesium.Color.fromCssColorString("#58d9b5").withAlpha(0.05),outline:true,outlineColor:Cesium.Color.fromCssColorString("#62dcb8").withAlpha(0.9),outlineWidth:2}
  });
  record={entities:[zone,inner],visible:true,radiusMeters:radius};
  state.explorationZones.set(target.id,record);
 }
 refreshZoneButton(target.id);
 updateZoneMapCard(target,record);
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
function showModelLoadDiagnostic(site,message){
 const stage=$(".map-stage");if(!stage)return;
 let badge=$("#modelLoadDiagnostic");
 if(!badge){badge=document.createElement("div");badge.id="modelLoadDiagnostic";badge.className="model-load-diagnostic";badge.setAttribute("role","status");stage.appendChild(badge)}
 badge.textContent="3D model failed · "+site.name+" · check Console for GLB load details";
 badge.title=String(message||"GLB loader failed").slice(0,400);
 badge.hidden=false;
 console.error("[Heritage Atlas] Model diagnostic",site.id,site.globeModel&&site.globeModel.path,message);
}
function clearModelLoadDiagnostic(site){
 const badge=$("#modelLoadDiagnostic");
 if(badge&&badge.textContent.includes(site.name))badge.hidden=true;
}
function updateGlobeModelOverlay(modelOverride){
 const model=modelOverride||state.globeOverlay,v=state.viewer;
 if(!model||!model.loaded||!v)return;
 const {site,asset,wrapper,renderer,camera}=model;
 const lon=Number(site.coordinates[0]),lat=Number(site.coordinates[1]);
 const cartographic=Cesium.Cartographic.fromDegrees(lon,lat);
 const sampledTerrainHeight=v.scene.globe.getHeight(cartographic);
 if(Number.isFinite(sampledTerrainHeight))model.terrainHeightMeters=sampledTerrainHeight;
 const terrainHeight=Number.isFinite(model.terrainHeightMeters)?model.terrainHeightMeters:0;
 const anchorHeight=terrainHeight+Number(site.catalogRecord&&site.catalogRecord.map&&site.catalogRecord.map.modelAnchorHeightMeters||0)+Number(asset.offsetMeters&&asset.offsetMeters.up||0)+LOCAL_MODEL_GROUND_CLEARANCE_METERS;
 const surface=Cesium.Cartesian3.fromDegrees(lon,lat,anchorHeight);
 const cameraDistance=Cesium.Cartesian3.distance(v.camera.positionWC,surface);
 if(!Number.isFinite(cameraDistance)||cameraDistance>180000){wrapper.hidden=true;return}
 // Subtle 3D motion: slow yaw + small vertical bob, rendered only while nearby.
 const time=(window.performance&&performance.now?performance.now():Date.now())*0.001;
 if(model.pivot){
  model.pivot.rotation.y=time*0.24;
  model.pivot.position.y=model.basePivotY;
  renderer.render(model.scene,camera);
 }
 const groundPixel=projectWorldToWindow(v.scene,surface);
 // Recompute the animated local base anchor so the model's floating motion does not drift off its map point.
 if(model.pivot){
  const baseWorld=model.pivot.localToWorld(new THREE.Vector3(0,0,0));
  const baseProjected=baseWorld.clone().project(camera);
  model.basePixel.set((baseProjected.x+1)*0.5*model.canvasWidth,(1-baseProjected.y)*0.5*model.canvasHeight);
 }
 const heightMeters=Number(asset.targetSizeMeters&&asset.targetSizeMeters.height)||model.targetHeight||35;
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
function createProceduralKomodoModel(){
 const root=new THREE.Group();
 const hideScale=new THREE.MeshStandardMaterial({color:0x877957,roughness:.92});
 const upper=new THREE.MeshStandardMaterial({color:0x746548,roughness:.9});
 const belly=new THREE.MeshStandardMaterial({color:0xb9a17a,roughness:.94});
 const eyeMat=new THREE.MeshStandardMaterial({color:0x171b16,roughness:.5});
 const goldEye=new THREE.MeshStandardMaterial({color:0xc8aa53,roughness:.55});
 const addEllipsoid=(parent,mat,position,scale,rotation)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),mat);mesh.position.set(position[0],position[1],position[2]);mesh.scale.set(scale[0],scale[1],scale[2]);if(rotation)mesh.rotation.set(rotation[0]||0,rotation[1]||0,rotation[2]||0);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh};
 // A simple low-poly fallback ensures Komodo is never represented by an empty patch of map
 // if the remote GLB host is unavailable. It is an educational illustration, not a scan.
 addEllipsoid(root,upper,[0,.56,0],[.7,.34,1.22]);
 addEllipsoid(root,belly,[0,.36,-.02],[.55,.16,.98]);
 addEllipsoid(root,upper,[0,.55,.98],[.32,.23,.52]);
 addEllipsoid(root,upper,[0,.61,1.36],[.33,.22,.39]);
 addEllipsoid(root,hideScale,[0,.52,1.64],[.23,.12,.42]);
 // Four sprawled, short limbs and broad feet.
 for(const side of [-1,1]){
  for(const z of [-.78,.75]){
   addEllipsoid(root,upper,[side*.51,.38,z],[.19,.22,.35],[0,side*.25,side*.42]);
   addEllipsoid(root,upper,[side*.69,.19,z+side*.08],[.22,.105,.25],[0,side*.15,0]);
   for(let toe=0;toe<3;toe++)addEllipsoid(root,hideScale,[side*(.78+toe*.035),.135,z+.18+toe*.08],[.055,.04,.12]);
  }
  addEllipsoid(root,eyeMat,[side*.255,.76,1.48],[.055,.055,.06]);
  addEllipsoid(root,goldEye,[side*.271,.774,1.495],[.027,.027,.028]);
  addEllipsoid(root,eyeMat,[side*.145,.55,1.91],[.026,.018,.035]);
 }
 // Long tapered, segmented tail.
 for(let i=0;i<8;i++){
  const t=i/8, radius=.235*(1-t)+.018;
  addEllipsoid(root,i%2?upper:hideScale,[Math.sin(i*.42)*.09,.48-t*.12,-1.05-i*.31],[radius*.82,radius*.55,.34*(1-t)+.055],[0,Math.sin(i*.42)*.035,0]);
 }
 // Small dorsal scutes make the silhouette read as a monitor lizard.
 for(let i=0;i<10;i++){
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.075,.16,5),hideScale);
  cone.position.set(0,.88,-.78+i*.19);cone.castShadow=true;root.add(cone);
 }
 return root;
}
function initKomodoMapOverlay(){
 const site=HERITAGE_SITES.find(s=>s.id==="komodo");
 const asset=site&&Array.isArray(site.models)?site.models.find(m=>m.id==="komodo-dragon"||m.id==="komodo_dragon"):null;
 const wrapper=$("#komodoModelOverlay"),host=$("#komodoModelCanvasHost");
 if(!site||!asset||!(asset.file||asset.localPath||asset.previewUrl)||!wrapper||!host||!window.THREE||!THREE.GLTFLoader)return;
 wrapper.hidden=true;
 wrapper.setAttribute("role","button");wrapper.setAttribute("tabindex","0");
 wrapper.setAttribute("aria-label","Explore the Komodo dragon at Komodo National Park");
 wrapper.title="Komodo dragon 3D preview · click to open the site journal";
 if(!wrapper.dataset.interactionBound){
  const activate=event=>{event.preventDefault();event.stopPropagation();openSite("komodo",true)};
  wrapper.addEventListener("click",activate);
  wrapper.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){activate(event)}});
  wrapper.dataset.interactionBound="true";
 }
 const scene=new THREE.Scene();scene.background=null;
 scene.add(new THREE.HemisphereLight(0xfff1d5,0x3b4537,2.15));
 const keyLight=new THREE.DirectionalLight(0xffffff,2.3);keyLight.position.set(4,7,5);scene.add(keyLight);
 const fill=new THREE.DirectionalLight(0xa7d6a6,.95);fill.position.set(-4,3,-5);scene.add(fill);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
 renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 host.innerHTML="";host.appendChild(renderer.domElement);
 const canvasWidth=1024,canvasHeight=512;
 renderer.setSize(canvasWidth,canvasHeight,false);
 const camera=new THREE.PerspectiveCamera(36,canvasWidth/canvasHeight,.01,1000);
 const modelState={site,asset,scene,renderer,camera,host,wrapper,loaded:false,pivot:null,basePixel:new THREE.Vector2(),canvasWidth,canvasHeight,renderedHeight:180,basePivotY:0,terrainHeightMeters:null,visualHeightMeters:18,aspect:canvasWidth/canvasHeight};
 state.komodoOverlay=modelState;
 const prepareModel=(rawModel,source)=>{
  try{
   const bounds=new THREE.Box3().setFromObject(rawModel);const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());
   const maxDim=Math.max(size.x,size.y,size.z);
   if(!Number.isFinite(maxDim)||maxDim<=0)throw new Error("Komodo GLB has empty/invalid bounds");
   const normalizingScale=4.6/maxDim;
   rawModel.scale.setScalar(normalizingScale);
   rawModel.position.set(-center.x*normalizingScale,-bounds.min.y*normalizingScale,-center.z*normalizingScale);
   const pivot=new THREE.Group();pivot.add(rawModel);pivot.position.y=modelState.basePivotY;scene.add(pivot);modelState.pivot=pivot;
   const fitBounds=new THREE.Box3().setFromObject(pivot),sphere=new THREE.Sphere();fitBounds.getBoundingSphere(sphere);
   const target=new THREE.Vector3(0,Math.max(.35,size.y*normalizingScale*.45),0);
   camera.aspect=canvasWidth/canvasHeight;camera.fov=36;camera.updateProjectionMatrix();
   const vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
   const distance=Math.max(4,sphere.radius*1.22/Math.sin(Math.min(vfov,hfov)/2));
   camera.position.copy(target).addScaledVector(new THREE.Vector3(.6,.38,1).normalize(),distance);
   camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);
   const baseWorld=pivot.localToWorld(new THREE.Vector3(0,0,0)),baseProjected=baseWorld.clone().project(camera);
   modelState.basePixel.set((baseProjected.x+1)*canvasWidth*.5,(1-baseProjected.y)*canvasHeight*.5);
   modelState.renderedHeight=Math.max(40,Math.abs((new THREE.Vector3(0,4.6,0).project(camera).y-baseProjected.y)*canvasHeight*.5));
   modelState.loaded=true;modelState.source=source;wrapper.hidden=false;
   console.info("[Heritage Atlas] Komodo dragon model ready",{source,asset:modelPath,sourceBounds:{x:size.x,y:size.y,z:size.z}});
   updateKomodoMapOverlay();
  }catch(error){console.error("[Heritage Atlas] Could not prepare Komodo model",error);wrapper.hidden=true}
 };
 const loader=new THREE.GLTFLoader();
 const modelPath=asset.file||asset.localPath||asset.previewUrl;
 loader.load(modelPath,gltf=>prepareModel(gltf.scene,modelPath.startsWith("assets/")?"local uploaded GLB":"remote GLB preview"),undefined,error=>{
  console.warn("[Heritage Atlas] Komodo GLB unavailable; using procedural fallback",modelPath,error);
  prepareModel(createProceduralKomodoModel(),"procedural fallback (GLB unavailable)");
 });
 const onPostRender=()=>{try{updateKomodoMapOverlay()}catch(error){console.warn("[Heritage Atlas] Komodo overlay update skipped",error);wrapper.hidden=true}};
 state.viewer.scene.postRender.addEventListener(onPostRender);
 state.komodoOverlayCleanup=()=>{try{state.viewer&&state.viewer.scene.postRender.removeEventListener(onPostRender)}catch(_){};renderer.dispose();state.komodoOverlay=null};
}
function updateKomodoMapOverlay(){
 const model=state.komodoOverlay,v=state.viewer;
 if(!model||!model.loaded||!v)return;
 const {site,wrapper,renderer,camera,pivot}=model;
 const lon=Number(site.coordinates[0]),lat=Number(site.coordinates[1]);
 const cartographic=Cesium.Cartographic.fromDegrees(lon,lat);
 const sampledTerrainHeight=v.scene.globe.getHeight(cartographic);
 if(Number.isFinite(sampledTerrainHeight))model.terrainHeightMeters=sampledTerrainHeight;
 const terrainHeight=Number.isFinite(model.terrainHeightMeters)?model.terrainHeightMeters:0;
 const anchorHeight=terrainHeight+LOCAL_MODEL_GROUND_CLEARANCE_METERS;
 const surface=Cesium.Cartesian3.fromDegrees(lon,lat,anchorHeight);
 const cameraDistance=Cesium.Cartesian3.distance(v.camera.positionWC,surface);
 if(!Number.isFinite(cameraDistance)||cameraDistance>220000){wrapper.hidden=true;return}
 const time=(window.performance&&performance.now?performance.now():Date.now())*.001;
 if(pivot){pivot.rotation.y=(time*.65)%(Math.PI*2);pivot.position.y=model.basePivotY;renderer.render(model.scene,camera)}
 const groundPixel=projectWorldToWindow(v.scene,surface);
 const topPixel=projectWorldToWindow(v.scene,Cesium.Cartesian3.fromDegrees(lon,lat,anchorHeight+model.visualHeightMeters));
 if(!groundPixel||!topPixel||![groundPixel.x,groundPixel.y,topPixel.x,topPixel.y].every(Number.isFinite)){wrapper.hidden=true;return}
 const width=v.container.clientWidth,height=v.container.clientHeight;
 if(groundPixel.x<-120||groundPixel.x>width+120||groundPixel.y<-170||groundPixel.y>height+170){wrapper.hidden=true;return}
 const projectedHeight=Math.hypot(topPixel.x-groundPixel.x,topPixel.y-groundPixel.y);
 if(!Number.isFinite(projectedHeight)||projectedHeight<.4){wrapper.hidden=true;return}
 const displayHeight=Math.max(32,Math.min(projectedHeight,94));
 const cssScale=displayHeight/model.renderedHeight;
 const displayWidth=model.canvasWidth*cssScale;
 const left=groundPixel.x-model.basePixel.x*cssScale;
 const top=groundPixel.y-model.basePixel.y*cssScale;
 wrapper.style.left=Math.round(left)+"px";wrapper.style.top=Math.round(top)+"px";
 wrapper.style.width=Math.max(42,Math.round(displayWidth))+"px";wrapper.style.height=Math.round(model.canvasHeight*cssScale)+"px";
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
   const mapOverlay=state.globeOverlays&&state.globeOverlays.get(nextId);const coveredByModel=!!((mapOverlay&&mapOverlay.loaded)||(state.globeOverlay&&state.globeOverlay.loaded&&state.globeOverlay.site.id===nextId)||(state.komodoOverlay&&state.komodoOverlay.loaded&&state.komodoOverlay.site.id===nextId));
   next.label.show=!coveredByModel;
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
function setBuildingsUi(message,tone){
 const panel=$("#buildingsStatus");
 if(!panel)return;
 panel.textContent=message||"";
 panel.className="buildings-status"+(tone?" "+tone:"");
 panel.hidden=!message;
}
async function initOsmBuildings(viewer){
 if(!viewer||!window.Cesium||typeof Cesium.createOsmBuildingsAsync!=="function"){state.buildingsStatus="unsupported";return}
 const token=String(window.CESIUM_ION_ACCESS_TOKEN||"").trim();
 const status=$("#mapStatus");
 if(!token){
  state.buildingsStatus="token-required";
  if(status)status.textContent="3D BUILDINGS NEED ION TOKEN";
  setBuildingsUi("3D BUILDINGS DISABLED · Add a restricted Cesium ion token in js/cesium-config.js.","warn");
  console.warn("Cesium OSM Buildings needs an app-specific Cesium ion access token. Add a restricted public token to js/cesium-config.js; keep only assets:read scope and restrict it to this app and allow both OSM Buildings (asset 96188) and Cesium World Terrain (asset 1).");
  return;
 }
 if(!Cesium.Ion){state.buildingsStatus="unsupported";if(status)status.textContent="3D BUILDINGS · CESIUM ION UNAVAILABLE";setBuildingsUi("Cesium ion is unavailable. Check the CesiumJS script and network.","error");return}
 Cesium.Ion.defaultAccessToken=token;
 state.buildingsStatus="loading";
 setBuildingsUi("3D BUILDINGS · Connecting to Cesium ion…","");
 try{
  const tileset=await Cesium.createOsmBuildingsAsync({enableShowOutline:false});
  if(state.viewer!==viewer){tileset.destroy();return}
  state.buildingsTileset=tileset;
  tileset.tileFailed.addEventListener(error=>{
   state.buildingsStatus="tile-error";
   const detail=String(error&&error.message||"");
   const authFailure=/401|403|unauthori[sz]ed|invalid token|access token|forbidden/i.test(detail);
   const currentStatus=$("#mapStatus");
   if(currentStatus)currentStatus.textContent=authFailure?"3D BUILDINGS AUTH ERROR · CHECK TOKEN":"3D BUILDINGS TILE ERROR";
   setBuildingsUi(authFailure?"3D BUILDINGS AUTH ERROR · Check token scope, allowed URL, and access to OSM Buildings (asset 96188) and World Terrain (asset 1).":"A 3D building tile failed to load. Check ion quota, network, and browser Console.","error");
   console.warn("Cesium OSM Buildings tile failed. Check ion token scope, URL restriction, asset access, quota and network.",{message:detail,url:error&&error.url});
  });
  tileset.tileLoad.addEventListener(()=>{
   if(state.buildingsStatus==="ready"||state.buildingsStatus==="loading"){
    state.buildingsStatus="ready";
    const currentStatus=$("#mapStatus");
    if(currentStatus&&["3D BUILDINGS CONNECTED · WAITING FOR TILES","3D BUILDINGS LOADING"].includes(currentStatus.textContent))currentStatus.textContent="3D BUILDINGS LOADED · OSM";
    if(state.terrainStatus==="ready")setBuildingsUi("WORLD TERRAIN + OSM BUILDINGS ACTIVE · Local GLB clearance: 1.2 m.","ok");else setBuildingsUi("OSM BUILDINGS LOADED · Waiting for Cesium World Terrain…","warn");
   }
  });
  viewer.scene.primitives.add(tileset);
  state.buildingsStatus="ready";
  if(status)status.textContent="3D BUILDINGS CONNECTED · WAITING FOR TILES";
  setBuildingsUi("3D BUILDINGS · Loading regional tiles…","");
  console.info("Cesium OSM Buildings tileset attached. Building visibility depends on tile loading and local data coverage.");
 }catch(error){
  state.buildingsStatus="unavailable";
  console.warn("Cesium OSM Buildings could not initialize. Check the ion access token, OSM Buildings asset access, streaming quota and network.",error);
  const currentStatus=$("#mapStatus");
  if(currentStatus)currentStatus.textContent="3D BUILDINGS UNAVAILABLE · CHECK ION";
  setBuildingsUi("3D BUILDINGS UNAVAILABLE · Check token, asset access, quota, and network.","error");
 }
}
function initMap(){if(!window.Cesium){fallback();return}try{const appIonToken=String(window.CESIUM_ION_ACCESS_TOKEN||"").trim();if(appIonToken&&Cesium.Ion)Cesium.Ion.defaultAccessToken=appIonToken;const worldTerrain=Cesium.Terrain.fromWorldTerrain({requestVertexNormals:true});const v=new Cesium.Viewer("cesiumContainer",{terrain:worldTerrain,animation:false,baseLayer:false,baseLayerPicker:false,geocoder:false,homeButton:false,infoBox:false,sceneModePicker:false,selectionIndicator:false,timeline:false,navigationHelpButton:false,fullscreenButton:false,shouldAnimate:false});state.viewer=v;state.terrainStatus="loading";worldTerrain.readyEvent.addEventListener(()=>{state.terrainStatus="ready";console.info("[Heritage Atlas] Cesium World Terrain ready; OSM imagery and local models can align to sampled ground heights.");if(state.buildingsStatus==="ready")setBuildingsUi("WORLD TERRAIN + OSM BUILDINGS ACTIVE · Local GLB clearance: 1.2 m.","ok");else if(state.buildingsStatus==="loading")setBuildingsUi("CESIUM WORLD TERRAIN READY · OSM Buildings still loading…","")});worldTerrain.errorEvent.addEventListener(error=>{state.terrainStatus="unavailable";console.warn("[Heritage Atlas] Cesium World Terrain failed. Falling back to an ellipsoid to preserve the globe and OSM imagery.",error);try{v.scene.setTerrain(new Cesium.Terrain(Promise.resolve(new Cesium.EllipsoidTerrainProvider())));state.terrainStatus="ellipsoid-fallback"}catch(fallbackError){console.warn("[Heritage Atlas] Ellipsoid terrain fallback failed.",fallbackError)}setBuildingsUi("WORLD TERRAIN UNAVAILABLE · Globe restored with a smooth ellipsoid. Check the Cesium ion token and World Terrain asset access.","error")});v.imageryLayers.removeAll();v.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({url:"https://tile.openstreetmap.org/"}));v.scene.globe.enableLighting=false;v.scene.globe.baseColor=Cesium.Color.fromCssColorString("#78979a");v.scene.backgroundColor=Cesium.Color.fromCssColorString("#071a24");v.scene.globe.show=true;v.scene.globe.depthTestAgainstTerrain=true;v.scene.fog.enabled=false;v.scene.screenSpaceCameraController.enableRotate=true;v.scene.screenSpaceCameraController.enableZoom=true;v.scene.screenSpaceCameraController.enableTilt=true;v.camera.setView({destination:Cesium.Cartesian3.fromDegrees(112,4,22500000),orientation:{heading:0,pitch:Cesium.Math.toRadians(-88),roll:0}});markers();initGlobeModelOverlay();initKomodoMapOverlay();$("#mapStatus").textContent="OPEN MAP · OPENSTREETMAP";initOsmBuildings(v);v.screenSpaceEventHandler.setInputAction(e=>{const p=v.scene.pick(e.position);if(Cesium.defined(p)&&p.id&&p.id.siteId)openSite(p.id.siteId,true)},Cesium.ScreenSpaceEventType.LEFT_CLICK);v.screenSpaceEventHandler.setInputAction(e=>updateMapHover(e.endPosition),Cesium.ScreenSpaceEventType.MOUSE_MOVE);$("#cesiumContainer").addEventListener("mouseleave",()=>{$("#mapHoverTooltip").hidden=true;const old=state.entities.get(state.hovered);if(old&&old.label)old.label.show=state.hovered===state.selected;state.hovered=null;setSelectedMarker(state.selected)});v.scene.globe.tileLoadProgressEvent.addEventListener(n=>{if(n===0&&$("#mapStatus").textContent==="OPEN MAP · OPENSTREETMAP")$("#mapStatus").textContent="3D GLOBE ONLINE · OSM"})}catch(e){console.error("Cesium / OpenStreetMap initialization failed",e);fallback()}}
function fallback(){$("#mapStatus").textContent="MAP OFFLINE";$("#mapFallback").hidden=false}
function renderLocalModelPicker(site){
 const zoneButton=$("#zoneToggleBtn");
 if(zoneButton){zoneButton.hidden=site.id!=="borobudur";refreshZoneButton(site.id)}
 const models=Array.isArray(site.models)?site.models:[];
 const select=$("#localModelSelect"),expected=$("#localModelExpected");
 select.innerHTML="";
 if(!models.length){select.disabled=true;$("#loadLocalModelBtn").disabled=true;$("#loadLocalModelBtn").textContent="No model";expected.textContent="Belum ada model lokal untuk situs ini. Lihat ASSET_CATALOG.md untuk rencana aset berikutnya.";$("#localModelStage").hidden=true;$("#localModelCredit").hidden=true;return}
 select.disabled=false;$("#loadLocalModelBtn").disabled=false;$("#loadLocalModelBtn").textContent="Open 3D ↗";
 models.forEach((m,i)=>{const o=document.createElement("option");o.value=m.path;o.textContent=m.previewUrl&&m.status!=="available"?m.label+" · live preview":m.label;select.appendChild(o)});
 const active=models[0];
 const uploadHint=m=>m.previewUrl&&m.status!=="available"?"Live preview: "+m.previewUrl+" · optional local copy: "+(m.localPath||m.file||m.path):"Repository path: "+(m.localPath||m.file||m.path);
 expected.textContent=uploadHint(active);
 $("#localModelCredit").hidden=!active.credit;
 $("#localModelCredit").textContent=active.credit||"";
 select.onchange=()=>{const m=models.find(x=>x.path===select.value)||models[0];expected.textContent=uploadHint(m);$("#localModelCredit").hidden=!m.credit;$("#localModelCredit").textContent=m.credit||"";$("#localModelStage").hidden=true};
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
function safeHttpUrl(value){try{const url=new URL(String(value||""));return url.protocol==="http:"||url.protocol==="https:"?url.href:""}catch(_){return""}}
function formatIntelDate(value){
 if(!value)return"Date not confirmed";
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"Date not confirmed":new Intl.DateTimeFormat("en",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}).format(date);
}
function siteIntelOverview(site){
 const official=safeHttpUrl(site.official||site.sourceRecord&&site.sourceRecord.officialUrl||site.sourceUrl||"https://data.unesco.org/");
 const source=safeHttpUrl(site.sourceUrl||site.official||"https://data.unesco.org/");
 const coordinateText=hasCoordinates(site)?Number(site.coordinates[1]).toFixed(4)+"°, "+Number(site.coordinates[0]).toFixed(4)+"°":"No reliable point coordinates supplied";
 return '<div class="intel-overview-grid"><div class="intel-overview-stat"><span>DESIGNATION</span><b>'+esc(site.designation||site.programmeLabel||"UNESCO programme")+'</b></div><div class="intel-overview-stat"><span>COUNTRY / AREA</span><b>'+esc(site.country||site.location||"Not specified")+'</b></div><div class="intel-overview-stat"><span>INSCRIPTION / YEAR</span><b>'+esc(site.year||"Not provided")+'</b></div><div class="intel-overview-stat"><span>MAP COORDINATE</span><b>'+esc(coordinateText)+'</b></div></div><p class="intel-caveat">This dossier combines source metadata and external discovery results. Confirm site-specific claims against the linked original source; a map anchor is not necessarily a legal site boundary.</p><div class="intel-source-links">'+(official?'<a target="_blank" rel="noopener noreferrer" href="'+esc(official)+'">Open official site record ↗</a>':"")+(source&&source!==official?'<a target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">Open source dataset ↗</a>':"")+'</div>';
}
function renderIntelMessage(title,body,kind){
 return '<div class="intel-state '+esc(kind||"")+'"><strong>'+esc(title)+'</strong><p>'+esc(body)+'</p></div>';
}
function renderIntelResults(scope,payload){
 if(!payload)return renderIntelMessage("No response received","Try the tab again in a moment.","error");
 if(payload.status==="not_configured")return renderIntelMessage("Provider not configured",payload.message||"This source has not been configured on the Cloudflare Worker.","warn");
 if(["unavailable","timeout","upstream_error"].includes(payload.status))return renderIntelMessage("Source temporarily unavailable",payload.message||"The provider did not return data. Try again later.","warn");
 const items=Array.isArray(payload.items)?payload.items:[];
 if(!items.length)return renderIntelMessage("No matching records returned",scope==="news"?"The search returned no usable source links. This does not prove that no news exists.":"No matching scholarly records were returned. Try the original title or browse the linked OpenAlex search.","empty");
 if(scope==="news"){
  return '<div class="intel-results-heading"><span>'+items.length+' source leads</span><span>Not independently verified</span></div><div class="intel-result-list">'+items.map(item=>{
   const href=safeHttpUrl(item.url);if(!href)return"";
   const date=item.publishedAt?formatIntelDate(item.publishedAt):"Date unconfirmed";
   return '<article class="intel-result-card"><div class="intel-result-meta"><span>'+esc(item.source||"Web source")+'</span><time>'+esc(date)+'</time></div><h4><a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(item.title||"Untitled source")+'</a></h4>'+(item.snippet?'<p>'+esc(item.snippet)+'</p>':"")+'<div class="intel-result-footer"><span class="intel-confidence">'+(item.publishedAt?"Publication date parsed":"Date needs review")+'</span><a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Original source ↗</a></div></article>';
  }).join("")+'</div><p class="intel-small-note">Search results are leads, not verified incidents or official UNESCO statements. Check the publisher, event date, locality and original article.</p>';
 }
 return '<div class="intel-results-heading"><span>'+items.length+' scholarly records</span><span>OpenAlex</span></div><div class="intel-result-list">'+items.map(item=>{
  const mainUrl=safeHttpUrl(item.openAlexUrl||item.url);const oa=safeHttpUrl(item.openAccessUrl);
  const authors=Array.isArray(item.authors)?item.authors.join(", "):"";
  return '<article class="intel-result-card"><div class="intel-result-meta"><span>'+esc(item.source||item.type||"Scholarly work")+'</span><span>'+(item.year?esc(item.year):"Year not provided")+'</span></div><h4><a href="'+esc(mainUrl||"https://openalex.org/")+'" target="_blank" rel="noopener noreferrer">'+esc(item.title||"Untitled work")+'</a></h4>'+(authors?'<p class="intel-authors">'+esc(authors)+(item.authors&&item.authors.length===4?" et al.":"")+'</p>':"")+'<div class="intel-result-footer"><span>'+Number(item.citedByCount||0).toLocaleString()+" citations"+(item.isOpenAccess?" · Open access":"")+'</span><span class="intel-result-links">'+(oa&&oa!==mainUrl?'<a href="'+esc(oa)+'" target="_blank" rel="noopener noreferrer">Read open copy ↗</a>':"")+(safeHttpUrl(item.doi)?'<a href="'+esc(item.doi)+'" target="_blank" rel="noopener noreferrer">DOI ↗</a>':"")+'</span></div></article>';
 }).join("")+'</div><p class="intel-small-note">Search relevance is approximate; verify each title and abstract to confirm it concerns this specific site. OpenAlex indexes scholarly metadata, not necessarily full text.</p>';
}
function renderSiteIntelligence(site,tab){
 state.siteIntelTab=tab||"overview";
 const content=$("#siteIntelContent"),status=$("#siteIntelStatus");
 if(!content||!status)return;
 document.querySelectorAll("[data-intel-tab]").forEach(button=>{
  const active=button.dataset.intelTab===state.siteIntelTab;
  button.classList.toggle("active",active);button.setAttribute("aria-selected",active?"true":"false");button.tabIndex=active?0:-1;
 });
 if(state.siteIntelTab==="overview"){
  status.textContent="CURATED + OFFICIAL SOURCE";
  content.innerHTML=siteIntelOverview(site);
  return;
 }
 if(state.siteIntelTab==="environment"){
  status.textContent="PHASE 2 CONNECTORS";
  content.innerHTML='<div class="intel-roadmap"><div class="intel-roadmap-icon">🌿</div><h4>Environmental intelligence is next</h4><p>The dossier already knows this site’s curated coordinates. The next connector can retrieve nearby biodiversity observations from GBIF and event context from NASA EONET, with each result labelled by its search area and the provider’s data date.</p><p><strong>Important:</strong> the current map anchor is approximate for large or multi-component properties. Environmental matches should not be described as inside an official boundary until a validated site polygon is available.</p><span class="intel-roadmap-badge">CONNECTOR NOT YET ENABLED</span></div>';
  return;
 }
 const scope=state.siteIntelTab;
 const key=site.id+":"+scope;
 const cached=state.siteIntelCache.get(key);
 if(cached){status.textContent=(cached.status==="ok"?"UPDATED "+formatIntelDate(cached.fetchedAt).toUpperCase():"SOURCE STATUS");content.innerHTML=renderIntelResults(scope,cached);return}
 status.textContent=scope==="news"?"SEARCHING WEB SOURCES":"SEARCHING OPENALEX";
 content.innerHTML='<div class="intel-loading"><span class="intel-spinner"></span><div><strong>Searching '+(scope==="news"?"web sources":"scholarly metadata")+'…</strong><p>This runs only when this tab is opened. Results are cached in this session.</p></div></div>';
 if(state.siteIntelPending.has(key))return;
 const params=new URLSearchParams({scope,site:site.name||site.id,country:site.country||site.location||""});
 const pending=fetch(SITE_INTEL_API_URL+"?"+params.toString(),{method:"GET",headers:{Accept:"application/json"},signal:AbortSignal.timeout(16000)})
  .then(async response=>{
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload.error||("HTTP "+response.status));
   return payload;
  })
  .then(payload=>{
   state.siteIntelCache.set(key,payload);
   if(state.selected!==site.id||state.siteIntelTab!==scope)return;
   status.textContent=payload.status==="ok"?"SOURCE · "+(payload.provider||scope).toUpperCase():String(payload.status||"SOURCE STATUS").replace(/_/g," ").toUpperCase();
   content.innerHTML=renderIntelResults(scope,payload);
  })
  .catch(error=>{
   if(state.selected!==site.id||state.siteIntelTab!==scope)return;
   status.textContent="CONNECTOR UNAVAILABLE";
   content.innerHTML=renderIntelMessage("Site Intelligence endpoint cannot be reached","News and Research use the shared CivilAegis TinyFish proxy. First open its /health URL: if the health check also fails, verify the shared Worker deployment. If health works, check CORS / ALLOWED_ORIGINS. A missing TinyFish secret causes a provider-status message rather than a network failure. Technical message: "+String(error&&error.message||error).slice(0,160),"error")+'<div class="intel-worker-links"><a href="https://civilaegis-tinyfish-proxy.conniezz-cool.workers.dev/health" target="_blank" rel="noopener noreferrer">Check Worker health ↗</a><a href="https://github.com/AnggaConni/aegis/blob/main/tinyfish-worker.js" target="_blank" rel="noopener noreferrer">Inspect shared Worker code ↗</a><a href="https://github.com/AnggaConni/aegis/blob/main/TINYFISH-SETUP.md" target="_blank" rel="noopener noreferrer">Open shared Worker setup ↗</a></div>';
  })
  .finally(()=>state.siteIntelPending.delete(key));
 state.siteIntelPending.set(key,pending);
}
function openSite(id,zoom){
 const s=HERITAGE_SITES.find(x=>x.id===id);if(!s)return;
 const hasPoint=hasCoordinates(s);state.selected=id;setSelectedMarker(id);
 $("#drawerTitle").textContent=s.name;
 $("#drawerLocation").textContent=s.location||s.country||"Location not specified";
 $("#drawerRegion").textContent=s.region||s.country||s.programmeLabel||"UNESCO programme";
 $("#heroCoordinates").textContent=hasPoint?s.coordinates[1].toFixed(3)+" / "+s.coordinates[0].toFixed(3):"COORDINATES NOT AVAILABLE";
 $("#drawerHero").style.background=s.image?"linear-gradient(135deg,#123e47dd,#387966bb),url('"+s.image+"') center/cover":"linear-gradient(135deg,#123e47,#387966)";
 $("#drawerHero .drawer-category").textContent=(s.designation||s.programmeLabel||"UNESCO DESIGNATION").toUpperCase();
 $("#visitedPill").textContent=state.visited.has(id)?"DISCOVERY RECORDED":hasPoint?"NOT YET EXPLORED":"NOT YET MAPPED";
 $("#visitedPill").classList.toggle("done",state.visited.has(id));
 $("#drawerTags").innerHTML=(s.tags||[]).map(t=>"<span>"+esc(t)+"</span>").join("");
 $("#drawerDescription").textContent=s.description||"Consult the linked source record for authoritative details.";
 $("#drawerFacts").innerHTML='<div class="fact"><span>Designation</span><b>'+esc(s.designation||s.programmeLabel||"UNESCO programme")+'</b></div><div class="fact"><span>Year</span><b>'+esc(s.year||"Not provided")+'</b></div><div class="fact"><span>Why it matters</span><b>'+esc(s.why||"See official source record")+'</b></div><div class="fact"><span>Source detail</span><b>'+esc(s.fact||s.sourceDatasetId||"UNESCO DataHub")+'</b></div>';
 renderSiteIntelligence(s,"overview");
 renderLocalModelPicker(s);
 const official=s.official||s.sourceRecord&&s.sourceRecord.officialUrl||s.sourceUrl||"https://data.unesco.org/";
 $("#officialLink").href=official;
 $("#citationLine").textContent="Source: "+(s.sourceAttribution||"UNESCO World Heritage Centre")+" · "+(s.sourceUrl||official)+" · Check the original record for full context.";
 const challenge=s.challenge||{question:"Explore the official record for this place.",options:["Open the official source record"],answer:0,explanation:"The linked source provides the record for this place."};
 $("#quizQuestion").textContent=challenge.question;
 $("#quizFeedback").hidden=true;
 const done=state.answered.has(id);
 $("#quizOptions").innerHTML=challenge.options.map((o,i)=>'<button type="button" class="quiz-option" data-answer="'+i+'" '+(done?"disabled":"")+'>'+String.fromCharCode(65+i)+". "+esc(o)+'</button>').join("");
 if(done){$("#quizFeedback").hidden=false;$("#quizFeedback").textContent="Challenge already completed. Explore another site to keep earning discoveries."}
 $("#quizOptions").querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(s,Number(b.dataset.answer))));
 $("#visitBtn").textContent=state.visited.has(id)?"Discovery recorded ✓":"Start exploration →";
 $("#visitBtn").onclick=()=>visit(s);
 $("#siteDrawer").hidden=false;renderSites();
 if(zoom&&hasPoint)fly(s);
 else if(zoom&&!hasPoint)toast("This record has no mapped point yet; the source link is available in the journal.");
}
function answer(s,i){const ok=i===s.challenge.answer;$("#quizOptions").querySelectorAll("button").forEach((b,n)=>{b.disabled=true;if(n===s.challenge.answer)b.classList.add("correct");else if(n===i)b.classList.add("incorrect")});$("#quizFeedback").hidden=false;if(ok){if(!state.answered.has(s.id)){state.answered.add(s.id);state.xp+=100;save();progress()}$("#quizFeedback").textContent="Correct! +100 Field XP. "+s.challenge.explanation;toast("Knowledge unlocked · +100 Field XP")}else $("#quizFeedback").textContent="Not quite. "+s.challenge.explanation+" Try another challenge.";$("#visitedPill").textContent="CHALLENGE COMPLETED";$("#visitedPill").classList.add("done")}
function visit(s){if(!state.visited.has(s.id)){state.visited.add(s.id);state.xp+=50;save();progress();toast("Discovery recorded · +50 Field XP")}$("#visitedPill").textContent="DISCOVERY RECORDED";$("#visitedPill").classList.add("done");$("#visitBtn").textContent="Discovery recorded ✓"}
function close(id){$("#"+id).hidden=true}
function bind(){document.querySelectorAll("[data-intel-tab]").forEach(button=>button.addEventListener("click",()=>{const site=HERITAGE_SITES.find(item=>item.id===state.selected);if(site)renderSiteIntelligence(site,button.dataset.intelTab)}));$("#programmeFilter").addEventListener("change",()=>{state.filter=$("#programmeFilter").value;state.listLimit=60;renderSites()});$("#siteSearch").addEventListener("input",()=>{state.search=$("#siteSearch").value;state.listLimit=60;renderSites()});$("#loadMoreSites").addEventListener("click",()=>{state.listLimit+=60;renderSites()});document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>close(b.dataset.close)));["siteDrawer","helpModal"].forEach(id=>$("#"+id).addEventListener("click",e=>{if(e.target.id===id)close(id)}));$("#resetViewBtn").addEventListener("click",()=>{if(state.viewer)state.viewer.camera.flyHome(1.5);$("#coordReadout").textContent="SELECT A PIN TO BEGIN"});$("#retryMapBtn").addEventListener("click",()=>{if(state.viewer){state.viewer.destroy();state.viewer=null}$("#mapFallback").hidden=true;initMap()});$("#helpBtn").addEventListener("click",()=>$("#helpModal").hidden=false);$("#missionGoBtn").addEventListener("click",()=>{const s=HERITAGE_SITES.find(x=>!state.visited.has(x.id))||HERITAGE_SITES[0];openSite(s.id,true)});$("#locateBtn").addEventListener("click",()=>{if(!navigator.geolocation){toast("Location is not available in this browser.");return}navigator.geolocation.getCurrentPosition(p=>{if(state.viewer){state.viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(p.coords.longitude,p.coords.latitude,25000),duration:1.6});$("#coordReadout").textContent=p.coords.latitude.toFixed(3)+"°, "+p.coords.longitude.toFixed(3)+"°"}},()=>toast("Location permission was not granted."),{timeout:8000})});$("#loadLocalModelBtn").addEventListener("click",loadLocal3D);$("#zoneToggleBtn").addEventListener("click",()=>toggleExplorationZone(HERITAGE_SITES.find(s=>s.id===state.selected),true));$("#zoneMapCardClose").addEventListener("click",()=>{const active=HERITAGE_SITES.find(s=>s.id===state.activeZoneId)||state.globeOverlay&&state.globeOverlay.site;if(active)toggleExplorationZone(active,false)});$("#resetLocalModelBtn").addEventListener("click",()=>{if(state.local3d){const {camera,controls}=state.local3d;camera.position.set(4.8,3.5,5.5);controls.target.set(0,1.4,0);controls.update()}});window.addEventListener("resize",()=>{resizeLocal3D();if(state.globeOverlay&&state.globeOverlay.loaded){const m=state.globeOverlay;m.renderer.render(m.scene,m.camera);updateGlobeModelOverlay()}if(state.komodoOverlay&&state.komodoOverlay.loaded){const m=state.komodoOverlay;m.renderer.render(m.scene,m.camera);updateKomodoMapOverlay()}});$("#soundBtn").addEventListener("click",()=>toast("Ambient sound is not included in this prototype."));document.addEventListener("keydown",e=>{if(e.key==="Escape"){close("siteDrawer");close("helpModal")}})}
const PROGRAMMES=[
 {key:"world_heritage",label:"UNESCO World Heritage Site",short:"World Heritage",plural:"World Heritage Sites",icon:"🏛️",color:"#efbd6b",dataset:"whc001",range:14000},
 {key:"global_geopark",label:"UNESCO Global Geopark",short:"Global Geopark",plural:"UNESCO Global Geoparks",icon:"🌋",color:"#a6a5f2",dataset:"eg0001",range:65000},
 {key:"biosphere_reserve",label:"UNESCO Biosphere Reserve",short:"Biosphere Reserve",plural:"Biosphere Reserves",icon:"🌿",color:"#68d0a6",dataset:"mab001",range:65000},
 {key:"intangible_cultural_heritage",label:"Intangible Cultural Heritage element",short:"Intangible Heritage",plural:"Intangible Cultural Heritage",icon:"🎭",color:"#7ec4f5",dataset:"ich001",range:14000},
 {key:"creative_cities",label:"UNESCO Creative City",short:"Creative City",plural:"Creative Cities",icon:"🎨",color:"#f28a68",dataset:"cce001",range:20000}
];
function countryLabel(value){return Array.isArray(value)?value.filter(Boolean).join(", "):String(value||"");}
function normalizedCategory(record,programme){
 if(programme==="world_heritage"){
  const value=String(record.category||"").toLowerCase();
  return value.includes("natural")?"nature":value.includes("mixed")?"mixed":"culture";
 }
 return programme==="global_geopark"?"geopark":programme==="biosphere_reserve"?"biosphere":programme==="intangible_cultural_heritage"?"ich":"creative";
}
function makeRegistrySite(record){
 const programme=PROGRAMMES.find(p=>p.key===record.programme)||PROGRAMMES[0];
 const coords=record.coordinates&&Number.isFinite(Number(record.coordinates.longitude))&&Number.isFinite(Number(record.coordinates.latitude))&&Math.abs(Number(record.coordinates.latitude))<=90&&Math.abs(Number(record.coordinates.longitude))<=180?[Number(record.coordinates.longitude),Number(record.coordinates.latitude)]:null;
 const country=countryLabel(record.country);
 const category=normalizedCategory(record,programme.key);
 const options=PROGRAMMES.map(p=>p.label);
 const year=record.year?String(record.year):"Not provided";
 return {
  id:record.id,name:record.name||"Unnamed UNESCO record",country,location:country||"Location not specified",region:country||"UNESCO designation",
  programmeKey:programme.key,programmeLabel:programme.label,programmeShort:programme.short,designation:programme.label,category,icon:programme.icon,color:programme.color,
  coordinates:coords,year,official:record.officialUrl||record.source&&record.source.recordUrl||record.source&&record.source.datasetUrl||"https://data.unesco.org/",
  sourceAttribution:record.source&&record.source.attribution||"UNESCO DataHub",sourceUrl:record.source&&record.source.datasetUrl||"https://data.unesco.org/",
  sourceRecord:record,sourceDatasetId:record.source&&record.source.datasetId||programme.dataset,isCurated:false,
  tags:[programme.label,record.category].filter(Boolean),image:null,mapRange:programme.range,
  description:"This entry comes from the UNESCO DataHub registry. Use the linked source record for authoritative designation details; coordinate availability and record completeness vary by programme.",
  why:record.category?"Source category: "+record.category:"Programme record: "+programme.label,
  fact:record.year?"Year in source dataset: "+record.year:"The source record does not provide a year.",
  challenge:{question:"Which UNESCO programme is this record associated with?",options,answer:Math.max(0,PROGRAMMES.findIndex(p=>p.key===programme.key)),explanation:programme.label+" is a distinct UNESCO designation/list. It should not be conflated with the other programmes shown in this explorer."},
  catalogRecord:null,models:[]
 };
}
async function loadSiteCatalog(){
 const curatedFallback=[...HERITAGE_SITES];
 try{
  const response=await fetch("data/sites.json",{cache:"no-cache"});
  if(!response.ok)throw new Error("curated catalog HTTP "+response.status);
  const catalog=await response.json();state.catalog=catalog;
  const byId=new Map((catalog.sites||[]).map(site=>[site.id,site]));
  const curatedSites=curatedFallback.map(site=>{
   const item=byId.get(site.id);
   if(item){
    const lon=Number(item.location&&item.location.longitude),lat=Number(item.location&&item.location.latitude);
    if(Number.isFinite(lon)&&Number.isFinite(lat))site.coordinates=[lon,lat];
    site.catalogRecord=item;
    site.mapRange=item.map&&item.map.initialCameraRangeMeters;
    site.models=(item.models||[]).map(m=>({...m,path:m.status==="available"?(m.file||m.path):(m.previewUrl||m.file||m.path),localPath:m.file||m.path,label:m.label||m.id,credit:[m.creator||"Creator not recorded",m.license||"License to verify",m.sourceUrl||""].filter(Boolean).join(" · ")}));
    site.globeModel=site.models.find(m=>m.placement==="globe"&&(m.status==="available"||m.previewUrl))||null;
   }
   site.programmeKey="world_heritage";site.programmeLabel="UNESCO World Heritage Site";site.programmeShort="World Heritage";site.isCurated=true;
   const designation=(item&&item.designations||[]).find(d=>d.datasetId==="whc001");
   const match=String(designation&&designation.officialUrl||site.official||"").match(/\/list\/(\d+)/);
   site.registryKey=match?"whc001:"+match[1]:null;
   site.sourceAttribution="UNESCO DataHub";site.sourceUrl="https://data.unesco.org/explore/dataset/whc001/";
   return site;
  });
  const curatedByKey=new Map(curatedSites.filter(s=>s.registryKey).map(s=>[s.registryKey,s]));
  let registryMeta=null;
  try{
   const registryResponse=await fetch("data/generated/site_registry.json",{cache:"no-cache"});
   if(!registryResponse.ok)throw new Error("registry HTTP "+registryResponse.status);
   registryMeta=await registryResponse.json();
   const merged=[...curatedSites],present=new Set(curatedSites.map(s=>s.id));
   for(const record of registryMeta.records||[]){
    const curated=curatedByKey.get(record.id);
    if(curated){
     curated.registryRecord=record;
     if(!hasCoordinates(curated)&&record.coordinates)curated.coordinates=[Number(record.coordinates.longitude),Number(record.coordinates.latitude)];
     continue;
    }
    if(present.has(record.id))continue;
    merged.push(makeRegistrySite(record));present.add(record.id);
   }
   window.HERITAGE_SITES=merged;
   state.registryMeta={fetchedAt:registryMeta.fetchedAt,totalRecords:merged.length,sourceRecordCount:registryMeta.recordCount||registryMeta.records.length,mappedCount:merged.filter(hasCoordinates).length,programmeCounts:(registryMeta.records||[]).reduce((counts,r)=>(counts[r.programme]=(counts[r.programme]||0)+1,counts),{})};
   updateProgrammeFilterOptions();
   console.info("[Heritage Atlas] loaded",merged.length,"designation records;",state.registryMeta.mappedCount,"mapped;",merged.length-state.registryMeta.mappedCount,"awaiting coordinates");
  }catch(error){
   console.error("[Heritage Atlas] Could not load data/generated/site_registry.json; using the six curated starter records.",error);
   window.HERITAGE_SITES=curatedSites;
   state.registryMeta={totalRecords:curatedSites.length,mappedCount:curatedSites.filter(hasCoordinates).length,sourceRecordCount:curatedSites.length,programmeCounts:{}};
  }
 }catch(error){console.warn("[Heritage Atlas] Curated catalogue unavailable; using JS fallback records.",error);state.registryMeta={totalRecords:HERITAGE_SITES.length,mappedCount:HERITAGE_SITES.filter(hasCoordinates).length,sourceRecordCount:HERITAGE_SITES.length,programmeCounts:{}}}
}
function updateProgrammeFilterOptions(){
 const select=$("#programmeFilter");if(!select)return;
 const counts=state.registryMeta&&state.registryMeta.programmeCounts||{};
 select.querySelectorAll("option[data-programme]").forEach(option=>{
  const key=option.dataset.programme;option.textContent=option.dataset.label+" ("+Number(counts[key]||0).toLocaleString()+")";
 });
 const all=select.querySelector('option[value="all"]');
 if(all)all.textContent="All programmes ("+Number(state.registryMeta&&state.registryMeta.totalRecords||HERITAGE_SITES.length).toLocaleString()+")";
}
async function boot(){load();bind();await loadSiteCatalog();renderSites();progress();initMap()}
boot();
})();