'use strict';
/* ---------- 지도 위에서 짓기 ----------
   건축 목록에서 하나를 고르면 패널은 닫히고 지도에서 바로 짓는다.
   · 건물·조경: 반투명 미리보기 둘레의 화살표로 정면 방향을 고르고, 왼쪽 위 ✓로 짓고 오른쪽 위 ✕로 그만둔다.
     미리보기는 끌어서 옮기거나 지도를 눌러 옮긴다. 조경·꾸미기는 길처럼 화살표 쪽으로 한 칸씩 이어 짓는다
     (앞뒤가 뚜렷한 벤치 등은 화살표가 정면이고 옆으로 늘어선다).
   · 길: 커서 칸 둘레 화살표로 방향, ✓로 한 칸씩 잇는다. 종류·경사·높이는 아래 작은 띠에서.
   · 칸 건물·바닥: 지도를 누르면 바로 지어진다. 띠에 되돌리기·완료만 둔다.
   아래 띠(#pbar)는 이름·비용·효과, 지을 수 없으면 그 까닭을 보여 준다. */
var REPEAT_CATS=['garden','deco'],LINE_KINDS=['fence','hedge'],FRONT_KINDS=['bench','picnic','board','bell','bikerack','arch'],plLock=0,plHtml='',PL_DIRNAME=['오른쪽 아래','왼쪽 아래','왼쪽 위','오른쪽 위'];
function isPlacing(){return !UI.fold&&UI.tab==='build'&&!!UI.tool&&UI.tool!=='demolish';}
function placeKind(){
  if(!isPlacing())return '';
  if(UI.tool==='path')return 'path';
  if(isRoomDef(UI.tool))return 'room';
  if(isFloorDef(UI.tool)||isTerDef(UI.tool))return 'floor';
  return D[UI.tool]?'bld':'';
}
/* 화살표의 뜻 (arrowMode)
   · 'face' 바라보는 방향: 건물, 그리고 앞뒤가 뚜렷한 꾸미기(벤치·피크닉 테이블·게시판·종·거치대·꽃 아치)
   · 'line' 이어 짓는 방향: 나머지 조경·꾸미기. ✓마다 한 칸씩 화살표 쪽으로 나아간다.
            울타리·생울타리는 짓는 방향을 따라 눕는다
   · 'none' 화살표 없음: 방향이 상관없는 것을 옮길 때
   방향이 상관없는 것(나무·분수·파라솔 등)은 입구 아치 쪽을 보게 저절로 정한다 (문이 있으면 문도 그쪽) */
// 조경·꾸미기와 편의 소품(벤치·쓰레기통 등)은 이어 놓기·방향 화살표로 놓는다
function isDecoCat(d){return REPEAT_CATS.indexOf(d.cat)>=0||!!d.prop;}
function isLineKind(d){return LINE_KINDS.indexOf(d.kind)>=0||d.dir==='axis';}
function faceMatters(d){
  if(d.dir)return d.dir==='face';
  if(isDecoCat(d))return d.w!==d.h||FRONT_KINDS.indexOf(d.kind)>=0;
  return !!d.fill||d.w!==d.h||d.towerH>0||['stage','busstop'].indexOf(d.kind)>=0;
}
// 돌릴 수 있는 것 (옮기기 카드의 이름에 씀)
function turnable(d){return faceMatters(d)||isLineKind(d);}
function arrowMode(d){
  if(movingId())return turnable(d)?'face':'none';
  if(isDecoCat(d))return faceMatters(d)?'face':'line';
  return faceMatters(d)?'face':'none';
}
// 입구 아치 쪽 방향 (DIRS 번호)
function gateFace(d,x,y){
  var gx=entC()-(x+d.w/2),gy=PZ-(y+d.h/2),best=2,bv=-1e9;
  for(var i=0;i<4;i++){var v=DIRS[i][0]*gx+DIRS[i][1]*gy;if(v>bv){bv=v;best=i;}}
  return best;
}
// 지금 미리보기가 실제로 지어질 방향
function plFace(){
  var d=D[UI.tool];if(!d||!UI.ghost||movingId()||turnable(d))return UI.face;
  return gateFace(d,UI.ghost.x,UI.ghost.y);
}
function plScr(x,y,z){var r=rotPt(x,y);return toScreen(r[0],r[1],z);}
function placeWhy(d,x,y,face){
  var zw=zoneWhy(d,x,y,face)||levelWhy(d,x,y,face);if(zw)return zw;
  if(!canPlace(d,x,y,face))return '다른 건물이나 길과 겹쳐요. 끌어서 옮겨 보세요';
  if(isGateDef(d)){var gw=gateAttachWhy(d,x,y);if(gw)return gw;}
  if(movingId())return '';
  if(isLocked(d.id))return lockLabel(d.id)+' 지을 수 있어요';
  if(S.money<d.cost)return '자금이 '+fmt(d.cost-S.money)+' 모자라요';
  return '';
}
function startPlace(id){
  if(!isGateDef(D[id]))UI.gateFor=null;
  UI.bstep='items';if(UI.cat)(UI.lastPick||(UI.lastPick={}))[UI.cat]=id;
  UI.pbarOpen=false;UI.ext=false;UI.rdir=null;UI.tfloor=null;UI.twall=null;UI.plLow=false;UI.flast=null;UI.moving=null;UI.tool=id;UI.sel=null;UI.selPiece=null;UI.undo=[];UI.lastBuilt=null;
  if(UI.fdir==null)UI.fdir=screenToWorldDir(3);
  if(D[id]&&isLineKind(D[id]))UI.face=UI.fdir<2?2:0;
  var c=viewCenter();
  if(id==='path'){UI.pc=newCursor();UI.ghost=null;pcStartAt(c[0],c[1]);}
  else{
    UI.pc=null;placeGhost(groundTile(c[0],c[1]));
    // 화면 가운데가 막혀 있으면 가장 가까운 빈자리에서 시작
    var d=D[id];
    // 사람이 다니는 바닥 위도 피한다 (그대로 ✓를 누르면 길이 끊기므로). 끌어서 바닥 위에 놓는 것은 막지 않는다
    if(!isRoomDef(id)&&!isFloorDef(id)&&!isTerDef(id)&&(!canPlace(d,UI.ghost.x,UI.ghost.y,UI.face)||onFloorAt(d,UI.ghost.x,UI.ghost.y,UI.face))){
      var nf=plNear(d,UI.ghost.x,UI.ghost.y,10,true)||plNear(d,UI.ghost.x,UI.ghost.y,8);if(nf){UI.ghost.x=nf.x;UI.ghost.y=nf.y;}}
  }
  renderPanel();
}
/* 입구·출구 놓기: 건물 b의 둘레 가운데 길 쪽 좋은 자리에 미리보기를 띄운다. ✓로 짓고, 입구 다음에는 출구로 이어진다 */
function startGateFlow(b,role){
  var gs=gatesOf(b);if(gs[role]){role=role==='ent'?'ext':'ent';if(gs[role])return;}
  var id=gateId(role,UI.gateDesign||'arch');
  UI.tab='build';UI.fold=false;UI.cat='gate';UI.sel=null;UI.selPiece=null;UI.selFloor=null;
  UI.gateFor=b.id;startPlace(id);UI.gateFor=b.id;
  var c=gateBest(b,id,gs.ent);if(c){UI.ghost={x:c.x,y:c.y};}
  toast(defOf(b).name+'의 '+(role==='ent'?'입구':'출구')+'를 놓으세요 · 바로 옆 칸 아무 데나',1800);
  renderPanel();
}
// 그만두면 건축 목록으로 돌아간다 (이미 지은 것은 그대로)
function endPlace(){
  // 입구·출구를 놓다가 그만두면 그 건물의 카드로 (무엇이 빠졌는지 보이게)
  if(UI.gateFor&&bById(UI.gateFor)&&!UI.moving){var gf=UI.gateFor;UI.gateFor=null;UI.tool=null;UI.ghost=null;UI.undo=[];UI.pc=null;UI.fold=true;UI.sel=gf;renderPanel();return;}
  UI.gateFor=null;
  // 옮기기를 그만두면 목록이 아니라 그 건물의 카드로 돌아간다
  if(UI.moving&&bById(UI.moving)){var mid=UI.moving;UI.moving=null;UI.tool=null;UI.ghost=null;UI.undo=[];UI.pc=null;UI.fold=true;UI.sel=mid;renderPanel();return;}
  UI.moving=null;UI.tool=null;UI.ghost=null;UI.undo=[];UI.pc=null;renderPanel();}
