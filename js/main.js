'use strict';
function restart(){
  S=newState();V=[];F=[];UI.tool=null;UI.ghost=null;UI.sel=null;UI.selTile=null;UI.undo=[];UI.confirmNew=false;UI.tab='build';UI.cat='worship';UI.fold=false;ROT=0;
  $('#over').hidden=true;rebuildOcc();recalc();syncTabs();renderPanel();homeView();hud(true);save();toast('새 교회를 시작합니다',2000);
}
/* 가로 전용: 세로일 때는 시뮬레이션을 멈추고 조작을 막는다 (안내 화면은 CSS #rotate) */
var portraitMQ=window.matchMedia('(orientation: portrait)');
function isPortrait(){return portraitMQ.matches;}
function syncOrientation(){
  var p=isPortrait();
  ['#stage','#ui','#over'].forEach(function(s){var e=$(s);if(e)e.inert=p;});
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

/* ---------- 시작 ---------- */
var last=0;
function frame(ts){
  var dt=Math.min(0.25,(ts-last)/1000||0);last=ts;
  if(UI.speed>0&&!document.hidden&&!isPortrait()){var sim=dt*UI.speed;while(sim>1e-6){var d=Math.min(0.1,sim);update(d);sim-=d;}}
  draw();hud(false);
  requestAnimationFrame(frame);
}
function init(){
  cv=$('#cv');ctx=cv.getContext('2d');
  S=load();rebuildOcc();recalc();
  document.querySelectorAll('.sp button').forEach(function(b){
    b.addEventListener('click',function(){
      UI.speed=+b.dataset.sp;
      document.querySelectorAll('.sp button').forEach(function(x){x.classList.toggle('on',x===b);});
    });
  });
  document.querySelectorAll('.tabs button').forEach(function(b){
    b.addEventListener('click',function(){
      if(b.dataset.tab==='fold'){UI.fold=!UI.fold;}
      else{UI.tab=b.dataset.tab;UI.fold=false;UI.confirmNew=false;}
      syncTabs();renderPanel();
    });
  });
  $('#panel').addEventListener('click',onPanel);
  $('#over').addEventListener('click',function(e){if(e.target.closest('[data-act="restart"]'))restart();});
  setupInput();
  if(window.ResizeObserver)new ResizeObserver(resize).observe($('#stage'));
  window.addEventListener('resize',resize);
  if(portraitMQ.addEventListener)portraitMQ.addEventListener('change',syncOrientation);else portraitMQ.addListener(syncOrientation);
  syncOrientation();lockLandscape();
  document.addEventListener('pointerdown',lockLandscape,{once:true});
  document.addEventListener('visibilitychange',function(){if(document.hidden)save();});
  resize();renderPanel();hud(true);
  setInterval(function(){if(UI.tab==='status'&&!UI.fold&&!S.over)renderStatus();},1500);
  if(S.over)showOver();
  requestAnimationFrame(frame);
}
if(window.__CT_TEST){window.__ct={get S(){return S;},get V(){return V;},update:update,build:build,canPlace:canPlace,D:D,DEFS:DEFS,recalc:recalc,init:init,draw:draw,
  setRot:function(r){ROT=r;},home:homeView,get UI(){return UI;},placeGhost:placeGhost};}
else init();
