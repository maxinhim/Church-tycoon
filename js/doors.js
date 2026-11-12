'use strict';
/* ---------- 문 (입구·출구) ----------
   방문자가 쓰는 건물(이용 효과가 있는 건물)은 반드시 입구와 출구를 가진다.
   문: {x,y,d,l}  (x,y)=건물 칸, d=문이 바깥으로 향하는 방향(DIRS 순서), l=층(0이 1층).
   입구와 출구가 같은 자리면 출입구 하나로 쓴다. */
var OPP=[1,0,3,2];
function faceDims(d,face){var w=d.w/U,h=d.h/U;return (face===0||face===1)?{w:h,h:w}:{w:w,h:h};}
function bDims(b){if(isRoom(b)){var r=roomDef(b);return {w:r.w,h:r.h};}return faceDims(D[b.def],b.face);}
function needsDoor(b){return !!defOf(b).fill;}
// 입구·출구 건물을 지어야 하는 건물. 한 칸짜리 소품(벤치·자판기 등)과 편의 시설(화장실·휴게실·수유실·안내실·편의실 칸)은 옆 길에서 바로 쓴다
function noGateDef(d){return !!d&&(!!d.cell||d.cat==='comfort');}
function needsGates(b){return needsDoor(b)&&!noGateDef(defOf(b));}
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
function validSpot(b,s){return doorSpots(b).some(function(q){return sameSpot(q,s);});}
// 정면: 입구 아치에 가장 가까운 쪽
function bestFace(b){
  var ts=bTiles(b),cx=0,cy=0;
  ts.forEach(function(t){cx+=t.x+.5;cy+=t.y+.5;});cx/=ts.length;cy/=ts.length;
  var gx=entC()-cx,gy=ROWS-.5-cy,best=2,bv=-1e9;
  for(var d=0;d<4;d++){var v=DIRS[d][0]*gx+DIRS[d][1]*gy;if(v>bv){bv=v;best=d;}}
  return best;
}
/* 기본 문 (처음 지을 때만): 상황에 맞는 자리를 고른다.
   · 이미 걸을 수 있는 길·바닥에 닿는 자리가 가장 좋고(입구에서 닿는 길이면 더), 그다음은 정면, 가운데에 가까운 자리
   · 앞이 건물로 막혔거나 울타리 밖을 향한 자리는 맨 뒤
   · 길에 닿는 자리가 둘 이상이면 입구와 출구를 따로 낸다. 아니면 문 하나를 함께 쓴다 (길 한 줄만 이으면 되게)
   지은 뒤에는 카드의 '입구 고르기·출구 고르기'로 직접 바꾼다 */
function doorScore(b,s,face,cx,cy){
  var o=doorOut(s);
  if(o.x<0||o.y<0||o.x>=COLS||o.y>=ROWS)return -1e6;
  if(o.y>=PZ&&s.y<PZ)return -1e5;
  var sc=0,n=doorNode(s,b);
  if(n>=0)sc+=NAV.reach&&NAV.reach[n]?100:60;
  else if(occ[o.y]&&occ[o.y][o.x])sc-=1000;
  if(s.d===face)sc+=10;
  return sc-(Math.abs(s.x+.5-cx)+Math.abs(s.y+.5-cy))*.2;
}
function defaultDoors(b){
  var face=b.face!=null?b.face:bestFace(b);
  var sp=doorSpots(b).filter(function(s){return s.l===0;});
  if(!sp.length)sp=doorSpots(b);
  var ts=bTiles(b),cx=0,cy=0;ts.forEach(function(t){cx+=t.x+.5;cy+=t.y+.5;});cx/=ts.length;cy/=ts.length;
  // 정면 가운데 쪽으로 살짝 끌어 준다
  cx+=DIRS[face][0]*.01;cy+=DIRS[face][1]*.01;
  var sc=sp.map(function(s){return {s:s,v:doorScore(b,s,face,cx,cy)};}).sort(function(a,c){return c.v-a.v;});
  var ent=sc[0].s,ext=null;
  for(var i=1;i<sc.length&&!ext;i++){
    var q=sc[i];if(q.v<50)break;
    if(Math.abs(q.s.x-ent.x)+Math.abs(q.s.y-ent.y)>=1||q.s.d!==ent.d)ext=q.s;
  }
  ext=ext||ent;
  return {ent:{x:ent.x,y:ent.y,d:ent.d,l:ent.l},ext:{x:ext.x,y:ext.y,d:ext.d,l:ext.l}};
}
// 문은 붙어 있는 입구·출구 건물에서 읽는다 (gates.js). 둘 다 제자리에 있어야 b.door가 생긴다
function ensureDoors(b){
  if(!needsDoor(b)){if(b.door)delete b.door;return;}
  if(!needsGates(b)){
    // 소품·편의 시설: 1층 둘레에서 정면 쪽부터, 바로 옆이 걷는 길인 자리를 쓴다 (입구에서 닿는 길이면 더 좋다)
    var f=b.face==null?2:b.face,sp=doorSpots(b).filter(function(s){return s.l===0;}),pick=null,best=-1;
    sp.forEach(function(s){var n=doorNode(s,b);if(n<0)return;var v=(NAV.reach&&NAV.reach[n]?10:5)+(s.d===f?1:0);if(v>best){best=v;pick=s;}});
    pick=pick||sp[0]||{x:b.x,y:b.y,d:f,l:0};b.door={ent:pick,ext:{x:pick.x,y:pick.y,d:pick.d,l:0}};return;
  }
  var g=gatesOf(b);
  if(gateOk(g.ent,b)&&gateOk(g.ext,b))b.door={ent:gateSpot(g.ent,b),ext:gateSpot(g.ext,b)};
  else delete b.door;
}
function doorText(b){
  if(!b.door)return '';
  var nm=function(s){return (s.l?'2층 ':'')+['오른쪽','왼쪽','앞','뒤'][s.d];};
  return sameSpot(b.door.ent,b.door.ext)?'출입구 '+nm(b.door.ent):'입구 '+nm(b.door.ent)+' · 출구 '+nm(b.door.ext);
}

