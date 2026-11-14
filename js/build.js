'use strict';
/* ---------- 건축 ---------- */
// 구역 규칙: 주차장은 주차 구역에만, 주차 구역에는 주차장만. 입구로 가는 보도(ENT 열)는 비워 둔다
function zoneWhy(d,x,y,face){
  var dm=faceDims(d,face),lot=d.kind==='lot'||d.id==='parktower';
  if(x<0||y<0||x+dm.w>COLS||y+dm.h>ROWS-RD)return '부지 밖이에요';
  for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++){
    var z=zoneOf(y+j);
    if(lot&&z!=='park')return '주차장은 도로 옆 주차 구역에만 지을 수 있어요';
    if(!lot&&z==='park')return '주차 구역에는 주차장만 지을 수 있어요';
    if(z==='park'&&isEnt(x+i))return '교회 입구로 가는 보도는 비워 둬야 해요';
  }
  return '';
}
// 높인 땅·데크 위에도 지을 수 있다: 모든 칸이 같은 높이의 평평한 바닥이어야 한다 (deck.js placeLevel)
function levelWhy(d,x,y,face){return placeLevel(d,x,y,face).why||'';}
function canPlace(d,x,y,face){
  var dm=faceDims(d,face),me=movingId();
  if(zoneWhy(d,x,y,face)||levelWhy(d,x,y,face))return false;
  for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++){var o=occ[y+j][x+i];if(o&&o!==me)return false;}
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
  if(D[id]&&D[id].kind==='floor')return !paintFloor(x,y,id);
  var d=D[id];if(face==null)face=2;
  if(S.money<d.cost||!canPlace(d,x,y,face)||tierWhy(id)||d.retired||d.hidden||propCutWhy(d,x,y))return false;
  S.money-=d.cost;
  var nb={id:S.nextId++,def:id,x:x,y:y,face:face,inUse:0,uses:0,bw:S.week};setPlaceLevel(nb,d,x,y,face);
  S.buildings.push(nb);addFresh(d.beauty);noteNew();
  rebuildOcc();bump();recalc();
  save();return true;
}
function demolish(id){
  var b=bById(id);if(!b||b.fixed)return;
  var d=defOf(b);
  S.money+=Math.floor(d.cost*0.5);
  S.buildings=S.buildings.filter(function(x){return x.id!==id;});
  releaseVisitors(id);
  rebuildOcc();bump();recalc();save();
}
function releaseVisitors(id){
  V.forEach(function(v){
    if(v.inside===id){v.inside=0;v.state='idle';v.t=0.2;}if(v.target===id){v.target=0;if(v.state!=='leave'&&v.state!=='inside'){v.state='idle';v.t=0.2;}}});
}

function structureChanged(){rebuildOcc();bump();recalc();save();}
