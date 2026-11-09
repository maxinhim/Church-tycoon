'use strict';
/* ---------- 입력 ---------- */
function groundTile(px,py){var w=toWorld(px,py,0);return {x:Math.floor(w[0]),y:Math.floor(w[1])};}
function pickBuilding(px,py){
  UI.selTile=null;
  for(var z=6.4;z>=0;z-=0.06){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    var id=occ[ty][tx];
    if(id){var b=bById(id);if(b&&z<=bHeightAt(b,tx,ty)+.05){if(isRoom(b))UI.selTile={x:tx,y:ty};return id;}}
  }
  return null;
}
function placeGhost(t){
  var d=faceDims(D[UI.tool],UI.face);
  UI.ghost={x:clamp(t.x-Math.floor((d.w-1)/2),0,COLS-d.w),y:clamp(t.y-Math.floor((d.h-1)/2),0,ROWS-1-d.h)};
}
function onGhostTile(t){
  if(!UI.ghost||!UI.tool||!D[UI.tool]||isRoomDef(UI.tool)||isFloorDef(UI.tool)||UI.tool==='path')return false;
  var d=faceDims(D[UI.tool],UI.face);return t.x>=UI.ghost.x&&t.x<UI.ghost.x+d.w&&t.y>=UI.ghost.y&&t.y<UI.ghost.y+d.h;
}
function onTap(px,py){
  if(S.over)return;
  if(isRoomDef(UI.tool)){tapRoomTile(pickTile(px,py));return;}
  if(isFloorDef(UI.tool)){var ft=groundTile(px,py);UI.ghost={x:ft.x,y:ft.y};var fw=paintFloor(ft.x,ft.y,UI.tool);if(fw)toast(fw,1200);if(!UI.fold)renderDetail();hud(true);return;}
  if(UI.tool==='path'){pcStartAt(px,py);if(!UI.fold)renderDetail();return;}
  if(UI.tool&&D[UI.tool]){placeGhost(groundTile(px,py));if(!UI.fold)renderDetail();return;}
  UI.sel=pickBuilding(px,py);
  var pp=UI.sel?null:pickPieceAt(px,py);UI.selPiece=pp?pp.id:null;
  if((UI.sel||UI.selPiece)&&(UI.tab!=='build'||UI.fold)){UI.tab='build';UI.fold=false;syncTabs();renderPanel();}
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
  var g=UI.fold?'':tabGroup(UI.tab);
  document.querySelectorAll('#fab [data-fab]').forEach(function(b){var on=b.dataset.fab===g;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  var m=$('#bMenu');if(m)m.setAttribute('aria-pressed',String(g==='menu'));
}
function onPanel(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  var a=el.dataset.act,v=el.dataset.v;
  if(a==='close'){closeDock();return;}
  if(a==='subtab'){UI.tab=v;UI.minisTab=v;renderPanel();return;}
  if(a==='cat'){UI.cat=v;UI.tool=null;UI.ghost=null;UI.sel=null;UI.selPiece=null;UI.pc=null;renderBuild();}
  else if(a==='dem'){UI.tool=(UI.tool==='demolish')?null:'demolish';UI.ghost=null;UI.sel=null;UI.selPiece=null;UI.pc=null;renderBuild();}
  else if(a==='pick'){
    if(UI.tool!==v&&isLocked(v)){toast(D[v].name+'은(는) '+lockText(lockGoal(v))+' 지을 수 있어요',1800);return;}
    UI.tool=(UI.tool===v)?null:v;UI.sel=null;UI.selPiece=null;UI.undo=[];UI.pc=UI.tool==='path'?newCursor():null;
    if(UI.tool&&UI.tool!=='path'){var c=viewCenter();placeGhost(groundTile(c[0],c[1]));}else UI.ghost=null;
    refreshCards();renderDetail();
  }
  else if(a==='cancel'){UI.ghost=null;UI.tool=null;UI.undo=[];UI.pc=null;refreshCards();renderDetail();}
  else if(a==='face'){UI.face=screenToWorldDir(+v);if(UI.ghost){var gd=faceDims(D[UI.tool],UI.face);UI.ghost.x=clamp(UI.ghost.x,0,COLS-gd.w);UI.ghost.y=clamp(UI.ghost.y,0,ROWS-1-gd.h);}renderDetail();}
  else if(a==='pdir'){UI.pc.dir=screenToWorldDir(+v);renderDetail();}
  else if(a==='pslope'){UI.pc.slope=+v;renderDetail();}
  else if(a==='pkind'){if(v==='sky'&&isLocked('sky')){toast('연결 다리는 '+lockText(lockGoal('sky'))+' 지을 수 있어요',1800);return;}UI.pc.k=v;renderDetail();}
  else if(a==='pbuild'){var why=pcBuild();if(why)toast(why,1600);renderDetail();hud(true);}
  else if(a==='pundo'){if(pcUndo())toast('되돌렸어요',1000);renderDetail();hud(true);}
  else if(a==='door'){var pr=v.split(':');cycleDoor(bById(UI.sel),pr[0],+pr[1]);renderDetail();}
  else if(a==='dempiece'){var pc2=pieceById(UI.selPiece);if(pc2){var pn=pieceName(pc2);removePiece(pc2.id,.5);toast(pn+'을(를) 철거했어요',1400);}UI.selPiece=null;renderDetail();hud(true);}
  else if(a==='undo'){
    var ok2=isFloorDef(UI.tool)?floorUndo():(function(){var u=UI.undo.pop();return !!u&&removeTile(u.x,u.y,1);})();
    if(ok2)toast('되돌렸어요',1200);renderDetail();hud(true);
  }
  else if(a==='floorup'){var fb=bById(UI.sel),bs0=snapStats(),fw2=addFloor(fb);toast(fw2||'한 층 올렸어요',1400);if(!fw2&&fb){var fdm=bDims(fb);statFx(bs0,fb.x+fdm.w/2,fb.y+fdm.h/2,bHeight(fb));}renderDetail();hud(true);}
  else if(a==='floordown'){if(removeFloor(bById(UI.sel),.5))toast('맨 위층을 철거했어요',1400);renderDetail();hud(true);}
  else if(a==='plevel'){UI.pc.l=clamp(UI.pc.l+(+v),0,MAXL);renderDetail();}
  else if(a==='demtile'){
    var st=UI.selTile;
    if(st&&removeTile(st.x,st.y,.5))toast('칸 하나를 철거했어요',1400);
    UI.selTile=null;var rb=st&&roomAt(st.x,st.y);UI.sel=rb?rb.id:null;
    renderDetail();hud(true);
  }
  else if(a==='confirm'){
    var cb0=snapStats(),gx=UI.ghost&&UI.ghost.x,gy=UI.ghost&&UI.ghost.y;
    if(UI.tool&&UI.ghost&&!isLocked(UI.tool)&&build(UI.tool,gx,gy,UI.face)){
      var cdm=faceDims(D[UI.tool],UI.face);statFx(cb0,gx+cdm.w/2,gy+cdm.h/2,heightOf(UI.tool)+.2);
      toast(D[UI.tool].name+'을(를) 지었어요',1600);UI.ghost=null;
    }
    renderDetail();hud(true);
  }
  else if(a==='demolish'){var b=bById(UI.sel);if(b){var nm=defOf(b).name;demolish(UI.sel);UI.sel=null;toast(nm+'을(를) 철거했어요',1600);}renderDetail();hud(true);}
  else if(a==='hire'){var hw=hireTeam(v);toast(hw||STAFF[v].name+' 단계 '+S.staff[v]+'로 올렸어요',1800);renderStaff();hud(true);}
  else if(a==='fire'){if(S.staff[v]>0){S.staff[v]--;recalc();save();}renderStaff();hud(true);}
  else if(a==='newgame'){if(v&&DIFF[v]){restart(v);}else{UI.confirmNew=!UI.confirmNew;renderMenu();}}
  else{
    var msg='',done='';
    if(a==='rest'){msg=restWeek();done='한 주 쉬었어요. 체력이 회복됐어요';}
    else if(a==='hireA'){var cnd=S.cands[+v];msg=hireAssoc(+v);done=cnd?cnd.name+' '+cnd.title+'님을 청빙했어요':'';}
    else if(a==='dismiss'){dismissAssoc(+v);done='부교역자가 사임했어요';}
    else if(a==='searchA'){msg=searchCands();done='새 후보를 찾았어요';}
    else if(a==='appoint'){msg=appoint(v);done=OFFICE[v]?OFFICE[v].name+'를 임명했어요':'';if(!msg)F.push({x:ENT+.5,y:ROWS-2,z:1.4,t:2.2,d:2.2,text:OFFICE[v].name+' 임직',col:'#ffe28a',big:1});}
    else if(a==='runEv'){msg=runEvent(v);done=EVENTS[v]?EVENTS[v].name+'을(를) 열었어요':'';if(!msg)F.push({x:ENT+.5,y:ROWS-2,z:1.4,t:2.4,d:2.4,text:EVENTS[v].name,col:'#ffe28a',big:1});}
    else if(a==='repair'){msg=repair(bById(UI.sel));done='수리를 마쳤어요';}
    else if(a==='repairAll'){msg=repairAll();done='낡은 건물을 모두 고쳤어요';}
    else if(a==='buyLand'){msg=buyLand();done='부지를 넓혔어요';}
    else return;
    toast(msg||done,1800);renderPanel();hud(true);
  }
}
function tapRoomTile(t){
  UI.ghost={x:t.x,y:t.y};
  var p=tilePlan(t.x,t.y,UI.tool),tb0=snapStats();
  if(p.ok&&S.money>=p.cost&&placeTile(t.x,t.y,UI.tool)){
    var tf=tileOf(roomAt(t.x,t.y,UI.tool),t.x,t.y).f;statFx(tb0,t.x+.5,t.y+.5,roomTop(tf)+.2);
    UI.undo.push({x:t.x,y:t.y});
    var rb=roomAt(t.x,t.y,UI.tool),d=defOf(rb);
    toast((p.kind==='floor'?tileOf(rb,t.x,t.y).f+'층으로 올렸어요':'칸을 지었어요')+' · '+d.name,1400);
  }
  if(!UI.fold)renderDetail();
  hud(true);
}
