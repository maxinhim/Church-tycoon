'use strict';
/* ---------- 지은 것을 눌렀을 때 뜨는 작은 카드 ----------
   건축 패널을 열지 않고, 누른 건물 바로 위에 이름·한 줄 상태와 버튼 몇 개만 띄운다 (화면을 덜 가리게).
   · 첫 줄 버튼: 옮기기·돌리기, 그때 필요한 일(길 잇기·되돌리기·수리), '⋯'(나머지 펼치기)
   · 펼치면: 효과, 레벨 투자, 옮기기·돌리기, 철거
   · 철거는 두 번 눌러야 한다 (작은 카드에서 잘못 눌러도 바로 사라지지 않게)
   지도 빈 곳을 누르거나 Esc를 누르면 닫힌다. 버튼 동작은 패널과 같은 onPanel로 처리한다. */
var scHtml='',scKey='',scMore=false,scArm=0;
// 땅 카드: 교회 부지 안의 빈 땅(바닥이 깔렸든 아니든) 한 칸
function selFloorOk(){var f=UI.selFloor;if(!f||f.x<0||f.y<0||f.x>=COLS||f.y>=PZ)return false;var sl=floorSlot(f.x,f.y,f.pid);return !!sl&&!sl.busy&&!piecesAt(f.x,f.y).some(function(p){return !p.s&&p.l===th(f.x,f.y);});}
function selCardOn(){return UI.fold&&!isPlacing()&&!S.over&&!!((UI.sel&&bById(UI.sel))||(UI.selPiece&&pieceById(UI.selPiece))||selFloorOk());}
function scBtn(act,label,cls,v,aria){return '<button class="btn sm'+(cls?' '+cls:'')+'" data-act="'+act+'"'+(v!=null?' data-v="'+v+'"':'')+(aria?' aria-label="'+aria+'"':'')+'>'+label+'</button>';}
function scDem(label,cost){
  var armed=performance.now()<scArm;
  return scBtn('scdem',armed?'정말 철거? +'+fmtS(cost):label+' +'+fmtS(cost),'bad');
}
function renderSelCard(){
  var el=$('#selCard');if(!el)return;
  var on=selCardOn();
  el.hidden=!on;
  if(!on){scHtml='';scKey='';return;}
  var key=UI.sel?'b'+UI.sel:(UI.selPiece?'p'+UI.selPiece:'f'+UI.selFloor.x+','+UI.selFloor.y);
  if(key!==scKey){scKey=key;scMore=false;scArm=0;}
  var h='',row='',more='';
  if(UI.sel){
    var b=bById(UI.sel),bd=defOf(b);
    var sub=[],md=bMode(bd);
    if(bd.cap)sub.push((md==='batch'?(b.run>0?'가동 중 ':'모이는 중 '):'이용 ')+b.inUse+'/'+bCap(b)+'명');
    if(b.door&&bd.cap)sub.push((md==='batch'?'가동 ':'회전 ')+rotTime(b).toFixed(1)+'초');
    if(maintainable(b))sub.push('상태 '+Math.round(condOf(b))+'%'+(wearStage(b)?' · 효율 '+Math.round(condFactor(b)*100)+'%':''));
    var warn='',mr=mgrRole(b),mw=mgrOf(b);
    if(b.fixed)sub.push('👤 담임목사');else if(mr&&mw)sub.push('👤 '+mw.name);
    if(b.door&&!usable(b))warn='문 앞까지 길이 없어 이용 못 해요';
    else if(mr&&!staffed(b))warn='👤 관리자 필요 · '+MGR_ROLE[mr].who+' 배치해야 가동해요';
    else if(wearStage(b)>=2)warn=WEAR_NAME[wearStage(b)]+' · 낡아서 효율이 '+Math.round(condFactor(b)*100)+'%로 줄었어요';
    var lvTag=hasLv(b)?'<i class="blv">Lv '+bLv(b)+'</i>'+(bd.tier===2?'<i class="btr">상위</i>':''):'';
    h='<div class="sct"><b>'+bd.name+'</b>'+lvTag+(sub.length?'<span>'+sub.join(' · ')+'</span>':'')+'</div>'+(warn?'<div class="scw">'+warn+'</div>':'');
    // 레벨 올리기: 투자 게이지와 버튼
    if(hasLv(b)&&bLv(b)<BLV_MAX){
      var iw=investWhy(b);
      h+='<div class="sclv"><span class="bar"><i style="width:'+Math.round((b.bx||0)/BLV_XP*100)+'%"></i></span><span>Lv '+(bLv(b)+1)+'까지 '+(b.bx||0)+'/'+BLV_XP+'</span></div>';
      row+=scBtn('invest','투자 '+fmtS(investCost(b)),iw?'':'pri',null,'레벨 올리기 투자 '+fmtS(investCost(b)));
      if(bLv(b)<BLV_MAX-1)row+=scBtn('invest10','×10',iw?'':'',null,'자금이 되는 만큼 최대 10레벨 투자');
    }
    if(mr&&!S.freeMgr)row+=scBtn('mgr',mw?'👤 관리자':'👤 관리자 필요',mw?'':'pri',null,mw?'관리자 바꾸기':'관리자 배치·청빙');
    if(canMove(b))row+=scBtn('move',turnable(D[b.def])?'옮기기·돌리기':'옮기기','pri');
    var lp=b.door&&!usable(b)?linkPlan(b):null,lk=lp&&!lp.why&&lp.tiles.length>0;
    // 길을 이을 수 없으면 이유를 보여 주고, 이을 수 있는 쪽으로 문을 옮기는 버튼을 낸다
    if(lp&&lp.why){h=h.replace('<div class="scw">'+warn+'</div>','<div class="scw">'+lp.why+'</div>');}
    if(lk)row+=scBtn('link','길 잇기 · '+lp.tiles.length+'칸','pri',null,'입구까지 길 잇기: 바닥 종류 고르기');
    var lb=UI.lastBuilt;if(canUnbuild(lb)&&lb.bid===b.id)row+=scBtn('undoLast','되돌리기 +'+fmtS(lb.cost));
    if(maintainable(b)&&condOf(b)<100)row+=scBtn('repair','수리 '+fmtS(repairCost(b)));
    // 길 잇기를 누르면: 어떤 바닥으로 이을지 고르는 줄 (칸 수 × 한 칸 값)
    // 펼친 줄
    var eff=effText(bd);if(eff)more+='<div class="sce">'+eff+'</div>';
    var mb='';
    if(!b.fixed)mb+=scDem('철거',bd.cost*0.5);
    more+='<div class="scb">'+mb+'</div>';
  }else if(UI.selPiece){
    var p=pieceById(UI.selPiece),dk=isDeckPiece(p)&&!deckCovered(p);
    h='<div class="sct"><b>'+pieceName(p)+(p.f&&D[p.f]?' · '+D[p.f].name:'')+'</b><span>높이 '+p.l+(p.s?'→'+(p.l+1):'')+'</span></div>';
    // 데크에는 바닥 타일을 바로 깔거나 바꿀 수 있다
    if(dk)row+=scBtn('choose',p.f?'바닥 바꾸기':'바닥 깔기','pri','fswap','이 데크에 깔 바닥 고르기');
    if(dk&&p.f)row+=scBtn('fswap','바닥 걷기 +'+fmtS(Math.floor(D[p.f].cost*.5)),'','f_erase');
    row+=scDem('철거',pieceCost(p)*0.5);
  }else if(isWater(UI.selFloor.x,UI.selFloor.y)){
    // 물: 다리 놓기·물 분수·물 빼기
    var wf=UI.selFloor,wn=poolCells(wf.x,wf.y).filter(function(q){return isWater(q.x,q.y);}).length;
    h='<div class="sct"><b>물</b><span>'+wn+'칸 · 다리로 건너요</span></div>';
    row+=scBtn('wbridge','다리 놓기','pri',null,'이 칸에 땅 높이의 아치 다리 놓기')+scBtn('wfount','물 분수 '+fmtS(D.wfount.cost),'',null,'이 칸에 물 분수 놓기');
  }else{
    // 빈 땅·바닥 칸: 바닥 깔기·바꾸기 (땅 높이기·낮추기·경사로·물 채우기/빼기는 없다 — 지형은 시작 지도로만 정해진다)
    var sf=UI.selFloor,cur=floorSlot(sf.x,sf.y,sf.pid).get(),gh=th(sf.x,sf.y);
    h='<div class="sct"><b>'+(cur?D[cur].name:(isRamp(sf.x,sf.y)?'흙 경사로':'빈 땅'))+'</b><span>'+(gh?lvName(gh)+' · ':'')+(cur?'바꾸면 걷어낸 값의 반을 빼고 계산해요':'바닥을 깔면 걸을 수 있어요')+'</span></div>';
    row+=scBtn('choose',cur?'바닥 바꾸기':'바닥 깔기','pri','fswap','이 칸에 깔 바닥 고르기');
    // 벽이 있는 칸: 옆면 타일로 바꿔 고를 수 있다 (줄은 하나만 보인다)
    var face=cellHasFace(sf.x,sf.y);
    if(face)row+=scBtn('choose','벽 타일','','wswap','이 칸에 맞닿은 옆면(벽) 타일 고르기');
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
function closeSelCard(){UI.sel=null;UI.selPiece=null;UI.selFloor=null;renderSelCard();}
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
