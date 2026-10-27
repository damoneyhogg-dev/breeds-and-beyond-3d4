var dogPhotos={coco:'assets/coco.jpg',atlas:'assets/atlas.jpg',nova:'assets/nova.jpg'};
const dogs=[
  {id:'coco',name:'Coco',breed:'Yorkshire Terrier',league:'Small & Precision',emoji:'🐶',score:72,traits:'smart · calm · loving · scent talent'},
  {id:'atlas',name:'Atlas',breed:'Pocket Bully',league:'Compact & Power',emoji:'🐕',score:70,traits:'steady · strong · focused'},
  {id:'nova',name:'Nova',breed:'Belgian Malinois',league:'Working & Utility',emoji:'🐕‍🦺',score:78,traits:'alert · athletic · eager to learn'}
];
const events=[
  {id:'scent',name:'Scent Search',icon:'👃',desc:'Find three hidden articles',allowed:['coco','atlas','nova'],cost:15,reward:45},
  {id:'rally',name:'Rally Obedience',icon:'🦮',desc:'Follow a precision course',allowed:['coco','atlas','nova'],cost:15,reward:45},
  {id:'agility',name:'Scaled Agility',icon:'🏃',desc:'Size-adjusted obstacle run',allowed:['coco','atlas','nova'],cost:20,reward:55},
  {id:'retrieve',name:'Water Retrieve',icon:'🌊',desc:'Short, supervised retrieve',allowed:['coco','atlas','nova'],cost:20,reward:55}
];
let selectedDog='coco',selectedEvent='scent',coins=250;
let progress={ribbons:0,events:0,best:0};
let life={name:'Coco',breed:'Yorkshire Terrier',day:1,ageDays:42,health:88,energy:82,bond:18,obedience:8,scent:12,weight:55,action:'Waiting for care'};
const people=[
  {id:'morgan',name:'Morgan',role:'Patient home parent',strength:'Calm routines, bonding, and gentle socialization',bonus:'bond'},
  {id:'jaylen',name:'Jaylen',role:'Active home parent',strength:'Exercise planning, play, and enrichment',bonus:'energy'},
  {id:'samira',name:'Samira',role:'Learning-focused home parent',strength:'Daily lessons, structure, and scent games',bonus:'skills'},
  {id:'devon',name:'Devon',role:'Careful home parent',strength:'Nutrition tracking, rest, and body-condition checks',bonus:'health'}
];
let selectedParents=[],selectedPuppy=null,setupComplete=false;
const baseLife={name:'Coco',breed:'Yorkshire Terrier',day:1,ageDays:42,health:88,energy:82,bond:18,obedience:8,scent:12,weight:55,action:'Waiting for care'};
const parentEffects={bond:{label:'Bond',changes:{bond:10},text:'A calm, connected home gives the puppy an early trust boost.'},energy:{label:'Energy',changes:{energy:10},text:'An active home gives the puppy extra energy for healthy play and exploration.'},skills:{label:'Skills',changes:{obedience:5,scent:5},text:'A learning-focused home gives the puppy a head start in obedience and scent work.'},health:{label:'Health',changes:{health:8,weight:4},text:'A careful home gives the puppy a stronger health and body-condition foundation.'}};
const reneServices={health:{label:'Health check',text:'Rene checks paws, breathing, hydration, and comfort. Starting health +8.',changes:{health:8}},nutrition:{label:'Nutrition plan',text:'Rene sets a portion-and-water routine for steady growth. Health +4 and energy +5.',changes:{health:4,energy:5}},training:{label:'Positive training plan',text:'Rene maps short reward-based lessons. Obedience +5 and bond +3.',changes:{obedience:5,bond:3}}};
let reneBenefits={};
let homeRoutine={arrival:false,settle:false,connect:false};
let worldPosition={x:14,y:24};
function clampStat(value){return Math.max(0,Math.min(100,value))}
function applyChanges(target,changes){Object.entries(changes).forEach(([key,value])=>target[key]=clampStat((target[key]||0)+value))}
function selectedParentEffects(){const result={};selectedParents.forEach(id=>{const effect=parentEffects[people.find(p=>p.id===id)?.bonus];if(effect)applyChanges(result,effect.changes)});return result}
function renderSetupSummary(){const summary=document.querySelector('#setupSummary');if(!summary)return;const chosen=people.filter(p=>selectedParents.includes(p.id));const effects=chosen.map(p=>parentEffects[p.bonus]);const labels=effects.map(e=>e.label);const benefitLabels=Object.keys(reneBenefits).map(key=>reneServices[key].label);summary.innerHTML=`<strong>Starting home summary</strong><span>${chosen.length?`${chosen.map(p=>p.name).join(' + ')}: ${labels.join(', ')}.`:'Choose one or two parents to preview the starting strengths.'} ${benefitLabels.length?`Rene benefits: ${benefitLabels.join(', ')}.`:''}</span>`}
function applyStartingProfile(){const puppy=dogs.find(d=>d.id===selectedPuppy);if(!puppy)return;const next={...baseLife,name:puppy.name,breed:puppy.breed};applyChanges(next,selectedParentEffects());Object.values(reneBenefits).forEach(changes=>applyChanges(next,changes));life=next}
const rosterEl=document.querySelector('#roster'),eventsEl=document.querySelector('#events'),matchCard=document.querySelector('#matchCard'),enterButton=document.querySelector('#enterButton');
function renderEvents(){eventsEl.innerHTML=events.map(e=>`<button class="event ${e.id===selectedEvent?'selected':''}" data-event="${e.id}"><strong>${e.icon} ${e.name}</strong><span>${e.desc} · ${e.cost} coins</span></button>`).join('');document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{selectedEvent=b.dataset.event;renderEvents();renderMatch()})}
function renderMatch(){const d=dogs.find(x=>x.id===selectedDog),e=events.find(x=>x.id===selectedEvent);const rivals={coco:'Milo the Papillon',atlas:'Briar the Staffordshire Terrier',nova:'Rook the German Shepherd'};matchCard.innerHTML=`<strong>${d.name} vs. ${rivals[d.id]}</strong><br><span>${e.name} · ${d.league} · performance tier: Novice</span><br><small>Match is based on event rating, size-safe equipment, fitness, and recent form.</small>`;enterButton.disabled=coins<e.cost;enterButton.textContent=coins<e.cost?'Not enough coins':`Enter for ${e.cost} coins`}
function renderProgress(){const title=progress.ribbons>=10?'Grand Champion':progress.ribbons>=5?'Paw Circuit Champion':progress.ribbons>=3?'Rising Team':'First Paws';document.querySelector('#ribbonCount').textContent=progress.ribbons;document.querySelector('#eventCount').textContent=progress.events;document.querySelector('#bestScore').textContent=progress.best;document.querySelector('#seasonTitle').textContent=title;document.querySelector('#progressNote').textContent=progress.events?`Keep building safely. ${Math.max(0,3-progress.ribbons)} more ribbon(s) unlock the next title.`:'Complete a safe event to earn your first ribbon.'}
function finish(){const d=dogs.find(x=>x.id===selectedDog),e=events.find(x=>x.id===selectedEvent);coins-=e.cost;const score=Math.min(100,d.score+Math.floor(Math.random()*20));const won=score>=70;const payout=won?e.reward:Math.floor(e.cost/2);coins+=payout;progress.events+=1;progress.best=Math.max(progress.best,score);if(won)progress.ribbons+=1;document.querySelector('#coins').textContent=coins;document.querySelector('#resultTitle').textContent=won?`${d.name} earns a ribbon!`:`${d.name} completes the course`;document.querySelector('#resultText').textContent=`Score: ${score}/100. ${won?`${d.name} showed ${d.traits.split(' · ')[0]} focus in ${e.name}.`:'A safe completion is still progress.'} Reward: ${payout} virtual coins. Rest and hydrate before the next event.`;document.querySelector('#resultPanel').hidden=false;renderProgress();renderMatch();window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}
enterButton.onclick=finish;document.querySelector('#againButton').onclick=()=>document.querySelector('#resultPanel').hidden=true;renderRoster();renderEvents();renderMatch();
const mapStatus=document.querySelector('#mapStatus');document.querySelectorAll('.location').forEach(location=>location.onclick=()=>{document.querySelectorAll('.location').forEach(x=>x.classList.remove('active'));location.classList.add('active');const place=location.dataset.location;mapStatus.textContent=place==='Scent Village'?'You arrived at Scent Village. Coco is ready for a hidden-article trial.':`You are at ${place}. Rest, prepare, and return to competition when ready.`;document.querySelector('#scentPanel').hidden=place!=='Scent Village';if(place==='Scent Village')renderSearch()});
function renderSearch(){const targets=['Cap','Glove','Scarf'],target=targets[Math.floor(Math.random()*targets.length)];document.querySelector('#searchOptions').innerHTML=targets.map(x=>`<button class="search-option" data-target="${x}" ${setupComplete?'':'disabled'}>${x}</button>`).join('');document.querySelector('#searchResult').textContent=setupComplete?'':'Complete the puppy setup before starting a scent search.';document.querySelectorAll('.search-option').forEach(b=>b.onclick=()=>{if(!setupComplete||life.health<25||life.energy<20){document.querySelector('#searchResult').textContent='Your dog must be home, rested, and healthy before searching.';return}const result=document.querySelector('#searchResult');if(b.dataset.target===target){coins+=20;life.energy=Math.max(0,life.energy-8);life.action='Completed a scent-search trial; cooldown needed';document.querySelector('#coins').textContent=coins;result.textContent=`${dogs.find(d=>d.id===selectedDog).name} found the ${target}! +20 virtual coins for accurate, calm searching.`}else result.textContent=`${dogs.find(d=>d.id===selectedDog).name} checked that article carefully. Try another choice.`;saveGame();renderLife()})}

