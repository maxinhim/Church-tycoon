'use strict';
/* ---------- 물 (호수·강) ----------
   S.water = {"x,y":1}  물이 찬 칸. 땅을 0층 아래로 내린 칸에만 채울 수 있다.
   · 서로 붙어 있는 지하 칸(웅덩이) 전체에 한 번에 차고, 수면은 지면 바로 아래다
   · 채우려면 웅덩이의 0층 아래에 건물·길이 없어야 한다 (바닥 타일은 그대로 남고, 물을 빼면 다시 보인다)
   · 물이 찬 칸은 걸을 수 없다. 0층 높이의 다리로 건넌다. 물 위에는 다리와 물 분수만 놓는다
   · 물 옆 칸을 0층 아래로 파면 물이 그 칸으로 이어진다 */
var WATER_COST=15,WATER_LV=-.35;
function lvName(h){return h<0?'지하 '+(-h)+'층':'높이 '+h;}
function isWater(x,y){return !!(S.water&&S.water[x+','+y]);}
function waterZ(){return WATER_LV*LV;}
function isWaterDef(d){return !!(d&&d.water);}
// 건물이 그려지는 바닥 높이(z): 물 분수는 수면에 뜬다
function bZ(b){return isWaterDef(D[b.def])?waterZ():bLevel(b)*LV;}
function subCell(x,y){return x>=0&&y>=0&&x<COLS&&y<PZ&&th(x,y)<0;}
// (x,y)와 이어진 지하 칸들. also = 지하로 친다고 가정할 칸 "x,y" (파기 전에 미리 볼 때)
function poolCells(x,y,also){
  var seen={},q=[[x,y]],out=[];seen[x+','+y]=1;
  for(var i=0;i<q.length;i++){
    var c=q[i];out.push({x:c[0],y:c[1]});
    for(var d=0;d<4;d++){var nx=c[0]+DIRS[d][0],ny=c[1]+DIRS[d][1],k=nx+','+ny;if(!seen[k]&&(subCell(nx,ny)||k===also)){seen[k]=1;q.push([nx,ny]);}}
  }
  return out;
}
// 그 칸의 0층 아래에 놓인 것 (없으면 '')
function cellSubWhy(x,y){
  var id=occ[y][x],b=id&&bById(id);
  if(b&&!isWaterDef(D[b.def])&&bLevel(b)<0)return defOf(b).name;
  if(piecesAt(x,y).some(function(p){return p.l<0;}))return '길·계단';
  return '';
}
function nearWater(x,y){for(var d=0;d<4;d++)if(isWater(x+DIRS[d][0],y+DIRS[d][1]))return true;return false;}
function waterPlan(x,y){
  if(!subCell(x,y))return {why:'0층 아래로 내린 땅에만 물을 채울 수 있어요'};
  var cells=poolCells(x,y),add=cells.filter(function(c){return !isWater(c.x,c.y);});
  if(!add.length)return {why:'이미 물이 차 있어요'};
  for(var i=0;i<cells.length;i++){var w=cellSubWhy(cells[i].x,cells[i].y);if(w)return {why:'웅덩이 0층 아래에 '+w+'이(가) 있어요. 먼저 치워 주세요',at:cells[i]};}
  return {cells:add,n:cells.length,cost:add.length*WATER_COST};
}
function fillWater(x,y){
  var p=waterPlan(x,y);if(p.why)return p.why;
  if(S.money<p.cost)return '자금이 부족해요';
  S.money-=p.cost;if(!S.water)S.water={};
  p.cells.forEach(function(c){S.water[c.x+','+c.y]=1;});
  waterChanged();return '';
}
function drainPlan(x,y){
  if(!isWater(x,y))return {why:'물이 없어요'};
  var cells=poolCells(x,y).filter(function(c){return isWater(c.x,c.y);});
  if(cells.some(function(c){return !!occ[c.y][c.x];}))return {why:'물 위 분수를 먼저 치워 주세요'};
  return {cells:cells};
}
function drainWater(x,y){
  var p=drainPlan(x,y);if(p.why)return p.why;
  p.cells.forEach(function(c){delete S.water[c.x+','+c.y];});
  waterChanged();return '';
}
function waterChanged(){rebuildOcc();bump();recalc();save();}
// 지형이 바뀐 뒤: 0층 이상이 된 칸의 물은 없애고, 물 옆의 지하 칸으로 물을 잇는다
function waterFix(){
  if(!S.water)S.water={};
  var k,a;
  for(k in S.water){a=k.split(',');if(!subCell(+a[0],+a[1]))delete S.water[k];}
  var q=Object.keys(S.water).map(function(s){var t=s.split(',');return [+t[0],+t[1]];});
  for(var i=0;i<q.length;i++)for(var d=0;d<4;d++){
    var nx=q[i][0]+DIRS[d][0],ny=q[i][1]+DIRS[d][1];
    if(subCell(nx,ny)&&!isWater(nx,ny)&&!cellSubWhy(nx,ny)){S.water[nx+','+ny]=1;q.push([nx,ny]);}
  }
}
// 이 칸을 lvl(<0)로 내리면 옆 물이 흘러들 곳에 건물·길이 있는지
function waterDigWhy(x,y,lvl,hasThing){
  if(lvl>=0||!nearWater(x,y))return '';
  if(hasThing)return '물 옆이라, 건물·길이 있는 칸은 0층 아래로 내릴 수 없어요';
  var cells=poolCells(x,y,x+','+y);
  for(var i=0;i<cells.length;i++){var c=cells[i];if((c.x!==x||c.y!==y)&&!isWater(c.x,c.y)&&cellSubWhy(c.x,c.y))return '옆 물이 흘러들 곳에 건물·길이 있어요';}
  return '';
}

