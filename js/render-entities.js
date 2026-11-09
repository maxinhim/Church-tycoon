'use strict';
function drawBld(b){
  // 층을 올린 건물은 층마다 한 층 높이(LV)로 쌓고, 지붕은 맨 위에
  var d=D[b.def],dm=faceDims(d,b.face),x=b.x,y=b.y,w=dm.w,h=dm.h,fl=b.floors||1,H1=fl>1?LV:d.H,H=fl>1?fl*LV:d.H,s=PJ.s;
  box(rrect(x+.03,y+.03,x+w-.03,y+h-.03),0,.05,'#cfc8b8');
  var r=rrect(x+.1,y+.1,x+w-.1,y+h-.1);
  var alongX=(w>=h)!==(ROT%2===1);
  var main=function(){
    box(r,.05,H,d.wall,d.roof==='flat'?shade(d.roofc,1.05):null);
    for(var fk=0;fk<fl;fk++){
      feats(r,H1,d,fk*H1);
      if(fk>0){fr('L',r,r.x0,r.x1,fk*H1+.02,fk*H1+.07,shade(d.wall,.8));fr('R',r,r.y0,r.y1,fk*H1+.02,fk*H1+.07,shade(d.wall,.64));}
    }
    if(d.deco==='awning'){
      var n=Math.max(3,Math.round((r.x1-r.x0)/0.18)),st=(r.x1-r.x0)/n,i,a;
      var m=Math.max(3,Math.round((r.y1-r.y0)/0.18)),st2=(r.y1-r.y0)/m;
      for(i=0;i<m;i++){a=r.y0+i*st2;quad([[r.x1,a,H1*.8],[r.x1,a+st2,H1*.8],[r.x1+.14,a+st2,H1*.58],[r.x1+.14,a,H1*.58]],i%2?'#d8d2c6':'#a8432f');}
      for(i=0;i<n;i++){a=r.x0+i*st;quad([[a,r.y1,H1*.8],[a+st,r.y1,H1*.8],[a+st,r.y1+.14,H1*.58],[a,r.y1+.14,H1*.58]],i%2?'#f4efe6':'#c4503a');}
    }
    if(d.deco==='dots'){
      var dc=['#e0567f','#4a78c7','#3d9b7a','#7a5bc7'];
      for(var k=0;k<7;k++){var t=hh(b.id*5+k,k*11);if(Math.abs(t-.5)<.12)continue;dot(r.x0+t*(r.x1-r.x0),r.y1,H1*(.22+.6*hh(k,b.id+3)),Math.max(1,2.2*s),dc[k%4]);}
    }
    if(d.deco==='wc'){
      var mid=(r.x0+r.x1)/2;fr('L',r,mid-.16,mid+.16,H1*.66,H1*.92,'#ffffff');
      if(s>.45){var q=P(mid,r.y1,H1*.79),c=PJ.c;c.fillStyle='#2f5f7a';c.font='700 '+(7.5*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('WC',q[0],q[1]);}
    }
    if(d.deco==='park'){var pm=(r.x0+r.x1)/2;fr('L',r,pm-.15,pm+.15,H1*.55,H1*.85,'#2a56c6');if(s>.45){var qp=P(pm,r.y1,H1*.7),cp=PJ.c;cp.fillStyle='#fff';cp.font='800 '+(8*s)+'px sans-serif';cp.textAlign='center';cp.textBaseline='middle';cp.fillText('P',qp[0],qp[1]);}}
    if(d.deco==='clinic'){var cm=(r.x0+r.x1)/2,zc=H1*.7;fr('L',r,cm-.05,cm+.05,zc-.16,zc+.16,'#2f9e6e');fr('L',r,cm-.16,cm+.16,zc-.05,zc+.05,'#2f9e6e');}
    if(d.deco==='info'){var im=(r.x0+r.x1)/2;fr('L',r,im-.13,im+.13,H1*.6,H1*.9,'#2a56c6');if(s>.45){var qi=P(im,r.y1,H1*.75),ci=PJ.c;ci.fillStyle='#fff';ci.font='700 '+(8*s)+'px sans-serif';ci.textAlign='center';ci.textBaseline='middle';ci.fillText('i',qi[0],qi[1]);}}
    var top=null;
    if(d.roof==='gable')top=gable(r,H,d.rh,d.roofc,d.wall,alongX);
    else if(d.roof==='hip')top=hip(r,H,d.rh,d.roofc);
    else{
      quad([[r.x0+.07,r.y0+.07,H],[r.x1-.07,r.y0+.07,H],[r.x1-.07,r.y1-.07,H],[r.x0+.07,r.y1-.07,H]],shade(d.roofc,.86));
      if(d.bigwin||d.deco==='awning'){var u=d.bigwin?.22:.15,cx2=(r.x0+r.x1)/2,cy2=(r.y0+r.y1)/2;box({x0:cx2-u,y0:cy2-u,x1:cx2+u,y1:cy2+u},H,H+.2,'#9aa4ab');}
    }
    if(d.deco==='crossRidge'&&top)cross(top[0],top[1],top[2],.9);
    if(d.deco==='crossApex'&&top)cross(top[0],top[1],top[2],.75);
  };
  if(d.deco==='tower'){
    var tr=towerRect(b.face,x,y,w,h),TH=d.towerH+(H-d.H);
    var tower=function(){
      box(tr,.05,TH,'#f5f0e6');
      var mx=(tr.x0+tr.x1)/2,my=(tr.y0+tr.y1)/2;
      fr('L',tr,mx-.1,mx+.1,TH-.6,TH-.18,'#2d2a33');fr('R',tr,my-.1,my+.1,TH-.6,TH-.18,'#24222a');
      fr('L',tr,mx-.12,mx+.12,.05,.6,'#4a3628');
      var ap=hip(tr,TH,.75,d.roofc);cross(ap[0],ap[1],ap[2],1.05);
    };
    if(tr.x0+tr.x1+tr.y0+tr.y1<r.x0+r.x1+r.y0+r.y1){tower();main();}else{main();tower();}
  }else main();
  drawDoorsOn(b);
}
// 종탑은 정면 한쪽 끝에 (가운데 출입구를 가리지 않게)
function towerRect(face,x,y,w,h){
  var f=face==null?2:face;
  if(f===2)return rrect(x+w-.68,y+h-.64,x+w-.08,y+h-.02);
  if(f===3)return rrect(x+.08,y+.02,x+.68,y+.64);
  if(f===0)return rrect(x+w-.64,y+.08,x+w-.02,y+.68);
  return rrect(x+.02,y+h-.68,x+.64,y+h-.08);
}
function drawLot(b,cars){
  var d=D[b.def],x=b.x,y=b.y,c=PJ.c,cols=d.w*2,row,i;
  box(rrect(x+.02,y+.02,x+d.w-.02,y+d.h-.02),0,.04,'#59626b','#5d6670');
  c.strokeStyle='rgba(255,255,255,.72)';c.lineWidth=Math.max(.6,1.2*PJ.s);c.beginPath();
  for(row=0;row<d.h;row++)for(i=0;i<=cols;i++){
    var a=rotPt(x+i*.5,y+row+.1),bb=rotPt(x+i*.5,y+row+.9),p1=P(a[0],a[1],.04),p2=P(bb[0],bb[1],.04);
    c.moveTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);
  }
  c.stroke();
  var parts=[],CC=['#c75b4a','#e8e8e8','#4a78c7','#d1a02e','#3d3d46','#3d9b7a','#8a5bb5'];
  for(var k=0;k<Math.min(cars,d.park);k++){
    var col=k%cols;row=(k/cols)|0;
    var r1=rrect(x+col*.5+.1,y+row+.14,x+col*.5+.4,y+row+.86),r2=rrect(x+col*.5+.12,y+row+.32,x+col*.5+.38,y+row+.66);
    parts.push({k:r1.x0+r1.y0,r1:r1,r2:r2,c:CC[(k*5+b.id)%CC.length]});
  }
  parts.sort(function(a,b){return a.k-b.k;});
  parts.forEach(function(p){box(p.r1,.04,.18,p.c);box(p.r2,.18,.3,p.c,'#bcd3e0');});
}
function drawTree(b){
  var c=PJ.c,s=PJ.s,p=rotPt(b.x+.5,b.y+.5),g=P(p[0],p[1],0),hv=hh(b.x*7+b.id,b.y*3+1);
  c.fillStyle='rgba(20,40,10,.22)';c.beginPath();c.ellipse(g[0]+4*s,g[1]+1*s,14*s,6.5*s,0,0,6.283);c.fill();
  box(rrect(b.x+.45,b.y+.45,b.x+.55,b.y+.55),0,.55,'#6b4f3a');
  if(hv<.38){
    for(var k=0;k<3;k++){
      var zb=.4+k*.34,wd=(15-k*3.6)*s,qb=P(p[0],p[1],zb),qt=P(p[0],p[1],zb+.6);
      c.fillStyle='#2e6a44';c.beginPath();c.moveTo(qb[0]-wd,qb[1]);c.lineTo(qb[0]+wd,qb[1]);c.lineTo(qt[0],qt[1]);c.closePath();c.fill();
      c.fillStyle='#3f8656';c.beginPath();c.moveTo(qb[0]-wd,qb[1]);c.lineTo(qb[0],qb[1]+wd*.18);c.lineTo(qt[0],qt[1]);c.closePath();c.fill();
    }
  }else{
    var q=P(p[0],p[1],1.0),R=(13+hv*3)*s;
    c.fillStyle='#3b7539';c.beginPath();c.arc(q[0],q[1],R,0,6.283);c.fill();
    c.fillStyle='#4e9147';c.beginPath();c.arc(q[0]-3*s,q[1]-3*s,R*.74,0,6.283);c.fill();
    c.fillStyle='#69ad5c';c.beginPath();c.arc(q[0]-5.5*s,q[1]-6.5*s,R*.36,0,6.283);c.fill();
  }
}
function drawFlower(b){
  box(rrect(b.x+.12,b.y+.12,b.x+.88,b.y+.88),0,.14,'#8a6a4f','#5e4330');
  var cols=['#e0567f','#f2c14e','#ffffff','#b574d6','#ff8a4a'],s=PJ.s;
  for(var i=0;i<9;i++){var p=rotPt(b.x+.2+hh(b.id*3+i,i)*.6,b.y+.2+hh(i*7,b.id+i)*.6);dot(p[0],p[1],.17,Math.max(.6,1.5*s),'#3f7a3a');dot(p[0],p[1],.2,Math.max(.8,2.1*s),cols[i%5]);}
}
function drawBench(b){
  var x=b.x,y=b.y,parts=[
    {r:rrect(x+.28,y+.47,x+.72,y+.53),z0:0,z1:.14,c:'#4f3e2c'},
    {r:rrect(x+.2,y+.36,x+.8,y+.41),z0:.14,z1:.42,c:'#8a6844'},
    {r:rrect(x+.2,y+.41,x+.8,y+.6),z0:.14,z1:.2,c:'#a07a52'}];
  parts.forEach(function(p){p.k=p.r.x0+p.r.x1+p.r.y0+p.r.y1;});
  parts.sort(function(a,b){return a.k-b.k;});
  parts.forEach(function(p){box(p.r,p.z0,p.z1,p.c);});
}
function drawSpire(b){
  var d=D.spire;
  box(rrect(b.x+.18,b.y+.18,b.x+.82,b.y+.82),0,.06,'#cfc8b8');
  var r=rrect(b.x+.3,b.y+.3,b.x+.7,b.y+.7),mx=(r.x0+r.x1)/2,my=(r.y0+r.y1)/2;
  box(r,.06,1.95,d.wall);
  fr('L',r,mx-.08,mx+.08,1.4,1.75,'#2d2a33');fr('R',r,my-.08,my+.08,1.4,1.75,'#24222a');
  var ap=hip(r,1.95,.8,d.roofc);cross(ap[0],ap[1],ap[2],1.05);
}
function drawEntity(b,cars){
  var k=D[b.def].kind;
  if(k==='mroom'){drawRoom(b);return;}
  if(k==='path'){drawPiece({x:b.x,y:b.y,l:0,s:1,d:3,k:'stone'});return;}
  if(k==='floor'){drawFloorTile(b.def,b.x,b.y);return;}
  if(k==='fountain'){drawFountain(b);return;}
  if(k==='lamp'){drawLamp(b);return;}
  if(k==='hedge'){drawHedge(b);return;}
  if(k==='arch'){drawRoseArch(b);return;}
  if(k==='stage'){drawStage(b);return;}
  if(k==='playground'){drawPlayground(b);return;}
  if(k==='pond'){drawPond(b);return;}
  if(k==='picnic'){drawPicnic(b);return;}
  if(k==='statue'){drawStatue(b);return;}
  if(k==='planter'){drawPlanter(b);return;}
  if(k==='gazebo'){drawGazebo(b);return;}
  if(k==='busstop'){drawBusStop(b);return;}
  if(k==='bld')drawBld(b);else if(k==='lot')drawLot(b,cars||0);else if(k==='tree')drawTree(b);
  else if(k==='flower')drawFlower(b);else if(k==='bench')drawBench(b);else if(k==='spire')drawSpire(b);
}
function drawVisitor(v){
  var c=PJ.c,s=PJ.s,p=rotPt(v.x,v.y),q=P(p[0],p[1],v.z||0);
  var walking=v.state==='walk'||v.state==='leave';
  var bob=walking?Math.abs(Math.sin(S.clock*11+v.ph))*1.2*s:0;
  var bw=Math.max(2.6,4.6*s),bh=Math.max(3.4,7*s),lg=Math.max(1.6,3*s),hr=Math.max(1.5,2.6*s);
  c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(q[0],q[1],bw*.9,bw*.38,0,0,6.283);c.fill();
  c.fillStyle=v.pant;c.fillRect(q[0]-bw/2,q[1]-lg,bw,lg);
  c.fillStyle=v.tint;c.fillRect(q[0]-bw/2,q[1]-lg-bh-bob,bw,bh+bob*.5);
  c.fillStyle='#f0cfa8';c.beginPath();c.arc(q[0],q[1]-lg-bh-hr-bob,hr,0,6.283);c.fill();
  var top=q[1]-lg-bh-hr*2-bob;
  if(v.want&&v.state==='walk'){c.fillStyle=NC[v.want];c.beginPath();c.arc(q[0],top-3.2*Math.max(s,.6),Math.max(1.6,2.4*s),0,6.283);c.fill();c.strokeStyle='#fff';c.lineWidth=1;c.stroke();}
  if(v.state==='wait'){c.fillStyle='#fff';c.font='700 '+Math.max(9,11*s)+'px sans-serif';c.textAlign='center';c.textBaseline='bottom';c.fillText('…',q[0],top);}
}
function drawRoadCar(e){
  box(e.r1,.02,.16,e.c);box(e.r2,.16,.28,e.c,'#bcd3e0');
}
function drawArch(){
  var y=ROWS-1,s=PJ.s;
  box(rrect(ENT+.04,y+.06,ENT+.12,y+.14),0,1.15,'#f1ece2');
  box(rrect(ENT+.88,y+.06,ENT+.96,y+.14),0,1.15,'#f1ece2');
  box(rrect(ENT,y+.05,ENT+1,y+.15),1.0,1.2,'#3f5ea3');
  var m=rotPt(ENT+.5,y+.1);cross(m[0],m[1],1.2,.7);
  if(s>.42){var q=P(m[0],m[1],1.1),c=PJ.c;c.font='600 '+(8*s)+'px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=2.5;c.strokeStyle='rgba(20,30,60,.8)';c.strokeText(S.name,q[0],q[1]+10*s);c.fillStyle='#fff';c.fillText(S.name,q[0],q[1]+10*s);}
}
// 지도 밖까지 잔디를 이어 깔아 떠 있는 섬처럼 보이지 않게 한다. 도로도 양옆으로 이어진다
function drawGround(){
  var c=PJ.c,rx=RX(),ry=RY(),B=BAND,x,y,q;
  var on=function(px,py){return px>-80&&py>-80&&px<VW+80&&py<VH+80;};
  quad([[-B,-B,0],[rx+B,-B,0],[rx+B,ry+B,0],[-B,ry+B,0]],'#80b169');
  c.fillStyle='#86b86f';c.beginPath();
  for(y=-B;y<ry+B;y++)for(x=-B;x<rx+B;x++){
    if(!((x+y)&1))continue;
    var p0=P(x,y,0),p2=P(x+1,y+1,0);
    if(!on(p0[0],p0[1])&&!on(p2[0],p2[1]))continue;
    var p1=P(x+1,y,0),p3=P(x,y+1,0);
    c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.lineTo(p3[0],p3[1]);c.closePath();
  }
  c.fill();
  // 부지(지도) 안 칸 선
  c.strokeStyle='rgba(40,80,30,.12)';c.lineWidth=1;c.beginPath();
  for(x=0;x<=rx;x++){var a1=P(x,0,0),a2=P(x,ry,0);c.moveTo(a1[0],a1[1]);c.lineTo(a2[0],a2[1]);}
  for(y=0;y<=ry;y++){var b1=P(0,y,0),b2=P(rx,y,0);c.moveTo(b1[0],b1[1]);c.lineTo(b2[0],b2[1]);}
  c.stroke();
  if(PJ.s>.35){
    c.fillStyle='#6a9c56';
    for(y=0;y<ROWS-1;y++)for(x=0;x<COLS;x++){
      if(hh(x,y)>=.4)continue;
      var pt=rotPt(x+.2+hh(y,x)*.6,y+.2+hh(x+9,y)*.6);q=P(pt[0],pt[1],0);
      if(on(q[0],q[1]))c.fillRect(q[0],q[1]-2.4*PJ.s,1.2*PJ.s+.4,2.4*PJ.s);
    }
  }
  // 도로: 지도 양옆 바깥까지
  var rr=rrect(-B,ROWS-1,COLS+B,ROWS);
  quad([[rr.x0,rr.y0,.004],[rr.x1,rr.y0,.004],[rr.x1,rr.y1,.004],[rr.x0,rr.y1,.004]],'#5c6670');
  c.lineWidth=Math.max(1,2.4*PJ.s);c.strokeStyle='#c3c8cc';c.beginPath();
  var ca=rotPt(-B,ROWS-1),cb=rotPt(COLS+B,ROWS-1),pa=P(ca[0],ca[1],.01),pb=P(cb[0],cb[1],.01);c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);
  ca=rotPt(-B,ROWS);cb=rotPt(COLS+B,ROWS);pa=P(ca[0],ca[1],.01);pb=P(cb[0],cb[1],.01);c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);c.stroke();
  c.strokeStyle='#e8d36a';c.lineWidth=Math.max(.8,1.6*PJ.s);c.beginPath();
  for(x=-B;x<COLS+B;x++){var d1=rotPt(x+.2,ROWS-.5),d2=rotPt(x+.6,ROWS-.5),q1=P(d1[0],d1[1],.01),q2=P(d2[0],d2[1],.01);if(on(q1[0],q1[1])){c.moveTo(q1[0],q1[1]);c.lineTo(q2[0],q2[1]);}}
  c.stroke();
}
// 지도 밖 장식 나무: 화면 뒤쪽(back=true) 나무는 건물보다 먼저, 앞쪽 나무는 나중에 그린다
var OUTTREES=null;
function drawOutTrees(back){
  if(!OUTTREES){
    OUTTREES=[];
    for(var y=-BAND;y<ROWS+BAND;y++)for(var x=-BAND;x<COLS+BAND;x++){
      if(x>=0&&x<COLS&&y>=0&&y<ROWS)continue;
      if(y>=ROWS-2&&y<=ROWS)continue;
      if(hh(x+77,y+31)<0.07)OUTTREES.push({x:x,y:y,id:(x*7+y*13)&255});
    }
  }
  var rx=RX(),ry=RY();
  OUTTREES.forEach(function(t){
    var p=rotPt(t.x+.5,t.y+.5),isBack=p[0]<0||p[1]<0;
    if(isBack!==back)return;
    var q=P(p[0],p[1],0);if(q[0]<-60||q[1]<-120||q[0]>VW+60||q[1]>VH+60)return;
    drawTree(t);
  });
}

