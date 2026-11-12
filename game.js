"use strict";
/* THE ODYSSEY — Group D. No frameworks, accounts, trackers, or build tools required. */
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("world"), ctx = canvas.getContext("2d");
  const W = 1000, H = 560, STORAGE = "group-d-odyssey-save-v1";
  const spots = [{x:272,y:235},{x:478,y:306},{x:695,y:194},{x:801,y:385}];
  const sideSpot = {x:528,y:447}, gate = {x:906,y:295};
  let scenes=[], state=null, hero={x:112,y:342}, keys=new Set(), waypoint=null;
  let popup=null, clock=0, last=0, sound=false, audio=null, proximity="";
  const palettes = {
    coast:{water:"#22576b",ground:"#bdac81",edge:"#e9d0a0",path:"#e3d1a4",flora:"#456b52",accent:"#d6b57c"},
    forest:{water:"#194b58",ground:"#517660",edge:"#8eaa83",path:"#b4aa7f",flora:"#254e3c",accent:"#dbe3ab"},
    sea:{water:"#205b78",ground:"#a9a88d",edge:"#d9caa6",path:"#c5c1a7",flora:"#527263",accent:"#e7cd91"},
    ruins:{water:"#344d63",ground:"#7b736d",edge:"#b6a997",path:"#b7a997",flora:"#53625c",accent:"#d8ab73"},
    cave:{water:"#1d3548",ground:"#69615d",edge:"#938477",path:"#a49787",flora:"#3e4d49",accent:"#f2a66b"},
    dark:{water:"#151f33",ground:"#3d394f",edge:"#706684",path:"#716581",flora:"#33334c",accent:"#b0a6e0"},
    palace:{water:"#174e67",ground:"#bca779",edge:"#e7cb9e",path:"#e9d6b7",flora:"#54725f",accent:"#dcb77d"}
  };
  const good = v => Number.isFinite(v) ? v : 0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const scene=()=>scenes[state.scene];
  const allSideCount=()=>scenes.filter(s=>s.side).length;
  const doneSideCount=()=>scenes.filter(s=>s.side && state.side[s.id]).length;
  const storyLines=s=>s.script.filter(line=>line && !/^(?:LOCATION\s+\d+\s+[—-]|PROLOGUE\s+[—-]|MAIN QUEST:|Objective\s*(?:\d+)?\s*:|OPTIONAL SIDE QUEST|SIDE QUEST COMPLETE|QUEST COMPLETE|NEW LOCATION|CREW LOST|CREW REMAINING|FLEET REMAINING|LESSON UNLOCKED|NEW MAIN QUEST|PLAYER CONTROL BEGINS|DIALOGUE CHOICE|\[CUTSCENE\]|THE END$|A:|B:|C:)/i.test(line));
  const currentBiome=()=>{
    const i=state.scene;
    if([3,7,13,14,15,17].includes(i))return "sea";
    if([6].includes(i))return "cave";
    if([10,11].includes(i))return "dark";
    if([1,2,8].includes(i))return "ruins";
    if([4,5,9,12,16].includes(i))return "forest";
    if([0,18].includes(i))return "palace";
    return "coast";
  };
  function freshSave(){return {scene:0,step:0,side:{},visited:[0],finished:false,started:true};}
  function readSave(){try {const s=JSON.parse(localStorage.getItem(STORAGE));if(s&&Number.isInteger(s.scene)&&s.scene>=0&&s.scene<19&&Number.isInteger(s.step)){return {scene:s.scene,step:s.step,side:s.side||{},visited:Array.isArray(s.visited)?s.visited:[0],finished:!!s.finished,started:true};}}catch(e){}return null;}
  function save(){try {localStorage.setItem(STORAGE,JSON.stringify(state));$("saveStatus").textContent="✦ PROGRESS SAVED";}catch(e){$("saveStatus").textContent="SAVE UNAVAILABLE IN THIS BROWSER";}}
  function showApp(){ $("startScreen").classList.add("hidden");$("app").classList.remove("hidden");hero={x:112,y:342};waypoint=null;keys.clear();renderHUD();if(state.finished)showEnding();else showIntro();}
  function startFresh(){state=freshSave();save();showApp();}
  function resume(){state=readSave()||freshSave();showApp();}
  function setScene(i){state.scene=i;state.step=0;state.visited=Array.from(new Set([...state.visited,i]));hero={x:112,y:342};waypoint=null;save();renderHUD();showIntro();}
  function nextScene(){if(state.scene>=scenes.length-1){state.finished=true;save();renderHUD();showEnding();return;}setScene(state.scene+1);}
  function brief(text,len=33){return String(text||"").length>len?String(text).slice(0,len-1)+"…":String(text||"");}
  function renderHUD(){
    const s=scene(),n=s.objectives.length;
    $("worldName").textContent=s.title;
    $("worldSubtitle").textContent=s.chapter.replace(/[\[\]]/g,"").slice(0,90);
    $("chapterCounter").textContent=state.scene===0?"PROLOGUE · 0 / 18":`CHAPTER ${String(state.scene).padStart(2,"0")} / 18`;
    $("progressBar").style.width=`${(state.scene+Math.min(state.step/n,1))/18*100}%`;
    $("questName").textContent=s.quest;
    $("questDescription").textContent="Complete each marked objective to continue the voyage. Optional stories uncover more of the journey.";
    $("questCount").textContent=`${state.step} / ${n}`;
    $("objectives").replaceChildren();
    s.objectives.forEach((objective,i)=>{const div=document.createElement("div");div.className="objective "+(i<state.step?"done":i===state.step?"current":"");const mark=document.createElement("span");mark.className="bullet";mark.textContent=i<state.step?"✓":i+1;const label=document.createElement("span");label.textContent=objective;div.append(mark,label);$("objectives").appendChild(div);});
    $("sideTitle").textContent=s.side?s.side.name:"No optional quest here";
    $("sideDescription").textContent=s.side?s.side.objective:"Focus on the story quest and continue your journey.";
    $("sideStatus").textContent=!s.side?"NO SIDE QUEST":state.side[s.id]?"✓ SIDE QUEST COMPLETE":"FIND THE PURPLE MARKER";
    $("sideStatus").style.color=state.side[s.id]?"#9edebd":"";
    $("crewStatus").textContent=state.scene>=16?"ODYSSEUS · ALONE":state.scene>=9?"ONE SHIP REMAINS":state.scene===0?"TELEMACHUS · ITHACA":"THE CREW OF ITHACA";
    $("weatherLabel").textContent={coast:"AEGEAN COAST",forest:"ISLAND WILDERNESS",sea:"THE OPEN WATER",ruins:"ANCIENT RUINS",cave:"THE STONE PASSAGE",dark:"BEYOND THE LIVING",palace:"THE KINGDOM OF ITHACA"}[currentBiome()];
  }
  function nearby(){
    const s=scene(),options=[];
    if(state.step<s.objectives.length)options.push({kind:"main",pos:spots[state.step],label:"OBJECTIVE "+(state.step+1)});
    if(s.side&&!state.side[s.id])options.push({kind:"side",pos:sideSpot,label:s.side.name});
    if(state.step>=s.objectives.length)options.push({kind:"gate",pos:gate,label:state.scene===18?"FINISH THE STORY":"SAIL TO NEXT ISLAND"});
    options.sort((a,b)=>distance(hero,a.pos)-distance(hero,b.pos));
    return options[0]&&distance(hero,options[0].pos)<88?options[0]:null;
  }
  function updateNearby(){
    const n=nearby(),hint=n?n.label:"Explore the island";if(hint!==proximity){proximity=hint;$("nearbyLabel").textContent=hint;$("interactBtn").disabled=!n;$("interactBtn").innerHTML=n?"INTERACT <span>↵</span>":"GET CLOSER TO INTERACT <span>↵</span>";}
  }
  function interact(){
    if(!$("dialogueOverlay").classList.contains("hidden")||!$("panelOverlay").classList.contains("hidden"))return;
    const n=nearby();if(!n)return;
    ping(330);
    if(n.kind==="main"){const s=scene(),step=state.step;state.step++;save();renderHUD();const lines=moment(s,step);openDialogue(lines,{kicker:"MAIN QUEST · OBJECTIVE COMPLETE",title:step===s.objectives.length-1?"THE ROAD OPENS":"A NEW CHAPTER UNFOLDS",sigil:"✦"});}
    if(n.kind==="side"){const s=scene();state.side[s.id]=true;save();renderHUD();const lines=sideMoment(s);const options=extractChoices(s);openDialogue(lines,{kicker:"OPTIONAL STORY · SIDE QUEST COMPLETE",title:s.side.name,sigil:"✧",choices:options});}
    if(n.kind==="gate")nextScene();
  }
  function parseBeat(line){
    const clean=String(line).replace(/^\s+|\s+$/g,"");
    const match=clean.match(/^([A-Z][A-Z\d\s'’.-]{1,24}):\s*([\s\S]+)/);
    if(match&&!/^(TEXT ON SCREEN|TITLE CARD|NEW ITEM|ITEM DESCRIPTION|OBJECTIVE|CREW LOST|QUEST COMPLETE|LESSON UNLOCKED)$/.test(match[1]))return {speaker:match[1],text:match[2].trim()};
    return {speaker:"",text:clean.replace(/^(\[|\])/g,"")};
  }
  function sceneIntro(s){
    const end=s.script.findIndex(x=>/^MAIN QUEST\s*:/i.test(x));
    const intro=s.script.slice(1,end>0?end:12).filter(x=>x&&!/^\[CUTSCENE\]|^PLAYER CONTROL|^Opening Cutscene|^Arrival|^TEXT ON SCREEN:$|^TITLE CARD:$/i.test(x));
    return intro.slice(0,s.id===0?10:7);
  }
  function moment(s,step){
    const arr=storyLines(s),count=s.objectives.length;
    const start=Math.floor(arr.length*(step+0.35)/(count+0.75));
    return arr.slice(start,Math.min(start+5,arr.length)).filter(x=>x.length<500);
  }
  function sideMoment(s){
    const start=s.script.findIndex(x=>/^Optional Side Quest/i.test(x));
    if(start<0)return ["Another part of the journey comes into focus."];
    const end=s.script.findIndex((x,i)=>i>start&&/^SIDE QUEST COMPLETE/i.test(x));
    return s.script.slice(start+1,end>start?end:start+10).filter(x=>!/^Objective\s*:/i.test(x)&&!/^Dialogue Choice:/i.test(x)&&!/^\s*[ABC]\s*:/i.test(x)).slice(0,9);
  }
  function extractChoices(s){
    const at=s.script.findIndex(x=>/^Dialogue Choice\s*:/i.test(x));
    if(at<0)return null;
    const options=s.script.slice(at+1,at+8).filter(x=>/^\s*[ABC]\s*:/i.test(x)).slice(0,3).map(x=>x.replace(/^\s*[ABC]\s*:\s*/i,"").replace(/^["“]|["”]$/g,""));
    return options.length>=2?options:null;
  }
  function showIntro(){const s=scene();openDialogue(sceneIntro(s),{kicker:state.scene===0?"PROLOGUE · BEFORE THE VOYAGE":"LOCATION "+state.scene+" OF 18",title:s.chapter||s.title,sigil:"✹"});}
  function openDialogue(lines,options={}){
    const beats=(lines||[]).map(x=>typeof x==="string"?parseBeat(x):x).filter(x=>x&&x.text);
    popup={beats:beats.length?beats:[{speaker:"",text:"The journey continues."}],index:0,kicker:options.kicker||"A SCENE UNFOLDS",title:options.title||scene().title,sigil:options.sigil||"✦",choices:options.choices||null};
    $("dialogueOverlay").classList.remove("hidden");$("dialogueClose").focus();renderDialogue();
  }
  function renderDialogue(){
    if(!popup)return;
    const b=popup.beats[popup.index];
    $("dialogueKicker").textContent=popup.kicker;$("dialogueTitle").textContent=popup.title;$("dialogueSigil").textContent=popup.sigil;
    $("dialogueSpeaker").textContent=b.speaker||"THE NARRATOR";$("dialogueText").textContent=b.text;
    $("dialoguePage").textContent=`${String(popup.index+1).padStart(2,"0")} / ${String(popup.beats.length).padStart(2,"0")}`;
    const final=popup.index===popup.beats.length-1,choose=final&&popup.choices?.length;
    $("dialogueChoices").replaceChildren();$("dialogueChoices").classList.toggle("hidden",!choose);
    $("dialogueNext").classList.toggle("hidden",!!choose);
    $("dialogueNext").innerHTML=final?"RETURN TO THE GAME <span>↵</span>":"CONTINUE <span>→</span>";
    if(choose){popup.choices.forEach((choice,i)=>{const b=document.createElement("button");b.textContent=String.fromCharCode(65+i)+". "+choice;b.addEventListener("click",()=>{const chosen=choice;popup.choices=null;popup.beats.push({speaker:state.scene===0?"TELEMACHUS":"ODYSSEUS",text:chosen});popup.index++;ping(430);renderDialogue();});$("dialogueChoices").appendChild(b);});}
  }
  function closeDialogue(){popup=null;$("dialogueOverlay").classList.add("hidden");canvas.focus({preventScroll:true});}
  function advanceDialogue(){if(!popup)return;if(popup.index<popup.beats.length-1){popup.index++;ping(420);renderDialogue();}else if(!popup.choices)closeDialogue();}
  function openPanel(kicker,title){$("panelKicker").textContent=kicker;$("panelTitle").textContent=title;$("panelContent").replaceChildren();$("panelOverlay").classList.remove("hidden");$("panelClose").focus();}
  function closePanel(){$("panelOverlay").classList.add("hidden");canvas.focus({preventScroll:true});}
  function showMap(){
    openPanel("THE LONG WAY HOME","MAP OF THE VOYAGE");
    const p=$("panelContent"),desc=document.createElement("p");desc.className="info-copy";desc.textContent=`Your path from the shores of Troy to the kingdom of Ithaca. ${doneSideCount()} of ${allSideCount()} optional stories discovered.`;p.append(desc);
    const grid=document.createElement("div");grid.className="map-list";scenes.forEach((s,i)=>{const active=i===state.scene,locked=i>state.scene;const item=document.createElement("div");item.className="map-item "+(active?"current":locked?"locked":"");const num=document.createElement("div");num.className="num";num.textContent=String(i).padStart(2,"0");const txt=document.createElement("div"),name=document.createElement("strong"),status=document.createElement("small");name.textContent=s.title;status.textContent=active?"YOU ARE HERE":locked?"NOT YET DISCOVERED":"VISITED · "+(state.side[i]?"SIDE QUEST FOUND":"STORY UNLOCKED");txt.append(name,status);item.append(num,txt);grid.append(item);});p.append(grid);
  }
  function showJournal(){
    openPanel("EVERY CHAPTER · ORIGINAL GROUP D SCRIPT","STORY JOURNAL");
    const p=$("panelContent"),bar=document.createElement("div");bar.className="journal-actions";
    const select=document.createElement("select");select.setAttribute("aria-label","Select a visited location");
    scenes.slice(0,state.scene+1).forEach((s,i)=>{const op=document.createElement("option");op.value=i;op.textContent=(i?"LOCATION "+i:"PROLOGUE")+" — "+s.title;select.append(op);});
    select.value=state.scene;bar.append(select);p.append(bar);
    const lines=document.createElement("div");lines.className="script-lines";p.append(lines);
    function fill(){lines.replaceChildren();const s=scenes[Number(select.value)];s.script.forEach(line=>{const div=document.createElement("div");div.className="script-line";if(/^(MAIN QUEST|Objective|Optional Side Quest|QUEST COMPLETE|NEW LOCATION|SIDE QUEST COMPLETE|CREW LOST|PLAYER CONTROL|FINAL QUEST|NEW MAIN QUEST)/i.test(line))div.classList.add("quest-line");else if(/^[A-Z\d\s'’.-]{2,28}:/.test(line))div.classList.add("dialogue-line");else if(/^\[/.test(line))div.classList.add("stage-line");div.textContent=line;lines.append(div);});}
    select.addEventListener("change",fill);fill();
  }
  function showHelp(){
    openPanel("A SHORT FIELD GUIDE","HOW TO PLAY");
    const d=document.createElement("div");d.className="info-copy";d.innerHTML="<p><strong>MOVE</strong> with WASD or the arrow keys. On a phone, use the movement pad. You can also click or tap somewhere on the map to walk there.</p><p><strong>INTERACT</strong> with E or the gold button when you are close to a marker.</p><p><strong>GOLD MARKERS</strong> advance the main quest. Complete them in order. <strong>PURPLE MARKERS</strong> are optional stories from the script. The <strong>SHIP MARKER</strong> unlocks the next location when the main objectives are done.</p><p><strong>DIALOGUE</strong> is taken from Group D's script. Press Enter, Space, or Continue to read the scene. Some scenes contain dialogue choices.</p><p>Open the <strong>STORY JOURNAL</strong> to read the complete original script for every location you have reached. The game saves automatically in this browser. The <strong>VOYAGE MAP</strong> tracks your route.</p>";$("panelContent").append(d);
  }
  function showEnding(){
    openPanel("THE FINAL QUEST IS COMPLETE","HOME AT LAST");
    const d=document.createElement("div");d.className="info-copy";d.innerHTML="<p>After twenty years, Odysseus has returned to Ithaca. The palace is his again. Penelope and Telemachus are home.</p><p>Every main story chapter has been completed.</p>";
    const stat=document.createElement("p");stat.textContent=`Optional stories discovered: ${doneSideCount()} / ${allSideCount()}`;d.append(stat);
    const link=document.createElement("p");link.textContent=doneSideCount()===allSideCount()?"✦ 100% COMPLETE — YOU HAVE SEEN EVERY SIDE STORY.":"You can restart to explore more optional stories.";d.append(link);$("panelContent").append(d);
  }
  function ping(freq=420){if(!sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.type="sine";osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.14);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.15);}catch(e){}}
  function rand(seed){let t=(Math.sin(seed*127.1+78.233)*43758.5453);return t-Math.floor(t);}
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function rounded(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
  function drawWorld(){
    const s=scene(),biome=currentBiome(),p=palettes[biome],t=clock;ctx.clearRect(0,0,W,H);
    const water=ctx.createLinearGradient(0,0,0,H);water.addColorStop(0,"#071a2b");water.addColorStop(.5,p.water);water.addColorStop(1,"#102d41");ctx.fillStyle=water;ctx.fillRect(0,0,W,H);
    for(let i=0;i<35;i++){const x=(i*157+rand(i+4)*40)%W,y=(i*73+rand(i)*220)%H;ctx.strokeStyle="rgba(196,224,218,"+(.05+rand(i+7)*.11)+")";ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x+Math.sin(t*.8+i)*6,y);ctx.quadraticCurveTo(x+15,y-5,x+37,y);ctx.stroke();}
    if(biome==="sea"){
      ctx.fillStyle="#203f51";ctx.beginPath();ctx.moveTo(80,450);ctx.lineTo(230,355);ctx.lineTo(350,396);ctx.lineTo(470,351);ctx.lineTo(595,390);ctx.lineTo(800,349);ctx.lineTo(990,431);ctx.lineTo(1000,560);ctx.lineTo(0,560);ctx.fill();
    }
    ctx.save();ctx.shadowColor="#020d14";ctx.shadowBlur=28;ctx.shadowOffsetY=18;
    ctx.beginPath();ctx.moveTo(87,276);ctx.bezierCurveTo(101,172,224,117,368,131);ctx.bezierCurveTo(528,72,731,95,862,166);ctx.bezierCurveTo(975,207,964,369,861,440);ctx.bezierCurveTo(721,524,460,508,307,489);ctx.bezierCurveTo(144,477,61,395,87,276);ctx.closePath();ctx.fillStyle=p.edge;ctx.fill();ctx.restore();
    ctx.beginPath();ctx.moveTo(111,280);ctx.bezierCurveTo(126,183,241,142,376,153);ctx.bezierCurveTo(529,102,716,123,841,187);ctx.bezierCurveTo(937,225,918,358,835,417);ctx.bezierCurveTo(708,487,477,474,315,458);ctx.bezierCurveTo(164,447,83,382,111,280);ctx.closePath();
    const land=ctx.createLinearGradient(0,130,0,485);land.addColorStop(0,p.ground);land.addColorStop(1,biome==="dark"?"#29293b":"#77785b");ctx.fillStyle=land;ctx.fill();
    for(let i=0;i<72;i++){const x=135+rand(i+3+s.id*13)*725,y=174+rand(i*2+s.id*17)*255;ellipse(x,y,1+rand(i+11)*4,1+rand(i+18)*2,"rgba(23,43,40,.11)");}
    ctx.strokeStyle=p.path;ctx.globalAlpha=.65;ctx.lineWidth=25;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(hero.x<110?130:145,346);ctx.bezierCurveTo(242,308,257,254,spots[0].x,spots[0].y);ctx.bezierCurveTo(367,153,419,279,spots[1].x,spots[1].y);ctx.bezierCurveTo(568,333,619,201,spots[2].x,spots[2].y);ctx.bezierCurveTo(820,165,837,256,gate.x,gate.y);ctx.stroke();ctx.globalAlpha=1;
    // Architectural landmarks and natural features.
    for(let i=0;i<17;i++){
      const x=162+rand(s.id*60+i)*675,y=175+rand(i*7+s.id*15)*255;
      if(spots.some(pt=>Math.hypot(pt.x-x,pt.y-y)<72)||Math.hypot(sideSpot.x-x,sideSpot.y-y)<56)continue;
      if(biome==="ruins"||biome==="palace"){drawPillar(x,y,p,i);}
      else if(biome==="dark"){drawGhost(x,y,i,t);}
      else if(biome==="cave"){drawRock(x,y,p);}
      else{drawTree(x,y,p,i);}
    }
    if(biome==="palace")drawTemple(777,143,p);
    if(biome==="cave"){ellipse(741,139,78,53,"#28333e");ellipse(741,139,62,46,"#101b28");ellipse(741,139,14,23,"#f29e62");}
    if(biome==="dark"){for(let i=0;i<16;i++){ellipse(100+rand(i)*800,120+rand(i+60)*350,1.5,1.5,"#bca9e1");}}
    // Gold objective markers; later ones are visible as unlit waystones.
    s.objectives.forEach((task,i)=>drawMarker(spots[i],i<state.step?"done":i===state.step?"main":"locked",i+1,brief(task,22),t));
    if(s.side)drawMarker(sideSpot,state.side[s.id]?"done":"side","✧",brief(s.side.name,20),t);
    drawShip(gate.x,gate.y,p,state.step>=s.objectives.length,t);
    drawPlayer(hero.x,hero.y,state.scene===0,t);
    const vignette=ctx.createRadialGradient(490,270,110,500,280,610);vignette.addColorStop(0,"#00000000");vignette.addColorStop(1,"#03111a8a");ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    const nt=nearby();if(nt){const pos=nt.pos;ctx.strokeStyle="#f9dfa8";ctx.globalAlpha=.65+.25*Math.sin(t*4);ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,pos.y,51,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  }
  function drawPillar(x,y,p,i){ctx.fillStyle="#1a343b38";ellipse(x+6,y+12,24,7,"#07192355");rounded(x-10,y-22,20,41,2,i%3?"#a2a597":"#d3c4a3");rounded(x-15,y-25,30,8,2,p.edge);rounded(x-17,y+15,34,7,2,"#75827b");}
  function drawRock(x,y,p){ellipse(x,y,23,13,"#39454b");ellipse(x-4,y-6,21,11,p.ground);}
  function drawTree(x,y,p,i){ellipse(x+3,y+7,18,7,"#26372b66");rounded(x-3,y-16,6,27,2,"#756146");ellipse(x,y-24,22,25,p.flora);ellipse(x-9,y-33,11,10,"#ffffff16");if(i%4===0){ellipse(x+20,y+5,7,5,"#b4b185");}}
  function drawGhost(x,y,i,t){ctx.globalAlpha=.24+Math.sin(t*2+i)*.08;ellipse(x,y-16+Math.sin(t*2+i)*6,11,25,"#bfc1de");ellipse(x,y+12+Math.sin(t*2+i)*6,15,5,"#7e7c9b");ctx.globalAlpha=1;}
  function drawTemple(x,y,p){ctx.fillStyle="#2b3e3c";rounded(x-74,y+10,148,19,3,"#243b43");rounded(x-70,y-27,140,15,2,p.edge);for(let i=0;i<5;i++){rounded(x-53+i*26,y-78,13,55,2,"#d1c6a6");}ctx.beginPath();ctx.moveTo(x-78,y-75);ctx.lineTo(x,y-119);ctx.lineTo(x+78,y-75);ctx.closePath();ctx.fillStyle="#b2a074";ctx.fill();}
  function drawMarker(pos,kind,num,label,t){
    const col=kind==="main"?"#f4c976":kind==="side"?"#e1aaff":kind==="done"?"#87d3b5":"#73858a";
    const alpha=kind==="locked"?.36:1;
    ellipse(pos.x,pos.y+17,31,10,"#05131c88");ctx.globalAlpha=alpha;
    if(kind==="main"||kind==="side"){ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,pos.y-18,24+Math.sin(t*2)*2,0,Math.PI*2);ctx.stroke();}
    ctx.save();ctx.translate(pos.x,pos.y-18);ctx.rotate(Math.PI/4);rounded(-18,-18,36,36,4,kind==="locked"?"#52666c":"#193442");ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.strokeRect(-16,-16,32,32);ctx.restore();
    ctx.textAlign="center";ctx.fillStyle=col;ctx.font="bold 21px Georgia";ctx.fillText(kind==="done"?"✓":num,pos.x,pos.y-11);
    if(kind!=="locked"){const width=Math.min(ctx.measureText(label).width+25,220);rounded(pos.x-width/2,pos.y+16,width,25,4,"#071b25e6");ctx.fillStyle="#eceddd";ctx.font="bold 11px Arial";ctx.fillText(label,pos.x,pos.y+33);}
    ctx.globalAlpha=1;
  }
  function drawShip(x,y,p,ready,t){
    const a=ready?1:.42;ctx.globalAlpha=a;ellipse(x,y+27,50,10,"#041a2888");
    ctx.fillStyle="#614532";ctx.beginPath();ctx.moveTo(x-43,y+6);ctx.lineTo(x+45,y+6);ctx.lineTo(x+27,y+23);ctx.lineTo(x-26,y+23);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#2e2d2d";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y+7);ctx.lineTo(x,y-68);ctx.stroke();
    ctx.fillStyle=ready?"#f1dbac":"#c3c2a5";ctx.beginPath();ctx.moveTo(x+2,y-62);ctx.lineTo(x+2,y+1);ctx.lineTo(x+41,y-23);ctx.closePath();ctx.fill();
    ctx.fillStyle="#dec482";ctx.font="bold 13px Georgia";ctx.textAlign="center";ctx.fillText(ready?(state.scene===18?"FINISH":"SAIL ON"):"LOCKED",x,y+49);ctx.globalAlpha=1;
    if(ready){ctx.globalAlpha=.35+.22*Math.sin(t*3);ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-8,53,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  }
  function drawPlayer(x,y,isTele,t){
    const sway=Math.sin(t*8)*2;ellipse(x,y+17,20,7,"#0415228a");
    // Hero silhouette, gold tunic, cloak, and helmet.
    ctx.fillStyle=isTele?"#467998":"#7e4549";ctx.beginPath();ctx.moveTo(x-12,y-14);ctx.lineTo(x+14,y-11);ctx.lineTo(x+18,y+17);ctx.lineTo(x-17,y+17);ctx.closePath();ctx.fill();
    ctx.fillStyle="#e0c79a";rounded(x-9,y-14,18,28,5,isTele?"#507f95":"#c9a65b");
    ctx.fillStyle="#4d3331";rounded(x-8,y+9,6,13+sway,2,"#4b3b3b");rounded(x+2,y+9,6,13-sway,2,"#4b3b3b");
    ellipse(x,y-24,12,13,"#dfb487");ctx.fillStyle="#483b33";ctx.beginPath();ctx.arc(x,y-29,12,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle="#eed58b";rounded(x-11,y-35,22,5,2,"#e3c176");rounded(x-2,y-44,4,10,1,"#e3c176");
    ctx.fillStyle="#edf1d9";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText(isTele?"TELEMACHUS":"ODYSSEUS",x,y-58);
    ctx.strokeStyle="#fff4c4";ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y-13,23,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  function tick(dt){
    if(!$("startScreen").classList.contains("hidden")||!$("dialogueOverlay").classList.contains("hidden")||!$("panelOverlay").classList.contains("hidden"))return;
    let dx=0,dy=0;
    if(keys.has("ArrowLeft")||keys.has("a"))dx--;
    if(keys.has("ArrowRight")||keys.has("d"))dx++;
    if(keys.has("ArrowUp")||keys.has("w"))dy--;
    if(keys.has("ArrowDown")||keys.has("s"))dy++;
    if(dx||dy){waypoint=null;const l=Math.hypot(dx,dy);hero.x+=dx/l*195*dt;hero.y+=dy/l*195*dt;}
    else if(waypoint){const dist=distance(hero,waypoint);if(dist>5){hero.x+=(waypoint.x-hero.x)/dist*Math.min(dist,165*dt);hero.y+=(waypoint.y-hero.y)/dist*Math.min(dist,165*dt);}else waypoint=null;}
    hero.x=clamp(hero.x,117,923);hero.y=clamp(hero.y,167,428);updateNearby();
  }
  function frame(ms){const dt=Math.min((ms-last)/1000||0,.06);last=ms;clock+=dt;if(state&&scenes.length){tick(dt);drawWorld();}requestAnimationFrame(frame);}
  function bind(){
    $("startBtn").addEventListener("click",startFresh);$("continueBtn").addEventListener("click",resume);
    $("mapBtn").addEventListener("click",showMap);$("journalBtn").addEventListener("click",showJournal);$("helpBtn").addEventListener("click",showHelp);
    $("panelClose").addEventListener("click",closePanel);$("dialogueClose").addEventListener("click",closeDialogue);$("dialogueNext").addEventListener("click",advanceDialogue);
    $("interactBtn").addEventListener("click",interact);
    $("resetBtn").addEventListener("click",()=>{if(window.confirm("Restart the voyage? Your current progress will be cleared.")){localStorage.removeItem(STORAGE);state=freshSave();save();setScene(0);}});
    $("soundBtn").addEventListener("click",()=>{sound=!sound;$("soundBtn").textContent=sound?"♪":"♫";$("soundBtn").setAttribute("aria-label",sound?"Mute sound":"Enable sound");if(sound)ping(500);});
    window.addEventListener("keydown",e=>{
      const tag=document.activeElement?.tagName;if(tag==="SELECT")return;
      if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key))e.preventDefault();
      if(e.key==="Escape"){if(!$("panelOverlay").classList.contains("hidden"))closePanel();else if(!$("dialogueOverlay").classList.contains("hidden"))closeDialogue();return;}
      if(!$("dialogueOverlay").classList.contains("hidden")){if(e.key==="Enter"||e.key===" "){if(!popup?.choices||popup.index<popup.beats.length-1)advanceDialogue();}return;}
      if(!$("panelOverlay").classList.contains("hidden"))return;
      const k=e.key.length===1?e.key.toLowerCase():e.key;keys.add(k);
      if(k==="e")interact();
    });
    window.addEventListener("keyup",e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
    window.addEventListener("blur",()=>keys.clear());
    canvas.addEventListener("pointerdown",e=>{const rect=canvas.getBoundingClientRect();const target={x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H};if(distance(hero,target)<95){const n=nearby();if(n&&distance(n.pos,target)<75){interact();return;}}waypoint={x:clamp(target.x,117,923),y:clamp(target.y,167,428)};});
    document.querySelectorAll("[data-move]").forEach(b=>{const directions={up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"},key=directions[b.dataset.move];b.addEventListener("pointerdown",e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(key);});["pointerup","pointercancel","lostpointercapture"].forEach(ev=>b.addEventListener(ev,()=>keys.delete(key)));});
  }
  async function init(){
    bind();
    try{
      const res=await fetch("./story.json",{cache:"no-store"});if(!res.ok)throw Error("Unable to load story.json");
      const data=await res.json();scenes=data.scenes;if(!Array.isArray(scenes)||scenes.length!==19)throw Error("Expected 19 story chapters");
      const existing=readSave();state=existing||freshSave();$("loading").classList.add("hidden");$("app").classList.remove("hidden");renderHUD();$("startScreen").classList.remove("hidden");$("continueBtn").classList.toggle("hidden",!existing);requestAnimationFrame(frame);
    }catch(err){$("loading").innerHTML="<div class='sun-symbol'>✹</div><p>THE STORY COULD NOT BE LOADED.</p><p>Use a local web server or GitHub Pages (not file://), then reload.</p>";console.error(err);}
  }
  init();
})();
