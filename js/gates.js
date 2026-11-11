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

/* ---------- 그리기: 한 칸짜리 작은 현관 건물 (벽·지붕·바깥쪽 문·간판). 그림은 나중에 생성 이미지로 바꾼다 ---------- */
var GATE_LOOK={
  arch:{wall:'#b5654a',roof:'#6b3b2e',kind:'hip',door:'#3d2a20',arch:1},
  wood:{wall:'#a97a4a',roof:'#5f4126',kind:'gable',door:'#4a3220'},
  glass:{wall:'#c9dce8',roof:'#59626b',kind:'flat',door:'#6f9fc4',glass:1},
  stone:{wall:'#cfc6b4',roof:'#9c9483',kind:'flat',door:'#4a4038'},
  flower:{wall:'#f3ece0',roof:'#d6604f',kind:'gable',door:'#7a5530',flower:1}
};
function drawGateEnt(b){
  var d=D[b.def],L=GATE_LOOK[d.design]||GATE_LOOK.arch,f=b.face==null?2:b.face,x=b.x,y=b.y,c=PJ.c,s=PJ.s;
  var r=rrect(x+.1,y+.1,x+.9,y+.9),H=.62;
  box(r,0,H,L.wall);
  if(L.glass){c.globalAlpha=.35;box(rrect(x+.14,y+.14,x+.86,y+.86),.08,H-.06,'#ffffff');c.globalAlpha=1;}
  // 지붕
  var top;
  if(L.kind==='hip')top=hip(r,H,.34,L.roof);
  else if(L.kind==='gable')top=gable(r,H,.32,L.roof,L.wall,f<2?false:true);
  else{box(rrect(x+.06,y+.06,x+.94,y+.94),H,H+.08,L.roof);top=null;}
  // 바깥쪽 벽의 문: 화면 앞쪽을 향한 벽일 때만 보인다
  var cx=x+.5,cy=y+.5,ox=DIRS[f][0],oy=DIRS[f][1],a=rotPt(cx,cy),q=rotPt(cx+ox,cy+oy);
  var front=Math.round(q[0]-a[0])===1||Math.round(q[1]-a[1])===1;
  if(front){
    var wx=cx+ox*.405,wy=cy+oy*.405,tx=-oy,ty=ox,hw=.15,z1=.44;
    var p1=rotPt(wx-tx*hw,wy-ty*hw),p2=rotPt(wx+tx*hw,wy+ty*hw);
    quad([[p1[0],p1[1],.02],[p2[0],p2[1],.02],[p2[0],p2[1],z1],[p1[0],p1[1],z1]],L.door,EDGE);
    if(L.arch){var pm=rotPt(wx,wy);quad([[p1[0],p1[1],z1],[p2[0],p2[1],z1],[pm[0],pm[1],z1+.08]],L.door,null);}
    // 문 앞 디딤돌
    var s1=rotPt(wx-tx*.2+ox*.02,wy-ty*.2+oy*.02),s2=rotPt(wx+tx*.2+ox*.02,wy+ty*.2+oy*.02),s3=rotPt(wx+tx*.2+ox*.12,wy+ty*.2+oy*.12),s4=rotPt(wx-tx*.2+ox*.12,wy-ty*.2+oy*.12);
    quad([[s1[0],s1[1],.02],[s2[0],s2[1],.02],[s3[0],s3[1],.02],[s4[0],s4[1],.02]],'#d8d2c6',EDGE);
  }
  if(L.flower){var cols=['#e57aa5','#f2c230','#ffffff','#d6604f'];for(var k=0;k<6;k++){var u=.14+.72*k/5,pp=rotPt(f<2?x+.5-ox*.42:x+u,f<2?y+u:y+.5-oy*.42),pq=P(pp[0],pp[1],.05);c.fillStyle=cols[k%4];c.beginPath();c.arc(pq[0],pq[1],2*s,0,6.283);c.fill();}}
  // 간판: 문 위(문이 뒤쪽이면 지붕 위)
  var sm=front?rotPt(cx+ox*.42,cy+oy*.42):rotPt(cx,cy),sq=P(sm[0],sm[1],front?H+.02:H+.45);
  c.fillStyle=d.role==='ent'?'#3f9d5a':'#e08a2c';c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.arc(sq[0],sq[1],5.5*Math.max(.8,s),0,6.283);c.fill();c.stroke();
  c.fillStyle='#fff';c.font='800 '+(7*Math.max(.8,s))+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(d.role==='ent'?'입':'출',sq[0],sq[1]+.5);
}
