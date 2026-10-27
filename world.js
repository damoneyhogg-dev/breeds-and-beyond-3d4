import * as THREE from './tools/node_modules/three/build/three.module.js';
import { ActionInput, ThirdPersonController, FollowCamera } from './controller.mjs';

// A separate, genuine WebGL world. Legacy prototype and its saves are not loaded.
const $ = id => document.getElementById(id);
const Sim = window.BreedSim;
const Marketplace = window.BreedMarketplace;
let storage; try { storage = window.localStorage; } catch { storage = null; }
const state = Sim.load(storage);
const breeds = {
  coco: {name:'Coco',breed:'Yorkshire Terrier',coat:0x494444,tan:0xb98a52,size:.52,ears:.23},
  atlas: {name:'Atlas',breed:'Pocket Bully',coat:0x88837a,tan:0xd4c7b0,size:.78,ears:.15},
  nova: {name:'Nova',breed:'Belgian Malinois',coat:0x9e7447,tan:0x282a26,size:.94,ears:.35}
};
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch (err) { $('error').hidden=false; $('errorText').textContent=err.message; throw err; }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
$('world').appendChild(renderer.domElement);
const scene = new THREE.Scene();scene.background=new THREE.Color(0x9fb9bd);scene.fog=new THREE.Fog(0x9fb9bd,42,150);
const camera = new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.1,240);
scene.add(new THREE.HemisphereLight(0xd8e5eb,0x655a3d,2.3));
const sun = new THREE.DirectionalLight(0xffe0ab,3.1);sun.position.set(-25,45,22);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:160});sun.shadow.bias=-.0005;scene.add(sun);
const fill=new THREE.DirectionalLight(0xa7d1df,.8);fill.position.set(20,15,-30);scene.add(fill);
const colliders=[],interactions=[];
let running=false,paused=false,camMode=0,nearest=null,clock=0,toastTime=0;
let mission=null,activity=null,ball=null,activeDog=null,footstepTime=0;
let dogTrail=[];
let alignment=null,inspectionDog=null;
let locomotionState={speed:0,state:'idle',grounded:true};
const mats=new Map();
function material(color,roughness=.86){const key=color+':'+roughness;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness}));return mats.get(key);}
function mesh(geo,color,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geo,material(color));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;(parent||scene).add(o);return o;}
function box(parent,x,y,z,w,h,d,color){return mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z);}
function surfaceTexture(color,kind){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
 let n=317;const rand=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
 for(let i=0;i<12000;i++){const v=Math.floor(80+rand()*130);ctx.fillStyle=`rgba(${v},${v},${v},${kind==='grass'?.22:.16})`;const x=rand()*256,y=rand()*256;ctx.fillRect(x,y,kind==='grass'?1:2,kind==='grass'?4:2);}
 if(kind==='stone'){ctx.strokeStyle='#77796b44';ctx.lineWidth=2;for(let x=0;x<256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}for(let y=0;y<256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='grass'?40:6,kind==='grass'?40:6);return t;
}
function ell(parent,x,y,z,sx,sy,sz,color){const o=mesh(new THREE.SphereGeometry(1,16,12),color,parent,x,y,z);o.scale.set(sx,sy,sz);return o;}
function cylinder(parent,x,y,z,r,h,color){return mesh(new THREE.CylinderGeometry(r,r,h,16),color,parent,x,y,z);}
function beam(parent,a,b,r,color){const delta=b.clone().sub(a),o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),color,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
function sign(text,x,y,z,width=4,color='#eee4c5',bg='#223c3b'){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,768,128);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font='500 42px Segoe UI, Arial';c.fillText(text,384,64,735);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,y,z);scene.add(m);return m;
}
function collider(x,z,w,d){colliders.push({x,z,w,d});}
function hit(x,z,radius=.3){return colliders.some(c=>Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius);}
function groundHeightAt(x,z){
 const cx=roomCenters?.[state.location];
 if(cx!==undefined)return 0;
 // Roads, pavements and grass differ slightly in height; smoothing in the controller keeps curb transitions grounded.
 if(Math.abs(x)<5.1||z>2.7&&z<13.3&&Math.abs(x)<44)return .04;
 if(Math.abs(x)>5.15&&Math.abs(x)<7.85)return .19;
 // Gentle training-field accessibility ramp used to verify slope following.
 if(x>12&&x<16&&z>-3&&z<3)return (x-12)/4*.22;
 if(x>=16&&x<30&&z>-4&&z<4)return .22;
 if(z>-3.1&&z<-.9&&x>=30&&x<32.4)return .22+Math.floor((x-30)/.8+1)*.12;
 return 0;
}
function addInteraction(id,label,x,z,action,radius=2){interactions.push({id,label,x,z,action,radius});}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');toastTime=6;}
function save(){state.position={x:player.position.x,z:player.position.z};if(!Sim.save(storage,state))toast('Saving is unavailable in this browser. Keep this tab open to retain this session.');}
function updateHUD(){
  const dog=breeds[state.dog];$('dogName').textContent=dog?dog.name+' · '+dog.breed:'Find your companion';
  $('coins').textContent=state.coins+' coins · '+state.ribbons+' ribbons';$('day').textContent='Day '+state.day+' · '+(state.ageDays<180?'Puppy':state.ageDays<365?'Adolescent':'Adult');
  $('vitals').innerHTML=dog?['energy','health','bond'].map(k=>`<div class="vital"><span>${k} ${state[k]}</span><meter min="0" max="100" value="${state[k]}">${state[k]}</meter></div>`).join(''):'';
  $('objective').textContent=mission?mission.kind==='scent'?`Scent trail: help ${dog.name} find article ${mission.index+1} of 3`:`Walk through checkpoint ${mission.index+1} of 5 with ${dog.name}`:!dog?'Meet Rene inside the pet shop':!state.fed?'Take your puppy home and serve a meal':!state.played?'Play fetch with your puppy at home':!state.trained?'Practice recall at home or in the training field':'Explore the park, visit Rene, or sleep at home';
}
function panel(tag,title,body,actions=[]){input?.clear();$('panelTag').textContent=tag;$('panelTitle').textContent=title;$('panelBody').innerHTML=body;$('panelActions').replaceChildren();for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;b.onclick=fn;$('panelActions').appendChild(b);}if(!$('panel').open)$('panel').showModal();}
function closePanel(){if($('panel').open)$('panel').close();input?.clear();if(inspectionDog){followCamera?.inspect(null);inspectionDog=null;}}
$('closePanel').onclick=closePanel;
let selectedRetailer=null;
function openMarketplace(){
 if(!Marketplace){toast('The marketplace is temporarily unavailable.');return;}
 panel('REAL PET MARKETPLACE','Shop with trusted retailers',`<p class="marketplace-intro">Browse real pet products, then continue to the retailer's secure website. Purchases never use game coins and do not provide gameplay advantages.</p><div class="retailer-grid">${Marketplace.retailers.map(item=>`<button class="retailer-card" data-retailer="${item.id}"><b>${item.name}</b><span>${item.category}</span><small>${Marketplace.disclosure(item)}</small></button>`).join('')}</div><p class="fine">Product availability, pricing, shipping, returns and privacy are controlled by each retailer. Ask a veterinarian about nutrition or health-related purchases.</p>`);
 document.querySelectorAll('[data-retailer]').forEach(button=>button.onclick=()=>confirmRetailer(button.dataset.retailer));
}
function confirmRetailer(id){
 const item=Marketplace?.safeRetailer(id);if(!item){toast('That retailer link is unavailable.');return;}
 selectedRetailer=item;closePanel();$('purchaseTitle').textContent=`Continue to ${item.name}?`;
 $('purchaseDescription').textContent=item.category+'. The official retailer site will open in a new tab.';
 $('purchaseDisclosure').textContent=Marketplace.disclosure(item);$('adultConfirm').checked=false;$('continuePurchase').disabled=true;
 $('purchaseConfirm').showModal();input?.clear();
}
function closePurchase(){if($('purchaseConfirm').open)$('purchaseConfirm').close();selectedRetailer=null;input?.clear();}
$('marketplace').onclick=openMarketplace;
$('adultConfirm').onchange=()=>{$('continuePurchase').disabled=!$('adultConfirm').checked;};
$('cancelPurchase').onclick=closePurchase;$('closePurchase').onclick=closePurchase;
$('continuePurchase').onclick=()=>{if(!$('adultConfirm').checked||!selectedRetailer)return;const item=Marketplace.safeRetailer(selectedRetailer.id);if(!item){closePurchase();toast('That retailer link is unavailable.');return;}window.open(item.url,'_blank','noopener,noreferrer');closePurchase();toast(`Opened ${item.name} in a new tab. Your game remains saved here.`);};

