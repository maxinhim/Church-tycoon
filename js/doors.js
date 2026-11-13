'use strict';
/* ---------- 문 (입구·출구) ----------
   방문자가 쓰는 건물(이용 효과가 있는 건물)은 문이 하나다: 건물이 바라보는 방향(b.face, 0~3) 정면 1층의 가운데 칸.
   문 앞 길 칸 하나가 길찾기와 이어지는 자리다(doorNode). 칸 건물(예배실 칸 등)은 길에 닿는 1층 둘레 칸에 문을 단다.
   문: {x,y,d,l}  (x,y)=건물 칸, d=문이 바깥으로 향하는 방향(DIRS 순서), l=층(0이 1층). b.door = {ent, ext} (같은 자리) */
var OPP=[1,0,3,2];
function faceDims(d,face){var w=d.w/U,h=d.h/U;return (face===0||face===1)?{w:h,h:w}:{w:w,h:h};}
function bDims(b){if(isRoom(b)){var r=roomDef(b);return {w:r.w,h:r.h};}return faceDims(D[b.def],b.face);}
function needsDoor(b){return !!defOf(b).fill;}
function bTiles(b){
  if(isRoom(b))return b.tiles;
  var dm=bDims(b),out=[];
  for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++)out.push({x:b.x+i,y:b.y+j,f:b.floors||1});
  return out;
}
function doorOut(s){return {x:s.x+DIRS[s.d][0],y:s.y+DIRS[s.d][1],l:s.l};}
function sameSpot(a,c){return !!a&&!!c&&a.x===c.x&&a.y===c.y&&a.d===c.d&&a.l===c.l;}
/* 문을 달 수 있는 모든 자리: 바깥에 면한 벽, 층마다. 건물 둘레를 따라 도는 순서로 정렬 */
function doorSpots(b){
  var ts=bTiles(b),m={},sx=0,sy=0,out=[];
  ts.forEach(function(t){m[t.x+','+t.y]=t.f;sx+=t.x+.5;sy+=t.y+.5;});
  var cx=sx/ts.length,cy=sy/ts.length;
  ts.forEach(function(t){
    for(var l=0;l<t.f;l++)for(var d=0;d<4;d++){
      var nx=t.x+DIRS[d][0],ny=t.y+DIRS[d][1],nf=m[nx+','+ny]||0;
      if(nf>l||(l>0&&nf))continue;
      if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;
      out.push({x:t.x,y:t.y,d:d,l:l,a:Math.atan2(t.y+.5+DIRS[d][1]*.5-cy,t.x+.5+DIRS[d][0]*.5-cx)});
    }
  });
  out.sort(function(a,c){return a.l-c.l||a.a-c.a;});
  return out.map(function(s){return {x:s.x,y:s.y,d:s.d,l:s.l};});
}
// 정면(b.face) 1층 가운데 칸. 정면 벽 칸들 가운데 가운데 것
function frontDoor(b){
  var f=b.face==null?2:b.face,sp=doorSpots(b).filter(function(s){return s.l===0&&s.d===f;});
  if(!sp.length)return null;
  sp.sort(function(a,c){return (a.x+a.y)-(c.x+c.y);});
  return sp[(sp.length-1)>>1];
}
function ensureDoors(b){
  if(!needsDoor(b)){if(b.door)delete b.door;return;}
  var pick=null;
  if(isRoom(b)){
    // 칸 건물: 1층 둘레에서 바로 옆이 걷는 길인 자리 (입구에서 닿는 길이면 더 좋다)
    var sp=doorSpots(b).filter(function(s){return s.l===0;}),best=-1;
    sp.forEach(function(s){var n=doorNode(s,b);if(n<0)return;var v=NAV.reach&&NAV.reach[n]?10:5;if(v>best){best=v;pick=s;}});
    pick=pick||sp[0];
  }else pick=frontDoor(b);
  pick=pick||{x:b.x,y:b.y,d:b.face==null?2:b.face,l:0};
  b.door={ent:pick,ext:{x:pick.x,y:pick.y,d:pick.d,l:pick.l}};
}
function doorText(b){
  if(!b.door)return '';
  return '문 '+['오른쪽','왼쪽','앞','뒤'][b.door.ent.d];
}

/* ---------- 문 그리기 ---------- */
// 벽에 문을 그린다. 화면 앞쪽을 향한 벽에만 보인다. onlyTile이 있으면 그 칸의 문만
function drawDoorsOn(b,onlyTile){
  if(!b.door)return;
  var ins=isRoom(b)?.09:.1,same=sameSpot(b.door.ent,b.door.ext),barn=!isRoom(b)&&D[b.def].deco==='barn';
  [['ent',b.door.ent],['ext',b.door.ext]].forEach(function(it,i){
    var s=it[1];
    if(same&&i===1)return;
    if(onlyTile&&(s.x!==onlyTile.x||s.y!==onlyTile.y))return;
    var a=rotPt(s.x+.5,s.y+.5),q=rotPt(s.x+.5+DIRS[s.d][0],s.y+.5+DIRS[s.d][1]);
    if(!(Math.round(q[0]-a[0])===1||Math.round(q[1]-a[1])===1))return;
    var col='#2a9d8f';
    var z0=.05+s.l*LV,z1=z0+.56,hw=barn?.24:.16;
    var cxw=s.x+.5+DIRS[s.d][0]*(.5-ins),cyw=s.y+.5+DIRS[s.d][1]*(.5-ins),tx=-DIRS[s.d][1],ty=DIRS[s.d][0];
    var p1=rotPt(cxw-tx*hw,cyw-ty*hw),p2=rotPt(cxw+tx*hw,cyw+ty*hw);
    quad([[p1[0],p1[1],z0],[p2[0],p2[1],z0],[p2[0],p2[1],z1],[p1[0],p1[1],z1]],barn?'#6b4423':'#4a3628',EDGE);
    quad([[p1[0],p1[1],z1],[p2[0],p2[1],z1],[p2[0],p2[1],z1+.09],[p1[0],p1[1],z1+.09]],col);
  });
}