/* ---------- 문 그리기 ---------- */
// 벽에 문을 그린다. 화면 앞쪽을 향한 벽에만 보인다. onlyTile이 있으면 그 칸의 문만
function drawDoorsOn(b,onlyTile){
  return;  // 입구·출구 건물이 문을 보여 준다
  if(!b.door)return;
  var ins=isRoom(b)?.09:.1,same=sameSpot(b.door.ent,b.door.ext),barn=!isRoom(b)&&D[b.def].deco==='barn';
  [['ent',b.door.ent],['ext',b.door.ext]].forEach(function(it,i){
    var s=it[1];
    if(same&&i===1)return;
    if(onlyTile&&(s.x!==onlyTile.x||s.y!==onlyTile.y))return;
    var a=rotPt(s.x+.5,s.y+.5),q=rotPt(s.x+.5+DIRS[s.d][0],s.y+.5+DIRS[s.d][1]);
    if(!(Math.round(q[0]-a[0])===1||Math.round(q[1]-a[1])===1))return;
    var col=same?'#2a9d8f':(it[0]==='ent'?'#3f9d5a':'#e08a2c');
    var z0=.05+s.l*LV,z1=z0+.56,hw=barn?.24:.16;
    var cxw=s.x+.5+DIRS[s.d][0]*(.5-ins),cyw=s.y+.5+DIRS[s.d][1]*(.5-ins),tx=-DIRS[s.d][1],ty=DIRS[s.d][0];
    var p1=rotPt(cxw-tx*hw,cyw-ty*hw),p2=rotPt(cxw+tx*hw,cyw+ty*hw);
    quad([[p1[0],p1[1],z0],[p2[0],p2[1],z0],[p2[0],p2[1],z1],[p1[0],p1[1],z1]],barn?'#6b4423':'#4a3628',EDGE);
    quad([[p1[0],p1[1],z1],[p2[0],p2[1],z1],[p2[0],p2[1],z1+.09],[p1[0],p1[1],z1+.09]],col);
  });
}
function doorPadPos(s){return {x:s.x+.5+DIRS[s.d][0]*.82,y:s.y+.5+DIRS[s.d][1]*.82,z:s.l*LV+.04};}
// 선택했을 때 문 바깥에 '입'·'출' 표시
function drawDoorPads(b){
  return;  // '입'·'출' 표시는 그리지 않는다 (입구·출구 건물이 있다)
  if(!b||!b.door)return;
  var same=sameSpot(b.door.ent,b.door.ext),c=PJ.c,s0=Math.max(.7,PJ.s);
  [['ent',b.door.ent],['ext',b.door.ext]].forEach(function(it,i){
    var s=it[1];if(same&&i===1)return;
    var ok=b.acc?(it[0]==='ent'?b.acc.ent:b.acc.ext):true;
    var wx=s.x+.5+DIRS[s.d][0]*.82,wy=s.y+.5+DIRS[s.d][1]*.82,z=s.l*LV+.04,r=.2;
    var pts=[[wx-r,wy],[wx,wy-r],[wx+r,wy],[wx,wy+r]].map(function(p){var q=rotPt(p[0],p[1]);return [q[0],q[1],z];});
    var col=same?'#2a9d8f':(it[0]==='ent'?'#3f9d5a':'#e08a2c');
    quad(pts,ok?col:'#d6453a','rgba(255,255,255,.9)');
    var m=rotPt(wx,wy),p=P(m[0],m[1],z);
    c.font='700 '+(9*s0)+'px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#fff';c.fillText(same?'문':(it[0]==='ent'?'입':'출'),p[0],p[1]);
  });
}
