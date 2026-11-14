'use strict';
/* 교회 코드 그림 꾸밈: 벽돌·나무 재료 그리기 도우미, 장의자, 교회 소품(피아노·스피커·음향 믹서·드럼·헌금함), 입구 대문.
   모두 코드로 그린다(외부 그림 없음). render-entities.js의 단면·울타리·입구와 floors.js의 바닥이 불러 쓴다.
   좌표는 render-core.js와 같다: 화면 방향으로 돌린 사각형 r(x0·y0·x1·y1), 앞쪽은 x1·y1 쪽 */
var CH_BRICK='#a9543c',CH_STONE='#d8cfc0',CH_WOOD='#8a5a2b',CH_WOOD_D='#5e3a1c',CH_WOOD_L='#b98450',CH_GOLD='#d9a94a';

/* ---------- 재료: 벽돌 ---------- */
// 벽면(pl 'L': y=c 평면에서 x가 a / pl 'R': x=c 평면에서 y가 a) 위의 점
function chPt(pl,c,a,z){return pl==='L'?[a,c,z]:[c,a,z];}
function chP3(pl,c,a,z){var q=chPt(pl,c,a,z);return P(q[0],q[1],q[2]);}
// 보이는 벽면에 벽돌 무늬: 틈새 줄(어긋쌓기)과 몇 장의 밝은·어두운 벽돌
function chBrick(pl,c,a0,a1,z0,z1,base,f,seed){
  if(PJ.s<.42)return;
  var g=PJ.c,rows=Math.max(1,Math.round((z1-z0)/.07)),rh=(z1-z0)/rows,bl=.16,i,a,n,p,q,c2=c+.002;
  for(i=0;i<rows;i++){
    var off=(i%2)*bl/2,zz=z0+i*rh;n=0;
    for(a=a0-off;a<a1;a+=bl,n++){
      var h=hh(seed+i*13,n+i*3);if(h>.4)continue;
      var u0=Math.max(a0,a),u1=Math.min(a1,a+bl);if(u1-u0<.02)continue;
      quad([chPt(pl,c2,u0,zz),chPt(pl,c2,u1,zz),chPt(pl,c2,u1,zz+rh),chPt(pl,c2,u0,zz+rh)],shade(base,f*(h<.2?.84:1.14)));
    }
  }
  g.strokeStyle='rgba(58,30,18,.4)';g.lineWidth=Math.max(.5,PJ.s*.7);g.beginPath();
  for(i=1;i<rows;i++){p=chP3(pl,c2,a0,z0+i*rh);q=chP3(pl,c2,a1,z0+i*rh);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);}
  for(i=0;i<rows;i++){
    var of2=(i%2)*bl/2;
    for(a=a0+of2+(of2?0:bl);a<a1-.01;a+=bl){p=chP3(pl,c2,a,z0+i*rh);q=chP3(pl,c2,a,z0+(i+1)*rh);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);}
  }
  g.stroke();
}
function chBrickBox(r,z0,z1,base,seed,top){
  box(r,z0,z1,base,top);
  chBrick('L',r.y1,r.x0,r.x1,z0,z1,base,.93,seed||1);chBrick('R',r.x1,r.y0,r.y1,z0,z1,base,.74,(seed||1)+7);
}
// 벽면 위 가로 띠(나무 장식 등)
function chStrip(pl,c,a0,a1,z0,z1,col){var c2=c+.004;quad([chPt(pl,c2,a0,z0),chPt(pl,c2,a1,z0),chPt(pl,c2,a1,z1),chPt(pl,c2,a0,z1)],col);}
// 아치 창: 나무 틀 + 색유리 네 조각 + 위쪽 뾰족한 아치
function chWindow(pl,c,a,w,z0,z1,cols){
  var h=w/2,c2=c+.005,t=h*1.05,zm=(z0+z1)/2,pt=function(u,z){return chPt(pl,c2,u,z);};
  quad([pt(a-h-.025,z0-.025),pt(a+h+.025,z0-.025),pt(a+h+.025,z1),pt(a,z1+t+.03),pt(a-h-.025,z1)],'#5e3a1c');
  quad([pt(a-h,z0),pt(a,z0),pt(a,zm),pt(a-h,zm)],cols[0]);quad([pt(a,z0),pt(a+h,z0),pt(a+h,zm),pt(a,zm)],cols[1]);
  quad([pt(a-h,zm),pt(a,zm),pt(a,z1),pt(a-h,z1)],cols[2]);quad([pt(a,zm),pt(a+h,zm),pt(a+h,z1),pt(a,z1)],cols[3]);
  quad([pt(a-h,z1),pt(a,z1),pt(a,z1+t)],cols[0]);quad([pt(a,z1),pt(a+h,z1),pt(a,z1+t)],cols[1]);
  quad([pt(a-.007,z0),pt(a+.007,z0),pt(a+.007,z1+t*.8),pt(a-.007,z1+t*.8)],'#5e3a1c');
  quad([pt(a-h,zm-.006),pt(a+h,zm-.006),pt(a+h,zm+.006),pt(a-h,zm+.006)],'#5e3a1c');
}