// 미리보기의 화면 위치: 좌우·위 끝, 방향별 화살표 자리
function plBox(){
  var k=placeKind(),x,y,w,h,z0,H;
  if(k==='bld'){if(!UI.ghost)return null;var dm=faceDims(D[UI.tool],UI.face);x=UI.ghost.x;y=UI.ghost.y;w=dm.w;h=dm.h;z0=plLevelZ(D[UI.tool],x,y,UI.face);H=heightOf(UI.tool);}
  else if(k==='path'){var c=UI.pc;if(!c||c.x==null)return null;x=c.x;y=c.y;w=1;h=1;z0=c.l*LV;H=.35;}
  else if(k==='floor'){if(!UI.ghost)return null;x=UI.ghost.x;y=UI.ghost.y;w=1;h=1;z0=ghostZ();H=.1;if(isTerDef(UI.tool)&&UI.tool==='ter_set')H=Math.max(.1,UI.tlv*LV-z0);}
  else{var st=selTarget();if(!st)return null;x=st.x;y=st.y;w=1;h=1;z0=st.z;H=st.H;}
  var L=1e9,R=-1e9,T=1e9,B=-1e9;
  [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].forEach(function(p){[z0,z0+H].forEach(function(z){var q=plScr(p[0],p[1],z);L=Math.min(L,q[0]);R=Math.max(R,q[0]);T=Math.min(T,q[1]);B=Math.max(B,q[1]);});});
  var cx=x+w/2,cy=y+h/2,C=plScr(cx,cy,z0+H/2),G=plScr(cx,cy,z0);
  var arr=[0,1,2,3].map(function(d){
    var ex=cx+DIRS[d][0]*w/2,ey=cy+DIRS[d][1]*h/2,a=plScr(ex,ey,z0),b=plScr(ex,ey,z0+H);
    var ux=a[0]-G[0],uy=a[1]-G[1],n=Math.hypot(ux,uy)||1;ux/=n;uy/=n;
    // 땅 높이와 지붕 높이 가운데 바깥쪽 점에서 더 밀어내 건물 그림을 가리지 않게
    var pa=(a[0]-C[0])*ux+(a[1]-C[1])*uy,pb=(b[0]-C[0])*ux+(b[1]-C[1])*uy,o=pa>=pb?a:b;
    return {d:d,x:o[0]+ux*21,y:o[1]+uy*21,ang:Math.atan2(uy,ux)};
  });
  return {l:L,r:R,t:T,b:B,arr:arr};
}
/* ---------- 고른 칸에서 이어 짓기 ----------
   바닥 칸·빈 땅·흙 경사로·길 조각을 고르면 그 둘레에 화살표 4개와 ▲▼가 뜬다.
   · 옆 화살표: 그쪽 칸에 미리보기와 ✓를 놓는다. ✓마다 같은 높이·같은 바닥(경사로는 같은 방향의 경사로, 길은 같은 종류)으로 한 칸씩 이어 짓는다
   · ▲▼: 고른 칸을 바로 한 층 높이거나 낮춘다. 길 조각이면 그 방향으로 오르막·내리막을 이어 짓기 시작한다
   짓는 중의 ▲▼: 땅은 다음 칸의 높이, 길은 오르막·내리막(다시 누르면 평지) */
