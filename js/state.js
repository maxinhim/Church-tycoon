'use strict';
/* ---------- 상태 ---------- */
var S,A,occ,V=[],F=[],ctx,cv,DPR=1,VW=0,VH=0;
var UI={tab:'build',cat:'worship',tool:null,ghost:null,sel:null,selTile:null,undo:[],face:2,pc:null,selPiece:null,speed:1,fold:false,confirmNew:false};
var DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

function newState(){
  return {name:'새빛교회',money:6000,members:6,rep:30,week:0,t:0,clock:0,
    buildings:[{id:1,def:'room',x:6,y:9,inUse:0,uses:0},{id:2,def:'tree',x:2,y:3,inUse:0,uses:0},{id:3,def:'tree',x:12,y:2,inUse:0,uses:0},
      {id:4,def:'tree',x:13,y:11,inUse:0,uses:0},{id:5,def:'tree',x:1,y:12,inUse:0,uses:0},{id:6,def:'tree',x:9,y:5,inUse:0,uses:0}],nextId:7,paths:[],nextPid:1,
    staff:{evang:0,praise:0,care:0},mood:80,cov:{seat:1,fel:1,care:1,comf:1,park:1},
    hist:[],log:[],goal:0,over:false,evt:null,evtLeft:0,weekInc:0,spawnAcc:0,visitsWeek:0,joinedWeek:0};
}
function bById(id){for(var i=0;i<S.buildings.length;i++)if(S.buildings[i].id===id)return S.buildings[i];return null;}
function rebuildOcc(){
  occ=[];for(var y=0;y<ROWS;y++){occ.push(new Array(COLS).fill(0));}
  S.buildings.forEach(function(b){
    if(isRoom(b)){b.tiles.forEach(function(t){occ[t.y][t.x]=b.id;});return;}
    var d=bDims(b);for(var j=0;j<d.h;j++)for(var i=0;i<d.w;i++)occ[b.y+j][b.x+i]=b.id;
  });
  GB=[];for(var gy=0;gy<ROWS;gy++)GB.push(new Array(COLS).fill(0));
  S.paths.forEach(function(p){if(blocksGround(p))GB[p.y][p.x]=1;});
}
function agg(){
  var a={seats:0,fcap:0,ccap:0,kcap:0,park:0,beauty:0,vis:0,up:0,rep:0};
  S.buildings.forEach(function(b){var d=defOf(b);a.seats+=d.seats;a.fcap+=d.fcap;a.ccap+=d.ccap;a.kcap+=d.kcap;a.park+=d.park;a.beauty+=d.beauty;a.vis+=d.vis;a.up+=d.up;a.rep+=d.rep;});
  return a;
}
function calcMood(){
  var m=Math.max(1,S.members);
  var cov=function(have,need){return Math.min(1,have/Math.max(1,need));};
  var seat=cov(A.seats,m),fel=cov(A.fcap+3,m*0.55),care=cov(A.kcap+2,m*0.3),comf=cov(A.ccap+3,m*0.25),park=cov(A.park+3,m*0.35);
  var mood=100*(0.32*seat+0.2*fel+0.16*care+0.12*comf+0.2*park)+Math.min(10,A.beauty*0.9)+S.staff.praise*3+S.staff.care*2;
  return {mood:clamp(mood,0,100),seat:seat,fel:fel,care:care,comf:comf,park:park};
}
function recalc(){refreshNav();A=agg();var m=calcMood();S.mood=m.mood;S.cov=m;}
