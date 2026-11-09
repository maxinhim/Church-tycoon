'use strict';
/* ---------- 길·계단·다리 ----------
   조각: {id,x,y,l,s,d,k}
   l = 아래쪽 높이(층 단위, 0=땅), s = 0 평지 / 1 경사(한 칸에 한 층 오름),
   d = 경사가 올라가는 방향(DIRS 순서), k = 종류(PATHK).
   계단은 아래가 빈 철골 계단이라 계단 밑과 다리 아래 땅을 그대로 걸을 수 있다.
   연결 다리(k='sky')는 같은 역할 건물의 위층끼리 잇는 실내 통로로, 바깥 길찾기에는 들어가지 않는다. */
var LV=.9,MAXL=4;
var PATHK={stone:{name:'돌길',col:'#d6c6a6',edge:'#9c8664',cost:40},wood:{name:'나무 데크',col:'#b98c58',edge:'#7a5530',cost:60},
  sky:{name:'연결 다리',col:'#c9d6df',edge:'#5f7a8f',cost:120}};
var SCREEN_DIRS=[[1,0],[0,1],[-1,0],[0,-1]]; // 화면 기준 ↘ ↙ ↖ ↗ (회전된 좌표)

function piecesAt(x,y){return S.paths.filter(function(p){return p.x===x&&p.y===y;});}
function pieceById(id){for(var i=0;i<S.paths.length;i++)if(S.paths[i].id===id)return S.paths[i];return null;}
function pieceTop(p){return p.l+p.s;}
// d 방향 면이 열린 높이. 경사의 옆면은 막혀 있어 -1
function portLevel(p,d){if(!p.s)return p.l;if(d===p.d)return p.l+1;if(d===OPP[p.d])return p.l;return -1;}
function pieceCost(p){return p.s?90+(p.l>0?30:0):PATHK[p.k].cost+(p.l>0?30:0);}
function pieceName(p){return p.k==='sky'?'연결 다리':(p.s?'철골 계단':PATHK[p.k].name+(p.l>0?' 다리':''));}
// p 위치의 표면 높이(층 단위가 아니라 z)
function pieceH(p,wx,wy){
  if(!p.s)return p.l*LV;
  var t=[wx-p.x,p.x+1-wx,wy-p.y,p.y+1-wy][p.d];
  return (p.l+clamp(t,0,1))*LV;
}
function pieceFits(p){
  if(p.x<0||p.y<0||p.x>=COLS||p.y>=ROWS-1)return '부지 밖이에요';
  if(p.l<0)return '땅보다 낮게는 지을 수 없어요';
  if(pieceTop(p)>MAXL)return MAXL+'층 높이보다 높게는 지을 수 없어요';
  if(p.k==='sky'&&p.s)return '연결 다리는 평지로만 지을 수 있어요';
  if(p.k==='sky'&&p.l<1)return '연결 다리는 2층 높이부터 지을 수 있어요';
  if(occ[p.y][p.x])return '건물이 있어요';
  var ps=piecesAt(p.x,p.y);
  for(var i=0;i<ps.length;i++){
    var q=ps[i];
    if(!(p.l>=pieceTop(q)+1||q.l>=pieceTop(p)+1))return '이미 길이 있어요';
  }
  return '';
}
function pathsChanged(){rebuildOcc();bump();recalc();save();}
function addPiece(p){
  var why=pieceFits(p);if(why)return why;
  var c=pieceCost(p);if(S.money<c)return '자금이 부족해요';
  S.money-=c;p.id=S.nextPid++;S.paths.push(p);
  pathsChanged();return '';
}
function removePiece(id,rate){
  var p=pieceById(id);if(!p)return false;
  S.money+=Math.floor(pieceCost(p)*rate);
  S.paths=S.paths.filter(function(q){return q!==p;});
  pathsChanged();return true;
}