function selTarget(){
  if(isPlacing()||!selCardOn()||UI.sel)return null;
  if(UI.selPiece){var p=pieceById(UI.selPiece);return p?{x:p.x,y:p.y,z:p.l*LV,H:p.s?LV:.2,p:p}:null;}
  var f=UI.selFloor;if(!f||f.pid||isWater(f.x,f.y))return null;
  return {x:f.x,y:f.y,z:th(f.x,f.y)*LV,H:isRamp(f.x,f.y)?LV:.1};
}
function extStart(id){UI.tab='build';UI.fold=false;UI.cat='path';UI.sel=null;UI.selPiece=null;UI.selFloor=null;startPlace(id);}
function selExtend(d){
  var t=selTarget();if(!t)return;
  var nx=t.x+DIRS[d][0],ny=t.y+DIRS[d][1];
  if(t.p){
    var pl=portLevel(t.p,d);if(pl===NOPORT){toast('계단 옆으로는 이을 수 없어요',1400);return;}
    var k=t.p.k;extStart('path');var c=UI.pc;c.k=k;c.dir=d;c.x=nx;c.y=ny;c.l=pl;c.slope=0;c.hist=[];renderDetail();return;
  }
  if(nx<0||ny<0||nx>=COLS||ny>=PZ){toast('부지 밖이에요',1200);return;}
  var h=th(t.x,t.y),rd=tslope(t.x,t.y),cur=floorSlot(t.x,t.y,0);cur=cur&&cur.get();
  if(rd>=0){
    var nl=h+(d===rd?1:d===OPP[rd]?-1:0);if(nl<MINH){toast('더 내려갈 수 없어요',1200);return;}
    extStart('ter_ramp');UI.ext=true;UI.rdir=rd;UI.tlv=nl;
  }else{extStart('ter_set');UI.ext=true;UI.tlv=h;UI.tfloor=cur||null;}
  // 벽 타일도 함께 이어진다
  UI.twall=wallId(t.x,t.y);
  UI.fdir=d;UI.ghost={x:nx,y:ny};UI.flast={x:t.x,y:t.y};renderDetail();
}
// ▲▼ (v = +1 / -1)
function plVert(v){
  var k=placeKind();
  if(k==='path'){var c=UI.pc;if(c.k==='sky')return;c.slope=c.slope===v?0:v;renderDetail();return;}
  if(k==='floor'&&isTerDef(UI.tool)){UI.tlv=clamp(UI.tlv+v,MINH,MAXH-1);renderDetail();return;}
  var t=selTarget();if(!t)return;
  if(t.p){
    var p=t.p,d=p.d==null?UI.fdir:p.d,pl=portLevel(p,d);if(pl===NOPORT)return;
    var kk=p.k==='sky'?'stone':p.k;extStart('path');var c2=UI.pc;c2.k=kk;c2.dir=d;c2.x=p.x+DIRS[d][0];c2.y=p.y+DIRS[d][1];c2.l=pl;c2.slope=v;c2.hist=[];renderDetail();return;
  }
  var h=th(t.x,t.y),rd=tslope(t.x,t.y),m0=S.money,keep=UI.undo;UI.undo=[];
  var w=rd>=0?rampAt(t.x,t.y,h+v,rd):terApply(t.x,t.y,'ter_set',h+v);
  UI.undo=keep;
  if(w){toast(w,1600);sfx('error',.4);}else{sfx('place',.6);toast('땅 '+lvName(h+v)+' · '+fmt(m0-S.money),1100);}
  renderDetail();hud(true);
}
// (x,y)를 base 높이의 dir 방향 경사로로 만든다 (필요하면 먼저 높이를 맞춘다). 실패하면 아무것도 바꾸지 않는다
function rampAt(x,y,base,dir){
  if(base<MINH)return '더 내려갈 수 없어요';
  if(base>MAXH-2)return '더 높이는 만들 수 없어요';
  var n0=UI.undo?UI.undo.length:0,did=false;
  if(th(x,y)!==base||isRamp(x,y)){var w=terApply(x,y,'ter_set',base);if(w&&w!=='이미 그 높이예요')return w;did=!w;}
  var w2=terApply(x,y,'ter_ramp',0,dir);
  if(w2&&did){var u=UI.undo&&UI.undo.length>n0?UI.undo.pop():null;if(u)terUndo(u);}
  return w2;
}
// 이어 짓기에서 이 칸에 무엇이 바뀌고 얼마가 드는지 (매 프레임 부르므로 가볍게)
function extPlan(x,y){
  var zw=terZoneWhy(x,y);if(zw)return {why:zw};
  if(occ[y][x])return {why:'건물이 있는 칸이에요'};
  var h=th(x,y);
  if(UI.rdir!=null){
    if(UI.tlv<MINH)return {why:'더 내려갈 수 없어요'};
    if(tslope(x,y)===UI.rdir&&h===UI.tlv)return {why:'이미 같은 경사로예요'};
    var c0=0;if(h!==UI.tlv||isRamp(x,y)){var sp=terPlan(x,y,'ter_set',UI.tlv);if(sp.why&&sp.why!=='이미 그 높이예요')return {why:sp.why};c0=sp.cost||0;}
    return {cost:c0+TER_RAMP+(UI.twall&&wallId(x,y)!==UI.twall?floorSwapCost(wallId(x,y),UI.twall):0)};
  }
  if(h>UI.tlv)return {why:'이 칸이 더 높아요. 낮추려면 그 칸을 골라 ▼를 누르세요'};
  var cost=0,ch=false;
  if(h!==UI.tlv||isRamp(x,y)){var p=terPlan(x,y,'ter_set',UI.tlv);if(p.why)return {why:p.why};cost+=p.cost;ch=true;}
  if(UI.tfloor){var sl=floorSlot(x,y,0),cur=sl&&sl.get();if(sl&&!sl.busy&&cur!==UI.tfloor){cost+=floorSwapCost(cur,UI.tfloor);ch=true;}}
  if(UI.twall&&wallId(x,y)!==UI.twall){cost+=floorSwapCost(wallId(x,y),UI.twall);ch=true;}
  return ch?{cost:cost}:{why:'이미 같은 높이·바닥이에요'};
}
function extApply(x,y){
  var pl=extPlan(x,y);if(pl.why)return pl.why;
  if(S.money<pl.cost)return '자금이 부족해요';
  var n0=UI.undo.length,w='';
  if(UI.rdir!=null)w=rampAt(x,y,UI.tlv,UI.rdir);
  else{
    if(th(x,y)!==UI.tlv||isRamp(x,y))w=terApply(x,y,'ter_set',UI.tlv);
    if(!w&&UI.tfloor){var fw=paintFloor(x,y,UI.tfloor,0);if(fw&&fw!=='이미 같은 바닥이에요'&&UI.undo.length===n0)w=fw;}
  }
  if(!w&&UI.twall&&wallId(x,y)!==UI.twall)wallSwap(x,y,UI.twall);
  // 한 번의 ✓로 생긴 되돌리기는 한 묶음으로
  var g=++extSeq;for(var i=n0;i<UI.undo.length;i++)UI.undo[i].g=g;
  return w;
}
var extSeq=0;
// 지형 되돌리기: 마지막 ✓에서 바뀐 것(땅 높이·경사·바닥)을 한꺼번에
function terUndoLast(){
  var u=UI.undo[UI.undo.length-1];if(!u)return false;
  var g=u.g;
  do{var t=UI.undo[UI.undo.length-1];if(t.ter){UI.undo.pop();terUndo(t);}else if(t.wall){UI.undo.pop();wallUndo(t);}else floorUndo();}
  while(g&&UI.undo.length&&UI.undo[UI.undo.length-1].g===g);
  return true;
}
function ghostHit(px,py){
  if(placeKind()!=='bld')return false;
  var bx=plBox();return !!bx&&px>=bx.l&&px<=bx.r&&py>=bx.t&&py<=bx.b;
}
function plMove(el,x,y,w){el.style.transform='translate('+Math.round(x-w/2)+'px,'+Math.round(y-w/2)+'px)';}
// 매 프레임: 지도 위 버튼을 미리보기 둘레에 붙인다
function syncPlace(){
  var root=$('#place');if(!root)return;
  var k=placeKind(),am=k==='bld'?arrowMode(D[UI.tool]):'',line=k==='path'||k==='floor'||am==='line',bx=k?plBox():null;
  var selM=!k&&!!selTarget();if(selM){bx=plBox();line=true;}
  root.hidden=!bx;if(!bx)return;
  root.classList.toggle('selm',selM);
  var vw=window.innerWidth,vh=window.innerHeight,cl=function(v,a,b){return Math.max(a,Math.min(b,v));};
  // 건물: 화살표 = 건물이 바라보는 방향(정면). 길·바닥·조경: 화살표 = 다음 칸으로 이어 짓는 방향
  var show=line||am==='face',cur=plCur(),minY=1e9,maxY=-1e9;
  root.querySelectorAll('.parr:not(.pv)').forEach(function(el){
    var a=bx.arr[+el.dataset.v];el.hidden=!show;if(!show)return;
    minY=Math.min(minY,a.y);maxY=Math.max(maxY,a.y);
    plMove(el,cl(a.x,20,vw-20),cl(a.y,20,vh-20),32);
    el.firstChild.style.transform='rotate('+a.ang+'rad)';
    var on=!selM&&a.d===cur;el.classList.toggle('on',on);el.setAttribute('aria-pressed',String(on));
    el.setAttribute('aria-label',(line?'짓는 방향 ':'바라보는 방향 ')+PL_DIRNAME[worldToScreenDir(a.d)]);
  });
  // ▲▼: 화살표들 오른쪽에 위아래로. 고른 칸, 땅 높이, 경사로 이어 짓기, 길(연결 다리 빼고)에서만
  var terT=k==='floor'&&isTerDef(UI.tool),vOn=selM||(k==='path'&&UI.pc.k!=='sky')||(terT&&(UI.tool==='ter_set'||UI.rdir!=null));
  // 오른쪽에 자리가 모자라면 왼쪽에 둔다
  var maxX=-1e9,minX=1e9;bx.arr.forEach(function(a){maxX=Math.max(maxX,a.x);minX=Math.min(minX,a.x);});
  var vx=maxX+38>vw-26?minX-38:maxX+38;
  ['up','down'].forEach(function(n,i){
    var el=root.querySelector('[data-pl="'+n+'"]');el.hidden=!vOn;if(!vOn)return;
    plMove(el,cl(vx,20,vw-20),cl((minY+maxY)/2+(i?19:-19),20,vh-20),32);
    var on=k==='path'&&UI.pc.slope===(i?-1:1);el.classList.toggle('on',on);
    el.setAttribute('aria-label',k==='path'?(i?'내리막':'오르막'):(selM?(i?'이 칸 한 층 낮추기':'이 칸 한 층 높이기'):(i?'지을 높이 한 층 낮게':'지을 높이 한 층 높게')));
  });
  if(selM){root.querySelectorAll('[data-pl="ok"],[data-pl="no"],[data-pl="undo"]').forEach(function(e){e.hidden=true;});root.querySelector('.ppr').hidden=true;return;}
  root.querySelector('[data-pl="ok"]').hidden=false;root.querySelector('[data-pl="no"]').hidden=false;
  // ✓·✕는 미리보기 위쪽 좌우. 화살표와 겹치지 않게 충분히 띄운다.
  // 위쪽(교회 이름표 줄)에 자리가 없으면 미리보기 아래로 내린다
  var tf=isTileFloor(),hasUn=(k==='bld'||k==='floor')&&UI.undo.length>0,mid=(bx.l+bx.r)/2,half=Math.max((bx.r-bx.l)/2,hasUn?46:28),top=Math.min(bx.t-18,show?minY-38:1e9),tb=$('#top').getBoundingClientRect().bottom+22;
  if(top<tb)top=Math.max(bx.b+18,show?maxY+38:-1e9);
  var ok=root.querySelector('[data-pl="ok"]'),no=root.querySelector('[data-pl="no"]');
  plMove(ok,cl(mid-half,22,vw-22),cl(top,22,vh-22),38);
  plMove(no,cl(mid+half,22,vw-22),cl(top,22,vh-22),38);
  // 조경 이어 짓기 중이면 ✓·✕ 사이에 되돌리기 (건물은 안내 띠가 없으므로 여기에만 있다)
  var un=root.querySelector('[data-pl="undo"]');un.hidden=!hasUn;
  if(!un.hidden)plMove(un,cl(mid,22,vw-22),cl(top,22,vh-22),32);
  var can=k==='path'?plPathWhy()==='':(k==='floor'?!cellWhy(UI.ghost.x,UI.ghost.y,UI.tool):!placeWhy(D[UI.tool],UI.ghost.x,UI.ghost.y,UI.face));
  // 못 지을 때도 누를 수는 있게 두고(회색), 누르면 이유를 알려 준다
  ok.classList.toggle('off',!can);ok.setAttribute('aria-disabled',String(!can));
  // 바닥 타일: ✓ 왼쪽에 한 칸 값(바꾸면 바꾸는 값)
  var pr=root.querySelector('.ppr'),fc=tf?floorCostAt():(terT?terCostAt():null);pr.hidden=fc==null;
  if(fc!=null){var t=fc.pre!=null?[fc.pre,fc.none?'':fmt(fc.c)].filter(Boolean).join(' · '):(fc.swap?'바꾸기 ':'')+(fc.c<0?'+':'')+fmt(Math.abs(fc.c));pr.hidden=!t;if(pr.textContent!==t)pr.textContent=t;pr.classList.toggle('off',!can);
    pr.style.transform='translate('+Math.round(Math.max(60,cl(mid-half,22,vw-22)-23))+'px,'+Math.round(cl(top,22,vh-22))+'px) translate(-100%,-50%)';}
  ok.setAttribute('aria-label',fc!=null?(can?(fc.swap?'바꾸기':'깔기')+' '+fmt(Math.abs(fc.c))+', 다음 칸으로':'여기에는 깔 수 없어요'):line?'이 칸 짓고 다음 칸으로':(can?(movingId()?'여기로 옮기기':D[UI.tool].name+' 짓기 · '+fmt(D[UI.tool].cost)):'여기에는 지을 수 없어요'));
}
// 지형 미리보기 칸을 바꾸는 값 (이어 짓기면 높이 + 바닥). 못 바꾸는 칸이면 값 없음. 땅 높이는 지을 높이도 함께 보여 준다
function terCostAt(){
  var g=UI.ghost;if(!g)return null;
  var p=UI.ext?extPlan(g.x,g.y):terPlan(g.x,g.y,UI.tool,UI.tlv,UI.fdir),lv=UI.tool==='ter_set'||UI.rdir!=null?lvName(UI.tlv):'';
  return {c:p.why?0:p.cost,swap:false,pre:lv,none:!!p.why};
}
// 미리보기 칸에 바닥을 깔거나 바꿀 때 드는 값
function floorCostAt(){
  var g=UI.ghost,d=D[UI.tool];if(!g||!d)return null;
  var sl=floorSlot(g.x,g.y,g.pid),pv=sl&&sl.get();
  if(UI.tool==='f_erase')return pv&&D[pv]?{c:-Math.floor(D[pv].cost*0.5),swap:false}:null;
  return pv&&pv!==UI.tool?{c:floorSwapCost(pv,UI.tool),swap:true}:{c:d.cost,swap:false};
}
// 바닥 미리보기를 d 방향 다음 칸으로 (데크 위면 같은 높이의 다음 데크, 없으면 땅)
function floorStep(g,d){
  var nx=g.x+DIRS[d][0],ny=g.y+DIRS[d][1];
  if(nx<0||ny<0||nx>=COLS||ny>=PZ)return false;
  var cp=g.pid&&pieceById(g.pid),np=cp?piecesAt(nx,ny).filter(function(q){return isDeckPiece(q)&&q.l===cp.l;})[0]:null;
  g.x=nx;g.y=ny;if(np)g.pid=np.id;else delete g.pid;return true;
}
/* 타일 카드에서 종류를 고르면: 그 칸을 바꾸고 바닥 깔기로 넘어가 화살표 쪽 다음 칸에서 이어 바꾼다.
   방향은 이어진 바닥이 있는 쪽(같은 종류였던 바닥 우선)으로 먼저 잡는다 */