/* ---------- 조경 요소 ---------- */
function drawFountain(b){
  var x=b.x,y=b.y,c=PJ.c,s=PJ.s;
  box(rrect(x+.1,y+.1,x+.9,y+.9),0,.2,'#c9c2b6','#86bfe0');
  box(rrect(x+.42,y+.42,x+.58,y+.58),.2,.52,'#d8d2c6');
  var p=rotPt(x+.5,y+.5),q=P(p[0],p[1],.6),q2=P(p[0],p[1],.95);
  c.fillStyle='rgba(175,218,240,.9)';c.beginPath();c.ellipse(q[0],q[1],6*s,3.4*s,0,0,6.283);c.fill();
  c.strokeStyle='rgba(205,236,255,.95)';c.lineWidth=Math.max(.8,1.4*s);c.beginPath();
  c.moveTo(q[0],q[1]);c.quadraticCurveTo(q2[0]-7*s,q2[1],q[0]-11*s,q[1]+7*s);
  c.moveTo(q[0],q[1]);c.quadraticCurveTo(q2[0]+7*s,q2[1],q[0]+11*s,q[1]+7*s);c.stroke();
}
function drawLamp(b){
  var x=b.x+.5,y=b.y+.5,c=PJ.c,s=PJ.s;
  box(rrect(x-.1,y-.1,x+.1,y+.1),0,.08,'#59626b');
  box(rrect(x-.04,y-.04,x+.04,y+.04),.08,1.45,'#3d4650');
  box(rrect(x-.11,y-.11,x+.11,y+.11),1.45,1.64,'#f5e6a8','#fff4c2');
  var p=rotPt(x,y),q=P(p[0],p[1],1.55),g=c.createRadialGradient(q[0],q[1],0,q[0],q[1],18*s);
  g.addColorStop(0,'rgba(255,240,180,.38)');g.addColorStop(1,'rgba(255,240,180,0)');
  c.fillStyle=g;c.beginPath();c.arc(q[0],q[1],18*s,0,6.283);c.fill();
}
function drawHedge(b){
  var f=b.face==null?2:b.face,r=(f===0||f===1)?rrect(b.x+.2,b.y+.06,b.x+.8,b.y+.94):rrect(b.x+.06,b.y+.2,b.x+.94,b.y+.8);
  box(r,0,.5,'#3f7d3c','#5a9a4f');
}
function drawRoseArch(b){
  var x=b.x,y=b.y;
  box(rrect(x+.1,y+.44,x+.19,y+.56),0,1.3,'#f1ece2');
  box(rrect(x+.81,y+.44,x+.9,y+.56),0,1.3,'#f1ece2');
  box(rrect(x+.08,y+.42,x+.92,y+.58),1.3,1.42,'#f1ece2');
  for(var i=0;i<10;i++){var t=hh(b.id*3+i+1,i),p=rotPt(x+.1+t*.8,y+.5);dot(p[0],p[1],.9+hh(i,b.id+2)*.5,Math.max(1,2.2*PJ.s),i%2?'#d9567a':'#3f7a3a');}
}