// Ground and road geometry: physical space, not a diagram or clickable board.
box(scene,0,-.16,0,150,.3,150,0x657b4b);
material(0x657b4b).map=surfaceTexture('#b8c69b','grass');
material(0x444c4d).map=surfaceTexture('#9b9f9c','road');
material(0xa6a493).map=surfaceTexture('#dedace','stone');
box(scene,0,.01,0,10,.05,120,0x444c4d);box(scene,0,.025,8,88,.055,8,0x444c4d);
for(let z=-55;z<60;z+=7)box(scene,0,.061,z,.12,.01,2.4,0xc5c0a9);
for(const x of [-6.5,6.5]){box(scene,x,.1,0,2.6,.18,120,0xa6a493);box(scene,x+(x<0?-1.35:1.35),.22,0,.18,.22,120,0xc2bca7);}
for(const z of [2.8,13.2])box(scene,0,.1,z,85,.18,2,0xa6a493);
for(let x=-4;x<5;x+=1.35)box(scene,x,.075,17,.7,.025,2,0xd7d4bf);
function building(name,x,z,w,d,color){
  box(scene,x,2.1,z,w,4.2,d,color);collider(x,z,w,d);
  box(scene,x,4.35,z,w+.55,.3,d+.55,0x374541);box(scene,x,3.05,z+d/2+.1,w-.4,.4,.6,0x385954);
  const glass=material(0x829f9b,.26);
  for(const dx of [-w*.29,w*.29]){const win=box(scene,x+dx,1.85,z+d/2+.03,w*.22,1.8,.07,0x819e9c);win.material=glass;box(scene,x+dx,1,z+d/2+.17,w*.25,.12,.32,0xc9c4ae);}
  box(scene,x,.99,z+d/2+.07,1.3,2,.13,0x263d3c);box(scene,x+.45,1.1,z+d/2+.17,.06,.2,.08,0xcfc090);
  sign(name,x,3.68,z+d/2+.11,w*.84);box(scene,x,.12,z+d/2+1.1,2.5,.2,2,0xb8ad91);
  return {x,z:z+d/2+1.5};
}
function residentialHouse(x,z,w=10,d=8,color=0xb7a58f){
  box(scene,x,2,z,w,4,d,color);collider(x,z,w,d);
  const roof=mesh(new THREE.ConeGeometry(Math.max(w,d)*.72,2,4),0x414947,scene,x,5,z);roof.rotation.y=Math.PI/4;roof.scale.z=d/w;
  box(scene,x,1.05,z-d/2-.05,1.4,2.1,.16,0x38504c);
  for(const dx of [-w*.28,w*.28]){box(scene,x+dx,2.05,z-d/2-.06,1.7,1.35,.12,0x88a7a8);box(scene,x+dx,1.32,z-d/2-.12,1.9,.12,.24,0xd5ceb8);}
}
function fence(x,z,w,d){
  const horizontal=w>d,length=horizontal?w:d;
  for(const y of [.38,.82])box(scene,x,y,z,horizontal?w:.08,.08,horizontal?.08:d,0x9b896d);
  const posts=Math.max(2,Math.ceil(length/2));for(let i=0;i<=posts;i++){const offset=-length/2+i/posts*length;box(scene,x+(horizontal?offset:0),.56,z+(horizontal?0:offset),.11,1.12,.11,0x7f705b);}
  collider(x,z,w,d);
}
function mailbox(x,z,color=0x4b6462){cylinder(scene,x,.65,z,.07,1.3,0x70634d);box(scene,x,.95,z,.52,.36,.38,color);box(scene,x+.22,1.2,z,.05,.48,.05,0xb25843);collider(x,z,.55,.4);}
const shopDoor=building("RENE'S PET SHOP",-15,-10,12,9,0xb7ad93);
const homeDoor=building('HOME · WILLOW LANE',16,24,11,9,0xacaca0);
const clinicDoor=building("RENE'S CLINIC",16,-14,12,10,0xb2beb3);
const daycareDoor=building('DAYCARE MEADOW',-19,30,14,9,0xbca580);
building('WILLOWBROOK MARKET',-20,-34,17,10,0x8b9590);
building('THE OLD MILL',23,-39,19,13,0x948779);
// Fictional residential scenery informed by private route footage. No filmed imagery or real-world layout is shipped.
const yardBounds={minX:38,maxX:54,minZ:15.5,maxZ:24};
box(scene,46,.025,19.8,19,.04,11,0x728456);residentialHouse(50,30,10,9,0xa98f79);
fence(37.5,19.8,.16,8.9);fence(54.5,19.8,.16,8.9);fence(46,24.6,17.2,.16);
fence(41,15.1,6,.16);fence(51,15.1,6,.16);
mailbox(42.2,13.9,0x385958);mailbox(51.2,13.9,0x74594a);
cylinder(scene,33.2,.48,13.9,.19,.96,0xb54735);cylinder(scene,33.2,.95,13.9,.27,.12,0xb54735);for(const dx of [-.28,.28]){const cap=cylinder(scene,33.2+dx,.62,13.9,.09,.32,0xc9a95f);cap.rotation.z=Math.PI/2;}
box(scene,-43,.02,28,15,.035,9,0x829071);box(scene,-43,.055,28,13,.05,7,0x5f8d93);sign('WILLOWBROOK COMMONS',-43,2.3,23.4,6);
function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cylinder(g,0,1.5*s,0,.18*s,3*s,0x6a5941);for(let j=0;j<7;j++){const a=j*2.39,branch=cylinder(g,Math.cos(a)*.35*s,2.6*s,Math.sin(a)*.35*s,.06*s,1.5*s,0x6a5941);branch.rotation.z=Math.cos(a)*.7;ell(g,Math.cos(a)*.85*s,(3.2+(j%3)*.4)*s,Math.sin(a)*.8*s,1.05*s,1.1*s,1.05*s,j%2?0x496444:0x3d6043);}collider(x,z,.55,.55);}
let seed=1489;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<60;i++){const x=(random()-.5)*125,z=(random()-.5)*120;const reserved=x>33&&x<58&&z>11&&z<39||x<-35&&z>20&&z<36;if((Math.abs(x)>32||Math.abs(z)>49)&&!reserved)tree(x,z,.75+random()*.65);}
for(const [x,z] of [[-9,-21],[-9,21],[9,38],[9,-30],[-30,12],[30,12]])tree(x,z,.95);
const utilityPoles=[];for(let z=-40;z<50;z+=20){cylinder(scene,5.5,2.4,z,.065,4.8,0x34413a);box(scene,5.5,4.8,z,.55,.18,.65,0xe8d9a0);utilityPoles.push(new THREE.Vector3(5.5,4.86,z));}
for(let i=1;i<utilityPoles.length;i++){beam(scene,utilityPoles[i-1].clone().add(new THREE.Vector3(-.2,0,0)),utilityPoles[i].clone().add(new THREE.Vector3(-.2,0,0)),.018,0x303735);beam(scene,utilityPoles[i-1].clone().add(new THREE.Vector3(.2,-.12,0)),utilityPoles[i].clone().add(new THREE.Vector3(.2,-.12,0)),.018,0x303735);}
function bench(x,z){box(scene,x,.55,z,2,.18,.65,0x8a7252);box(scene,x,1,z-.3,2,.75,.12,0x8a7252);for(const a of [-.7,.7])box(scene,x+a,.27,z,.1,.54,.5,0x384940);collider(x,z,2,.6);}
bench(9,0);bench(-10,20);bench(-25,-19);
// Park, training lane, scent targets.
box(scene,-22,.06,-22,17,.1,10,0x738153);sign('SCENT GROVE',-22,2.7,-27,6);
box(scene,22,.07,0,18,.12,8,0x887d5e);sign('TRAINING FIELD',22,2.7,-4,7);
const coursePoints=[{x:16,z:0},{x:20,z:0},{x:24,z:0},{x:28,z:0},{x:29,z:3}];
const courseRings=[];
for(const p of coursePoints){const ring=mesh(new THREE.TorusGeometry(.75,.045,8,40),0xd5be81,scene,p.x,.8,p.z);ring.rotation.y=Math.PI/2;courseRings.push(ring);}
// Low controller-validation steps beside the training lane exercise grounded curb/stair following.
for(let i=0;i<3;i++)box(scene,30.4+i*.8,.14+i*.06,-2,.8,.28+i*.12,2,0xa69b7e);
const scentPoints=[{x:-27,z:-23},{x:-18,z:-25},{x:-16,z:-19}];const scentObjects=[];
for(const p of scentPoints){const m=box(scene,p.x,.13,p.z,.45,.2,.3,0x856743);scentObjects.push(m);}
const beacon=mesh(new THREE.TorusGeometry(.6,.035,8,32),0xf1ce80,scene);beacon.rotation.x=-Math.PI/2;beacon.visible=false;
const guide=mesh(new THREE.TorusGeometry(.8,.025,8,40),0xe3d0a0,scene);guide.rotation.x=-Math.PI/2;