/* ---------- 짓기 커서: 방향·경사를 골라 한 칸씩 잇는다 ---------- */
function screenToWorldDir(i){
  var c=COLS/2,a=unrot(c,c),b=unrot(c+SCREEN_DIRS[i][0],c+SCREEN_DIRS[i][1]);
  var dx=Math.round(b[0]-a[0]),dy=Math.round(b[1]-a[1]);
  for(var d=0;d<4;d++)if(DIRS[d][0]===dx&&DIRS[d][1]===dy)return d;
  return 0;
}
function worldToScreenDir(d){for(var i=0;i<4;i++)if(screenToWorldDir(i)===d)return i;return 0;}
function newCursor(){return {x:null,y:null,l:0,dir:screenToWorldDir(3),slope:0,k:'stone',hist:[]};}
// 커서에서 다음에 지을 조각
function pcPiece(){
  var c=UI.pc;if(!c||c.x==null)return null;
  if(c.k==='sky')return {x:c.x,y:c.y,l:c.l,s:0,d:c.dir,k:c.k};
  if(c.slope>0)return {x:c.x,y:c.y,l:c.l,s:1,d:c.dir,k:c.k};
  if(c.slope<0)return {x:c.x,y:c.y,l:c.l-1,s:1,d:OPP[c.dir],k:c.k};
  return {x:c.x,y:c.y,l:c.l,s:0,d:c.dir,k:c.k};
}
function pcBuild(){
  var p=pcPiece();if(!p)return '시작할 곳을 먼저 누르세요';
  var why=addPiece(p);if(why)return why;
  var c=UI.pc;
  c.hist.push({x:c.x,y:c.y,l:c.l,id:p.id});
  c.x+=DIRS[c.dir][0];c.y+=DIRS[c.dir][1];if(c.k!=='sky')c.l+=c.slope;
  return '';
}
function pcUndo(){
  var c=UI.pc,h=c&&c.hist.pop();if(!h)return false;
  removePiece(h.id,1);c.x=h.x;c.y=h.y;c.l=h.l;return true;
}
// 화면에서 가장 위에 보이는 길 조각
function pickPieceAt(px,py){
  for(var z=MAXL*LV+.3;z>=-.01;z-=.03){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    var ps=piecesAt(tx,ty);
    for(var i=0;i<ps.length;i++)if(Math.abs(z-pieceH(ps[i],w[0],w[1]))<.05)return ps[i];
  }
  return null;
}
// 누른 곳에서 짓기 시작: 길 조각을 누르면 그 조각 끝에서, 땅을 누르면 그 칸에서
function pcStartAt(px,py){
  var c=UI.pc,p=pickPieceAt(px,py);
  if(p){
    var pl=portLevel(p,c.dir);
    if(pl<0){c.dir=p.d;pl=p.l+1;}
    c.x=p.x+DIRS[c.dir][0];c.y=p.y+DIRS[c.dir][1];c.l=pl;
  }else{var t=groundTile(px,py);c.x=t.x;c.y=t.y;c.l=0;}
  c.hist=[];
}