/* ---------- 새 건물·조경 ---------- */
function drawStage(b){
  var x=b.x,y=b.y,dm=faceDims(D[b.def],b.face),w=dm.w,h=dm.h;
  box(rrect(x+.1,y+.1,x+w-.1,y+h-.1),0,.08,'#cfc8b8');
  var f=b.face==null?2:b.face,st;
  if(f===2)st=rrect(x+.3,y+.2,x+w-.3,y+1.1);else if(f===3)st=rrect(x+.3,y+h-1.1,x+w-.3,y+h-.2);
  else if(f===0)st=rrect(x+.2,y+.3,x+1.1,y+h-.3);else st=rrect(x+w-1.1,y+.3,x+w-.2,y+h-.3);
  box(st,.08,.36,'#a07a52','#c9a77a');
  var m=[(st.x0+st.x1)/2,(st.y0+st.y1)/2];cross(m[0],m[1],.36,1.3);
  for(var i=0;i<6;i++){var bx=x+.35+(i%3)*(w-.7)/2.6,by=y+h*.55+Math.floor(i/3)*.55;if(f!==2){bx=x+.35+(i%3)*(w-.7)/2.6;by=y+.35+Math.floor(i/3)*.55;}
    var br=rrect(bx,by,bx+.5,by+.12);box(br,.08,.22,'#8a6844');}
}
function drawPlayground(b){
  var x=b.x,y=b.y;
  box(rrect(x+.05,y+.05,x+1.95,y+1.95),0,.04,'#e0c48a','#e7cf9c');
  box(rrect(x+.3,y+.3,x+.7,y+.7),.04,.8,'#e8892c');box(rrect(x+.25,y+.25,x+.75,y+.75),.8,.9,'#3f6fe0');
  var p=rotPt(x+.5,y+.75),q=rotPt(x+.5,y+1.6),c=PJ.c,a=P(p[0],p[1],.8),bq=P(q[0],q[1],.06);
  c.strokeStyle='#d9467a';c.lineWidth=Math.max(2,4*PJ.s);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(bq[0],bq[1]);c.stroke();
  box(rrect(x+1.2,y+.25,x+1.27,y+.32),.04,.95,'#59626b');box(rrect(x+1.7,y+.25,x+1.77,y+.32),.04,.95,'#59626b');
  box(rrect(x+1.2,y+.25,x+1.77,y+.32),.95,1.0,'#59626b');
  [1.37,1.6].forEach(function(sx){var s1=rotPt(x+sx,y+.28),pa=P(s1[0],s1[1],.95),pb=P(s1[0],s1[1],.35);c.strokeStyle='#3d4650';c.lineWidth=1;c.beginPath();c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);c.stroke();});
}
function drawPond(b){
  var x=b.x,y=b.y,dm=faceDims(D[b.def],b.face);
  box(rrect(x+.08,y+.08,x+dm.w-.08,y+dm.h-.08),0,.06,'#9b8f7c','#5f9fc4');
  var c=PJ.c,s=PJ.s;
  for(var i=0;i<3;i++){var p=rotPt(x+.5+hh(b.id+i,i)*(dm.w-1),y+.5+hh(i,b.id)*(dm.h-1)),q=P(p[0],p[1],.07);c.fillStyle=i%2?'#e8892c':'#3f8656';c.beginPath();c.ellipse(q[0],q[1],(i%2?3:5)*s,(i%2?1.6:2.6)*s,0,0,6.283);c.fill();}
}
function drawPicnic(b){
  var x=b.x,y=b.y;
  box(rrect(x+.2,y+.3,x+.8,y+.4),0,.22,'#8a6844');box(rrect(x+.2,y+.6,x+.8,y+.7),0,.22,'#8a6844');
  box(rrect(x+.45,y+.45,x+.55,y+.55),0,.4,'#6b4f3a');box(rrect(x+.15,y+.38,x+.85,y+.62),.4,.46,'#a07a52','#c75b4a');
}
function drawStatue(b){
  var x=b.x,y=b.y;
  box(rrect(x+.2,y+.2,x+.8,y+.8),0,.3,'#cfc8b8');
  box(rrect(x+.44,y+.44,x+.56,y+.56),.3,1.5,'#e9e4da');
  box(rrect(x+.3,y+.44,x+.7,y+.56),1.12,1.24,'#e9e4da');
  var p=rotPt(x+.5,y+.5),q=P(p[0],p[1],1.55),c=PJ.c,g=c.createRadialGradient(q[0],q[1],0,q[0],q[1],14*PJ.s);
  g.addColorStop(0,'rgba(255,225,140,.4)');g.addColorStop(1,'rgba(255,225,140,0)');c.fillStyle=g;c.beginPath();c.arc(q[0],q[1],14*PJ.s,0,6.283);c.fill();
}
function drawPlanter(b){
  var x=b.x,y=b.y;box(rrect(x+.3,y+.3,x+.7,y+.7),0,.3,'#b9694c');
  for(var i=0;i<6;i++){var p=rotPt(x+.35+hh(b.id+i,i)*.3,y+.35+hh(i,b.id+1)*.3);dot(p[0],p[1],.36+hh(i,i)*.18,Math.max(1,2.4*PJ.s),i%2?'#e57a95':'#3f8656');}
}
function drawGazebo(b){
  var x=b.x,y=b.y,r=rrect(x+.2,y+.2,x+1.8,y+1.8);
  box(rrect(x+.1,y+.1,x+1.9,y+1.9),0,.08,'#cfc8b8');
  [[.25,.25],[1.68,.25],[.25,1.68],[1.68,1.68]].forEach(function(o){box(rrect(x+o[0],y+o[1],x+o[0]+.08,y+o[1]+.08),.08,.95,'#8a6844');});
  box(rrect(x+.6,y+.85,x+1.4,y+1.15),.08,.3,'#a07a52');
  hip(r,.95,.6,'#8a5a2b');
}
function drawBusStop(b){
  var x=b.x,y=b.y;
  box(rrect(x+.15,y+.6,x+.85,y+.7),0,.9,'rgba(170,205,230,.6)');
  box(rrect(x+.1,y+.3,x+.9,y+.75),.9,.98,'#3f5ea3');
  box(rrect(x+.25,y+.45,x+.75,y+.55),0,.24,'#8a6844');
  box(rrect(x+.86,y+.2,x+.9,y+.24),0,1.2,'#59626b');box(rrect(x+.8,y+.16,x+.96,y+.28),1.05,1.25,'#e8d36a');
}