/* ---------- 그리기 ---------- */
// 물이 찬 칸: 어렴풋한 물고기 그림자 → 반투명 수면 → 잔물결. 경사로 칸은 수면 아래 부분만 덮는다
function drawWaterCell(x,y){
  var c=PJ.c,z=waterZ(),h=th(x,y),s=tslope(x,y),x0=x,y0=y,x1=x+1,y1=y+1;
  if(s>=0){
    var t=clamp((z-h*LV)/LV,0,1);if(t<=.01)return;
    if(s===0)x1=x+t;else if(s===1)x0=x+1-t;else if(s===2)y1=y+t;else y0=y+1-t;
  }
  var pts=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(function(p){var r=rotPt(p[0],p[1]);return [r[0],r[1],z];});
  var r0=hh(x,y),tm=S.clock||0;
  if(s<0&&r0<.45){
    // 물고기: 칸 안을 천천히 도는 어두운 그림자 (수면 아래라 흐릿하게)
    var n=r0<.15?2:1;
    for(var i=0;i<n;i++){
      var ph=r0*40+i*2.6,sp=.35+hh(y+i,x)*.3,ang=tm*sp+ph,rx=.26+.08*i,fx=x+.5+Math.cos(ang)*rx,fy=y+.5+Math.sin(ang*(i?1.3:1))*rx*.8;
      var hx=fx-Math.sin(ang)*.11,hy=fy+Math.cos(ang*(i?1.3:1))*.09;
      var a=rotPt(fx,fy),b=rotPt(hx,hy),pa=P(a[0],a[1],z-.12),pb=P(b[0],b[1],z-.12);
      c.strokeStyle=i?'rgba(210,120,60,.55)':'rgba(30,50,70,.5)';c.lineCap='round';c.lineWidth=Math.max(1,2.6*PJ.s);
      c.beginPath();c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);c.stroke();c.lineCap='butt';
    }
  }
  quad(pts,'rgba(64,146,204,.6)',null);
  // 잔물결
  var w=(tm*.25+r0)%1,m=rotPt((x0+x1)/2+(r0-.5)*.4,(y0+y1)/2+(hh(y,x)-.5)*.4),q=P(m[0],m[1],z);
  c.strokeStyle='rgba(235,248,255,'+(.5*(1-w)).toFixed(3)+')';c.lineWidth=Math.max(.5,PJ.s);
  c.beginPath();c.ellipse(q[0],q[1],(3+9*w)*PJ.s,(1.5+4.5*w)*PJ.s,0,0,6.283);c.stroke();
}
// 물 분수: 수면에 뜬 돌 받침과 솟는 물줄기
function drawWFount(b){
  var x=b.x,y=b.y,c=PJ.c,s=PJ.s,tm=S.clock||0;
  box(rrect(x+.3,y+.3,x+.7,y+.7),0,.1,'#bfb8aa','#d9d3c7');
  box(rrect(x+.44,y+.44,x+.56,y+.56),.1,.3,'#d8d2c6');
  var p=rotPt(x+.5,y+.5),q=P(p[0],p[1],.3),top=P(p[0],p[1],1.05+.08*Math.sin(tm*5));
  c.strokeStyle='rgba(215,240,255,.95)';c.lineWidth=Math.max(.8,1.6*s);c.beginPath();
  c.moveTo(q[0],q[1]);c.lineTo(top[0],top[1]);
  for(var i=0;i<4;i++){var a=i*1.57+.6,ex=p[0]+Math.cos(a)*.42,ey=p[1]+Math.sin(a)*.42,e=P(ex,ey,0);c.moveTo(top[0],top[1]);c.quadraticCurveTo((top[0]+e[0])/2,top[1]-4*s,e[0],e[1]);}
  c.stroke();
  c.fillStyle='rgba(235,248,255,.8)';for(var j=0;j<4;j++){var a2=j*1.57+.6,e2=P(p[0]+Math.cos(a2)*.42,p[1]+Math.sin(a2)*.42,0);c.beginPath();c.ellipse(e2[0],e2[1],3*s,1.5*s,0,0,6.283);c.fill();}
}
/* 땅 밑(0층 아래)은 파인 칸의 입구로만 보인다: 파인 칸들의 지면 마름모를 모아 둔다.
   0층 아래로 내려가는 그림은 '입구들 + 자기 칸 위쪽 기둥' 안에서만 그린다 (앞쪽 땅 위로 삐져나오지 않게) */
