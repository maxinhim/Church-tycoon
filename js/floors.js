'use strict';
/* ---------- 바닥 타일 ----------
   땅 칸에 칠하는 바닥(보도블록·벽돌·자갈·나무·꽃잔디). 걸어 다닐 수 있고 분위기 점수를 조금 올린다.
   S.floor = {"x,y": 정의 id} */
function isFloorDef(id){return !!D[id]&&D[id].kind==='floor';}
function paintFloor(x,y,id){
  if(x<0||y<0||x>=COLS||y>=ROWS-1)return '부지 밖이에요';
  if(y>=PZ)return '주차 구역은 이미 포장돼 있어요';
  if(occ[y][x])return '건물이 있어요';
  var k=x+','+y,prev=S.floor[k]||null;
  if(id==='f_erase'){
    if(!prev)return '지울 바닥이 없어요';
    delete S.floor[k];S.money+=Math.floor(D[prev].cost*0.5);
  }else{
    if(prev===id)return '이미 같은 바닥이에요';
    if(S.money<D[id].cost)return '자금이 부족해요';
    S.money-=D[id].cost;S.floor[k]=id;
  }
  if(UI.undo)UI.undo.push({x:x,y:y,prev:prev,id:id});
  recalc();save();return '';
}
function floorUndo(){
  var u=UI.undo.pop();if(!u)return false;
  var k=u.x+','+u.y;
  if(u.id==='f_erase'){S.floor[k]=u.prev;S.money-=Math.floor(D[u.prev].cost*0.5);}
  else{if(u.prev)S.floor[k]=u.prev;else delete S.floor[k];S.money+=D[u.id].cost;}
  recalc();save();return true;
}
function floorLine(c,ax,ay,bx,by){var a=rotPt(ax,ay),b=rotPt(bx,by),p=P(a[0],a[1],.006),q=P(b[0],b[1],.006);c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);}
function drawFloorTile(id,x,y){
  var d=D[id],r=rrect(x,y,x+1,y+1),c=PJ.c,i;
  quad([[r.x0,r.y0,.005],[r.x1,r.y0,.005],[r.x1,r.y1,.005],[r.x0,r.y1,.005]],d.wall,'rgba(0,0,0,.1)');
  c.strokeStyle='rgba(40,30,20,.22)';c.lineWidth=Math.max(.5,.8*PJ.s);c.beginPath();
  if(d.pat==='grid'){floorLine(c,x+.5,y,x+.5,y+1);floorLine(c,x,y+.5,x+1,y+.5);}
  else if(d.pat==='brick'){
    for(i=1;i<4;i++)floorLine(c,x,y+i/4,x+1,y+i/4);
    for(i=0;i<4;i++){var o=i%2?.25:.5;floorLine(c,x+o,y+i/4,x+o,y+(i+1)/4);if(o===.25)floorLine(c,x+.75,y+i/4,x+.75,y+(i+1)/4);}
  }else if(d.pat==='plank'){for(i=1;i<5;i++)floorLine(c,x+i/5,y,x+i/5,y+1);}
  c.stroke();
  if(d.pat==='stepping'){
    for(i=0;i<3;i++){var sp=rotPt(x+.25+i*.25+(hh(x,y+i)-.5)*.1,y+.3+((i*7+x)%3)*.2),q0=P(sp[0],sp[1],.01);
      c.fillStyle=i%2?'#b8b2a6':'#a8a294';c.beginPath();c.ellipse(q0[0],q0[1],7*PJ.s,3.6*PJ.s,0,0,6.283);c.fill();}
  }
  if(d.pat==='dots'||d.pat==='flower'){
    for(i=0;i<(d.pat==='dots'?14:9);i++){
      var p=rotPt(x+.08+hh(x*31+i,y*17)*.84,y+.08+hh(y*13+i,x*7+i)*.84);
      dot(p[0],p[1],.01,Math.max(.6,(d.pat==='dots'?1.3:1.8)*PJ.s),d.pat==='dots'?(i%2?'#a59a87':'#d8cfbf'):(i%3?d.roofc:'#ffffff'));
    }
  }
}
function drawFloors(){
  for(var k in S.floor){var p=k.split(','),id=S.floor[k];if(D[id])drawFloorTile(id,+p[0],+p[1]);}
}

/* ---------- 입구까지 길 잇기 ----------
   건물의 입구·출구 앞에서 이미 걸어서 닿는 바닥까지, 잔디를 가장 적게 지나는 길을 찾아 보도블록을 깐다.
   잔디 칸은 비용 1, 이미 걸을 수 있는 칸은 0으로 보는 0-1 너비 우선 탐색 */
var LINK_FLOOR='f_block';
function linkPlan(b){
  if(!b||!b.door)return {why:'입구·출구가 없는 건물이에요'};
  var spots=[b.door.ent];if(!sameSpot(b.door.ent,b.door.ext))spots.push(b.door.ext);
  var add={},tiles=[];
  for(var i=0;i<spots.length;i++){
    var s=spots[i];
    if(s.l>0){var dn0=doorNode(s);if(dn0>=0&&NAV.reach[dn0])continue;return {why:'위층 문은 계단·다리로 이어 주세요'};}
    var o=doorOut(s);
    if(o.y>=PZ)continue;
    var r=walkSearch(o.x,o.y,add);if(!r)return {why:'이을 수 있는 자리가 없어요. 문 위치를 바꿔 보세요'};
    r.forEach(function(t){var k=t.x+','+t.y;if(!add[k]){add[k]=1;tiles.push(t);}});
  }
  return {tiles:tiles,cost:tiles.length*D[LINK_FLOOR].cost};
}
function walkSearch(sx,sy,add){
  var free=function(x,y){return x>=0&&y>=0&&x<COLS&&y<PZ&&!occ[y][x];};
  var walk=function(x,y){return groundOk(x,y)||!!add[x+','+y];};
  var goal=function(x,y){return (walk(x,y)&&!!NAV.reach[gid(x,y)])||(x===ENT&&y===PZ-1);};
  if(!free(sx,sy))return null;
  var dist={},prev={},dq=[[sx,sy]],k0=sx+','+sy;dist[k0]=walk(sx,sy)?0:1;
  while(dq.length){
    var c=dq.shift(),ck=c[0]+','+c[1];
    if(goal(c[0],c[1])){
      var out=[],k=ck;
      while(k!=null){var p=k.split(','),px=+p[0],py=+p[1];if(!walk(px,py))out.push({x:px,y:py});k=prev[k];}
      return out;
    }
    for(var d=0;d<4;d++){
      var nx=c[0]+DIRS[d][0],ny=c[1]+DIRS[d][1];if(!free(nx,ny))continue;
      var w=walk(nx,ny)?0:1,nk=nx+','+ny,nd=dist[ck]+w;
      if(dist[nk]==null||nd<dist[nk]){dist[nk]=nd;prev[nk]=ck;if(w)dq.push([nx,ny]);else dq.unshift([nx,ny]);}
    }
  }
  return null;
}
function linkDoor(b){
  var p=linkPlan(b);if(p.why)return p.why;
  if(!p.tiles.length)return '이미 길이 이어져 있어요';
  if(S.money<p.cost)return '자금이 부족해요 ('+fmt(p.cost)+' 필요)';
  S.money-=p.cost;p.tiles.forEach(function(t){S.floor[t.x+','+t.y]=LINK_FLOOR;});
  recalc();save();return '';
}
