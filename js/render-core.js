'use strict';
/* ======================================================================
   아이소메트릭 렌더러
   ====================================================================== */
var ROT=0, cam={ox:0,oy:0,z:0.6}, ZMIN=0.3, ZMAX=2.6, PJ={c:null,ox:0,oy:0,s:1};
// ZB: 지금 그리는 것이 놓인 바닥 높이(z). 높인 땅 위의 건물·바닥은 이 값만 올려 두고 평소처럼 그린다
var ZB=0;
/* U: 지금 그리는 좌표의 단위. 1 = 지금 칸, G = 예전 칸(한 변이 G배).
   legacy(fn): 예전 칸 단위로 짠 그림(건물·꾸미기·땅·울타리·입구)을 그대로 그린다. 그동안 COLS·ROWS·ENT·PZ·BAND도 예전 값이 된다.
   legacy 안에서는 지도 상태(occ·땅 높이)를 칸 좌표로 읽지 말 것 — 좌표가 예전 단위다 */
var U=1,ZU=1,CELL_K=.5;
/* 월드 그리기(WLD): 켜면 P·quad·box에 주는 좌표를 '회전하지 않은 지도 좌표'로 본다 — 건물 내부 가구·사람을 화면 회전과 상관없이 방위가 고정되게 그릴 때 쓴다.
   WLD_FR는 이때 화면 방향으로 돌린 방 사각형(가까운 벽 쪽 세로 장식은 그리지 않는다) */
