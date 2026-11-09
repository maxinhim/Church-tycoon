'use strict';
/* ---------- 건축 ---------- */
// 구역 규칙: 주차장은 주차 구역에만, 주차 구역에는 주차장만. 입구로 가는 보도(ENT 열)는 비워 둔다
function zoneWhy(d,x,y,face){
  var dm=faceDims(d,face),lot=d.kind==='lot'||d.id==='parktower';
  if(x<0||y<0||x+dm.w>COLS||y+dm.h>ROWS-1)return '부지 밖이에요';
  for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++){
    var z=zoneOf(y+j);
    if(lot&&z!=='park')return '주차장은 도로 옆 주차 구역에만 지을 수 있어요';
    if(!lot&&z==='park')return '주차 구역에는 주차장만 지을 수 있어요';
    if(z==='park'&&x+i===ENT)return '교회 입구로 가는 보도는 비워 둬야 해요';
  }
  return '';
}
function canPlace(d,x,y,face){
  var dm=faceDims(d,face);
  if(zoneWhy(d,x,y,face))return false;
  for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++)if(occ[y+j][x+i]||piecesAt(x+i,y+j).length)return false;
  return true;
}
function bump(){
  // 서 있던 칸이 막히거나 길이 사라진 방문자는 입구 아치로 돌려보낸다
  V.forEach(function(v){
    if(v.state==='inside')return;
    if(!nodeOk(v.node)){placeAt(v,gateNode());v.state='idle';v.t=0.2;v.target=0;}
  });
}
function build(id,x,y,face){
  if(isRoomDef(id))return placeTile(x,y,id);
  if(D[id]&&D[id].kind==='floor')return !paintFloor(x,y,id);
  var d=D[id];if(face==null)face=2;
  if(S.money<d.cost||!canPlace(d,x,y,face))return false;
  S.money-=d.cost;
  S.buildings.push({id:S.nextId++,def:id,x:x,y:y,face:face,inUse:0,uses:0});
  rebuildOcc();bump();recalc();save();return true;
}
function demolish(id){
  var b=bById(id);if(!b)return;
  var d=defOf(b);
  S.money+=Math.floor(d.cost*0.5);
  S.buildings=S.buildings.filter(function(x){return x.id!==id;});
  releaseVisitors(id);
  rebuildOcc();bump();recalc();save();
}
function releaseVisitors(id){
  V.forEach(function(v){
    if(v.state==='xfer'&&v.target===id){placeAt(v,gateNode());v.state='idle';v.t=0.2;v.target=0;return;}if(v.inside===id){v.inside=0;v.state='idle';v.t=0.2;}if(v.target===id){v.target=0;if(v.state!=='leave'&&v.state!=='inside'){v.state='idle';v.t=0.2;}}});
}

/* ---------- 완성품 건물 층 올리기 (같은 건물을 위로, 최대 5층) ---------- */
var MAXF=5,STACK_CATS=['worship','fellow','care','comfort'];
function canStack(b){var d=D[b.def];return !!d&&d.kind==='bld'&&STACK_CATS.indexOf(d.cat)>=0;}
function floorCostOf(b){return Math.round(D[b.def].cost*0.75/10)*10;}
function structureChanged(){rebuildOcc();bump();recalc();save();}
function addFloor(b){
  if(!b||!canStack(b))return '층을 올릴 수 없는 건물이에요';
  var f=b.floors||1;if(f>=MAXF)return MAXF+'층까지만 올릴 수 있어요';
  var c=floorCostOf(b);if(S.money<c)return '자금이 부족해요';
  S.money-=c;b.floors=f+1;structureChanged();return '';
}
function removeFloor(b,rate){
  if(!b||(b.floors||1)<=1)return false;
  b.floors--;S.money+=Math.floor(floorCostOf(b)*rate);structureChanged();return true;
}
