'use strict';
/* ---------- 길찾기 ---------- */
function goalFor(b){
  var d=D[b.def];
  return function(x,y){
    if(x<b.x-1||x>b.x+d.w||y<b.y-1||y>b.y+d.h)return false;
    var ox=(x<b.x||x>=b.x+d.w),oy=(y<b.y||y>=b.y+d.h);
    return !(ox&&oy);
  };
}
function bfs(sx,sy,isGoal){
  if(isGoal(sx,sy))return [];
  var W=COLS,H=ROWS,prev=new Int16Array(W*H).fill(-1),seen=new Uint8Array(W*H),s=sy*W+sx,q=[s];
  seen[s]=1;
  for(var qi=0;qi<q.length;qi++){
    var cur=q[qi],cx=cur%W,cy=(cur/W)|0;
    for(var k=0;k<4;k++){
      var nx=cx+DIRS[k][0],ny=cy+DIRS[k][1];
      if(nx<0||ny<0||nx>=W||ny>=H)continue;
      var ni=ny*W+nx;
      if(seen[ni]||occ[ny][nx])continue;
      seen[ni]=1;prev[ni]=cur;
      if(isGoal(nx,ny)){
        var path=[],c=ni;
        while(c!==s){path.push({x:c%W,y:(c/W)|0});c=prev[c];}
        path.reverse();return path;
      }
      q.push(ni);
    }
  }
  return null;
}