const roomCenters={shop:110,home:150,clinic:190,daycare:230};
// Rooms are actual navigable spaces with furniture and collision.
function room(cx,label,wallColor){box(scene,cx,-.04,0,14,.1,13,0x9f8970);box(scene,cx,2,-6.5,14,4,.22,wallColor);box(scene,cx-7,2,0,.22,4,13,wallColor);box(scene,cx+7,2,0,.22,4,13,wallColor);collider(cx,-6.5,14,.2);collider(cx-7,0,.2,13);collider(cx+7,0,.2,13);box(scene,cx-4.2,2,6.5,5.6,4,.2,wallColor);box(scene,cx+4.2,2,6.5,5.6,4,.2,wallColor);collider(cx-4.2,6.5,5.6,.2);collider(cx+4.2,6.5,5.6,.2);sign(label,cx,3.2,-6.3,6);const l=new THREE.PointLight(0xffdfb1,35,18,2);l.position.set(cx,3,0);scene.add(l);}
room(110,"RENE'S · FIRST COMPANIONS",0xb4b19d);room(150,'HOME IS WHERE YOUR DOG IS',0xaaa995);
box(scene,113,.55,-4,5,1.1,1.2,0x516356);collider(113,-4,5,1.2);
for(const x of [105.5,109,112.5]){box(scene,x,.1,-.8,2.3,.15,2.4,0x6a8274);for(const dx of [-1.2,1.2])box(scene,x+dx,.3,-.8,.055,.6,2.5,0xa0ad9b);}
box(scene,146,.5,-3.5,3.4,.85,1.2,0x546c64);box(scene,146,1,-4,3.4,.8,.22,0x546c64);collider(146,-3.5,3.4,1.3);
box(scene,154,.16,-3.8,2,.25,1.6,0x7f6e59);ell(scene,154,.3,-3.8,.75,.15,.6,0xb0a088);
const bowls=[];for(const x of [145,145.8]){const b=mesh(new THREE.CylinderGeometry(.3,.24,.18,24),0xaab6ac,scene,x,.12,1);bowls.push(b);cylinder(scene,x,.22,1,.23,.02,x===145?0x8f6946:0x759fa5);}
sign('REST',154,1.8,-5,2);sign('FOOD & WATER',145.4,1.5,-.4,2.6);

