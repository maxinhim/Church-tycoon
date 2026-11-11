'use strict';
/* ---------- 대기줄 ----------
   대기줄 타일(D[id].queue인 바닥 타일)을 건물 입구 앞 칸부터 이어 깔면 그 건물의 대기줄이 된다.
   · 줄은 입구 앞 칸에서 시작해 맞닿은 대기줄 타일을 따라 이어진다(경사로 위도 된다). 한 칸에 한 명
   · 방문자는 줄의 끝(입구에서 가장 먼 칸)에 닿은 길에서 줄로 들어간다. 줄 타일은 길이 아니라서 지나다닐 수 없고,
     줄에 선 방문자는 들어갈 때까지 줄을 떠나지 못한다. 줄이 꽉 차면 꽉 찬 건물처럼 잠깐 기다리다 돌아선다
   · 오래 기다리면(QUEUE_PATIENCE초) 불편 '줄'이 생긴다
   · 회전 시간(한 사람이 안에 머무는 시간)과 한 번 이용의 효과는 줄 길이에 따라 커진다 (balance.js).
     줄이 없는 건물은 짧게 머물고 조금 얻는다
   b.q = {cells:[쓸 수 있는 칸, 입구 앞부터], all:[이어진 모든 칸], entry:줄 끝에 닿은 길 노드(-1이면 없음)}  — recalc 때마다 다시 만든다
   QL[건물 id] = 줄 선 방문자들(앞부터). 저장하지 않는다 */
