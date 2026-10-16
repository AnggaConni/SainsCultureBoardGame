(() => {
const NS="http://www.w3.org/2000/svg",TOTAL=500;
const pathLayer=document.getElementById("pathLayer"),tileLayer=document.getElementById("tileLayer"),labelLayer=document.getElementById("labelLayer"),playerLayer=document.getElementById("playerLayer");
const d=["M 105 140","C 170 80,350 80,405 145","C 480 235,300 300,190 245","C 65 180,65 340,190 380","C 320 420,470 330,575 390","C 720 470,890 360,850 270","C 810 180,650 200,660 300","C 675 400,830 455,780 555","C 735 650,540 585,470 520","C 370 430,235 500,275 605","C 315 710,505 700,585 645","C 710 565,890 670,835 775","C 785 870,620 840,525 790","C 420 735,300 815,365 900","C 430 990,630 955,700 900","C 805 815,930 930,850 1030","C 785 1110,590 1040,515 1000","C 385 930,230 1030,285 1120","C 340 1210,525 1160,590 1125","C 695 1065,825 1165,765 1240","C 705 1320,535 1265,440 1285","C 345 1305,230 1390,115 1370"].join(" ");
const make=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
const route=make("path",{d,fill:"none",stroke:"#79694a","stroke-width":47,"stroke-linecap":"round"});pathLayer.append(route);
const inner=make("path",{d,fill:"none",stroke:"url(#pathFill)","stroke-width":40,"stroke-linecap":"round"});pathLayer.append(inner);
const length=route.getTotalLength();
const points=Array.from({length:TOTAL},(_,i)=>{const p=route.getPointAtLength(i/(TOTAL-1)*length);return{x:p.x,y:p.y,id:i+1};});
function zoneForTile(id){return id<=125?"Ancient Civilization":id<=250?"Ocean World":id<=375?"Jungle Expedition":"Science Frontier";}
function tileColor(id){if(id===1)return"#83c38c";if(id===TOTAL)return"#e87865";if(id%17===0)return"#e8bc5f";if(id%23===0)return"#78b6d6";return"#dfd0a9";}
points.forEach((p,i)=>{
const prev=points[Math.max(0,i-1)],next=points[Math.min(TOTAL-1,i+1)],angle=Math.atan2(next.y-prev.y,next.x-prev.x)*180/Math.PI;
const g=make("g",{transform:"translate("+p.x+" "+p.y+") rotate("+angle+")","data-tile":p.id});
g.append(make("rect",{x:-6.6,y:-6.6,width:13.2,height:13.2,rx:1.2,fill:tileColor(p.id),stroke:"#675a41","stroke-width":".9"}));
if(p.id===1||p.id===TOTAL||p.id%17===0||p.id%23===0)g.append(make("circle",{r:2.2,fill:p.id===1?"#26764c":p.id===TOTAL?"#a93f32":p.id%17===0?"#b8791e":"#3d82ad"}));
const title=make("title");title.textContent="Petak "+p.id+" · "+zoneForTile(p.id);g.append(title);tileLayer.append(g);
});
function label(x,y,text,fill){const e=make("text",{x,y,fill,"font-size":17,"font-family:"Georgia,serif","font-weight":"bold","letter-spacing":2,"text-anchor":"middle"});e.textContent=text;labelLayer.append(e);}
label(105,93,"START","#d9f4d9");label(500,715,"SAINS & CULTURE","#f5e8c5");label(115,1418,"THE EXPEDITION BEGINS","#d9e6d5");label(845,1258,"FINISH","#ffdfcb");
const players=[{id:"P1",name:"Player 1",position:1,color:"#f3c45c",dx:-5,dy:-7},{id:"P2",name:"Player 2",position:1,color:"#71c4ec",dx:5,dy:7}];
function renderPlayers(){playerLayer.replaceChildren();players.forEach(pl=>{const p=points[pl.position-1],g=make("g",{transform:"translate("+(p.x+pl.dx)+" "+(p.y+pl.dy)+")"});g.append(make("circle",{r:10,cy:2,fill:"#081a10",opacity:.45}),make("circle",{r:8.2,fill:pl.color,stroke:"#fff7dc","stroke-width":2}));const t=make("text",{x:0,y:2.7,"text-anchor":"middle","font-size":6,"font-weight":900,fill:"#263225"});t.textContent=pl.id;g.append(t);const title=make("title");title.textContent=pl.name+" · Petak "+pl.position;g.append(title);playerLayer.append(g);});}
function setPosition(id,pos){const p=players.find(x=>x.id===id);if(p){p.position=Math.max(1,Math.min(TOTAL,Math.round(pos)));renderPlayers();}}
renderPlayers();window.BoardGameBoard={TOTAL_TILES:TOTAL,points,players,setPosition,getPlayers:()=>players.map(p=>({...p})),getTilePoint:pos=>points[Math.max(1,Math.min(TOTAL,pos))-1],zoneForTile};
})();