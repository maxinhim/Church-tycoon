'use strict';
/* ---------- 상태 ---------- */
var S,A,occ,V=[],F=[],ctx,cv,DPR=1,VW=0,VH=0;
var UI={tab:'build',cat:'worship',tool:null,ghost:null,sel:null,selTile:null,undo:[],face:2,pc:null,selPiece:null,speed:1,fold:true,confirmNew:false,minisTab:'events'};
var DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

// 시작 상태. 처음엔 입구 앞 일부 땅(S.land)만 가지고 시작하고, 나머지는 부지를 사서 넓힌다
var START_TREES=[[10,20],[21,21],[11,28],[20,27],[17,22],[3,4],[6,13],[26,6],[29,16],[4,25],[28,27],[13,9],[19,3],[8,2],[24,12],[2,18],[30,22]];
function newState(dk){
  dk=DIFF[dk]?dk:'normal';
  var bs=[{id:1,def:'room',x:14,y:26,face:2,inUse:0,uses:0}];
  START_TREES.forEach(function(t,i){bs.push({id:i+2,def:'tree',x:t[0],y:t[1],inUse:0,uses:0});});
  return {name:'새빛교회',diff:dk,money:DIFF[dk].money,members:6,rep:30,week:0,t:0,clock:0,
    buildings:bs,nextId:bs.length+1,paths:[],nextPid:1,floor:{},land:landStart(),landLv:0,
    staff:{evang:0,praise:0,care:0,newcomer:0,edu:0,prayer:0,admin:0,media:0,mission:0},
    assoc:[],cands:[],candWeek:-99,off:{deacon:0,kwonsa:0,elder:0},stam:100,tempMood:0,restCd:0,ev:{},newSinceBap:0,posWeeks:0,lastEv:0,dlg:null,dlgB:0,
    mood:70,cov:{seat:1,fel:1,care:1,comf:1,park:1,past:1},
    hist:[],log:[],goal:0,over:false,evt:null,evtLeft:0,weekInc:0,spawnAcc:0,visitsWeek:0,joinedWeek:0};
}
function bById(id){for(var i=0;i<S.buildings.length;i++)if(S.buildings[i].id===id)return S.buildings[i];return null;}
function rebuildOcc(){
  occ=[];for(var y=0;y<ROWS;y++){occ.push(new Array(COLS).fill(0));}
  S.buildings.forEach(function(b){
    if(isRoom(b)){b.tiles.forEach(function(t){occ[t.y][t.x]=b.id;});return;}
    var d=bDims(b);for(var j=0;j<d.h;j++)for(var i=0;i<d.w;i++)occ[b.y+j][b.x+i]=b.id;
  });

}
function agg(){
  var a={seats:0,fcap:0,ccap:0,kcap:0,park:0,beauty:0,vis:0,up:0,rep:0};
  // 낡은 건물(상태 60% 미만)은 수용 효과가 줄어든다
  S.buildings.forEach(function(b){var d=defOf(b),k=condFactor(b);a.seats+=d.seats*k;a.fcap+=d.fcap*k;a.ccap+=d.ccap*k;a.kcap+=d.kcap*k;a.park+=d.park*k;a.beauty+=d.beauty;a.vis+=d.vis;a.up+=d.up*(maintainable(b)?1+0.6*(100-condOf(b))/100:1);a.rep+=d.rep;});
  ['seats','fcap','ccap','kcap','park'].forEach(function(k){a[k]=Math.round(a[k]);});
  for(var fk in S.floor){var fd=D[S.floor[fk]];if(fd)a.beauty+=fd.beauty||0;}
  return a;
}
function calcMood(){
  var m=Math.max(1,S.members);
  var cov=function(have,need){return Math.min(1,have/Math.max(1,need));};
  // past: 목양 — 담임·부교역자·직분자가 돌볼 수 있는 성도 수(MOD.cap) 대비
  var seat=cov(A.seats,m),fel=cov(A.fcap+3,m*0.55),care=cov(A.kcap+2,m*0.3),comf=cov(A.ccap+3,m*0.25),park=cov(A.park+3,m*0.35),past=cov(MOD.cap,m);
  var mood=100*(0.26*seat+0.16*fel+0.12*care+0.1*comf+0.14*park+0.22*past)+Math.min(8,A.beauty*0.8)+MOD.mood;
  return {mood:clamp(mood,0,100),seat:seat,fel:fel,care:care,comf:comf,park:park,past:past};
}
function recalc(){refreshNav();refreshMods();A=agg();var m=calcMood();S.mood=m.mood;S.cov=m;}
