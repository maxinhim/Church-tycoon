'use strict';
/* ---------- 입구·출구 건물 ----------
   방문자가 쓰는 건물(이용 효과가 있는 건물)은 입구 건물과 출구 건물을 하나씩 지어야 운영된다.
   · 입구·출구는 한 칸짜리. 건물 바로 옆 칸에 붙여 짓고, 건물 반대쪽(바깥)을 바라본다
   · 방문자는 입구 바깥 칸에서 들어가고 출구 바깥 칸으로 나온다. 대기줄은 입구 바깥 칸부터 깐다
   · 높은 데크 위에 지으면 그 높이 층으로 드나든다 (계단·다리로 2층에 들어가는 길)
   gate 건물: {def, x, y, face(바깥쪽 DIRS 번호), of(붙은 건물 id)}. 건물 쪽에서는 b.door = {ent, ext}로 읽는다
   (둘 다 있고 제자리에 붙어 있을 때만. 없으면 b.door가 없고 이용할 수 없다) */
// 모양 목록(GATE_DESIGNS)은 정의를 만드는 buildings.js에 있다
function AUTOGATE(){return typeof window!=='undefined'&&!!window.__CT_TEST&&!window.__CT_GATES;}
function isGateDef(d){return !!d&&d.kind==='gate';}
function isGate(b){return !!b&&isGateDef(D[b.def]);}
function gateId(role,design){return (role==='ent'?'g_':'x_')+design;}
// 이 칸에 gate를 지으면 붙을 건물과 바깥 방향. 없으면 null
function gateAttach(x,y,gl,want){
  var best=null;
  for(var d=0;d<4&&!best;d++){
    var tx=x-DIRS[d][0],ty=y-DIRS[d][1];if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    var id=occ[ty][tx],b=id&&bById(id);
    if(!b||isGate(b)||!needsGates(b))continue;
    if(want&&b.id!==want)continue;
    // 건물의 그 칸에 gate 높이의 벽이 있어야 한다
    if(!wallAt(b,tx,ty,gl))continue;
    best={b:b,d:d};
  }
  return best;
}
function gateLevel(g){return bLevel(g);}
function gatesOf(b){var o={};S.buildings.forEach(function(g){if(isGate(g)&&g.of===b.id)o[D[g.def].role]=g;});return o;}
// gate가 지금도 제자리(건물 옆, 바깥을 봄)에 붙어 있는지
function gateOk(g,b){
  if(!g||!b)return false;
  var tx=g.x-DIRS[g.face][0],ty=g.y-DIRS[g.face][1];
  return tx>=0&&ty>=0&&tx<COLS&&ty<ROWS&&occ[ty][tx]===b.id&&wallAt(b,tx,ty,gateLevel(g));
}
function gateSpot(g,b){return {x:g.x,y:g.y,d:g.face,l:gateLevel(g)-bLevel(b)};}
// 지을 수 없는 까닭 (place.js placeWhy에서 함께 본다)
function gateAttachWhy(d,x,y){
  var pl=placeLevel(d,x,y,2);if(pl.why)return pl.why;
  var role=d.role,want=UI.gateFor&&bById(UI.gateFor)?UI.gateFor:0,a=gateAttach(x,y,pl.l,want);
  if(!a)return want?defOf(bById(want)).name+' 바로 옆 칸에 붙여 지어요':'입구·출구는 건물 바로 옆 칸에 붙여 지어요';
  var g=gatesOf(a.b)[role];if(g&&g.id!==movingId())return '이미 '+(role==='ent'?'입구':'출구')+'가 있어요. 그것을 옮기거나 철거하세요';
  return '';
}
function buildGate(id,x,y){
  var d=D[id],why=gateAttachWhy(d,x,y);if(why)return why;
  if(S.money<d.cost)return '자금이 부족해요';
  var pl=placeLevel(d,x,y,2),a=gateAttach(x,y,pl.l,UI.gateFor&&bById(UI.gateFor)?UI.gateFor:0);
  S.money-=d.cost;
  var g={id:S.nextId++,def:id,x:x,y:y,face:a.d,of:a.b.id,inUse:0,uses:0,bw:S.week};setPlaceLevel(g,d,x,y,2);
  S.buildings.push(g);rebuildOcc();bump();recalc();save();return '';
}
/* 입구·출구 자리 고르기: 건물 둘레 칸마다 점수. 바깥 칸이 이미 걷는 길이면(입구에서 닿으면 더) 좋고, 정면이면 조금 더.
   다른 것이 차지한 칸은 뺀다 */
