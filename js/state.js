'use strict';
/* ---------- 상태 ---------- */
var S,A,occ,V=[],F=[],ctx,cv,DPR=1,VW=0,VH=0;
var UI={tab:'build',cat:'worship',tool:null,ghost:null,sel:null,selTile:null,undo:[],face:2,pc:null,selPiece:null,speed:1,fold:true,confirmNew:false,minisTab:'events',statusTab:'status',lastBuilt:null,fdir:null,moving:null,tlv:1};
var DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

/* 시작 상태: 교회 문은 닫혀 있다. 첫 예배실과, 교회 입구에서 예배실 앞까지 보도블록이 깔려 있다.
   방문자는 바닥·길 위로만 다니므로 새 건물은 입구까지 바닥을 이어야 쓸 수 있다 */
var START_TREES=[[10,20],[21,21],[18,22],[3,4],[6,13],[26,6],[29,16],[4,25],[13,9],[19,3],[8,2],[24,12],[2,18],[30,22],[11,25],[20,25]];
var START_FLOOR=[[15,26],[15,25],[14,24],[15,24],[16,24]];
/* 시작 지형: 지형 기능이 있다는 것이 한눈에 보이게 언덕 둘, 물이 찬 연못 하나, 마른 도랑 하나를 둔다.
   교회·입구 길·시작 나무와 겹치지 않는 자리. 테스트(__CT_TEST)에서는 평지로 시작한다(__CT_TERRAIN을 켜면 지형 포함) */
function startTerrain(){
  var hgt={},slp={},water={},x,y,r;
  if(typeof window!=='undefined'&&window.__CT_TEST&&!window.__CT_TERRAIN)return {hgt:hgt,slp:slp,water:water};
  // 왼쪽 위 언덕 (2층, 남쪽에서 경사로 두 칸으로 오른다)
  for(y=9;y<=19;y++)for(x=9;x<=19;x++){r=Math.hypot(x-14,y-14);if(r<=2.6)hgt[x+','+y]=2;else if(r<=4.6)hgt[x+','+y]=1;}
  slp['14,19']=3;slp['14,17']=3;hgt['14,17']=1;
  // 오른쪽 낮은 둔덕
  for(y=33;y<=39;y++)for(x=47;x<=53;x++){if(Math.hypot(x-50,y-36)<=2.6)hgt[x+','+y]=1;}
  slp['50,39']=3;
  // 왼쪽 아래 연못 (물이 차 있다)
  for(y=37;y<=43;y++)for(x=7;x<=13;x++){r=Math.hypot(x-10,y-40);if(r<=1.3)hgt[x+','+y]=-2;else if(r<=2.7)hgt[x+','+y]=-1;if(r<=2.7)water[x+','+y]=1;}
  // 위쪽 마른 도랑
  for(x=44;x<=57;x++){hgt[x+',8']=-1;hgt[x+',9']=-1;}
  return {hgt:hgt,slp:slp,water:water};
}
function newState(dk){
  dk=DIFF[dk]?dk:'normal';
  var bs=[{id:1,def:'room',x:14*G,y:22*G,face:2,inUse:0,uses:0}],fl={};
  START_TREES.forEach(function(t,i){bs.push({id:i+2,def:'tree',x:t[0]*G,y:t[1]*G,inUse:0,uses:0});});
  // 첫 예배실의 입구·출구 (앞쪽 보도 위)
  bs.push({id:bs.length+1,def:'g_arch',x:30,y:48,face:2,of:1,inUse:0,uses:0});
  bs.push({id:bs.length+1,def:'x_arch',x:28,y:48,face:2,of:1,inUse:0,uses:0});
  // 예전 칸 좌표로 적어 둔 시작 바닥: 한 칸마다 G×G칸을 깐다
  START_FLOOR.forEach(function(t){for(var j=0;j<G;j++)for(var i=0;i<G;i++)fl[(t[0]*G+i)+','+(t[1]*G+j)]='f_block';});
  var st=startTerrain();
  return {name:'새빛교회',diff:dk,money:DIFF[dk].money,members:6,rep:30,week:0,t:0,clock:0,open:false,loans:[],wx:{cur:'sun',next:'cloud',day:0,clear:0,snow:0,wet:0,bow:0,hits:0,lt:6,xmas:-1},rcpt:null,weekShop:0,weekSup:0,weekGive:0,memAcc:0,
    buildings:bs,nextId:bs.length+1,paths:[],nextPid:1,floor:fl,hgt:st.hgt,slp:st.slp,water:st.water,wall:{},qprev:{},
    staff:{evang:0,praise:0,care:0,newcomer:0,edu:0,prayer:0,admin:0,media:0,mission:0},
    assoc:[],cands:[],candWeek:-99,off:{deacon:0,kwonsa:0,elder:0,cstaff:0},tempMood:0,ev:{},newSinceBap:0,posWeeks:0,lastEv:0,dlg:null,dlgB:0,
    mood:70,cov:{seat:1,spirit:1,fel:1,care:1,comf:1,park:1,past:1},
    hist:[],log:[],over:false,evt:null,evtLeft:0,weekInc:0,spawnAcc:0,visitsWeek:0,joinedWeek:0,
    grip:{},gripB:{},gripN:0,gripL:{},gripBL:{},gripNL:0,gripPen:0,fresh:0,evW:{communion:-2},lvl:null,
    wish:null,wishNext:null,wishMood:0,wishLeft:0,wishOk:0,wishFail:0,wishRan:null,lastNew:0,lastEvId:null,lvc:3,qd:{},qb:{},qxp:0,tv:0,il:{},ind:null,careDone:0,cares:[],careId:1};
}
function bById(id){for(var i=0;i<S.buildings.length;i++)if(S.buildings[i].id===id)return S.buildings[i];return null;}
function rebuildOcc(){
  occ=[];for(var y=0;y<ROWS;y++){occ.push(new Array(COLS).fill(0));}
  S.buildings.forEach(function(b){
    if(isRoom(b)){b.tiles.forEach(function(t){occ[t.y][t.x]=b.id;});return;}
    var d=bDims(b);for(var j=0;j<d.h;j++)for(var i=0;i<d.w;i++)occ[b.y+j][b.x+i]=b.id;
  });
  rebuildDeck();

}
function agg(){
  var a={seats:0,fcap:0,ccap:0,kcap:0,park:0,beauty:0,vis:0,up:0,rep:0};
  // 낡은 건물(상태 60% 미만)은 수용 효과가 줄어든다
  S.buildings.forEach(function(b){var d=defOf(b),k=condFactor(b);a.seats+=d.seats*k;a.fcap+=d.fcap*k;a.ccap+=d.ccap*k;a.kcap+=d.kcap*k;a.park+=d.park*k;a.beauty+=d.beauty;a.vis+=d.vis;a.up+=d.up*(maintainable(b)?1+0.6*(100-condOf(b))/100:1);a.rep+=d.rep;});
  ['seats','fcap','ccap','kcap','park'].forEach(function(k){a[k]=Math.round(a[k]);});
  for(var fk in S.floor){var fd=D[S.floor[fk]];if(fd)a.beauty+=fd.beauty||0;}
  S.paths.forEach(function(p){var pd=p.f&&D[p.f];if(pd)a.beauty+=pd.beauty||0;if(PATHK[p.k])a.beauty+=PATHK[p.k].beauty||0;});
  return a;
}
// 만족도 비중 (합 1): 영성이 가장 크다
/* 만족도 항목 = (기본 + 건물 자리 × 0.6) ÷ 필요.  필요 = 바닥(f)과 성도 × 비율(r) × 기대치 중 큰 쪽.
   기본은 바닥의 절반이라 처음엔 항목마다 50% 안팎에서 시작하고, 건물로 채우려면 꽤 많이 지어야 한다.
   좌석(기본 없음, 기대치 없음)은 예배 출석과 따로, 만족도에만 이렇게 계산한다. 목양은 사람(담임·부교역자·직분자)이 채운다 */
