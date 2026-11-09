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
function isDecoCat(d){return REPEAT_CATS.indexOf(d.cat)>=0;}
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
  var gx=ENT+.5-(x+d.w/2),gy=PZ-(y+d.h/2),best=2,bv=-1e9;
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
  if(movingId())return '';
  if(isLocked(d.id))return lockText(lockGoal(d.id))+' 지을 수 있어요';
  if(S.money<d.cost)return '자금이 '+fmt(d.cost-S.money)+' 모자라요';
  return '';
}
function startPlace(id){
  UI.flast=null;UI.moving=null;UI.tool=id;UI.sel=null;UI.selPiece=null;UI.undo=[];UI.lastBuilt=null;
  if(UI.fdir==null)UI.fdir=screenToWorldDir(3);
  if(D[id]&&isLineKind(D[id]))UI.face=UI.fdir<2?2:0;
  var c=viewCenter();
  if(id==='path'){UI.pc=newCursor();UI.ghost=null;pcStartAt(c[0],c[1]);}
  else{
    UI.pc=null;placeGhost(groundTile(c[0],c[1]));
    // 화면 가운데가 막혀 있으면 가장 가까운 빈자리에서 시작
    var d=D[id];
    if(!isRoomDef(id)&&!isFloorDef(id)&&!isTerDef(id)&&!canPlace(d,UI.ghost.x,UI.ghost.y,UI.face)){var nf=plNear(d,UI.ghost.x,UI.ghost.y,8);if(nf){UI.ghost.x=nf.x;UI.ghost.y=nf.y;}}
  }
  renderPanel();
}
// 그만두면 건축 목록으로 돌아간다 (이미 지은 것은 그대로)
function endPlace(){
  // 옮기기를 그만두면 목록이 아니라 그 건물의 카드로 돌아간다
  if(UI.moving&&bById(UI.moving)){var mid=UI.moving;UI.moving=null;UI.tool=null;UI.ghost=null;UI.undo=[];UI.pc=null;UI.fold=true;UI.sel=mid;renderPanel();return;}
  UI.moving=null;UI.tool=null;UI.ghost=null;UI.undo=[];UI.pc=null;renderPanel();}