var WLD=0,WLD_FR=null;
function P(rx,ry,z){if(WLD){var m=rotPt(rx,ry);rx=m[0];ry=m[1];}return [PJ.ox+(rx-ry)*HW*U*PJ.s, PJ.oy+(rx+ry)*HH*U*PJ.s-((z||0)*ZU+ZB)*ZH*PJ.s];}
// 한 칸짜리 소품: 지금 칸 단위로, 높이는 CELL_K배로 그린다 (가로·세로는 칸이 작아서 저절로 CELL_K배)
function cellDraw(b,fn){var k=ZU;ZU=D[b.def]&&D[b.def].kind==='gate'?1:CELL_K;try{fn();}finally{ZU=k;}}
function legacy(fn){
  if(U!==1)return fn();
  COLS/=G;ROWS/=G;ENT/=G;PZ/=G;BAND/=G;U=G;
  try{return fn();}finally{COLS*=G;ROWS*=G;ENT*=G;PZ*=G;BAND*=G;U=1;}
}
// 건물을 예전 칸 좌표로 옮긴 사본 (그릴 때만 쓴다)
function legB(b){var o=Object.create(b);o.x=b.x/G;o.y=b.y/G;return o;}
function atZ(z,fn){var k=ZB;ZB=z;try{fn();}finally{ZB=k;}}
function rotPt(x,y){switch(ROT){case 0:return [x,y];case 1:return [ROWS-y,x];case 2:return [COLS-x,ROWS-y];default:return [y,COLS-x];}}
function unrot(rx,ry){switch(ROT){case 0:return [rx,ry];case 1:return [ry,ROWS-rx];case 2:return [COLS-rx,ROWS-ry];default:return [COLS-ry,rx];}}
function RX(){return ROT%2?ROWS:COLS;} function RY(){return ROT%2?COLS:ROWS;}
function rrect(x0,y0,x1,y1){var a=rotPt(x0,y0),b=rotPt(x1,y1);return {x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])};}
var hh=function(x,y){var h=(x*374761393+y*668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
var SC={};
function shade(hex,f){
  var k=hex+f;if(SC[k])return SC[k];
  var n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;
  if(f<=1){r*=f;g*=f;b*=f;}else{var t=f-1;r+=(255-r)*t;g+=(255-g)*t;b+=(255-b)*t;}
  return (SC[k]='rgb('+(r|0)+','+(g|0)+','+(b|0)+')');
}
var EDGE='rgba(28,24,20,.32)';
function wldNear(pts){   // 가까운(낮은) 벽에 걸린 세로 장식은 숨긴다
  var F=WLD_FR,i,sx=true,sy=true,m,m0=rotPt(pts[0][0],pts[0][1]);if(!F||pts.length<3)return false;
  for(i=1;i<pts.length;i++){m=rotPt(pts[i][0],pts[i][1]);if(Math.abs(m[0]-m0[0])>1e-6)sx=false;if(Math.abs(m[1]-m0[1])>1e-6)sy=false;}
  return (sx&&!sy&&m0[0]>F.x1-.3)||(sy&&!sx&&m0[1]>F.y1-.3);
}
function quad(pts,fill,line){
  if(WLD&&wldNear(pts))return;
  var c=PJ.c;c.beginPath();
  for(var i=0;i<pts.length;i++){var q=P(pts[i][0],pts[i][1],pts[i][2]);if(i)c.lineTo(q[0],q[1]);else c.moveTo(q[0],q[1]);}
  c.closePath();
  if(fill){c.fillStyle=fill;c.fill();}
  if(line){c.strokeStyle=line;c.lineWidth=Math.max(.5,PJ.s*.9);c.stroke();}
}
function box(r,z0,z1,col,top){
  if(WLD){var m=rrect(r.x0,r.y0,r.x1,r.y1);WLD=0;try{box(m,z0,z1,col,top);}finally{WLD=1;}return;}
  quad([[r.x0,r.y1,z0],[r.x1,r.y1,z0],[r.x1,r.y1,z1],[r.x0,r.y1,z1]],shade(col,.93),EDGE);
  quad([[r.x1,r.y0,z0],[r.x1,r.y1,z0],[r.x1,r.y1,z1],[r.x1,r.y0,z1]],shade(col,.74),EDGE);
  quad([[r.x0,r.y0,z1],[r.x1,r.y0,z1],[r.x1,r.y1,z1],[r.x0,r.y1,z1]],top||shade(col,1.07),EDGE);
}
/* 보이는 앞면 위 사각형: 'L'=왼쪽 앞면(ry=y1), 'R'=오른쪽 앞면(rx=x1) */
function fr(f,r,a,b,z0,z1,col){
  if(f==='L')quad([[a,r.y1,z0],[b,r.y1,z0],[b,r.y1,z1],[a,r.y1,z1]],col);
  else quad([[r.x1,a,z0],[r.x1,b,z0],[r.x1,b,z1],[r.x1,a,z1]],col);
}
function feats(r,H,d,zo){
  zo=zo||0;
  ['L','R'].forEach(function(f){
    var a0=f==='L'?r.x0:r.y0,a1=f==='L'?r.x1:r.y1,len=a1-a0,mid=(a0+a1)/2;
    var n=Math.max(1,Math.round(len/(d.bigwin?0.75:0.55)));
    for(var i=0;i<n;i++){
      var cx=a0+(i+.5)*len/n;
      var ww=d.bigwin?0.26:(d.stained?0.1:0.11),z0=H*(d.stained?0.28:0.38),z1=H*(d.stained?0.8:0.72);
      var col=d.stained?['#5b82d6','#d6604f','#e3b341','#4fa37a'][i%4]:'#9cc3e3';
      fr(f,r,cx-ww,cx+ww,z0+zo,z1+zo,f==='R'?shade(col,.82):col);
    }
  });
}
function gable(r,z,rh,col,wall,alongX){
  var e=.07,zt=z+rh;
  if(alongX){
    var ym=(r.y0+r.y1)/2;
    quad([[r.x0-e,r.y0-e,z],[r.x1+e,r.y0-e,z],[r.x1+e,ym,zt],[r.x0-e,ym,zt]],shade(col,.8),EDGE);
    quad([[r.x1,r.y0,z],[r.x1,r.y1,z],[r.x1,ym,zt]],shade(wall,.74),EDGE);
    quad([[r.x0-e,r.y1+e,z],[r.x1+e,r.y1+e,z],[r.x1+e,ym,zt],[r.x0-e,ym,zt]],shade(col,1),EDGE);
    return [r.x1+e,ym,zt];
  }
  var xm=(r.x0+r.x1)/2;
  quad([[r.x0-e,r.y0-e,z],[r.x0-e,r.y1+e,z],[xm,r.y1+e,zt],[xm,r.y0-e,zt]],shade(col,.9),EDGE);
  quad([[r.x0,r.y1,z],[r.x1,r.y1,z],[xm,r.y1,zt]],shade(wall,.93),EDGE);
  quad([[r.x1+e,r.y0-e,z],[r.x1+e,r.y1+e,z],[xm,r.y1+e,zt],[xm,r.y0-e,zt]],shade(col,.76),EDGE);
  return [xm,r.y1+e,zt];
}
function hip(r,z,rh,col){
  var e=.06,cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2,zt=z+rh,a=[cx,cy,zt];
  quad([[r.x0-e,r.y0-e,z],[r.x1+e,r.y0-e,z],a],shade(col,.8),EDGE);
  quad([[r.x0-e,r.y0-e,z],[r.x0-e,r.y1+e,z],a],shade(col,.9),EDGE);
  quad([[r.x0-e,r.y1+e,z],[r.x1+e,r.y1+e,z],a],shade(col,1),EDGE);
  quad([[r.x1+e,r.y0-e,z],[r.x1+e,r.y1+e,z],a],shade(col,.76),EDGE);
  return a;
}
function cross(rx,ry,z,k){
  var c=PJ.c,q=P(rx,ry,z),s=PJ.s*k,lw=Math.max(1.2,2.4*s);
  c.lineCap='butt';
  [['rgba(20,24,40,.45)',lw+1.6],['#ffffff',lw]].forEach(function(st){
    c.strokeStyle=st[0];c.lineWidth=st[1];c.beginPath();
    c.moveTo(q[0],q[1]);c.lineTo(q[0],q[1]-16*s);c.moveTo(q[0]-5.5*s,q[1]-11*s);c.lineTo(q[0]+5.5*s,q[1]-11*s);c.stroke();
  });
}
function dot(rx,ry,z,rad,col){var c=PJ.c,q=P(rx,ry,z);c.fillStyle=col;c.beginPath();c.arc(q[0],q[1],rad,0,6.283);c.fill();}
