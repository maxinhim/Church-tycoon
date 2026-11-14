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
function chBrick(pl,c,a0,a1,z0,z1,base,f,seed,rowH,bl,tp){
  if(PJ.s<.3)return;
  rowH=rowH||.07;bl=bl||.16;tp=tp==null?.4:tp;
  var g=PJ.c,rows=Math.max(1,Math.round((z1-z0)/rowH)),rh=(z1-z0)/rows,i,a,n,p,q,c2=c+.002;
  for(i=0;i<rows;i++){
    var off=(i%2)*bl/2,zz=z0+i*rh;n=0;
    for(a=a0-off;a<a1;a+=bl,n++){
      var h=hh(seed+i*13,n+i*3);if(h>tp)continue;
      var u0=Math.max(a0,a),u1=Math.min(a1,a+bl);if(u1-u0<.02)continue;
      quad([chPt(pl,c2,u0,zz),chPt(pl,c2,u1,zz),chPt(pl,c2,u1,zz+rh),chPt(pl,c2,u0,zz+rh)],shade(base,f*(h<tp/2?.86:1.12)));
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

/* ---------- 입구 대문 ----------
   spec(컨셉): {pm 재질 'brick'|'stone'|'marble'|'concrete'|'wood'|'steel'|'plain', pc 기둥색, cap 갓, beam 들보, trim 띠, leaf 문짝, bar 문살, slat 가로살, glass 유리문,
   mat 깔개, roof 기둥 위 지붕색, flower 꽃} · lv 입구 레벨(오를수록 꾸밈이 늘어난다: 4 바닥 등, 7 금빛 갓, 10 금빛 첨두) */
// 재질 그림을 얹은 상자
function chSurf(r,z0,z1,spec,seed){
  box(r,z0,z1,spec.pc);
  var pm=spec.pm,L=function(f,rh,bl,tp,sd){chBrick('L',r.y1,r.x0,r.x1,z0,z1,spec.pc,.93,seed+sd,rh,bl,tp);chBrick('R',r.x1,r.y0,r.y1,z0,z1,spec.pc,.74,seed+sd+7,rh,bl,tp);};
  if(pm==='brick')L(0,.07,.16,.4,0);
  else if(pm==='stone')L(0,.17,.3,.55,3);
  else if(pm==='concrete')L(0,.42,1.6,.12,5);
  else if(pm==='wood')L(0,9,.045,.5,9);
  else if(pm==='marble'){chVeins('L',r.y1,r.x0,r.x1,z0,z1,seed);chVeins('R',r.x1,r.y0,r.y1,z0,z1,seed+4);}
}
// 대리석 결: 연한 회색 곡선 몇 줄
function chVeins(pl,c,a0,a1,z0,z1,seed){
  if(PJ.s<.3)return;
  var g=PJ.c,i,c2=c+.002;g.strokeStyle='rgba(120,120,135,.5)';g.lineWidth=Math.max(.5,.7*PJ.s);g.beginPath();
  for(i=0;i<3;i++){
    var u0=a0+(a1-a0)*(.1+hh(seed+i,3)*.3),u1=a0+(a1-a0)*(.55+hh(seed+i,5)*.4),zA=z0+(z1-z0)*(.05+.3*hh(seed,i+9)),zB=z0+(z1-z0)*(.6+.35*hh(seed+2,i)),um=(u0+u1)/2+(a1-a0)*.1;
    var p0=chP3(pl,c2,u0,zA),p1=chP3(pl,c2,um,(zA+zB)/2+.08),p2=chP3(pl,c2,u1,zB);g.moveTo(p0[0],p0[1]);g.quadraticCurveTo(p1[0],p1[1],p2[0],p2[1]);
  }
  g.stroke();
}
function chGate(spec,open,lv){
  lv=lv||1;
  var w=EW/U,y=PZ,c=PJ.c,i,gold=lv>=7,ptop=lv>=10;
  // 문 앞 돌판과 깔개: 입구가 어디인지 한눈에 보이게
  box(rrect(ENT-.04,y-.34,ENT+w+.04,y+.34),0,.012,'#cfc6b4','#ddd5c4');
  box(rrect(ENT+.26,y-.3,ENT+w-.26,y+.3),.012,.028,spec.mat||'#9b2f2f',shade(spec.mat||'#9b2f2f',1.15));
  box(rrect(ENT+.26,y-.3,ENT+.28,y+.3),.028,.032,CH_GOLD);box(rrect(ENT+w-.28,y-.3,ENT+w-.26,y+.3),.028,.032,CH_GOLD);
  // 레벨 4부터 문 앞 양쪽 낮은 정원등
  if(lv>=4)[ENT+.12,ENT+w-.12].forEach(function(lx){box(rrect(lx-.04,y+.32,lx+.04,y+.4),0,.3,'#3d4650');box(rrect(lx-.05,y+.31,lx+.05,y+.41),.3,.38,'#f0a81c','#ffd24a');var m=rotPt(lx,y+.36);chGlow(m[0],m[1],.34,12);});
  // 기둥 두 개 + 갓 + 등
  [ENT-.08,ENT+w-.1].forEach(function(px,n){
    var r=rrect(px,y-.1,px+.18,y+.1);
    chSurf(r,0,1.25,spec,31+n*5);
    var capc=gold?CH_GOLD:spec.cap;
    box(rrect(px-.03,y-.13,px+.21,y+.13),1.25,1.33,capc,shade(capc,1.1));
    if(gold)box(rrect(px-.035,y-.135,px+.215,y+.135),1.22,1.25,CH_GOLD);
    box(rrect(px+.04,y-.06,px+.14,y+.06),1.33,1.5,'#f0a81c','#ffd24a');
    var top=spec.roof?hip(rrect(px-.04,y-.12,px+.22,y+.12),1.5,.2,spec.roof):box(rrect(px+.01,y-.09,px+.17,y+.09),1.5,1.56,'#3a2616','#5a3a1e');
    var m=rotPt(px+.09,y);chGlow(m[0],m[1],1.42,16);
    if(ptop){var tz=spec.roof?1.72:1.56;box(rrect(px+.07,y-.02,px+.11,y+.02),tz,tz+.2,CH_GOLD);box(rrect(px+.05,y-.04,px+.13,y+.04),tz+.2,tz+.24,CH_GOLD);}
  });
  // 대문짝
  var x0=ENT+.1,x1=ENT+w-.1,np=Math.round((x1-x0)/.1),lc=spec.leaf||CH_WOOD;
  if(open){
    // 문이 열려 있으면 문짝은 보이지 않는다 (기둥의 안내문이 가려지지 않게)
  }else if(spec.glass){
    box(rrect(x0,y-.015,x1,y+.015),.04,.68,'#bfe6f2','#dff4fa');
    for(i=1;i<4;i++)box(rrect(x0+i*(x1-x0)/4-.008,y-.02,x0+i*(x1-x0)/4+.008,y+.02),.04,.68,spec.bar||'#3d4650');
    box(rrect(x0,y-.02,x1,y+.02),.04,.07,spec.bar||'#3d4650');box(rrect(x0,y-.02,x1,y+.02),.64,.68,spec.bar||'#3d4650');
  }else{
    box(rrect(x0,y-.025,x1,y+.025),.04,.68,lc);
    if(spec.slat){for(i=1;i<7;i++)box(rrect(x0,y-.03,x1,y+.03),.04+i*.09,.04+i*.09+.02,spec.bar||'#15171b');}
    else for(i=1;i<np;i++)box(rrect(x0+i*(x1-x0)/np,y-.03,x0+i*(x1-x0)/np+.012,y+.03),.04,.68,spec.bar||shade(lc,.72));
    if(spec.band!==false){box(rrect(x0,y-.032,x1,y+.032),.3,.33,spec.trim||CH_GOLD);box(rrect(x0,y-.032,x1,y+.032),.56,.59,spec.trim||CH_GOLD);}
  }
  // 들보 + 아랫단 띠
  box(rrect(ENT-.1,y-.1,ENT+w+.1,y+.1),1.1,1.3,spec.beam);
  box(rrect(ENT-.1,y-.105,ENT+w+.1,y+.105),1.1,1.13,spec.trim||CH_GOLD);
  if(spec.flower){for(i=0;i<11;i++){var fx=ENT+.12+i*(w-.24)/10,fm=rotPt(fx,y+.08);dot(fm[0],fm[1],1.3+(i%2)*.05,Math.max(1.4,2.2*PJ.s),['#e57aa5','#f2c14e','#ffffff'][i%3]);}}
}

/* ---------- 대예배당 꾸밈: 기둥·조명·대형 스크린·예배 공간 ---------- */
// 조명: 번지는 빛 없이, 전구 자체가 진한 금빛으로 밝게 빛난다 (rx,ry는 화면 방향으로 돌린 좌표, rad는 전구 크기 기준)
function chGlow(rx,ry,z,rad){
  var c=PJ.c,q=P(rx,ry,z),R=Math.max(1.8,rad*.11)*PJ.s,g=c.createRadialGradient(q[0]-R*.3,q[1]-R*.3,0,q[0],q[1],R);
  g.addColorStop(0,'#fff6c0');g.addColorStop(.4,'#ffd23a');g.addColorStop(1,'#e59a0c');
  c.fillStyle=g;c.beginPath();c.arc(q[0],q[1],R,0,6.283);c.fill();
  c.strokeStyle='#a8680a';c.lineWidth=Math.max(.5,.7*PJ.s);c.stroke();
}
// 장식 기둥: 돌 받침 · 크림색 몸통 · 금빛 띠 · 돌 머리 · 맨 위 등
function chColumn(x,y,h,withLamp){
  var s=.07,q=function(m){return {x0:x-s*m,y0:y-s*m,x1:x+s*m,y1:y+s*m};};
  box(q(1.5),.05,.11,CH_STONE,'#ece6d8');
  box(q(1),.11,h-.1,'#efe8da');
  box(q(1.12),.3,.33,CH_GOLD);box(q(1.12),h-.2,h-.17,CH_GOLD);
  box(q(1.4),h-.1,h,CH_STONE,'#ece6d8');box(q(1.45),h-.02,h+.02,CH_GOLD);
  if(withLamp!==false){box(q(.6),h+.02,h+.13,'#f0a81c','#ffd24a');chGlow(x,y,h+.08,22);}
}
// 벽걸이 등: 금빛 받침 + 등
function chSconce(x,y,z,rx){box({x0:x-.025,y0:y-.025,x1:x+.025,y1:y+.025},z-.05,z,CH_GOLD);box({x0:x-.03,y0:y-.03,x1:x+.03,y1:y+.03},z,z+.07,'#f0a81c','#ffd24a');chGlow(x,y,z+.04,rx||15);}
// 뒷벽 대형 스크린: 파란 화면 + 교회 이름 (평면 위에 비스듬히)
function chScreen(c,pl,at,a0,a1,z0,z1,txt,sub){
  var g=PJ.c,m=.03,pt=function(u,z){return chPt(pl,at+.004,u,z);};
  quad([pt(a0-m,z0-m),pt(a1+m,z0-m),pt(a1+m,z1+m),pt(a0-m,z1+m)],'#15171b');
  var p0=chP3(pl,at+.006,a0,z1),p1=chP3(pl,at+.006,a1,z0),gr=g.createLinearGradient(p0[0],p0[1],p1[0],p1[1]);
  gr.addColorStop(0,'#2b4fb0');gr.addColorStop(.55,'#5a43b5');gr.addColorStop(1,'#b24a9c');
  quad([pt(a0,z0),pt(a1,z0),pt(a1,z1),pt(a0,z1)],gr);
  quad([pt(a0,z1-.02),pt(a1,z1-.02),pt(a1,z1),pt(a0,z1)],'rgba(255,255,255,.16)');
  var l=chP3(pl,at+.008,a0,(z0+z1)/2),r2=chP3(pl,at+.008,a1,(z0+z1)/2),cxs=(l[0]+r2[0])/2,cys=(l[1]+r2[1])/2,dx=r2[0]-l[0],dy=r2[1]-l[1],len=Math.hypot(dx,dy)||1,sk=dy/(len||1);
  if(PJ.s>.4){
    g.save();g.transform(dx/len,dy/len,0,1,cxs,cys);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';
    var fs=Math.max(7,Math.min(len/(txt.length*1.25),(chP3(pl,at,a0,z0)[1]-chP3(pl,at,a0,z1)[1])*.42));
    g.font='700 '+fs+'px "Gowun Batang","IBM Plex Sans KR",serif';g.fillText(txt,0,-fs*.15);
    g.font='500 '+(fs*.5)+'px "IBM Plex Sans KR",sans-serif';g.globalAlpha=.85;g.fillText(sub,0,fs*.62);g.restore();
  }
}
// 강대상 앞면의 십자가 (pl 'L'평면)
function chPulpitCross(at,cx,z0,z1,w){
  var zc=z0+(z1-z0)*.58,pt=function(u,z){return chPt('L',at+.003,u,z);};
  quad([pt(cx-.012,z0+.03),pt(cx+.012,z0+.03),pt(cx+.012,z1-.03),pt(cx-.012,z1-.03)],CH_GOLD);
  quad([pt(cx-.05,zc-.012),pt(cx+.05,zc-.012),pt(cx+.05,zc+.012),pt(cx-.05,zc+.012)],CH_GOLD);
}

/* 예배 공간 하나: 높인 단(강대상·성경책·피아노·스피커·드럼), 통로 깔개, 장의자, 음향 믹서, 뒤쪽 헌금함.
   k: 그림 배율. big이면 대예배당(셋으로 나눈 의자 · 더 넓고 깊은 단). 반환: 관리자 서는 자리 */
function chWorship(c){
  var b=c.b,r=c.r,T=c.T,fz=c.fz,cx=c.cx,W=c.W,Dp=c.Dp,parts=c.parts,figs=c.figs,nu=c.nu,big=c.big,yy,j,i;
  var SZ=big?.07:.05,sz=fz+SZ,sy=r.y0+(big?.95:.6),hasMix=Dp>=1.6,k=big?.46:.34;
  box({x0:r.x0+T,y0:r.y0+T,x1:r.x1-.08,y1:sy},fz,sz,CH_WOOD,'#b07a45');
  box({x0:cx-.4,y0:sy,x1:cx+.4,y1:sy+.06},fz,fz+.03,CH_WOOD,'#b07a45');
  // 통로와 장의자 묶음: 대예배당은 통로 둘·묶음 셋, 작은 예배당은 가운데 통로 하나
  var aisles=big?[cx-.78,cx+.78]:[cx],blocks=big?[[r.x0+.34,cx-.93],[cx-.63,cx+.63],[cx+.93,r.x1-.34]]:[[r.x0+.14,cx-.14],[cx+.14,r.x1-.14]];
  aisles.forEach(function(ax){
    quad([[ax-.09,sy+.06,fz+.003],[ax+.09,sy+.06,fz+.003],[ax+.09,r.y1,fz+.003],[ax-.09,r.y1,fz+.003]],'#9b2f2f');
    quad([[ax-.09,sy+.06,fz+.004],[ax-.075,sy+.06,fz+.004],[ax-.075,r.y1,fz+.004],[ax-.09,r.y1,fz+.004]],CH_GOLD);quad([[ax+.075,sy+.06,fz+.004],[ax+.09,sy+.06,fz+.004],[ax+.09,r.y1,fz+.004],[ax+.075,r.y1,fz+.004]],CH_GOLD);
  });
  // 강대상: 앞면(+y)에 금빛 십자가, 윗면에 펼친 성경책
  var pw=big?.16:.1,py0=r.y0+(big?.5:.34),py1=r.y0+(big?.66:.46),ph=big?.24:.19;
  parts.push({r:{x0:cx-pw,y0:py0,x1:cx+pw,y1:py1},z0:sz,z1:sz+ph,c:CH_WOOD,t:'#a8733c',cross:[py1,sz,sz+ph]});
  parts.push({r:{x0:cx-pw-.025,y0:py0-.02,x1:cx+pw+.025,y1:py1+.02},z0:sz+ph,z1:sz+ph+.03,c:CH_WOOD_D,t:'#a8733c'});
  var bz=sz+ph+.03,bw=pw*.78;
  parts.push({r:{x0:cx-bw,y0:py0+.005,x1:cx+bw,y1:py1-.005},z0:bz,z1:bz+.014,c:'#3b2a1c',t:'#4a3624',o:.05});
  parts.push({r:{x0:cx-bw+.01,y0:py0+.012,x1:cx-.004,y1:py1-.012},z0:bz+.014,z1:bz+.026,c:'#e8e0cc',t:'#f6f1e4',o:.06});
  parts.push({r:{x0:cx+.004,y0:py0+.012,x1:cx+bw-.01,y1:py1-.012},z0:bz+.014,z1:bz+.026,c:'#e8e0cc',t:'#f6f1e4',o:.06});
  parts.push({r:{x0:cx-.004,y0:py0+.01,x1:cx+.004,y1:py1-.01},z0:bz+.014,z1:bz+.03,c:'#7a2f2f',o:.07});
  parts.push({r:{x0:cx+pw-.03,y0:py0+.01,x1:cx+pw-.02,y1:py0+.02},z0:bz,z1:bz+.1,c:'#15171b',o:.05});
  var mx=cx+(big?.5:Math.min(.26,W*.2)),my=r.y0+(big?.55:.3);
  if(W>=1.6){
    chPiano(parts,chRM(r.x0+(big?.35:.1),r.y0+(big?.14:.1),r.x0+(big?.35:.1)+(big?.5:.36),r.y0+(big?.14:.1)+(big?.6:.4)),sz,k);
    var so=big?.55:.28;
    chSpeaker(parts,chRM(cx-so-.16,r.y0+.1,cx-so,r.y0+.26),sz,k);chSpeaker(parts,chRM(cx+so,r.y0+.1,cx+so+.16,r.y0+.26),sz,k);
    if(!big){mx=cx+.55;my=r.y0+.3;}
  }
  if(big){
    chSpeaker(parts,chRM(r.x0+.18,sy-.3,r.x0+.34,sy-.14),sz,k);chSpeaker(parts,chRM(r.x1-.34,sy-.3,r.x1-.18,sy-.14),sz,k);
    chDrums(parts,chRM(r.x1-1.2,r.y0+.14,r.x1-.6,r.y0+.8),sz,k);
  }else if(W>=2.4)chDrums(parts,chRM(r.x1-.56,r.y0+.08,r.x1-.16,r.y0+.52),sz,k);
  if(hasMix)chMixer(parts,chRM(cx+(big?.34:.16),r.y1-.46,cx+(big?.7:.52),r.y1-.24),fz,.34);
  if(W>=1.4)chOffering(parts,chRM(cx-(big?.7:.55),r.y1-.46,cx-(big?.34:.3),r.y1-.24),fz,.4);   // 맨 뒤쪽(출입구 쪽) 헌금함
  for(yy=sy+.12,j=0;yy<r.y1-(hasMix?.55:.16);yy+=.27,j++){
    blocks.forEach(function(bk,bi){chPew(parts,bk[0],bk[1],yy,fz);
      if(figs.length<nu&&(j+bi)%2===0)figs.push([bk[0]+.12+(bk[1]-bk[0]-.24)*(.3+.4*hh(b.id+bi,j)),yy+.03,j*3+bi,.05]);});
  }
  return [mx,my];
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
