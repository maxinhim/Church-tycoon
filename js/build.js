'use strict';
/* ---------- 건축 ---------- */
function canPlace(d,x,y){
  if(x<0||y<0||x+d.w>COLS||y+d.h>ROWS-1)return false;
  for(var j=0;j<d.h;j++)for(var i=0;i<d.w;i++)if(occ[y+j][x+i])return false;
  return true;
}
function bump(){
  V.forEach(function(v){
    var tx=Math.floor(v.x),ty=Math.floor(v.y);
    if(occ[ty]&&occ[ty][tx]&&v.state!=='inside'){v.x=ENT+0.5;v.y=ROWS-0.5;v.state='idle';v.t=0.2;v.target=0;}
  });
}
function build(id,x,y){
  var d=D[id];
  if(S.money<d.cost||!canPlace(d,x,y))return false;
  S.money-=d.cost;
  S.buildings.push({id:S.nextId++,def:id,x:x,y:y,inUse:0,uses:0});
  rebuildOcc();bump();recalc();save();return true;
}
function demolish(id){
  var b=bById(id);if(!b)return;
  var d=D[b.def];
  S.money+=Math.floor(d.cost*0.5);
  S.buildings=S.buildings.filter(function(x){return x.id!==id;});
  V.forEach(function(v){if(v.inside===id){v.inside=0;v.state='idle';v.t=0.2;}if(v.target===id){v.target=0;if(v.state!=='leave'&&v.state!=='inside'){v.state='idle';v.t=0.2;}}});
  rebuildOcc();bump();recalc();save();
}