// Field-planning layer: conditions change the difficulty, but never force unsafe play.
const missionData={
  article:{name:'Clothing Article Trial',base:18,reward:30,target:'a scented clothing article'},
  treasure:{name:'Trail Treasure Hunt',base:24,reward:42,target:'a marked training treasure'},
  rescue:{name:'Lost-Pet Marker Search',base:20,reward:38,target:'a lost-pet marker'},
  vehicle:{name:'Search Vehicle Bay',base:28,reward:50,target:'a safe search token'}
};
const conditionEffects={Clear:0,'Light rain':6,Windy:8,Warm:10,'Training field':0,'Woodland trail':5,'Village rooms':3,Waterfront:7};
function renderPeople(){const host=document.querySelector('#parentChoices');if(!host)return;host.innerHTML=people.map(p=>`<button class="person-choice ${selectedParents.includes(p.id)?'selected':''}" data-parent="${p.id}" aria-pressed="${selectedParents.includes(p.id)}"><span class="person-mark">${p.name[0]}</span><span><strong>${p.name}</strong><small>${p.role}</small><small>${p.strength}</small></span></button>`).join('');document.querySelectorAll('[data-parent]').forEach(button=>button.onclick=()=>{const id=button.dataset.parent;if(selectedParents.includes(id)){selectedParents=selectedParents.filter(x=>x!==id)}else if(selectedParents.length<2){selectedParents=[...selectedParents,id]}else{document.querySelector('#peopleResult').textContent='Choose up to two pet parents. Remove one first if you want to change the pair.';return}renderPeople();const chosen=people.filter(p=>selectedParents.includes(p.id));const names=chosen.map(p=>p.name).join(' & ');document.querySelector('#parentCount').textContent=selectedParents.length?`${selectedParents.length} selected`:'Choose 1–2';document.querySelector('#peopleResult').textContent=selectedParents.length?`${names} will be ${selectedParents.length===1?'your pet parent':'the pet parents'} for ${life.name}. Rene will handle breeding guidance, veterinary care, and training.`:'Choose a pet parent to begin your household.';saveGame();});}
document.querySelector('#parentChoices')?.addEventListener('click',()=>setTimeout(()=>{if(selectedPuppy&&!setupComplete)applyStartingProfile();renderSetupSummary();renderLife();saveGame()},0));
let saved=null;
try { saved=JSON.parse(localStorage.getItem('breedBeyondSave')||'null'); }
catch { localStorage.removeItem('breedBeyondSave'); }
  if(saved&&Number.isFinite(saved.coins)){coins=saved.coins;progress=saved.progress||progress;life=saved.life||life;selectedDog=dogs.some(d=>d.id===saved.selectedDog)?saved.selectedDog:selectedDog;selectedEvent=events.some(e=>e.id===saved.selectedEvent)?saved.selectedEvent:selectedEvent;selectedParents=Array.isArray(saved.selectedParents)?saved.selectedParents:[];selectedPuppy=dogs.some(d=>d.id===saved.selectedPuppy)?saved.selectedPuppy:null;setupComplete=Boolean(saved.setupComplete);reneBenefits=saved.reneBenefits||{};homeRoutine={...homeRoutine,...(saved.homeRoutine||{})};worldPosition={...worldPosition,...(saved.worldPosition||{})};document.querySelector('#coins').textContent=coins}