var PIT={path:null,n:0};
function pitBuild(){
  PIT.path=null;PIT.n=0;
  var pp=null;
  for(var k in S.hgt||{}){
    if(!(S.hgt[k]<0))continue;
    var a=k.split(','),x=+a[0],y=+a[1];
    if(!pp)pp=new Path2D();
    [[x,y],[x+1,y],[x+1,y+1],[x,y+1]].forEach(function(w,i){var r=rotPt(w[0],w[1]),q=P(r[0],r[1],0);if(i)pp.lineTo(q[0],q[1]);else pp.moveTo(q[0],q[1]);});
    pp.closePath();PIT.n++;
  }
  PIT.path=pp;
}
// 회전된 칸 범위 r(x0,y0,x1,y1)의 그림을 땅 밑 가림과 함께 그린다
function pitClip(r,f){
  if(!PIT.path){f();return;}
  var c=PJ.c,p=new Path2D(PIT.path),k=ZB;ZB=0;
  var L=P(r.x0,r.y1,0),B=P(r.x1,r.y1,0),R=P(r.x1,r.y0,0),T=P(r.x0,r.y0,0),m=14*PJ.s;ZB=k;
  // 자기 칸의 지면 마름모와 그 위쪽 (시계 방향으로, 입구 마름모와 같은 방향)
  p.moveTo(L[0],L[1]);p.lineTo(L[0]-m,L[1]-m/2);p.lineTo(L[0]-m,-1e4);p.lineTo(R[0]+m,-1e4);p.lineTo(R[0]+m,R[1]-m/2);p.lineTo(R[0],R[1]);p.lineTo(B[0],B[1]);p.closePath();
  c.save();c.clip(p);try{f();}finally{c.restore();}
}