function gateCands(b,id){
  var d=D[id],out=[],seen={},ts=bTiles(b),face=b.face!=null?b.face:2,cx=0,cy=0;
  ts.forEach(function(t){cx+=t.x+.5;cy+=t.y+.5;});cx/=ts.length;cy/=ts.length;
  ts.forEach(function(t){for(var k=0;k<4;k++){
    var x=t.x+DIRS[k][0],y=t.y+DIRS[k][1],key=x+','+y;if(seen[key])continue;seen[key]=1;
    if(x<0||y<0||x>=COLS||y>=PZ||occ[y][x])continue;
    var pl=placeLevel(d,x,y,2);if(pl.why||pl.l!==bLevel(b))continue;
    var a=gateAttach(x,y,pl.l,b.id);if(!a)continue;
    var ox=x+DIRS[a.d][0],oy=y+DIRS[a.d][1],sc=0;
    if(ox<0||oy<0||ox>=COLS||oy>=PZ)continue;
    if(groundOk(ox,oy)&&groundPort(ox,oy,OPP[a.d])===pl.l)sc+=NAV.reach&&NAV.reach[gid(ox,oy)]?100:60;
    else if(occ[oy][ox])sc-=1000;
    if(a.d===face)sc+=10;
    // 이미 사람이 다니는 길 위는 피한다 (입구가 길을 끊지 않게)
    if(S.floor[key]||groundOk(x,y))sc-=80;
    sc-=(Math.abs(x+.5-cx)+Math.abs(y+.5-cy))*.2;
    out.push({x:x,y:y,v:sc});
  }});
  return out.sort(function(p,q){return q.v-p.v;});
}
// 가장 좋은 자리 (avoid: 방금 지은 입구 — 바로 옆은 조금 덜 좋게 보아 입구와 출구가 떨어지게)
function gateBest(b,id,avoid){
  var L=gateCands(b,id);
  if(avoid)L.forEach(function(c){if(Math.abs(c.x-avoid.x)+Math.abs(c.y-avoid.y)<=1)c.v-=20;});
  L.sort(function(p,q){return q.v-p.v;});
  return L[0]||null;
}
// 입구·출구를 가장 좋은 자리에 바로 짓는다 (시작 교회·시뮬레이션 봇·테스트용). free면 값을 받지 않는다
function autoGates(b,entId,extId,free){
  if(!needsGates(b))return '';
  var gs=gatesOf(b),keep=UI.gateFor,out='';UI.gateFor=b.id;
  [['ent',entId||'g_arch'],['ext',extId||'x_arch']].forEach(function(r){
    if(out||gs[r[0]])return;
    var c=gateBest(b,r[1],gs.ent);if(!c){out='자리가 없어요';return;}
    if(free)S.money+=D[r[1]].cost;
    var w=buildGate(r[1],c.x,c.y);if(w){if(free)S.money-=D[r[1]].cost;out=w;return;}
    if(free)S.buildings[S.buildings.length-1].free=true;
    gs=gatesOf(b);
  });
  UI.gateFor=keep;return out;
}
// 건물을 옮기거나 칸을 지워 제자리를 잃은 gate를 걷어 낸다 (값은 모두 돌려준다)
function dropLooseGates(){
  var n=0;
  S.buildings=S.buildings.filter(function(g){
    if(!isGate(g))return true;
    var b=bById(g.of);if(b&&gateOk(g,b))return true;
    if(!g.free)S.money+=D[g.def].cost;n++;return false;
  });
  if(n)rebuildOcc();
  return n;
}
// 건물을 철거하면 붙은 gate도 함께 (철거 값 규칙대로 반값)
function demolishGatesOf(b,full){
  // 같은 주에 지은 것은 건물 되돌리기와 함께 전액 (unbuild가 full로 부른다). 값을 받지 않고 지은 것은 돌려주지 않는다
  S.buildings=S.buildings.filter(function(g){if(isGate(g)&&g.of===b.id){if(!g.free)S.money+=full?D[g.def].cost:Math.floor(D[g.def].cost*.5);return false;}return true;});
}