function saveGame(){localStorage.setItem('breedBeyondSave',JSON.stringify({version:2,coins,selectedDog,selectedEvent,progress,life,selectedParents,selectedPuppy,setupComplete,reneBenefits,homeRoutine,worldPosition,updated:new Date().toISOString()}));const status=document.querySelector('#saveStatus');if(status){status.textContent='Saved locally';setTimeout(()=>status.textContent='Auto-save on',900)}}
function useReneService(key){const service=reneServices[key],result=document.querySelector('#reneResult');if(!service||reneBenefits[key]){if(result)result.textContent=service?`${service.label} is already part of this puppy's care plan.`:'Choose one of Rene\'s services.';return}reneBenefits[key]=service.changes;if(selectedPuppy&&!setupComplete)applyStartingProfile();else if(selectedPuppy)applyChanges(life,service.changes);if(result)result.textContent=service.text;document.querySelector(`[data-service="${key}"]`).disabled=true;renderSetupSummary();renderLife();saveGame()}
document.querySelectorAll('.rene-service').forEach(button=>button.addEventListener('click',()=>useReneService(button.dataset.service)));
function renderReadiness(){const readiness=document.querySelector('#readiness');if(!readiness)return;readiness.innerHTML=dogs.map(d=>{const value=d.id===selectedPuppy&&setupComplete?currentDogReadiness(d):d.score;return `<div class="readiness-row"><span><strong>${d.name}</strong><small>${d.breed}</small></span><span class="meter"><i style="width:${Math.max(35,value)}%"></i></span><b>${value}% ready</b></div>`}).join('')}
function renderBriefing(){const mission=missionData[document.querySelector('#missionSelect').value];const weather=document.querySelector('#weatherSelect').value;const terrain=document.querySelector('#terrainSelect').value;const difficulty=mission.base+(conditionEffects[weather]||0)+(conditionEffects[terrain]||0);const dog=dogs.find(d=>d.id===selectedDog);const safe=weather==='Warm'&&dog.id==='atlas'?'Use shade and a short course; the referee may stop for heat signs.':weather==='Warm'?'Schedule water and cooldown breaks before starting.':'The route is suitable for a supervised, positive-reinforcement search.';document.querySelector('#missionBadge').textContent=`Difficulty ${difficulty}`;document.querySelector('#conditionReadout').innerHTML=`<strong>${mission.name}</strong><br>${dog.name} will search for ${mission.target}. ${safe}<br><small>Reward: ${mission.reward} virtual coins · no real-money wagering.</small>`;saveGame()}
['missionSelect','weatherSelect','terrainSelect'].forEach(id=>document.querySelector('#'+id)?.addEventListener('change',renderBriefing));document.querySelector('#briefingButton')?.addEventListener('click',renderBriefing);renderPeople();
const oldFinish=finish;enterButton.onclick=()=>{oldFinish();saveGame();renderReadiness()};document.querySelector('#againButton').addEventListener('click',()=>{saveGame();renderReadiness()});renderReadiness();renderProgress();renderBriefing();
let activeClue=null,missionStarted=false,fieldStep=0,fieldTargetZone=2,fieldMissionKey=null;
const clueSets={article:['A cool breeze carries the scent toward the bench.','A clean decoy has no matching trace.','Coco pauses beside a blue training marker.'],treasure:['The trail crosses soft ground near the oak.','A bright ribbon marks a safe boundary.','The scent is strongest beside the route sign.'],rescue:['A paw-print marker leads away from the fountain.','The quiet path holds the freshest trace.','A volunteer points toward the shaded gate.'],vehicle:['The van doors are open for a supervised search.','Rubber mats create a scent break.','The target is near the orange safety cone.']};
function fieldView(step,caption){const dog=dogs.find(d=>d.id===selectedDog);const dogEl=document.querySelector('#fieldDog'),marker=document.querySelector('#targetMarker'),path=document.querySelector('#searchPath');document.querySelector('#fieldScene').classList.toggle('searching',step>0&&step<3);document.querySelector('#fieldStepLabel').textContent=`Step ${step} of 3`;document.querySelector('#fieldMeter').style.width=`${step*33.333}%`;document.querySelector('#fieldCaption').textContent=caption;dogEl.textContent=dog.name;dogEl.style.left=step===0?'10%':step===1?'43%':'76%';dogEl.style.top=step===0?'18%':step===1?'8%':'18%';marker.style.opacity=step>=3?'1':'.25';marker.style.transform=step>=3?'scale(1)':'scale(.7)';path.style.left=step===0?'10%':step===1?'25%':'45%';path.style.right=step===0?'10%':step===1?'25%':'8%';document.querySelector('#zoneOne').style.background=step>=1?'#b8e0bd':'rgba(255,255,255,.7)';document.querySelector('#zoneTwo').style.background=step>=2?'#b8e0bd':'rgba(255,255,255,.7)';document.querySelector('#zoneThree').style.background=step>=3?'#f3d08a':'rgba(255,255,255,.7)'}
function launchFieldMission(){
  if(!setupComplete){document.querySelector('#fieldResult').textContent='Complete the parent, puppy, and walk-home setup before launching a field mission.';return;}
  if(life.health<25||life.energy<20){document.querySelector('#fieldResult').textContent='Your dog needs rest, water, or care before entering the field.';return;}
  const key=document.querySelector('#missionSelect').value;const mission=missionData[key];const weather=document.querySelector('#weatherSelect').value;const terrain=document.querySelector('#terrainSelect').value;const options=[...clueSets[key]].sort(()=>Math.random()-.5);activeClue=options[0];fieldMissionKey=key;fieldStep=0;missionStarted=true;document.querySelector('#fieldTitle').textContent=mission.name;document.querySelector('#fieldPrompt').textContent=`${dogs.find(d=>d.id===selectedDog).name} is entering the changing field. Follow the evidence to guide the search.`;document.querySelector('#fieldScore').textContent=`Difficulty ${mission.base+(conditionEffects[weather]||0)+(conditionEffects[terrain]||0)}`;document.querySelector('#evidenceGrid').innerHTML=options.map((x,i)=>`<button class="evidence" data-clue="${x}"><span>${i+1}</span>${x}</button>`).join('');document.querySelector('#fieldResult').textContent='';document.querySelector('#launchMission').disabled=true;fieldView(0,'The gate opens. Choose the strongest starting clue to send the dog toward the first search zone.');document.querySelectorAll('.evidence').forEach(b=>b.onclick=()=>resolveFieldMission(b.dataset.clue,key))}
