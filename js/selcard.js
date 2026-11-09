'use strict';
/* ---------- 지은 것을 눌렀을 때 뜨는 작은 카드 ----------
   건축 패널을 열지 않고, 누른 건물 바로 위에 이름·한 줄 상태와 버튼 몇 개만 띄운다 (화면을 덜 가리게).
   · 첫 줄 버튼: 옮기기·돌리기, 그때 필요한 일(길 잇기·되돌리기·수리), '⋯'(나머지 펼치기)
   · 펼치면: 효과, 층 올리기·내리기, 입구·출구 옮기기, 칸 철거, 철거
   · 철거는 두 번 눌러야 한다 (작은 카드에서 잘못 눌러도 바로 사라지지 않게)
   지도 빈 곳을 누르거나 Esc를 누르면 닫힌다. 버튼 동작은 패널과 같은 onPanel로 처리한다. */
var scHtml='',scKey='',scMore=false,scArm=0;
function selCardOn(){return UI.fold&&!isPlacing()&&!S.over&&!!((UI.sel&&bById(UI.sel))||(UI.selPiece&&pieceById(UI.selPiece)));}
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
  var key=UI.sel?'b'+UI.sel:'p'+UI.selPiece;
  if(key!==scKey){scKey=key;scMore=false;scArm=0;}
  var h='',row='',more='';
  if(UI.sel){
    var b=bById(UI.sel),bd=defOf(b),fl=b.floors||1,st=isRoom(b)&&UI.selTile&&tileOf(b,UI.selTile.x,UI.selTile.y);
    var sub=[];
    if(bd.cap)sub.push('이용 '+b.inUse+'/'+bd.cap+'명');
    if(maintainable(b))sub.push('상태 '+Math.round(condOf(b))+'%');
    var warn='';
    if(b.door&&!usable(b))warn=!b.acc||!b.acc.ent?'입구까지 길이 없어 이용 못 해요':'출구에서 나갈 길이 없어요';
    else if(maintainable(b)&&condOf(b)<60)warn='낡아서 효과가 줄었어요';
    h='<div class="sct"><b>'+bd.name+(fl>1?' · '+fl+'층':'')+'</b>'+(sub.length?'<span>'+sub.join(' · ')+'</span>':'')+'</div>'+(warn?'<div class="scw">'+warn+'</div>':'');
    if(canMove(b))row+=scBtn('move','옮기기·돌리기','pri');
    if(b.door&&!usable(b)){var lp=linkPlan(b);if(!lp.why&&lp.tiles.length)row+=scBtn('link','길 잇기 '+fmt(lp.cost),'pri');}
    var lb=UI.lastBuilt;if(canUnbuild(lb)&&lb.bid===b.id)row+=scBtn('undoLast','되돌리기 +'+fmt(lb.cost));
    if(maintainable(b)&&condOf(b)<100)row+=scBtn('repair','수리 '+fmt(repairCost(b)));
    // 펼친 줄
    var eff=effText(bd);if(eff)more+='<div class="sce">'+eff+'</div>';
    if(b.door)more+='<div class="scd"><span>입구</span>'+scBtn('door','◀','','ent:-1','입구를 이전 자리로')+scBtn('door','▶','','ent:1','입구를 다음 자리로')+
      '<span>출구</span>'+scBtn('door','◀','','ext:-1','출구를 이전 자리로')+scBtn('door','▶','','ext:1','출구를 다음 자리로')+'</div>';
    var mb='';
    if(canStack(b)){if(fl<MAXF)mb+=scBtn('floorup','층 올리기 '+fmt(floorCostOf(b)));if(fl>1)mb+=scBtn('floordown','위층 철거 +'+fmt(floorCostOf(b)*0.5));}
    if(st)mb+=scBtn('demtile',(st.f>1?'이 칸 '+st.f+'층':'이 칸')+' 철거 +'+fmt((st.f>1?MROOM.floorCost:D[b.def].cost)*0.5));
    mb+=scDem(isRoom(b)?'전체 철거':'철거',bd.cost*0.5);
    more+='<div class="scb">'+mb+'</div>';
  }else{
    var p=pieceById(UI.selPiece),sw=p.k==='sky'&&NAV.badSky[p.id];
    h='<div class="sct"><b>'+pieceName(p)+'</b><span>높이 '+p.l+(p.s?'→'+(p.l+1):'')+'</span></div>'+(sw?'<div class="scw">역할이 다른 건물을 이어 방문자가 건너지 않아요</div>':'');
    row+=scDem('철거',pieceCost(p)*0.5);
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
  if(UI.sel){var b=bById(UI.sel),dm=bDims(b),m=rotPt(b.x+dm.w/2,b.y+dm.h/2);top=toScreen(m[0],m[1],bHeight(b)+.3);var bot=toScreen(m[0],m[1],0);}
  else{var p=pieceById(UI.selPiece),mp=rotPt(p.x+.5,p.y+.5);top=toScreen(mp[0],mp[1],p.l*LV+.5);bot=toScreen(mp[0],mp[1],p.l*LV);}
  var vw=window.innerWidth,vh=window.innerHeight,w=el.offsetWidth,h=el.offsetHeight,tb=$('#top').getBoundingClientRect().bottom+8,below=top[1]-h-10<tb;
  x=clamp(top[0],w/2+8,vw-w/2-8);
  y=below?clamp(bot[1]+16,tb,vh-h-8):clamp(top[1]-h-10,tb,vh-h-8);
  el.classList.toggle('below',below);
  el.style.setProperty('--ax',Math.round(clamp(top[0]-(x-w/2),14,w-14))+'px');
  el.style.transform='translate('+Math.round(x-w/2)+'px,'+Math.round(y)+'px)';
}
function closeSelCard(){UI.sel=null;UI.selPiece=null;UI.selTile=null;renderSelCard();}
function setupSelCard(){
  var el=$('#selCard');
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b)return;
    var a=b.dataset.act;
    if(a==='scmore'){scMore=!scMore;renderSelCard();return;}
    if(a==='scdem'){
      // 두 번 눌러야 철거 (3초 안에)
      if(performance.now()>=scArm){scArm=performance.now()+3000;renderSelCard();return;}
      scArm=0;b.dataset.act=UI.sel?'demolish':'dempiece';onPanel(e);b.dataset.act='scdem';renderSelCard();return;
    }
    onPanel(e);renderSelCard();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!el.hidden)closeSelCard();});
}
