'use strict';
/* ---------- 바닥 타일 ----------
   땅 칸에 칠하는 바닥(보도블록·벽돌·자갈·나무·꽃잔디). 걸어 다닐 수 있고 분위기 점수를 조금 올린다.
   S.floor = {"x,y": 정의 id} */
function isFloorDef(id){return !!D[id]&&D[id].kind==='floor';}
/* 바닥을 칠할 곳: 땅 칸(S.floor) 또는 데크 조각(p.f, pid로 고른다) */
function floorSlot(x,y,pid){
  if(pid){var p=pieceById(pid);if(!p||!isDeckPiece(p))return null;
    return {get:function(){return p.f||null;},set:function(v){if(v)p.f=v;else delete p.f;},busy:deckCovered(p)};}
  var k=x+','+y;
  return {get:function(){return S.floor[k]||null;},set:function(v){if(v)S.floor[k]=v;else delete S.floor[k];},busy:!!occ[y][x]&&!(DECK.up&&DECK.up[y][x])};
}
// 칠할 수 없으면 그 까닭 (아무것도 바꾸지 않는다)
function floorWhy(x,y,id,pid){
  if(x<0||y<0||x>=COLS||y>=ROWS-1)return '부지 밖이에요';
  if(y>=PZ)return '주차 구역은 이미 포장돼 있어요';
  var sl=floorSlot(x,y,pid);if(!sl)return '데크가 없어요';
  if(sl.busy)return '건물이 있어요';
  var prev=sl.get();
  if(id==='f_erase')return prev?'':'지울 바닥이 없어요';
  if(prev===id)return '이미 같은 바닥이에요';
  if(S.money<floorSwapCost(prev,id))return '자금이 부족해요';
  return '';
}
function paintFloor(x,y,id,pid){
  var why=floorWhy(x,y,id,pid);if(why&&why!=='자금이 부족해요')return why;
  var sl=floorSlot(x,y,pid),prev=sl.get();
  if(id==='f_erase'){sl.set(null);S.money+=Math.floor(D[prev].cost*0.5);}
  // 깔린 바닥 위에 다른 바닥을 깔면 걷어낸 반값을 빼고 계산한다
  else{var c=floorSwapCost(prev,id);if(S.money<c)return '자금이 부족해요';S.money-=c;sl.set(id);addFresh(D[id].beauty);}
  if(UI.undo)UI.undo.push({x:x,y:y,pid:pid||0,prev:prev,id:id,c:id==='f_erase'?0:floorSwapCost(prev,id),fr:id==='f_erase'?0:(D[id].beauty||0)});
  recalc();save();return '';
}
function floorUndo(){
  var u=UI.undo.pop();if(!u)return false;
  var sl=floorSlot(u.x,u.y,u.pid);if(!sl)return false;
  if(u.id==='f_erase'){sl.set(u.prev);S.money-=Math.floor(D[u.prev].cost*0.5);}
  // 되돌리면 값과 함께 '새로 꾸민 효과'도 되돌린다 (깔고 되돌리기로 꾸밈 보너스를 공짜로 쌓지 못하게)
  else{sl.set(u.prev);S.money+=u.c!=null?u.c:D[u.id].cost;S.fresh=Math.max(0,(S.fresh||0)-(u.fr||0));}
  recalc();save();return true;
}
/* 깔린 바닥을 다른 종류로 바꾸기: 걷어낼 때 돌려받는 반값을 새 바닥 값에서 빼고 계산한다.
   id가 'f_erase'면 걷어낸다(반값 환불). 데크 조각은 pid로 고른다 */