var QL={},QSIDE={};
function isQueueId(id){return !!(id&&D[id]&&D[id].queue);}
function isQueueCell(x,y){return isQueueId(S.floor[x+','+y]);}
function qLen(b){return b&&b.q?b.q.cells.length:0;}
function qFill(b){return Math.min(1,qLen(b)/QUEUE_FULL);}
// 수용 인원이 클수록 한 번 모임이 길다
function capK(d){return clamp(.9+.1*Math.sqrt(Math.max(1,d.cap)/6),.9,1.4);}
// 회전 시간(초): 건물 성격 × 수용 인원 × 대기줄 길이
function rotTime(b){var d=defOf(b);return d.dur*STAY*(ROT_CAT[d.cat]||1)*capK(d)*(qLen(b)?1+QUEUE_T*qFill(b):QUEUE_NONE_T);}
// 한 번 이용의 효과 배율
function useK(b){return qLen(b)?1+QUEUE_E*qFill(b):QUEUE_NONE_E;}
// 방문자가 이 건물로 갈 때 향하는 곳: 줄이 있으면 줄 끝, 없으면 입구 앞
function entNode(b){if(!b||!b.door)return -1;return b.q?b.q.entry:doorNode(b.door.ent,b);}
function queueRebuild(){
  var own={};QSIDE={};
  S.buildings.forEach(function(b){
    b.q=null;if(!b.door)return;
    var s=b.door.ent;if(s.l!==0)return;
    var o=doorOut(s);
    if(o.x<0||o.y<0||o.x>=COLS||o.y>=PZ||!isQueueCell(o.x,o.y)||own[o.x+','+o.y])return;
    if(groundPort(o.x,o.y,OPP[s.d])!==bLevel(b))return;
    var cells=[{x:o.x,y:o.y}],i,d;own[o.x+','+o.y]=b.id;
    QSIDE[o.x+','+o.y+','+OPP[s.d]]=1;
    for(i=0;i<cells.length;i++)for(d=0;d<4;d++){
      var c=cells[i],nx=c.x+DIRS[d][0],ny=c.y+DIRS[d][1],k=nx+','+ny;
      if(nx<0||ny<0||nx>=COLS||ny>=PZ||own[k]||!isQueueCell(nx,ny))continue;
      var gp=groundPort(c.x,c.y,d);if(gp===NOPORT||groundPort(nx,ny,OPP[d])!==gp)continue;
      own[k]=b.id;cells.push({x:nx,y:ny});
    }
    // 줄 끝: 가장 먼 칸부터 거슬러 오며 길에 닿은 칸을 찾는다
    var entry=-1,len=0;
    for(i=cells.length-1;i>=0&&entry<0;i--)for(d=0;d<4&&entry<0;d++){
      var c2=cells[i],mx=c2.x+DIRS[d][0],my=c2.y+DIRS[d][1],g2=groundPort(c2.x,c2.y,d);
      if(g2===NOPORT)continue;
      if(groundOk(mx,my)&&groundPort(mx,my,OPP[d])===g2)entry=gid(mx,my);
      else{var pn=pieceNodeAt(mx,my,OPP[d],g2);if(pn>=0)entry=pn;}
      if(entry>=0){len=i+1;QSIDE[c2.x+','+c2.y+','+d]=1;}
    }
    b.q={cells:cells.slice(0,len),all:cells,entry:entry};
  });
  // 줄이 사라졌거나 짧아졌으면 넘치는 사람은 풀어 준다
  for(var id in QL){
    var bb=bById(+id),ql=QL[id],keep=bb&&bb.q?bb.q.cells.length:0;
    while(ql.length>keep){var v=ql.pop();if(v.state==='queue')queueFree(v);}
    if(!ql.length)delete QL[id];
  }
}
function queueFree(v){v.state='idle';v.t=.2;v.target=0;v.qt=0;if(nodeOk(v.node))placeAt(v,v.node);else placeAt(v,gateNode());}
// 줄 끝에 닿았을 때: 자리가 있으면 줄에 선다
function queueJoin(v,b){
  var ql=QL[b.id]||(QL[b.id]=[]);
  if(ql.length>=qLen(b))return false;
  ql.push(v);v.state='queue';v.qt=0;v.qg=0;v.qc=qLen(b)-1;
  return true;
}
function queueStep(v,dt){
  var b=bById(v.target),ql=b&&QL[b.id],idx=ql?ql.indexOf(v):-1;
  if(!b||!b.q||idx<0||!usable(b)){if(ql&&idx>=0)ql.splice(idx,1);queueFree(v);return;}
  v.qt+=dt;
  if(v.qt>QUEUE_PATIENCE&&!v.qg){v.qg=1;v.annoy+=QUEUE_ANNOY;addGripe('queue',defOf(b).name);}
  // 자기 자리(앞에서 idx번째 칸)까지 한 칸씩 걸어 들어간다
  var cells=b.q.cells,rem=v.speed*.8*dt;
  v.qc=clamp(v.qc==null?cells.length-1:v.qc,idx,cells.length-1);
  while(rem>0){
    var c=cells[v.qc],tx=c.x+.5,ty=c.y+.5,dx=tx-v.x,dy=ty-v.y,d=Math.hypot(dx,dy);
    if(d<=rem){v.x=tx;v.y=ty;rem-=d;if(v.qc>idx)v.qc--;else break;}
    else{v.x+=dx/d*rem;v.y+=dy/d*rem;rem=0;}
  }
  v.z=groundZ(v.x,v.y);
  var f=cells[idx];
  if(idx===0&&v.qc===0&&Math.abs(v.x-f.x-.5)+Math.abs(v.y-f.y-.5)<.2&&b.inUse<defOf(b).cap){ql.shift();enter(v,b);}
}
// 줄 선 사람 수 (카드·테스트용)
function queueCount(b){return b&&QL[b.id]?QL[b.id].length:0;}

/* ---------- 그리기 ----------
   타일 위에 줄을 가르는 난간: 이웃이 같은 줄 타일이 아닌 변에 세운다 (입구 쪽과 줄 끝의 들어오는 쪽은 열어 둔다) */
