'use strict';
/* ---------- 길찾기 (땅 + 길·계단·다리) ----------
   노드: 땅 칸 = y*COLS+x, 높이가 있는 길 조각(다리·계단) = 1000+조각 id.
   땅 높이의 평지 길은 땅 칸과 같은 노드로 본다.
   두 노드는 맞닿은 면의 높이(포트)가 같을 때만 이어진다. */
var GB=[],NAV={reach:{}};
function gid(x,y){return y*COLS+x;}
function gateNode(){return gid(ENT,ROWS-1);}
function isPieceNode(n){return n>=1000;}
function nodePiece(n){return pieceById(n-1000);}
function groundOk(x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS&&!occ[y][x]&&!(GB[y]&&GB[y][x]);}
function nodeOk(n){return isPieceNode(n)?!!nodePiece(n):groundOk(n%COLS,(n/COLS)|0);}
function nodePos(n){
  if(!isPieceNode(n))return {x:n%COLS+.5,y:((n/COLS)|0)+.5,z:0};
  var p=nodePiece(n);return {x:p.x+.5,y:p.y+.5,z:(p.l+.5*p.s)*LV};
}
function isNodePiece(p){return p.l>0||p.s>0;}
// (x,y) 칸에서 d 방향 면이 lvl 높이로 열린 다리·계단 노드
function pieceNodeAt(x,y,d,lvl){
  var ps=piecesAt(x,y);
  for(var i=0;i<ps.length;i++){var q=ps[i];if(isNodePiece(q)&&portLevel(q,d)===lvl)return 1000+q.id;}
  return -1;
}
// 이웃 노드마다 cb(노드, 경계 높이 z)
function navNext(n,cb){
  var d;
  if(!isPieceNode(n)){
    var x=n%COLS,y=(n/COLS)|0;
    for(d=0;d<4;d++){
      var nx=x+DIRS[d][0],ny=y+DIRS[d][1];
      if(groundOk(nx,ny))cb(gid(nx,ny),0);
      var pn=pieceNodeAt(nx,ny,OPP[d],0);if(pn>=0)cb(pn,0);
    }
    return;
  }
  var p=nodePiece(n);if(!p)return;
  for(d=0;d<4;d++){
    var pl=portLevel(p,d);if(pl<0)continue;
    var mx=p.x+DIRS[d][0],my=p.y+DIRS[d][1];
    if(pl===0&&groundOk(mx,my))cb(gid(mx,my),0);
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
function doorNode(s){
  if(!s)return -1;
  var o=doorOut(s);
  if(s.l===0)return groundOk(o.x,o.y)?gid(o.x,o.y):-1;
  return pieceNodeAt(o.x,o.y,OPP[s.d],s.l);
}
/* 문 정리 → 입구 아치에서 닿는 곳 계산 → 건물마다 입구·출구 이용 가능 여부 */
function refreshNav(){
  S.buildings.forEach(ensureDoors);
  NAV.reach=navReach(gateNode());
  S.buildings.forEach(function(b){
    if(!b.door){b.acc=null;return;}
    var en=doorNode(b.door.ent),ex=doorNode(b.door.ext);
    b.acc={ent:en>=0&&!!NAV.reach[en],ext:ex>=0&&!!NAV.reach[ex]};
    b.acc.ok=b.acc.ent&&b.acc.ext;
    if(isRoom(b))b.upOk=[b.door.ent,b.door.ext].some(function(s){var n=doorNode(s);return s.l>=1&&n>=0&&!!NAV.reach[n];});
  });
}
