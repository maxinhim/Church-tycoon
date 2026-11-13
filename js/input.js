'use strict';
/* ---------- 입력 ---------- */
function pickBuilding(px,py){
  
  for(var z=MAXH*LV+6.4;z>=MINH*LV;z-=0.06){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    var id=occ[ty][tx];
    // 지면 아래로 내려간 시선이 땅에 닿으면 멈춘다
    if(z<0&&!id&&groundZ(w[0],w[1])>=z+.06)break;
    if(id){var b=bById(id),bz=b?bZ(b):0;if(b&&z>=bz-.05&&z<=bz+bHeightAt(b,tx,ty)+.05){return id;}}
  }
  return null;
}
function placeGhost(t){
  // 다리 밑 땅을 눌렀으면 밑에, 데크를 눌렀으면 데크 위에 놓는다
  UI.plLow=!t.pid&&t.x>=0&&t.y>=0&&t.x<COLS&&t.y<ROWS&&piecesAt(t.x,t.y).length>0;
  var d=faceDims(D[UI.tool],UI.face);
  UI.ghost={x:clamp(t.x-Math.floor((d.w-1)/2),0,COLS-d.w),y:clamp(t.y-Math.floor((d.h-1)/2),0,ROWS-RD-d.h)};
}
function onGhostTile(t){
  if(!UI.ghost||!UI.tool||!D[UI.tool]||isFloorDef(UI.tool)||isTerDef(UI.tool)||UI.tool==='path')return false;
  var d=faceDims(D[UI.tool],UI.face);return t.x>=UI.ghost.x&&t.x<UI.ghost.x+d.w&&t.y>=UI.ghost.y&&t.y<UI.ghost.y+d.h;
}
function onTap(px,py){
  if(S.over)return;
  // 교회 입구를 누르면 문 열기·닫기 카드. 다른 곳을 누르면 카드는 닫힌다
  var popOpen=!$('#gatePop').hidden;
  if(!isPlacing()&&gateHit(px,py)){if(popOpen)closeGatePop();else openGatePop();return;}
  if(popOpen)closeGatePop();
  // 문 자리 고르는 중: 뜬 자리 가운데 하나를 누르면 옮기고, 다른 곳을 누르면 그만둔다
  // 바닥: 누른 칸으로 시작 자리만 옮긴다 (칠하기는 ✓)
  if(isFloorDef(UI.tool)||isTerDef(UI.tool)){var ft=groundTile(px,py);UI.ghost={x:clamp(ft.x,0,COLS-1),y:clamp(ft.y,0,ROWS-RD-1)};if(ft.pid&&isFloorDef(UI.tool))UI.ghost.pid=ft.pid;if(!UI.fold)renderDetail();return;}
  if(UI.tool==='path'){pcStartAt(px,py);if(!UI.fold)renderDetail();return;}
  if(UI.tool&&D[UI.tool]){if(!ghostHit(px,py))placeGhost(groundTile(px,py));if(!UI.fold)renderDetail();return;}
  // 지은 것을 누르면 패널을 열지 않고 그 위에 작은 카드만 띄운다 (열려 있던 패널은 닫는다)
  var dem=UI.tool==='demolish',sel=pickBuilding(px,py),pp=sel?null:pickPieceAt(px,py);
  // 건물·길이 아니면 땅 칸 카드 (바닥 깔기·바꾸기, 땅 높이기, 경사로). 다른 카드가 열려 있으면 이번 누름은 닫기만 한다
  var ft=null,wasOpen=!!(UI.sel||UI.selPiece||UI.selFloor);
  if(!sel&&!pp&&!wasOpen&&!dem){var gt=groundTile(px,py);if(gt.x>=0&&gt.y>=0&&gt.x<COLS&&gt.y<PZ&&!gt.pid)ft={x:gt.x,y:gt.y};}
  if((sel||pp||ft)&&!UI.fold)closeDock();
  UI.sel=sel;UI.selPiece=pp?pp.id:null;UI.selFloor=ft;
  // 철거 모드에서 골랐으면 철거 버튼이 보이게 펼쳐 둔다
  if(dem&&(sel||pp)){scKey=sel?'b'+sel:'p'+pp.id;scMore=true;}
  renderDetail();
}
var ptrs=new Map(),gest=null;
function pts(){return Array.from(ptrs.values());}
function setupInput(){
  cv.addEventListener('pointerdown',function(e){
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){
      // 미리보기는 바닥뿐 아니라 지붕 쪽을 잡아도 끌린다. 잡은 곳 기준으로 움직여 튀지 않게
      var og=onGhostTile(groundTile(e.clientX,e.clientY))||ghostHit(e.clientX,e.clientY);
      gest={mode:'tap',sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,onGhost:og,g0:og?{x:UI.ghost.x,y:UI.ghost.y}:null,w0:toWorld(e.clientX,e.clientY,0)};
    }
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
    else if(gest.mode==='ghost'){
      var w=toWorld(e.clientX,e.clientY,0),gd=faceDims(D[UI.tool],UI.face);
      var nx=clamp(gest.g0.x+Math.round(w[0]-gest.w0[0]),0,COLS-gd.w),ny=clamp(gest.g0.y+Math.round(w[1]-gest.w0[1]),0,ROWS-RD-gd.h);
      if(nx!==UI.ghost.x||ny!==UI.ghost.y){UI.ghost.x=nx;UI.ghost.y=ny;renderDetail();}
    }
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
}
function syncTabs(){
  var g=UI.scr?(UI.scr==='events'?'minis':UI.scr):(UI.fold?'':tabGroup(UI.tab));
  document.querySelectorAll('#fab [data-fab]').forEach(function(b){var on=b.dataset.fab===g;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  var m=$('#bMenu');if(m)m.setAttribute('aria-pressed',String(g==='menu'));
}
var SPEND_ACTS={invest:1,cpick:1,fswap:1,gter:1,wswap:1,wfill:1,wbridge:1,pbuild:1,gramp:1,wfount:1};
function onPanel(e){
  var el=e.target.closest('[data-act]'),sa=el&&SPEND_ACTS[el.dataset.act],m0=S.money,pos=sa?spendPos():null;
  onPanel0(e);if(sa)spendFx(m0,pos);
}
function onPanel0(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  var a=el.dataset.act,v=el.dataset.v;
  if(a==='close'){closeDock();return;}
  if(a==='subtab'){UI.tab=v;if(tabGroup(v)==='minis')UI.minisTab=v;else UI.statusTab=v;renderPanel();return;}
  if(a==='cat'){UI.cat=v;UI.bstep='items';UI.tool=null;UI.ghost=null;UI.sel=null;UI.selPiece=null;UI.pc=null;renderPanel();}
  if(a==='choose'){openChooser(v);return;}
  if(a==='cback'){chooseBack();return;}
  if(a==='cpick'){choosePick(v);return;}
  if(a==='bback'){UI.bstep='cat';if(UI.tool==='demolish')UI.tool=null;renderPanel();return;}
  if(a==='csub'){UI.csub=v;UI.tool=null;UI.ghost=null;renderPanel();}
  else if(a==='dem'){UI.bstep='items';UI.tool=(UI.tool==='demolish')?null:'demolish';UI.ghost=null;UI.sel=null;UI.selPiece=null;UI.pc=null;renderPanel();}
  else if(a==='pick'){
    // 고르면 패널을 닫고 지도에서 바로 짓는다
    if(isLocked(v)){toast(D[v].name+'은(는) '+lockLabel(v)+' 지을 수 있어요',1800);return;}
    startPlace(v);
  }
  else if(a==='cancel'){endPlace();}
  else if(a==='link'){openChooser('linkf');}
  else if(a==='linkf'){var lbd=bById(UI.sel),lw=linkDoor(lbd,v);UI.linkPick=null;if(lw){toast(lw,1600);sfx('error',.4);}else{toast('입구까지 '+D[v].name+'을(를) 깔았어요',1600);sfx('floor',.5);}renderDetail();hud(true);}
  else if(a==='undoLast'){var ul=UI.lastBuilt,un=ul&&bById(ul.bid)?defOf(bById(ul.bid)).name:'';if(unbuild(ul))toast(un+'을(를) 되돌렸어요',1400);UI.lastBuilt=null;renderDetail();hud(true);}
  else if(a==='pbar'){UI.pbarOpen=!UI.pbarOpen;renderDetail();}
  else if(a==='pslope'){UI.pc.slope=+v;UI.pbarOpen=false;renderDetail();}
  else if(a==='invest'){var ib=bById(UI.sel),il0=ib&&bLv(ib),iw=ib&&investWhy(ib);if(iw){toast(iw,1600);sfx('error',.4);}else if(ib){investBld(ib);if(bLv(ib)>il0){toast(defOf(ib).name+' Lv '+bLv(ib)+(bStage(ib)!==(il0<=3?1:il0<=6?2:3)?' · 모습이 바뀌었어요':''),2000);sfx('bell',.6,0);}renderSelCard();hud(true);}}
  else if(a==='pkind'){UI.pc.k=v;UI.pbarOpen=false;renderDetail();}
  else if(a==='pbuild'){var why=pcBuild();if(why)toast(why,1600);renderDetail();hud(true);}
  else if(a==='pundo'){if(pcUndo())toast('되돌렸어요',1000);renderDetail();hud(true);}
  else if(a==='dempiece'){var pc2=pieceById(UI.selPiece),dw=pieceDemWhy(pc2);if(pc2&&dw){toast(dw,1800);sfx('error',.4);return;}if(pc2){var pn=pieceName(pc2);removePiece(pc2.id,.5);sfx('demolish',.7);toast(pn+'을(를) 철거했어요',1400);}UI.selPiece=null;renderDetail();hud(true);}
  else if(a==='undo'){
    var ok2=isTerDef(UI.tool)?terUndoLast():isFloorDef(UI.tool)?floorUndo():(function(){var u=UI.undo.pop();if(!u)return false;return unbuild(u);})();
    if(ok2)toast('되돌렸어요',1200);renderDetail();hud(true);
  }
  else if(a==='fswap'||a==='demfloor'){
    var tid=a==='demfloor'?'f_erase':v,sp=UI.selPiece&&pieceById(UI.selPiece),sf=UI.selFloor;
    var fx=sp?sp.x:sf&&sf.x,fy=sp?sp.y:sf&&sf.y,fsl=fx==null?null:floorSlot(fx,fy,sp?sp.id:0),fprev=fsl?fsl.get():null;
    var fw=fx==null?'바닥을 먼저 고르세요':floorSwap(fx,fy,tid,sp?sp.id:0);
    if(fw){toast(fw,1600);sfx('error',.4);renderDetail();hud(true);return;}
    sfx(tid==='f_erase'?'demolish':'floor',.6);
    if(tid==='f_erase'){toast('바닥을 걷어냈어요',1200);if(sf&&!sp)UI.selFloor=null;renderDetail();hud(true);return;}
    // 바꾼 뒤 바닥 깔기로 넘어가 화살표 쪽으로 이어 바꾼다
    startFloorFrom(fx,fy,sp?sp.id:0,tid,fprev);hud(true);
  }
  else if(a==='gter'){
    var gf=UI.selFloor,gw=gf?terApply(gf.x,gf.y,'ter_set',+v):'칸을 먼저 고르세요';
    if(gw){toast(gw,1600);sfx('error',.4);}else{sfx('place',.6);toast('땅 '+lvName(+v),1000);}
    renderDetail();hud(true);
  }
  else if(a==='wfill'||a==='wdrain'){
    var wf=UI.selFloor;if(!wf)return;
    var ww=a==='wfill'?fillWater(wf.x,wf.y):drainWater(wf.x,wf.y);
    if(ww){toast(ww,2000);sfx('error',.4);}else{sfx('place',.6);toast(a==='wfill'?'물을 채웠어요':'물을 뺐어요',1200);}
    renderDetail();hud(true);
  }
  else if(a==='wmode'){UI.wallMode=!UI.wallMode;renderDetail();}
  else if(a==='wswap'){
    var wsf=UI.selFloor;if(!wsf)return;
    var keepU=UI.undo;UI.undo=null;var wsw=wallSwap(wsf.x,wsf.y,v);UI.undo=keepU;
    if(wsw){toast(wsw,1600);sfx('error',.4);}else sfx(v==='f_erase'?'demolish':'floor',.6);
    renderDetail();hud(true);
  }
  else if(a==='wbridge'){
    var bf=UI.selFloor;if(!bf)return;
    extStart('path');var bc=UI.pc;bc.k='arch';bc.x=bf.x;bc.y=bf.y;bc.l=0;bc.slope=0;bc.hist=[];renderDetail();
  }
  else if(a==='wfount'){
    var ff=UI.selFloor;if(!ff)return;
    UI.selFloor=null;UI.tab='build';UI.fold=false;UI.cat='garden';startPlace('wfount');UI.ghost={x:ff.x,y:ff.y};renderDetail();
  }
  else if(a==='gramp'){
    var rf=UI.selFloor;if(!rf)return;
    UI.selFloor=null;UI.tab='build';UI.fold=false;UI.cat='path';startPlace('ter_ramp');UI.ghost={x:rf.x,y:rf.y};renderDetail();
  }
  else if(a==='fexp'){UI.fexp=UI.fexp===v?null:v;renderFinance();}
  else if(a==='tlv'){UI.tlv=clamp(UI.tlv+(+v),MINH,MAXH-1);renderDetail();}
  else if(a==='plevel'){UI.pc.l=clamp(UI.pc.l+(+v),MINH,MAXL);renderDetail();}
  else if(a==='move'){startMove(bById(UI.sel));}
  else if(a==='demolish'){var b=bById(UI.sel),lw1=lastHallWhy(b);if(lw1){toast(lw1,2600);sfx('error',.4);return;}if(b){var nm=defOf(b).name;demolish(UI.sel);sfx('demolish',.8);UI.sel=null;toast(nm+'을(를) 철거했어요',1600);}renderDetail();hud(true);}
  else if(a==='newgame'){if(v&&DIFF[v]){restart(v);}else{UI.confirmNew=!UI.confirmNew;renderMenu();}}
  else{
    var msg='',done='';
    if(a==='hireA'){var cnd=S.cands[+v];msg=hireAssoc(+v);done=cnd?cnd.name+' '+cnd.title+'님을 청빙했어요':'';}
    else if(a==='dismiss'){dismissAssoc(+v);done='부교역자가 사임했어요';}
    else if(a==='searchA'){msg=searchCands();done='새 후보를 찾았어요';}
    else if(a==='runEv'){msg=runEvent(v);done=EVENTS[v]?EVENTS[v].name+'을(를) 열었어요':'';if(!msg)F.push({x:entC(),y:PZ-2.5,z:1.4,t:2.4,d:2.4,text:EVENTS[v].name,col:'#ffe28a',big:1});}
    else if(a==='repair'){msg=repair(bById(UI.sel));done='수리를 마쳤어요';}
    else if(a==='repairAll'){msg=repairAll();done='낡은 건물을 모두 고쳤어요';}
    else if(a==='borrow'){msg=borrow(v);done=LOANS[v]?LOANS[v].name+' '+fmt(LOANS[v].amt)+'을 받았어요':'';}
    else if(a==='repay'){msg=repayLoan(+v);done='대출을 모두 갚았어요';}
    else return;
    toast(msg||done,1800);renderPanel();hud(true);
    if(msg)sfx('error',.4);else if(a==='repair'||a==='repairAll')sfx('build',.8);else if(a==='borrow'||a==='repay')sfx('coins',.7);else sfx('click',.5);
  }
}
