'use strict';
/* ---------- 칸을 이어 짓는 건물 (역할별) ----------
   1×1 칸을 하나씩 짓는다. 상하좌우로 맞닿은 같은 역할의 칸은 하나의 건물로 합쳐지고,
   지은 칸을 다시 누르면 위층이 올라간다(최대 10층). 칸 하나를 지우면 끊어진 부분은 따로 나뉜다.
   건물 객체: {id, def, x, y, tiles:[{x,y,f}], inUse, uses}  (def는 kind가 'mroom'인 정의, x,y는 칸들의 좌상단)
   정의의 per(칸·층 면적당 수치), fk(채우는 필요), rname(건물 이름)으로 역할별 수치가 정해진다. */
var MROOM={maxF:10,floorCost:250,fh:.9,fill0:40,fillPer:.75,fillMax:66};
var RDC={},PDC={};

function isRoomDef(id){return !!D[id]&&D[id].kind==='mroom';}
function isRoom(b){return !!b&&isRoomDef(b.def);}
function tileOf(b,x,y){for(var i=0;i<b.tiles.length;i++){var t=b.tiles[i];if(t.x===x&&t.y===y)return t;}return null;}
// def를 주면 그 역할의 칸 건물만
function roomAt(x,y,def){
  if(x<0||y<0||x>=COLS||y>=ROWS||!occ[y][x])return null;
  var b=bById(occ[y][x]);return isRoom(b)&&(!def||b.def===def)?b:null;
}
// 위층도 면적에 들어간다: 1층 출입구로 들어와 건물 안에서 위층까지 쓴다
function roomArea(b){var n=0;b.tiles.forEach(function(t){n+=t.f;});return n;}
function roomMaxF(b){var m=0;b.tiles.forEach(function(t){m=Math.max(m,t.f);});return m;}

/* 칸 수·층수에 따라 좌석, 수용 인원, 유지비, 말씀 효과가 정해진다 */
function roomDef(b){
  var key=b.def+':'+b.tiles.map(function(t){return t.x+','+t.y+','+t.f;}).join(';');
  var c=RDC[b.id];if(c&&c.key===key)return c.d;
  var base=D[b.def],n=roomArea(b),x0=COLS,y0=ROWS,x1=0,y1=0,cost=0,d={},k;
  for(k in base)d[k]=base[k];
  b.tiles.forEach(function(t){
    x0=Math.min(x0,t.x);y0=Math.min(y0,t.y);x1=Math.max(x1,t.x);y1=Math.max(y1,t.y);
    cost+=base.cost+(t.f-1)*MROOM.floorCost;
  });
  var mf=roomMaxF(b);
  d.name=base.rname+' ('+b.tiles.length+'칸'+(mf>1?' · '+mf+'층':'')+')';
  d.w=x1-x0+1;d.h=y1-y0+1;d.cost=cost;
  for(k in base.per)d[k]=Math.max(1,Math.round(base.per[k]*n));
  d.fill={};d.fill[base.fk]=Math.round(Math.min(MROOM.fillMax,MROOM.fill0+MROOM.fillPer*n));
  d.desc='칸을 이어 붙여 지은 '+base.rname;
  RDC[b.id]={key:key,d:d};
  return d;
}
function defOf(b){return isRoom(b)?roomDef(b):stackDef(b);}
// 층을 올린 완성품 건물: 층수만큼 좌석·수용 인원·유지비가 늘어난다
function stackDef(b){
  var d=D[b.def],f=b.floors||1;if(f<=1)return d;
  var key=b.def+'|'+f;if(PDC[key])return PDC[key];
  var o={},k;for(k in d)o[k]=d[k];
  ['seats','fcap','ccap','kcap','cap','up','park'].forEach(function(k2){o[k2]=d[k2]*f;});
  o.cost=d.cost+(f-1)*floorCostOf(b);o.name=d.name+' ('+f+'층)';
  return (PDC[key]=o);
}
function roomTop(f){return .05+f*MROOM.fh;}
function prefabTop(b){
  var d=D[b.def],f=b.floors||1;if(f<=1)return heightOf(b.def);
  return Math.max(f*LV+(d.rh||.05),d.towerH?d.towerH+f*LV-d.H+.75:0);
}
function bHeight(b){return isRoom(b)?roomTop(roomMaxF(b)):prefabTop(b);}
function bHeightAt(b,x,y){if(!isRoom(b))return prefabTop(b);var t=tileOf(b,x,y);return t?roomTop(t.f):0;}
// 그 칸에 있는 층수 (연결 다리가 닿을 수 있는지 볼 때)
function bFloorsAt(b,x,y){if(isRoom(b)){var t=tileOf(b,x,y);return t?t.f:0;}return b.floors||1;}
function syncRoomBox(b){
  var x0=COLS,y0=ROWS;b.tiles.forEach(function(t){x0=Math.min(x0,t.x);y0=Math.min(y0,t.y);});
  b.x=x0;b.y=y0;
}
function roomsChanged(){
  S.buildings.forEach(function(b){if(isRoom(b))syncRoomBox(b);});
  rebuildOcc();bump();recalc();
  save();
}

