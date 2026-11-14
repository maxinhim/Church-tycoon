'use strict';
/* ---------- 벤치에 앉기 ----------
   앉는 소품(벤치 등 SIT_DEFS)을 쓰는 방문자는 그 자리에 앉은 모습으로 그린다. 한 벤치에 둘까지 나란히 앉는다.
   정렬 순서는 벤치보다 뒤(벤치 그림 위)가 되도록 칸보다 조금 크게 잡는다 */
var SIT_DEFS={bench:1};
function isSitDef(b){return !!b&&!!SIT_DEFS[b.def];}
function sitEntry(b,k){
  var z=bZ(b)+.3,r=rrect(b.x-.02,b.y-.02,b.x+1.02,b.y+1.02);
  return {x0:r.x0,y0:r.y0,x1:r.x1,y1:r.y1,zb:z-.05,zt:z+.7,on:0,f:function(){drawSitter(b,k);}};
}
// 앉은 사람: 엉덩이는 벤치 면, 무릎은 앞으로, 상체는 등받이 쪽으로 기대어
function drawSitter(b,k){
  var c=PJ.c,s=PJ.s,cx=b.x+.5,cy=b.y+.5,z=bZ(b)+.3;
  // k=0 왼쪽 자리, k=1 오른쪽 자리: 벤치 길이 방향으로 나란히
  var dx=(k?.22:-.22),ux=(b.face===0||b.face===1)?0:dx,uy=(b.face===0||b.face===1)?dx:0;
  var rp=rotPt(cx+ux,cy+uy),q=P(rp[0],rp[1],z),bw=Math.max(2.6,4.6*s),bh=Math.max(3,5.2*s),hr=Math.max(1.5,2.6*s);
  var tint=k?'#5a8ac6':'#d98a3a',pant='#3d4650';
  // 무릎(허벅지): 앞쪽으로 뻗은 짧은 다리
  c.fillStyle=pant;c.fillRect(q[0]-bw*.2,q[1]-bh*.3-lgOf(s),bw*1.1,lgOf(s));
  // 몸통: 엉덩이 위에서 살짝 기운 몸
  c.fillStyle=tint;c.fillRect(q[0]-bw/2,q[1]-bh*.3-bh*.9,bw,bh*.9);
  // 머리
  c.fillStyle='#f0cfa8';c.beginPath();c.arc(q[0],q[1]-bh*.3-bh*.9-hr*.6,hr,0,6.283);c.fill();
}
function lgOf(s){return Math.max(1.4,2.2*s);}
