'use strict';
/* ---------- 지도 위에서 짓기 ----------
   건축 목록에서 하나를 고르면 패널은 닫히고 지도에서 바로 짓는다.
   · 건물·조경: 반투명 미리보기 둘레의 화살표로 정면 방향을 고르고, 왼쪽 위 ✓로 짓고 오른쪽 위 ✕로 그만둔다.
     미리보기는 끌어서 옮기거나 지도를 눌러 옮긴다. 조경은 지은 뒤에도 이어서 옆자리에 또 지을 수 있다.
   · 길: 커서 칸 둘레 화살표로 방향, ✓로 한 칸씩 잇는다. 종류·경사·높이는 아래 작은 띠에서.
   · 칸 건물·바닥: 지도를 누르면 바로 지어진다. 띠에 되돌리기·완료만 둔다.
   아래 띠(#pbar)는 이름·비용·효과, 지을 수 없으면 그 까닭을 보여 준다. */
var REPEAT_CATS=['garden'],plLock=0,plHtml='',PL_DIRNAME=['오른쪽 아래','왼쪽 아래','왼쪽 위','오른쪽 위'];
function isPlacing(){return !UI.fold&&UI.tab==='build'&&!!UI.tool&&UI.tool!=='demolish';}
function placeKind(){
  if(!isPlacing())return '';
  if(UI.tool==='path')return 'path';
  if(isRoomDef(UI.tool))return 'room';
  if(isFloorDef(UI.tool))return 'floor';
  return D[UI.tool]?'bld':'';
}
// 방향을 바꿔도 달라지는 게 없는 것(나무·화분처럼 문이 없고 정사각형인 장식)에는 화살표를 띄우지 않는다
function faceMatters(d){return !!d.fill||d.w!==d.h||d.towerH>0||['hedge','arch','stage','fence','bell','board','bikerack','lamp2','statue','busstop'].indexOf(d.kind)>=0;}
function plScr(x,y,z){var r=rotPt(x,y);return toScreen(r[0],r[1],z);}
function placeWhy(d,x,y,face){
  var dm=faceDims(d,face);
  var zw=zoneWhy(d,x,y,face);if(zw)return zw;
  if(!canPlace(d,x,y,face))return '다른 건물이나 길과 겹쳐요. 끌어서 옮겨 보세요';
  if(isLocked(d.id))return lockText(lockGoal(d.id))+' 지을 수 있어요';
  if(S.money<d.cost)return '자금이 '+fmt(d.cost-S.money)+' 모자라요';
  return '';
}
function startPlace(id){
  UI.tool=id;UI.sel=null;UI.selPiece=null;UI.undo=[];UI.lastBuilt=null;
  if(UI.fdir==null)UI.fdir=screenToWorldDir(3);
  var c=viewCenter();
  if(id==='path'){UI.pc=newCursor();UI.ghost=null;pcStartAt(c[0],c[1]);}
  else{
    UI.pc=null;placeGhost(groundTile(c[0],c[1]));
    // 화면 가운데가 막혀 있으면 가장 가까운 빈자리에서 시작
    var d=D[id];
    if(!isRoomDef(id)&&!isFloorDef(id)&&!canPlace(d,UI.ghost.x,UI.ghost.y,UI.face)){var nf=plNear(d,UI.ghost.x,UI.ghost.y,8);if(nf){UI.ghost.x=nf.x;UI.ghost.y=nf.y;}}
  }
  renderPanel();
}
// 그만두면 건축 목록으로 돌아간다 (이미 지은 것은 그대로)
function endPlace(){UI.tool=null;UI.ghost=null;UI.undo=[];UI.pc=null;renderPanel();}
// 미리보기의 화면 위치: 좌우·위 끝, 방향별 화살표 자리
function plBox(){
  var k=placeKind(),x,y,w,h,z0,H;
  if(k==='bld'){if(!UI.ghost)return null;var dm=faceDims(D[UI.tool],UI.face);x=UI.ghost.x;y=UI.ghost.y;w=dm.w;h=dm.h;z0=0;H=heightOf(UI.tool);}
  else if(k==='path'){var c=UI.pc;if(!c||c.x==null)return null;x=c.x;y=c.y;w=1;h=1;z0=c.l*LV;H=.35;}
  else if(k==='floor'){if(!UI.ghost)return null;x=UI.ghost.x;y=UI.ghost.y;w=1;h=1;z0=0;H=.1;}
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
  var k=placeKind(),line=k==='path'||k==='floor',bx=(k==='bld'||line)?plBox():null;
  root.hidden=!bx;if(!bx)return;
  var vw=window.innerWidth,vh=window.innerHeight,cl=function(v,a,b){return Math.max(a,Math.min(b,v));};
  // 건물: 화살표 = 건물이 바라보는 방향(정면). 길·바닥: 화살표 = 다음 칸으로 이어 짓는 방향
  var show=line||faceMatters(D[UI.tool]),cur=k==='path'?UI.pc.dir:(k==='floor'?UI.fdir:UI.face),minY=1e9,maxY=-1e9;
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
  var mid=(bx.l+bx.r)/2,half=Math.max((bx.r-bx.l)/2,28),top=Math.min(bx.t-18,show?minY-38:1e9),tb=$('#top').getBoundingClientRect().bottom+22;
  if(top<tb)top=Math.max(bx.b+18,show?maxY+38:-1e9);
  var ok=root.querySelector('[data-pl="ok"]'),no=root.querySelector('[data-pl="no"]');
  plMove(ok,cl(mid-half,22,vw-22),cl(top,22,vh-22),38);
  plMove(no,cl(mid+half,22,vw-22),cl(top,22,vh-22),38);
  var can=k==='path'?plPathWhy()==='':(k==='floor'?!floorWhy(UI.ghost.x,UI.ghost.y,UI.tool):!placeWhy(D[UI.tool],UI.ghost.x,UI.ghost.y,UI.face));
  ok.disabled=!can;
  ok.setAttribute('aria-label',line?'이 칸 짓고 다음 칸으로':(can?D[UI.tool].name+' 짓기':'여기에는 지을 수 없어요'));
}
function plPathWhy(){var p=pcPiece();return p?(pieceFits(p)||(S.money<pieceCost(p)?'자금이 부족해요':'')):'시작할 곳을 먼저 누르세요';}
// 화살표: 건물은 정면(기본 출입구) 방향, 길은 다음 칸이 이어질 방향
function plDir(d){
  if(placeKind()==='path'){UI.pc.dir=d;renderDetail();return;}
  if(placeKind()==='floor'){UI.fdir=d;renderDetail();return;}
  var df=D[UI.tool],o=faceDims(df,UI.face),n=faceDims(df,d),g=UI.ghost;
  UI.face=d;
  // 가로세로가 바뀌면 가운데를 지키며 돌린다
  if(g){g.x=clamp(Math.round(g.x+o.w/2-n.w/2),0,COLS-n.w);g.y=clamp(Math.round(g.y+o.h/2-n.h/2),0,ROWS-1-n.h);}
  renderDetail();
}
function plTurn(){var k=placeKind(),cur=k==='path'?UI.pc.dir:(k==='floor'?UI.fdir:UI.face);plDir(screenToWorldDir((worldToScreenDir(cur)+1)%4));}
// 이어 짓기(조경): 방금 지은 자리 옆 빈 곳으로 미리보기를 옮긴다. 지난번에 옮긴 쪽을 먼저 본다
function plNext(d,x,y){
  var dm=faceDims(d,UI.face),pref=UI.shift||[1,0];
  var first=[[pref[0]*dm.w,pref[1]*dm.h],[dm.w,0],[0,dm.h],[-dm.w,0],[0,-dm.h]];
  for(var i=0;i<first.length;i++){var fx=x+first[i][0],fy=y+first[i][1];if(canPlace(d,fx,fy,UI.face)){UI.shift=[Math.sign(first[i][0]),Math.sign(first[i][1])];return {x:fx,y:fy};}}
  return plNear(d,x,y,5);
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
  if(k==='path'){var why=pcBuild();if(why)toast(why,1600);else{plLock=now+180;plBuzz();}renderDetail();hud(true);return;}
  // 바닥: 이 칸을 칠하고 화살표 방향으로 한 칸 나아간다
  if(k==='floor'){
    var g0=UI.ghost,fw=g0?paintFloor(g0.x,g0.y,UI.tool):'자리를 먼저 고르세요';
    if(fw){toast(fw,1400);return;}
    plLock=now+150;plBuzz();
    var nx=g0.x+DIRS[UI.fdir][0],ny=g0.y+DIRS[UI.fdir][1];
    if(nx>=0&&ny>=0&&nx<COLS&&ny<PZ){g0.x=nx;g0.y=ny;}
    renderDetail();hud(true);return;
  }
  if(k!=='bld'||!UI.ghost)return;
  var d=D[UI.tool],g=UI.ghost,why2=placeWhy(d,g.x,g.y,UI.face);
  if(why2){toast(why2,1600);return;}
  var s0=snapStats();
  if(!build(UI.tool,g.x,g.y,UI.face))return;
  var dm=faceDims(d,UI.face),nb=S.buildings[S.buildings.length-1];
  statFx(s0,g.x+dm.w/2,g.y+dm.h/2,heightOf(UI.tool)+.2);plBuzz();plLock=now+350;
  if(REPEAT_CATS.indexOf(d.cat)>=0){
    // 조경은 이어서: 옆 빈자리로 미리보기를 옮기고 되돌리기를 쌓는다
    UI.undo.push({bid:nb.id,cost:d.cost,w:S.week});
    var nx=plNext(d,g.x,g.y);if(nx){g.x=nx.x;g.y=nx.y;}
    toast(d.name+'을(를) 지었어요 · ✓로 옆에 또 짓기',1500);renderDetail();
  }else{
    // 큰 건물은 하나 짓고 목록으로. 방금 지은 것은 목록에서 전액 되돌릴 수 있다
    UI.tool=null;UI.ghost=null;UI.lastBuilt={bid:nb.id,cost:d.cost,w:S.week};
    toast(d.name+'을(를) 지었어요',1600);renderPanel();
  }
  hud(true);
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
  var k=placeKind();el.hidden=!k;if(!k){plHtml='';syncPlace();return;}
  var h='',undo=UI.undo.length?'<button class="btn" data-act="undo">되돌리기</button>':'',d=D[UI.tool];
  if(k==='bld'){
    var g=UI.ghost,why=g?placeWhy(d,g.x,g.y,UI.face):'지도를 눌러 자리를 고르세요';
    var tip=faceMatters(d)?'끌어서 옮기고, 화살표로 건물이 바라볼 방향(정면·출입구)을 고르세요':'끌어서 옮기거나 지도를 눌러 자리를 고르세요';
    h='<div class="ptx"><b>'+d.name+'</b> <span class="pc">'+fmt(d.cost)+'</span> · '+(why?bad(why):effText(d))+'<br><span class="pt">'+(UI.undo.length?'이어서 ✓를 누르면 옆자리에 또 지어요':tip)+'</span></div>'+(undo?'<div class="btns">'+undo+'</div>':'');
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
    h='<div class="ptx"><b>'+d.name+'</b> <span class="pc">'+fmt(d.cost)+'</span> · 위층 '+fmt(MROOM.floorCost)+' · '+effText(d)+'<br><span class="pt">'+line+'</span></div><div class="btns">'+undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else{
    var fwy=UI.ghost?floorWhy(UI.ghost.x,UI.ghost.y,UI.tool):'';
    h='<div class="ptx"><b>'+d.name+'</b>'+(d.cost?' <span class="pc">한 칸 '+fmt(d.cost)+'</span>':'')+' · '+(fwy?bad(fwy):d.desc)+'<br><span class="pt">지도를 눌러 시작할 칸을 고르고, 화살표로 깔아 나갈 방향을 정한 뒤 ✓로 한 칸씩 깔아요</span></div><div class="btns">'+undo+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }
  // 내용이 같으면 다시 그리지 않는다 (누르는 도중 버튼이 바뀌어 눌림이 사라지지 않게)
  if(h!==plHtml){el.innerHTML=h;plHtml=h;}
  el.className='glass'+(k==='path'?' wide':'');
  syncPlace();
}
function setupPlace(){
  var root=$('#place'),arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  root.innerHTML=[0,1,2,3].map(function(d){return '<button class="parr" data-pl="dir" data-v="'+d+'" aria-label="방향 '+(d+1)+'">'+arrow+'</button>';}).join('')+
    '<button class="pok" data-pl="ok" aria-label="짓기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
    '<button class="pno" data-pl="no" aria-label="그만두기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></button>';
  root.addEventListener('click',function(e){
    var b=e.target.closest('[data-pl]');if(!b)return;
    var a=b.dataset.pl;
    if(a==='ok')plOk();else if(a==='no')endPlace();else if(a==='dir')plDir(+b.dataset.v);
  });
  $('#pbar').addEventListener('click',onPanel);
  // PC: Enter 짓기, Esc 그만두기, R 방향 돌리기
  document.addEventListener('keydown',function(e){
    if(!isPlacing()||e.target.closest&&e.target.closest('input,textarea'))return;
    var k=placeKind();
    if(e.key==='Escape'){endPlace();e.preventDefault();}
    else if(e.key==='Enter'&&(k==='bld'||k==='path'||k==='floor')){plOk();e.preventDefault();}
    else if((e.key==='r'||e.key==='R')&&(k==='path'||k==='floor'||(k==='bld'&&faceMatters(D[UI.tool])))){plTurn();e.preventDefault();}
  });
}
