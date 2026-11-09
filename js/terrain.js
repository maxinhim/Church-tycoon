'use strict';
/* ---------- 지형: 땅 높이·흙 경사로 ----------
   S.hgt = {"x,y": 높이(층)}  (없으면 0)
   S.slp = {"x,y": 방향}       흙 경사로: 그 칸의 높이 h에서 방향(DIRS 순서) 쪽으로 h+1까지 오른다.
   · 높이가 다른 땅의 경계는 절벽이라 못 지나간다. 흙 경사로·철골 계단으로만 오르내린다
   · 땅을 높이거나 낮추면 그 위의 것(바닥 타일·건물·땅에 놓인 길)이 함께 움직인다.
     여러 칸짜리 건물은 모든 칸을 함께 맞춘다
   · 땅 높이와 그 위 건물 층수를 합쳐 MAXH(10)층을 넘지 않는다 */
var MAXH=10,TER_UP=60,TER_DOWN=30,TER_RAMP=80;
function th(x,y){var v=S.hgt&&S.hgt[x+','+y];return v||0;}
function tslope(x,y){var v=S.slp&&S.slp[x+','+y];return v==null?-1:v;}
function isRamp(x,y){return tslope(x,y)>=0;}
function isTerDef(id){return !!D[id]&&D[id].kind==='terrain';}
// (x,y) 칸의 d 방향 면이 열린 높이(층). 경사로의 옆면은 -1
function groundPort(x,y,d){var h=th(x,y),s=tslope(x,y);if(s<0)return h;if(d===s)return h+1;if(d===OPP[s])return h;return -1;}
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
// 화면 좌표에서 가장 위에 보이는 땅 칸 (높인 땅의 윗면을 먼저 찾는다)
function groundTile(px,py){
  for(var z=MAXH*LV+.05;z>0;z-=.05){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    if(Math.abs(groundZ(w[0],w[1])-z)<.055&&(th(tx,ty)||isRamp(tx,ty)))return {x:tx,y:ty};
  }
  var w0=toWorld(px,py,0);return {x:Math.floor(w0[0]),y:Math.floor(w0[1])};
}

/* ---------- 바꾸기 ----------
   terPlan: 무엇이 바뀌는지와 비용, 못 하면 why. 아무것도 바꾸지 않는다 */
