'use strict';
/* ---------- 상태 ---------- */
var S,A,occ,V=[],F=[],ctx,cv,DPR=1,VW=0,VH=0;
var UI={tab:'build',cat:'worship',tool:null,ghost:null,sel:null,selTile:null,undo:[],face:2,pc:null,selPiece:null,speed:1,fold:true,confirmNew:false,minisTab:'events',statusTab:'status',lastBuilt:null,fdir:null,moving:null,tlv:1};
var DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

/* 시작 상태: 교회 문은 닫혀 있다. 첫 예배실과, 교회 입구에서 예배실 앞까지 보도블록이 깔려 있다.
   방문자는 바닥·길 위로만 다니므로 새 건물은 입구까지 바닥을 이어야 쓸 수 있다 */
var START_TREES=[[10,20],[21,21],[18,22],[3,4],[6,13],[26,6],[29,16],[4,25],[13,9],[19,3],[8,2],[24,12],[2,18],[30,22],[11,25],[20,25]];
var START_FLOOR=[[15,26],[15,25],[14,24],[15,24],[16,24]];
function newState(dk){
  dk=DIFF[dk]?dk:'normal';
  var bs=[{id:1,def:'room',x:14,y:22,face:2,inUse:0,uses:0}],fl={};
  START_TREES.forEach(function(t,i){bs.push({id:i+2,def:'tree',x:t[0],y:t[1],inUse:0,uses:0});});
  START_FLOOR.forEach(function(t){fl[t[0]+','+t[1]]='f_block';});
  return {name:'새빛교회',diff:dk,money:DIFF[dk].money,members:6,rep:30,week:0,t:0,clock:0,open:false,loans:[],wx:{cur:'sun',next:'cloud',day:0,clear:0,snow:0,wet:0,bow:0,hits:0,lt:6,xmas:-1},rcpt:null,weekShop:0,weekSup:0,weekGive:0,memAcc:0,
    buildings:bs,nextId:bs.length+1,paths:[],nextPid:1,floor:fl,hgt:{},slp:{},
    staff:{evang:0,praise:0,care:0,newcomer:0,edu:0,prayer:0,admin:0,media:0,mission:0},
    assoc:[],cands:[],candWeek:-99,off:{deacon:0,kwonsa:0,elder:0},tempMood:0,ev:{},newSinceBap:0,posWeeks:0,lastEv:0,dlg:null,dlgB:0,
    mood:70,cov:{seat:1,spirit:1,fel:1,care:1,comf:1,park:1,past:1},
    hist:[],log:[],goal:0,over:false,evt:null,evtLeft:0,weekInc:0,spawnAcc:0,visitsWeek:0,joinedWeek:0,
    grip:{},gripB:{},gripN:0,gripL:{},gripBL:{},gripNL:0,gripPen:0,fresh:0,evW:{}};
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
  S.paths.forEach(function(p){var pd=p.f&&D[p.f];if(pd)a.beauty+=pd.beauty||0;});
  return a;
}
// 만족도 비중 (합 1): 영성이 가장 크다
var MW={seat:.2,spirit:.25,past:.17,fel:.12,park:.1,care:.09,comf:.07};
function calcMood(){
  var m=Math.max(1,S.members);
  var cov=function(have,need){return Math.min(1,have/Math.max(1,need));};
  // past: 목양 — 담임·부교역자·직분자가 돌볼 수 있는 성도 수(MOD.cap) 대비
  // 성도가 늘수록 기대치가 올라 교제·돌봄·편의·주차 필요가 더 빨리 는다 (300명이면 1.6배)
  var E=expectK(m),sp=spiritParts();
  var seat=cov(A.seats,m),fel=cov(A.fcap+3,m*0.55*E),care=cov(A.kcap+2,m*0.3*E),comf=cov(A.ccap+3,m*0.25*E),park=cov(A.park+3,m*0.35*E),past=cov(MOD.cap,m);
  var mood=100*(MW.seat*seat+MW.spirit*sp.v+MW.past*past+MW.fel*fel+MW.park*park+MW.care*care+MW.comf*comf)+beautyBonus()+MOD.mood;
  return {mood:clamp(mood,0,100),seat:seat,spirit:sp.v,fel:fel,care:care,comf:comf,park:park,past:past,E:E};
}
function recalc(){refreshNav();refreshMods();A=agg();rebuildDecor();var m=calcMood();S.mood=m.mood;S.cov=m;}