/* ---------- 그리기 ---------- */
// 조각이 d 방향으로 무언가(땅·다른 조각·문)와 이어져 있는지 — 난간을 그릴지 정한다
function pieceLinked(p,d){
  var pl=portLevel(p,d);if(pl<0)return false;
  var nx=p.x+DIRS[d][0],ny=p.y+DIRS[d][1];
  if(pl===0)return true;
  if(pieceNodeAt(nx,ny,OPP[d],pl)>=0)return true;
  return S.buildings.some(function(b){
    return b.door&&[b.door.ent,b.door.ext].some(function(s){return s.l===pl&&s.x===nx&&s.y===ny&&s.d===OPP[d];});
  });
}
function drawPiece(p,tint){
  if(p.k==='sky'){drawSkyPiece(p,tint);return;}
  if(p.s){drawStair(p,tint);return;}
  var K=PATHK[p.k],top=tint||K.col,edge=tint?'rgba(255,255,255,.8)':K.edge,c=PJ.c;
  var lift=(!p.s&&p.l===0)?.012:0,deck=.12;
  var W=[[p.x,p.y],[p.x+1,p.y],[p.x+1,p.y+1],[p.x,p.y+1]];
  var C=W.map(function(w){var r=rotPt(w[0],w[1]);return {rx:r[0],ry:r[1],h:pieceH(p,w[0],w[1])+lift};});
  var R=rrect(p.x,p.y,p.x+1,p.y+1);
  // 기둥: 공중에 뜬 부분 아래
  if(p.l>0){var cx=p.x+.5,cy=p.y+.5;box(rrect(cx-.07,cy-.07,cx+.07,cy+.07),0,pieceH(p,cx,cy)-deck,tint||'#b7a68d');}
  // 앞쪽 두 옆면(화면 기준 오른쪽 아래·왼쪽 아래)
  var bottom=function(h){return p.l===0?0:h-deck;};
  var side=function(sel,shadeK){
    var e=C.filter(sel);if(e.length!==2)return;
    if(p.l===0&&!p.s)return;
    quad([[e[0].rx,e[0].ry,bottom(e[0].h)],[e[1].rx,e[1].ry,bottom(e[1].h)],[e[1].rx,e[1].ry,e[1].h],[e[0].rx,e[0].ry,e[0].h]],shade(tint||(p.k==='wood'?'#8d6339':'#b3a283'),shadeK),EDGE);
  };
  side(function(q){return Math.abs(q.ry-R.y1)<1e-6;},.93);
  side(function(q){return Math.abs(q.rx-R.x1)<1e-6;},.74);
  // 윗면
  var ord=[0,1,2,3].map(function(i){return C[i];});
  quad(ord.map(function(q){return [q.rx,q.ry,q.h];}),top,edge);
  // 계단 단·데크 널빤지 선
  c.strokeStyle=tint?'rgba(255,255,255,.5)':'rgba(60,40,20,.28)';c.lineWidth=Math.max(.5,PJ.s*.8);c.beginPath();
  var dd=p.s?p.d:(p.k==='wood'?p.d:-1);
  if(dd>=0){
    var n=p.s?4:5;
    for(var i=1;i<n;i++){
      var t=i/n,ax,ay,bx,by;
      if(dd===0||dd===1){ax=bx=(dd===0?p.x+t:p.x+1-t);ay=p.y+.04;by=p.y+.96;}
      else{ay=by=(dd===2?p.y+t:p.y+1-t);ax=p.x+.04;bx=p.x+.96;}
      var ra=rotPt(ax,ay),rb=rotPt(bx,by),qa=P(ra[0],ra[1],pieceH(p,ax,ay)+lift),qb=P(rb[0],rb[1],pieceH(p,bx,by)+lift);
      c.moveTo(qa[0],qa[1]);c.lineTo(qb[0],qb[1]);
    }
  }
  c.stroke();
  // 난간: 공중에 뜬 조각에서 이어지지 않은 면
  if(p.l>0||p.s){
    c.strokeStyle=tint?'rgba(255,255,255,.85)':'#f3efe6';c.lineWidth=Math.max(.8,1.4*PJ.s);c.beginPath();
    for(var d=0;d<4;d++){
      if(pieceLinked(p,d))continue;
      var a,b2;
      if(d===0){a=[p.x+1,p.y];b2=[p.x+1,p.y+1];}else if(d===1){a=[p.x,p.y];b2=[p.x,p.y+1];}
      else if(d===2){a=[p.x,p.y+1];b2=[p.x+1,p.y+1];}else{a=[p.x,p.y];b2=[p.x+1,p.y];}
      if(p.l===0&&p.s&&(d===p.d||d===OPP[p.d]))continue;
      var r1=rotPt(a[0],a[1]),r2=rotPt(b2[0],b2[1]),h1=pieceH(p,a[0],a[1]),h2=pieceH(p,b2[0],b2[1]);
      var s1=P(r1[0],r1[1],h1),s2=P(r2[0],r2[1],h2),t1=P(r1[0],r1[1],h1+.32),t2=P(r2[0],r2[1],h2+.32);
      c.moveTo(s1[0],s1[1]);c.lineTo(t1[0],t1[1]);c.lineTo(t2[0],t2[1]);c.lineTo(s2[0],s2[1]);
    }
    c.stroke();
  }
}
// 짓기 미리보기: 다음 조각과 진행 방향 화살표
function drawPathGhost(){
  var p=pcPiece();if(!p)return;
  var why=pieceFits(p)||(S.money<pieceCost(p)?'money':''),c=PJ.c;
  c.globalAlpha=.62;drawPiece(p,why?'#f07a6e':'#7fe0a0');c.globalAlpha=1;
  // 다음 칸 쪽을 가리키는 화살표 (다음 조각이 시작할 높이에)
  var cu=UI.pc,dx=DIRS[cu.dir][0],dy=DIRS[cu.dir][1],z=(cu.l+cu.slope)*LV+.06;
  var cx=cu.x+.5,cy=cu.y+.5,tip=[cx+dx*.98,cy+dy*.98],bx=cx+dx*.6,by=cy+dy*.6,tx=-dy*.18,ty=dx*.18;
  var r0=rotPt(tip[0],tip[1]),r1=rotPt(bx+tx,by+ty),r2=rotPt(bx-tx,by-ty);
  quad([[r0[0],r0[1],z],[r1[0],r1[1],z],[r2[0],r2[1],z]],why?'#ff5a4a':'#ffd23f','rgba(30,30,30,.6)');
}

