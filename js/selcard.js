'use strict';
/* ---------- 지은 것을 눌렀을 때 뜨는 작은 카드 ----------
   건축 패널을 열지 않고, 누른 건물 바로 위에 이름·한 줄 상태와 버튼 몇 개만 띄운다 (화면을 덜 가리게).
   · 첫 줄 버튼: 옮기기·돌리기, 그때 필요한 일(길 잇기·되돌리기·수리), '⋯'(나머지 펼치기)
   · 펼치면: 효과, 층 올리기·내리기, 입구·출구 옮기기, 칸 철거, 철거
   · 철거는 두 번 눌러야 한다 (작은 카드에서 잘못 눌러도 바로 사라지지 않게)
   지도 빈 곳을 누르거나 Esc를 누르면 닫힌다. 버튼 동작은 패널과 같은 onPanel로 처리한다. */
var scHtml='',scKey='',scMore=false,scArm=0;
// 땅 카드: 교회 부지 안의 빈 땅(바닥이 깔렸든 아니든) 한 칸
function selFloorOk(){var f=UI.selFloor;if(!f||f.x<0||f.y<0||f.x>=COLS||f.y>=PZ)return false;var sl=floorSlot(f.x,f.y,f.pid);return !!sl&&!sl.busy&&!piecesAt(f.x,f.y).some(function(p){return !p.s&&p.l===th(f.x,f.y);});}
function selCardOn(){return UI.fold&&!isPlacing()&&!S.over&&!!((UI.sel&&bById(UI.sel))||(UI.selPiece&&pieceById(UI.selPiece))||selFloorOk());}
// 바닥 바꾸기 줄: 지금 바닥을 뺀 종류마다 (걷어낸 반값을 뺀) 바꾸는 값
function floorRow(prev,pid,x,y){
  var h=FLOOR_IDS.filter(function(id){return id!==prev;}).map(function(id){
    var c=floorSwapCost(prev,id);
    return '<button class="btn sm fsw" data-act="fswap" data-v="'+id+'" style="--fc:'+D[id].wall+'" aria-label="'+D[id].name+'(으)로 '+(prev?'바꾸기':'깔기')+' '+(c<0?'환불 ':'')+fmt(Math.abs(c))+'"><i></i>'+D[id].name+' '+(c<0?'+':'')+fmt(Math.abs(c))+'</button>';
  }).join('');
  return '<div class="scb fsr">'+h+'</div>';
}
// 옆면(벽) 타일 줄: 윗면 바닥과 같은 종류를 벽에 붙인다
function wallRow(prev){
  var h=FLOOR_IDS.filter(function(id){return id!==prev;}).map(function(id){
    var c=floorSwapCost(prev,id);
    return '<button class="btn sm fsw" data-act="wswap" data-v="'+id+'" style="--fc:'+D[id].wall+'" aria-label="옆면을 '+D[id].name+'(으)로 '+(c<0?'환불 ':'')+fmt(Math.abs(c))+'"><i></i>'+D[id].name+' '+(c<0?'+':'')+fmt(Math.abs(c))+'</button>';
  }).join('');
  if(prev)h+='<button class="btn sm" data-act="wswap" data-v="f_erase">흙벽으로 +'+fmt(Math.floor(D[prev].cost*.5))+'</button>';
  return '<div class="scb fsr">'+h+'</div>';
}
function linkRow(n){
  return '<div class="scb fsr">'+FLOOR_IDS.map(function(id){var c=n*D[id].cost;
    return '<button class="btn sm fsw" data-act="linkf" data-v="'+id+'" style="--fc:'+D[id].wall+'"'+(S.money<c?' disabled':'')+' aria-label="'+D[id].name+'(으)로 '+n+'칸 잇기 '+fmt(c)+'"><i></i>'+D[id].name+' '+fmt(c)+'</button>';}).join('')+'</div>';
}
function scBtn(act,label,cls,v,aria){return '<button class="btn sm'+(cls?' '+cls:'')+'" data-act="'+act+'"'+(v!=null?' data-v="'+v+'"':'')+(aria?' aria-label="'+aria+'"':'')+'>'+label+'</button>';}
function scDem(label,cost){
  var armed=performance.now()<scArm;
  return scBtn('scdem',armed?'정말 철거? +'+fmt(cost):label+' +'+fmt(cost),'bad');
}
function renderSelCard(){
  var el=$('#selCard');if(!el)return;
  var on=selCardOn();
  el.hidden=!on;
  if(!on){scHtml='';scKey='';return;}
  var key=UI.sel?'b'+UI.sel:(UI.selPiece?'p'+UI.selPiece:'f'+UI.selFloor.x+','+UI.selFloor.y);
  if(key!==scKey){scKey=key;scMore=false;scArm=0;UI.doorPick=null;}
  var h='',row='',more='';
  if(UI.sel){
    var b=bById(UI.sel),bd=defOf(b),fl=b.floors||1,st=isRoom(b)&&UI.selTile&&tileOf(b,UI.selTile.x,UI.selTile.y);
    var sub=[];
    if(bd.cap)sub.push('이용 '+b.inUse+'/'+bd.cap+'명');
    if(b.door&&bd.cap)sub.push('회전 '+rotTime(b).toFixed(1)+'초'+(qLen(b)?' · 줄 '+queueCount(b)+'/'+qLen(b):''));
    if(maintainable(b))sub.push('상태 '+Math.round(condOf(b))+'%'+(wearStage(b)?' · 효율 '+Math.round(condFactor(b)*100)+'%':''));
    var warn='';
    if(b.door&&!usable(b))warn=b.q&&b.q.entry<0?'대기줄 끝이 길에 닿지 않아요':(!b.acc||!b.acc.ent?'입구까지 길이 없어 이용 못 해요':'출구에서 나갈 길이 없어요');
    else if(wearStage(b)>=2)warn=WEAR_NAME[wearStage(b)]+' · 낡아서 효율이 '+Math.round(condFactor(b)*100)+'%로 줄었어요';
    h='<div class="sct"><b>'+bd.name+(fl>1?' · '+fl+'층':'')+'</b>'+(sub.length?'<span>'+sub.join(' · ')+'</span>':'')+'</div>'+(warn?'<div class="scw">'+warn+'</div>':'');
    if(canMove(b))row+=scBtn('move',turnable(D[b.def])?'옮기기·돌리기':'옮기기','pri');
    var lp=b.door&&!usable(b)?linkPlan(b):null,lk=lp&&!lp.why&&lp.tiles.length>0;
    // 길을 이을 수 없으면 이유를 보여 주고, 이을 수 있는 쪽으로 문을 옮기는 버튼을 낸다
    if(lp&&lp.why){h=h.replace('<div class="scw">'+warn+'</div>','<div class="scw">'+lp.why+'</div>');row+=scBtn('doorpick','입구 고르기','pri','ent','입구를 낼 자리를 지도에서 고르기');}
    if(lk)row+=scBtn('link',UI.linkPick===b.id?'길 잇기 ⌄':'길 잇기 · '+lp.tiles.length+'칸','pri',null,'입구까지 길 잇기: 바닥 종류 고르기');
    var lb=UI.lastBuilt;if(canUnbuild(lb)&&lb.bid===b.id)row+=scBtn('undoLast','되돌리기 +'+fmt(lb.cost));
    if(maintainable(b)&&condOf(b)<100)row+=scBtn('repair','수리 '+fmt(repairCost(b)));
    // 길 잇기를 누르면: 어떤 바닥으로 이을지 고르는 줄 (칸 수 × 한 칸 값)
    if(lk&&UI.linkPick===b.id)h+=linkRow(lp.tiles.length);
    // 펼친 줄
    var eff=effText(bd);if(eff)more+='<div class="sce">'+eff+'</div>';
    if(b.door)more+='<div class="scb">'+scBtn('doorpick','입구 고르기',UI.doorPick&&UI.doorPick.which==='ent'?'pri':'','ent','입구를 낼 자리를 지도에서 고르기')+scBtn('doorpick','출구 고르기',UI.doorPick&&UI.doorPick.which==='ext'?'pri':'','ext','출구를 낼 자리를 지도에서 고르기')+'</div>';
    var mb='';
    if(canStack(b)){if(fl<maxFloors(b))mb+=scBtn('floorup','층 올리기 '+fmt(floorCostOf(b)));if(fl>1)mb+=scBtn('floordown','위층 철거 +'+fmt(floorCostOf(b)*0.5));}
    if(st)mb+=scBtn('demtile',(st.f>1?'이 칸 '+st.f+'층':'이 칸')+' 철거 +'+fmt((st.f>1?MROOM.floorCost:D[b.def].cost)*0.5));
    mb+=scDem(isRoom(b)?'전체 철거':'철거',bd.cost*0.5);
    more+='<div class="scb">'+mb+'</div>';
  }else if(UI.selPiece){
    var p=pieceById(UI.selPiece),sw=p.k==='sky'&&NAV.badSky[p.id],dk=isDeckPiece(p)&&!deckCovered(p);
    h='<div class="sct"><b>'+pieceName(p)+(p.f&&D[p.f]?' · '+D[p.f].name:'')+'</b><span>높이 '+p.l+(p.s?'→'+(p.l+1):'')+'</span></div>'+(sw?'<div class="scw">역할이 다른 건물을 이어 방문자가 건너지 않아요</div>':'');
    // 데크에는 바닥 타일을 바로 깔거나 바꿀 수 있다
    if(dk)h+=floorRow(p.f||null,p.id,p.x,p.y);
    if(dk&&p.f)row+=scBtn('fswap','바닥 걷기 +'+fmt(Math.floor(D[p.f].cost*.5)),'','f_erase');
    row+=scDem('철거',pieceCost(p)*0.5);
  }else if(isWater(UI.selFloor.x,UI.selFloor.y)){
    // 물: 다리 놓기·물 분수·물 빼기
    var wf=UI.selFloor,wn=poolCells(wf.x,wf.y).filter(function(q){return isWater(q.x,q.y);}).length;
    h='<div class="sct"><b>물</b><span>'+wn+'칸 · 다리로 건너요</span></div>';
    row+=scBtn('wbridge','다리 놓기','pri',null,'이 칸에 땅 높이의 아치 다리 놓기')+scBtn('wfount','물 분수 '+fmt(D.wfount.cost),'',null,'이 칸에 물 분수 놓기')+scBtn('wdrain','물 빼기','',null,'이 웅덩이의 물을 모두 빼기');
  }else{
    // 빈 땅·바닥 칸: 바닥 깔기·바꾸기, 땅 높이기·낮추기, 경사로를 바로 고른다
    var sf=UI.selFloor,cur=floorSlot(sf.x,sf.y,sf.pid).get(),gh=th(sf.x,sf.y);
    h='<div class="sct"><b>'+(cur?D[cur].name:(isRamp(sf.x,sf.y)?'흙 경사로':'빈 땅'))+'</b><span>'+(gh?lvName(gh)+' · ':'')+(cur?'바꾸면 걷어낸 값의 반을 빼고 계산해요':'눌러서 바로 깔아요')+'</span></div>'+floorRow(cur,0,sf.x,sf.y);
    // 벽이 있는 칸: 옆면 타일로 바꿔 고를 수 있다 (줄은 하나만 보인다)
    var face=cellHasFace(sf.x,sf.y),wm=face&&UI.wallMode,wcur=wallId(sf.x,sf.y);
    if(wm)h='<div class="sct"><b>옆면(벽) · '+(wcur?D[wcur].name:'흙벽')+'</b><span>'+(gh?lvName(gh)+' · ':'')+'이 칸에 맞닿은 벽에 붙여요</span></div>'+wallRow(wcur);
    if(face)row+=scBtn('wmode',wm?'윗면 타일':'옆면 타일','',null,wm?'윗면 바닥 타일 고르기':'옆면(벽) 타일 고르기');
    var up=terPlan(sf.x,sf.y,'ter_set',gh+1),dn=gh>MINH||isRamp(sf.x,sf.y)?terPlan(sf.x,sf.y,'ter_set',isRamp(sf.x,sf.y)?gh:gh-1):null;
    if(!up.why)row+=scBtn('gter','땅 높이기 '+fmt(up.cost),'',gh+1,'땅을 한 층 높이기 '+fmt(up.cost));
    if(dn&&!dn.why)row+=scBtn('gter',(isRamp(sf.x,sf.y)?'평평하게 ':'땅 낮추기 ')+fmt(dn.cost),'',isRamp(sf.x,sf.y)?gh:gh-1);
    row+=scBtn('gramp','경사로…','',null,'이 칸에서 흙 경사로 짓기 (방향을 고른 뒤 ✓)');
    if(gh<0){var wp=waterPlan(sf.x,sf.y);row+=scBtn('wfill','물 채우기'+(wp.why?'':' '+fmt(wp.cost)),'',null,'이어진 지하 칸 전체에 물 채우기');}
    if(cur)row+=scDem('철거',Math.floor(D[cur].cost*.5));
  }
  if(more)row+=scBtn('scmore',scMore?'접기':'⋯','',null,scMore?'접기':'더 보기: 층·입구·출구·철거');
  h+='<div class="scb">'+row+'</div>'+(scMore?more:'');
  if(h!==scHtml){el.innerHTML=h;scHtml=h;}
}
// 매 프레임: 고른 것 바로 위에 붙인다. 위쪽에 자리가 없으면 아래로
function syncSelCard(){
  var el=$('#selCard');if(!el)return;
  if(selCardOn()===el.hidden)renderSelCard();
  if(el.hidden)return;
  if(scArm&&performance.now()>=scArm){scArm=0;renderSelCard();}
  var x,y,top;
  if(UI.sel){var b=bById(UI.sel),dm=bDims(b),m=rotPt(b.x+dm.w/2,b.y+dm.h/2);top=toScreen(m[0],m[1],bZ(b)+bHeight(b)+.3);var bot=toScreen(m[0],m[1],bZ(b));}
  else if(UI.selPiece){var p=pieceById(UI.selPiece),mp=rotPt(p.x+.5,p.y+.5);top=toScreen(mp[0],mp[1],p.l*LV+.5);bot=toScreen(mp[0],mp[1],p.l*LV);}
  else{var sf=UI.selFloor,mf=rotPt(sf.x+.5,sf.y+.5),fz=groundZ(sf.x+.5,sf.y+.5);top=toScreen(mf[0],mf[1],fz+.3);bot=toScreen(mf[0],mf[1],fz);}
  // 칸을 고르면 둘레에 화살표가 뜨므로, 카드는 화살표 무리 전체의 위(자리가 없으면 아래)에 붙인다
  var side=null;
  if(selTarget()){var pb=plBox();if(pb){var ay0=1e9,ay1=-1e9,ax0=1e9,ax1=-1e9;pb.arr.forEach(function(a){ay0=Math.min(ay0,a.y);ay1=Math.max(ay1,a.y);ax0=Math.min(ax0,a.x);ax1=Math.max(ax1,a.x);});top=[top[0],ay0-18];bot=[bot[0],ay1+18];side=[ax0-24,ax1+24];}}
  var vw=window.innerWidth,vh=window.innerHeight,w=el.offsetWidth,h=el.offsetHeight,tb=$('#top').getBoundingClientRect().bottom+8,below=top[1]-h-10<tb;
  x=clamp(top[0],w/2+8,vw-w/2-8);
  y=below?clamp(bot[1]+16,tb,vh-h-8):clamp(top[1]-h-10,tb,vh-h-8);
  // 위·아래 어디에도 화살표를 가리지 않고 들어갈 자리가 없으면 화살표 무리 옆에 붙인다 (▲▼는 좌우 어느 쪽에 있을 수 있어 더 넓게 비운다)
  var fitsUp=top[1]-h-10>=tb,fitsDn=bot[1]+16+h<=vh-8,beside=false;
  if(side&&!fitsUp&&!fitsDn){
    var rx=side[1]+44,lx=side[0]-44;
    if(rx+w<=vw-8){x=rx+w/2;beside=true;}else if(lx-w>=8){x=lx-w/2;beside=true;}
    if(beside)y=clamp(top[1]-6,tb,vh-h-8);
  }
  el.classList.toggle('below',below&&!beside);
  el.classList.toggle('beside',beside);
  el.style.setProperty('--ax',Math.round(clamp(top[0]-(x-w/2),14,w-14))+'px');
  el.style.transform='translate('+Math.round(x-w/2)+'px,'+Math.round(y)+'px)';
}
function closeSelCard(){UI.doorPick=null;UI.sel=null;UI.selPiece=null;UI.selTile=null;UI.selFloor=null;renderSelCard();}
function setupSelCard(){
  var el=$('#selCard');
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b)return;
    var a=b.dataset.act;
    if(a==='scmore'){scMore=!scMore;renderSelCard();return;}
    if(a==='scdem'){
      // 두 번 눌러야 철거 (3초 안에)
      if(performance.now()>=scArm){scArm=performance.now()+3000;renderSelCard();return;}
      scArm=0;b.dataset.act=UI.sel?'demolish':(UI.selPiece?'dempiece':'demfloor');onPanel(e);b.dataset.act='scdem';renderSelCard();return;
    }
    onPanel(e);renderSelCard();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!el.hidden)closeSelCard();});
}
