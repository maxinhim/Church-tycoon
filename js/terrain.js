'use strict';
/* ---------- 지형: 땅 높이·흙 경사로 ----------
   S.hgt = {"x,y": 높이(층)}  (없으면 0)
   S.slp = {"x,y": 방향}       흙 경사로: 그 칸의 높이 h에서 방향(DIRS 순서) 쪽으로 h+1까지 오른다.
   · 높이가 다른 땅의 경계는 절벽이라 못 지나간다. 흙 경사로·철골 계단으로만 오르내린다
   · 땅을 높이거나 낮추면 그 위의 것(바닥 타일·건물·땅에 놓인 길)이 함께 움직인다.
     여러 칸짜리 건물은 모든 칸을 함께 맞춘다
   · 땅 높이와 그 위 건물 층수를 합쳐 MAXH(10)층을 넘지 않는다 */
var MAXH=10,MINH=-10,NOPORT=-99,TER_UP=30,TER_DOWN=15,TER_RAMP=40;
function th(x,y){var v=S.hgt&&S.hgt[x+','+y];return v||0;}
function tslope(x,y){var v=S.slp&&S.slp[x+','+y];return v==null?-1:v;}
function isRamp(x,y){return tslope(x,y)>=0;}
function isTerDef(id){return !!D[id]&&D[id].kind==='terrain';}
// (x,y) 칸의 d 방향 면이 열린 높이(층). 경사로의 옆면은 -1
function groundPort(x,y,d){var h=th(x,y),s=tslope(x,y);if(s<0)return h;if(d===s)return h+1;if(d===OPP[s])return h;return NOPORT;}
// 땅 위 한 점의 표면 높이(z)
function groundZ(wx,wy){
  var x=Math.floor(wx),y=Math.floor(wy);if(x<0||y<0||x>=COLS||y>=ROWS)return 0;
  var h=th(x,y),s=tslope(x,y);if(s<0)return h*LV;
  var t=[wx-x,x+1-wx,wy-y,y+1-wy][s];return (h+clamp(t,0,1))*LV;
}
// 건물이 서 있는 바닥 높이(층)
function bLevel(b){
  if(b.z!=null)return b.z;
  if(isRoom(b)&&b.tiles&&b.tiles.length)return th(b.tiles[0].x,b.tiles[0].y);
  return th(b.x,b.y);
}
function bTopFloors(b){return isRoom(b)?roomMaxF(b):(b.floors||1);}
// 건물 b의 (x,y) 칸에 l 높이(층)의 벽이 있는지
function wallAt(b,x,y,l){var k=bLevel(b);return l>=k&&l<k+bFloorsAt(b,x,y);}
// 화면 좌표에서 가장 위에 보이는 바닥 칸 (높인 땅 윗면·데크를 먼저 찾는다)
function groundTile(px,py){return surfaceTile(px,py);}

/* ---------- 바꾸기 ----------
   terPlan: 무엇이 바뀌는지와 비용, 못 하면 why. 아무것도 바꾸지 않는다 */