function startFloorFrom(x,y,pid,id,prev){
  var g={x:x,y:y};if(pid)g.pid=pid;
  var best=-1,bs=-1;
  for(var d=0;d<4;d++){
    var t={x:x,y:y,pid:pid};if(!floorStep(t,d))continue;
    var sl=floorSlot(t.x,t.y,t.pid),cur=sl&&sl.get(),sc=cur?(cur===prev?2:1):0;
    if(sc>bs){bs=sc;best=d;}
  }
  UI.tab='build';UI.fold=false;UI.cat='floor';UI.sel=null;UI.selPiece=null;UI.selFloor=null;
  startPlace(id);
  if(best>=0)UI.fdir=best;
  UI.ghost=g;UI.flast={x:x,y:y,pid:pid};floorStep(UI.ghost,UI.fdir);
  renderDetail();
}
function plPathWhy(){var p=pcPiece();return p?(pieceFits(p)||(S.money<pieceCost(p)?'자금이 부족해요':'')):'시작할 곳을 먼저 누르세요';}
function plCur(){var k=placeKind();return k==='path'?UI.pc.dir:((k==='floor'||(k==='bld'&&arrowMode(D[UI.tool])==='line'))?UI.fdir:UI.face);}
// 화살표: 건물은 정면(기본 출입구) 방향, 길·바닥·조경은 다음 칸이 이어질 방향
function plDir(d){
  if(placeKind()==='path'){UI.pc.dir=d;renderDetail();return;}
  if(placeKind()==='floor'){
    // 방금 칠한 칸 바로 다음에 있던 미리보기는, 방향을 바꾸면 그 칸 기준 새 방향으로 옮긴다
    var g=UI.ghost,fl=UI.flast;
    if(g&&fl){var t={x:fl.x,y:fl.y,pid:fl.pid};floorStep(t,UI.fdir);if(t.x===g.x&&t.y===g.y){var u={x:fl.x,y:fl.y,pid:fl.pid};if(floorStep(u,d)){g.x=u.x;g.y=u.y;if(u.pid)g.pid=u.pid;else delete g.pid;}}}
    UI.fdir=d;renderDetail();return;
  }
  var df=D[UI.tool];
  if(arrowMode(df)==='line'){UI.fdir=d;if(isLineKind(df))UI.face=d<2?2:0;renderDetail();return;}
  var o=faceDims(df,UI.face),n=faceDims(df,d),g=UI.ghost;
  UI.face=d;
  // 가로세로가 바뀌면 가운데를 지키며 돌린다
  if(g){g.x=clamp(Math.round(g.x+o.w/2-n.w/2),0,COLS-n.w);g.y=clamp(Math.round(g.y+o.h/2-n.h/2),0,ROWS-RD-n.h);}
  renderDetail();
}
function plTurn(){plDir(screenToWorldDir((worldToScreenDir(plCur())+1)%4));}
// 이어 짓기 한 걸음: 'line'은 화살표 쪽, 'face'(벤치 등)는 옆으로 (화면 오른쪽으로 늘어서게)
function plStep(d){
  if(arrowMode(d)==='line')return DIRS[UI.fdir];
  var side=UI.face<2?[2,3]:[0,1];
  for(var i=0;i<2;i++){var sd=worldToScreenDir(side[i]);if(sd===0||sd===3)return DIRS[side[i]];}
  return DIRS[side[0]];
}
// (x,y) 둘레를 한 바퀴씩 넓혀 가며 가장 가까운 빈자리
// 그 자리에 놓으면 바닥 타일(사람이 다니는 길)을 덮는지
function onFloorAt(d,x,y,face){var dm=faceDims(d,face);for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++)if(S.floor[(x+i)+','+(y+j)])return true;return false;}
// offFloor: 바닥 타일을 덮지 않는 자리만
function plNear(d,x,y,R,offFloor){
  var best=null,bd=1e9;
  for(var r=1;r<=R;r++){
    for(var j=-r;j<=r;j++)for(var k=-r;k<=r;k++){
      if(Math.max(Math.abs(j),Math.abs(k))!==r)continue;
      var dd=j*j+k*k;
      if(dd<bd&&canPlace(d,x+j,y+k,UI.face)&&!(offFloor&&onFloorAt(d,x+j,y+k,UI.face))){bd=dd;best={x:x+j,y:y+k};}
    }
    if(best)return best;
  }
  return null;
}
/* 돈이 나가면 동전 소리와 함께 얼마 나갔는지 그 자리에 띄운다 (건물·길·바닥·땅·칸·층 모두) */
function spendPos(){
  var b=UI.sel&&bById(UI.sel),sf=UI.selFloor,sp=UI.selPiece&&pieceById(UI.selPiece);
  if(UI.pc&&UI.pc.x!=null&&UI.tool==='path')return {x:UI.pc.x+.5,y:UI.pc.y+.5,z:(UI.pc.l||0)*LV+.5};
  if(UI.ghost&&UI.tool)return {x:UI.ghost.x+.5,y:UI.ghost.y+.5,z:ghostZ?ghostZ()+.6:.6};
  if(b){var dm=bDims(b);return {x:b.x+dm.w/2,y:b.y+dm.h/2,z:bLevel(b)*LV+bHeight(b)+.5};}
  if(sp)return {x:sp.x+.5,y:sp.y+.5,z:sp.l*LV+.6};
  if(sf)return {x:sf.x+.5,y:sf.y+.5,z:th(sf.x,sf.y)*LV+.6};
  var c=viewCenter(),w=toWorld(c[0],c[1],0);return {x:w[0],y:w[1],z:.6};
}
function spendFx(m0,pos){
  var d=m0-S.money;if(!(d>0)||!pos)return;
  sfx('coins',.55,120);
  F.push({x:pos.x,y:pos.y,z:pos.z+.35,t:1.3,d:1.3,text:'-'+fmt(d),col:'#ffb4a0'});
}
function plOk(){
  var m0=S.money,pos=spendPos();plOk0();spendFx(m0,pos);
}
function plOk0(){
  var k=placeKind(),now=performance.now();
  if(now<plLock)return;
  if(k==='path'){UI.pbarOpen=false;var why=pcBuild();if(why){toast(why,1600);sfx('error',.4);}else{plLock=now+180;plBuzz();sfx('floor',.5);}renderDetail();hud(true);return;}
  // 바닥: 이 칸을 칠하고 화살표 방향으로 한 칸 나아간다
  if(k==='floor'){
    var ter=isTerDef(UI.tool),g0=UI.ghost,fw=!g0?'자리를 먼저 고르세요':(ter?(UI.ext?extApply(g0.x,g0.y):terApply(g0.x,g0.y,UI.tool,UI.tlv,UI.fdir)):paintFloor(g0.x,g0.y,UI.tool,g0.pid));
    if(fw){toast(fw,1400);sfx('error',.4);return;}
    plLock=now+150;plBuzz();sfx(ter?'place':'floor',.45,90);
    UI.flast={x:g0.x,y:g0.y,pid:g0.pid};floorStep(g0,UI.fdir);
    if(ter&&UI.rdir!=null)UI.tlv=clamp(UI.tlv+(UI.fdir===UI.rdir?1:UI.fdir===OPP[UI.rdir]?-1:0),MINH-1,MAXH-1);
    renderDetail();hud(true);return;
  }
  if(k!=='bld'||!UI.ghost)return;
  if(movingId()){plMoveDone();return;}
  var d=D[UI.tool],g=UI.ghost,why2=placeWhy(d,g.x,g.y,UI.face);
  if(why2){toast(why2,1600);sfx('error',.4);return;}
  if(isGateDef(d)){
    var gw=buildGate(UI.tool,g.x,g.y);if(gw){toast(gw,1600);sfx('error',.4);return;}
    var gnb=S.buildings[S.buildings.length-1],ob=bById(gnb.of);plBuzz();plLock=now+350;sfx('build',.7);
    // 입구를 지었으면 곧바로 출구 놓기로, 둘 다 있으면 건물 카드로
    if(ob&&!gatesOf(ob).ext){startGateFlow(ob,'ext');hud(true);return;}
    UI.tool=null;UI.ghost=null;UI.gateFor=null;UI.fold=true;UI.sel=ob?ob.id:gnb.id;
    toast(ob&&usable(ob)?defOf(ob).name+' 운영을 시작해요':(ob?'입구·출구를 지었어요 · 길을 이어 주세요':d.name+'을(를) 지었어요'),1800);renderPanel();hud(true);return;
  }
  if(!build(UI.tool,g.x,g.y,plFace()))return;
  var nb=S.buildings[S.buildings.length-1];
  // 방문자가 쓰는 건물: 곧바로 입구 놓기로 이어진다
  if(needsGates(nb)&&!AUTOGATE()){UI.lastBuilt={bid:nb.id,cost:d.cost,w:S.week};startGateFlow(nb,'ent');hud(true);return;}
  plBuzz();plLock=now+350;sfx(isDecoCat(d)?'place':'build',.8);
  if(isDecoCat(d)){
    // 조경·꾸미기는 길처럼 이어서: 한 칸 나아가고 되돌리기를 쌓는다 (막힌 칸이면 회색 ✓로 알려 준다)
    UI.undo.push({bid:nb.id,cost:d.cost,w:S.week});
    var dm=faceDims(d,UI.face),st=plStep(d),nx=g.x+st[0]*dm.w,ny=g.y+st[1]*dm.h;
    if(nx>=0&&ny>=0&&nx+dm.w<=COLS&&ny+dm.h<=ROWS-RD){g.x=nx;g.y=ny;}
    renderDetail();
  }else{
    // 큰 건물은 하나 짓고 끝. 방금 지은 것은 카드에서 이번 주 안에 전액 되돌릴 수 있다
    // 지은 건물 위에 작은 카드(되돌리기·길 잇기·옮기기)를 띄우고 패널은 닫아 둔다
    UI.tool=null;UI.ghost=null;UI.fold=true;UI.sel=nb.id;UI.lastBuilt={bid:nb.id,cost:d.cost,w:S.week};
    toast(d.name+'을(를) 지었어요',1600);renderPanel();
  }
  hud(true);
}
/* ---------- 지은 것 옮기기·돌리기 (무료) ----------
   짓기와 같은 미리보기로 자리와 방향을 고른다. 원래 건물은 그동안 숨기고, 겹침 검사에서도 빼 둔다.
   층·상태·이용 횟수는 그대로. 방향이 같으면 직접 고른 입구·출구도 함께 옮긴다. 칸 건물·길·바닥은 옮기지 않는다 */
