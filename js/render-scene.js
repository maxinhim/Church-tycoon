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
    if(!ab&&!ba){if(a.x0+a.x1+a.y0+a.y1<=b.x0+b.x1+b.y0+b.y1)ab=true;else ba=true;}
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
  var g=c.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#1d4255');g.addColorStop(1,'#0c1c26');
  c.fillStyle=g;c.fillRect(0,0,VW,VH);
  PJ.c=c;PJ.ox=cam.ox;PJ.oy=cam.oy;PJ.s=cam.z;
  drawGround();
  var sb=UI.sel?bById(UI.sel):null;
  if(sb){
    if(isRoom(sb))sb.tiles.forEach(function(t){footprint(t.x,t.y,1,1,'rgba(255,210,63,.22)','#ffd23f',[6,4]);});
    else{var sd=D[sb.def];footprint(sb.x,sb.y,sd.w,sd.h,'rgba(255,210,63,.22)','#ffd23f',[6,4]);}
  }
  var gd=UI.ghost&&UI.tool&&D[UI.tool]&&UI.tool!=='mroom'?D[UI.tool]:null,gok=false;
  if(gd){gok=canPlace(gd,UI.ghost.x,UI.ghost.y)&&S.money>=gd.cost;footprint(UI.ghost.x,UI.ghost.y,gd.w,gd.h,gok?'rgba(60,210,110,.35)':'rgba(235,70,60,.42)',gok?'#2fd16f':'#ff5a4a');}
  var E=[],use=Math.min(1,(S.members*0.35+V.length*0.15)/Math.max(1,A.park));
  S.buildings.forEach(function(b){
    if(isRoom(b)){
      var map=roomMap(b);
      b.tiles.forEach(function(t){var rt=rrect(t.x,t.y,t.x+1,t.y+1);rt.f=function(){drawRoomTile(b,t,map);};E.push(rt);});
      return;
    }
    var d=D[b.def],r=rrect(b.x,b.y,b.x+d.w,b.y+d.h);
    r.f=function(){drawEntity(b,d.kind==='lot'?Math.round(use*d.park):0);};E.push(r);
  });
  V.forEach(function(v){
    if(v.state==='inside')return;
    var p=rotPt(v.x,v.y);E.push({x0:p[0]-.05,y0:p[1]-.05,x1:p[0]+.05,y1:p[1]+.05,f:function(){drawVisitor(v);}});
  });
  for(var k=0;k<2;k++){
    var span=COLS+8,wx=k===0?((S.clock*1.6+3)%span)-4:COLS+4-((S.clock*1.25+9)%span),ly=k===0?ROWS-1+.58:ROWS-1+.14;
    if(wx<0||wx+.8>COLS)continue;
    (function(wx,ly,col){
      var r1=rrect(wx,ly,wx+.8,ly+.3),r2=rrect(wx+.18,ly+.03,wx+.58,ly+.27);
      E.push({x0:r1.x0,y0:r1.y0,x1:r1.x1,y1:r1.y1,f:function(){drawRoadCar({r1:r1,r2:r2,c:col});}});
    })(wx,ly,k?'#3d78c7':'#d65a4a');
  }
  var ar=rrect(ENT,ROWS-1+.05,ENT+1,ROWS-1+.15);ar.f=drawArch;E.push(ar);
  sortEnt(E).forEach(function(e){e.f();});
  if(UI.tool==='mroom')drawRoomGhost();
  if(gd){c.globalAlpha=.78;drawEntity({x:UI.ghost.x,y:UI.ghost.y,def:gd.id,id:0},Math.round(gd.park*.5));c.globalAlpha=1;}
  if(sb){
    var sd2=defOf(sb),mp=rotPt(sb.x+sd2.w/2,sb.y+sd2.h/2),q=P(mp[0],mp[1],bHeight(sb)+.45+Math.sin(S.clock*4)*.06),s=Math.max(.7,cam.z);
    c.fillStyle='#ffd23f';c.strokeStyle='rgba(30,30,30,.6)';c.lineWidth=1.5;c.beginPath();
    c.moveTo(q[0]-7*s,q[1]-10*s);c.lineTo(q[0]+7*s,q[1]-10*s);c.lineTo(q[0],q[1]);c.closePath();c.fill();c.stroke();
  }
  F.forEach(function(f){
    var p=rotPt(f.x,f.y),q=P(p[0],p[1],1.1+(1.6-f.t)*.6);
    c.globalAlpha=clamp(f.t,0,1);c.font='700 '+Math.max(11,13*cam.z)+'px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=3;c.strokeStyle='rgba(15,30,20,.85)';c.strokeText(f.text,q[0],q[1]);c.fillStyle='#fff';c.fillText(f.text,q[0],q[1]);c.globalAlpha=1;
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