function resolveFieldMission(clue,key){if(!missionStarted||!setupComplete)return;const mission=missionData[key],result=document.querySelector('#fieldResult'),correct=clue===activeClue;fieldStep+=1;fieldView(fieldStep,fieldStep<3?(correct?'The scent trail strengthens. The dog moves deeper into the field.':'A decoy is ruled out. The dog changes direction and keeps searching safely.'):`The target area is reached. ${correct?'The dog alerts calmly at the find.':'The team completes the route after checking the final zone.'}`);if(fieldStep<3){document.querySelector('#fieldPrompt').textContent=`Search zone ${fieldStep+1} of 3: choose the strongest new evidence clue.`;document.querySelectorAll('.evidence').forEach(b=>b.disabled=true);setTimeout(()=>document.querySelectorAll('.evidence').forEach(b=>b.disabled=false),350);activeClue=[...clueSets[key]].sort(()=>Math.random()-.5)[0];return}missionStarted=false;const payout=correct?mission.reward:Math.floor(mission.reward/2);coins+=payout;life.energy=Math.max(0,life.energy-12);life.action=`Completed ${mission.name}; cooldown needed`;document.querySelector('#coins').textContent=coins;document.querySelector('#fieldScore').textContent=correct?'Accurate find':'Safe completion';result.textContent=correct?`Excellent teamwork. ${dogs.find(d=>d.id===selectedDog).name} followed the changing evidence and found ${mission.target}. +${payout} virtual coins.`:`Good judgment: the search stayed safe and calm. The team receives ${payout} virtual coins for completing the route.`;document.querySelector('#fieldPrompt').textContent='Mission complete. Launch again to explore a new field layout.';document.querySelector('#launchMission').disabled=false;saveGame();renderReadiness();renderLife()}
document.querySelector('#launchMission')?.addEventListener('click',launchFieldMission);

function renderPuppyShop(){const host=document.querySelector('#puppyChoices');if(!host)return;const ready=selectedParents.length>0;host.innerHTML=dogs.map(d=>`<button class="puppy-card ${selectedPuppy===d.id?'selected':''} ${ready?'':'locked'}" data-puppy="${d.id}" ${ready?'':'disabled'}><img src="${dogPhotos[d.id]}" alt="${d.name}, ${d.breed}"><span><strong>${d.name}</strong><small>${d.breed}</small><small>${d.league}</small></span><b>${selectedPuppy===d.id?'CHOSEN':'VIEW MATCH'}</b></button>`).join('');document.querySelector('#setupBadge').textContent=ready?'Step 2 of 2':'Step 1 of 2';document.querySelector('#beginWalk').disabled=!ready||!selectedPuppy||setupComplete;document.querySelector('#beginWalk').textContent=setupComplete?'Walk complete':selectedPuppy?'Start walk home':'Choose a puppy to begin';document.querySelectorAll('[data-puppy]').forEach(button=>button.onclick=()=>{selectedPuppy=button.dataset.puppy;selectedDog=selectedPuppy;const puppy=dogs.find(d=>d.id===selectedPuppy);applyStartingProfile();document.querySelector('#setupResult').textContent=`${puppy.name} is a ${puppy.breed}. Rene has completed the first health and temperament check.`;renderPuppyShop();renderRoster();renderLife();saveGame()})}
function startWalkHome(){if(!selectedParents.length||!selectedPuppy||setupComplete)return;const puppy=dogs.find(d=>d.id===selectedPuppy),button=document.querySelector('#beginWalk'),card=document.querySelector('#walkHomeCard'),bar=document.querySelector('#walkProgress'),text=document.querySelector('#walkHomeText');button.disabled=true;card.hidden=false;document.querySelector('#setupPanel').classList.add('walking');text.textContent=`${puppy.name} sets off with ${selectedParents.length===1?'your pet parent':'the pet parents'}. Rene waves from the shop.`;bar.style.width='0%';requestAnimationFrame(()=>bar.style.width='100%');setTimeout(()=>{setupComplete=true;life.action='Walking home with the new puppy';text.textContent=`You made it home. ${puppy.name} is ready for gentle routines, rest, and a first training session.`;document.querySelector('#setupResult').textContent='Setup complete — continue below to begin your puppy’s first day.';document.querySelector('#setupBadge').textContent='Ready at home';document.querySelector('#setupPanel').classList.remove('walking');button.textContent='Walk complete';renderLife();saveGame();document.querySelector('.life-panel')?.scrollIntoView({behavior:'smooth',block:'start'});},2200)}
document.querySelector('#beginWalk')?.addEventListener('click',startWalkHome);
document.querySelector('#parentChoices')?.addEventListener('click',()=>setTimeout(renderPuppyShop,0));
renderPuppyShop();