/* ---------- 재료: 나무 바닥(마루) ---------- */
// 판자 폭 .2의 두 가지 색 마루: 줄마다 이음새가 어긋난다
function chWoodFloor(r,z,base,seed){
  var g=PJ.c,pk,i=0,len=.6;
  for(pk=r.y0;pk<r.y1-.001;pk+=.2,i++){
    var y1=Math.min(r.y1,pk+.2);
    quad([[r.x0,pk,z],[r.x1,pk,z],[r.x1,y1,z],[r.x0,y1,z]],shade(base,i%2?.94:1.05));
  }
  if(PJ.s<.35)return;
  g.strokeStyle='rgba(92,58,28,.34)';g.lineWidth=Math.max(.5,PJ.s*.7);g.beginPath();
  for(pk=r.y0+.2,i=1;pk<r.y1-.01;pk+=.2,i++){var p=P(r.x0,pk,z+.001),q=P(r.x1,pk,z+.001);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);}
  for(pk=r.y0,i=0;pk<r.y1-.01;pk+=.2,i++){
    for(var a=r.x0+((i*.37+seed*.11)%len);a<r.x1-.02;a+=len){var p2=P(a,pk,z+.001),q2=P(a,Math.min(r.y1,pk+.2),z+.001);g.moveTo(p2[0],p2[1]);g.lineTo(q2[0],q2[1]);}
  }
  g.stroke();
}
// 체크무늬 타일 바닥(매장)
function chTileFloor(r,z,c1,c2){
  var i=0,j,x,y;
  for(y=r.y0,j=0;y<r.y1-.001;y+=.24,j++)for(x=r.x0,i=0;x<r.x1-.001;x+=.24,i++)
    quad([[x,y,z],[Math.min(r.x1,x+.24),y,z],[Math.min(r.x1,x+.24),Math.min(r.y1,y+.24),z],[x,Math.min(r.y1,y+.24),z]],(i+j)%2?c1:c2);
}

/* ---------- 장의자: 등받이·팔걸이 판 다리·방석 ----------
   앉는 사람은 +y 쪽에서 -y 쪽(강대상)을 본다. 등받이는 +y 쪽 */
function chPew(parts,x0,x1,yy,fz){
  var wd='#9a6b3f',wl='#c08a56',dk=CH_WOOD_D,mid='#7a4f2a';
  parts.push({r:{x0:x0,y0:yy,x1:x1,y1:yy+.075},z0:fz+.07,z1:fz+.1,c:wd,t:wl});
  parts.push({r:{x0:x0+.03,y0:yy+.014,x1:x1,y1:yy+.075},z0:fz+.1,z1:fz+.112,c:'#8c2f33',t:'#a8403f'});
  parts.push({r:{x0:x0,y0:yy+.062,x1:x1,y1:yy+.082},z0:fz+.1,z1:fz+.24,c:mid,t:'#a8733c'});
  parts.push({r:{x0:x0-.004,y0:yy+.056,x1:x1+.004,y1:yy+.09},z0:fz+.228,z1:fz+.25,c:dk,t:CH_WOOD});
  parts.push({r:{x0:x0-.012,y0:yy-.006,x1:x0+.014,y1:yy+.09},z0:fz,z1:fz+.27,c:dk,t:CH_WOOD});
  parts.push({r:{x0:x1-.014,y0:yy-.006,x1:x1+.012,y1:yy+.09},z0:fz,z1:fz+.27,c:dk,t:CH_WOOD});
  var m=(x0+x1)/2;parts.push({r:{x0:m-.012,y0:yy+.01,x1:m+.012,y1:yy+.07},z0:fz,z1:fz+.07,c:dk});
}

