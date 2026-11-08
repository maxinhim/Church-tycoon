'use strict';
/* ---------- 문 (입구·출구) ----------
   방문자가 쓰는 건물(이용 효과가 있는 건물)은 반드시 입구와 출구를 가진다.
   문: {x,y,d,l}  (x,y)=건물 칸, d=문이 바깥으로 향하는 방향(DIRS 순서), l=층(0이 1층).
   입구와 출구가 같은 자리면 출입구 하나로 쓴다. */
var OPP=[1,0,3,2];
function faceDims(d,face){return (face===0||face===1)?{w:d.h,h:d.w}:{w:d.w,h:d.h};}
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
function validSpot(b,s){return doorSpots(b).some(function(q){return sameSpot(q,s);});}
// 정면: 입구 아치에 가장 가까운 쪽
function bestFace(b){
  var ts=bTiles(b),cx=0,cy=0;
  ts.forEach(function(t){cx+=t.x+.5;cy+=t.y+.5;});cx/=ts.length;cy/=ts.length;
  var gx=ENT+.5-cx,gy=ROWS-.5-cy,best=2,bv=-1e9;
  for(var d=0;d<4;d++){var v=DIRS[d][0]*gx+DIRS[d][1]*gy;if(v>bv){bv=v;best=d;}}
  return best;
}
// 기본 문: 정면 가운데에 출입구 하나. 바로 앞이 막혀 있으면 걸어 나갈 수 있는 자리를 고른다
function defaultDoors(b){
  var face=b.face!=null?b.face:bestFace(b);
  var sp=doorSpots(b).filter(function(s){return s.l===0;});
  if(!sp.length)sp=doorSpots(b);
  var front=sp.filter(function(s){return s.d===face;});
  if(!front.length)front=sp;
  var free=front.filter(function(s){var o=doorOut(s);return groundOk(o.x,o.y);});
  if(!free.length)free=sp.filter(function(s){var o=doorOut(s);return groundOk(o.x,o.y);});
  if(free.length)front=free;
  var s=front[Math.floor((front.length-1)/2)];
  return {ent:s,ext:{x:s.x,y:s.y,d:s.d,l:s.l}};
}
function ensureDoors(b){
  if(!needsDoor(b)){if(b.door)delete b.door;return;}
  if(b.door&&validSpot(b,b.door.ent)&&validSpot(b,b.door.ext))return;
  b.door=defaultDoors(b);
}
// which: 'ent' | 'ext', step: +1 / -1 (둘레를 따라 다음 자리로)
function cycleDoor(b,which,step){
  if(!b||!b.door)return;
  var sp=doorSpots(b),i=0;
  for(var k=0;k<sp.length;k++)if(sameSpot(sp[k],b.door[which])){i=k;break;}
  b.door[which]=sp[(i+step+sp.length)%sp.length];
  recalc();save();
}
function doorText(b){
  if(!b.door)return '';
  var nm=function(s){return (s.l?'2층 ':'')+['오른쪽','왼쪽','앞','뒤'][s.d];};
  return sameSpot(b.door.ent,b.door.ext)?'출입구 '+nm(b.door.ent):'입구 '+nm(b.door.ent)+' · 출구 '+nm(b.door.ext);
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
    var col=same?'#2a9d8f':(it[0]==='ent'?'#3f9d5a':'#e08a2c');
    var z0=.05+s.l*LV,z1=z0+.56,hw=barn?.24:.16;
    var cxw=s.x+.5+DIRS[s.d][0]*(.5-ins),cyw=s.y+.5+DIRS[s.d][1]*(.5-ins),tx=-DIRS[s.d][1],ty=DIRS[s.d][0];
    var p1=rotPt(cxw-tx*hw,cyw-ty*hw),p2=rotPt(cxw+tx*hw,cyw+ty*hw);
    quad([[p1[0],p1[1],z0],[p2[0],p2[1],z0],[p2[0],p2[1],z1],[p1[0],p1[1],z1]],barn?'#6b4423':'#4a3628',EDGE);
    quad([[p1[0],p1[1],z1],[p2[0],p2[1],z1],[p2[0],p2[1],z1+.09],[p1[0],p1[1],z1+.09]],col);
  });
}
// 선택했을 때 문 바깥에 '입'·'출' 표시
function drawDoorPads(b){
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
