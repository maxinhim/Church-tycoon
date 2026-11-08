'use strict';
/* ---------- 건축 ---------- */
function canPlace(d,x,y,face){
  var dm=faceDims(d,face);
  if(x<0||y<0||x+dm.w>COLS||y+dm.h>ROWS-1)return false;
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
  if(id==='mroom')return placeTile(x,y);
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
  V.forEach(function(v){if(v.inside===id){v.inside=0;v.state='idle';v.t=0.2;}if(v.target===id){v.target=0;if(v.state!=='leave'&&v.state!=='inside'){v.state='idle';v.t=0.2;}}});
}