room(190,"RENE'S CLINIC",0xb3c3bd);room(230,'DAYCARE MEADOW',0xb8bda1);
box(scene,193,.55,-4,4,1.1,1.1,0x607e79);collider(193,-4,4,1.1);
box(scene,186,.15,-2,2.6,.25,2,0x76948a);sign('WELLNESS',186,1.8,-3.5,3);
for(const x of [226,230,234]){box(scene,x,.12,-4,2,.2,1.5,0x8c9e7b);ell(scene,x,.28,-4,.7,.15,.5,0xc2b18c);}
box(scene,230,.04,-.5,7,.08,4,0x84986d);sign('QUIET PLAY & REST',230,2.5,-5.8,5);
function human(parent='morgan'){
 const palettes={morgan:[0x485d59,0xa57656],jaylen:[0x304e6b,0x6c4431],samira:[0x97735b,0x985f42],devon:[0x666652,0xd1a37e]};const [shirt,skin]=palettes[parent]||palettes.morgan;
 const g=new THREE.Group(),hips=new THREE.Group(),spine=new THREE.Group(),legs=[],arms=[];
 hips.position.y=.88;g.add(hips);ell(hips,0,0,0,.23,.15,.14,0x39444b);
 spine.position.y=.25;hips.add(spine);ell(spine,0,.24,0,.25,.36,.14,shirt);
 cylinder(spine,0,.66,0,.085,.16,skin);ell(spine,0,.85,.015,.14,.19,.14,skin);ell(spine,0,.97,-.015,.145,.09,.14,0x352c26);ell(spine,0,.83,.147,.035,.045,.04,skin);
 for(const side of [-1,1]){
  ell(spine,side*.052,.88,.137,.018,.013,.01,0x212b29);
  const upperLeg=new THREE.Group();upperLeg.position.set(side*.13,0,0);hips.add(upperLeg);ell(upperLeg,0,-.17,0,.087,.2,.097,0x384a52);
  const lowerLeg=new THREE.Group();lowerLeg.position.set(0,-.36,0);upperLeg.add(lowerLeg);ell(lowerLeg,0,-.17,0,.075,.2,.085,0x384a52);
  const foot=new THREE.Group();foot.position.set(0,-.37,.055);lowerLeg.add(foot);ell(foot,0,-.015,.06,.095,.07,.18,0x282f2c);legs.push({upper:upperLeg,lower:lowerLeg,foot});
  const upperArm=new THREE.Group();upperArm.position.set(side*.29,.58,0);spine.add(upperArm);ell(upperArm,0,-.15,0,.08,.18,.08,shirt);
  const lowerArm=new THREE.Group();lowerArm.position.set(0,-.32,0);upperArm.add(lowerArm);ell(lowerArm,0,-.14,.015,.058,.16,.065,skin);arms.push({upper:upperArm,lower:lowerArm});
 }
 g.userData={joints:{hips,spine,legs,arms}};return g;
}
function dogModel(id,puppy=false){
 const d=breeds[id],g=new THREE.Group(),legs=[];const bully=id==='atlas',yorkie=id==='coco';const bodyY=bully?.42:.58;
 ell(g,0,bodyY,0,bully?.26:.19,bully?.25:.22,.4,d.coat);
 ell(g,0,bodyY+.015,.29,bully?.24:.18,.23,.21,d.tan);
 const head=new THREE.Group();head.position.set(0,bodyY+.24,.43);g.add(head);
 ell(head,0,0,0,bully?.235:.17,bully?.2:.18,.19,d.tan);
 ell(head,0,-.065,.16,bully?.15:.095,.09,bully?.11:.16,yorkie?0xc6a271:id==='nova'?0x292c28:0xb8aaa0);
 ell(head,0,-.04,bully?.255:.3,.065,.046,.035,0x222522);
 for(const side of [-1,1]){ell(head,side*(bully?.14:.1),.025,.15,.028,.035,.027,0x171d18);ell(head,side*.095+.006,.036,.172,.007,.009,.007,0xd5d5c6);
 const ear=mesh(new THREE.ConeGeometry(yorkie?.1:.095,d.ears,4),d.coat,head,side*.135,.16+d.ears*.25,-.02);ear.rotation.z=side*-.25;
 for(const z of [-.25,.26]){const leg=new THREE.Group();leg.position.set(side*(bully?.19:.13),bodyY-.05,z);g.add(leg);ell(leg,0,-bodyY*.42,0,bully?.09:.06,bodyY*.48,.07,d.tan);ell(leg,0,-bodyY+.095,.025,.075,.06,.12,d.tan);legs.push(leg);}}
 const tail=new THREE.Group();tail.position.set(0,bodyY+.06,-.35);g.add(tail);const tm=ell(tail,0,.1,-.16,.048,.055,yorkie?.13:.24,d.coat);tm.rotation.x=.7;
 const collar=mesh(new THREE.TorusGeometry(bully?.23:.17,.026,8,24),0x557a76,g,0,bodyY+.1,.31);collar.rotation.x=.35;
 if(yorkie){for(let i=0;i<34;i++){const a=i/34*Math.PI*2;const tuft=ell(g,Math.cos(a)*.17,bodyY-.035,Math.sin(a)*.34,.025,.18,.04,i%3?d.coat:0x9e855f);tuft.rotation.z=Math.cos(a)*.14;}}
 if(bully){for(let i=0;i<13;i++){const a=i*.83;ell(g,Math.cos(a)*.245,bodyY+.1+Math.sin(a)*.08,Math.sin(a*1.7)*.31,.035,.04,.055,i%2?0xbdb3a2:0x504f4d);}}
 g.scale.setScalar(d.size*(puppy?.7:1));g.userData={legs,head,tail,id,baseScale:d.size};return g;
}
const player=human(state.parent);player.rotation.y=Math.PI;scene.add(player);
const daycareCarer=human('samira');daycareCarer.position.set(233,0,1);scene.add(daycareCarer);sign('DAYCARE CARER',233,2.4,1,2.5);
const rene=human('devon');rene.position.set(111,0,-3);scene.add(rene);sign('RENE',111,2.4,-2.9,1.5);
const shopDogs=[];Object.keys(breeds).forEach((id,i)=>{const dog=dogModel(id,true);dog.position.set(105.5+i*3.5,.18,-.8);scene.add(dog);shopDogs.push(dog);sign(breeds[id].name,105.5+i*3.5,1.3,-2.2,1.7);});
const yardDog=dogModel('atlas',false);yardDog.scale.multiplyScalar(.88);yardDog.position.set(40,0,18);scene.add(yardDog);
const yardRoute=[new THREE.Vector3(40,0,18),new THREE.Vector3(45,0,21.5),new THREE.Vector3(51.5,0,18),new THREE.Vector3(49,0,22.5),new THREE.Vector3(41,0,22.5)];
const yardDogState={index:1,wait:0,mode:'roam'};
function syncDog(){if(activeDog)scene.remove(activeDog);if(state.dog){activeDog=dogModel(state.dog,state.ageDays<180);activeDog.position.copy(player.position).add(new THREE.Vector3(.8,0,-.5));scene.add(activeDog);}else activeDog=null;}
// Safe spawn avoids loading into walls or an invalid interior.
const spawnByLocation={town:[0,18],shop:[110,4],home:[150,4],clinic:[190,4],daycare:[230,4],training:[13,0],park:[-22,-16]};
function validPosition(){const p=state.position,cx=roomCenters[state.location];return cx!==undefined?Math.abs(p.x-cx)<6.6&&p.z>-6&&p.z<6:Math.abs(p.x)<65&&Math.abs(p.z)<60;}
const spawn=validPosition()&&!hit(state.position.x,state.position.z)?[state.position.x,state.position.z]:spawnByLocation[state.location];player.position.set(spawn[0],0,spawn[1]);syncDog();
const camRay=new THREE.Raycaster();
function movementBlocked(x,z,radius=.3){const cx=roomCenters[state.location];if(cx!==undefined&&(Math.abs(x-cx)>6.7-radius||Math.abs(z)>6.2-radius))return true;if(cx===undefined&&(Math.abs(x)>65-radius||Math.abs(z)>60-radius))return true;return hit(x,z,radius);}
function cameraCollisionDistance(focus,direction,maxDistance){
 const rayDirection=direction.clone().normalize();camRay.set(focus,rayDirection);let distance=maxDistance;
 for(const c of colliders){const bounds=new THREE.Box3(new THREE.Vector3(c.x-c.w/2,-1,c.z-c.d/2),new THREE.Vector3(c.x+c.w/2,4.6,c.z+c.d/2));const point=new THREE.Vector3();if(camRay.ray.intersectBox(bounds,point)){const candidate=focus.distanceTo(point);if(candidate>.22&&candidate<distance)distance=Math.max(.85,candidate-.28);}}
 return distance;
}
const input=new ActionInput(renderer.domElement,document.querySelectorAll('[data-move]'));
const playerController=new ThirdPersonController(player,movementBlocked,groundHeightAt);
const followCamera=new FollowCamera(camera,cameraCollisionDistance);
function teleport(location,x,z){closePanel();state.location=location;player.position.set(x,groundHeightAt(x,z),z);playerController.velocity.set(0,0,0);playerController.facing=Math.PI;playerController.desiredFacing=Math.PI;player.rotation.y=Math.PI;dogTrail=[];if(activeDog)activeDog.position.set(x+.7,0,z-.5);followCamera.yaw=0;camera.position.set(x,3,z+6);save();updateHUD();}
function enterRoom(roomName,x){if(mission){toast('Finish or leave your current activity before entering.');return;}teleport(roomName,x,4);toast(roomName==='clinic'?'Walk to the wellness mat for care.':roomName==='daycare'?'Walk to the supervised care area.':roomName==='shop'?'Welcome. Walk up to Rene or a puppy to meet your companion.':'Home sweet home. Find the bowls, bed, and play space.');}
function act(action){const result=Sim.interact(state,action);toast(result.message);if(result.ok){save();updateHUD();}return result.ok;}
function careActivity(kind,target){if(!state.dog){toast('Choose your puppy at the shop first.');return;}if(activity||mission){toast('Finish the current activity first.');return;}
 if(kind==='play'&&state.played||kind==='train'&&state.trained||kind==='feed'&&state.fed){act(kind);return;}
 if(kind==='play'&&(state.energy<15||state.health<40)||kind==='train'&&(state.energy<25||state.health<50)){toast('Your puppy needs rest or care before active play.');return;}
 if(kind==='play'){const start=activeDog.position.clone();const end=new THREE.Vector3(target.x,0,target.z);ball=ell(scene,start.x,.2,start.z,.12,.12,.12,0xd5a95e);activity={kind,time:0,start,end,phase:'throw'};toast('Fetch! Watch your puppy retrieve the ball.');}
 else {activity={kind,time:0,end:new THREE.Vector3(target.x,0,target.z),phase:'go'};toast(kind==='feed'?'Your puppy is coming to the bowls.':kind==='rest'?'Settling in for a quiet rest.':'Recall practice: your puppy is returning to you.');}
}
function startDaycare(){
 if(activity||mission)return;
 if(state.location!=='daycare'||Math.hypot(player.position.x-230,player.position.z-1)>2.6)return;
 const check=Sim.interact({...state},'daycare');
 if(!check.ok){toast(check.message);return;}
 closePanel();activity={kind:'daycare',time:0,phase:0,settled:0};dogTrail=[];
 toast('Supervised play, then a quiet nap. Cancel anytime; payment is collected only on completion.');
}
function adoptionPanel(focusId=null){if(focusId&&shopDogs[Object.keys(breeds).indexOf(focusId)]){inspectionDog=shopDogs[Object.keys(breeds).indexOf(focusId)];followCamera.inspect(inspectionDog);}if(state.dog){panel("RENE'S PET SHOP",'A companion for life',`<p>${breeds[state.dog].name} is already part of your household. Walk home to begin your routine.</p><p>Rene: Use short, reward-based training sessions and allow plenty of rest.</p>`);return;}
 const focused=focusId?breeds[focusId]:null;panel("RENE'S PET SHOP",focused?`Inspect ${focused.name}`:'Meet your first companion',`<p>${focused?`Look closely at ${focused.name}'s face, coat, markings, proportions, and size. `:''}Choose a puppy and starter supplies for 80 virtual coins. The photos below are references; the moving 3D dogs remain provisional breed-shaped meshes.</p><div class="dog-grid">${Object.entries(breeds).map(([id,d])=>`<button class="dog-card" data-adopt="${id}"><img src="assets/${id}.jpg" alt="Reference photo for ${d.name}"><b>${d.name}</b><small>${d.breed}<br>Choose companion · 80 coins</small></button>`).join('')}</div>`);
 document.querySelectorAll('[data-adopt]').forEach(b=>b.onclick=()=>{const r=Sim.adopt(state,b.dataset.adopt);toast(r.message);if(r.ok){syncDog();save();updateHUD();closePanel();}});
}
function startMission(kind){if(!state.dog){toast('Choose your puppy before entering an activity.');return;}if(activity||mission){toast('An activity is already in progress.');return;}if(state.health<60||state.energy<30){toast('Rest and visit Rene before starting.');return;}
 if(kind==='scent'&&state.scentDone||kind==='agility'&&state.agilityDone){toast('This course is complete today. Return after a new day.');return;}
 if(kind==='agility'&&(state.ageDays<365||state.skill<25)){toast('The adult rally course unlocks at 365 game days and skill 25. Puppy recall and scent searches are available now.');return;}
 mission={kind,index:0,time:0};beacon.visible=true;closePanel();toast(kind==='scent'?'Explore Scent Grove. Follow the dog and watch its alert near each hidden article.':'Walk the five marked rally gates in order. Keep your dog beside you.');updateHUD();}
addInteraction('shopDoor','Enter pet shop',shopDoor.x,shopDoor.z,()=>enterRoom('shop',110),2.5);
addInteraction('homeDoor','Enter home',homeDoor.x,homeDoor.z,()=>{if(!state.dog){toast('Meet Rene and choose a puppy first.');return;}enterRoom('home',150);},2.5);
addInteraction('shopExit','Leave pet shop',110,5.5,()=>teleport('town',shopDoor.x,shopDoor.z+1));
addInteraction('homeExit','Leave home',150,5.5,()=>teleport('town',homeDoor.x,homeDoor.z+1));
addInteraction('rene','Talk to Rene',111,-1.8,()=>adoptionPanel(),2);
for(let i=0;i<3;i++){const id=Object.keys(breeds)[i];addInteraction('puppy'+i,`Inspect ${breeds[id].name}`,105.5+i*3.5,.9,()=>adoptionPanel(id),1.6);}
addInteraction('bowls','Feed & water',145.4,1,()=>careActivity('feed',{x:145.5,z:1.5}),1.8);
addInteraction('bed','Rest / end the day',154,-3,()=>panel('AT HOME','Rest and grow',`<p>Feed and play before ending the day. Each completed game day advances growth by two weeks. This is accelerated game time, not a real care schedule.</p><p>Age: ${state.ageDays} days · Training skill: ${state.skill}</p>`,[['Rest now',()=>{closePanel();careActivity('rest',{x:154,z:-3.5});}],['Sleep until next day',()=>{const r=Sim.nextDay(state);toast(r.message);if(r.ok){save();syncDog();updateHUD();closePanel();}}]]),2);
addInteraction('play','Play fetch',152,1,()=>careActivity('play',{x:153,z:-.5}),1.6);
addInteraction('recall','Practice recall',147,3,()=>careActivity('train',{x:player.position.x+.5,z:player.position.z+.5}),1.5);
addInteraction('clinicCare','Wellness consultation',186,-.5,()=>panel("RENE'S CLINIC",'Care comes first',`<p>Game care: health ${state.health}/100. A routine check costs 15 coins.</p><p>Real-life guide: use a complete, balanced diet appropriate to life stage. Raw meat can carry pathogens; bones can fracture teeth or obstruct the gut. Ask your veterinarian before changing diets.</p><p>Breathing difficulty, collapse, heat illness, or uncontrolled bleeding need urgent veterinary attention. These game stats do not diagnose or treat real dogs.</p>`,[['Routine check · 15 coins',()=>{act('vet');closePanel();}]]),2.6);
addInteraction('daycareCare','Supervised care',230,1,()=>panel('DAYCARE MEADOW','A supervised play break','<p>Watch your puppy explore the play mat, then take a quiet nap. Fee: 10 coins on completion, once per day. Cancel without charge.</p>',[['Check in · 10 coins',startDaycare]]),2.6);
addInteraction('clinic','Enter clinic',clinicDoor.x,clinicDoor.z,()=>enterRoom('clinic',190),2.6);
addInteraction('daycare','Enter daycare',daycareDoor.x,daycareDoor.z,()=>enterRoom('daycare',230),2.6);
addInteraction('clinicExit','Leave clinic',190,5.5,()=>teleport('town',clinicDoor.x,clinicDoor.z+1));
addInteraction('daycareExit','Leave daycare',230,5.5,()=>teleport('town',daycareDoor.x,daycareDoor.z+1));
addInteraction('training','Training field',13,0,()=>panel('TRAINING FIELD','Train together',`<p>Practice reward-based recall with your puppy, or enter the five-gate adult rally route. Adult course requires age 365 and skill 25. Current: ${state.ageDays} days / skill ${state.skill}.</p>`,[['Recall practice',()=>{closePanel();careActivity('train',{x:player.position.x+1,z:player.position.z});}],['Start adult rally',()=>startMission('agility')]]),2.3);
addInteraction('scent','Start scent search',-22,-16,()=>startMission('scent'),2.5);
sign('SCENT START',-22,1.4,-17.2,3);sign('PLAY',152,1.5,0,2);sign('RECALL',147,1.5,1.7,2);

function findNearest(){if(activity||mission||alignment){nearest=null;return;}let best=null,dist=Infinity;for(const i of interactions){const d=Math.hypot(player.position.x-i.x,player.position.z-i.z);if(d<i.radius&&d<dist){best=i;dist=d;}}nearest=best;}
function updateGuide(){let id;if(state.location==='clinic'||state.location==='daycare')id=state.location+'Exit';else if(!state.dog)id=state.location==='shop'?'puppy1':'shopDoor';else if(!state.fed)id=state.location==='home'?'bowls':state.location==='shop'?'shopExit':'homeDoor';else if(!state.played)id=state.location==='home'?'play':'homeDoor';else if(!state.trained)id=state.location==='home'?'recall':'training';else id=state.location==='home'?'bed':'scent';const target=interactions.find(i=>i.id===id);guide.visible=!mission&&!activity&&!!target;if(target){guide.position.set(target.x,.15,target.z);const d=Math.round(Math.hypot(target.x-player.position.x,target.z-player.position.z));const controls=input.activeMethod==='controller'?'Left stick move · right stick look · primary button interact · L3 sprint':'WASD move · mouse/drag look · E interact · Shift sprint';$('hint').textContent=(mission?'Follow the marked course':target.label+' · '+d+' m')+' · '+controls;}}
function beginInteraction(){if(!running||paused||$('panel').open||$('welcome').open||$('controlSettings').open||$('purchaseConfirm').open||camMode===2)return;findNearest();if(!nearest)return;const outward=player.position.clone().sub(new THREE.Vector3(nearest.x,player.position.y,nearest.z));outward.y=0;if(outward.lengthSq()<.01)outward.set(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));outward.normalize();const distance=Math.min(.8,Math.max(.35,nearest.radius*.38));const target=new THREE.Vector3(nearest.x+outward.x*distance,groundHeightAt(nearest.x+outward.x*distance,nearest.z+outward.z*distance),nearest.z+outward.z*distance);if(movementBlocked(target.x,target.z,.3))target.copy(player.position);alignment={interaction:nearest,target,facing:Math.atan2(nearest.x-target.x,nearest.z-target.z)};nearest=null;}
function cancelCurrent(){if($('purchaseConfirm').open){closePurchase();return;}if($('controlSettings').open){$('controlSettings').close();return;}if($('panel').open){closePanel();return;}if(alignment){alignment=null;return;}if(!mission&&!activity)return;mission=null;activity=null;beacon.visible=false;if(ball){scene.remove(ball);ball=null;}dogTrail=[];toast('Activity ended. No reward or care credit was awarded.');updateHUD();}
$('interact').onclick=beginInteraction;
$('cancelActivity').onclick=cancelCurrent;
$('welcome').addEventListener('cancel',event=>event.preventDefault());
function setCamera(){camMode=(camMode+1)%3;followCamera.cinematic=camMode===2;followCamera.distance=camMode===1?3.35:6.3;$('camera').textContent='Camera: '+['Follow','Close','Cinematic'][camMode];document.body.classList.toggle('cinematic',camMode===2);input.clear();if(camMode===2)toast('Cinematic orbit pauses activities. Change camera again to return.');}
$('camera').onclick=setCamera;
let lowQuality=false;$('quality').onclick=()=>{lowQuality=!lowQuality;renderer.setPixelRatio(lowQuality?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!lowQuality;$('quality').textContent='Quality: '+(lowQuality?'Performance':'Balanced');};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is not supported here. Use your browser’s fullscreen option.');}};
function pause(){if($('welcome').open)return;paused=!paused;$('pause').textContent=paused?'Resume':'Pause';input.clear();if(paused){save();toast('Paused. Your progress is saved.');}}
$('pause').onclick=pause;
$('settings').onclick=()=>{input.clear();$('controlSettings').showModal();};
$('closeSettings').onclick=()=>{$('controlSettings').close();input.clear();};
const settingBindings=[['mouseSensitivity','mouseSensitivityValue',value=>input.settings.mouseSensitivity=.0022*value],['horizontalSensitivity','horizontalSensitivityValue',value=>input.settings.horizontalSensitivity=2.2*value],['verticalSensitivity','verticalSensitivityValue',value=>input.settings.verticalSensitivity=1.7*value],['deadzone','deadzoneValue',value=>input.settings.deadzone=value]];
for(const [id,output,apply] of settingBindings){$(id).addEventListener('input',()=>{const value=Number($(id).value);$(output).value=id==='deadzone'?value.toFixed(2):value.toFixed(1);apply(value);});}
$('invertY').addEventListener('change',()=>{input.settings.invertY=$('invertY').checked;});
window.addEventListener('blur',()=>{input.clear();if(running)save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){input.clear();if(running){paused=true;$('pause').textContent='Resume';save();}}});
renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();followCamera.zoom(event.deltaY*.004);},{passive:false});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function animateDog(g,moving,time,sniff=false){g.userData.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(time*11+(i===0||i===3?0:Math.PI))*.5:0);g.userData.tail.rotation.y=Math.sin(time*7)*.35;g.userData.head.rotation.x=(sniff||g===activeDog&&mission?.kind==='scent')?0.28:0;}
function moveDog(target,dt,speed=3.5){const delta=target.clone().sub(activeDog.position);delta.y=0;const len=delta.length();if(len>.08){const next=activeDog.position.clone().addScaledVector(delta.normalize(),Math.min(len,speed*dt));if(!hit(next.x,activeDog.position.z))activeDog.position.x=next.x;if(!hit(activeDog.position.x,next.z))activeDog.position.z=next.z;activeDog.rotation.y=Math.atan2(delta.x,delta.z);}animateDog(activeDog,len>.1,clock);}
function followDog(dt){if(!activeDog)return;const last=dogTrail[dogTrail.length-1];if(!last||last.distanceTo(player.position)>.3)dogTrail.push(player.position.clone());while(dogTrail.length>1&&activeDog.position.distanceTo(dogTrail[0])<.4)dogTrail.shift();if(dogTrail.length>180)dogTrail.shift();if(activeDog.position.distanceTo(player.position)>.9&&dogTrail.length)moveDog(dogTrail[0],dt);else animateDog(activeDog,false,clock);}
function updateYardDog(dt){
 if(state.location!=='town')return;
 if(yardDogState.wait>0){yardDogState.wait-=dt;yardDogState.mode='sniff';animateDog(yardDog,false,clock,true);return;}
 const target=yardRoute[yardDogState.index],delta=target.clone().sub(yardDog.position);delta.y=0;const len=delta.length();yardDogState.mode='roam';
 if(len<.18){yardDogState.index=(yardDogState.index+1)%yardRoute.length;yardDogState.wait=1.1+(yardDogState.index%3)*.55;animateDog(yardDog,false,clock,true);return;}
 const next=yardDog.position.clone().addScaledVector(delta.normalize(),Math.min(len,1.25*dt));next.x=Math.max(yardBounds.minX,Math.min(yardBounds.maxX,next.x));next.z=Math.max(yardBounds.minZ,Math.min(yardBounds.maxZ,next.z));yardDog.position.copy(next);yardDog.rotation.y=Math.atan2(delta.x,delta.z);animateDog(yardDog,true,clock);
}
function updateActivity(dt){if(!activity||!activeDog)return;activity.time+=dt;const a=activity;
 if(a.kind==='daycare'){
 const points=[[228,-.5],[232,-.5],[230,-2],[230,-4]];
 const p=points[a.phase],target=new THREE.Vector3(p[0],0,p[1]);
 moveDog(target,dt,a.phase===3?1.2:2);
 $('objective').textContent=a.phase===3?'Daycare: quiet recovery beside the carer':`Daycare: supervised exploration ${a.phase+1} of 3`;
 if(activeDog.position.distanceTo(target)<.25){a.settled+=dt;if(a.settled>(a.phase===3?4:1.5)){a.phase++;a.settled=0;if(a.phase===4){activity=null;dogTrail=[];act('daycare');}}}
 if(activity&&a.time>60){activity=null;toast('Session stopped. No payment collected.');updateHUD();}
 return;
 }
 if(a.kind==='play'){if(a.phase==='throw'){const t=Math.min(a.time/.75,1);ball.position.lerpVectors(a.start,a.end,t);ball.position.y=.15+Math.sin(t*Math.PI)*1.6;if(t===1){a.phase='fetch';a.time=0;}}else if(a.phase==='fetch'){moveDog(a.end,dt);if(activeDog.position.distanceTo(a.end)<.2){a.phase='return';}}else{moveDog(player.position,dt);ball.position.copy(activeDog.position).add(new THREE.Vector3(0,.3,.25));if(activeDog.position.distanceTo(player.position)<.6){scene.remove(ball);ball=null;activity=null;act('play');}}}
 else {moveDog(a.end,dt);if(activeDog.position.distanceTo(a.end)<.3){activeDog.userData.head.rotation.x=a.kind==='feed'?.7:0;if(a.time>3.5){activity=null;act(a.kind);}}}
}
function updateMission(dt){if(!mission||!activeDog)return;mission.time+=dt;const pts=mission.kind==='scent'?scentPoints:coursePoints,p=pts[mission.index];beacon.position.set(p.x,.12,p.z);beacon.visible=mission.kind==='agility'||Math.hypot(player.position.x-p.x,player.position.z-p.z)<7;
 const distance=Math.hypot(player.position.x-p.x,player.position.z-p.z);
 if(mission.kind==='scent'&&distance<7)moveDog(new THREE.Vector3(p.x,0,p.z),dt,2);else moveDog(player.position.clone().add(new THREE.Vector3(.8,0,.7)),dt);
 if(distance<1.5&&Math.hypot(activeDog.position.x-p.x,activeDog.position.z-p.z)<1.8){mission.index++;toast(mission.kind==='scent'?'Found a hidden article! Good teamwork.':'Checkpoint cleared.');if(mission.index===pts.length){const action=mission.kind==='scent'?'scentWin':'agilityWin';mission=null;beacon.visible=false;act(action);}updateHUD();}
 if(mission&&mission.time>240){mission=null;beacon.visible=false;toast('Session ended for a rest break. You can try again.');updateHUD();}
}
let last=performance.now(),lastSave=0;
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.05);last=now;clock+=dt;
 input.update(dt);const look=input.consumeLook();followCamera.addLook(look,dt);
 if(input.consume('Pause'))pause();if(input.consume('Cancel'))cancelCurrent();if(input.consume('Camera'))setCamera();if(input.consume('Interact'))beginInteraction();
 const blocked=!running||paused||$('panel').open||$('welcome').open||$('controlSettings').open||$('purchaseConfirm').open||camMode===2;
 if(!blocked){
 if(alignment){if(playerController.alignTo(alignment.target,alignment.facing,dt)){const action=alignment.interaction.action;alignment=null;action();}}
 else {locomotionState=playerController.update(dt,input.move,input.magnitude,input.sprint,followCamera.yaw,roomCenters[state.location]!==undefined,!!activity);footstepTime+=locomotionState.speed*dt;}
 if(activity)updateActivity(dt);else if(mission)updateMission(dt);else followDog(dt);updateYardDog(dt);
 if(now-lastSave>5000){save();lastSave=now;}
 }else locomotionState=playerController.stop(dt);
 findNearest();updateGuide();$('cancelActivity').hidden=!mission&&!activity;$('interact').disabled=!nearest||blocked;$('interact').textContent=nearest?'E · '+nearest.label:activity?'Activity in progress':mission?'Follow the course':'Walk closer to interact';
 $('inputMethod').textContent=input.activeMethod==='controller'?'Controller':input.activeMethod==='touch'?'Touch controls':'Keyboard & mouse';if(nearest)$('interact').textContent=input.prompt('Interact')+' · '+nearest.label;
 $('place').textContent=state.location==='shop'?"Rene's pet shop":state.location==='home'?'Your home':state.location==='clinic'?"Rene's clinic":state.location==='daycare'?'Daycare Meadow':'Willowbrook';
 shopDogs.forEach((d,i)=>animateDog(d,false,clock+i));if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible');}
 followCamera.update(dt,player,roomCenters[state.location]!==undefined,clock);renderer.render(scene,camera);
}
$('parent').value=state.parent;$('parent').disabled=!!state.dog;
$('start').textContent=state.dog?'Continue your journey':'Enter Willowbrook';
$('start').onclick=()=>{if(!state.dog){Sim.chooseParent(state,$('parent').value);const replacement=human(state.parent);player.clear();while(replacement.children.length)player.add(replacement.children[0]);player.userData=replacement.userData;}running=true;$('welcome').close();save();updateHUD();toast('Move with WASD or the left stick. Use the mouse or right stick to control the camera.');};
updateHUD();$('welcome').showModal();camera.position.copy(player.position).add(new THREE.Vector3(0,5,9));requestAnimationFrame(loop);
// Read-only diagnostics for QA. No cheat teleports or reward shortcuts in shipping build.
window.BreedWorld={snapshot:()=>({state:JSON.parse(JSON.stringify(state)),player:{x:player.position.x,y:player.position.y,z:player.position.z,rotation:player.rotation.y},dog:activeDog?{x:activeDog.position.x,z:activeDog.position.z}:null,yardDog:{x:yardDog.position.x,z:yardDog.position.z,mode:yardDogState.mode,bounds:{...yardBounds}},environment:{fictionalResidentialYard:true,roadsideProps:true,privateReferenceMediaShipped:false},nearest:nearest?.id||null,mission:mission?{kind:mission.kind,index:mission.index}:null,activity:activity?.kind||null,camera:camMode,controller:{...locomotionState,input:input.activeMethod,connected:input.controllerConnected,yaw:followCamera.yaw,pitch:followCamera.pitch,distance:followCamera.currentDistance},renderer:renderer.info.render,colliders:colliders.length})};