/* 이 칸을 누르면 무슨 일이 생기는지: 새 칸 / 위층 / 불가 */
function tilePlan(x,y,def){
  def=def||'mroom';
  if(x<0||y<0||x>=COLS||y>=ROWS-RD)return {ok:false,why:'부지 밖이에요'};
  if(y>=PZ)return {ok:false,why:'주차 구역에는 주차장만 지을 수 있어요'};
  var r=roomAt(x,y);
  if(r){
    if(r.def!==def)return {ok:false,why:'역할이 다른 칸 위에는 쌓을 수 없어요'};
    if(tileOf(r,x,y).f>=MROOM.maxF-Math.min(0,bLevel(r)))return {ok:false,why:(MROOM.maxF-Math.min(0,bLevel(r)))+'층까지만 올릴 수 있어요'};
    if(bLevel(r)+tileOf(r,x,y).f+1>MAXH)return {ok:false,why:'땅 높이와 합쳐 '+MAXH+'층을 넘을 수 없어요'};
    if(piecesAt(x,y).some(function(p){return p.l>bLevel(r);}))return {ok:false,why:'위에 다리·계단이 있어 층을 올릴 수 없어요'};
    return {ok:true,kind:'floor',room:r,cost:MROOM.floorCost};
  }
  if(occ[y][x])return {ok:false,why:'다른 건물이 있어요'};
  // 땅 또는 데크: 그 칸에서 가장 높은 바닥에 짓는다
  var pl=placeLevel({w:1,h:1},x,y,2);if(pl.why)return {ok:false,why:pl.why};
  return {ok:true,kind:'new',cost:D[def].cost,l:pl.l,deck:pl.deck};
}
function placeTile(x,y,def){
  def=def||'mroom';
  var p=tilePlan(x,y,def);
  if(!p.ok||S.money<p.cost)return false;
  S.money-=p.cost;noteNew();
  if(p.kind==='floor'){tileOf(p.room,x,y).f++;roomsChanged();return true;}
  var nb=[];
  // 같은 높이에 선 이웃 칸끼리만 하나로 합친다
  DIRS.forEach(function(dd){var r=roomAt(x+dd[0],y+dd[1],def);if(r&&nb.indexOf(r)<0&&bLevel(r)===p.l)nb.push(r);});
  if(!nb.length){
    var nr={id:S.nextId++,def:def,x:x,y:y,tiles:[{x:x,y:y,f:1}],inUse:0,uses:0,bw:S.week};if(p.deck)nr.z=p.l;
    S.buildings.push(nr);
  }else{
    nb.sort(function(a,b){return b.tiles.length-a.tiles.length||a.id-b.id;});
    var keep=nb[0];
    keep.tiles.push({x:x,y:y,f:1});if(p.deck||nb.some(function(r){return r.z!=null;}))keep.z=p.l;
    for(var i=1;i<nb.length;i++)mergeRoom(keep,nb[i]);
  }
  roomsChanged();return true;
}
function mergeRoom(keep,o){
  keep.tiles=keep.tiles.concat(o.tiles);
  keep.inUse+=o.inUse;keep.uses=(keep.uses||0)+(o.uses||0);
  V.forEach(function(v){if(v.inside===o.id)v.inside=keep.id;if(v.target===o.id)v.target=keep.id;});
  if(UI.sel===o.id)UI.sel=keep.id;
  S.buildings=S.buildings.filter(function(b){return b.id!==o.id;});
  delete RDC[o.id];
}
/* 칸의 맨 위층을 지운다. rate는 환급 비율(철거 0.5, 되돌리기 1) */
function removeTile(x,y,rate){
  var b=roomAt(x,y);if(!b)return false;
  var t=tileOf(b,x,y);
  if(t.f>1){t.f--;S.money+=Math.floor(MROOM.floorCost*rate);roomsChanged();return true;}
  S.money+=Math.floor(D[b.def].cost*rate);
  b.tiles=b.tiles.filter(function(q){return q!==t;});
  if(!b.tiles.length){
    S.buildings=S.buildings.filter(function(q){return q.id!==b.id;});
    releaseVisitors(b.id);delete RDC[b.id];
  }else splitRoom(b);
  roomsChanged();return true;
}
/* 끊어진 칸 묶음은 따로 나눈다. 가장 큰 묶음이 원래 id를 유지한다 */
function splitRoom(b){
  var left={},comps=[];
  b.tiles.forEach(function(t){left[t.x+','+t.y]=t;});
  b.tiles.forEach(function(t){
    if(!left[t.x+','+t.y])return;
    var comp=[],q=[t];delete left[t.x+','+t.y];
    while(q.length){
      var c=q.pop();comp.push(c);
      DIRS.forEach(function(dd){var k=(c.x+dd[0])+','+(c.y+dd[1]);if(left[k]){q.push(left[k]);delete left[k];}});
    }
    comps.push(comp);
  });
  if(comps.length<2)return;
  comps.sort(function(a,c){return c.length-a.length;});
  b.tiles=comps[0];
  for(var i=1;i<comps.length;i++){
    var nr={id:S.nextId++,def:b.def,x:0,y:0,tiles:comps[i],inUse:0,uses:0};if(b.z!=null)nr.z=b.z;S.buildings.push(nr);
  }
}
/* 화면 좌표에서 가장 위에 보이는 칸(쌓인 칸 포함) 또는 땅 칸 */
function pickTile(px,py){
  for(var z=MAXH*LV+roomTop(MROOM.maxF)+.1;z>=MINH*LV;z-=0.05){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    var b=roomAt(tx,ty),bz=b?bLevel(b)*LV:0;
    if(z<0&&!b&&tx>=0&&ty>=0&&tx<COLS&&ty<ROWS&&groundZ(w[0],w[1])>=z+.06)break;
    if(b&&z>=bz&&z<=bz+bHeightAt(b,tx,ty)+.001)return {x:tx,y:ty};
  }
  return groundTile(px,py);
}