/* ---------- 교회 소품 ----------
   R(u0,v0,u1,v1): 0~1 칸 안의 사각형을 만들어 주는 함수(꾸미기는 fRect, 단면은 영역 매핑).
   z: 바닥 높이, k: 높이 배율. 조각은 parts에 넣고 drawParts로 앞뒤 순서대로 그린다 */
function chRM(X0,Y0,X1,Y1){return function(u0,v0,u1,v1){return {x0:X0+u0*(X1-X0),y0:Y0+v0*(Y1-Y0),x1:X0+u1*(X1-X0),y1:Y0+v1*(Y1-Y0)};};}
function chPiano(P_,R,z,k){
  var blk='#1f2228',top='#2f343c';
  [[.12,.1],[.8,.1],[.1,.6]].forEach(function(q){P_.push({r:R(q[0],q[1],q[0]+.08,q[1]+.08),z0:z,z1:z+.3*k,c:'#15171b'});});
  P_.push({r:R(.08,.04,.92,.7),z0:z+.3*k,z1:z+.44*k,c:blk,t:top});
  P_.push({r:R(.1,.02,.9,.1),z0:z+.44*k,z1:z+.66*k,c:'#2a2e35',t:'#3b4048'});          // 세운 덮개
  P_.push({r:R(.12,.7,.88,.84),z0:z+.3*k,z1:z+.34*k,c:blk});                              // 건반 받침
  P_.push({r:R(.15,.72,.85,.83),z0:z+.34*k,z1:z+.355*k,c:'#f4efe6',t:'#ffffff'});       // 흰 건반
  for(var i=0;i<6;i++){var u=.2+i*.1+(i>2?.07:0);P_.push({r:R(u,.72,u+.04,.78),z0:z+.355*k,z1:z+.375*k,c:'#15171b'});}
  P_.push({r:R(.42,.66,.58,.7),z0:z+.44*k,z1:z+.54*k,c:'#3a3f48',t:'#59626b'});          // 악보대
  P_.push({r:R(.28,.9,.72,1),z0:z,z1:z+.2*k,c:'#3a2616',t:'#5a3a1e'});                    // 의자
}
function chSpeaker(P_,R,z,k){
  P_.push({r:R(.22,.22,.78,.78),z0:z,z1:z+.9*k,c:'#22252b',t:'#2f343c'});
  [.18,.42,.66].forEach(function(h){P_.push({r:R(.19,.19,.81,.81),z0:z+h*k,z1:z+(h+.1)*k,c:'#3b4048',t:'#4a505a'});});
  P_.push({r:R(.38,.38,.62,.62),z0:z+.9*k,z1:z+1.02*k,c:'#59626b',t:'#8a929a'});
}
function chMixer(P_,R,z,k){
  [[.1,.2],[.8,.2],[.1,.72],[.8,.72]].forEach(function(q){P_.push({r:R(q[0],q[1],q[0]+.08,q[1]+.08),z0:z,z1:z+.3*k,c:'#15171b'});});
  P_.push({r:R(.06,.16,.94,.84),z0:z+.3*k,z1:z+.42*k,c:'#2b2f36',t:'#3a3f48'});
  for(var i=0;i<6;i++){var u=.14+i*.13;P_.push({r:R(u,.3,u+.05,.7),z0:z+.42*k,z1:z+.435*k,c:'#15171b'});P_.push({r:R(u-.01,.36+(i%3)*.1,u+.06,.42+(i%3)*.1),z0:z+.435*k,z1:z+.47*k,c:['#c9c2b6','#e0567f','#f2c14e'][i%3]});}
}
function chDrums(P_,R,z,k){
  P_.push({r:R(.3,.3,.7,.7),z0:z+.02*k,z1:z+.4*k,c:'#a8433a',t:'#f4efe6'});                  // 베이스 드럼
  P_.push({r:R(.1,.55,.3,.75),z0:z+.3*k,z1:z+.4*k,c:'#d8d2c6',t:'#f4efe6'});              // 스네어
  P_.push({r:R(.34,.14,.52,.3),z0:z+.4*k,z1:z+.52*k,c:'#a8433a',t:'#f4efe6'});            // 탐
  P_.push({r:R(.56,.14,.74,.3),z0:z+.4*k,z1:z+.52*k,c:'#a8433a',t:'#f4efe6'});
  P_.push({r:R(.04,.12,.24,.3),z0:z+.62*k,z1:z+.635*k,c:'#b8862f',t:CH_GOLD});            // 심벌
  P_.push({r:R(.78,.2,.98,.4),z0:z+.64*k,z1:z+.655*k,c:'#b8862f',t:CH_GOLD});
  P_.push({r:R(.13,.19,.15,.21),z0:z,z1:z+.62*k,c:'#59626b'});P_.push({r:R(.87,.29,.89,.31),z0:z,z1:z+.64*k,c:'#59626b'});
  P_.push({r:R(.4,.8,.6,.96),z0:z,z1:z+.24*k,c:'#2b2f36',t:'#8c2f33'});                     // 의자
}
function chOffering(P_,R,z,k){
  P_.push({r:R(.26,.26,.74,.74),z0:z,z1:z+.5*k,c:CH_WOOD,t:CH_WOOD_L});
  P_.push({r:R(.22,.22,.78,.78),z0:z+.5*k,z1:z+.58*k,c:CH_WOOD_D,t:CH_WOOD});
  P_.push({r:R(.4,.46,.6,.54),z0:z+.58*k,z1:z+.6*k,c:'#15171b'});                          // 투입구
  P_.push({r:R(.46,.3,.54,.38),z0:z+.58*k,z1:z+.64*k,c:CH_GOLD});
}
function chProp(fn,hz){return function(b){var P_=[];fn(P_,function(u0,v0,u1,v1){return fRect(b,u0,v0,u1,v1);},0,hz||1);drawParts(P_);};}
var drawPiano=chProp(chPiano,1.05),drawSpeaker=chProp(chSpeaker,1.1),drawMixer=chProp(chMixer,1.1),drawDrums=chProp(chDrums,1.15),drawOffering=chProp(chOffering,1.1);
DECO_DRAW.piano=drawPiano;DECO_DRAW.speaker=drawSpeaker;DECO_DRAW.mixer=drawMixer;DECO_DRAW.drums=drawDrums;DECO_DRAW.offering=drawOffering;