// 미리보기의 화면 위치: 좌우·위 끝, 방향별 화살표 자리
function plBox(){
  var k=placeKind(),x,y,w,h,z0,H;
  if(k==='bld'){if(!UI.ghost)return null;var dm=faceDims(D[UI.tool],UI.face);x=UI.ghost.x;y=UI.ghost.y;w=dm.w;h=dm.h;z0=plLevelZ(D[UI.tool],x,y,UI.face);H=heightOf(UI.tool);}
  else if(k==='path'){var c=UI.pc;if(!c||c.x==null)return null;x=c.x;y=c.y;w=1;h=1;z0=c.l*LV;H=.35;}
  else if(k==='floor'){if(!UI.ghost)return null;x=UI.ghost.x;y=UI.ghost.y;w=1;h=1;z0=ghostZ();H=.1;if(isTerDef(UI.tool)&&UI.tool==='ter_set')H=Math.max(.1,UI.tlv*LV-z0);}
  else return null;
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
function ghostHit(px,py){
  if(placeKind()!=='bld')return false;
  var bx=plBox();return !!bx&&px>=bx.l&&px<=bx.r&&py>=bx.t&&py<=bx.b;
}
function plMove(el,x,y,w){el.style.transform='translate('+Math.round(x-w/2)+'px,'+Math.round(y-w/2)+'px)';}
// 매 프레임: 지도 위 버튼을 미리보기 둘레에 붙인다
function syncPlace(){
  var root=$('#place');if(!root)return;
  var k=placeKind(),am=k==='bld'?arrowMode(D[UI.tool]):'',line=k==='path'||k==='floor'||am==='line',bx=k?plBox():null;
  root.hidden=!bx;if(!bx)return;
  var vw=window.innerWidth,vh=window.innerHeight,cl=function(v,a,b){return Math.max(a,Math.min(b,v));};
  // 건물: 화살표 = 건물이 바라보는 방향(정면). 길·바닥·조경: 화살표 = 다음 칸으로 이어 짓는 방향
  var show=line||am==='face',cur=plCur(),minY=1e9,maxY=-1e9;
  root.querySelectorAll('.parr').forEach(function(el){
    var a=bx.arr[+el.dataset.v];el.hidden=!show;if(!show)return;
    minY=Math.min(minY,a.y);maxY=Math.max(maxY,a.y);
    plMove(el,cl(a.x,20,vw-20),cl(a.y,20,vh-20),32);
    el.firstChild.style.transform='rotate('+a.ang+'rad)';
    var on=a.d===cur;el.classList.toggle('on',on);el.setAttribute('aria-pressed',String(on));
    el.setAttribute('aria-label',(line?'짓는 방향 ':'바라보는 방향 ')+PL_DIRNAME[worldToScreenDir(a.d)]);
  });
  // ✓·✕는 미리보기 위쪽 좌우. 화살표와 겹치지 않게 충분히 띄운다.
  // 위쪽(교회 이름표 줄)에 자리가 없으면 미리보기 아래로 내린다
  var hasUn=k==='bld'&&UI.undo.length>0,mid=(bx.l+bx.r)/2,half=Math.max((bx.r-bx.l)/2,hasUn?46:28),top=Math.min(bx.t-18,show?minY-38:1e9),tb=$('#top').getBoundingClientRect().bottom+22;
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
  ok.setAttribute('aria-label',line?'이 칸 짓고 다음 칸으로':(can?(movingId()?'여기로 옮기기':D[UI.tool].name+' 짓기 · '+fmt(D[UI.tool].cost)):'여기에는 지을 수 없어요'));
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
  if(g){g.x=clamp(Math.round(g.x+o.w/2-n.w/2),0,COLS-n.w);g.y=clamp(Math.round(g.y+o.h/2-n.h/2),0,ROWS-1-n.h);}
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
function plNear(d,x,y,R){
  var best=null,bd=1e9;
  for(var r=1;r<=R;r++){
    for(var j=-r;j<=r;j++)for(var k=-r;k<=r;k++){
      if(Math.max(Math.abs(j),Math.abs(k))!==r)continue;
      var dd=j*j+k*k;
      if(dd<bd&&canPlace(d,x+j,y+k,UI.face)){bd=dd;best={x:x+j,y:y+k};}
    }
    if(best)return best;
  }
  return null;
}
function plOk(){
  var k=placeKind(),now=performance.now();
  if(now<plLock)return;
  if(k==='path'){var why=pcBuild();if(why){toast(why,1600);sfx('error',.4);}else{plLock=now+180;plBuzz();sfx('floor',.5);}renderDetail();hud(true);return;}
  // 바닥: 이 칸을 칠하고 화살표 방향으로 한 칸 나아간다
  if(k==='floor'){
    var ter=isTerDef(UI.tool),g0=UI.ghost,fw=!g0?'자리를 먼저 고르세요':(ter?terApply(g0.x,g0.y,UI.tool,UI.tlv,UI.fdir):paintFloor(g0.x,g0.y,UI.tool,g0.pid));
    if(fw){toast(fw,1400);sfx('error',.4);return;}
    plLock=now+150;plBuzz();sfx(ter?'place':'floor',.45,90);
    UI.flast={x:g0.x,y:g0.y,pid:g0.pid};floorStep(g0,UI.fdir);
    renderDetail();hud(true);return;
  }
  if(k!=='bld'||!UI.ghost)return;
  if(movingId()){plMoveDone();return;}
  var d=D[UI.tool],g=UI.ghost,why2=placeWhy(d,g.x,g.y,UI.face);
  if(why2){toast(why2,1600);sfx('error',.4);return;}
  if(!build(UI.tool,g.x,g.y,plFace()))return;
  var nb=S.buildings[S.buildings.length-1];
  plBuzz();plLock=now+350;sfx(isDecoCat(d)?'place':'build',.8);
  if(REPEAT_CATS.indexOf(d.cat)>=0){
    // 조경·꾸미기는 길처럼 이어서: 한 칸 나아가고 되돌리기를 쌓는다 (막힌 칸이면 회색 ✓로 알려 준다)
    UI.undo.push({bid:nb.id,cost:d.cost,w:S.week});
    var dm=faceDims(d,UI.face),st=plStep(d),nx=g.x+st[0]*dm.w,ny=g.y+st[1]*dm.h;
    if(nx>=0&&ny>=0&&nx+dm.w<=COLS&&ny+dm.h<=ROWS-1){g.x=nx;g.y=ny;}
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
  UI.tab='build';UI.fold=false;UI.tool=b.def;UI.face=b.face==null?2:b.face;UI.ghost={x:b.x,y:b.y};UI.moving=b.id;
  UI.sel=null;UI.selPiece=null;UI.selTile=null;UI.undo=[];UI.pc=null;
  renderPanel();
}
function plMoveDone(){
  var b=bById(UI.moving),g=UI.ghost;if(!b||!g){endPlace();return;}
  var face=UI.face,why=placeWhy(D[b.def],g.x,g.y,face);
  if(why){toast(why,1600);sfx('error',.4);return;}
  var f0=b.face==null?2:b.face,dx=g.x-b.x,dy=g.y-b.y,same=!dx&&!dy&&f0===face,links=(b.links||[]).length;
  if(!same){
    if(b.door&&f0===face)['ent','ext'].forEach(function(k){b.door[k]={x:b.door[k].x+dx,y:b.door[k].y+dy,d:b.door[k].d,l:b.door[k].l};});
    else delete b.door;
    b.x=g.x;b.y=g.y;b.face=face;setPlaceLevel(b,D[b.def],g.x,g.y,face);
    releaseVisitors(b.id);structureChanged();plBuzz();sfx('place',.7);
  }
  UI.moving=null;UI.tool=null;UI.ghost=null;UI.fold=true;UI.sel=b.id;
  var msg=same?'그대로 두었어요':D[b.def].name+'을(를) 옮겼어요'+(links&&!(b.links||[]).length?' · 연결 다리가 끊겼어요':'')+(b.door&&!usable(b)?' · 입구까지 길을 이어 주세요':'');
  toast(msg,1800);renderPanel();hud(true);
}
function plBuzz(){try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}}
// 방금 지은 건물을 전액 돌려받고 없앤다. 같은 주 안에서만, 층을 올렸거나 이미 없으면 못 한다
function canUnbuild(u){var b=u&&bById(u.bid);return !!b&&(b.floors||1)<=1&&u.w===S.week;}
function unbuild(u){
  if(!canUnbuild(u))return false;
  var b=bById(u.bid);
  var d=defOf(b);demolish(b.id);S.money+=u.cost-Math.floor(d.cost*0.5);save();
  return true;
}
function renderPbar(){
  var el=$('#pbar');if(!el)return;
  var k=placeKind();el.hidden=!k||k==='bld';if(el.hidden){plHtml='';syncPlace();return;}
  var h='',undo=UI.undo.length?'<button class="btn" data-act="undo">되돌리기</button>':'',d=D[UI.tool];
  if(k==='bld'){
    var g=UI.ghost,why=g?placeWhy(d,g.x,g.y,UI.face):'지도를 눌러 자리를 고르세요';
    var tip=faceMatters(d)?'끌어서 옮기고, 화살표로 건물이 바라볼 방향(정면·출입구)을 고르세요':'끌어서 옮기거나 지도를 눌러 자리를 고르세요';
    h='<div class="ptx"><b>'+d.name+'</b> <span class="pc">'+fmt(d.cost)+'</span>'+(why?' · '+bad(why):'')+'<br><span class="pt">'+(UI.undo.length?'이어서 ✓를 누르면 옆자리에 또 지어요':tip)+'</span></div>'+(undo?'<div class="btns">'+undo+'</div>':'');
  }else if(k==='path'){
    var c=UI.pc,p=pcPiece(),pw=plPathWhy(),sky=c.k==='sky',sl=sky?0:c.slope;
    var info=!p?'지도를 눌러 시작할 곳을 고르세요. 지어 둔 길을 누르면 그 끝에서 이어 짓습니다':
      (pw?bad(pw):'<b>'+pieceName(p)+'</b> <span class="pc">'+fmt(pieceCost(p))+'</span> · 높이 '+c.l+(sl?'→'+(c.l+sl):'')+' · ✓로 한 칸씩 이어요');
    h='<div class="ptx">'+info+'</div><div class="prow">'+
      segBtns('pkind',c.k,[['stone','돌길'],['wood','나무 데크'],['sky','연결 다리']])+
      segBtns('pslope',sl,[[-1,'내리막'],[0,'평지'],[1,'오르막']],sky)+
      '<div class="seg"><button class="btn" data-act="plevel" data-v="-1" aria-label="시작 높이 한 층 낮게"'+(c.l<=0?' disabled':'')+'>▼</button><span class="lvl">'+(c.l?c.l+1+'층':'땅')+'</span><button class="btn" data-act="plevel" data-v="1" aria-label="시작 높이 한 층 높게"'+(c.l>=MAXL?' disabled':'')+'>▲</button></div>'+
      (c.hist.length?'<button class="btn" data-act="pundo">되돌리기</button>':'')+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else if(k==='room'){
    var rp=UI.ghost?tilePlan(UI.ghost.x,UI.ghost.y,UI.tool):null,line;
    if(!rp)line='빈 땅을 누르면 칸이 생겨요. 이어 붙이면 하나의 '+d.rname+', 지은 칸을 다시 누르면 위층(최대 '+MROOM.maxF+'층)';
    else if(!rp.ok)line=bad(rp.why);
    else if(S.money<rp.cost)line=bad('자금이 부족해요');
    else line=(rp.kind==='floor'?'누르면 위층을 올려요 · ':'누르면 칸을 지어요 · ')+fmt(rp.cost);
    h='<div class="ptx"><b>'+d.name+'</b> <span class="pc">'+fmt(d.cost)+'</span> · 위층 '+fmt(MROOM.floorCost)+'<br><span class="pt">'+line+'</span></div><div class="btns">'+undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else if(isTerDef(UI.tool)){
    var tg=UI.ghost,tp=tg?terPlan(tg.x,tg.y,UI.tool,UI.tlv,UI.fdir):null,tw=tg?cellWhy(tg.x,tg.y,UI.tool):'지도를 눌러 칸을 고르세요';
    var ramp=UI.tool==='ter_ramp';
    h='<div class="ptx"><b>'+d.name+'</b>'+(tp&&!tp.why?' <span class="pc">'+fmt(tp.cost)+'</span>':'')+(tw?' · '+bad(tw):'')+'<br><span class="pt">'+
      (ramp?'칸을 누르고 화살표로 오를 방향을 고른 뒤 ✓. 화살표 쪽 땅이 낮으면 한 층 높여 줘요(값 포함). 이어 누르면 더 높이 올라가요':'칸을 누르고 높이를 고른 뒤 ✓로 한 칸씩. 화살표 쪽으로 이어 가요')+'</span></div><div class="prow">'+
      (ramp?'':'<div class="seg"><button class="btn" data-act="tlv" data-v="-1" aria-label="한 층 낮게"'+(UI.tlv<=0?' disabled':'')+'>▼</button><span class="lvl">'+(UI.tlv?'높이 '+UI.tlv:'땅')+'</span><button class="btn" data-act="tlv" data-v="1" aria-label="한 층 높게"'+(UI.tlv>=MAXH-1?' disabled':'')+'>▲</button></div>')+
      undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else{
    var fwy=UI.ghost?floorWhy(UI.ghost.x,UI.ghost.y,UI.tool,UI.ghost.pid):'';
    var fsl=UI.ghost&&floorSlot(UI.ghost.x,UI.ghost.y,UI.ghost.pid),fpv=fsl&&fsl.get(),fnc=fpv&&fpv!==UI.tool&&d.cost?floorSwapCost(fpv,UI.tool):null;
    h='<div class="ptx"><b>'+d.name+'</b>'+(d.cost?' <span class="pc">'+(fnc!=null?'바꾸기 '+(fnc<0?'+':'')+fmt(Math.abs(fnc)):'한 칸 '+fmt(d.cost))+'</span>':'')+' · '+(fwy?bad(fwy):d.desc)+'<br><span class="pt">지도를 눌러 시작할 칸을 고르고, 화살표로 깔아 나갈 방향을 정한 뒤 ✓로 한 칸씩 깔아요</span></div><div class="btns">'+undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }
  // 내용이 같으면 다시 그리지 않는다 (누르는 도중 버튼이 바뀌어 눌림이 사라지지 않게)
  if(h!==plHtml){el.innerHTML=h;plHtml=h;}
  el.className='glass'+(k==='path'||isTerDef(UI.tool)?' wide':'');
  syncPlace();
}
function setupPlace(){
  var root=$('#place'),arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  root.innerHTML=[0,1,2,3].map(function(d){return '<button class="parr" data-pl="dir" data-v="'+d+'" aria-label="방향 '+(d+1)+'">'+arrow+'</button>';}).join('')+
    '<button class="pok" data-pl="ok" aria-label="짓기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<button class="pun" data-pl="undo" data-act="undo" aria-label="방금 지은 것 되돌리기" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<button class="pno" data-pl="no" aria-label="그만두기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></button>';
  root.addEventListener('click',function(e){
    var b=e.target.closest('[data-pl]');if(!b)return;
    var a=b.dataset.pl;
    if(a==='ok')plOk();else if(a==='no')endPlace();else if(a==='undo')onPanel(e);else if(a==='dir')plDir(+b.dataset.v);
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