// 철골 계단: 옆 보(스트링거)와 디딤판만 있고 아래는 비어 있다
function drawStair(p,tint){
  var K=PATHK[p.k],steel=tint||'#58626d',tread=tint||K.col,c=PJ.c;
  var ax=DIRS[p.d][0],ay=DIRS[p.d][1],px=-ay,py=ax,cx=p.x+.5,cy=p.y+.5,z0=p.l*LV,z1=(p.l+1)*LV;
  var rs=function(wx,wy){return rotPt(wx,wy);};
  // 화면에서 앞쪽에 오는 옆면 판별
  var a=rs(cx+px*.42,cy+py*.42),b=rs(cx-px*.42,cy-py*.42),front=(a[0]+a[1]>b[0]+b[1])?1:-1;
  var post=function(wx,wy,zt){if(zt>.12)box(rrect(wx-.035,wy-.035,wx+.035,wy+.035),0,zt,shade(steel,.95));};
  var stringer=function(sg){
    var lx=cx-ax*.5+px*.43*sg,ly=cy-ay*.5+py*.43*sg,hx=cx+ax*.5+px*.43*sg,hy=cy+ay*.5+py*.43*sg,r1=rs(lx,ly),r2=rs(hx,hy);
    quad([[r1[0],r1[1],z0-.09],[r2[0],r2[1],z1-.09],[r2[0],r2[1],z1+.02],[r1[0],r1[1],z0+.02]],steel,'rgba(20,25,30,.55)');
    post(hx,hy,z1-.09);if(p.l>0)post(lx,ly,z0-.09);
  };
  stringer(-front);
  var n=5,steps=[];
  for(var i=0;i<n;i++){
    var t0=i/n,t1=(i+1)/n,zt=z0+(t1)*LV;
    var wx0=cx-ax*.5+ax*t0,wy0=cy-ay*.5+ay*t0,wx1=cx-ax*.5+ax*t1,wy1=cy-ay*.5+ay*t1;
    var xs=[wx0+px*.4,wx0-px*.4,wx1+px*.4,wx1-px*.4],ys=[wy0+py*.4,wy0-py*.4,wy1+py*.4,wy1-py*.4];
    var r=rrect(Math.min.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,xs),Math.max.apply(null,ys));
    steps.push({r:r,z:zt,k:r.x0+r.x1+r.y0+r.y1});
  }
  steps.sort(function(u,v){return u.k-v.k;});
  steps.forEach(function(s){box(s.r,s.z-.05,s.z,shade(tread,.9),tread);});
  stringer(front);
  // 난간: 양옆
  c.strokeStyle=tint?'rgba(255,255,255,.85)':'#d7dde2';c.lineWidth=Math.max(.8,1.3*PJ.s);c.beginPath();
  [-1,1].forEach(function(sg){
    var lx=cx-ax*.5+px*.45*sg,ly=cy-ay*.5+py*.45*sg,hx=cx+ax*.5+px*.45*sg,hy=cy+ay*.5+py*.45*sg;
    var r1=rs(lx,ly),r2=rs(hx,hy),s1=P(r1[0],r1[1],z0),s2=P(r2[0],r2[1],z1),t1=P(r1[0],r1[1],z0+.36),t2=P(r2[0],r2[1],z1+.36);
    c.moveTo(s1[0],s1[1]);c.lineTo(t1[0],t1[1]);c.lineTo(t2[0],t2[1]);c.lineTo(s2[0],s2[1]);
  });
  c.stroke();
}
// 연결 다리: 기둥 위 바닥판, 유리 벽, 얇은 지붕틀
function drawSkyPiece(p,tint){
  var z=p.l*LV,c=PJ.c,cx=p.x+.5,cy=p.y+.5;
  box(rrect(cx-.08,cy-.08,cx+.08,cy+.08),0,z-.13,tint||'#9aa6b0');
  box(rrect(p.x,p.y,p.x+1,p.y+1),z-.13,z,tint||'#8e9aa4',tint||'#d5dde3');
  var open=function(e){
    var nx=p.x+DIRS[e][0],ny=p.y+DIRS[e][1];
    if(piecesAt(nx,ny).some(function(q){return q.k==='sky'&&q.l===p.l;}))return true;
    if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&occ[ny][nx]){var b=bById(occ[ny][nx]);if(b&&bFloorsAt(b,nx,ny)>p.l)return true;}
    return false;
  };
  var E=[[[p.x+1,p.y],[p.x+1,p.y+1]],[[p.x,p.y],[p.x,p.y+1]],[[p.x,p.y+1],[p.x+1,p.y+1]],[[p.x,p.y],[p.x+1,p.y]]];
  var glass=tint?'rgba(255,255,255,.25)':'rgba(150,195,225,.32)',frame=tint||'#5f7a8f';
  for(var e=0;e<4;e++){
    if(open(e))continue;
    var r1=rotPt(E[e][0][0],E[e][0][1]),r2=rotPt(E[e][1][0],E[e][1][1]);
    quad([[r1[0],r1[1],z],[r2[0],r2[1],z],[r2[0],r2[1],z+.66],[r1[0],r1[1],z+.66]],glass,frame);
  }
  var R=[[p.x,p.y],[p.x+1,p.y],[p.x+1,p.y+1],[p.x,p.y+1]].map(function(w){var r=rotPt(w[0],w[1]);return [r[0],r[1],z+.7];});
  quad(R,tint?'rgba(255,255,255,.15)':'rgba(95,122,143,.22)',frame);
  if(NAV.badSky&&NAV.badSky[p.id]&&!tint){var m=rotPt(cx,cy),q=P(m[0],m[1],z+.9),s=Math.max(.7,PJ.s);c.fillStyle='#d6453a';c.font='700 '+(12*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('!',q[0],q[1]);}
}

