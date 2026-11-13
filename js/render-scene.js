'use strict';
function footprint(x,y,w,h,fill,stroke,dash){
  var r=rrect(x,y,x+w,y+h),c=PJ.c;
  if(dash)c.setLineDash(dash);
  quad([[r.x0,r.y0,.01],[r.x1,r.y0,.01],[r.x1,r.y1,.01],[r.x0,r.y1,.01]],fill,null);
  if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
  c.setLineDash([]);
}
// 경사진 칸(흙 경사로·계단) 표시: (x,y) 칸이 z0에서 dir 쪽으로 rise만큼 오른다. 어느 방향에서 봐도 면에 붙는다
function slopeFoot(x,y,z0,dir,rise,fill,stroke,dash){
  var c=PJ.c,pts=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(function(p){
    var t=[p[0]-x,x+1-p[0],p[1]-y,y+1-p[1]][dir],r=rotPt(p[0],p[1]);return [r[0],r[1],z0+t*rise+.02];});
  if(dash)c.setLineDash(dash);
  quad(pts,fill,null);
  if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
  c.setLineDash([]);
}
function sortEnt(E){
  var n=E.length,adj=[],i,j,k;
  for(i=0;i<n;i++)adj.push([]);
  // 화면에서 좌우로 겹치지 않는 둘은 서로 가릴 수 없으니 비교하지 않는다 (높인 땅 칸이 많아도 빠르게).
  // 그림이 바닥보다 넓게 삐져나올 수 있어 여유를 둔다
  var ix=[];for(i=0;i<n;i++){E[i]._l=E[i].x0-E[i].y1-.8;E[i]._r=E[i].x1-E[i].y0+.8;ix.push(i);}
  ix.sort(function(p,q){return E[p]._l-E[q]._l;});
  for(var u=0;u<n;u++)for(var w=u+1;w<n;w++){
    i=ix[u];j=ix[w];if(E[j]._l>=E[i]._r)break;
    if(i>j){k=i;i=j;j=k;}
    var a=E[i],b=E[j];
    var ab=a.x1<=b.x0+1e-4||a.y1<=b.y0+1e-4,ba=b.x1<=a.x0+1e-4||b.y1<=a.y0+1e-4;
    if(ab&&ba)continue;
    if(!ab&&!ba){
      // 겹칠 때: 방문자가 서 있는 길 조각을 먼저, 그다음 높이(아래에 있는 것 먼저), 마지막으로 앞뒤
      var az0=a.zb||0,az1=a.zt==null?99:a.zt,bz0=b.zb||0,bz1=b.zt==null?99:b.zt;
      if(a.pid&&b.on===a.pid)ab=true;else if(b.pid&&a.on===b.pid)ba=true;
      else if(az1<=bz0+1e-3)ab=true;else if(bz1<=az0+1e-3)ba=true;
      else if(a.x0+a.x1+a.y0+a.y1<=b.x0+b.x1+b.y0+b.y1)ab=true;else ba=true;
    }
    if(ab)adj[j].push(i);else adj[i].push(j);
  }
  var out=[],mark=new Uint8Array(n);
  function visit(k){if(mark[k])return;mark[k]=1;for(var t=0;t<adj[k].length;t++)visit(adj[k][t]);out.push(E[k]);}
  for(i=0;i<n;i++)visit(i);
  return out;
}
function draw(){
  if(!ctx)return;
  var c=ctx;
  c.setTransform(DPR,0,0,DPR,0,0);
  // 지도 밖도 잔디 (우주처럼 떠 보이지 않게)
  c.fillStyle='#80b169';c.fillRect(0,0,VW,VH);
  PJ.c=c;PJ.ox=cam.ox;PJ.oy=cam.oy;PJ.s=cam.z;
  legacy(function(){drawGround();drawWxGround();});
  drawFloors();
  drawPuddles();
  legacy(drawCloudShadows);
  // 파인 칸의 입구: 먼저 어두운 흙으로 메워 두고, 그 안쪽은 칸마다 그린다
  pitBuild();if(PIT.path){c.fillStyle='#4f3d2b';c.fill(PIT.path);}
  legacy(function(){drawOutTrees(true);});
  var sb=UI.sel?bById(UI.sel):null;
  var gd=UI.ghost&&UI.tool&&D[UI.tool]&&!isRoomDef(UI.tool)&&UI.tool!=='path'&&!isFloorDef(UI.tool)&&!isTerDef(UI.tool)?D[UI.tool]:null,gok=false;
  var E=[],use=Math.min(1,(S.members*0.35+V.length*0.15)/Math.max(1,A.park));
  var mvId=movingId();
  // 높인 땅·흙 경사로: 칸마다 흙 덩어리 하나
  terCells().forEach(function(t){
    if(t.x<0||t.y<0||t.x>=COLS||t.y>=ROWS)return;
    var cm=rotPt(t.x+.5,t.y+.5),cq=P(cm[0],cm[1],th(t.x,t.y)*LV),pad=80*PJ.s;
    if(cq[0]<-pad||cq[0]>VW+pad||cq[1]<-pad||cq[1]>VH+pad+MAXH*LV*ZH*PJ.s)return;
    var rt=rrect(t.x,t.y,t.x+1,t.y+1),h=th(t.x,t.y);rt.zb=h<0?-99:0;rt.zt=h*LV;
    // 0층 아래로 내려가는 흙벽·바닥은 파인 칸의 입구 안에서만 보인다
    var low=h<0||[0,1,2,3].some(function(d){return th(t.x+DIRS[d][0],t.y+DIRS[d][1])<0;});
    rt.f=low?function(){pitClip(rt,function(){drawTerCell(t.x,t.y);});}:function(){drawTerCell(t.x,t.y);};E.push(rt);
  });
  S.buildings.forEach(function(b){
    if(b.id===mvId)return;
    if(isRoom(b)){
      var map=roomMap(b);
      var rz=bLevel(b)*LV,ft=frontTile(b);
      b.tiles.forEach(function(t){var rt=rrect(t.x,t.y,t.x+1,t.y+1);rt.zb=rz;if(b.z==null&&piecesAt(t.x,t.y).some(function(p){return p.l>bLevel(b);}))rt.zt=rz+roomTop(t.f)-.02;rt.f=function(){atZ(rz,function(){drawRoomTile(b,t,map);if(t===ft)drawWear(b);});};if(rz<0){var f0=rt.f;rt.f=function(){pitClip(rt,f0);};}E.push(rt);});
      return;
    }
    var d=D[b.def],dm=bDims(b),r=rrect(b.x,b.y,b.x+dm.w,b.y+dm.h),bz=bZ(b);
    r.zb=bz;if(b.z==null&&ceilOver(b)<99)r.zt=Math.min(bz+bHeight(b),ceilOver(b)*LV-.15);
    r.f=d.cell?function(){atZ(bz,function(){cellDraw(b,function(){drawEntity(b,0);});});}:function(){atZ(bz,function(){legacy(function(){var lb=legB(b);drawEntity(lb,d.kind==='lot'?Math.round(use*d.park):0);drawWear(lb);});});};if(bz<0){var f1=r.f;r.f=function(){pitClip(r,f1);};}E.push(r);
  });
  S.paths.forEach(function(p){
    var pg=(p.x<COLS&&p.y<ROWS)?th(p.x,p.y):0;
    var rp=rrect(p.x,p.y,p.x+1,p.y+1);rp.pid=p.id;rp.zb=p.l>pg?p.l*LV-.14:pg*LV;rp.zt=p.k==='sky'?p.l*LV+.72:((p.l===pg&&!p.s)?pg*LV:pieceTop(p)*LV);
    rp.f=pg<0||p.l<0?function(){pitClip(rp,function(){drawPiece(p);});}:function(){drawPiece(p);};E.push(rp);
  });
  V.forEach(function(v){
    if(v.state==='inside')return;
    var p=rotPt(v.x,v.y),z=v.z||0;
    var ve={x0:p[0]-.05,y0:p[1]-.05,x1:p[0]+.05,y1:p[1]+.05,zb:z,zt:z+.7,on:v.node>=PN?v.node-PN:0,f:function(){drawVisitor(v);}};
    if(z<-.01)ve.f=function(){var u=unrot(p[0],p[1]),cx=Math.floor(u[0]),cy=Math.floor(u[1]);pitClip(rrect(cx,cy,cx+1,cy+1),function(){drawVisitor(v);});};
    E.push(ve);
  });
  // 도로의 차·입구·울타리는 예전 칸 단위 그림: 자리(rect)만 지금 칸으로 바꿔 정렬에 넣고, 그릴 때는 legacy로
  var LE=function(r,f){E.push({x0:r.x0*G,y0:r.y0*G,x1:r.x1*G,y1:r.y1*G,f:function(){legacy(f);}});};
  legacy(function(){
    for(var k=0;k<2;k++){
      var span=COLS+2*BAND,wx=k===0?((S.clock*1.6+3)%span)-BAND:COLS+BAND-((S.clock*1.25+9)%span),ly=k===0?ROWS-1+.58:ROWS-1+.14;
      if(wx<-BAND||wx+.8>COLS+BAND)continue;
      (function(wx,ly,col){
        var r1=rrect(wx,ly,wx+.8,ly+.3),r2=rrect(wx+.18,ly+.03,wx+.58,ly+.27);
        LE(r1,function(){drawRoadCar({r1:r1,r2:r2,c:col});});
      })(wx,ly,k?'#3d78c7':'#d65a4a');
    }
    LE(rrect(ENT-.06,PZ-.07,ENT+1.06,PZ+.07),drawArch);
    LE(rrect(ENT-.05,ROWS-1-.05,ENT+1.05,ROWS-1+.05),drawRoadGap);
    fenceSegs().forEach(function(f){LE(fenceRect(f),function(){drawFenceSeg(f);});});
  });
  snowmen().forEach(function(t){var r=rrect(t.x+.25,t.y+.25,t.x+.75,t.y+.75);r.f=function(){drawSnowman(t);};E.push(r);});
  sortEnt(E).forEach(function(e){e.f();});
  // 고른 건물·미리보기 바닥 표시는 그림 위에 얹는다 (높인 땅 위에서도 보이게)
  if(sb)atZ(bZ(sb),function(){
    if(isRoom(sb))sb.tiles.forEach(function(t){footprint(t.x,t.y,1,1,'rgba(255,210,63,.22)','#ffd23f',[6,4]);});
    else{var sd=bDims(sb);footprint(sb.x,sb.y,sd.w,sd.h,'rgba(255,210,63,.22)','#ffd23f',[6,4]);}
  });
  var gz=gd&&UI.ghost?plLevelZ(gd,UI.ghost.x,UI.ghost.y,UI.face):0;
  if(gd){var gdm=faceDims(gd,UI.face);gok=canPlace(gd,UI.ghost.x,UI.ghost.y,UI.face)&&(movingId()||S.money>=gd.cost);atZ(gz,function(){footprint(UI.ghost.x,UI.ghost.y,gdm.w,gdm.h,gok?'rgba(60,210,110,.35)':'rgba(235,70,60,.42)',gok?'#2fd16f':'#ff5a4a');});}
  legacy(function(){drawOutTrees(false);});
  drawWxOverlay(c);
  drawMarkers(c);
  if(isRoomDef(UI.tool))drawRoomGhost();
  if((isFloorDef(UI.tool)||isTerDef(UI.tool))&&UI.ghost)drawTerGhost();
  if(UI.tool==='path')drawPathGhost();
  if(gd){
    var gb={x:UI.ghost.x,y:UI.ghost.y,def:gd.id,id:0,face:plFace()},mvb=mvId&&bById(mvId);setPlaceLevel(gb,gd,gb.x,gb.y,gb.face);
    if(mvb){gb.id=mvb.id;gb.floors=mvb.floors;gb.cond=mvb.cond;}
    ensureDoors(gb);
    atZ(gz,function(){c.globalAlpha=.78;if(gd.cell)cellDraw(gb,function(){drawEntity(gb,0);});else legacy(function(){drawEntity(legB(gb),Math.round(gd.park*.5));});c.globalAlpha=1;});
  }
  // 고른 길 조각·바닥 칸: 건물을 고를 때처럼 노란 반투명 + 점선 테두리 (지금 무엇을 고치는지 보이게)
  if(UI.selPiece){var spc=pieceById(UI.selPiece);if(spc){c.globalAlpha=.6;drawPiece(spc,'#ffd23f');c.globalAlpha=1;
    if(spc.s)slopeFoot(spc.x,spc.y,spc.l*LV,spc.d,LV,'rgba(255,210,63,.3)','#ffd23f',[6,4]);
    else atZ(spc.l*LV+.02,function(){footprint(spc.x,spc.y,1,1,'rgba(255,210,63,.3)','#ffd23f',[6,4]);});}}
  if(UI.selFloor&&!UI.sel&&!UI.selPiece&&selCardOn()){var sf=UI.selFloor,sp=sf.pid&&pieceById(sf.pid);
    if(!sp&&isRamp(sf.x,sf.y))slopeFoot(sf.x,sf.y,th(sf.x,sf.y)*LV,tslope(sf.x,sf.y),LV,'rgba(255,210,63,.38)','#ffd23f',[6,4]);
    else atZ(sp?sp.l*LV+.02:th(sf.x,sf.y)*LV+.02,function(){footprint(sf.x,sf.y,1,1,'rgba(255,210,63,.38)','#ffd23f',[6,4]);});}
  // 고른 입구·출구: 붙은 건물도 함께 표시
  drawFx(c);
}
// 건물 위 표시: 빨간 '?'는 입구·출구에 닿는 길이 없어 이용 불가
function drawMarkers(c){
  var s=Math.max(.7,cam.z);
  // 문이 닫혀 있으면 교회 입구 위에 자물쇠 (누르면 문 열기 카드)
  if(!S.open){
    var gm=rotPt(entC(),PZ),gq=P(gm[0],gm[1],1.75),pr=(S.clock*1.4)%1;
    c.strokeStyle='rgba(255,210,63,'+(0.8*(1-pr)).toFixed(3)+')';c.lineWidth=2;c.beginPath();c.arc(gq[0],gq[1],(10+10*pr)*s,0,6.283);c.stroke();
    c.fillStyle='#d6453a';c.strokeStyle='#fff';c.lineWidth=1.6;c.beginPath();c.arc(gq[0],gq[1],10*s,0,6.283);c.fill();c.stroke();
    c.strokeStyle='#fff';c.lineWidth=1.6*s;c.beginPath();c.arc(gq[0],gq[1]-2*s,3*s,Math.PI,0);c.stroke();
    c.fillStyle='#fff';c.fillRect(gq[0]-4.2*s,gq[1]-2*s,8.4*s,6.4*s);
  }
  var mv=movingId();
  S.buildings.forEach(function(b){
    if(b.id===mv)return;
    var bad=needsDoor(b)&&!usable(b);
    if(!bad)return;
    var dm=bDims(b),m=rotPt(b.x+dm.w/2,b.y+dm.h/2),q=P(m[0],m[1],bLevel(b)*LV+bHeight(b)+.35);
    c.fillStyle='#d6453a';c.strokeStyle='#fff';c.lineWidth=1.5;
    c.beginPath();c.arc(q[0],q[1],7*s,0,6.283);c.fill();c.stroke();
    c.fillStyle='#fff';c.font='800 '+(9*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('?',q[0],q[1]+.5);
  });
}
function iconCanvas(d,k){
  k=k||1;var W=Math.round(66*k),H=Math.round(46*k),cvs=document.createElement('canvas');
  cvs.width=W*2;cvs.height=H*2;cvs.style.width=W+'px';cvs.style.height=H+'px';
  var g=cvs.getContext('2d');g.scale(2,2);
  var dw=d.w/G,dh=d.h/G,tot=heightOf(d.id),wh=dw+dh,HW0=HW*G,HH0=HH*G;
  var s=Math.min((W-6)/(wh*HW0),(H-4)/(wh*HH0+tot*ZH+14));
  var keep={c:PJ.c,ox:PJ.ox,oy:PJ.oy,s:PJ.s},rot=ROT;
  ROT=0;PJ.c=g;PJ.s=s;PJ.ox=W/2-(dw-dh)*HW0*s/2;PJ.oy=(H-(wh*HH0+tot*ZH+14)*s)/2+(tot*ZH+14)*s;
  if(d.cell){dw=d.w;dh=d.h;}
  legacy(function(){
    quad([[0,0,0],[dw,0,0],[dw,dh,0],[0,dh,0]],'#86b86f','rgba(40,80,30,.25)');
    drawEntity({x:0,y:0,def:d.id,id:7},Math.round(d.park*.6));
  });
  ROT=rot;PJ.c=keep.c;PJ.ox=keep.ox;PJ.oy=keep.oy;PJ.s=keep.s;
  return cvs;
}