var QEDGE=[[[1,0],[1,1]],[[0,0],[0,1]],[[0,1],[1,1]],[[0,0],[1,0]]];
function drawQueueRails(x,y){
  var id=S.floor[x+','+y],d=D[id];if(!d||!d.queue)return;
  var c=PJ.c,s=PJ.s,st=d.qs,k=ZB;ZB=0;
  for(var dr=0;dr<4;dr++){
    var nx=x+DIRS[dr][0],ny=y+DIRS[dr][1];
    if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&isQueueCell(nx,ny)&&groundPort(x,y,dr)!==NOPORT&&groundPort(nx,ny,OPP[dr])===groundPort(x,y,dr))continue;
    if(QSIDE[x+','+y+','+dr])continue;
    var e=QEDGE[dr],ax=x+e[0][0]*.92+.04,ay=y+e[0][1]*.92+.04,bx=x+e[1][0]*.92+.04,by=y+e[1][1]*.92+.04;
    var za=groundZ(clamp(ax,x+.001,x+.999),clamp(ay,y+.001,y+.999)),zb=groundZ(clamp(bx,x+.001,x+.999),clamp(by,y+.001,y+.999));
    var ra=rotPt(ax,ay),rb=rotPt(bx,by);
    if(st==='paint'){
      c.strokeStyle='#f2c230';c.lineWidth=Math.max(1,2*s);c.setLineDash([4*s,3*s]);c.beginPath();
      var p0=P(ra[0],ra[1],za+.012),p1=P(rb[0],rb[1],zb+.012);c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.stroke();c.setLineDash([]);continue;
    }
    if(st==='hedge'){
      quad([[ra[0],ra[1],za],[rb[0],rb[1],zb],[rb[0],rb[1],zb+.2],[ra[0],ra[1],za+.2]],'#4f8a4a','rgba(20,50,20,.4)');
      c.strokeStyle='#e57aa5';c.lineWidth=Math.max(1,1.6*s);c.setLineDash([1.5*s,5*s]);c.beginPath();
      var h0=P(ra[0],ra[1],za+.2),h1=P(rb[0],rb[1],zb+.2);c.moveTo(h0[0],h0[1]);c.lineTo(h1[0],h1[1]);c.stroke();c.setLineDash([]);continue;
    }
    var H=st==='wood'?.3:.34,post=st==='rope'?'#c9a23a':st==='wood'?'#7a5530':'#59626b',line=st==='rope'?'#b5332e':st==='wood'?'#9a6e3f':'#2f353b';
    var a0=P(ra[0],ra[1],za),a1=P(ra[0],ra[1],za+H),b0=P(rb[0],rb[1],zb),b1=P(rb[0],rb[1],zb+H);
    c.strokeStyle=line;c.lineWidth=Math.max(.8,(st==='wood'?1.8:1.3)*s);c.beginPath();
    if(st==='rope'){c.moveTo(a1[0],a1[1]);c.quadraticCurveTo((a1[0]+b1[0])/2,(a1[1]+b1[1])/2+4*s,b1[0],b1[1]);}
    else{c.moveTo(a1[0],a1[1]);c.lineTo(b1[0],b1[1]);if(st==='wood'){var am=P(ra[0],ra[1],za+H*.5),bm=P(rb[0],rb[1],zb+H*.5);c.moveTo(am[0],am[1]);c.lineTo(bm[0],bm[1]);}}
    if(st==='chain')c.setLineDash([2*s,2*s]);
    c.stroke();c.setLineDash([]);
    c.strokeStyle=post;c.lineWidth=Math.max(1,2.2*s);c.beginPath();c.moveTo(a0[0],a0[1]);c.lineTo(a1[0],a1[1]);c.moveTo(b0[0],b0[1]);c.lineTo(b1[0],b1[1]);c.stroke();
    if(st==='rope'){c.fillStyle='#e3c460';c.beginPath();c.arc(a1[0],a1[1],1.6*s,0,6.283);c.arc(b1[0],b1[1],1.6*s,0,6.283);c.fill();}
  }
  ZB=k;
}