var FLOOR_IDS=['f_block','f_brick','f_gravel','f_wood','f_step','f_clover'];
function floorSwapCost(prev,id){return (id==='f_erase'?0:D[id].cost)-(prev?Math.floor(D[prev].cost*.5):0);}
function floorSwap(x,y,id,pid){
  var sl=floorSlot(x,y,pid);if(!sl)return '바닥이 없어요';
  if(sl.busy)return '건물이 있어요';
  var prev=sl.get();
  if(id==='f_erase'&&!prev)return '걷어낼 바닥이 없어요';
  if(prev===id)return '이미 같은 바닥이에요';
  var c=floorSwapCost(prev,id);if(c>0&&S.money<c)return '자금이 '+fmt(c-S.money)+' 모자라요';
  S.money-=c;sl.set(id==='f_erase'?null:id);if(id!=='f_erase')addFresh(D[id].beauty);recalc();save();return '';
}
function floorLine(c,ax,ay,bx,by){var a=rotPt(ax,ay),b=rotPt(bx,by),p=P(a[0],a[1],.006),q=P(b[0],b[1],.006);c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);}
var FLOOR_TEX={f_block:'t_block',f_brick:'t_brick',f_gravel:'t_gravel',f_wood:'t_wood',f_step:'t_step',f_clover:'t_clover'};
function drawFloorTile(id,x,y){
  var d=D[id],r=rrect(x,y,x+1,y+1),c=PJ.c,i;
  // 질감 그림이 있으면 그것으로 (이웃 칸과 이음새 없이 이어진다)
  var tp=FLOOR_TEX[id]&&texPattern(FLOOR_TEX[id],1);
  if(tp){quad([[r.x0,r.y0,.005],[r.x1,r.y0,.005],[r.x1,r.y1,.005],[r.x0,r.y1,.005]],tp,'rgba(0,0,0,.06)');return;}
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
  for(var k in S.floor){var p=k.split(','),id=S.floor[k],fx=+p[0],fy=+p[1];if(D[id]&&!th(fx,fy)&&!isRamp(fx,fy))drawFloorTile(id,fx,fy);}
}

/* ---------- 입구까지 길 잇기 ----------
   건물의 입구·출구 앞에서 이미 걸어서 닿는 바닥까지, 잔디를 가장 적게 지나는 길을 찾아 고른 바닥(기본 보도블록)을 깐다.
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
    if(o.x<0||o.y<0||o.x>=COLS||groundPort(o.x,o.y,OPP[s.d])!==bLevel(b))return {why:'문 앞 땅 높이가 달라요. 경사로나 계단으로 이어 주세요'};
    var r=walkSearch(o.x,o.y,add);if(!r)return {why:'문 앞이 막혀 길을 이을 수 없어요'};
    r.forEach(function(t){var k=t.x+','+t.y;if(!add[k]){add[k]=1;tiles.push(t);}});
  }
  return {tiles:tiles,cost:tiles.length*D[LINK_FLOOR].cost};
}
// 지금 문으로는 길을 이을 수 없을 때: 이을 수 있는 다른 문 자리(1층, 길이 가장 짧은 곳)를 찾는다. 없으면 null
function doorFix(b){
  if(!b||!b.door)return null;
  var keep=b.door,best=null,bn=1e9;
  doorSpots(b).forEach(function(s){
    if(s.l!==0)return;
    b.door={ent:s,ext:{x:s.x,y:s.y,d:s.d,l:s.l}};
    var lp=linkPlan(b);if(!lp.why&&lp.tiles.length<bn){bn=lp.tiles.length;best=s;}
  });
  b.door=keep;return best;
}
function applyDoorFix(b){
  var s=doorFix(b);if(!s)return '문을 옮겨도 길을 이을 자리가 없어요. 둘레를 막은 것을 치우거나 건물을 옮겨 주세요';
  b.door={ent:s,ext:{x:s.x,y:s.y,d:s.d,l:s.l}};recalc();save();return '';
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
      var gp=groundPort(c[0],c[1],d);if(gp<0||groundPort(nx,ny,OPP[d])!==gp)continue;
      var w=walk(nx,ny)?0:1,nk=nx+','+ny,nd=dist[ck]+w;
      if(dist[nk]==null||nd<dist[nk]){dist[nk]=nd;prev[nk]=ck;if(w)dq.push([nx,ny]);else dq.unshift([nx,ny]);}
    }
  }
  return null;
}
function linkDoor(b,fid){
  var p=linkPlan(b);if(p.why)return p.why;
  if(!p.tiles.length)return '이미 길이 이어져 있어요';
  var id=FLOOR_IDS.indexOf(fid)>=0?fid:LINK_FLOOR,c=p.tiles.length*D[id].cost;
  if(S.money<c)return '자금이 부족해요 ('+fmt(c)+' 필요)';
  S.money-=c;p.tiles.forEach(function(t){S.floor[t.x+','+t.y]=id;});
  recalc();save();return '';
}