function satHave(k){return k==='past'?MOD.cap:({seat:A.seats,fel:A.fcap,care:A.kcap,comf:A.ccap,park:A.park}[k])*BLD_SAT;}
function satInfo(k){
  var s=SAT[k],m=Math.max(1,S.members),E=s.e?expectK(m):1,need=Math.max(s.f,m*s.r*E),have=satHave(k);
  return {have:have,base:s.b,need:need,v:Math.min(1,(s.b+have)/need)};
}
function calcMood(){
  var m=Math.max(1,S.members);
  // 성도가 늘고 교회 Level이 오를수록 기대치가 올라 교제·돌봄·편의·주차·영성 필요가 더 빨리 는다
  var E=expectK(m),sp=spiritParts(),q=function(k){return satInfo(k).v;};
  var seat=q('seat'),fel=q('fel'),care=q('care'),comf=q('comf'),park=q('park'),past=q('past');
  // 항목 점수는 최대 85까지만. 나머지 15는 꾸밈·사역팀·행사 같은 보너스로만 채운다 (모자란 항목을 보너스로 덮지 못하게)
  var items=MW.seat*seat+MW.spirit*sp.v+MW.past*past+MW.fel*fel+MW.park*park+MW.care*care+MW.comf*comf;
  // 좋은 보너스(꾸밈·사역팀·권사·행사)는 합쳐서 BONUS_MAX까지만. 나쁜 것(침체·낡음·불편)은 그대로 깎는다
  var pos=beautyBonus(),neg=0;(MOD.parts||[]).forEach(function(p){if(p[1]>0)pos+=p[1];else neg+=p[1];});
  var mood=MOOD_ITEMS*items+Math.min(BONUS_MAX,pos)+neg;
  return {sp:sp,mood:clamp(mood,0,100),items:items,bonus:Math.min(BONUS_MAX,pos),bonusRaw:pos,malus:neg,seat:seat,spirit:sp.v,fel:fel,care:care,comf:comf,park:park,past:past,E:E};
}
function recalc(){syncPeople();refreshNav();fitTalents();refreshMods();A=agg();rebuildDecor();var m=calcMood();S.mood=m.mood;S.cov=m;S.ind=calcInd(m);}