function terZoneWhy(x,y){
  if(x<0||y<0||x>=COLS||y>=ROWS-RD)return '부지 밖이에요';
  if(y>=PZ)return '주차 구역의 땅은 바꿀 수 없어요';
  if(isEnt(x)&&y===PZ-1)return '교회 입구 바로 앞 칸은 높일 수 없어요';
  return '';
}
function terPlan(x,y,id,lvl,dir){
  var zw=terZoneWhy(x,y);if(zw)return {why:zw};
  if(id==='ter_ramp')return rampPlan(x,y,dir);
  if(lvl>MAXH-1)return {why:'땅은 '+(MAXH-1)+'층 높이까지 올릴 수 있어요'};
  if(lvl<MINH)return {why:'땅은 지하 '+(-MINH)+'층까지 내릴 수 있어요'};
  var cells=[{x:x,y:y}],bid=occ[y][x],b=bid?bById(bid):null;
  if(b&&isGate(b)){var gb=bById(b.of);if(gb){b=gb;x=gb.x;y=gb.y;}}
  if(b){
    cells=bTiles(b).map(function(t){return {x:t.x,y:t.y};});
    // 붙은 입구·출구 칸도 함께 높인다
    S.buildings.forEach(function(g){if(isGate(g)&&g.of===b.id&&g.z==null)cells.push({x:g.x,y:g.y});});
    if(b.z!=null)return {why:'데크 위 건물 밑의 땅은 바꿀 수 없어요'};
    if(lvl+bTopFloors(b)>MAXH)return {why:'땅 높이와 건물 층수를 합쳐 '+MAXH+'층을 넘을 수 없어요'};
    if(lvl+bLevelsTall(b)>ceilOver(b))return {why:'위의 다리·계단에 건물이 닿아요'};
  }
  var cost=0,moves=[],why='',changed=false;
  cells.forEach(function(c){
    if(why)return;
    var zw2=terZoneWhy(c.x,c.y);if(zw2){why=b?'건물의 다른 칸이 '+zw2.replace('이에요','이라 바꿀 수 없어요'):zw2;return;}
    var h=th(c.x,c.y),dl=lvl-h,ramp=isRamp(c.x,c.y);
    if(!dl&&!ramp)return;
    if(isWater(c.x,c.y)){why='물이 차 있어요. 먼저 물을 빼 주세요';return;}
    var ww=waterDigWhy(c.x,c.y,lvl,!!b||piecesAt(c.x,c.y).some(function(p){return p.l===h;}));if(ww){why=ww;return;}
    changed=true;
    cost+=dl>0?dl*TER_UP:(dl<0?-dl*TER_DOWN:TER_DOWN);
    // 땅에 놓인 길·계단은 함께 움직이고, 그 위의 다리는 그대로 둔다 (땅에 묻히면 안 됨)
    var ps=piecesAt(c.x,c.y),rest=ps.filter(function(p){return p.l===h&&p.k!=='sky';}),stay=ps.filter(function(p){return rest.indexOf(p)<0;});
    rest.forEach(function(p){
      var nl=p.l+dl;
      if(nl+p.s>MAXH){why='길·계단이 '+MAXH+'층보다 높아져요';return;}
      if(stay.some(function(q){return !(nl>=q.l+q.s+1||q.l>=nl+p.s+1);})){why='위에 다리가 있어 이 높이로는 바꿀 수 없어요';return;}
      moves.push({p:p,l:nl});
    });
    if(!why&&stay.some(function(q){return q.l<lvl+(q.k==='sky'?1:0);}))why='다리·계단 밑이라 이 높이로는 바꿀 수 없어요';
  });
  if(why)return {why:why};
  if(!changed)return {why:'이미 그 높이예요'};
  return {cells:cells.map(function(c){return {x:c.x,y:c.y,h:lvl,s:null};}),lvl:lvl,cost:cost,moves:moves,b:b};
}
function rampPlan(x,y,dir){
  if(isWater(x,y))return {why:'물이 차 있어요. 먼저 물을 빼 주세요'};
  if(occ[y][x])return {why:'건물이 있는 칸은 경사로로 만들 수 없어요'};
  if(piecesAt(x,y).length)return {why:'길이 있는 칸은 경사로로 만들 수 없어요'};
  var h=th(x,y),nx=x+DIRS[dir][0],ny=y+DIRS[dir][1];
  if(tslope(x,y)===dir)return {why:'이미 이 방향 경사로예요'};
  if(h+1>MAXH-1)return {why:'더 높이는 만들 수 없어요'};
  var zw=terZoneWhy(nx,ny);if(zw)return {why:'화살표 쪽 칸이 '+zw.replace('이에요','이라 경사로를 낼 수 없어요')};
  var plan={cells:[{x:x,y:y,h:h,s:dir}],cost:TER_RAMP,moves:[],up:null};
  // 화살표 쪽 칸이 한 층 높지 않으면 그 칸을 한 층 높여 준다 (비용 합산). 더 높으면 못 낸다
  var nh=th(nx,ny);
  if(nh>h+1)return {why:'화살표 쪽 칸이 두 층 이상 높아요. 그 칸을 낮추거나 한 칸 더 높은 곳에서 시작하세요'};
  if(nh<h+1||(isRamp(nx,ny)&&nh!==h+1)){
    if(occ[ny][nx])return {why:'화살표 쪽 칸에 건물이 있어 그 땅을 높일 수 없어요'};
    var up=terPlan(nx,ny,'ter_set',h+1);if(up.why)return {why:'화살표 쪽 칸: '+up.why};
    plan.cells=plan.cells.concat(up.cells);plan.moves=up.moves;plan.cost+=up.cost;plan.up={x:nx,y:ny};
  }
  return plan;
}
// 계획대로 바꾼다. 실패하면 그 까닭, 성공하면 ''
function terApply(x,y,id,lvl,dir){
  var p=terPlan(x,y,id,lvl,dir);if(p.why)return p.why;
  if(S.money<p.cost)return '자금이 부족해요';
  if(!S.hgt)S.hgt={};if(!S.slp)S.slp={};
  var prev=p.cells.map(function(c){var k=c.x+','+c.y;return {k:k,h:S.hgt[k],s:S.slp[k]};}),pm=p.moves.map(function(m){return {p:m.p,l:m.p.l};});
  S.money-=p.cost;
  p.cells.forEach(function(c){
    var k=c.x+','+c.y;
    if(c.h)S.hgt[k]=c.h;else delete S.hgt[k];
    if(c.s!=null)S.slp[k]=c.s;else delete S.slp[k];
  });
  p.moves.forEach(function(m){m.p.l=m.l;});
  if(UI.undo)UI.undo.push({ter:prev,moves:pm,cost:p.cost});
  terChanged(p.cells);
  return '';
}
function terUndo(u){
  u.ter.forEach(function(c){if(c.h)S.hgt[c.k]=c.h;else delete S.hgt[c.k];if(c.s!=null)S.slp[c.k]=c.s;else delete S.slp[c.k];});
  u.moves.forEach(function(m){m.p.l=m.l;});
  S.money+=u.cost;
  terChanged(u.ter.map(function(c){var a=c.k.split(',');return {x:+a[0],y:+a[1]};}));
}
// 바뀐 칸에 서 있거나 그곳을 지나가려던 방문자는 그 자리에서 다시 생각한다
function terChanged(cells){
  var hit={};
  cells.forEach(function(c){hit[gid(c.x,c.y)]=1;piecesAt(c.x,c.y).forEach(function(p){hit[PN+p.id]=1;});});
  waterFix();rebuildOcc();recalc();
  V.forEach(function(v){
    if(v.state==='inside'||v.state==='xfer')return;
    var on=!!hit[v.node],via=v.path&&v.path.some(function(q){return hit[q.n];});
    if(!on&&!via)return;
    if(nodeOk(v.node))placeAt(v,v.node);
    if(v.state==='leave'){goLeave(v);return;}
    v.path=null;v.state='idle';v.t=.2;v.target=0;
  });
  bump();save();
}