function syncSetupState(){
  const chosen=people.filter(p=>selectedParents.includes(p.id));
  document.querySelector('#parentCount').textContent=selectedParents.length?`${selectedParents.length} selected`:'Choose 1-2';
  document.querySelector('#peopleResult').textContent=chosen.length?`${chosen.map(p=>p.name).join(' & ')} will be ${chosen.length===1?'your pet parent':'the pet parents'} for ${life.name}. Rene will handle breeding guidance, veterinary care, and training.`:'Choose a pet parent to begin your household.';
  if(selectedPuppy){const puppy=dogs.find(d=>d.id===selectedPuppy);document.querySelector('#setupResult').textContent=setupComplete?`Setup complete - ${puppy.name} is home and ready for gentle routines.`:`${puppy.name} is a ${puppy.breed}. Rene has completed the first health and temperament check.`}
  if(setupComplete)document.querySelector('#setupBadge').textContent='Ready at home';
  renderSetupSummary();
  document.querySelectorAll('.rene-service').forEach(button=>{if(reneBenefits[button.dataset.service])button.disabled=true});
}
syncSetupState();

// Real dog photos supplied for this project replace the temporary icon artwork.
dogPhotos={coco:'assets/coco.jpg',atlas:'assets/atlas.jpg',nova:'assets/nova.jpg'};
function renderRoster(){rosterEl.innerHTML=dogs.map(d=>`<button class="dog ${d.id===selectedDog?'selected':''}" data-dog="${d.id}"><span class="dog-avatar"><img src="${dogPhotos[d.id]}" alt="${d.name}, ${d.breed}"></span><span><h3>${d.name}</h3><p>${d.breed} - ${d.league}</p><p>${d.traits}</p></span><span class="stat">${d.id===selectedPuppy&&setupComplete?currentDogReadiness(d):d.score}</span></button>`).join('');document.querySelectorAll('[data-dog]').forEach(b=>b.onclick=()=>{if(setupComplete&&b.dataset.dog!==selectedPuppy){document.querySelector('#lifeResult').textContent='Finish this puppy\'s care journey before changing the active dog.';return}selectedDog=b.dataset.dog;renderRoster();renderMatch();renderLife()})}
function fieldView(step,caption){const dog=dogs.find(d=>d.id===selectedDog),dogEl=document.querySelector('#fieldDog'),marker=document.querySelector('#targetMarker'),path=document.querySelector('#searchPath');document.querySelector('#fieldScene').classList.toggle('searching',step>0&&step<3);document.querySelector('#fieldStepLabel').textContent=`Step ${step} of 3`;document.querySelector('#fieldMeter').style.width=`${step*33.333}%`;document.querySelector('#fieldCaption').textContent=caption;dogEl.innerHTML=`<img src="${dogPhotos[dog.id]}" alt="${dog.name}">`;dogEl.title=dog.name;dogEl.style.left=step===0?'10%':step===1?'43%':'76%';dogEl.style.top=step===0?'18%':step===1?'8%':'18%';marker.style.opacity=step>=3?'1':'.25';marker.style.transform=step>=3?'scale(1)':'scale(.7)';path.style.left=step===0?'10%':step===1?'25%':'45%';path.style.right=step===0?'10%':step===1?'25%':'8%';document.querySelector('#zoneOne').style.background=step>=1?'#b8e0bd':'rgba(255,255,255,.7)';document.querySelector('#zoneTwo').style.background=step>=2?'#b8e0bd':'rgba(255,255,255,.7)';document.querySelector('#zoneThree').style.background=step>=3?'#f3d08a':'rgba(255,255,255,.7)'}
function renderLife(){const stage=lifeStage(),dog=dogs.find(d=>d.id===selectedDog);document.querySelector('#lifeStage').textContent=stage;document.querySelector('#lifeDogName').textContent=dog.name;document.querySelector('#lifeDay').textContent=`Day ${life.day} · ${life.ageDays} days old`;document.querySelector('#lifeAction').textContent=life.action;document.querySelector('#lifeDog').innerHTML=`<img src="${dogPhotos[dog.id]}" alt="${dog.name}">`;document.querySelector('#lifeDescription').textContent=stage==='Puppy'?'Gentle routines, rest, socialization, and short lessons shape a healthy foundation.':stage==='Adolescent'?'Energy and confidence are growing. Keep sessions short, fair, and consistent.':'Your adult dog can now specialize, enter advanced sports, and continue learning.';const stats=[['Health',life.health],['Energy',life.energy],['Bond',life.bond],['Obedience',life.obedience],['Scent skill',life.scent],['Body condition',life.weight]];document.querySelector('#lifeStats').innerHTML=stats.map(([label,value])=>`<div class="life-stat"><label>${label}<b>${value}%</b></label><div class="meter"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div></div>`).join('')}
renderRoster();renderLife();

