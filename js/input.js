'use strict';
/* ---------- 입력 ---------- */
function groundTile(px,py){var w=toWorld(px,py,0);return {x:Math.floor(w[0]),y:Math.floor(w[1])};}
function pickBuilding(px,py){
  UI.selTile=null;
  for(var z=3.8;z>=0;z-=0.06){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    var id=occ[ty][tx];
    if(id){var b=bById(id);if(b&&z<=bHeightAt(b,tx,ty)+.05){if(isRoom(b))UI.selTile={x:tx,y:ty};return id;}}
  }
  return null;
}
function placeGhost(t){
  var d=D[UI.tool];
  UI.ghost={x:clamp(t.x-Math.floor((d.w-1)/2),0,COLS-d.w),y:clamp(t.y-Math.floor((d.h-1)/2),0,ROWS-1-d.h)};
}
function onGhostTile(t){
  if(!UI.ghost||!UI.tool||!D[UI.tool]||UI.tool==='mroom')return false;
  var d=D[UI.tool];return t.x>=UI.ghost.x&&t.x<UI.ghost.x+d.w&&t.y>=UI.ghost.y&&t.y<UI.ghost.y+d.h;
}
function onTap(px,py){
  if(S.over)return;
  if(UI.tool==='mroom'){tapRoomTile(pickTile(px,py));return;}
  if(UI.tool&&D[UI.tool]){placeGhost(groundTile(px,py));if(!UI.fold)renderDetail();return;}
  UI.sel=pickBuilding(px,py);
  if(UI.sel&&(UI.tab!=='build'||UI.fold)){UI.tab='build';UI.fold=false;syncTabs();renderPanel();}
  else renderDetail();
}
var ptrs=new Map(),gest=null;
function pts(){return Array.from(ptrs.values());}
function setupInput(){
  cv.addEventListener('pointerdown',function(e){
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){gest={mode:'tap',sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,onGhost:onGhostTile(groundTile(e.clientX,e.clientY))};}
    else if(ptrs.size===2){var a=pts();gest={mode:'pinch',d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,z:cam.z,mx:(a[0].x+a[1].x)/2,my:(a[0].y+a[1].y)/2};}
  });
  cv.addEventListener('pointermove',function(e){
    if(!ptrs.has(e.pointerId)||!gest)return;
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(gest.mode==='pinch'&&ptrs.size>=2){
      var a=pts(),d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,mx=(a[0].x+a[1].x)/2,my=(a[0].y+a[1].y)/2;
      cam.ox+=mx-gest.mx;cam.oy+=my-gest.my;gest.mx=mx;gest.my=my;
      zoomAt(mx,my,gest.z*d/gest.d);return;
    }
    if(ptrs.size!==1)return;
    if(gest.mode==='tap'&&Math.hypot(e.clientX-gest.sx,e.clientY-gest.sy)>8){gest.mode=gest.onGhost?'ghost':'pan';cv.style.cursor=gest.mode==='pan'?'grabbing':'move';}
    if(gest.mode==='pan'){cam.ox+=e.clientX-gest.lx;cam.oy+=e.clientY-gest.ly;clampCam();}
    else if(gest.mode==='ghost'){placeGhost(groundTile(e.clientX,e.clientY));if(!UI.fold)renderDetail();}
    gest.lx=e.clientX;gest.ly=e.clientY;
  });
  var end=function(e){
    if(!ptrs.has(e.pointerId))return;
    ptrs.delete(e.pointerId);
    if(gest&&gest.mode==='tap'&&ptrs.size===0&&e.type==='pointerup')onTap(e.clientX,e.clientY);
    if(ptrs.size===0){gest=null;cv.style.cursor='grab';}
    else if(ptrs.size===1){var a=pts()[0];gest={mode:'pan',sx:a.x,sy:a.y,lx:a.x,ly:a.y};}
  };
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  cv.addEventListener('wheel',function(e){e.preventDefault();zoomAt(e.clientX,e.clientY,cam.z*Math.exp(-e.deltaY*0.0015));},{passive:false});
  $('#bRot').addEventListener('click',rotateView);
  $('#bIn').addEventListener('click',function(){var c=viewCenter();zoomAt(c[0],c[1],cam.z*1.3);});
  $('#bOut').addEventListener('click',function(){var c=viewCenter();zoomAt(c[0],c[1],cam.z/1.3);});
  $('#bHome').addEventListener('click',homeView);
}
function syncTabs(){
  document.querySelectorAll('.tabs button[role="tab"]').forEach(function(b){b.classList.toggle('on',b.dataset.tab===UI.tab);});
  $('.tabs .fold').setAttribute('aria-label',UI.fold?'패널 펼치기':'패널 접기');
}
function onPanel(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  var a=el.dataset.act,v=el.dataset.v;
  if(a==='cat'){UI.cat=v;UI.tool=null;UI.ghost=null;UI.sel=null;renderBuild();}
  else if(a==='dem'){UI.tool=(UI.tool==='demolish')?null:'demolish';UI.ghost=null;UI.sel=null;renderBuild();}
  else if(a==='pick'){
    UI.tool=(UI.tool===v)?null:v;UI.sel=null;UI.undo=[];
    if(UI.tool){var c=viewCenter();placeGhost(groundTile(c[0],c[1]));}else UI.ghost=null;
    refreshCards();renderDetail();
  }
  else if(a==='cancel'){UI.ghost=null;UI.tool=null;UI.undo=[];refreshCards();renderDetail();}
  else if(a==='undo'){var u=UI.undo.pop();if(u&&removeTile(u.x,u.y,1))toast('되돌렸어요',1200);renderDetail();hud(true);}
  else if(a==='demtile'){
    var st=UI.selTile;
    if(st&&removeTile(st.x,st.y,.5))toast('칸 하나를 철거했어요',1400);
    UI.selTile=null;var rb=st&&roomAt(st.x,st.y);UI.sel=rb?rb.id:null;
    renderDetail();hud(true);
  }
  else if(a==='confirm'){
    if(UI.tool&&UI.ghost&&build(UI.tool,UI.ghost.x,UI.ghost.y)){toast(D[UI.tool].name+'을(를) 지었어요',1600);UI.ghost=null;}
    renderDetail();hud(true);
  }
  else if(a==='demolish'){var b=bById(UI.sel);if(b){var nm=defOf(b).name;demolish(UI.sel);UI.sel=null;toast(nm+'을(를) 철거했어요',1600);}renderDetail();hud(true);}
  else if(a==='hire'){var s=STAFF[v],lv=S.staff[v];if(lv<3&&S.money>=s.costs[lv]){S.money-=s.costs[lv];S.staff[v]++;recalc();save();toast(s.name+' 단계 '+S.staff[v]+'로 올렸어요',1800);}renderStaff();hud(true);}
  else if(a==='fire'){if(S.staff[v]>0){S.staff[v]--;recalc();save();}renderStaff();hud(true);}
  else if(a==='newgame'){if(UI.confirmNew){restart();}else{UI.confirmNew=true;renderMenu();}}
}
function tapRoomTile(t){
  UI.ghost={x:t.x,y:t.y};
  var p=tilePlan(t.x,t.y);
  if(p.ok&&S.money>=p.cost&&placeTile(t.x,t.y)){
    UI.undo.push({x:t.x,y:t.y});
    var d=defOf(roomAt(t.x,t.y));
    toast((p.kind==='floor'?'2층을 올렸어요':'칸을 지었어요')+' · '+d.name+' 좌석 '+d.seats,1400);
  }
  if(!UI.fold)renderDetail();
  hud(true);
}