/* ---------- 그리기 ---------- */
function roomMap(b){var m={};b.tiles.forEach(function(t){m[t.x+','+t.y]=t.f;});return m;}
// 회전된 화면 기준으로 (dx,dy) 방향 이웃 칸의 층수
function nbF(map,r,dx,dy){var c=unrot((r.x0+r.x1)/2+dx,(r.y0+r.y1)/2+dy);return map[Math.floor(c[0])+','+Math.floor(c[1])]||0;}
function drawRoomTile(b,t,map){
  var d=D[b.def],r=rrect(t.x,t.y,t.x+1,t.y+1),H=roomTop(t.f),c=PJ.c;
  var nL=nbF(map,r,-1,0),nR=nbF(map,r,1,0),nU=nbF(map,r,0,-1),nD=nbF(map,r,0,1);
  var ins=.09,body={x0:r.x0+(nL?0:ins),x1:r.x1-(nR?0:ins),y0:r.y0+(nU?0:ins),y1:r.y1-(nD?0:ins)};
  var slab={x0:r.x0+(nL?0:.03),x1:r.x1-(nR?0:.03),y0:r.y0+(nU?0:.03),y1:r.y1-(nD?0:.03)};
  quad([[slab.x0,slab.y1,0],[slab.x1,slab.y1,0],[slab.x1,slab.y1,.05],[slab.x0,slab.y1,.05]],shade('#cfc8b8',.93),nD?null:EDGE);
  quad([[slab.x1,slab.y0,0],[slab.x1,slab.y1,0],[slab.x1,slab.y1,.05],[slab.x1,slab.y0,.05]],shade('#cfc8b8',.74),nR?null:EDGE);
  quad([[slab.x0,slab.y0,.05],[slab.x1,slab.y0,.05],[slab.x1,slab.y1,.05],[slab.x0,slab.y1,.05]],shade('#cfc8b8',1.07));
  var glass='#9dbbe0';
  if(nD<t.f){
    quad([[body.x0,body.y1,.05],[body.x1,body.y1,.05],[body.x1,body.y1,H],[body.x0,body.y1,H]],shade(d.wall,.93),EDGE);
    for(var k=0;k<t.f;k++){
      var z0=.05+k*MROOM.fh,mx=(body.x0+body.x1)/2;
      if(k>0)fr('L',body,body.x0,body.x1,z0-.02,z0+.02,shade(d.wall,.78));
      fr('L',body,mx-.13,mx+.13,z0+.3,z0+.66,shade(glass,.95));
    }
  }
  if(nR<t.f){
    quad([[body.x1,body.y0,.05],[body.x1,body.y1,.05],[body.x1,body.y1,H],[body.x1,body.y0,H]],shade(d.wall,.74),EDGE);
    for(var j=0;j<t.f;j++){
      var z1=.05+j*MROOM.fh,my=(body.y0+body.y1)/2;
      if(j>0)fr('R',body,body.y0,body.y1,z1-.02,z1+.02,shade(d.wall,.62));
      fr('R',body,my-.13,my+.13,z1+.3,z1+.66,shade(glass,.78));
    }
  }
  drawDoorsOn(b,t);
  quad([[body.x0,body.y0,H],[body.x1,body.y0,H],[body.x1,body.y1,H],[body.x0,body.y1,H]],shade(d.roofc,1.05));
  // 지붕 테두리: 같은 높이로 이어진 쪽에는 선을 긋지 않아 한 건물로 보이게 한다
  c.strokeStyle=EDGE;c.lineWidth=Math.max(.5,PJ.s*.9);c.beginPath();
  var seg=function(a,b2){var p=P(a[0],a[1],H),q=P(b2[0],b2[1],H);c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);};
  if(nU!==t.f)seg([body.x0,body.y0],[body.x1,body.y0]);
  if(nD!==t.f)seg([body.x0,body.y1],[body.x1,body.y1]);
  if(nL!==t.f)seg([body.x0,body.y0],[body.x0,body.y1]);
  if(nR!==t.f)seg([body.x1,body.y0],[body.x1,body.y1]);
  c.stroke();
  if(t===roomCrown(b))cross((body.x0+body.x1)/2,(body.y0+body.y1)/2,H,.9);
}
// 십자가를 올릴 칸: 가장 높은 칸 중 처음 지은 칸
function roomCrown(b){var m=roomMaxF(b);for(var i=0;i<b.tiles.length;i++)if(b.tiles[i].f===m)return b.tiles[i];return null;}
// 아이콘·미리보기용: 칸들을 앞뒤 순서대로 한 번에 그린다
function drawRoom(b){
  var rb=b.tiles?b:{id:b.id,def:b.def,x:b.x,y:b.y,tiles:[{x:b.x,y:b.y,f:1}]};
  var map=roomMap(rb);
  rb.tiles.slice().sort(function(a,c){var p=rotPt(a.x+.5,a.y+.5),q=rotPt(c.x+.5,c.y+.5);return (p[0]+p[1])-(q[0]+q[1]);})
    .forEach(function(t){drawRoomTile(rb,t,map);});
}
function drawRoomGhost(){
  var g=UI.ghost;if(!g)return;
  var p=tilePlan(g.x,g.y,UI.tool),ok=p.ok&&S.money>=p.cost,c=PJ.c;
  if(!p.ok&&p.why==='부지 밖이에요')return;
  var rr=roomAt(g.x,g.y,UI.tool),f=rr?tileOf(rr,g.x,g.y).f:0;
  var r=rrect(g.x+.06,g.y+.06,g.x+.94,g.y+.94);
  var gz=rr?bLevel(rr)*LV:(p.l!=null?p.l*LV:groundZ(g.x+.5,g.y+.5));
  c.globalAlpha=.55;
  atZ(gz,function(){box(r,f?roomTop(f):.02,roomTop(f+1),ok?'#7fe0a0':'#f07a6e');});
  c.globalAlpha=1;
}