// 바닥·지형 미리보기 칸의 높이(z): 데크를 골랐으면 데크 윗면
function ghostZ(){var g=UI.ghost;if(!g)return 0;var p=g.pid&&pieceById(g.pid);return p?p.l*LV+.02:groundZ(g.x+.5,g.y+.5);}
// 지금 고른 칸에 ✓를 누를 수 있는지 (바닥·지형 공용)
function cellWhy(x,y,id){
  if(!isTerDef(id))return floorWhy(x,y,id,UI.ghost&&UI.ghost.pid);
  if(UI.ext){var e=extPlan(x,y);return e.why||(S.money<e.cost?'자금이 부족해요':'');}
  var p=terPlan(x,y,id,UI.tlv,UI.fdir);return p.why||(S.money<p.cost?'자금이 부족해요':'');
}
// 바닥·지형 미리보기: 고른 칸 표시, 땅 높이는 목표 높이까지 반투명 기둥, 경사로는 오르는 쪽 화살표
function drawTerGhost(){
  var g=UI.ghost,x=g.x,y=g.y;if(x<0||y<0||x>=COLS||y>=ROWS)return;
  var ok=!cellWhy(x,y,UI.tool),z=ghostZ(),c=PJ.c,col=ok?'#ffd23f':'#ff5a4a';
  if(UI.tool==='ter_set'){
    var p=terPlan(x,y,UI.tool,UI.tlv,UI.fdir),cells=p.cells||[{x:x,y:y}];
    c.globalAlpha=.42;
    cells.forEach(function(t){var a=th(t.x,t.y)*LV,b=UI.tlv*LV;if(Math.abs(a-b)>.01)box(rrect(t.x+.03,t.y+.03,t.x+.97,t.y+.97),Math.min(a,b),Math.max(a,b),ok?'#ffd23f':'#f07a6e');});
    c.globalAlpha=1;
    cells.forEach(function(t){atZ(UI.tlv*LV,function(){footprint(t.x,t.y,1,1,ok?'rgba(255,210,63,.25)':'rgba(235,70,60,.3)',col,[4,3]);});});
    return;
  }
  atZ(isRamp(x,y)&&!g.pid?th(x,y)*LV+.45:z,function(){footprint(x,y,1,1,ok?'rgba(255,210,63,.22)':'rgba(235,70,60,.3)',col,[4,3]);});
  if(UI.tool==='ter_ramp'){
    var rp=terPlan(x,y,'ter_ramp',0,UI.fdir);
    if(rp.up){c.globalAlpha=.42;box(rrect(rp.up.x+.03,rp.up.y+.03,rp.up.x+.97,rp.up.y+.97),th(rp.up.x,rp.up.y)*LV,(th(x,y)+1)*LV,ok?'#ffd23f':'#f07a6e');c.globalAlpha=1;}
    var dx=DIRS[UI.fdir][0],dy=DIRS[UI.fdir][1],cx=x+.5,cy=y+.5,tip=rotPt(cx+dx*.9,cy+dy*.9),l=rotPt(cx-dy*.25,cy+dx*.25),r=rotPt(cx+dy*.25,cy-dx*.25),zz=th(x,y)*LV+.08;
    quad([[tip[0],tip[1],zz+.5*LV],[l[0],l[1],zz],[r[0],r[1],zz]],col,'rgba(30,30,30,.6)');
  }
}

