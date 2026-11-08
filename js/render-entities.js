'use strict';
function drawBld(b){
  var d=D[b.def],x=b.x,y=b.y,w=d.w,h=d.h,H=d.H,s=PJ.s;
  box(rrect(x+.03,y+.03,x+w-.03,y+h-.03),0,.05,'#cfc8b8');
  var r=rrect(x+.1,y+.1,x+w-.1,y+h-.1);
  var alongX=(w>=h)!==(ROT%2===1);
  var main=function(){
    box(r,.05,H,d.wall,d.roof==='flat'?shade(d.roofc,1.05):null);
    feats(r,H,d);
    if(d.deco==='awning'){
      var n=Math.max(3,Math.round((r.x1-r.x0)/0.18)),st=(r.x1-r.x0)/n,i,a;
      var m=Math.max(3,Math.round((r.y1-r.y0)/0.18)),st2=(r.y1-r.y0)/m;
      for(i=0;i<m;i++){a=r.y0+i*st2;quad([[r.x1,a,H*.8],[r.x1,a+st2,H*.8],[r.x1+.14,a+st2,H*.58],[r.x1+.14,a,H*.58]],i%2?'#d8d2c6':'#a8432f');}
      for(i=0;i<n;i++){a=r.x0+i*st;quad([[a,r.y1,H*.8],[a+st,r.y1,H*.8],[a+st,r.y1+.14,H*.58],[a,r.y1+.14,H*.58]],i%2?'#f4efe6':'#c4503a');}
    }
    if(d.deco==='dots'){
      var dc=['#e0567f','#4a78c7','#3d9b7a','#7a5bc7'];
      for(var k=0;k<7;k++){var t=hh(b.id*5+k,k*11);if(Math.abs(t-.5)<.12)continue;dot(r.x0+t*(r.x1-r.x0),r.y1,H*(.22+.6*hh(k,b.id+3)),Math.max(1,2.2*s),dc[k%4]);}
    }
    if(d.deco==='wc'){
      var mid=(r.x0+r.x1)/2;fr('L',r,mid-.16,mid+.16,H*.66,H*.92,'#ffffff');
      if(s>.45){var q=P(mid,r.y1,H*.79),c=PJ.c;c.fillStyle='#2f5f7a';c.font='700 '+(7.5*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('WC',q[0],q[1]);}
    }
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
    var tr=rrect(x+w/2-.3,y+h-.64,x+w/2+.3,y+h-.02),TH=d.towerH;
    var tower=function(){
      box(tr,.05,TH,'#f5f0e6');
      var mx=(tr.x0+tr.x1)/2,my=(tr.y0+tr.y1)/2;
      fr('L',tr,mx-.1,mx+.1,TH-.6,TH-.18,'#2d2a33');fr('R',tr,my-.1,my+.1,TH-.6,TH-.18,'#24222a');
      fr('L',tr,mx-.12,mx+.12,.05,.6,'#4a3628');
      var ap=hip(tr,TH,.75,d.roofc);cross(ap[0],ap[1],ap[2],1.05);
    };
    if(tr.x0+tr.x1+tr.y0+tr.y1<r.x0+r.x1+r.y0+r.y1){tower();main();}else{main();tower();}
  }else main();
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
  if(k==='bld')drawBld(b);else if(k==='lot')drawLot(b,cars||0);else if(k==='tree')drawTree(b);
  else if(k==='flower')drawFlower(b);else if(k==='bench')drawBench(b);else if(k==='spire')drawSpire(b);
}
function drawVisitor(v){
  var c=PJ.c,s=PJ.s,p=rotPt(v.x,v.y),q=P(p[0],p[1],0);
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
function drawGround(){
  var c=PJ.c,rx=RX(),ry=RY(),x,y;
  quad([[0,ry,0],[rx,ry,0],[rx,ry,-.75],[0,ry,-.75]],'#7c5b3d');
  quad([[rx,0,0],[rx,ry,0],[rx,ry,-.75],[rx,0,-.75]],'#5f4530');
  quad([[0,ry,-.32],[rx,ry,-.32],[rx,ry,-.4],[0,ry,-.4]],'#6c4f35');
  quad([[rx,0,-.32],[rx,ry,-.32],[rx,ry,-.4],[rx,0,-.4]],'#523b29');
  quad([[0,ry,0],[rx,ry,0],[rx,ry,-.1],[0,ry,-.1]],'#5c8f49');
  quad([[rx,0,0],[rx,ry,0],[rx,ry,-.1],[rx,0,-.1]],'#4a763b');
  for(y=0;y<ROWS;y++)for(x=0;x<COLS;x++){
    var r=rrect(x,y,x+1,y+1),road=y===ROWS-1;
    quad([[r.x0,r.y0,0],[r.x1,r.y0,0],[r.x1,r.y1,0],[r.x0,r.y1,0]],road?'#5c6670':(((x+y)&1)?'#86b86f':'#80b169'),road?'rgba(0,0,0,.12)':'rgba(40,80,30,.13)');
    if(!road&&hh(x,y)<.4&&PJ.s>.35){var p=rotPt(x+.2+hh(y,x)*.6,y+.2+hh(x+9,y)*.6),q=P(p[0],p[1],0);c.fillStyle='#6a9c56';c.fillRect(q[0],q[1]-2.4*PJ.s,1.2*PJ.s+.4,2.4*PJ.s);}
  }
  c.lineWidth=Math.max(1,2.4*PJ.s);c.strokeStyle='#c3c8cc';c.beginPath();
  var a=rotPt(0,ROWS-1),b=rotPt(COLS,ROWS-1),pa=P(a[0],a[1],0),pb=P(b[0],b[1],0);c.moveTo(pa[0],pa[1]);c.lineTo(pb[0],pb[1]);c.stroke();
  c.strokeStyle='#e8d36a';c.lineWidth=Math.max(.8,1.6*PJ.s);c.beginPath();
  for(x=0;x<COLS;x++){var d1=rotPt(x+.2,ROWS-.5),d2=rotPt(x+.6,ROWS-.5),q1=P(d1[0],d1[1],0),q2=P(d2[0],d2[1],0);c.moveTo(q1[0],q1[1]);c.lineTo(q2[0],q2[1]);}
  c.stroke();
}
