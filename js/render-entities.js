'use strict';
/* 정면 방향 돌리기: 그림 함수는 '정면이 +y(face 2)'라고 보고 칸 안 좌표(u,v)로 그린다.
   fPt·fRect가 그 좌표를 실제 정면 방향(face)으로 돌려 준다. W·H는 정의상 가로·세로(돌리기 전) */
function fPt(b,u,v){
  var d=D[b.def],W=d.w,H=d.h,f=b.face==null?2:b.face;
  if(f===2)return [b.x+u,b.y+v];
  if(f===3)return [b.x+W-u,b.y+H-v];
  if(f===0)return [b.x+v,b.y+W-u];
  return [b.x+H-v,b.y+u];
}
function fRect(b,u0,v0,u1,v1){var a=fPt(b,u0,v0),c=fPt(b,u1,v1);return rrect(Math.min(a[0],c[0]),Math.min(a[1],c[1]),Math.max(a[0],c[0]),Math.max(a[1],c[1]));}
// 여러 조각을 앞뒤 순서대로 그린다 (돌린 뒤에도 가려짐이 맞게)
function drawParts(parts){
  parts.forEach(function(p){p.k=p.r.x0+p.r.x1+p.r.y0+p.r.y1;});
  parts.sort(function(a,c){return a.k-c.k;}).forEach(function(p){box(p.r,p.z0,p.z1,p.c,p.t);});
}
function drawBld(b){
  // 층을 올린 건물은 층마다 한 층 높이(LV)로 쌓고, 지붕은 맨 위에
  var d=D[b.def],dm=faceDims(d,b.face),x=b.x,y=b.y,w=dm.w,h=dm.h,fl=b.floors||1,H1=fl>1?LV:d.H,H=fl>1?fl*LV:d.H,s=PJ.s;
  box(rrect(x+.03,y+.03,x+w-.03,y+h-.03),0,.05,'#cfc8b8');
  var r=rrect(x+.1,y+.1,x+w-.1,y+h-.1);
  // 용마루: 긴 쪽을 따라. 정사각형이면 정면에서 뒤로 (박공 끝이 정면을 보게) — 정면을 돌리면 지붕도 돈다
  var worldX=w!==h?w>h:(b.face===0||b.face===1),alongX=worldX!==(ROT%2===1);
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
    if(d.deco==='sign'){var sm=(r.x0+r.x1)/2,sw2=Math.min(.34,(r.x1-r.x0)*.3);fr('L',r,sm-sw2,sm+sw2,H1*.62,H1*.9,d.signc||'#3f5ea3');if(s>.45){var qs=P(sm,r.y1,H1*.76),cs2=PJ.c;cs2.fillStyle='#fff';cs2.font='700 '+(7*s)+'px "IBM Plex Sans KR",sans-serif';cs2.textAlign='center';cs2.textBaseline='middle';cs2.fillText(d.sign,qs[0],qs[1]);}}
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
  if(!b.def&&drawSprOutTree(b))return;
  var c=PJ.c,s=PJ.s,p=rotPt(b.x+.5,b.y+.5),g=P(p[0],p[1],0),hv=hh(b.x*7+b.id,b.y*3+1);
  c.fillStyle='rgba(20,40,10,.22)';c.beginPath();c.ellipse(g[0]+4*s,g[1]+1*s,14*s,6.5*s,0,0,6.283);c.fill();
  box(rrect(b.x+.45,b.y+.45,b.x+.55,b.y+.55),0,.55,'#6b4f3a');
  var dd=D[b.def]||D.tree,lf=dd.leaf,cone=dd.shape?dd.shape==='cone':hv<.38,sw=treeSway(b.id||b.x*31+b.y)*s;
  if(cone){
    var lc=lf||['#2e6a44','#3f8656'];
    for(var k=0;k<3;k++){
      var zb=.4+k*.34,wd=(15-k*3.6)*s,qb=P(p[0],p[1],zb),qt=P(p[0],p[1],zb+.6);qb[0]+=sw*k*.5;qt[0]+=sw*(k*.5+1);
      c.fillStyle=lc[0];c.beginPath();c.moveTo(qb[0]-wd,qb[1]);c.lineTo(qb[0]+wd,qb[1]);c.lineTo(qt[0],qt[1]);c.closePath();c.fill();
      c.fillStyle=lc[1];c.beginPath();c.moveTo(qb[0]-wd,qb[1]);c.lineTo(qb[0],qb[1]+wd*.18);c.lineTo(qt[0],qt[1]);c.closePath();c.fill();
    }
  }else{
    var q=P(p[0],p[1],1.0),R=(13+hv*3)*s;q[0]+=sw;
    var rc=lf||['#3b7539','#4e9147','#69ad5c'];
    c.fillStyle=rc[0];c.beginPath();c.arc(q[0],q[1],R,0,6.283);c.fill();
    c.fillStyle=rc[1];c.beginPath();c.arc(q[0]-3*s,q[1]-3*s,R*.74,0,6.283);c.fill();
    c.fillStyle=rc[2];c.beginPath();c.arc(q[0]-5.5*s,q[1]-6.5*s,R*.36,0,6.283);c.fill();
  }
}
function drawFlower(b){
  box(rrect(b.x+.12,b.y+.12,b.x+.88,b.y+.88),0,.14,'#8a6a4f','#5e4330');
  var cols=D[b.def].petals||['#e0567f','#f2c14e','#ffffff','#b574d6','#ff8a4a'],s=PJ.s;
  for(var i=0;i<9;i++){var p=rotPt(b.x+.2+hh(b.id*3+i,i)*.6,b.y+.2+hh(i*7,b.id+i)*.6);dot(p[0],p[1],.17,Math.max(.6,1.5*s),'#3f7a3a');dot(p[0],p[1],.2,Math.max(.8,2.1*s),cols[i%cols.length]);}
}
// 벤치: 등받이가 뒤, 앉는 쪽이 정면
function drawBench(b){
  drawParts([
    {r:fRect(b,.24,.47,.3,.55),z0:0,z1:.14,c:'#4f3e2c'},{r:fRect(b,.7,.47,.76,.55),z0:0,z1:.14,c:'#4f3e2c'},
    {r:fRect(b,.2,.34,.8,.4),z0:.14,z1:.46,c:'#8a6844'},
    {r:fRect(b,.2,.4,.8,.62),z0:.14,z1:.2,c:'#a07a52'}]);
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
  if(drawSprEntity(b))return;
  if(k==='mroom'){drawRoom(b);return;}
  if(k==='path'){drawPiece({x:b.x,y:b.y,l:0,s:1,d:3,k:'stone'});return;}
  if(k==='floor'){drawFloorTile(b.def,b.x,b.y);return;}
  if(k==='terrain'){drawTerIcon(b);return;}
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
  if(DECO_DRAW[k]){DECO_DRAW[k](b);return;}
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
  // 비·눈 오는 날엔 우산
  if(wxUmbrella()){
    var ur=Math.max(4.5,8*s),uy=top-1.5*s,uc=['#d6453a','#3f6fe0','#f2c14e','#2f9e6e','#8a5bb5','#2b2b2b'][(v.ph*10|0)%6];
    c.strokeStyle='#3d3d46';c.lineWidth=1;c.beginPath();c.moveTo(q[0]+bw*.3,q[1]-lg-bh*.4);c.lineTo(q[0]+bw*.3,uy);c.stroke();
    c.fillStyle=uc;c.beginPath();c.moveTo(q[0]+bw*.3-ur,uy+ur*.15);c.quadraticCurveTo(q[0]+bw*.3,uy-ur*1.05,q[0]+bw*.3+ur,uy+ur*.15);c.closePath();c.fill();
  }
}
function drawRoadCar(e){
  box(e.r1,.02,.16,e.c);box(e.r2,.16,.28,e.c,'#bcd3e0');
}
/* 교회 입구: 주차 구역과 부지 사이 울타리의 ENT 칸. 문이 닫혀 있으면 철문이 가로막고, 열면 양쪽으로 젖혀진다 */
function drawArch(){
  var y=PZ,s=PJ.s;
  if(drawGateSpr()){archName();return;}
  box(rrect(ENT-.04,y-.06,ENT+.08,y+.06),0,1.25,'#f1ece2');
  box(rrect(ENT+.92,y-.06,ENT+1.04,y+.06),0,1.25,'#f1ece2');
  if(S.open){
    box(rrect(ENT+.06,y,ENT+.1,y+.42),0,.62,'#3d4650');box(rrect(ENT+.9,y,ENT+.94,y+.42),0,.62,'#3d4650');
  }else{
    box(rrect(ENT+.08,y-.02,ENT+.92,y+.02),.04,.66,'#3d4650');
    for(var i=1;i<8;i++)box(rrect(ENT+i*.11,y-.025,ENT+i*.11+.02,y+.025),.04,.7,'#59626b');
  }
  box(rrect(ENT-.06,y-.07,ENT+1.06,y+.07),1.1,1.3,'#3f5ea3');
  var m=rotPt(ENT+.5,y);cross(m[0],m[1],1.3,.7);
  archName();
}
// 입구 아치 위 교회 이름
function archName(){
  var s=PJ.s,m=rotPt(ENT+.5,PZ);
  if(s>.42){var q=P(m[0],m[1],1.1),c=PJ.c;c.font='600 '+(8*s)+'px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=2.5;c.strokeStyle='rgba(20,30,60,.8)';c.strokeText(S.name,q[0],q[1]+10*s);c.fillStyle='#fff';c.fillText(S.name,q[0],q[1]+10*s);}
}
// 지도 밖까지 잔디를 이어 깔아 떠 있는 섬처럼 보이지 않게 한다. 도로도 양옆으로 이어진다
function drawGround(){
  var c=PJ.c,rx=RX(),ry=RY(),B=BAND,x,y,q;
  var on=function(px,py){return px>-80&&py>-80&&px<VW+80&&py<VH+80;};
  var tg=texPattern('t_grass',2);
  quad([[-B,-B,0],[rx+B,-B,0],[rx+B,ry+B,0],[-B,ry+B,0]],tg||'#80b169');
  c.fillStyle='#86b86f';c.beginPath();
  if(!tg)for(y=-B;y<ry+B;y++)for(x=-B;x<rx+B;x++){
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
  // 주차 구역: 아스팔트, 입구로 가는 보도(ENT 열)는 밝게
  var pz=rrect(0,PZ,COLS,ROWS-1);
  quad([[pz.x0,pz.y0,.003],[pz.x1,pz.y0,.003],[pz.x1,pz.y1,.003],[pz.x0,pz.y1,.003]],texPattern('t_park',1)||'#7a8187');
  var wk=rrect(ENT,PZ,ENT+1,ROWS-1);
  var tw=texPattern('t_walk',1);
  quad([[wk.x0,wk.y0,.004],[wk.x1,wk.y0,.004],[wk.x1,wk.y1,.004],[wk.x0,wk.y1,.004]],tw||'#d8d2c4');
  c.strokeStyle='rgba(120,110,95,.45)';c.lineWidth=1;c.beginPath();
  if(!tw)for(y=PZ;y<ROWS-1;y+=.5){var w1=rotPt(ENT,y),w2=rotPt(ENT+1,y),e1=P(w1[0],w1[1],.005),e2=P(w2[0],w2[1],.005);c.moveTo(e1[0],e1[1]);c.lineTo(e2[0],e2[1]);}
  c.stroke();
  if(PJ.s>.35&&!tg){
    c.fillStyle='#6a9c56';
    for(y=0;y<PZ;y++)for(x=0;x<COLS;x++){
      if(hh(x,y)>=.4)continue;
      var pt=rotPt(x+.2+hh(y,x)*.6,y+.2+hh(x+9,y)*.6);q=P(pt[0],pt[1],0);
      if(on(q[0],q[1]))c.fillRect(q[0],q[1]-2.4*PJ.s,1.2*PJ.s+.4,2.4*PJ.s);
    }
  }
  // 도로: 지도 양옆 바깥까지
  var rr=rrect(-B,ROWS-1,COLS+B,ROWS);
  quad([[rr.x0,rr.y0,.004],[rr.x1,rr.y0,.004],[rr.x1,rr.y1,.004],[rr.x0,rr.y1,.004]],texPattern('t_road',1)||'#5c6670');
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
  // 정면이 좌우(0·1)면 아치를 세로로 세운다
  var x=b.x,y=b.y,v=b.face===0||b.face===1,R=function(a,c,e,g){return v?rrect(x+c,y+a,x+g,y+e):rrect(x+a,y+c,x+e,y+g);};
  box(R(.1,.44,.19,.56),0,1.3,'#f1ece2');
  box(R(.81,.44,.9,.56),0,1.3,'#f1ece2');
  box(R(.08,.42,.92,.58),1.3,1.42,'#f1ece2');
  for(var i=0;i<10;i++){var t=hh(b.id*3+i+1,i),u=.1+t*.8,p=v?rotPt(x+.5,y+u):rotPt(x+u,y+.5);dot(p[0],p[1],.9+hh(i,b.id+2)*.5,Math.max(1,2.2*PJ.s),i%2?'#d9567a':'#3f7a3a');}
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
// 놀이터: 미끄럼틀이 정면으로 내려온다
function drawPlayground(b){
  var x=b.x,y=b.y;
  box(rrect(x+.05,y+.05,x+1.95,y+1.95),0,.04,'#e0c48a','#e7cf9c');
  box(fRect(b,.3,.3,.7,.7),.04,.8,'#e8892c');box(fRect(b,.25,.25,.75,.75),.8,.9,'#3f6fe0');
  var s0=fPt(b,.5,.75),s1=fPt(b,.5,1.6),p=rotPt(s0[0],s0[1]),q=rotPt(s1[0],s1[1]),c=PJ.c,a=P(p[0],p[1],.8),bq=P(q[0],q[1],.06);
  c.strokeStyle='#d9467a';c.lineWidth=Math.max(2,4*PJ.s);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(bq[0],bq[1]);c.stroke();
  box(fRect(b,1.2,.25,1.27,.32),.04,.95,'#59626b');box(fRect(b,1.7,.25,1.77,.32),.04,.95,'#59626b');
  box(fRect(b,1.2,.25,1.77,.32),.95,1.0,'#59626b');
  [1.37,1.6].forEach(function(sx){var sw=fPt(b,sx,.28),s1=rotPt(sw[0],sw[1]),pa=P(s1[0],s1[1],.95),pb=P(s1[0],s1[1],.35);c.strokeStyle='#3d4650';c.lineWidth=1;c.beginPath();c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);c.stroke();});
}
function drawPond(b){
  var x=b.x,y=b.y,dm=faceDims(D[b.def],b.face);
  box(rrect(x+.08,y+.08,x+dm.w-.08,y+dm.h-.08),0,.06,'#9b8f7c','#5f9fc4');
  var c=PJ.c,s=PJ.s;
  for(var i=0;i<3;i++){var p=rotPt(x+.5+hh(b.id+i,i)*(dm.w-1),y+.5+hh(i,b.id)*(dm.h-1)),q=P(p[0],p[1],.07);c.fillStyle=i%2?'#e8892c':'#3f8656';c.beginPath();c.ellipse(q[0],q[1],(i%2?3:5)*s,(i%2?1.6:2.6)*s,0,0,6.283);c.fill();}
}
function drawPicnic(b){
  drawParts([{r:fRect(b,.2,.24,.8,.36),z0:0,z1:.22,c:'#8a6844'},{r:fRect(b,.2,.64,.8,.76),z0:0,z1:.22,c:'#8a6844'},{r:fRect(b,.46,.46,.54,.54),z0:0,z1:.4,c:'#6b4f3a'}]);
  box(fRect(b,.15,.38,.85,.62),.4,.46,'#a07a52','#c75b4a');
}
function drawStatue(b){
  var x=b.x,y=b.y;
  box(rrect(x+.2,y+.2,x+.8,y+.8),0,.3,'#cfc8b8');
  box(rrect(x+.44,y+.44,x+.56,y+.56),.3,1.5,'#e9e4da');
  box(fRect(b,.3,.44,.7,.56),1.12,1.24,'#e9e4da');
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
// 버스 정류장: 뒤에 유리벽, 정면 쪽 모서리에 표지판
function drawBusStop(b){
  drawParts([{r:fRect(b,.15,.25,.85,.33),z0:0,z1:.9,c:'#aacde6'},{r:fRect(b,.25,.4,.75,.52),z0:0,z1:.24,c:'#8a6844'},{r:fRect(b,.86,.76,.9,.8),z0:0,z1:1.2,c:'#59626b'}]);
  box(fRect(b,.1,.2,.9,.7),.9,.98,'#3f5ea3');box(fRect(b,.8,.72,.96,.84),1.05,1.25,'#e8d36a');
}

/* ---------- 매장·꾸미기 요소 ---------- */
// 정면이 좌우(0·1)면 세로 방향: (가로 a~b, 세로 c~e) 사각형을 돌려 준다
function axRect(b,a,c,e,g){var v=b.face===0||b.face===1,x=b.x,y=b.y;return v?rrect(x+c,y+a,x+g,y+e):rrect(x+a,y+c,x+e,y+g);}
function drawMarket(b){
  var d=D[b.def],dm=faceDims(d,b.face),x=b.x,y=b.y,w=dm.w,h=dm.h,cols=['#d65a6e','#e8a33a','#4a8fc7','#5aa36a'];
  box(rrect(x+.05,y+.05,x+w-.05,y+h-.05),0,.05,'#c9b38a','#d8c49c');
  var st=[];for(var j=0;j<h;j++)for(var i=0;i<w;i++)st.push({i:i,j:j,k:i+j});
  st.sort(function(a,c){var p=rotPt(x+a.i+.5,y+a.j+.5),q=rotPt(x+c.i+.5,y+c.j+.5);return (p[0]+p[1])-(q[0]+q[1]);});
  st.forEach(function(t,n){
    var sx=x+t.i,sy=y+t.j,col=cols[(t.i*2+t.j+b.id)%4];
    box(rrect(sx+.18,sy+.3,sx+.82,sy+.7),.05,.38,'#a07a52','#c9a77a');
    for(var q=0;q<3;q++){var p=rotPt(sx+.3+q*.2,sy+.5);dot(p[0],p[1],.42,Math.max(1,2.2*PJ.s),['#e0453a','#f2c14e','#7fb35a'][(q+n)%3]);}
    [[.16,.26],[.78,.26],[.16,.68],[.78,.68]].forEach(function(o){box(rrect(sx+o[0],sy+o[1],sx+o[0]+.05,sy+o[1]+.05),.05,.85,'#6b4f3a');});
    var r=rrect(sx+.1,sy+.2,sx+.9,sy+.8);
    quad([[r.x0,r.y0,.98],[r.x1,r.y0,.98],[r.x1,r.y1,.82],[r.x0,r.y1,.82]],col,EDGE);
    quad([[r.x0,r.y1,.82],[r.x1,r.y1,.82],[r.x1,r.y1,.74],[r.x0,r.y1,.74]],shade(col,.8));
  });
}
function drawTopiary(b){
  var c=PJ.c,s=PJ.s,p=rotPt(b.x+.5,b.y+.5);
  box(rrect(b.x+.36,b.y+.36,b.x+.64,b.y+.64),0,.18,'#b9694c');
  var q=P(p[0],p[1],.45),R=8*s;
  c.fillStyle='#3b7539';c.beginPath();c.arc(q[0],q[1],R,0,6.283);c.fill();
  c.fillStyle='#5a9a4f';c.beginPath();c.arc(q[0]-2*s,q[1]-2.5*s,R*.6,0,6.283);c.fill();
}
// 물길: 이웃 칸이 물길이면 그쪽으로 물이 이어진다
function drawCanal(b){
  var x=b.x,y=b.y,isC=function(nx,ny){if(nx<0||ny<0||nx>=COLS||ny>=ROWS)return false;var o=bById(occ[ny][nx]);return !!o&&D[o.def].kind==='canal';};
  var n=[isC(x+1,y),isC(x-1,y),isC(x,y+1),isC(x,y-1)],e=.2;
  box(rrect(x,y,x+1,y+1),0,.06,'#7fae63','#86b86f');
  var x0=n[1]?x:x+e,x1=n[0]?x+1:x+1-e,y0=n[3]?y:y+e,y1=n[2]?y+1:y+1-e;
  box(rrect(x+e-.08,y+e-.08,x+1-e+.08,y+1-e+.08),0,.1,'#a8a294','#b8b2a6');
  if(n[0]||n[1])box(rrect(x0-.0,y+e-.08,x1,y+1-e+.08),0,.1,'#a8a294','#b8b2a6');
  if(n[2]||n[3])box(rrect(x+e-.08,y0,x+1-e+.08,y1),0,.1,'#a8a294','#b8b2a6');
  var wc='#5fa3d0',r1=rrect(x+e,y+e,x+1-e,y+1-e);
  quad([[r1.x0,r1.y0,.07],[r1.x1,r1.y0,.07],[r1.x1,r1.y1,.07],[r1.x0,r1.y1,.07]],wc);
  if(n[0]||n[1]){var r2=rrect(x0,y+e,x1,y+1-e);quad([[r2.x0,r2.y0,.07],[r2.x1,r2.y0,.07],[r2.x1,r2.y1,.07],[r2.x0,r2.y1,.07]],wc);}
  if(n[2]||n[3]){var r3=rrect(x+e,y0,x+1-e,y1);quad([[r3.x0,r3.y0,.07],[r3.x1,r3.y0,.07],[r3.x1,r3.y1,.07],[r3.x0,r3.y1,.07]],wc);}
  var t=(S.clock*.6+b.id*.37)%1,p=rotPt(x+.3+t*.4,y+.5);dot(p[0],p[1],.075,Math.max(.6,1.3*PJ.s),'rgba(220,240,255,.85)');
}
function drawBirdbath(b){
  var x=b.x,y=b.y,p=rotPt(x+.5,y+.5),c=PJ.c,s=PJ.s;
  box(rrect(x+.38,y+.38,x+.62,y+.62),0,.1,'#b8b2a6');
  box(rrect(x+.45,y+.45,x+.55,y+.55),.1,.5,'#c9c2b6');
  box(rrect(x+.26,y+.26,x+.74,y+.74),.5,.6,'#d8d2c6','#86bfe0');
  var q=P(p[0]+.12,p[1]-.05,.62);c.fillStyle='#6b5a4a';c.beginPath();c.ellipse(q[0],q[1]-2*s,2.4*s,1.6*s,0,0,6.283);c.fill();
  c.beginPath();c.arc(q[0]+2*s,q[1]-3.4*s,1.3*s,0,6.283);c.fill();
}
// 울타리: 칸 가운데를 지나는 한 줄. 정면 방향이 좌우면 세로로 놓인다
function drawFence(b){
  var d=D[b.def],st=d.style;
  if(st==='stone'){box(axRect(b,0,.4,1,.6),0,.32,'#a59d90','#b8b2a6');for(var i=0;i<4;i++){var p=b.face===0||b.face===1?rotPt(b.x+.5,b.y+.12+i*.25):rotPt(b.x+.12+i*.25,b.y+.5);dot(p[0],p[1],.2,Math.max(.6,1.3*PJ.s),i%2?'#8a8276':'#c9c2b6');}return;}
  if(st==='brick'){box(axRect(b,0,.42,1,.58),0,.42,'#b9694c');box(axRect(b,0,.39,1,.61),.42,.48,'#d8cfc0');return;}
  var post=st==='iron'?'#2f343a':'#f4f1ea',rail=st==='iron'?'#3d434a':'#ebe6dc',ph=st==='iron'?.62:.55;
  [0.04,0.5,0.92].forEach(function(o){box(axRect(b,o,.46,o+.06,.54),0,ph,post);});
  box(axRect(b,0,.47,1,.53),.14,.19,rail);box(axRect(b,0,.47,1,.53),.38,.43,rail);
  if(st==='picket')for(var k=0;k<5;k++){var o2=.14+k*.16;box(axRect(b,o2,.47,o2+.05,.53),0,.48,post);}
  if(st==='iron')for(var m=0;m<6;m++){var o3=.12+m*.14;box(axRect(b,o3,.485,o3+.025,.515),0,.56,post);}
}
// 쌍등: 등 두 개가 정면과 나란한 방향으로 달린다
function drawLamp2(b){
  var x=b.x+.5,y=b.y+.5,c=PJ.c,s=PJ.s;
  box(rrect(x-.1,y-.1,x+.1,y+.1),0,.08,'#59626b');
  box(rrect(x-.04,y-.04,x+.04,y+.04),.08,1.5,'#3d4650');
  box(fRect(b,.2,.47,.8,.53),1.45,1.5,'#3d4650');
  [.24,.76].forEach(function(o){
    box(fRect(b,o-.08,.42,o+.08,.58),1.25,1.42,'#f5e6a8','#fff4c2');
    var lp=fPt(b,o,.5),p=rotPt(lp[0],lp[1]),q=P(p[0],p[1],1.33),g=c.createRadialGradient(q[0],q[1],0,q[0],q[1],14*s);
    g.addColorStop(0,'rgba(255,240,180,.34)');g.addColorStop(1,'rgba(255,240,180,0)');c.fillStyle=g;c.beginPath();c.arc(q[0],q[1],14*s,0,6.283);c.fill();
  });
}
function drawBollard(b){
  var x=b.x+.5,y=b.y+.5;
  box(rrect(x-.08,y-.08,x+.08,y+.08),0,.36,'#3d4650');
  box(rrect(x-.07,y-.07,x+.07,y+.07),.36,.46,'#f5e6a8','#3d4650');
}
function drawStoneLamp(b){
  var x=b.x+.5,y=b.y+.5,c=PJ.c,s=PJ.s;
  box(rrect(x-.24,y-.24,x+.24,y+.24),0,.12,'#a8a294');
  box(rrect(x-.08,y-.08,x+.08,y+.08),.12,.55,'#b8b2a6');
  box(rrect(x-.2,y-.2,x+.2,y+.2),.55,.62,'#b8b2a6');
  box(rrect(x-.15,y-.15,x+.15,y+.15),.62,.88,'#c9c2b6');
  fr('L',rrect(x-.15,y-.15,x+.15,y+.15),x-.07,x+.07,.68,.82,'#f5d98a');
  hip(rrect(x-.26,y-.26,x+.26,y+.26),.88,.3,'#a8a294');
  var p=rotPt(x,y),q=P(p[0],p[1],.75),g=c.createRadialGradient(q[0],q[1],0,q[0],q[1],12*s);
  g.addColorStop(0,'rgba(255,225,150,.32)');g.addColorStop(1,'rgba(255,225,150,0)');c.fillStyle=g;c.beginPath();c.arc(q[0],q[1],12*s,0,6.283);c.fill();
}
function drawBin(b){
  var x=b.x+.5,y=b.y+.5;
  box(rrect(x-.14,y-.14,x+.14,y+.14),0,.4,'#3f7a52');
  box(rrect(x-.16,y-.16,x+.16,y+.16),.4,.46,'#2f5f40');
}
function drawBoard(b){
  box(axRect(b,.12,.46,.18,.54),0,1.0,'#6b4f3a');box(axRect(b,.82,.46,.88,.54),0,1.0,'#6b4f3a');
  box(axRect(b,.1,.47,.9,.53),.45,.95,'#8a6844');
  var v=b.face===0||b.face===1;
  for(var i=0;i<3;i++){var a=.2+i*.22;box(axRect(b,a,v?.44:.53,a+.16,v?.47:.56),.55+(i%2)*.12,.78+(i%2)*.08,'#f6f1e4');}
  box(axRect(b,.04,.4,.96,.6),1.0,1.06,'#5e4330');
}
function drawBell(b){
  var x=b.x,y=b.y,c=PJ.c,s=PJ.s;
  box(axRect(b,.16,.44,.24,.56),0,1.35,'#8a6844');box(axRect(b,.76,.44,.84,.56),0,1.35,'#8a6844');
  box(axRect(b,.1,.42,.9,.58),1.35,1.45,'#6b4f3a');
  var p=rotPt(x+.5,y+.5),q=P(p[0],p[1],1.02),q2=P(p[0],p[1],1.32);
  c.fillStyle='#b8862f';c.beginPath();c.moveTo(q2[0]-3*s,q2[1]);c.lineTo(q2[0]+3*s,q2[1]);c.lineTo(q[0]+7*s,q[1]);c.lineTo(q[0]-7*s,q[1]);c.closePath();c.fill();
  c.fillStyle='#d9a94a';c.beginPath();c.ellipse(q[0],q[1],7*s,2.6*s,0,0,6.283);c.fill();
}
function drawBikeRack(b){
  box(axRect(b,.06,.3,.94,.34),0,.05,'#59626b');
  for(var i=0;i<3;i++){var a=.16+i*.3;box(axRect(b,a,.3,a+.04,.7),.05,.34,'#9aa3a8');}
}
function drawParasol(b){
  var x=b.x+.5,y=b.y+.5,c=PJ.c,s=PJ.s;
  box(rrect(x-.22,y-.22,x+.22,y+.22),.3,.36,'#e8e2d4');box(rrect(x-.04,y-.04,x+.04,y+.04),0,.3,'#8a8276');
  box(rrect(x-.025,y-.025,x+.025,y+.025),.36,1.2,'#d8d2c6');
  var p=rotPt(x,y),top=P(p[0],p[1],1.3),rim=P(p[0],p[1],1.02);
  for(var i=0;i<8;i++){
    var a0=i/8*6.283,a1=(i+1)/8*6.283;
    c.fillStyle=i%2?'#f4efe6':'#d65a4a';c.beginPath();c.moveTo(top[0],top[1]);
    c.lineTo(rim[0]+Math.cos(a0)*20*s,rim[1]+Math.sin(a0)*9*s);c.lineTo(rim[0]+Math.cos(a1)*20*s,rim[1]+Math.sin(a1)*9*s);c.closePath();c.fill();
  }
}
/* ---------- 소모임 운동 코트 ----------
   바닥(코트 색) + 흰 선 + 종류별 기구(네트·골대·탁구대·운동기구). 정면(face)에 맞춰 fPt로 돌린다 */
function cLine(b,pts,z,col,wd){
  var c=PJ.c;c.strokeStyle=col||'rgba(255,255,255,.85)';c.lineWidth=Math.max(.6,(wd||1.3)*PJ.s);c.beginPath();
  pts.forEach(function(u,i){var f=fPt(b,u[0],u[1]),p=rotPt(f[0],f[1]),q=P(p[0],p[1],z);if(i)c.lineTo(q[0],q[1]);else c.moveTo(q[0],q[1]);});
  c.stroke();
}
function cRing(b,cu,cv,r,z,a0,a1){var pts=[],n=18;for(var i=0;i<=n;i++){var a=a0+(a1-a0)*i/n;pts.push([cu+Math.cos(a)*r,cv+Math.sin(a)*r]);}cLine(b,pts,z);}
function drawCourt(b){
  var d=D[b.def],W=d.w,H=d.h,t=d.court,z=.055;
  box(fRect(b,.04,.04,W-.04,H-.04),0,.05,shade(d.surf,.8),d.surf);
  var parts=[],post=function(u,v,h,col){parts.push({r:fRect(b,u-.04,v-.04,u+.04,v+.04),z0:.05,z1:h,c:col||'#59626b'});};
  if(t!=='pingpong'&&t!=='fitness')cLine(b,[[.25,.25],[W-.25,.25],[W-.25,H-.25],[.25,H-.25],[.25,.25]],z);
  if(t==='pingpong'){
    cLine(b,[[.3,.5],[1.7,.5]],z,'rgba(255,255,255,.5)');
    [[.45,.3],[1.55,.3],[.45,.7],[1.55,.7]].forEach(function(p){post(p[0],p[1],.4,'#3d3d46');});
    parts.push({r:fRect(b,.35,.24,1.65,.76),z0:.38,z1:.44,c:d.wall,t:'#2f6a4a'});
    parts.push({r:fRect(b,.98,.2,1.02,.8),z0:.44,z1:.53,c:'#f4efe6'});
  }else if(t==='fitness'){
    post(.3,.5,1.15,d.wall);post(.9,.5,1.15,d.wall);parts.push({r:fRect(b,.3,.47,.9,.53),z0:1.08,z1:1.13,c:'#cfd6dc'});
    post(1.5,.5,.55,d.wall);parts.push({r:fRect(b,1.32,.32,1.68,.68),z0:.45,z1:.52,c:'#d65a4a'});
  }else if(t==='badminton'||t==='jokgu'){
    var m=W/2,nh=t==='badminton'?.85:.42,n0=t==='badminton'?.5:.08;
    cLine(b,[[m,.25],[m,H-.25]],z);
    if(t==='badminton')cLine(b,[[.25,H/2],[W-.25,H/2]],z);
    post(m,.15,nh,'#3d4650');post(m,H-.15,nh,'#3d4650');
    parts.push({r:fRect(b,m-.02,.17,m+.02,H-.17),z0:n0,z1:nh,c:'#ecebe6'});
  }else if(t==='gateball'){
    [[.8,.8],[2.2,1.1],[1.2,2.2]].forEach(function(p){post(p[0]-.08,p[1],.22,'#f4efe6');post(p[0]+.08,p[1],.22,'#f4efe6');parts.push({r:fRect(b,p[0]-.12,p[1]-.02,p[0]+.12,p[1]+.02),z0:.2,z1:.24,c:'#f4efe6'});});
    post(1.5,1.5,.6,'#d65a4a');
  }else if(t==='hoops'){
    cLine(b,[[1,.25],[1,1.4],[2,1.4],[2,.25]],z);cRing(b,1.5,1.4,.5,z,0,Math.PI);cRing(b,1.5,.5,1.25,z,0,Math.PI);
    post(1.5,.14,1.45,'#3d4650');
    parts.push({r:fRect(b,1.1,.22,1.9,.27),z0:1.1,z1:1.62,c:'#f4efe6'});
    parts.push({r:fRect(b,1.38,.3,1.62,.5),z0:1.3,z1:1.34,c:'#d9823b'});
  }else if(t==='futsal'){
    var mf=W/2;cLine(b,[[mf,.25],[mf,H-.25]],z);cRing(b,mf,H/2,.5,z,0,Math.PI*2);
    cLine(b,[[.25,.9],[.9,.9],[.9,H-.9],[.25,H-.9]],z);cLine(b,[[W-.25,.9],[W-.9,.9],[W-.9,H-.9],[W-.25,H-.9]],z);
    [.18,W-.18].forEach(function(u){post(u,H/2-.5,.6,'#f4efe6');post(u,H/2+.5,.6,'#f4efe6');parts.push({r:fRect(b,u-.04,H/2-.5,u+.04,H/2+.5),z0:.56,z1:.62,c:'#f4efe6'});});
  }
  drawParts(parts);
}

var DECO_DRAW={court:drawCourt,market:drawMarket,topiary:drawTopiary,canal:drawCanal,birdbath:drawBirdbath,fence:drawFence,lamp2:drawLamp2,bollard:drawBollard,
  stonelamp:drawStoneLamp,bin:drawBin,board:drawBoard,bell:drawBell,bikerack:drawBikeRack,parasol:drawParasol,spr:drawSprFallback};

/* ---------- 울타리: 도로 | 주차 구역 | 교회 부지 ----------
   부지 둘레와 부지·주차 구역 경계는 흰 나무 울타리, 주차 구역 둘레와 도로 쪽은 짙은 철망 울타리.
   한 칸 길이 조각마다 따로 정렬해 건물·사람과 앞뒤가 맞게 그린다 */
var FENCE=null;
function fenceSegs(){
  if(FENCE)return FENCE;
  var out=[],x,y;
  for(x=0;x<COLS;x++){
    out.push({x:x,y:0,ax:'x',st:'w'});
    if(x!==ENT){out.push({x:x,y:PZ,ax:'x',st:'w'});out.push({x:x,y:ROWS-1,ax:'x',st:'m'});}
  }
  for(y=0;y<ROWS-1;y++){var st=y<PZ?'w':'m';out.push({x:0,y:y,ax:'y',st:st});out.push({x:COLS,y:y,ax:'y',st:st});}
  return (FENCE=out);
}
function fenceRect(f){return f.ax==='x'?rrect(f.x,f.y-.04,f.x+1,f.y+.04):rrect(f.x-.04,f.y,f.x+.04,f.y+1);}
function drawFenceSeg(f){
  var w=f.st==='w',post=w?'#f4f1ea':'#2f4a3c',rail=w?'#e9e4d8':'#3b5a49',h=w?.42:.5;
  var R=function(a,b,z0,z1,col,t){var r=f.ax==='x'?rrect(f.x+a,f.y-t,f.x+b,f.y+t):rrect(f.x-t,f.y+a,f.x+t,f.y+b);box(r,z0,z1,col);};
  R(0,.06,0,h,post,.035);
  R(0,1,h*.3,h*.3+.05,rail,.02);R(0,1,h*.78,h*.78+.05,rail,.02);
  if(w)for(var i=1;i<5;i++)R(i*.2-.02,i*.2+.02,0,h*.9,post,.02);
  else R(.5-.03,.5+.03,0,h,post,.03);
}
// 도로 쪽 울타리의 사람 출입구 기둥
function drawRoadGap(){var y=ROWS-1;box(rrect(ENT-.04,y-.05,ENT+.06,y+.05),0,.7,'#2f4a3c');box(rrect(ENT+.94,y-.05,ENT+1.04,y+.05),0,.7,'#2f4a3c');}
/* ---------- 낡은 건물 표시 (상태 단계별) ----------
   1: 앞 모서리 처마 밑 거미줄 / 2: 지붕에서 하얀 연기 / 3: 검은 연기 (거미줄도 함께).
   연기는 몇 덩이만 천천히 올라가 화면을 많이 가리지 않는다 */
function frontTile(b){var best=null,bk=-1e9;b.tiles.forEach(function(t){var r=rrect(t.x,t.y,t.x+1,t.y+1),k=r.x1+r.y1;if(k>bk){bk=k;best=t;}});return best;}
function drawWear(b){
  var st=wearStage(b);if(!st)return;
  var c=PJ.c,s=PJ.s,r,top,wall;
  if(isRoom(b)){var t=frontTile(b);r=rrect(t.x,t.y,t.x+1,t.y+1);top=roomTop(t.f);wall=top*.85;}
  else{var dm=bDims(b);r=rrect(b.x,b.y,b.x+dm.w,b.y+dm.h);top=bHeight(b);wall=Math.min(top*.7,(D[b.def].H||1)*(b.floors||1)*.9);}
  // 거미줄: 화면 앞쪽 모서리 벽 윗부분에 부채꼴
  var q=P(r.x1,r.y1,wall),R=Math.max(5,11*s);
  c.save();c.strokeStyle='rgba(250,250,250,.85)';c.lineWidth=Math.max(.6,.8*s);c.beginPath();
  for(var i=0;i<=5;i++){var a=Math.PI*(1.12+i*.152);c.moveTo(q[0],q[1]);c.lineTo(q[0]+Math.cos(a)*R,q[1]+Math.sin(a)*R*.9);}
  for(var k=1;k<=3;k++){var rr=R*k/3.2;for(var j=0;j<5;j++){var a0=Math.PI*(1.12+j*.152),a1=Math.PI*(1.12+(j+1)*.152);
    var p0=[q[0]+Math.cos(a0)*rr,q[1]+Math.sin(a0)*rr*.9],p1=[q[0]+Math.cos(a1)*rr,q[1]+Math.sin(a1)*rr*.9],mx=(p0[0]+p1[0])/2-(p0[0]+p1[0]-2*q[0])*.07,my=(p0[1]+p1[1])/2-(p0[1]+p1[1]-2*q[1])*.07;
    c.moveTo(p0[0],p0[1]);c.quadraticCurveTo(mx,my,p1[0],p1[1]);}}
  c.stroke();c.restore();
  if(st<2)return;
  // 연기: 지붕 가운데에서 위로 피어오른다
  var cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2,base=P(cx,cy,top),n=5,ph=(b.id*.37)%1,k=Math.max(.65,s);
  for(var m=0;m<n;m++){
    var u=(S.clock*.3+ph+m/n)%1,a=Math.min(1,u*6)*(1-u),rad=(5+u*12)*k,x=base[0]+Math.sin(u*5+b.id)*4*k+u*12*k,y=base[1]-u*58*k;
    c.fillStyle=st>=3?'rgba(40,36,34,'+(.8*a).toFixed(3)+')':'rgba(250,250,250,'+(.85*a).toFixed(3)+')';
    c.strokeStyle=st>=3?'rgba(20,18,16,'+(.35*a).toFixed(3)+')':'rgba(150,160,170,'+(.45*a).toFixed(3)+')';c.lineWidth=1;
    c.beginPath();c.arc(x,y,rad,0,6.283);c.fill();c.stroke();
  }
}