/* ---------- 그리기 ----------
   높인 칸·경사로 칸은 그 칸의 흙 덩어리(앞쪽 두 옆면 + 윗면)를 하나의 그림 단위로 그린다.
   윗면에는 잔디(또는 깔아 둔 바닥 타일)를 얹는다 */
var TER_SIDE='#9b7752',TER_RAMP_C='#b48d5f';
/* ---------- 옆면(벽) 타일 ----------
   S.wall = {"x,y": 바닥 타일 id}  그 칸에 맞닿은 흙벽에 붙이는 타일. 윗면 바닥(S.floor)과 달라도 된다.
   두 칸 사이의 벽은 높은 쪽 칸의 타일을 먼저 쓰고, 없으면 낮은 쪽(파인 칸) 타일을 쓴다.
   경사로 하나만 만들었을 때 생기는 세모 옆면도 같은 벽이라 똑같이 붙는다. 물을 채워도 지우지 않는다 */
function wallId(x,y){var v=S.wall&&S.wall[x+','+y];return v&&D[v]?v:null;}
// 그 칸에 벽(높이가 다른 이웃과 맞닿은 면)이 있는지
function cellHasFace(x,y){
  for(var d=0;d<4;d++){
    var e=TER_EDGE[d],nx=x+DIRS[d][0],ny=y+DIRS[d][1];
    for(var i=0;i<2;i++){var cx=x+e[i][0],cy=y+e[i][1];if(Math.abs(cornerZ(x,y,cx,cy)-cornerZ(nx,ny,cx,cy))>.01)return true;}
  }
  return false;
}
function wallSwap(x,y,id){
  if(!S.wall)S.wall={};
  var k=x+','+y,prev=wallId(x,y);
  if(id==='f_erase'){if(!prev)return '붙인 벽 타일이 없어요';S.money+=Math.floor(D[prev].cost*.5);delete S.wall[k];}
  else{
    if(prev===id)return '이미 같은 벽이에요';
    var c=floorSwapCost(prev,id);if(c>0&&S.money<c)return '자금이 '+fmt(c-S.money)+' 모자라요';
    S.money-=c;S.wall[k]=id;
  }
  if(UI.undo)UI.undo.push({wall:k,prev:prev,id:id,c:id==='f_erase'?-Math.floor(D[prev].cost*.5):floorSwapCost(prev,id)});
  save();return '';
}
function wallUndo(u){if(u.prev)S.wall[u.wall]=u.prev;else delete S.wall[u.wall];S.money+=u.c;save();}
// 세로 면에 타일 무늬를 입힌다: 가로는 면의 방향, 세로는 한 층 높이에 무늬 한 장
var WALLP={};
function wallPattern(id,ra,rb){
  var tx=FLOOR_TEX[id],im=tx&&sprOf(tx);if(!im||typeof ctx==='undefined'||PJ.c!==ctx)return null;
  var p=WALLP[id];if(!p){try{p=ctx.createPattern(im,'repeat');}catch(e){p=null;}if(!p||!p.setTransform)return null;WALLP[id]=p;}
  var alongX=Math.abs(ra[1]-rb[1])<1e-6,k=ZB;ZB=0;
  var O=alongX?P(0,ra[1],0):P(ra[0],0,0),X=alongX?P(1,ra[1],0):P(ra[0],1,0);ZB=k;
  var w=im.width/G,hgt=im.height||im.width;
  p.setTransform(new DOMMatrix([(X[0]-O[0])/w,(X[1]-O[1])/w,0,LV*ZH*PJ.s/hgt,O[0],O[1]]));
  return p;
}
// 흙벽 한 면: 벽 타일이 있으면 무늬(없으면 그 색) + 면의 밝기, 없으면 흙
function terFace(pts,ra,rb,wid,front,tint){
  if(tint||!wid){quad(pts,shade(tint||TER_SIDE,front),EDGE);return false;}
  var wp=wallPattern(wid,ra,rb);
  quad(pts,wp||shade(D[wid].wall,front),wp?null:EDGE);
  if(wp)quad(pts,'rgba(20,14,8,'+(1-front+.04).toFixed(2)+')',EDGE);
  return true;
}
function terCells(){
  var out={};
  for(var k in S.hgt||{})out[k]=1;
  for(var k2 in S.slp||{})out[k2]=1;
  return Object.keys(out).map(function(k){var a=k.split(',');return {x:+a[0],y:+a[1]};});
}
function cornerZ(x,y,cx,cy){
  if(x<0||y<0||x>=COLS||y>=ROWS)return 0;
  var h=th(x,y),s=tslope(x,y);if(s<0)return h;
  var t=[cx-x,x+1-cx,cy-y,y+1-cy][s];return h+clamp(t,0,1);
}
var TER_EDGE=[[[1,0],[1,1]],[[0,0],[0,1]],[[0,1],[1,1]],[[0,0],[1,0]]];
function drawTerCell(x,y,tint){
  var c=PJ.c,r=rrect(x,y,x+1,y+1);
  // 앞쪽(화면에 보이는) 옆면: 이웃 칸이 더 낮은 만큼 흙벽을 세운다
  for(var d=0;d<4;d++){
    var e=TER_EDGE[d],a=[x+e[0][0],y+e[0][1]],b=[x+e[1][0],y+e[1][1]],ra=rotPt(a[0],a[1]),rb=rotPt(b[0],b[1]);
    var front=Math.abs(ra[1]-r.y1)<1e-6&&Math.abs(rb[1]-r.y1)<1e-6?.93:(Math.abs(ra[0]-r.x1)<1e-6&&Math.abs(rb[0]-r.x1)<1e-6?.74:0);
    var nx=x+DIRS[d][0],ny=y+DIRS[d][1];
    if(!front){
      // 뒤쪽 면: 파인 칸에서는 뒤 이웃(평지)의 흙벽이 안쪽으로 보인다. 이웃이 높인 칸이면 그 칸이 제 앞면으로 그린다
      var nin=nx>=0&&ny>=0&&nx<COLS&&ny<ROWS;
      if(nin&&(th(nx,ny)||isRamp(nx,ny)))continue;
      var oa=cornerZ(x,y,a[0],a[1]),ob=cornerZ(x,y,b[0],b[1]);
      if(oa>-.01&&ob>-.01)continue;
      var bk=Math.abs(ra[1]-r.y0)<1e-6&&Math.abs(rb[1]-r.y0)<1e-6?.93:.74;
      var bw=nin&&wallId(nx,ny)||wallId(x,y);
      if(terFace([[ra[0],ra[1],Math.min(0,oa)*LV],[rb[0],rb[1],Math.min(0,ob)*LV],[rb[0],rb[1],0],[ra[0],ra[1],0]],ra,rb,bw,bk,tint))continue;
      c.strokeStyle='rgba(60,40,20,.18)';c.lineWidth=Math.max(.5,.8*PJ.s);c.beginPath();
      for(var l2=Math.ceil(Math.min(oa,ob)+.01);l2<0;l2++){var ya=Math.max(l2,oa),yb=Math.max(l2,ob),p3=P(ra[0],ra[1],ya*LV),p4=P(rb[0],rb[1],yb*LV);c.moveTo(p3[0],p3[1]);c.lineTo(p4[0],p4[1]);}
      c.stroke();
      continue;
    }
    var ta=cornerZ(x,y,a[0],a[1]),tb=cornerZ(x,y,b[0],b[1]),ba=Math.min(ta,cornerZ(nx,ny,a[0],a[1])),bb=Math.min(tb,cornerZ(nx,ny,b[0],b[1]));
    if(ta-ba<.01&&tb-bb<.01)continue;
    var fw=wallId(x,y)||(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS?wallId(nx,ny):null);
    if(terFace([[ra[0],ra[1],ba*LV],[rb[0],rb[1],bb*LV],[rb[0],rb[1],tb*LV],[ra[0],ra[1],ta*LV]],ra,rb,fw,front,tint))continue;
    // 층마다 가는 흙 줄
    c.strokeStyle='rgba(60,40,20,.18)';c.lineWidth=Math.max(.5,.8*PJ.s);c.beginPath();
    for(var l=Math.ceil(Math.min(ba,bb)+.01);l<Math.max(ta,tb);l++){
      var za=clamp(l,ba,ta),zb=clamp(l,bb,tb);if(za>=ta-.01&&zb>=tb-.01)continue;
      var p1=P(ra[0],ra[1],za*LV),p2=P(rb[0],rb[1],zb*LV);c.moveTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);
    }
    c.stroke();
    // 윗가장자리 잔디 띠
    if(!isRamp(x,y)){var g=.07;quad([[ra[0],ra[1],ta*LV-g],[rb[0],rb[1],tb*LV-g],[rb[0],rb[1],tb*LV],[ra[0],ra[1],ta*LV]],shade(tint||'#6f9e57',front),null);}
  }
  // 윗면
  var W=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],top=W.map(function(w){var q=rotPt(w[0],w[1]);return [q[0],q[1],cornerZ(x,y,w[0],w[1])*LV];});
  var fl=S.floor[x+','+y];
  if(isRamp(x,y)){
    var tp=fl&&FLOOR_TEX[fl]&&texPattern(FLOOR_TEX[fl],1);
    quad(top,tint||tp||(fl&&D[fl]?D[fl].wall:TER_RAMP_C),EDGE);
    // 오르는 방향을 보여 주는 가로줄
    var s=tslope(x,y);c.strokeStyle='rgba(70,45,20,.3)';c.lineWidth=Math.max(.5,PJ.s);c.beginPath();
    for(var i=1;i<4;i++){
      var t=i/4,ax,ay,bx,by;
      if(s===0||s===1){ax=bx=(s===0?x+t:x+1-t);ay=y+.05;by=y+.95;}else{ay=by=(s===2?y+t:y+1-t);ax=x+.05;bx=x+.95;}
      var qa=rotPt(ax,ay),qb=rotPt(bx,by),za2=groundZ(ax,ay)+.01,zb2=groundZ(bx,by)+.01,pa=P(qa[0],qa[1],za2),pb=P(qb[0],qb[1],zb2);
      c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);
    }
    c.stroke();
    if(fl&&!tint&&isQueueId(fl))drawQueueRails(x,y);
  }else{
    var h=th(x,y);
    atZ(h*LV,function(){
      quad(top.map(function(q){return [q[0],q[1],0];}),tint||texPattern('t_grass',2)||'#86b86f','rgba(40,80,30,.18)');
      if(fl&&D[fl]&&!tint)drawFloorTile(fl,x,y);
    });
    if(fl&&!tint&&isQueueId(fl))drawQueueRails(x,y);
  }
  if(!tint&&S.wx&&S.wx.snow>.05){c.globalAlpha=Math.min(.85,S.wx.snow);quad(top,'#f4f7fb',null);c.globalAlpha=1;}
  // 파인 칸은 깊을수록 그늘져 보인다 (주변 잔디와 구분되게)
  if(!tint){var lo=Math.min(top[0][2],top[1][2],top[2][2],top[3][2])/LV;if(lo<-.01)quad(top,'rgba(24,30,40,'+Math.min(.5,.16+.05*-lo).toFixed(2)+')',null);}
  if(!tint&&isWater(x,y))drawWaterCell(x,y);
}
// 짓기 목록 그림: 작은 흙 덩어리
function drawTerIcon(b){
  var r=rrect(b.x+.1,b.y+.1,b.x+.9,b.y+.9),d=D[b.def];
  if(b.def==='ter_ramp'){
    quad([[r.x0,r.y1,0],[r.x1,r.y1,0],[r.x1,r.y1,.0],[r.x0,r.y1,.6]],shade(TER_SIDE,.93),EDGE);
    quad([[r.x0,r.y0,.6],[r.x1,r.y0,0],[r.x1,r.y1,0],[r.x0,r.y1,.6]],TER_RAMP_C,EDGE);
    return;
  }
  box(r,0,.55,TER_SIDE,'#86b86f');
  var m=rotPt(b.x+.5,b.y+.5),q=P(m[0],m[1],.8),c=PJ.c,s=PJ.s;
  c.fillStyle=d.roofc;c.font='800 '+(16*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('↕',q[0],q[1]);
}
