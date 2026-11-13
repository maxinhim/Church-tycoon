'use strict';
function restart(dk){
  S=newState(dk||S.diff);V=[];F=[];CF=[];UI.tool=null;UI.ghost=null;UI.sel=null;UI.undo=[];UI.pc=null;UI.selPiece=null;UI.face=2;UI.confirmNew=false;UI.lastBuilt=null;UI.tab='build';UI.cat='worship';UI.fold=true;ROT=0;
  $('#over').hidden=true;$('#dlg').hidden=true;refreshCands();rebuildOcc();recalc();S.lvl=null;levelTick(true);syncTabs();renderPanel();homeView();hud(true);syncSpeed();save();toast('새 교회를 시작합니다 · '+curDiff().name,2000);
}
/* 가로 전용: 세로일 때는 시뮬레이션을 멈추고 조작을 막는다 (안내 화면은 CSS #rotate) */
var portraitMQ=window.matchMedia('(orientation: portrait)');
function isPortrait(){return portraitMQ.matches;}
function syncOrientation(){
  var p=isPortrait();
  ['#stage','#ui','#place','#gatePop','#selCard','#rcpt','#over','#dlg','#cele','#lvup'].forEach(function(s){var e=$(s);if(e)e.inert=p;});
}
function lockLandscape(){
  try{var o=screen.orientation;if(o&&o.lock)o.lock('landscape').catch(function(){});}catch(e){}
}
var sized=false;
function resize(){
  var st=$('#stage'),w=st.clientWidth,h=st.clientHeight;
  if(!w||!h)return;
  var keep=sized?(function(){var c=viewCenter();return toWorld(c[0],c[1],0);})():null;
  VW=w;VH=h;DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(w*DPR);cv.height=Math.round(h*DPR);
  ZMIN=fitZoom()*0.85;
  if(!sized){sized=true;homeView();}
  else{cam.z=clamp(cam.z,ZMIN,ZMAX);centerOn(keep[0],keep[1]);}
}

function setGear(open){$('#gearMenu').hidden=!open;$('#bGear').setAttribute('aria-expanded',String(open));}
// 속도가 1×가 아니면 톱니바퀴에 작은 표시 (메뉴를 닫아도 멈춤·배속을 알 수 있게)
// 빠르게 감기(2×~8×)는 테스트 모드에서만. 일시정지·1×는 모든 모드
function fastOk(){return S&&S.diff==='easy';}
function gameSpeed(){return fastOk()?UI.speed:Math.min(1,UI.speed);}
function syncSpeed(){
  if(!fastOk()&&UI.speed>1)UI.speed=1;
  document.querySelectorAll('.sp button[data-sp]').forEach(function(x){var v=+x.dataset.sp;x.hidden=v>1&&!fastOk();x.classList.toggle('on',v===UI.speed);});var b=$('#spBadge');b.hidden=UI.speed===1;b.textContent=UI.speed===0?'II':UI.speed+'×';$('#bGear').setAttribute('aria-label','설정: 게임 속도'+(UI.speed===0?' (일시정지 중)':UI.speed===1?'':' ('+UI.speed+'배속)')+'와 메뉴');}
/* ---------- 시작 ---------- */
var last=0;
function frame(ts){
  var dt=Math.min(0.25,(ts-last)/1000||0);last=ts;
  stepFx(dt);stepWx(dt);stepAudio(dt);
  // 목회 고민 카드가 열려 있으면 시간이 멈춘다
  if(UI.speed>0&&!document.hidden&&!isPortrait()&&!S.dlg){var sim=dt*gameSpeed();while(sim>1e-6){var d=Math.min(0.1,sim);update(d);sim-=d;}}
  draw();syncPlace();syncGate();syncSelCard();hud(false);
  requestAnimationFrame(frame);
}
function init(){
  cv=$('#cv');ctx=cv.getContext('2d');
  S=load();if(!S.cands||!S.cands.length)refreshCands();rebuildOcc();recalc();levelTick(true);
  // 속도 버튼만 (같은 줄 모양의 소리 버튼은 audio.js가 맡는다)
  document.querySelectorAll('.sp button[data-sp]').forEach(function(b){
    b.addEventListener('click',function(){
      UI.speed=+b.dataset.sp;
      syncSpeed();
    });
  });
  syncSpeed();
  document.querySelectorAll('#fab [data-fab]').forEach(function(b){b.addEventListener('click',function(){openGroup(b.dataset.fab);});});
  $('#bMenu').addEventListener('click',function(){setGear(false);openGroup('menu');});
  $('#bGear').addEventListener('click',function(){setGear($('#gearMenu').hidden);});
  // 톱니바퀴 메뉴 바깥을 누르거나 Esc를 누르면 닫는다
  document.addEventListener('pointerdown',function(e){if(!$('#gearMenu').hidden&&!e.target.closest('#gear'))setGear(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#gearMenu').hidden){setGear(false);$('#bGear').focus();}});
  $('#dock').addEventListener('click',onPanel);
  $('#over').addEventListener('click',function(e){if(e.target.closest('[data-act="restart"]'))restart();});
  $('#dlg').addEventListener('click',function(e){var b=e.target.closest('[data-act="dlg"]');if(!b)return;var why=chooseDlg(+b.dataset.v);if(why)toast(why,1600);showDlg();renderPanel();hud(true);});
  $('#cele').addEventListener('click',function(){$('#cele').hidden=true;});
  $('#lvup').addEventListener('click',function(){$('#lvup').hidden=true;});
  $('#clvl').addEventListener('click',levelInfo);
  $('#gpBtn').addEventListener('click',toggleGate);
  $('#clock').addEventListener('click',wxExplain);
  $('#clock').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();wxExplain();}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#gatePop').hidden)closeGatePop();});
  // 주일 정산 화면은 어디를 눌러도 그냥 사라진다 (재정 내역은 현황 › 재정에서 본다)
  $('#rcpt').addEventListener('click',function(){$('#rcpt').hidden=true;});
  if(!S.open&&qDone('f6'))setTimeout(function(){toast('준비가 되면 자물쇠가 달린 교회 입구(파란 아치)를 눌러 문을 여세요',4600);},600);
  setupInput();setupPlace();setupSelCard();setupScreens();setupAudio();loadSprites();
  if(window.ResizeObserver)new ResizeObserver(resize).observe($('#stage'));
  window.addEventListener('resize',resize);
  if(portraitMQ.addEventListener)portraitMQ.addEventListener('change',syncOrientation);else portraitMQ.addListener(syncOrientation);
  syncOrientation();lockLandscape();
  document.addEventListener('pointerdown',lockLandscape,{once:true});
  document.addEventListener('visibilitychange',function(){if(document.hidden)save();});
  resize();renderPanel();hud(true);
  if(S.over)showOver();
  if(S.dlg)showDlg();
  requestAnimationFrame(frame);
}
if(window.__CT_TEST){window.__ct={get S(){return S;},get V(){return V;},update:update,build:build,canPlace:canPlace,D:D,DEFS:DEFS,recalc:recalc,init:init,draw:draw,
  setRot:function(r){ROT=r;},home:homeView,get UI(){return UI;},placeGhost:placeGhost};}
else init();