/* ---------- 연결 다리로 이어진 같은 역할 건물 ---------- */
function skyNext(p){
  var out=[];
  for(var e=0;e<4;e++)piecesAt(p.x+DIRS[e][0],p.y+DIRS[e][1]).forEach(function(q){if(q.k==='sky'&&q.l===p.l)out.push(q);});
  return out;
}
// p 옆에 b의 벽이 그 높이로 있으면 그 방향들
function skyAttach(p,b){
  var out=[];
  for(var e=0;e<4;e++){
    var nx=p.x+DIRS[e][0],ny=p.y+DIRS[e][1];
    if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;
    if(occ[ny][nx]===b.id&&bFloorsAt(b,nx,ny)>p.l)out.push(e);
  }
  return out;
}
// 연결 다리 묶음마다 닿은 건물들을 찾고, 모두 같은 역할이면 서로 잇는다
function refreshLinks(){
  NAV.badSky={};
  S.buildings.forEach(function(b){b.links=[];});
  var seen={};
  S.paths.forEach(function(p0){
    if(p0.k!=='sky'||seen[p0.id])return;
    var comp=[],q=[p0];seen[p0.id]=1;
    while(q.length){var p=q.pop();comp.push(p);skyNext(p).forEach(function(r){if(!seen[r.id]){seen[r.id]=1;q.push(r);}});}
    var att=[];
    comp.forEach(function(p){
      for(var e=0;e<4;e++){
        var nx=p.x+DIRS[e][0],ny=p.y+DIRS[e][1];
        if(nx<0||ny<0||nx>=COLS||ny>=ROWS||!occ[ny][nx])continue;
        var b=bById(occ[ny][nx]);
        if(b&&bFloorsAt(b,nx,ny)>p.l&&att.indexOf(b)<0)att.push(b);
      }
    });
    if(att.length<2)return;
    var role=D[att[0].def].cat;
    if(!att.every(function(b){return D[b.def].cat===role;})){comp.forEach(function(p){NAV.badSky[p.id]=1;});return;}
    att.forEach(function(b){att.forEach(function(o){if(o!==b&&b.links.indexOf(o.id)<0)b.links.push(o.id);});});
  });
}
// A에서 B까지 연결 다리 위 이동 경로 (벽 → 다리 칸들 → 벽)
function skyRoute(A,B){
  var starts=S.paths.filter(function(p){return p.k==='sky'&&skyAttach(p,A).length;});
  var prev={},q=starts.slice(),seen={},end=null;
  starts.forEach(function(p){seen[p.id]=1;});
  for(var i=0;i<q.length&&!end;i++){
    var p=q[i];
    if(skyAttach(p,B).length){end=p;break;}
    skyNext(p).forEach(function(r){if(!seen[r.id]){seen[r.id]=1;prev[r.id]=p;q.push(r);}});
  }
  if(!end)return null;
  var chain=[],c=end;
  while(c){chain.push(c);c=prev[c.id];}
  chain.reverse();
  var z=chain[0].l*LV,out=[],e0=skyAttach(chain[0],A)[0],e1=skyAttach(end,B)[0];
  out.push({x:chain[0].x+.5+DIRS[e0][0]*.5,y:chain[0].y+.5+DIRS[e0][1]*.5,z:z,n:PN+chain[0].id});
  chain.forEach(function(p){out.push({x:p.x+.5,y:p.y+.5,z:z,n:PN+p.id});});
  out.push({x:end.x+.5+DIRS[e1][0]*.5,y:end.y+.5+DIRS[e1][1]*.5,z:z,n:PN+end.id});
  return out;
}