// Life-simulation loop: the player makes care choices and advances one day at a time.
const lifeActions={
  feed:{label:'Feeding time',text:'A balanced meal and fresh water keep the puppy ready to learn.',changes:{health:3,energy:8,weight:2},effects:'Health +3 · Energy +8 · Body condition +2'},
  train:{label:'Training session',text:'A short positive-reinforcement lesson builds trust and a real skill.',changes:{obedience:4,scent:2,bond:3,energy:-12},effects:'Obedience +4 · Scent +2 · Bond +3 · Energy −12'},
  play:{label:'Play and enrichment',text:'Play builds confidence, curiosity, and your bond together.',changes:{bond:5,energy:-10,health:1},effects:'Bond +5 · Health +1 · Energy −10'},
  rest:{label:'Quiet rest',text:'The puppy settles into a safe rest period and recovers energy.',changes:{energy:24,health:2},effects:'Energy +24 · Health +2'},
  care:{label:'Care check',text:'You check paws, water, comfort, and body condition before continuing.',changes:{health:5,bond:2,energy:-2},effects:'Health +5 · Bond +2 · Energy −2'}
};
function renderLifeActionLabels(){document.querySelectorAll('.life-button').forEach(button=>{const action=lifeActions[button.dataset.action];if(action)button.innerHTML=`${action.label}<small>${action.effects}</small>`})}
const routineTasks={
  arrival:{label:'Unpack the puppy kit',text:'A quiet arrival helps the puppy learn that home is safe.',changes:{bond:3,health:2}},
  settle:{label:'Set up water and a rest spot',text:'Fresh water and a calm resting place are the first care essentials.',changes:{health:4,energy:4}},
  connect:{label:'Have a gentle first play',text:'A short, choice-led play session starts your bond without overwhelming the puppy.',changes:{bond:6,energy:-5}}
};
function renderRoutine(){const host=document.querySelector('#routineTasks');if(!host)return;const complete=Object.values(homeRoutine).filter(Boolean).length;const ready=setupComplete;document.querySelector('#routineBadge').textContent=!ready?'Home not reached':complete===3?'First day complete':`${complete}/3 complete`;document.querySelector('#routinePrompt').textContent=!ready?'Choose a pet parent, pick a puppy, and walk home to begin your first routine.':complete===3?'Your puppy is settled. You can end the first day when ready.':'Complete all three gentle tasks before ending the first day.';host.innerHTML=Object.entries(routineTasks).map(([key,task])=>`<button class="routine-task ${homeRoutine[key]?'done':''}" data-routine="${key}" ${!ready||homeRoutine[key]?'disabled':''}><span>${homeRoutine[key]?'✓':'○'}</span><strong>${task.label}</strong><small>${homeRoutine[key]?'Complete':task.text}</small></button>`).join('');host.querySelectorAll('[data-routine]').forEach(button=>button.addEventListener('click',()=>completeRoutine(button.dataset.routine)))}
function completeRoutine(key){const task=routineTasks[key];if(!task||!setupComplete||homeRoutine[key])return;applyChanges(life,task.changes);homeRoutine[key]=true;life.action=task.label;document.querySelector('#lifeResult').textContent=task.text;renderRoutine();renderLife();refreshHomeGate();saveGame()}
function lifeStage(){return life.ageDays<120?'Puppy':life.ageDays<365?'Adolescent':'Adult'}
function renderLife(){const stage=lifeStage();document.querySelector('#lifeStage').textContent=stage;document.querySelector('#lifeDogName').textContent=life.name;document.querySelector('#lifeDay').textContent=`Day ${life.day} · ${life.ageDays} days old`;document.querySelector('#lifeAction').textContent=life.action;document.querySelector('#lifeDescription').textContent=stage==='Puppy'?'Gentle routines, rest, socialization, and short lessons shape a healthy foundation.':stage==='Adolescent'?'Energy and confidence are growing. Keep sessions short, fair, and consistent.':'Your adult dog can now specialize, enter advanced sports, and continue learning.';const stats=[['Health',life.health],['Energy',life.energy],['Bond',life.bond],['Obedience',life.obedience],['Scent skill',life.scent],['Body condition',life.weight]];document.querySelector('#lifeStats').innerHTML=stats.map(([label,value])=>`<div class="life-stat"><label>${label}<b>${value}%</b></label><div class="meter"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div></div>`).join('')}
function doLifeAction(type){const action=lifeActions[type];if(!action)return;if(!setupComplete){document.querySelector('#lifeResult').textContent='Walk your puppy home and complete the first-day routine before choosing daily care.';return}Object.entries(action.changes).forEach(([key,value])=>life[key]=Math.max(0,Math.min(100,life[key]+value)));life.action=action.label;document.querySelector('#lifeResult').textContent=`${action.text} Effects: ${action.effects}.`;document.querySelector('#lifeDog').classList.remove('active');void document.querySelector('#lifeDog').offsetWidth;document.querySelector('#lifeDog').classList.add('active');renderLife();saveGame()}
document.querySelectorAll('.life-button').forEach(button=>button.addEventListener('click',()=>doLifeAction(button.dataset.action)));
renderLifeActionLabels();
document.querySelector('#nextDay')?.addEventListener('click',()=>{if(!setupComplete||Object.values(homeRoutine).some(value=>!value)){document.querySelector('#lifeResult').textContent='Finish the three first-day home tasks before ending the first day.';return}life.day+=1;life.ageDays+=1;life.energy=Math.min(100,life.energy+12);if(life.energy<25)life.health=Math.max(0,life.health-2);life.action='A new day begins';document.querySelector('#lifeResult').textContent=lifeStage()==='Adult'?'Your dog has reached adulthood. Advanced competitions are now available.':'The next day begins. Choose how to care for your puppy.';renderLife();saveGame()});
renderLife();

// First-day home gate keeps the puppy flow playable before competitions.
function refreshHomeGate(){const nextDay=document.querySelector('#nextDay');if(nextDay)nextDay.disabled=!setupComplete||Object.values(homeRoutine).some(value=>!value)}
// Final photo-backed renderer (kept at the end so it overrides the starter renderer).
function renderLife(){const stage=lifeStage(),dog=dogs.find(d=>d.id===selectedDog);document.querySelector('#lifeStage').textContent=stage;document.querySelector('#lifeDogName').textContent=dog.name;document.querySelector('#lifeDay').textContent=`Day ${life.day} · ${life.ageDays} days old`;document.querySelector('#lifeAction').textContent=life.action;document.querySelector('#lifeDog').innerHTML=`<img src="${dogPhotos[dog.id]}" alt="${dog.name}">`;document.querySelector('#lifeDescription').textContent=stage==='Puppy'?'Gentle routines, rest, socialization, and short lessons shape a healthy foundation.':stage==='Adolescent'?'Energy and confidence are growing. Keep sessions short, fair, and consistent.':'Your adult dog can now specialize, enter advanced sports, and continue learning.';const stats=[['Health',life.health],['Energy',life.energy],['Bond',life.bond],['Obedience',life.obedience],['Scent skill',life.scent],['Body condition',life.weight]];document.querySelector('#lifeStats').innerHTML=stats.map(([label,value])=>`<div class="life-stat"><label>${label}<b>${value}%</b></label><div class="meter"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div></div>`).join('')}
renderLife();
refreshHomeGate();
renderRoutine();
setTimeout(()=>{renderRoutine();refreshHomeGate()},2300);

