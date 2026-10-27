const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'../play-3d.html').replaceAll('\\','/'));
 await page.locator('#start').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.waitForTimeout(150);assert(await page.locator('#welcome').evaluate(e=>e.open),'welcome cannot be dismissed before start');
 await page.locator('#start').click();await page.locator('#quality').click();
 const snap=()=>page.evaluate(()=>BreedWorld.snapshot());
 async function walk(x,z){
  let previous=[];
  for(let i=0;i<150;i++){
   const p=(await snap()).player,dx=x-p.x,dz=z-p.z;
   if(Math.hypot(dx,dz)<.48){for(const k of previous)await page.keyboard.up(k);await page.keyboard.up('Shift');return;}
   const held=[];if(Math.abs(dx)>.22)held.push(dx<0?'a':'d');if(Math.abs(dz)>.22)held.push(dz<0?'w':'s');
   for(const k of previous)if(!held.includes(k))await page.keyboard.up(k);for(const k of held)if(!previous.includes(k))await page.keyboard.down(k);previous=held;
   if(Math.hypot(dx,dz)>2)await page.keyboard.down('Shift');else await page.keyboard.up('Shift');
   await page.waitForTimeout(100);
  }
  throw Error('Walk failed to '+x+','+z+' at '+JSON.stringify((await snap()).player));
 }
 async function interact(id){await page.waitForTimeout(100);assert.equal((await snap()).nearest,id);await page.keyboard.press('e');await page.waitForTimeout(1000);}
 async function settle(){await page.waitForFunction(()=>!BreedWorld.snapshot().activity,{},{timeout:20000});}
 await walk(0,-3);await walk(-15,-3.5);await interact('shopDoor');assert.equal((await snap()).state.location,'shop');
 await walk(109,.9);await interact('puppy1');await page.waitForFunction(()=>BreedWorld.snapshot().controller.distance<4,{},{timeout:5000});await page.locator('[data-adopt="coco"]').click();assert.equal((await snap()).state.dog,'coco');
 await page.screenshot({path:path.resolve(__dirname,'../qa-shop.png')});console.log('PASS: actual walking, enter shop, select Coco');
 await walk(110,5);await interact('shopExit');await walk(-15,8);await walk(0,8);await walk(0,31);await walk(16,31);await interact('homeDoor');assert.equal((await snap()).state.location,'home');await page.waitForFunction(()=>BreedWorld.snapshot().controller.distance<=4.25,{},{timeout:5000});
 await walk(145.7,1.5);await interact('bowls');await settle();assert((await snap()).state.fed);
 await walk(152,1.1);await interact('play');await settle();assert((await snap()).state.played);
 await walk(147,3);await interact('recall');await settle();assert((await snap()).state.trained);
 await page.screenshot({path:path.resolve(__dirname,'../qa-home.png')});console.log('PASS: walk home, feed, real-time fetch, recall');
 await walk(154,-2.5);await interact('bed');await page.getByRole('button',{name:'Sleep until next day',exact:true}).click();assert.equal((await snap()).state.day,2);assert.equal((await snap()).state.ageDays,84);
 await page.reload();await page.locator('#start').click();assert.equal((await snap()).state.dog,'coco');assert.equal((await snap()).state.day,2);assert.equal((await snap()).state.location,'home');console.log('PASS: sleep and save/reload');
 await page.locator('#camera').click();await page.locator('#camera').click();assert.equal((await snap()).camera,2);let pos=(await snap()).player;await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');assert.deepEqual((await snap()).player,pos);await page.locator('#camera').click();console.log('PASS: cinematic mode pauses gameplay');
 // Isolated saved fixture tests course completion without walking the long town a second time.
 const fixture=(await snap()).state;fixture.location='town';fixture.position={x:-22,z:-16};await page.addInitScript(s=>localStorage.setItem('breedBeyond3D.v3',JSON.stringify(s)),fixture);await page.reload();await page.locator('#start').click();await page.locator('#quality').click();await interact('scent');
 await walk(-27,-23);await page.waitForFunction(()=>BreedWorld.snapshot().mission?.index===1,{},{timeout:12000});
 await walk(-18,-25);await page.waitForFunction(()=>BreedWorld.snapshot().mission?.index===2,{},{timeout:12000});
 await walk(-16,-19);await page.waitForFunction(()=>!BreedWorld.snapshot().mission,{},{timeout:12000});assert((await snap()).state.scentDone);assert.equal((await snap()).state.ribbons,1);console.log('PASS: three physical scent finds and one reward');
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:path.resolve(__dirname,'../qa-mobile.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: mobile layout, no runtime exceptions');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