/* ---------- 그리기: 한 칸짜리 문틀. 지나가는 방향(face 축)과 직각으로 선다. 입구는 초록, 출구는 주황 간판 ---------- */
function drawGateEnt(b){
  var d=D[b.def],f=b.face==null?2:b.face,x=b.x,y=b.y,ax=f<2,c=PJ.c,s=PJ.s;
  // 문틀 가로 방향 (지나가는 방향과 직각)
  var post=function(u,z1,col,w){w=w||.09;var px=ax?x+.5:x+u,py=ax?y+u:y+.5;box(rrect(px-w,py-w,px+w,py+w),0,z1,col);};
  var beam=function(z0,z1,col,u0,u1){u0=u0==null?.08:u0;u1=u1==null?.92:u1;box(ax?rrect(x+.42,y+u0,x+.58,y+u1):rrect(x+u0,y+.42,x+u1,y+.58),z0,z1,col);};
  var sign=d.role==='ent'?'#3f9d5a':'#e08a2c',ds=d.design;
  if(ds==='arch'){post(.14,.75,'#b5654a',.1);post(.86,.75,'#b5654a',.1);
    var n=8;for(var i=0;i<n;i++){var u0=.08+.84*i/n,u1=.08+.84*(i+1)/n,zz=.75+.18*Math.sin(Math.PI*(i+.5)/n);beam(zz-.08,zz,'#a85a42',u0,u1);}}
  else if(ds==='wood'){post(.12,.85,'#7a5530');post(.88,.85,'#7a5530');beam(.82,.92,'#8d6339',.04,.96);beam(.92,.96,'#5f4126',.0,1);}
  else if(ds==='glass'){post(.1,.8,'#59626b',.06);post(.9,.8,'#59626b',.06);beam(.78,.86,'#59626b');
    c.globalAlpha=.45;box(ax?rrect(x+.48,y+.16,x+.52,y+.84):rrect(x+.16,y+.48,x+.84,y+.52),.04,.76,'#9cc3e3');c.globalAlpha=1;}
  else if(ds==='stone'){post(.13,.9,'#cfc6b4',.12);post(.87,.9,'#cfc6b4',.12);beam(.86,.98,'#bdb3a0',.0,1);}
  else{post(.12,.8,'#e8e2d4',.06);post(.88,.8,'#e8e2d4',.06);beam(.78,.84,'#e8e2d4');
    var cols=['#e57aa5','#f2c230','#ffffff','#d6604f'];for(var k=0;k<7;k++){var u=.1+.8*k/6,pp=rotPt(ax?x+.5:x+u,ax?y+u:y+.5),q=P(pp[0],pp[1],.86+.05*Math.sin(k*1.7));c.fillStyle=cols[k%4];c.beginPath();c.arc(q[0],q[1],2.2*s,0,6.283);c.fill();}}
  // 간판: 문틀 위 가운데, 바깥쪽에
  var m=rotPt(x+.5+DIRS[f][0]*.12,y+.5+DIRS[f][1]*.12),q2=P(m[0],m[1],1.02);
  c.fillStyle=sign;c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.arc(q2[0],q2[1],5.5*Math.max(.8,s),0,6.283);c.fill();c.stroke();
  c.fillStyle='#fff';c.font='800 '+(7*Math.max(.8,s))+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(d.role==='ent'?'입':'출',q2[0],q2[1]+.5);
}