// Guarded progression layer: the puppy must come home before care competitions unlock.
function currentDogReadiness(d){
  if(!setupComplete || d.id!==selectedPuppy)return d.score;
  return Math.round(Math.max(0,Math.min(100,(d.score*.45)+(life.health*.2)+(life.energy*.15)+(life.bond*.1)+(life.obedience*.05)+(life.scent*.05))));
}
function renderEvents(){
  eventsEl.innerHTML=events.map(e=>`<button class="event ${e.id===selectedEvent?'selected':''}" data-event="${e.id}" ${setupComplete?'':'disabled'}><strong>${e.icon} ${e.name}</strong><span>${e.desc} - ${e.cost} coins</span></button>`).join('');
  document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{selectedEvent=b.dataset.event;renderEvents();renderMatch()});
}
function renderMatch(){
  const d=dogs.find(x=>x.id===selectedDog),e=events.find(x=>x.id===selectedEvent);
  const rivals={coco:'Milo the Papillon',atlas:'Briar the Staffordshire Terrier',nova:'Rook the German Shepherd'};
  if(!setupComplete){
    matchCard.innerHTML='<strong>Bring your puppy home first</strong><br><span>Choose a parent, choose a puppy, and complete the walk-home setup before entering competitions.</span>';
    enterButton.disabled=true;enterButton.textContent='Complete puppy setup first';return;
  }
  matchCard.innerHTML=`<strong>${d.name} vs. ${rivals[d.id]}</strong><br><span>${e.name} - ${d.league} - readiness: ${currentDogReadiness(d)}%</span><br><small>Match uses current health, energy, bond, skills, and safe event matching.</small>`;
  const unsafe=life.health<25||life.energy<20;
  enterButton.disabled=coins<e.cost||unsafe;
  enterButton.textContent=unsafe?'Rest before competing':coins<e.cost?'Not enough coins':`Enter for ${e.cost} coins`;
}
function finish(){
  if(!setupComplete||life.health<25||life.energy<20)return;
  const d=dogs.find(x=>x.id===selectedDog),e=events.find(x=>x.id===selectedEvent);
  coins-=e.cost;
  const score=Math.min(100,Math.max(0,Math.round(currentDogReadiness(d)+Math.random()*15-5)));
  const won=score>=70,payout=won?e.reward:Math.floor(e.cost/2);
  coins+=payout;life.energy=Math.max(0,life.energy-18);life.action=`Completed ${e.name}; cooldown needed`;
  progress.events+=1;progress.best=Math.max(progress.best,score);if(won)progress.ribbons+=1;
  document.querySelector('#coins').textContent=coins;document.querySelector('#resultTitle').textContent=won?`${d.name} earns a ribbon!`:`${d.name} completes the course`;
  document.querySelector('#resultText').textContent=`Score: ${score}/100. ${won?'Great teamwork.':'A safe completion is still progress.'} Reward: ${payout} virtual coins. Energy is reduced for cooldown.`;
  document.querySelector('#resultPanel').hidden=false;renderProgress();renderMatch();renderLife();saveGame();window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
}
function renderLife(){
  const id=selectedPuppy||selectedDog,dog=dogs.find(x=>x.id===id)||dogs[0],stage=lifeStage();
  document.querySelector('#lifeStage').textContent=stage;document.querySelector('#lifeDogName').textContent=life.name;document.querySelector('#lifeDay').textContent=`Day ${life.day} - ${life.ageDays} days old`;document.querySelector('#lifeAction').textContent=life.action;
  document.querySelector('#lifeDog').innerHTML=`<img src="${dogPhotos[dog.id]}" alt="${dog.name}, ${dog.breed}">`;
  document.querySelector('#lifeDescription').textContent=stage==='Puppy'?'Gentle routines, rest, socialization, and short lessons shape a healthy foundation.':stage==='Adolescent'?'Energy and confidence are growing. Keep sessions short, fair, and consistent.':'Your adult dog can now specialize, enter advanced sports, and continue learning.';
  const stats=[['Health',life.health],['Energy',life.energy],['Bond',life.bond],['Obedience',life.obedience],['Scent skill',life.scent],['Body condition',life.weight]];
  document.querySelector('#lifeStats').innerHTML=stats.map(([label,value])=>`<div class="life-stat"><label>${label}<b>${value}%</b></label><div class="meter"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div></div>`).join('');
}
function renderPuppyShop(){
  const host=document.querySelector('#puppyChoices');if(!host)return;const ready=selectedParents.length>0;
  host.innerHTML=dogs.map(d=>`<button class="puppy-card ${selectedPuppy===d.id?'selected':''} ${ready?'':'locked'}" data-puppy="${d.id}" ${ready&&!setupComplete?'':'disabled'}><img src="${dogPhotos[d.id]}" alt="${d.name}, ${d.breed}"><span><strong>${d.name}</strong><small>${d.breed}</small><small>${d.league}</small></span><b>${selectedPuppy===d.id?'CHOSEN':'VIEW MATCH'}</b></button>`).join('');
  document.querySelector('#beginWalk').disabled=!ready||!selectedPuppy||setupComplete;
  document.querySelectorAll('[data-puppy]').forEach(button=>button.onclick=()=>{if(setupComplete)return;selectedPuppy=button.dataset.puppy;selectedDog=selectedPuppy;applyStartingProfile();renderPuppyShop();renderRoster();renderLife();saveGame()});
}
// Rebind the guarded handlers after all legacy prototype renderers have loaded.
enterButton.onclick=finish;renderEvents();renderMatch();renderPuppyShop();renderLife();refreshHomeGate();renderRoutine();