function canMove(b){return !!b&&!isRoom(b)&&!!D[b.def];}
function movingId(){var b=UI.moving&&bById(UI.moving);return b&&UI.tool===b.def&&isPlacing()?b.id:0;}
function startMove(b){
  if(!canMove(b))return;
  UI.tab='build';UI.fold=false;UI.tool=b.def;UI.face=b.face==null?2:b.face;UI.ghost={x:b.x,y:b.y};UI.moving=b.id;UI.gateFor=isGate(b)?b.of:null;
  UI.sel=null;UI.selPiece=null;UI.selTile=null;UI.undo=[];UI.pc=null;
  renderPanel();
}
function plMoveDone(){
  var b=bById(UI.moving),g=UI.ghost;if(!b||!g){endPlace();return;}
  var face=UI.face,why=placeWhy(D[b.def],g.x,g.y,face);
  if(why){toast(why,1600);sfx('error',.4);return;}
  var f0=b.face==null?2:b.face,dx=g.x-b.x,dy=g.y-b.y,same=!dx&&!dy&&f0===face,links=(b.links||[]).length;
  if(!same){
    var g0=gatesOf(b);
    b.x=g.x;b.y=g.y;b.face=face;setPlaceLevel(b,D[b.def],g.x,g.y,face);
    if(isGate(b)){var ga=gateAttach(g.x,g.y,bLevel(b),b.of);if(ga){b.face=ga.d;b.of=ga.b.id;}}
    // 건물을 옮기면 붙어 있던 입구·출구도 같이 옮긴다 (제자리에 못 붙으면 걷어 내고 값을 돌려준다)
    else if(f0===face&&(dx||dy)){
      rebuildOcc();
      ['ent','ext'].forEach(function(k){var q=g0[k];if(!q)return;var nx=q.x+dx,ny=q.y+dy;
        if(nx>=0&&ny>=0&&nx<COLS&&ny<PZ&&(!occ[ny][nx]||occ[ny][nx]===q.id)){q.x=nx;q.y=ny;setPlaceLevel(q,D[q.def],nx,ny,2);}});
    }
    rebuildOcc();dropLooseGates();
    releaseVisitors(b.id);structureChanged();plBuzz();sfx('place',.7);
  }
  UI.moving=null;UI.tool=null;UI.ghost=null;UI.fold=true;UI.sel=b.id;
  var msg=same?'그대로 두었어요':D[b.def].name+'을(를) 옮겼어요'+(links&&!(b.links||[]).length?' · 연결 다리가 끊겼어요':'')+(needsGates(b)&&!b.door?' · 입구·출구를 다시 지어 주세요':(needsDoor(b)&&!usable(b)?' · 입구까지 길을 이어 주세요':''));
  toast(msg,1800);renderPanel();hud(true);
}
function plBuzz(){try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}}
// 방금 지은 건물을 전액 돌려받고 없앤다. 같은 주 안에서만, 층을 올렸거나 이미 없으면 못 한다
// 문이 열린 동안 마지막 예배 공간은 되돌리기로도 없앨 수 없다
function canUnbuild(u){var b=u&&bById(u.bid);return !!b&&(b.floors||1)<=1&&u.w===S.week&&!lastHallWhy(b);}
function unbuild(u){
  if(!canUnbuild(u))return false;
  var b=bById(u.bid);
  var d=defOf(b);demolishGatesOf(b,true);demolish(b.id);S.money+=u.cost-Math.floor(d.cost*0.5);S.fresh=Math.max(0,(S.fresh||0)-(d.beauty||0));save();
  return true;
}
// 바닥 타일 깔기: 아래 띠 없이 지도 위 ✓·✕·화살표와 ✓ 옆 값 표시만 쓴다
function isTileFloor(){return placeKind()==='floor'&&!isTerDef(UI.tool);}
function renderPbar(){
  var el=$('#pbar');if(!el)return;
  var k=placeKind(),gt=k==='bld'&&isGateDef(D[UI.tool])&&!movingId();el.hidden=!k||(k==='bld'&&!gt)||isTileFloor();if(el.hidden){plHtml='';syncPlace();return;}
  var h='',undo=UI.undo.length?'<button class="btn" data-act="undo">되돌리기</button>':'',d=D[UI.tool];
  if(gt){
    // 입구·출구 모양 고르기: 작은 줄 하나
    h='<div class="prow"><b class="lvl">'+(d.role==='ent'?'입구':'출구')+'</b>'+segBtns('gdesign',d.design,GATE_DESIGNS.map(function(g){return [g[0],g[1]+' '+fmt(D[gateId(d.role,g[0])].cost)];}))+'</div>';
  }else if(k==='bld'){
    var g=UI.ghost,why=g?placeWhy(d,g.x,g.y,UI.face):'지도를 눌러 자리를 고르세요';
    var tip=faceMatters(d)?'끌어서 옮기고, 화살표로 건물이 바라볼 방향(정면·출입구)을 고르세요':'끌어서 옮기거나 지도를 눌러 자리를 고르세요';
    h='<div class="ptx"><b>'+d.name+'</b> <span class="pc">'+fmt(d.cost)+'</span>'+(why?' · '+bad(why):'')+'<br><span class="pt">'+(UI.undo.length?'이어서 ✓를 누르면 옆자리에 또 지어요':tip)+'</span></div>'+(undo?'<div class="btns">'+undo+'</div>':'');
  }else if(k==='path'){
    var c=UI.pc,p=pcPiece(),pw=plPathWhy(),sky=c.k==='sky',sl=sky?0:c.slope;
    // 화면을 가리지 않게 평소엔 작은 알약 하나(이름·값·경사·높이)만. 누르면 고르는 줄이 펼쳐지고, 고르면 다시 접힌다
    var lv=c.l>0?c.l+1+'층':(c.l<0?'지하 '+(-c.l)+'층':'땅');
    if(!UI.pbarOpen)h='<button class="btn ppill" data-act="pbar" aria-expanded="false" aria-label="길 종류·경사·높이 고르기">'+(p?'<b>'+pieceName(p)+'</b> <span class="pc'+(pw?' off':'')+'">'+fmt(pieceCost(p))+'</span>':'<b>길</b>')+(sky?'':' · '+(sl>0?'오르막':sl<0?'내리막':'평지'))+' · '+lv+' ⌄</button>';
    else h='<div class="prow">'+
      segBtns('pkind',c.k,[['stone','돌'],['wood','나무'],['brick','벽돌'],['marble','대리석'],['steel','철'],['arch','아치 다리'],['sky','연결 다리']])+
      '<div class="seg"><button class="btn" data-act="plevel" data-v="-1" aria-label="시작 높이 한 층 낮게"'+(c.l<=MINH?' disabled':'')+'>▼</button><span class="lvl">'+lv+'</span><button class="btn" data-act="plevel" data-v="1" aria-label="시작 높이 한 층 높게"'+(c.l>=MAXL?' disabled':'')+'>▲</button></div>'+
      (c.hist.length?'<button class="btn" data-act="pundo">되돌리기</button>':'')+'<button class="btn" data-act="pbar" aria-label="접기">⌃</button></div>';
  }else if(k==='room'){
    var rp=UI.ghost?tilePlan(UI.ghost.x,UI.ghost.y,UI.tool):null,line;
    if(!rp)line='빈 땅을 누르면 칸이 생겨요. 이어 붙이면 하나의 '+d.rname+', 지은 칸을 다시 누르면 위층(최대 '+MROOM.maxF+'층)';
    else if(!rp.ok)line=bad(rp.why);
    else if(S.money<rp.cost)line=bad('자금이 부족해요');
    else line=(rp.kind==='floor'?'누르면 위층을 올려요 · ':'누르면 칸을 지어요 · ')+fmt(rp.cost);
    h='<div class="ptx"><b>'+d.name+'</b> <span class="pc">'+fmt(d.cost)+'</span> · 위층 '+fmt(MROOM.floorCost)+'<br><span class="pt">'+line+'</span></div><div class="btns">'+undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else if(isTerDef(UI.tool)){
    // 지형은 띠 없이: 지도 위 화살표·▲▼·✓와 ✓ 옆 글씨(높이·값)만 (못 짓는 칸은 ✓를 누르면 이유)
    h='';
    if(!h){el.hidden=true;plHtml='';syncPlace();return;}
  }else{
    var fwy=UI.ghost?floorWhy(UI.ghost.x,UI.ghost.y,UI.tool,UI.ghost.pid):'';
    var fsl=UI.ghost&&floorSlot(UI.ghost.x,UI.ghost.y,UI.ghost.pid),fpv=fsl&&fsl.get(),fnc=fpv&&fpv!==UI.tool&&d.cost?floorSwapCost(fpv,UI.tool):null;
    h='<div class="ptx"><b>'+d.name+'</b>'+(d.cost?' <span class="pc">'+(fnc!=null?'바꾸기 '+(fnc<0?'+':'')+fmt(Math.abs(fnc)):'한 칸 '+fmt(d.cost))+'</span>':'')+' · '+(fwy?bad(fwy):d.desc)+'<br><span class="pt">지도를 눌러 시작할 칸을 고르고, 화살표로 깔아 나갈 방향을 정한 뒤 ✓로 한 칸씩 깔아요</span></div><div class="btns">'+undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }
  // 내용이 같으면 다시 그리지 않는다 (누르는 도중 버튼이 바뀌어 눌림이 사라지지 않게)
  if(h!==plHtml){el.innerHTML=h;plHtml=h;}
  el.className='glass'+(k==='path'&&UI.pbarOpen?' wide':'')+(k==='path'&&!UI.pbarOpen||isTerDef(UI.tool)?' mini':'');
  syncPlace();
}
function setupPlace(){
  var root=$('#place'),arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  root.innerHTML=[0,1,2,3].map(function(d){return '<button class="parr" data-pl="dir" data-v="'+d+'" aria-label="방향 '+(d+1)+'">'+arrow+'</button>';}).join('')+
    '<button class="pok" data-pl="ok" aria-label="짓기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<button class="pun" data-pl="undo" data-act="undo" aria-label="방금 지은 것 되돌리기" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<span class="ppr" aria-hidden="true" hidden></span>'+
    '<button class="parr pv" data-pl="up" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 9H5z" fill="currentColor"/><path d="M12 13v6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>'+
    '<button class="parr pv" data-pl="down" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l7-9H5z" fill="currentColor"/><path d="M12 5v6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>'+
    '<button class="pno" data-pl="no" aria-label="그만두기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></button>';
  root.addEventListener('click',function(e){
    var b=e.target.closest('[data-pl]');if(!b)return;
    var a=b.dataset.pl;
    if(a==='ok')plOk();else if(a==='no')endPlace();else if(a==='undo')onPanel(e);else if(a==='dir'){if(isPlacing())plDir(+b.dataset.v);else selExtend(+b.dataset.v);}else if(a==='up')plVert(1);else if(a==='down')plVert(-1);
  });
  $('#pbar').addEventListener('click',onPanel);
  // PC: Enter 짓기, Esc 그만두기, R 방향 돌리기
  document.addEventListener('keydown',function(e){
    if(!isPlacing()||e.target.closest&&e.target.closest('input,textarea'))return;
    var k=placeKind();
    if(e.key==='Escape'){endPlace();e.preventDefault();}
    else if(e.key==='Enter'&&(k==='bld'||k==='path'||k==='floor')){plOk();e.preventDefault();}
    else if((e.key==='r'||e.key==='R')&&(k==='path'||k==='floor'||(k==='bld'&&arrowMode(D[UI.tool])!=='none'))){plTurn();e.preventDefault();}
  });
}
