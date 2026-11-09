'use strict';
function footprint(x,y,w,h,fill,stroke,dash){
  var r=rrect(x,y,x+w,y+h),c=PJ.c;
  if(dash)c.setLineDash(dash);
  quad([[r.x0,r.y0,.01],[r.x1,r.y0,.01],[r.x1,r.y1,.01],[r.x0,r.y1,.01]],fill,null);
  if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
  c.setLineDash([]);
}
function sortEnt(E){
  var n=E.length,adj=[],i,j;
  for(i=0;i<n;i++)adj.push([]);
  for(i=0;i<n;i++)for(j=i+1;j<n;j++){
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
  drawGround();
  drawWxGround();
  drawFloors();
  drawPuddles();
  drawCloudShadows();
  drawOutTrees(true);
  var sb=UI.sel?bById(UI.sel):null;
  if(sb){
    if(isRoom(sb))sb.tiles.forEach(function(t){footprint(t.x,t.y,1,1,'rgba(255,210,63,.22)','#ffd23f',[6,4]);});
    else{var sd=bDims(sb);footprint(sb.x,sb.y,sd.w,sd.h,'rgba(255,210,63,.22)','#ffd23f',[6,4]);}
  }
  var gd=UI.ghost&&UI.tool&&D[UI.tool]&&!isRoomDef(UI.tool)&&UI.tool!=='path'&&!isFloorDef(UI.tool)?D[UI.tool]:null,gok=false;
  if(gd){var gdm=faceDims(gd,UI.face);gok=canPlace(gd,UI.ghost.x,UI.ghost.y,UI.face)&&S.money>=gd.cost;footprint(UI.ghost.x,UI.ghost.y,gdm.w,gdm.h,gok?'rgba(60,210,110,.35)':'rgba(235,70,60,.42)',gok?'#2fd16f':'#ff5a4a');}
  var E=[],use=Math.min(1,(S.members*0.35+V.length*0.15)/Math.max(1,A.park));
  S.buildings.forEach(function(b){
    if(isRoom(b)){
      var map=roomMap(b);
      b.tiles.forEach(function(t){var rt=rrect(t.x,t.y,t.x+1,t.y+1);rt.f=function(){drawRoomTile(b,t,map);};E.push(rt);});
      return;
    }
    var d=D[b.def],dm=bDims(b),r=rrect(b.x,b.y,b.x+dm.w,b.y+dm.h);
    r.f=function(){drawEntity(b,d.kind==='lot'?Math.round(use*d.park):0);};E.push(r);
  });
  S.paths.forEach(function(p){
    var rp=rrect(p.x,p.y,p.x+1,p.y+1);rp.pid=p.id;rp.zb=p.l>0?p.l*LV-.14:0;rp.zt=p.k==='sky'?p.l*LV+.72:((p.l===0&&!p.s)?0:pieceTop(p)*LV);
    rp.f=function(){drawPiece(p);};E.push(rp);
  });
  V.forEach(function(v){
    if(v.state==='inside')return;
    var p=rotPt(v.x,v.y),z=v.z||0;
    E.push({x0:p[0]-.05,y0:p[1]-.05,x1:p[0]+.05,y1:p[1]+.05,zb:z,zt:z+.7,on:v.node>=PN?v.node-PN:0,f:function(){drawVisitor(v);}});
  });
  for(var k=0;k<2;k++){
    var span=COLS+2*BAND,wx=k===0?((S.clock*1.6+3)%span)-BAND:COLS+BAND-((S.clock*1.25+9)%span),ly=k===0?ROWS-1+.58:ROWS-1+.14;
    if(wx<-BAND||wx+.8>COLS+BAND)continue;
    (function(wx,ly,col){
      var r1=rrect(wx,ly,wx+.8,ly+.3),r2=rrect(wx+.18,ly+.03,wx+.58,ly+.27);
      E.push({x0:r1.x0,y0:r1.y0,x1:r1.x1,y1:r1.y1,f:function(){drawRoadCar({r1:r1,r2:r2,c:col});}});
    })(wx,ly,k?'#3d78c7':'#d65a4a');
  }
  var ar=rrect(ENT-.06,PZ-.07,ENT+1.06,PZ+.07);ar.f=drawArch;E.push(ar);
  var rg=rrect(ENT-.05,ROWS-1-.05,ENT+1.05,ROWS-1+.05);rg.f=drawRoadGap;E.push(rg);
  fenceSegs().forEach(function(f){var r=fenceRect(f);r.f=function(){drawFenceSeg(f);};E.push(r);});
  snowmen().forEach(function(t){var r=rrect(t.x+.25,t.y+.25,t.x+.75,t.y+.75);r.f=function(){drawSnowman(t);};E.push(r);});
  sortEnt(E).forEach(function(e){e.f();});
  drawOutTrees(false);
  drawWxOverlay(c);
  drawMarkers(c);
  if(isRoomDef(UI.tool))drawRoomGhost();
  if(isFloorDef(UI.tool)&&UI.ghost)footprint(UI.ghost.x,UI.ghost.y,1,1,'rgba(255,210,63,.22)','#ffd23f',[4,3]);
  if(UI.tool==='path')drawPathGhost();
  if(gd){
    var gb={x:UI.ghost.x,y:UI.ghost.y,def:gd.id,id:0,face:UI.face};
    ensureDoors(gb);
    c.globalAlpha=.78;drawEntity(gb,Math.round(gd.park*.5));c.globalAlpha=1;
    drawDoorPads(gb);
  }
  if(UI.selPiece){var spc=pieceById(UI.selPiece);if(spc){c.globalAlpha=.55;drawPiece(spc,'#ffd23f');c.globalAlpha=1;}}
  if(sb){
    drawDoorPads(sb);
    var sd2=bDims(sb),mp=rotPt(sb.x+sd2.w/2,sb.y+sd2.h/2),q=P(mp[0],mp[1],bHeight(sb)+.45+Math.sin(S.clock*4)*.06),s=Math.max(.7,cam.z);
    c.fillStyle='#ffd23f';c.strokeStyle='rgba(30,30,30,.6)';c.lineWidth=1.5;c.beginPath();
    c.moveTo(q[0]-7*s,q[1]-10*s);c.lineTo(q[0]+7*s,q[1]-10*s);c.lineTo(q[0],q[1]);c.closePath();c.fill();c.stroke();
  }
  drawFx(c);
}
// 건물 위 표시: 주황 '!'는 수리 필요(상태 50% 미만), 빨간 '?'는 입구·출구에 닿는 길이 없어 이용 불가
function drawMarkers(c){
  var s=Math.max(.7,cam.z);
  // 문이 닫혀 있으면 교회 입구 위에 자물쇠 (누르면 문 열기 카드)
  if(!S.open){
    var gm=rotPt(ENT+.5,PZ),gq=P(gm[0],gm[1],1.75),pr=(S.clock*1.4)%1;
    c.strokeStyle='rgba(255,210,63,'+(0.8*(1-pr)).toFixed(3)+')';c.lineWidth=2;c.beginPath();c.arc(gq[0],gq[1],(10+10*pr)*s,0,6.283);c.stroke();
    c.fillStyle='#d6453a';c.strokeStyle='#fff';c.lineWidth=1.6;c.beginPath();c.arc(gq[0],gq[1],10*s,0,6.283);c.fill();c.stroke();
    c.strokeStyle='#fff';c.lineWidth=1.6*s;c.beginPath();c.arc(gq[0],gq[1]-2*s,3*s,Math.PI,0);c.stroke();
    c.fillStyle='#fff';c.fillRect(gq[0]-4.2*s,gq[1]-2*s,8.4*s,6.4*s);
  }
  S.buildings.forEach(function(b){
    var bad=b.door&&!usable(b),worn=maintainable(b)&&condOf(b)<50;
    if(!bad&&!worn)return;
    var dm=bDims(b),m=rotPt(b.x+dm.w/2,b.y+dm.h/2),q=P(m[0],m[1],bHeight(b)+.35);
    c.fillStyle=bad?'#d6453a':'#e8892c';c.strokeStyle='#fff';c.lineWidth=1.5;
    c.beginPath();c.arc(q[0],q[1],7*s,0,6.283);c.fill();c.stroke();
    c.fillStyle='#fff';c.font='800 '+(9*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(bad?'?':'!',q[0],q[1]+.5);
  });
}
function iconCanvas(d){
  var W=66,H=46,cvs=document.createElement('canvas');
  cvs.width=W*2;cvs.height=H*2;cvs.style.width=W+'px';cvs.style.height=H+'px';
  var g=cvs.getContext('2d');g.scale(2,2);
  var tot=heightOf(d.id),wh=d.w+d.h;
  var s=Math.min((W-6)/(wh*HW),(H-4)/(wh*HH+tot*ZH+14));
  var keep={c:PJ.c,ox:PJ.ox,oy:PJ.oy,s:PJ.s},rot=ROT;
  ROT=0;PJ.c=g;PJ.s=s;PJ.ox=W/2-(d.w-d.h)*HW*s/2;PJ.oy=(H-(wh*HH+tot*ZH+14)*s)/2+(tot*ZH+14)*s;
  quad([[0,0,0],[d.w,0,0],[d.w,d.h,0],[0,d.h,0]],'#86b86f','rgba(40,80,30,.25)');
  drawEntity({x:0,y:0,def:d.id,id:7},Math.round(d.park*.6));
  ROT=rot;PJ.c=keep.c;PJ.ox=keep.ox;PJ.oy=keep.oy;PJ.s=keep.s;
  return cvs;
}