// Neighborhood layer: a small playable world loop that connects home, care, training, and events.
const worldPlaces={
  home:{title:'Home',desc:'Your puppy is safe at home. Complete care, then choose where to go.',actions:[['care','Open daily care','life-panel']]},
  shop:{title:'Rene\'s Pet Shop',desc:'Browse realistic breed matches, supplies, and safe enrichment. Rene can explain care needs before you choose.',actions:[['puppies','View puppy matches','setup-panel'],['supplies','Check supplies','people-panel']]},
  clinic:{title:'Rene\'s Veterinary Clinic',desc:'Review health, hydration, body condition, nutrition, and recovery guidance with Rene.',actions:[['health','Request a health check','reneServices'],['nutrition','Open nutrition plan','reneServices']]},
  daycare:{title:'Daycare Meadow',desc:'A supervised social space for play, rest, grooming, and confidence-building.',actions:[['daycare','Book a short daycare visit','life-panel']]},
  training:{title:'Training Field',desc:'Practice scent work, recall, rally, retrieve, and low-impact foundations before competition.',actions:[['training','Start a training session','life-panel'],['scent','Plan scent search','mission-panel']]},
  park:{title:'Competition Park',desc:'Enter only when your active dog is home, rested, and ready. Events are fair, non-contact, and size-adjusted.',actions:[['events','Open competition desk','event-panel'],['field','Launch a field mission','fieldPanel']]}
};
function renderWorld(place='home'){
  const data=worldPlaces[place]||worldPlaces.home;
  document.querySelectorAll('[data-world]').forEach(button=>button.classList.toggle('active',button.dataset.world===place));
  document.querySelector('#worldLocation').textContent=data.title;
  document.querySelector('#worldTitle').textContent=data.title;
  document.querySelector('#worldDescription').textContent=data.desc;
  document.querySelector('#travelStatus').textContent=setupComplete?`You traveled to ${data.title}. ${life.name} is with you.`:`You are at ${data.title}. Rene can help you choose a puppy here.`;
  const actions=document.querySelector('#worldActions');
  actions.innerHTML=data.actions.map(([id,label,target])=>`<button class="world-action" data-world-action="${id}" data-target="${target}">${label}</button>`).join('');
  actions.querySelectorAll('[data-world-action]').forEach(button=>button.onclick=()=>{
    if(!setupComplete&&!(place==='shop'&&button.dataset.worldAction==='puppies')){document.querySelector('#travelStatus').textContent='Walk into Rene\'s Pet Shop to choose a parent and puppy before using care or competition services.';document.querySelector('#setupPanel')?.scrollIntoView({behavior:'smooth'});return}
    if(button.dataset.worldAction==='health')document.querySelector('[data-service="health"]')?.click();
    if(button.dataset.worldAction==='nutrition')document.querySelector('[data-service="nutrition"]')?.click();
    const action=button.dataset.worldAction;
    const status=document.querySelector('#travelStatus');
    if(action==='care'){
      doLifeAction('care');
      status.textContent=`${life.name} completed a calm care check at Home. Health and comfort were reviewed.`;
    }
    if(action==='training'){
      doLifeAction('train');
      status.textContent=`${life.name} completed a short positive-reinforcement session at the Training Field.`;
    }
    if(action==='daycare'){
      if(coins<12){status.textContent='Daycare costs 12 virtual coins. Earn more through safe searches or events.'}
      else {coins-=12;applyChanges(life,{bond:4,health:2,energy:-8});life.action='Supervised daycare visit';document.querySelector('#coins').textContent=coins;status.textContent=`${life.name} enjoyed supervised play, rest, and socialization at Daycare Meadow. -12 coins.`;renderLife();saveGame()}
    }
    if(action==='supplies'){
      if(coins<10){status.textContent='The supply shelf costs 10 virtual coins. Come back after earning more.'}
      else {coins-=10;life.action='Picked up safe enrichment supplies';document.querySelector('#coins').textContent=coins;status.textContent='You picked up fresh water, a safe chew, and enrichment supplies at Rene\'s Pet Shop. -10 coins.';saveGame();renderLife()}
    }
    if(action==='scent'){
      const select=document.querySelector('#missionSelect');if(select)select.value='article';renderBriefing();status.textContent='The scent-search briefing is ready at the Training Field. Review conditions before launching.';
    }
    if(action==='events')status.textContent='The Competition Park desk is open. Choose a fair, size-adjusted event below.';
    if(action==='field')status.textContent='The field mission desk is ready. Review the route and launch when your dog is rested.';
    const target=document.querySelector('#'+button.dataset.target)||document.querySelector('.'+button.dataset.target);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    renderRoster();renderMatch();renderReadiness();renderProgress();
  });
}
document.querySelectorAll('[data-world]').forEach(button=>button.addEventListener('click',()=>{
  const target=worldTargets?.[button.dataset.world];
  const prompt=document.querySelector('#worldPrompt');
  if(target&&prompt){prompt.textContent=`Walk toward ${worldPlaces[button.dataset.world].title}. Use WASD, arrow keys, or the controls below.`;prompt.classList.add('route-selected');setTimeout(()=>prompt.classList.remove('route-selected'),900)}
}));
renderWorld('home');

// Walk mode: the player can move through town instead of only selecting menu destinations.
const worldTargets={home:{x:14,y:22},shop:{x:84,y:22},clinic:{x:14,y:78},daycare:{x:85,y:78},training:{x:50,y:19},park:{x:50,y:78}};
function nearestWorldPlace(){let best='home',distance=Infinity;Object.entries(worldTargets).forEach(([id,pos])=>{const d=Math.hypot(worldPosition.x-pos.x,worldPosition.y-pos.y);if(d<distance){distance=d;best=id}});return {id:best,distance}}
function renderWalkPosition(){const player=document.querySelector('#worldPlayer');if(!player)return;player.style.left=`${worldPosition.x}%`;player.style.top=`${worldPosition.y}%`;const dog=document.querySelector('#worldDog');if(dog)dog.src=dogPhotos[selectedPuppy||selectedDog]||dogPhotos.coco;const nearest=nearestWorldPlace();const prompt=document.querySelector('#worldPrompt');if(prompt)prompt.textContent=nearest.distance<12?`You are near ${worldPlaces[nearest.id].title}. Press ENTER or tap its marker to interact.`:'Walk with WASD or the arrow keys. Your dog follows you through town.';if(nearest.distance<10){renderWorld(nearest.id);}}
function walk(direction){const speed=4;if(direction==='up')worldPosition.y=Math.max(7,worldPosition.y-speed);if(direction==='down')worldPosition.y=Math.min(88,worldPosition.y+speed);if(direction==='left')worldPosition.x=Math.max(5,worldPosition.x-speed);if(direction==='right')worldPosition.x=Math.min(91,worldPosition.x+speed);renderWalkPosition();saveGame()}
window.addEventListener('keydown',event=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const keys={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};const direction=keys[event.key];if(direction){event.preventDefault();walk(direction)}if(event.key==='Enter'){const nearest=nearestWorldPlace();if(nearest.distance<14)renderWorld(nearest.id)}});
document.querySelectorAll('[data-walk]').forEach(button=>button.addEventListener('click',()=>walk(button.dataset.walk)));
renderWalkPosition();
