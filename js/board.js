(() => {
  const TOTAL=500, host=document.getElementById("scene3d");
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x091b19);
  scene.fog=new THREE.FogExp2(0x091b19,0.0028);
  const camera=new THREE.PerspectiveCamera(48,1,0.1,1800);
  camera.position.set(0,145,155);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputEncoding=THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);
  const controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.06;controls.maxPolarAngle=Math.PI*.485;controls.minDistance=35;controls.maxDistance=360;controls.target.set(0,0,0);
  scene.add(new THREE.HemisphereLight(0xc7e5ff,0x41301d,1.25));
  const sun=new THREE.DirectionalLight(0xffe3ad,2.2);sun.position.set(80,160,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-190;sun.shadow.camera.right=190;sun.shadow.camera.top=190;sun.shadow.camera.bottom=-190;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x6bc6d1,.65);fill.position.set(-100,70,-100);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:0x17382d,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-2.6;ground.receiveShadow=true;scene.add(ground);
  // Subtle procedural ground flecks keep the scene alive before final environment art.
  const fleckGeo=new THREE.BufferGeometry(),flecks=[];
  for(let i=0;i<750;i++){const a=Math.random()*Math.PI*2,r=25+Math.random()*205;flecks.push(Math.cos(a)*r,-2.47,Math.sin(a)*r)}
  fleckGeo.setAttribute("position",new THREE.Float32BufferAttribute(flecks,3));
  scene.add(new THREE.Points(fleckGeo,new THREE.PointsMaterial({color:0x6d8b62,size:0.8,transparent:true,opacity:.48})));
  const zones=[
    {id:"ancient-civilization",start:1,end:125,name:"Ancient Civilization",subtitle:"Culture & Heritage",color:0xcdb78a,ground:0x9b875d},
    {id:"ocean-world",start:126,end:250,name:"Ocean World",subtitle:"Marine Science",color:0x62aeb8,ground:0x286d78},
    {id:"jungle-expedition",start:251,end:375,name:"Jungle Expedition",subtitle:"Ecology & Biodiversity",color:0x78a45e,ground:0x305d3c},
    {id:"science-frontier",start:376,end:500,name:"Science Frontier",subtitle:"Science & Innovation",color:0xc6a76d,ground:0x6b5941}
  ];
  const zoneOf=id=>zones.find(z=>id>=z.start&&id<=z.end)||zones[0];
  // Spiral creates one continuous, navigable game route; tiles are individually clickable.
  const points=[],turns=5.4,rMin=16,rMax=125;
  for(let i=0;i<TOTAL;i++){
    const t=i/(TOTAL-1),angle=t*turns*Math.PI*2+Math.PI*.15;
    const radius=rMax-t*(rMax-rMin);
    points.push(new THREE.Vector3(Math.cos(angle)*radius,1.05+Math.sin(t*11)*.13,Math.sin(angle)*radius));
  }
  const tileGroup=new THREE.Group();scene.add(tileGroup);
  const tileMeshes=[],tileData={};
  const pathCurve=new THREE.CatmullRomCurve3(points);
  const pathGeo=new THREE.TubeGeometry(pathCurve,Math.max(1800,TOTAL*5),2.85,8,false);
  const pathMat=new THREE.MeshStandardMaterial({color:0x6f5a3b,roughness:.92});
  const routeMesh=new THREE.Mesh(pathGeo,pathMat);routeMesh.position.y=.05;routeMesh.receiveShadow=true;scene.add(routeMesh);
  const tileGeo=new THREE.BoxGeometry(3.05,.9,4.1);
  for(let i=0;i<TOTAL;i++){
    const id=i+1,z=zoneOf(id),base=new THREE.Color(z.color);
    let tint=base.clone();
    if(id===1)tint.set(0x5dd58a);else if(id===TOTAL)tint.set(0xf07967);else if(id%31===0)tint.set(0xf4c75e);else if(id%37===0)tint.set(0x78bce9);
    const mat=new THREE.MeshStandardMaterial({color:tint,roughness:.76,metalness:.03});
    const mesh=new THREE.Mesh(tileGeo,mat);mesh.position.copy(points[i]);mesh.position.y+=.45;
    const tangent=pathCurve.getTangentAt(i/(TOTAL-1));mesh.rotation.y=Math.atan2(tangent.x,tangent.z);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={tileId:id,zoneId:z.id,zoneName:z.name,subtitle:z.subtitle,type:id===1?"START":id===TOTAL?"FINISH":id%31===0?"QUIZ":id%37===0?"DUEL":"NORMAL"};
    tileGroup.add(mesh);tileMeshes.push(mesh);tileData[id]=mesh;
  }
  // Zone plaques, placed around the route to make the themed stretches legible.
  const plaques=[];
  function makePlaque(text,subtitle,color){
    const c=document.createElement("canvas");c.width=512;c.height=160;const ctx=c.getContext("2d");
    ctx.fillStyle="#102720e8";ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle="#d9bd70";ctx.lineWidth=5;ctx.strokeRect(5,5,c.width-10,c.height-10);
    ctx.fillStyle=color;ctx.font="bold 32px Georgia";ctx.textAlign="center";ctx.fillText(text,256,64);
    ctx.fillStyle="#d7e4d7";ctx.font="23px sans-serif";ctx.fillText(subtitle,256,108);
    const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
    sprite.scale.set(25,7.8,1);return sprite;
  }
  const plaquePositions=[{x:-70,z:-68},{x:68,z:-75},{x:75,z:72},{x:-78,z:72}];
  zones.forEach((z,i)=>{const p=makePlaque(z.name,z.subtitle,"#"+new THREE.Color(z.color).getHexString());p.position.set(plaquePositions[i].x,8,plaquePositions[i].z);scene.add(p);plaques.push(p)});
  // Low-cost procedural landmarks stand in until final environment GLBs are chosen.
  const landmarkGroup=new THREE.Group();scene.add(landmarkGroup);
  // Load the actual Borobudur GLB uploaded to this repository; use procedural fallback if unavailable.
  function createTemplePlaceholder(pos){
    const stone=new THREE.MeshStandardMaterial({color:0x9e8563,roughness:1});
    const base=new THREE.Mesh(new THREE.BoxGeometry(13,1.4,11),stone);base.position.copy(pos);base.position.y=.1;base.castShadow=true;base.receiveShadow=true;landmarkGroup.add(base);
    for(let tier=0;tier<4;tier++){const size=9-tier*1.75;const b=new THREE.Mesh(new THREE.BoxGeometry(size,1.25,size),stone);b.position.set(pos.x,.9+tier*1.2,pos.z);b.castShadow=true;landmarkGroup.add(b)}
    const stupa=new THREE.Mesh(new THREE.SphereGeometry(1.35,16,12),new THREE.MeshStandardMaterial({color:0xd2bb8b}));stupa.position.set(pos.x,6.2,pos.z);landmarkGroup.add(stupa);
    const spire=new THREE.Mesh(new THREE.ConeGeometry(.65,2.2,8),stone);spire.position.set(pos.x,7.8,pos.z);landmarkGroup.add(spire);
  }
  const templeFallback=new THREE.Group();createTemplePlaceholder(new THREE.Vector3(-52,.2,-18));
  if(gltfLoader){
    gltfLoader.load("assets/temples/borobudur_temple.glb",gltf=>{
      const model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
      const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      const max=Math.max(size.x,size.y,size.z)||1;model.scale.setScalar(18/max);
      model.position.set(-52-center.x*model.scale.x,-box.min.y*model.scale.y,-18-center.z*model.scale.z);
      scene.add(model);landmarkGroup.visible=false;
    },undefined,err=>console.warn("Borobudur GLB fallback remains active",err));
  }
  // Coastal lagoon in the marine zone.
  const lagoon=new THREE.Mesh(new THREE.CircleGeometry(19,64),new THREE.MeshStandardMaterial({color:0x147d9b,roughness:.25,metalness:.15,transparent:true,opacity:.9}));
  lagoon.rotation.x=-Math.PI/2;lagoon.position.set(47,-1.1,20);scene.add(lagoon);
  // Tree clusters add scale and theme while keeping paths visible.
  const trunkMat=new THREE.MeshStandardMaterial({color:0x674b31,roughness:1}),leafMats=[0x3a7544,0x4d8850,0x6b9854].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
  for(let i=0;i<100;i++){
    const a=Math.random()*Math.PI*2,r=143+Math.random()*42,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,4+Math.random()*3,6),trunkMat);trunk.position.set(x,1.5,z);trunk.castShadow=true;scene.add(trunk);
    const leaves=new THREE.Mesh(new THREE.ConeGeometry(2.4+Math.random()*2,6+Math.random()*3,7),leafMats[i%leafMats.length]);leaves.position.set(x,5.5,z);leaves.castShadow=true;scene.add(leaves);
  }
  const players=[
    {id:"P1",name:"Player 1",position:1,color:0xf4c45f,asset:"assets/players/artifact.glb",mesh:null},
    {id:"P2",name:"Player 2",position:1,color:0x78cbef,asset:"assets/players/statue_of_bastet.glb",mesh:null}
  ];
  const gltfLoader=typeof THREE.GLTFLoader==="function"?new THREE.GLTFLoader():null;
  const fallbackPlayer=(pl)=>{
    const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:pl.color,roughness:.55});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.72,1.4,4,8),m);body.position.y=1.3;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.62,16,12),m);head.position.y=2.65;g.add(body,head);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g;
  };
  function placePlayer(pl,instant=false){
    const target=points[pl.position-1].clone();target.y+=1.15;
    if(instant||!pl.mesh)pl.mesh.position.copy(target);
    else pl.mesh.position.copy(target);
  }
  players.forEach(pl=>{
    pl.mesh=fallbackPlayer(pl);scene.add(pl.mesh);placePlayer(pl,true);
    if(gltfLoader){
      gltfLoader.load(pl.asset,gltf=>{
        const old=pl.mesh,model=gltf.scene;
        const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z)||1;
        model.scale.setScalar(3.2/max);
        const center=box.getCenter(new THREE.Vector3());model.position.set(-center.x*model.scale.x,-box.min.y*model.scale.y,-center.z*model.scale.z);
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
        scene.add(model);pl.mesh=model;placePlayer(pl,true);scene.remove(old);
      },undefined,err=>console.warn("Player asset fallback:",pl.asset,err));
    }
  });
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  function showTileInfo(data){
    const el=document.getElementById("tileInfo");if(!el)return;
    el.hidden=false;
    el.innerHTML='<div class="tile-number">PETAK '+data.tileId+' · '+data.type+'</div><strong>'+data.zoneName+'</strong><p>'+data.subtitle+'<br>'+descriptionForTile(data.tileId,data.type)+'</p>';
  }
  function descriptionForTile(id,type){
    if(type==="START")return"Awal ekspedisi. Bersiap menjelajahi berbagai pengetahuan.";
    if(type==="FINISH")return"Tujuan akhir ekspedisi.";
    if(type==="QUIZ")return"Tantangan kuis edukasi. Jawab dengan tepat untuk memperoleh bonus.";
    if(type==="DUEL")return"Petak pertemuan. Mini-game dapat dipicu jika pemain bertemu di sini.";
    return"Jelajahi tema "+zoneOf(id).subtitle.toLowerCase()+" di sepanjang jalur.";
  }
  renderer.domElement.addEventListener("pointermove",e=>{
    const rect=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(tileMeshes,false)[0];
    renderer.domElement.style.cursor=hit?"pointer":"grab";
    if(hit){const id=hit.object.userData.tileId;showTileInfo(hit.object.userData)}
  });
  renderer.domElement.addEventListener("pointerleave",()=>{renderer.domElement.style.cursor="grab"});
  renderer.domElement.addEventListener("click",e=>{
    const rect=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(mouse,camera);
    const hit=raycaster.intersectObjects(tileMeshes,false)[0];if(hit)showTileInfo(hit.object.userData);
  });
  function resize(){const w=host.clientWidth||800,h=host.clientHeight||650;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  new ResizeObserver(resize).observe(host);resize();
  let animationId;
  function animate(){animationId=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}
  animate();
  // Give each section its own terrain accent, and distribute authored assets within their zones.
  const oceanMat=new THREE.MeshStandardMaterial({color:0x116d91,roughness:.3,metalness:.1,transparent:true,opacity:.92});
  const oceanPlane=new THREE.Mesh(new THREE.CircleGeometry(33,80),oceanMat);
  oceanPlane.rotation.x=-Math.PI/2;oceanPlane.position.set(55,-1.8,-30);scene.add(oceanPlane);
  const GLBLoader=gltfLoader;
  function loadLandmark(path,position,scale,rotationY=0){
    if(!GLBLoader)return;
    GLBLoader.load(path,gltf=>{
      const model=gltf.scene;
      model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
      const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      const max=Math.max(size.x,size.y,size.z)||1;
      model.scale.setScalar(scale/max);
      model.position.set(position.x-center.x*model.scale.x,position.y-box.min.y*model.scale.y,position.z-center.z*model.scale.z);
      model.rotation.y=rotationY;scene.add(model);
    },undefined,err=>console.warn("Asset fallback:",path,err));
  }
  // Use the beach environment in the ocean section and a school as a science/education landmark.
  loadLandmark("assets/ocean/the_beach.glb",new THREE.Vector3(53,-1.7,-30),48,Math.PI*.12);
  loadLandmark("assets/environment/low_poly__school_building.glb",new THREE.Vector3(-35,-1.8,50),15,-Math.PI*.35);
  loadLandmark("assets/environment/african hut.glb",new THREE.Vector3(63,-1.8,55),15,Math.PI*.6);
  const api={
    TOTAL_TILES:TOTAL,points,players,zones,scene,camera,renderer,controls,tileMeshes,
    zoneForTile:id=>zoneOf(id).name,
    getPlayers:()=>players.map(p=>({id:p.id,name:p.name,position:p.position})),
    getTilePoint:pos=>points[Math.max(1,Math.min(TOTAL,pos))-1],
    setPosition:(id,pos)=>{
      const p=players.find(x=>x.id===id);if(!p)return;
      p.position=Math.max(1,Math.min(TOTAL,Math.round(pos)));
      const target=points[p.position-1].clone();target.y+=1.15;p.mesh.position.copy(target);
      p.mesh.position.y+=1;
    }
  };
  window.BoardGameBoard=api;
})();