function terZoneWhy(x,y){
  if(x<0||y<0||x>=COLS||y>=ROWS-1)return '부지 밖이에요';
  if(y>=PZ)return '주차 구역의 땅은 바꿀 수 없어요';
  if(x===ENT&&y===PZ-1)return '교회 입구 바로 앞 칸은 높일 수 없어요';
  return '';
}
function terPlan(x,y,id,lvl,dir){
  var zw=terZoneWhy(x,y);if(zw)return {why:zw};
  if(id==='ter_ramp')return rampPlan(x,y,dir);
  if(lvl<0||lvl>MAXH-1)return {why:'땅은 '+(MAXH-1)+'층 높이까지 올릴 수 있어요'};
  var cells=[{x:x,y:y}],bid=occ[y][x],b=bid?bById(bid):null;
  if(b){
    cells=bTiles(b).map(function(t){return {x:t.x,y:t.y};});
    if(b.z!=null)return {why:'데크 위 건물 밑의 땅은 바꿀 수 없어요'};
    if(lvl+bTopFloors(b)>MAXH)return {why:'땅 높이와 건물 층수를 합쳐 '+MAXH+'층을 넘을 수 없어요'};
  }
  var cost=0,moves=[],why='',changed=false;
  cells.forEach(function(c){
    if(why)return;
    var zw2=terZoneWhy(c.x,c.y);if(zw2){why=b?'건물의 다른 칸이 '+zw2.replace('이에요','이라 바꿀 수 없어요'):zw2;return;}
    var h=th(c.x,c.y),dl=lvl-h,ramp=isRamp(c.x,c.y);
    if(!dl&&!ramp)return;
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
  return {cells:cells,lvl:lvl,cost:cost,moves:moves,b:b};
}
function rampPlan(x,y,dir){
  if(occ[y][x])return {why:'건물이 있는 칸은 경사로로 만들 수 없어요'};
  if(piecesAt(x,y).length)return {why:'길이 있는 칸은 경사로로 만들 수 없어요'};
  var h=th(x,y),nx=x+DIRS[dir][0],ny=y+DIRS[dir][1];
  if(tslope(x,y)===dir)return {why:'이미 이 방향 경사로예요'};
  if(nx<0||ny<0||nx>=COLS||ny>=PZ||th(nx,ny)!==h+1)return {why:'화살표 쪽 칸이 한 층 높아야 해요. 그 칸을 먼저 높여 주세요'};
  if(h+1>MAXH-1)return {why:'더 높이는 만들 수 없어요'};
  return {cells:[{x:x,y:y}],ramp:dir,lvl:h,cost:TER_RAMP,moves:[]};
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
    if(p.lvl)S.hgt[k]=p.lvl;else delete S.hgt[k];
    if(p.ramp!=null)S.slp[k]=p.ramp;else delete S.slp[k];
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
  rebuildOcc();recalc();
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

// 지금 고른 칸에 ✓를 누를 수 있는지 (바닥·지형 공용)
function cellWhy(x,y,id){
  if(!isTerDef(id))return floorWhy(x,y,id);
  var p=terPlan(x,y,id,UI.tlv,UI.fdir);return p.why||(S.money<p.cost?'자금이 부족해요':'');
}
// 바닥·지형 미리보기: 고른 칸 표시, 땅 높이는 목표 높이까지 반투명 기둥, 경사로는 오르는 쪽 화살표
function drawTerGhost(){
  var g=UI.ghost,x=g.x,y=g.y;if(x<0||y<0||x>=COLS||y>=ROWS)return;
  var ok=!cellWhy(x,y,UI.tool),z=groundZ(x+.5,y+.5),c=PJ.c,col=ok?'#ffd23f':'#ff5a4a';
  if(UI.tool==='ter_set'){
    var p=terPlan(x,y,UI.tool,UI.tlv,UI.fdir),cells=p.cells||[{x:x,y:y}];
    c.globalAlpha=.42;
    cells.forEach(function(t){var a=th(t.x,t.y)*LV,b=UI.tlv*LV;if(Math.abs(a-b)>.01)box(rrect(t.x+.03,t.y+.03,t.x+.97,t.y+.97),Math.min(a,b),Math.max(a,b),ok?'#ffd23f':'#f07a6e');});
    c.globalAlpha=1;
    cells.forEach(function(t){atZ(UI.tlv*LV,function(){footprint(t.x,t.y,1,1,ok?'rgba(255,210,63,.25)':'rgba(235,70,60,.3)',col,[4,3]);});});
    return;
  }
  atZ(isRamp(x,y)?th(x,y)*LV+.45:z,function(){footprint(x,y,1,1,ok?'rgba(255,210,63,.22)':'rgba(235,70,60,.3)',col,[4,3]);});
  if(UI.tool==='ter_ramp'){
    var dx=DIRS[UI.fdir][0],dy=DIRS[UI.fdir][1],cx=x+.5,cy=y+.5,tip=rotPt(cx+dx*.9,cy+dy*.9),l=rotPt(cx-dy*.25,cy+dx*.25),r=rotPt(cx+dy*.25,cy-dx*.25),zz=th(x,y)*LV+.08;
    quad([[tip[0],tip[1],zz+.5*LV],[l[0],l[1],zz],[r[0],r[1],zz]],col,'rgba(30,30,30,.6)');
  }
}

/* ---------- 그리기 ----------
   높인 칸·경사로 칸은 그 칸의 흙 덩어리(앞쪽 두 옆면 + 윗면)를 하나의 그림 단위로 그린다.
   윗면에는 잔디(또는 깔아 둔 바닥 타일)를 얹는다 */
var TER_SIDE='#9b7752',TER_RAMP_C='#b48d5f';
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
    if(!front)continue;
    var nx=x+DIRS[d][0],ny=y+DIRS[d][1];
    var ta=cornerZ(x,y,a[0],a[1]),tb=cornerZ(x,y,b[0],b[1]),ba=Math.min(ta,cornerZ(nx,ny,a[0],a[1])),bb=Math.min(tb,cornerZ(nx,ny,b[0],b[1]));
    if(ta-ba<.01&&tb-bb<.01)continue;
    quad([[ra[0],ra[1],ba*LV],[rb[0],rb[1],bb*LV],[rb[0],rb[1],tb*LV],[ra[0],ra[1],ta*LV]],shade(tint||TER_SIDE,front),EDGE);
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
  }else{
    var h=th(x,y);
    atZ(h*LV,function(){
      quad(top.map(function(q){return [q[0],q[1],0];}),tint||texPattern('t_grass',2)||'#86b86f','rgba(40,80,30,.18)');
      if(fl&&D[fl]&&!tint)drawFloorTile(fl,x,y);
    });
  }
  if(!tint&&S.wx&&S.wx.snow>.05){c.globalAlpha=Math.min(.85,S.wx.snow);quad(top,'#f4f7fb',null);c.globalAlpha=1;}
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