/* ---------- 입구 대문: 벽돌 기둥(돌 갓·등)·나무 들보·나무 대문짝·붉은 깔개 ----------
   p: 모양 팔레트({p:기둥,t:들보,d:문짝}). 없으면 처음의 벽돌·나무 대문 */
function chGate(p,open){
  var y=PZ,brick=!p,pc=brick?CH_BRICK:p.p,tc=brick?CH_WOOD_D:p.t,dc=brick?CH_WOOD:p.d,c=PJ.c,s=PJ.s,i;
  // 문 앞 돌판과 붉은 깔개: 입구가 어디인지 한눈에 보이게
  box(rrect(ENT-.04,y-.34,ENT+1.04,y+.34),0,.012,'#cfc6b4','#ddd5c4');
  box(rrect(ENT+.18,y-.3,ENT+.82,y+.3),.012,.028,'#9b2f2f','#b53a3a');
  box(rrect(ENT+.18,y-.3,ENT+.2,y+.3),.028,.032,CH_GOLD);box(rrect(ENT+.8,y-.3,ENT+.82,y+.3),.028,.032,CH_GOLD);
  // 기둥 두 개 + 돌 갓 + 등
  [ENT-.08,ENT+.9].forEach(function(px,n){
    var r=rrect(px,y-.1,px+.18,y+.1);
    if(brick)chBrickBox(r,0,1.25,pc,31+n*5);else box(r,0,1.25,pc);
    box(rrect(px-.03,y-.13,px+.21,y+.13),1.25,1.33,CH_STONE,'#ece6d8');
    box(rrect(px+.04,y-.06,px+.14,y+.06),1.33,1.5,'#f5e6a8','#fff4c2');
    box(rrect(px+.01,y-.09,px+.17,y+.09),1.5,1.56,'#3a2616','#5a3a1e');
    var m=rotPt(px+.09,y),q=P(m[0],m[1],1.42),g=c.createRadialGradient(q[0],q[1],0,q[0],q[1],16*s);
    g.addColorStop(0,'rgba(255,236,170,.38)');g.addColorStop(1,'rgba(255,236,170,0)');c.fillStyle=g;c.beginPath();c.arc(q[0],q[1],16*s,0,6.283);c.fill();
  });
  // 대문짝: 나무 판 + 금빛 띠. 열면 양쪽 기둥 쪽으로 젖혀진다
  if(open){
    box(rrect(ENT+.1,y,ENT+.14,y+.42),0,.66,dc);box(rrect(ENT+.86,y,ENT+.9,y+.42),0,.66,dc);
  }else{
    box(rrect(ENT+.1,y-.025,ENT+.9,y+.025),.04,.68,dc);
    for(i=1;i<8;i++)box(rrect(ENT+.1+i*.1,y-.03,ENT+.1+i*.1+.012,y+.03),.04,.68,shade(dc,.72));
    box(rrect(ENT+.1,y-.032,ENT+.9,y+.032),.3,.33,CH_GOLD);box(rrect(ENT+.1,y-.032,ENT+.9,y+.032),.56,.59,CH_GOLD);
  }
  // 들보: 나무 + 금빛 아랫단
  box(rrect(ENT-.1,y-.1,ENT+1.1,y+.1),1.1,1.3,tc);
  box(rrect(ENT-.1,y-.105,ENT+1.1,y+.105),1.1,1.13,CH_GOLD);
}

