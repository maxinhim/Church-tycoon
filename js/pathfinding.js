'use strict';
/* ---------- 길찾기 (바닥·길 + 계단·다리) ----------
   교회 부지에서는 바닥 타일이나 땅 높이의 길이 깔린 칸만 걸을 수 있다(잔디는 못 걷는다).
   주차 구역은 포장되어 있어 어디든 걷고, 도로 줄은 입구 열만 걷는다.
   주차 구역 → 부지로 들어오는 칸 경계는 교회 입구(ENT 열)뿐이고, 교회 문이 열려 있을 때만 들어올 수 있다.
   나가는 쪽은 문이 닫혀 있어도 막지 않는다 (안에 있던 사람이 갇히지 않게).
   노드: 땅 칸 = y*COLS+x, 높이가 있는 길 조각(다리·계단) = PN+조각 id (PN은 땅 칸 수보다 훨씬 큰 값).
   땅 높이의 평지 길은 땅 칸과 같은 노드로 본다.
   두 노드는 맞닿은 면의 높이(포트)가 같을 때만 이어진다. */
var NAV={reach:{},badSky:{},all:false},WALK=null;
function gid(x,y){return y*COLS+x;}
// 그 칸에 선 건물의 바닥 높이(층). 건물이 없으면 땅 높이
function cellLevel(x,y){var id=occ&&occ[y]&&occ[y][x],b=id&&bById(id);return b?bLevel(b):th(x,y);}
function gateNode(){return gid(ENT,ROWS-1);}
var PN=100000;
function isPieceNode(n){return n>=PN;}
function nodePiece(n){return pieceById(n-PN);}
function onGroundPiece(p){return p.k!=='sky'&&!p.s&&p.y<ROWS&&p.x<COLS&&p.l===th(p.x,p.y)&&!isRamp(p.x,p.y);}
function flatPieceAt(x,y){return S.paths.some(function(p){return p.x===x&&p.y===y&&onGroundPiece(p);});}
function computeWalk(){
  WALK=[];
  for(var y=0;y<ROWS;y++){
    var row=[],z=zoneOf(y);
    for(var x=0;x<COLS;x++)row.push(z==='road'?isEnt(x):(z==='park'?true:false));
    WALK.push(row);
  }
  for(var k in S.floor){var p=k.split(','),fx=+p[0],fy=+p[1];if(fy>=0&&fy<ROWS&&fx>=0&&fx<COLS)WALK[fy][fx]=true;}
  // 흙 경사로는 그 자체로 걸을 수 있는 길
  for(var k2 in S.slp||{}){var q=k2.split(','),sx=+q[0],sy=+q[1];if(sy>=0&&sy<PZ&&sx>=0&&sx<COLS)WALK[sy][sx]=true;}
  S.paths.forEach(function(p){if(onGroundPiece(p))WALK[p.y][p.x]=true;});
  // 물이 찬 칸은 걸을 수 없다 (다리로 건넌다)
  for(var k3 in S.water||{}){var w3=k3.split(',');if(WALK[+w3[1]])WALK[+w3[1]][+w3[0]]=false;}
}
// 데크 위 건물 밑의 땅은 막히지 않는다
function groundOk(x,y){if(!WALK)computeWalk();return x>=0&&y>=0&&x<COLS&&y<ROWS&&(!occ[y][x]||(DECK.up&&DECK.up[y][x]===1))&&WALK[y][x];}
function gateOpen(){return !!S.open||NAV.all;}
// 세로로 한 칸 옮길 때 울타리를 넘는지: 부지 ↔ 주차 구역은 입구 열에서만, 들어올 때는 문이 열려 있어야
function crossOk(x,y,ny){
  if(y>=PZ&&ny<PZ)return isEnt(x)&&gateOpen();
  if(y<PZ&&ny>=PZ)return isEnt(x);
  return true;
}
function nodeOk(n){if(isPieceNode(n)){var p=nodePiece(n);return !!p&&!deckCovered(p);}return groundOk(n%COLS,(n/COLS)|0);}
function nodePos(n){
  if(!isPieceNode(n)){var gx=n%COLS+.5,gy=((n/COLS)|0)+.5;return {x:gx,y:gy,z:groundZ(gx,gy)};}
  var p=nodePiece(n);return {x:p.x+.5,y:p.y+.5,z:(p.l+.5*p.s)*LV};
}
// 연결 다리는 건물 안 통로라 바깥 길찾기에서 뺀다
function isNodePiece(p){return p.k!=='sky'&&!onGroundPiece(p)&&!deckCovered(p);}
// (x,y) 칸에서 d 방향 면이 lvl 높이로 열린 다리·계단 노드
function pieceNodeAt(x,y,d,lvl){
  var ps=piecesAt(x,y);
  for(var i=0;i<ps.length;i++){var q=ps[i];if(isNodePiece(q)&&portLevel(q,d)===lvl)return PN+q.id;}
  return -1;
}
// 이웃 노드마다 cb(노드, 경계 높이 z)
function navNext(n,cb){
  var d;
  if(!isPieceNode(n)){
    var x=n%COLS,y=(n/COLS)|0;
    for(d=0;d<4;d++){
      var nx=x+DIRS[d][0],ny=y+DIRS[d][1];
      if(!crossOk(x,y,ny))continue;
      // 땅끼리는 맞닿은 면의 높이가 같아야 (절벽은 못 지나간다)
      var gp=groundPort(x,y,d);if(gp===NOPORT)continue;
      if(groundOk(nx,ny)&&groundPort(nx,ny,OPP[d])===gp)cb(gid(nx,ny),gp*LV);
      var pn=pieceNodeAt(nx,ny,OPP[d],gp);if(pn>=0)cb(pn,gp*LV);
    }
    return;
  }
  var p=nodePiece(n);if(!p)return;
  for(d=0;d<4;d++){
    var pl=portLevel(p,d);if(pl===NOPORT)continue;
    var mx=p.x+DIRS[d][0],my=p.y+DIRS[d][1];
    if(groundOk(mx,my)&&crossOk(mx,p.y,my)&&groundPort(mx,my,OPP[d])===pl)cb(gid(mx,my),pl*LV);
    var qn=pieceNodeAt(mx,my,OPP[d],pl);if(qn>=0)cb(qn,pl*LV);
  }
}
// 너비 우선 탐색. 경로는 [경계점, 노드 중심, ...] 순서의 {x,y,z,n} 목록
function navPath(s,isGoal){
  if(isGoal(s))return [];
  var prev={},ez={},seen={},q=[s],found=-1;seen[s]=1;
  for(var i=0;i<q.length&&found<0;i++){
    var cur=q[i];
    navNext(cur,function(m,z){
      if(found>=0||seen[m])return;
      seen[m]=1;prev[m]=cur;ez[m]=z;
      if(isGoal(m))found=m;else q.push(m);
    });
  }
  if(found<0)return null;
  var nodes=[],c=found;
  while(c!==s){nodes.push(c);c=prev[c];}
  nodes.reverse();
  var out=[],pa=nodePos(s);
  nodes.forEach(function(m){
    var pb=nodePos(m);
    out.push({x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2,z:ez[m],n:m});
    out.push({x:pb.x,y:pb.y,z:pb.z,n:m});
    pa=pb;
  });
  return out;
}
function navReach(s){
  var seen={},q=[s];seen[s]=1;
  for(var i=0;i<q.length;i++)navNext(q[i],function(m){if(!seen[m]){seen[m]=1;q.push(m);}});
  return seen;
}
function doorNode(s,b){
  if(!s)return -1;
  var o=doorOut(s),lv=(b?bLevel(b):cellLevel(s.x,s.y))+s.l;
  if(o.x>=0&&o.y>=0&&o.x<COLS&&o.y<ROWS&&groundOk(o.x,o.y)&&groundPort(o.x,o.y,OPP[s.d])===lv)return gid(o.x,o.y);
  return pieceNodeAt(o.x,o.y,OPP[s.d],lv);
}
/* 문 정리 → 입구 아치에서 닿는 곳 계산 → 건물마다 입구·출구 이용 가능 여부 */
function refreshNav(){
  computeWalk();
  S.buildings.forEach(ensureDoors);
  refreshLinks();
  // 이용 가능 여부는 문이 열려 있다고 보고 계산한다 (닫아 둔 동안 '?' 표시가 온 지도에 뜨지 않게)
  NAV.all=true;NAV.reach=navReach(gateNode());NAV.all=false;
  // 둘러볼 수 있는 곳: 입구에서 닿는 교회 부지 안의 바닥·길·데크 노드
  NAV.walk=Object.keys(NAV.reach).map(Number).filter(function(n){return isPieceNode(n)||((n/COLS)|0)<PZ;});
  S.buildings.forEach(function(b){
    if(!b.door){b.acc=null;return;}
    var en=doorNode(b.door.ent),ex=doorNode(b.door.ext);
    b.acc={ent:en>=0&&!!NAV.reach[en],ext:ex>=0&&!!NAV.reach[ex]};
    b.acc.ok=b.acc.ent&&b.acc.ext;
  });
}