/* ---------- 바닥 타일: 어긋쌓은 벽돌(색이 조금씩 다름) · 두 가지 색 나무 마루 ----------
   한 칸(x,y) 위에 그린다. 이웃 칸과 이음새가 같은 규칙이라 이어서 깔면 한 면처럼 보인다 */
function chFloorTile(d,x,y){
  var g=PJ.c,z=.006,i,j,p,q,base=d.wall;
  var Q=function(x0,y0,x1,y1,col){var a=rotPt(x0,y0),c=rotPt(x1,y1),m0=Math.min(a[0],c[0]),m1=Math.max(a[0],c[0]),n0=Math.min(a[1],c[1]),n1=Math.max(a[1],c[1]);quad([[m0,n0,z],[m1,n0,z],[m1,n1,z],[m0,n1,z]],col);};
  var L=function(x0,y0,x1,y1){var a=rotPt(x0,y0),c=rotPt(x1,y1);p=P(a[0],a[1],z+.001);q=P(c[0],c[1],z+.001);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);};
  if(d.pat==='brick'){
    for(j=0;j<4;j++){
      var cuts=j%2?[0,.25,.75,1]:[0,.5,1];
      for(i=0;i<cuts.length-1;i++){var h=hh((x*4+i)*17+j*3,y*4+j);Q(x+cuts[i],y+j/4,x+cuts[i+1],y+(j+1)/4,shade(base,h<.25?.86:h>.75?1.12:1));}
    }
    g.strokeStyle='rgba(58,30,18,.42)';g.lineWidth=Math.max(.5,.8*PJ.s);g.beginPath();
    for(j=1;j<4;j++)L(x,y+j/4,x+1,y+j/4);
    for(j=0;j<4;j++){var o=j%2?.25:.5;L(x+o,y+j/4,x+o,y+(j+1)/4);if(o===.25)L(x+.75,y+j/4,x+.75,y+(j+1)/4);}
    g.stroke();
  }else{
    for(i=0;i<5;i++)Q(x+i/5,y,x+(i+1)/5,y+1,shade(base,(x+i)%2?.93:1.06));
    g.strokeStyle='rgba(70,44,20,.38)';g.lineWidth=Math.max(.5,.8*PJ.s);g.beginPath();
    for(i=1;i<5;i++)L(x+i/5,y,x+i/5,y+1);
    for(i=0;i<5;i++){var cy=y+.2+hh(x*5+i,y*7+i)*.6;L(x+i/5,cy,x+(i+1)/5,cy);}
    g.stroke();
  }
}
