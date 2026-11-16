'use strict';
/* ---------- 건물 내부 (코드로 그린다 — 외부 그림 없음) ----------
   모든 건물은 지붕 없는 단면(drawCutaway, render-entities.js)으로 그리고, 안에 건물 컨셉에 맞는 작은 소품을 놓는다.
   · 소품은 상자 몇 개로 만든 가구다(rm* 함수). 자리는 방 안쪽을 0~1로 본 (u,v): u는 뒷벽을 따라 왼→오른쪽, v는 뒷벽(0)→앞(1)
   · ROOMS[건물 id](c)가 소품을 놓고 담당자 자리 [u,v]를 돌려준다. 이용자 자리는 rmSit으로 알린다(가동 중일 때만 사람이 선다)
   · ROOM_LOOK[건물 id] = [바닥 종류, 색1, 색2, 벽 벽돌 색] (legacy() 안에서 부른다) */
function rmCtx(b,d,r,T,fz,parts,figs,nu){
  var c={b:b,d:d,r:r,fz:fz,P:parts,figs:figs,nu:nu,x0:r.x0+T+.05,y0:r.y0+T+.05,bx:r.x0+T,by:r.y0+T,W:r.x1-r.x0-T-.2,D:r.y1-r.y0-T-.2};
  c.X=function(u){return c.x0+u*c.W;};c.Y=function(v){return c.y0+v*c.D;};
  return c;
}
function rmB(c,x,y,hw,hd,z0,z1,col,top,o){if(o<-5)o-=x+hw+y+hd;   // 바닥에 깔리는 것(o<-5)은 자리와 상관없이 o 순서대로
  c.P.push({r:{x0:x-hw,y0:y-hd,x1:x+hw,y1:y+hd},z0:c.fz+z0,z1:c.fz+z1,c:col,t:top,o:o||0});}
function rmSit(c,u,v,dz){if(c.figs.length<c.nu)c.figs.push([c.X(u),c.Y(v),c.figs.length,dz||0]);}
var RM_BOOKS=['#c4503a','#3f6fe0','#e8b93a','#3f8a5a','#8a5bb5','#e57a95','#f4efe6','#2f9e8a'];
var RM_WOOD='#8a6844',RM_WOOD_L='#b98450',RM_WOOD_D='#5e4630',RM_WHITE='#f4f1ea',RM_STEEL='#b8c0c6';
// --- 기본 가구
function rmTable(c,u,v,hw,hd,col,h){var x=c.X(u),y=c.Y(v);h=h||.13;rmB(c,x,y,hw*.72,hd*.72,0,h-.02,shade(col||RM_WOOD_L,.6));rmB(c,x,y,hw,hd,h-.02,h+.01,col||RM_WOOD_L,shade(col||RM_WOOD_L,1.18));}
function rmStool(c,u,v,col){rmB(c,c.X(u),c.Y(v),.04,.04,0,.07,col||'#c98a52',shade(col||'#c98a52',1.15));}
function rmChair(c,u,v,col){var x=c.X(u),y=c.Y(v);col=col||'#b5825a';rmB(c,x,y,.045,.045,0,.08,col,shade(col,1.15));rmB(c,x,y-.04,.045,.01,.08,.2,shade(col,.8));}
function rmSofa(c,u,v,hw,col){var x=c.X(u),y=c.Y(v);rmB(c,x,y-.06,hw,.02,0,.2,shade(col,.75),shade(col,.9));rmB(c,x,y,hw,.06,0,.09,col,shade(col,1.15));
  rmB(c,x-hw+.015,y,.02,.06,.09,.14,shade(col,.85));rmB(c,x+hw-.015,y,.02,.06,.09,.14,shade(col,.85));}
function rmCushion(c,u,v,col){rmB(c,c.X(u),c.Y(v),.05,.05,0,.03,col,shade(col,1.2));}
function rmRug(c,u,v,hw,hd,col,col2){var x=c.X(u),y=c.Y(v);rmB(c,x,y,hw,hd,0,.006,col,col,-9);if(col2)rmB(c,x,y,hw*.72,hd*.72,.006,.009,col2,col2,-8.9);}
function rmPlant(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.035,.035,0,.07,'#b9694c','#c97a58');rmB(c,x,y,.055,.055,.07,.19,'#3f8a4a','#5aa85c');rmB(c,x,y,.03,.03,.19,.26,'#4f9a55','#6dba6a');}
function rmCrate(c,u,v,s,col,z){var x=c.X(u),y=c.Y(v);z=z||0;rmB(c,x,y,s,s,z,z+s*1.6,col||'#c99a64',shade(col||'#c99a64',1.15),z);}
function rmLamp(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.012,.012,0,.26,'#3d3d46');rmB(c,x,y,.04,.04,.26,.33,'#f6e3a0','#fff3c4');}
function rmCounter(c,u,v,hw,hd,col,top,h){var x=c.X(u),y=c.Y(v);h=h||.17;rmB(c,x,y,hw,hd,0,h,col||'#b5825a',null);rmB(c,x,y,hw+.01,hd+.01,h,h+.02,top||'#e8dcc6',shade(top||'#e8dcc6',1.08));}
// 탁자 위 작은 물건 (u,v 자리, 높이 z)
function rmItem(c,u,v,s,z,h,col,top){rmB(c,c.X(u),c.Y(v),s,s,z,z+h,col,top||shade(col,1.2),.2);}
// --- 벽에 붙는 것: 뒷벽 'L'(y 고정, u를 따라) · 왼벽 'R'(x 고정, v를 따라)
function rmWall(c,pl,a0,a1,z0,z1,col,frame){
  var f=function(){var k=pl==='L'?c.by:c.bx,p0=pl==='L'?c.X(a0):c.Y(a0),p1=pl==='L'?c.X(a1):c.Y(a1);
    if(frame)chStrip(pl,k,p0-.015,p1+.015,z0-.015,z1+.015,frame);chStrip(pl,k+.001,p0,p1,z0,z1,col);};
  c.P.push({r:{x0:c.bx,y0:c.by,x1:c.bx,y1:c.by},z0:0,z1:0,f:f,o:-20});
}
function rmCross(c,u,z){rmWall(c,'L',u-.012/c.W,u+.012/c.W,z,z+.2,CH_GOLD);rmWall(c,'L',u-.045/c.W,u+.045/c.W,z+.12,z+.145,CH_GOLD);}
// 벽 선반·책장: 칸마다 색색의 물건. pl 'L' 뒷벽(u 가운데, 반너비 hw) · 'R' 왼벽(v 가운데)
function rmShelf(c,pl,a,hw,h,cols,wood){
  var L=pl==='L',x=L?c.X(a):c.bx+.05,y=L?c.by+.05:c.Y(a),n=Math.max(1,Math.round(h/.11)),i,j,m=Math.max(2,Math.round(hw/.045));
  wood=wood||RM_WOOD;cols=cols||RM_BOOKS;
  rmB(c,x,y,L?hw:.05,L?.05:hw,0,h,wood,shade(wood,1.2));
  for(i=0;i<n;i++)for(j=0;j<m;j++){var t=-hw+(j+.5)*2*hw/m,col=cols[(i*3+j+((c.b.id||7)%5))%cols.length],z=.02+i*(h-.02)/n,hh2=(h-.02)/n*.72;
    if(L)rmB(c,x+t,y+.052,hw/m*.8,.003,z,z+hh2,col,col,.02);else rmB(c,x+.052,y+t,.003,hw/m*.8,z,z+hh2,col,col,.02);}
}
// --- 조금 큰 소품
function rmFridge(c,u,col){var x=c.X(u),y=c.by+.06;rmB(c,x,y,.07,.06,0,.34,col||RM_STEEL,RM_WHITE);rmB(c,x+.045,y+.062,.008,.003,.1,.26,'#6c7880',null,.02);}
function rmStove(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.08,.07,0,.16,'#d9dde0','#3a3f46');rmB(c,x-.03,y,.022,.022,.16,.21,'#c4503a','#e8762c',.1);rmB(c,x+.035,y+.01,.025,.025,.16,.19,'#8a9299','#b8c0c6',.1);}
function rmSink(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.07,.055,0,.15,RM_WHITE,'#dfe6ea');rmB(c,x,y,.045,.03,.15,.155,'#8fc3e0','#8fc3e0',.1);rmB(c,x,y-.04,.008,.008,.15,.22,RM_STEEL,null,.1);}
function rmStall(c,u,col){var x=c.X(u),y=c.by+.11;rmB(c,x-.085,y,.008,.11,0,.3,col,shade(col,1.15));rmB(c,x+.085,y,.008,.11,0,.3,col,shade(col,1.15));
  rmB(c,x,y-.04,.04,.03,0,.13,RM_WHITE,'#ffffff');rmB(c,x,y+.02,.035,.04,0,.07,RM_WHITE,'#ffffff');rmB(c,x,y+.02,.022,.025,.07,.075,'#8fc3e0','#8fc3e0',.1);}
function rmBed(c,u,v,col,rail){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.1,.065,0,.07,RM_WHITE,col);rmB(c,x-.07,y,.03,.05,.07,.09,'#ffffff','#ffffff',.1);
  if(rail){rmB(c,x,y-.065,.1,.006,.07,.16,rail);rmB(c,x-.1,y,.006,.065,.07,.16,rail);rmB(c,x+.1,y,.006,.065,.07,.13,rail,null,.1);rmB(c,x,y+.065,.1,.006,.07,.13,rail,null,.1);}}
function rmEasel(c,u,v,col){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.012,.012,0,.26,RM_WOOD_D);rmB(c,x,y+.014,.055,.004,.1,.25,RM_WHITE,RM_WHITE,.05);rmB(c,x,y+.019,.035,.002,.14,.21,col,col,.06);}
function rmGuitar(c,u,v,col){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.03,.012,0,.1,col||'#c9853a',shade(col||'#c9853a',1.2));rmB(c,x,y,.008,.008,.1,.24,'#5e3a1c');}
function rmAmp(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.06,.045,0,.13,'#22252b','#3b4048');rmB(c,x,y+.046,.04,.002,.03,.1,'#59626b','#59626b',.05);}
function rmMic(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.03,.03,0,.012,'#22252b');rmB(c,x,y,.006,.006,.012,.3,'#59626b');rmB(c,x,y,.015,.015,.3,.33,'#15171b','#3b4048');}
function rmStand(c,u,v){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.006,.006,0,.22,'#3d3d46');rmB(c,x,y,.04,.006,.2,.28,'#22252b',RM_WHITE,.05);}
function rmTV(c,pl,a,w,z){rmWall(c,pl,a-w,a+w,z,z+.16,'#1d2733','#15171b');rmWall(c,pl,a-w*.8,a+w*.2,z+.03,z+.13,'#3f6fb0');}
function rmCar(c,u,v,col){var x=c.X(u),y=c.Y(v);rmB(c,x,y,.09,.17,.02,.1,col,shade(col,1.15));rmB(c,x,y-.01,.08,.09,.1,.17,shade(col,.9),'#bcd3e0');}
function rmBunting(c,z){var cs=['#e0567f','#f2c14e','#4a78c7','#3d9b7a','#e8762c'],i,n=Math.max(5,Math.round(c.W/.16));for(i=0;i<n;i++)rmWall(c,'L',(i+.2)/n,(i+.8)/n,z-(i%2?.02:0),z+.05-(i%2?.02:0),cs[i%5]);}
// 접시·컵이 놓인 식탁과 둘레 의자
function rmDine(c,u,v,hw,hd,col,n){
  rmTable(c,u,v,hw,hd,col);var i,du=hw/c.W,dv=hd/c.D;n=n||2;
  for(i=0;i<n;i++){var t=n===1?0:(i/(n-1)-.5)*1.3;
    rmItem(c,u+t*du,v-dv*.35,.018,.14,.012,'#ffffff');rmItem(c,u+t*du,v+dv*.35,.018,.14,.012,'#ffffff');
    rmStool(c,u+t*du,v-dv-.05/c.D);rmStool(c,u+t*du,v+dv+.06/c.D);
    rmSit(c,u+t*du,v+dv+.07/c.D);}
}
var ROOM_LOOK={
  pray:['wood','#a8825a',0,'#8a6a5a'],bible:['wood','#c9a877',0,0],praise:['wood','#9a7a5a',0,'#6a5a8a'],dawn:['wood','#7a6a5a',0,'#4f5a7a'],mission:['wood','#c9a877',0,0],
  cafe:['wood','#b98a5a',0,'#7d5440'],books:['wood','#c9a877',0,'#6b8f71'],dining:['tile','#f2e6cf','#e0c9a0','#b5654a'],bakery:['tile','#f6ead4','#e8c98f','#c9853a'],
  bookstore:['wood','#c9a877',0,'#4f6db0'],shop:['tile','#f2ede4','#d9cdb8','#d1a02e'],
  cell:['wood','#d8c39a',0,'#5f8a5a'],hall:['wood','#d8c39a',0,'#a0603f'],youth:['tile','#dfeef2','#b8dbe3','#2f8f9d'],
  gym:['wood','#e0b878',0,'#5a6b7c'],boardgame:['wood','#d8c39a',0,'#7a5bc7'],calli:['wood','#d9c9a3',0,'#6b6b74'],art:['tile','#f4efe6','#e6ddcc','#d9567a'],
  craft:['wood','#b98a5a',0,'#8a5a2b'],cook:['tile','#f6ecdc','#f0d9a8','#d1a02e'],guitar:['wood','#c9a877',0,'#c9853a'],band:['tile','#4a5058','#3f454d','#3f4650'],choir:['wood','#c9a877',0,'#3f5ea3'],
  pantry:['wood','#b98a5a',0,'#8a5a2b'],counsel:['wood','#d8c39a',0,'#7b6aa5'],kids:['tile','#fff3c4','#f6d98a','#e08a2c'],kinder:['tile','#fff6d0','#ffe9a0','#f0a030'],teens:['wood','#b8a9d8',0,'#6a5bb5'],nursery:['tile','#fdeef4','#f9d3e2','#d9709a'],
  elder:['wood','#c9a877',0,'#8a6b4a'],clinic:['tile','#f4f6f7','#dfe9ec','#4f9a83'],study:['wood','#d8c39a',0,'#c08a2e'],foodbank:['tile','#f2e6cf','#e0c9a0','#9a5b2b'],
  wc:['tile','#eef3f5','#cfdde3','#6c8794'],wc2:['tile','#eef3f5','#cfdde3','#6c8794'],info:['tile','#eef2f5','#d3dde6','#3f5ea3'],nurse:['wood','#ecd9c9',0,'#c77d8f'],
  lounge:['wood','#c9b48a',0,'#5c8a5a'],parktower:['tile','#8a9299','#8a9299','#8a9096']
};
var ROOMS={
  // ----- 예배 (작은 방들)
  pray:function(c){rmCross(c,.5,.2);rmRug(c,.5,.62,.2,.2,'#7a3b4a','#9b4f5e');rmTable(c,.5,.16,.09,.06,RM_WOOD,.12);rmItem(c,.38,.16,.012,.13,.06,'#f6f1e4','#f2c230');rmItem(c,.62,.16,.012,.13,.06,'#f6f1e4','#f2c230');rmItem(c,.5,.16,.03,.13,.015,'#7a1f28','#f6f1e4');
    rmCushion(c,.32,.62,'#c9a24a');rmCushion(c,.68,.62,'#c9a24a');rmSit(c,.32,.66);rmSit(c,.68,.66);rmPlant(c,.92,.12);return null;},
  bible:function(c){rmWall(c,'L',.3,.7,.2,.36,'#f4f6f7','#8a6844');rmWall(c,'L',.34,.5,.3,.31,'#3f6fe0');rmWall(c,'L',.34,.6,.25,.26,'#c4503a');rmShelf(c,'R',.45,.16,.3);
    rmTable(c,.56,.6,c.W*.3,.09);[-.6,0,.6].forEach(function(t,i){rmItem(c,.56+t*.26,.6,.028,.14,.012,'#f6f1e4','#fffdf6');rmStool(c,.56+t*.26,.6-.17/c.D);rmStool(c,.56+t*.26,.6+.17/c.D);rmSit(c,.56+t*.26,.6+.19/c.D);});
    rmPlant(c,.95,.1);return [.8,.2];},
  praise:function(c){rmB(c,c.X(.5),c.Y(.2),c.W*.5,c.D*.2+.02,0,.04,CH_WOOD,'#b07a45',-5);rmWall(c,'L',.25,.75,.24,.4,'#3b2a5a','#22252b');rmWall(c,'L',.38,.62,.3,.34,'#f2c230');
    chDrums(c.P,chRM(c.X(.72),c.Y(.04),c.X(.98),c.Y(.34)),c.fz+.04,.3);chPiano(c.P,chRM(c.X(.02),c.Y(.04),c.X(.28),c.Y(.36)),c.fz+.04,.3);
    rmMic(c,.5,.3);rmGuitar(c,.36,.14,'#c4503a');rmAmp(c,.62,.1);rmStand(c,.42,.36);
    [.2,.5,.8].forEach(function(u){rmStool(c,u,.72,'#7a5bb5');rmSit(c,u,.78);});[.35,.65].forEach(function(u){rmStool(c,u,.9,'#7a5bb5');rmSit(c,u,.95);});return [.6,.28];},
  dawn:function(c){rmCross(c,.5,.2);rmWall(c,'L',.1,.3,.2,.36,'#27314f','#5e4630');rmWall(c,'L',.17,.2,.3,.33,'#f6e3a0');rmWall(c,'L',.7,.9,.2,.36,'#27314f','#5e4630');
    rmTable(c,.5,.12,.08,.05,RM_WOOD_D,.2);rmItem(c,.5,.12,.03,.21,.015,'#7a1f28','#f6f1e4');rmLamp(c,.9,.1);rmLamp(c,.1,.1);
    [.38,.6,.82].forEach(function(v){[.28,.72].forEach(function(u){rmCushion(c,u,v,'#3f5ea3');rmSit(c,u,v+.03);});});return [.5,.24];},
  // ----- 매장
  cafe:function(c){rmWall(c,'L',.08,.5,.24,.38,'#2f3a34','#8a6844');rmWall(c,'L',.12,.3,.33,.34,'#f4efe6');rmWall(c,'L',.12,.4,.29,.3,'#f4efe6');rmWall(c,'L',.12,.26,.25,.26,'#f2c230');
    rmCounter(c,.3,.3,c.W*.26,.06,'#7d5440','#e8dcc6');rmItem(c,.14,.3,.035,.19,.1,'#3d3d46','#c4503a');rmItem(c,.3,.3,.02,.19,.05,'#ffffff');rmItem(c,.4,.3,.02,.19,.05,'#f6e3b0');rmItem(c,.5,.3,.03,.19,.03,'#d9a05a','#f2c98a');
    rmShelf(c,'L',.8,.12,.34,['#f4efe6','#7d5440','#c9853a','#3f8a5a']);
    [[.3,.78],[.75,.7]].forEach(function(p){rmTable(c,p[0],p[1],.07,.07,'#e8dcc6',.12);rmItem(c,p[0],p[1],.016,.13,.03,'#ffffff','#7d5440');rmStool(c,p[0]-.1/c.W,p[1]);rmStool(c,p[0]+.1/c.W,p[1]);rmSit(c,p[0]+.12/c.W,p[1]+.04);});
    rmPlant(c,.97,.95);return [.3,.14];},
  books:function(c){rmShelf(c,'L',.3,c.W*.26,.38);rmShelf(c,'R',.55,c.D*.24,.38);rmWall(c,'L',.66,.94,.22,.36,'#6b8f71','#8a6844');rmWall(c,'L',.72,.88,.28,.3,'#f4efe6');
    rmCounter(c,.8,.22,.14,.05,'#6b8f71','#e8dcc6');rmItem(c,.72,.22,.03,.19,.08,'#3d3d46','#c4503a');rmItem(c,.86,.22,.018,.19,.04,'#ffffff');
    rmRug(c,.55,.7,.26,.2,'#c96f5a','#e8b8a0');rmSofa(c,.55,.56,.16,'#4f8a6a');rmTable(c,.55,.74,.1,.06,RM_WOOD_L,.08);rmItem(c,.5,.74,.025,.09,.012,'#3f6fe0');rmItem(c,.6,.74,.016,.09,.03,'#ffffff');
    rmChair(c,.88,.72,'#c9853a');rmSit(c,.55,.6,.06);rmSit(c,.88,.76);rmSit(c,.3,.85);rmPlant(c,.96,.95);rmLamp(c,.3,.56);return [.8,.1];},
  dining:function(c){rmCounter(c,.4,.1,c.W*.36,.06,RM_STEEL,'#dfe6ea');rmItem(c,.14,.1,.035,.19,.06,'#8a9299','#c4503a');rmItem(c,.3,.1,.035,.19,.05,'#3d3d46','#f2c98a');rmItem(c,.46,.1,.03,.19,.04,'#ffffff','#e8762c');rmItem(c,.62,.1,.03,.19,.04,'#ffffff','#5aa85c');
    rmFridge(c,.92);rmWall(c,'L',.2,.6,.26,.38,'#f6ecdc','#b5654a');rmWall(c,'L',.25,.5,.33,.34,'#c4503a');rmWall(c,'L',.25,.42,.29,.3,'#8a6844');
    rmDine(c,.28,.52,c.W*.2,.08,'#d9b98a',3);rmDine(c,.28,.86,c.W*.2,.08,'#d9b98a',3);rmDine(c,.76,.52,c.W*.16,.08,'#d9b98a',2);rmDine(c,.76,.86,c.W*.16,.08,'#d9b98a',2);return [.5,.26];},
  bakery:function(c){rmShelf(c,'L',.3,c.W*.26,.36,['#d9a05a','#e8c98f','#b9783a','#f2d9a0'],'#c9a877');rmB(c,c.X(.84),c.by+.07,.1,.07,0,.3,'#59626b','#3d4650');rmB(c,c.X(.84),c.by+.142,.07,.003,.08,.2,'#22252b','#22252b',.05);rmB(c,c.X(.84),c.by+.146,.05,.002,.1,.16,'#e8762c','#e8762c',.06);
    rmCounter(c,.42,.5,c.W*.34,.06,'#f6ead4','#fffaf0');[.14,.28,.42,.56].forEach(function(u,i){rmItem(c,u,.5,.03,.19,.035,['#d9a05a','#e8c98f','#b9783a','#f6d9c0'][i],['#e8b56a','#f6e3b0','#d9925a','#e57a95'][i]);});rmItem(c,.7,.5,.03,.19,.07,'#3d3d46','#c4503a');
    rmCrate(c,.95,.9,.05,'#c9a877');rmSit(c,.3,.86);rmSit(c,.55,.9);rmSit(c,.75,.82);rmPlant(c,.04,.95);return [.42,.3];},
  bookstore:function(c){rmShelf(c,'L',.36,c.W*.34,.38);rmShelf(c,'R',.6,c.D*.22,.3);rmWall(c,'L',.78,.96,.22,.36,'#4f6db0','#8a6844');rmCross(c,.87,.2);
    rmTable(c,.45,.66,c.W*.18,.08,RM_WOOD_L,.11);[-.5,0,.5].forEach(function(t,i){rmItem(c,.45+t*.3,.66,.03,.12,.02,RM_BOOKS[i*2]);rmItem(c,.45+t*.3,.66,.022,.14,.02,RM_BOOKS[i*2+1]);});
    rmCounter(c,.86,.4,.09,.05,'#4f6db0','#e8dcc6');rmItem(c,.86,.4,.03,.19,.07,'#3d3d46','#c4503a');rmSit(c,.3,.9);rmSit(c,.62,.92);rmSit(c,.86,.7);rmPlant(c,.97,.96);return [.88,.24];},
  shop:function(c){rmShelf(c,'L',.36,c.W*.3,.36,['#e0567f','#f2c14e','#4a78c7','#3d9b7a','#e8762c']);rmFridge(c,.86,'#dfe9ec');
    rmCounter(c,.4,.56,c.W*.3,.055,'#d1a02e','#fff3c4');rmItem(c,.2,.56,.03,.19,.07,'#3d3d46','#c4503a');rmItem(c,.42,.56,.022,.19,.06,'#e0567f');rmItem(c,.56,.56,.022,.19,.05,'#4a78c7');
    rmCrate(c,.92,.9,.045,'#c99a64');rmSit(c,.3,.9);rmSit(c,.62,.92);return [.4,.36];},
  // ----- 교제
  cell:function(c){rmShelf(c,'L',.2,.16,.34);rmWall(c,'L',.45,.75,.22,.36,'#f6efe0','#8a6844');rmWall(c,'L',.5,.7,.3,.31,'#c4503a');rmWall(c,'L',.5,.64,.26,.27,'#5f8a5a');
    rmRug(c,.5,.62,c.W*.36,c.D*.28,'#5f8a5a','#a8cfa0');rmTable(c,.5,.62,.1,.08,RM_WOOD_L,.08);rmItem(c,.5,.62,.022,.09,.04,'#ffffff','#c9853a');rmItem(c,.42,.6,.014,.09,.025,'#ffffff');rmItem(c,.58,.66,.014,.09,.025,'#ffffff');
    rmSofa(c,.5,.4,.16,'#c9853a');[[.2,.62,'#e57a95'],[.8,.62,'#4a78c7'],[.36,.86,'#e8b93a'],[.64,.86,'#8a5bb5']].forEach(function(p){rmCushion(c,p[0],p[1],p[2]);rmSit(c,p[0],p[1]+.03);});
    rmPlant(c,.95,.1);rmLamp(c,.05,.95);return [.84,.24];},
  hall:function(c){rmBunting(c,.34);rmCounter(c,.3,.1,c.W*.24,.055,'#a0603f','#f6ecdc');[.12,.24,.36,.48].forEach(function(u,i){rmItem(c,u,.1,.03,.19,.03+.01*(i%2),['#ffffff','#c4503a','#f2c98a','#5aa85c'][i]);});rmItem(c,.56,.1,.03,.19,.1,RM_STEEL,'#3d3d46');
    rmFridge(c,.92);rmPlant(c,.74,.08);
    [[.2,.5],[.56,.5],[.88,.56],[.36,.86],[.72,.88]].forEach(function(p){rmTable(c,p[0],p[1],.09,.09,'#f6ecdc',.12);rmItem(c,p[0],p[1],.02,.13,.04,'#e57a95','#f6d9e0');
      rmStool(c,p[0]-.13/c.W,p[1]);rmStool(c,p[0]+.13/c.W,p[1]);rmStool(c,p[0],p[1]-.13/c.D);rmSit(c,p[0]+.14/c.W,p[1]+.05);});return [.32,.26];},
  youth:function(c){rmTV(c,'L',.3,.2,.2);rmB(c,c.X(.3),c.by+.05,.14,.04,0,.08,'#3d4650','#59626b');rmItem(c,.26,.07,.03,.08,.03,'#22252b','#c4503a');
    rmWall(c,'L',.62,.9,.2,.38,'#2f8f9d','#22252b');rmWall(c,'L',.66,.8,.3,.32,'#f2c230');rmWall(c,'L',.7,.86,.25,.27,'#f4efe6');
    rmRug(c,.32,.5,.24,.16,'#2f8f9d','#8fd0d9');rmSofa(c,.32,.58,.17,'#e8762c');rmCushion(c,.12,.36,'#f2c230');rmCushion(c,.52,.36,'#e0567f');rmSit(c,.26,.62,.06);rmSit(c,.4,.62,.06);
    rmB(c,c.X(.78),c.Y(.66),.12,.08,.06,.16,'#3f8a5a','#5aa85c');rmB(c,c.X(.78),c.Y(.66),.1,.06,0,.06,'#5e4630');rmSit(c,.78,.88);rmSit(c,.95,.62);
    rmGuitar(c,.95,.14,'#c9853a');rmAmp(c,.84,.12);rmPlant(c,.05,.95);return [.6,.3];},
  // ----- 소모임
  gym:function(c){rmRug(c,.5,.55,c.W*.44,c.D*.38,'#f4efe6','#e0b878');rmB(c,c.X(.5),c.Y(.55),.004,c.D*.38,.009,.011,'#f4efe6','#f4efe6',-8.8);rmB(c,c.X(.5),c.Y(.55),.12,.12,.011,.012,'#c4503a','#c4503a',-8.7);rmB(c,c.X(.5),c.Y(.55),.1,.1,.012,.013,'#e0b878','#e0b878',-8.6);
    rmWall(c,'R',.46,.64,.3,.46,'#f4efe6','#c4503a');rmB(c,c.bx+.08,c.Y(.55),.05,.05,.3,.31,'#e8762c','#e8762c');
    rmWall(c,'L',.36,.64,.26,.4,'#27314f','#22252b');rmWall(c,'L',.4,.48,.3,.37,'#f2c230');rmWall(c,'L',.52,.6,.3,.37,'#f4efe6');
    rmB(c,c.X(.88),c.by+.05,.1,.04,0,.12,'#59626b','#8a9299');[.82,.88,.94].forEach(function(u,i){rmItem(c,u,.02,.03,.12,.06,['#e8762c','#f4efe6','#f2c230'][i]);});
    rmB(c,c.X(.14),c.by+.05,.16,.04,0,.07,RM_WOOD_L,'#d9b98a');rmCrate(c,.97,.95,.04,'#3f6fe0');
    [[.3,.4],[.7,.4],[.3,.72],[.7,.72],[.5,.3],[.5,.84]].forEach(function(p){rmSit(c,p[0],p[1]);});rmItem(c,.56,.52,.028,0,.056,'#e8762c','#f2a04a');return [.12,.24];},
  boardgame:function(c){rmShelf(c,'L',.3,c.W*.26,.36,['#c4503a','#3f6fe0','#e8b93a','#3f8a5a','#8a5bb5','#e8762c']);rmWall(c,'L',.66,.94,.22,.36,'#7a5bc7','#5e4630');rmWall(c,'L',.72,.78,.26,.32,'#f4efe6');rmWall(c,'L',.82,.88,.26,.32,'#f2c230');
    [[.28,.52],[.74,.56],[.5,.86]].forEach(function(p,i){rmTable(c,p[0],p[1],.11,.09,RM_WOOD_L,.12);rmItem(c,p[0],p[1],.06,.13,.008,['#3f8a5a','#f6ecdc','#3f6fe0'][i]);rmItem(c,p[0]-.03/c.W,p[1],.012,.14,.025,'#c4503a');rmItem(c,p[0]+.035/c.W,p[1]+.02,.012,.14,.025,'#f2c230');
      rmStool(c,p[0]-.15/c.W,p[1],'#7a5bc7');rmStool(c,p[0]+.15/c.W,p[1],'#7a5bc7');rmSit(c,p[0]+.16/c.W,p[1]+.05);rmSit(c,p[0]-.16/c.W,p[1]+.05);});rmPlant(c,.96,.14);return [.56,.24];},
  calli:function(c){[[.14,.26],[.34,.46],[.56,.68],[.76,.88]].forEach(function(p,i){rmWall(c,'L',p[0],p[1],.14,.4,'#f6f1e4','#5e4630');rmWall(c,'L',p[0]+.04,p[0]+.07,.2,.36,'#22252b');if(i%2)rmWall(c,'L',p[0]+.08,p[0]+.1,.18,.2,'#c4503a');});
    [[.26,.5],[.72,.5],[.26,.84],[.72,.84]].forEach(function(p){rmTable(c,p[0],p[1],.12,.07,'#5e4630',.07);rmItem(c,p[0],p[1],.07,.08,.006,'#f6f1e4','#fffdf6');rmItem(c,p[0]+.09/c.W,p[1],.014,.08,.035,'#22252b');rmItem(c,p[0]-.02/c.W,p[1],.006,.09,.006,'#22252b');
      rmCushion(c,p[0],p[1]+.13/c.D,'#6b6b74');rmSit(c,p[0],p[1]+.15/c.D);});rmPlant(c,.96,.12);rmShelf(c,'R',.3,.12,.2,['#f6f1e4','#22252b','#c4503a']);return [.5,.26];},
  art:function(c){[['#e0567f',.1,.26],['#3f6fe0',.32,.46],['#f2c14e',.52,.7],['#3d9b7a',.76,.92]].forEach(function(p,i){rmWall(c,'L',p[1],p[2],.22+.03*(i%2),.38,p[0],'#f4efe6');rmWall(c,'L',p[1]+.03,p[2]-.06,.27+.03*(i%2),.31+.03*(i%2),'#fff3c4');});
    [[.2,.5,'#e0567f'],[.5,.44,'#3f6fe0'],[.8,.5,'#3d9b7a'],[.34,.82,'#f2c14e'],[.68,.82,'#8a5bb5']].forEach(function(p){rmEasel(c,p[0],p[1],p[2]);rmStool(c,p[0],p[1]+.12/c.D);rmSit(c,p[0]+.03,p[1]+.14/c.D);});
    rmTable(c,.92,.9,.06,.08,RM_WHITE,.12);[['#c4503a',.86],['#3f6fe0',.9],['#f2c14e',.94]].forEach(function(p){rmItem(c,.92,p[1],.014,.13,.03,p[0]);});rmShelf(c,'R',.3,.12,.24,['#e0567f','#f2c14e','#4a78c7','#f4efe6']);return [.92,.3];},
  craft:function(c){rmWall(c,'L',.1,.5,.2,.38,'#d9b98a','#5e4630');[.15,.22,.29,.36,.43].forEach(function(u,i){rmWall(c,'L',u,u+.03,.24+.02*(i%3),.34,['#59626b','#c4503a','#8a9299','#3d3d46','#e8b93a'][i]);});
    rmShelf(c,'L',.76,c.W*.2,.36,['#c97a58','#e8dcc6','#8fb0c0','#b9694c','#d9b98a'],'#8a6844');
    rmCounter(c,.3,.3,c.W*.24,.06,'#8a5a2b','#b98450');rmItem(c,.16,.3,.03,.19,.05,'#c97a58');rmItem(c,.3,.3,.025,.19,.07,'#8fb0c0');rmItem(c,.44,.3,.035,.19,.02,'#d9b98a');
    [[.3,.72],[.74,.68]].forEach(function(p){rmTable(c,p[0],p[1],.13,.08,'#b98450',.12);rmItem(c,p[0]-.05/c.W,p[1],.03,.13,.04,'#c97a58','#d98a68');rmItem(c,p[0]+.06/c.W,p[1],.02,.13,.02,'#e8b93a');rmStool(c,p[0],p[1]+.14/c.D);rmStool(c,p[0]-.17/c.W,p[1]);rmSit(c,p[0],p[1]+.16/c.D);rmSit(c,p[0]+.17/c.W,p[1]+.04);});
    rmCrate(c,.96,.95,.05,'#c99a64');return [.52,.3];},
  cook:function(c){rmFridge(c,.06);rmCounter(c,.5,.09,c.W*.3,.055,RM_WHITE,'#dfe6ea');rmSink(c,.3,.1);rmStove(c,.56,.1);rmShelf(c,'L',.86,.12,.34,['#c4503a','#f2c14e','#f4efe6','#5aa85c']);
    rmWall(c,'L',.34,.66,.3,.4,'#f6ecdc','#c4503a');rmWall(c,'L',.4,.6,.34,.36,'#c4503a');
    [[.26,.56],[.72,.56],[.26,.9],[.72,.9]].forEach(function(p,i){rmCounter(c,p[0],p[1],.13,.065,'#f0d9a8','#fffaf0',.15);rmItem(c,p[0]-.06/c.W,p[1],.03,.17,.035,'#3d3d46','#c4503a');rmItem(c,p[0]+.05/c.W,p[1],.028,.17,.02,'#ffffff',['#5aa85c','#e8762c','#f2c98a','#c4503a'][i]);rmSit(c,p[0],p[1]+.15/c.D);});
    return [.5,.3];},
  guitar:function(c){rmWall(c,'L',.1,.4,.2,.38,'#f6efe0','#5e4630');[.14,.22,.3].forEach(function(u){rmWall(c,'L',u,u+.05,.24,.3,'#c9853a');rmWall(c,'L',u+.018,u+.032,.3,.37,'#5e3a1c');});
    rmWall(c,'L',.56,.9,.22,.36,'#f4f6f7','#8a6844');[.25,.28,.31].forEach(function(z){rmWall(c,'L',.6,.86,z,z+.004,'#22252b');});rmWall(c,'L',.66,.69,.25,.28,'#22252b');rmWall(c,'L',.76,.79,.28,.31,'#22252b');
    rmRug(c,.5,.66,c.W*.36,c.D*.26,'#c9853a','#f2d9a0');[[.22,.56],[.5,.5],[.78,.56],[.34,.84],[.66,.84]].forEach(function(p,i){rmStool(c,p[0],p[1]);rmGuitar(c,p[0]+.08/c.W,p[1]-.02,['#c9853a','#e8b93a','#8a5a2b','#c4503a','#f2d9a0'][i]);rmSit(c,p[0],p[1]+.04);});
    rmStand(c,.5,.72);rmAmp(c,.94,.12);rmPlant(c,.05,.12);return [.5,.26];},
  band:function(c){rmWall(c,'L',.08,.92,.14,.4,'#59626b');[.14,.3,.46,.62,.78].forEach(function(u,i){rmWall(c,'L',u,u+.1,.2+.04*(i%2),.34,i%2?'#c4503a':'#3d4650');});
    chDrums(c.P,chRM(c.X(.34),c.Y(.04),c.X(.66),c.Y(.36)),c.fz,.34);rmAmp(c,.12,.12);rmAmp(c,.88,.12);
    rmB(c,c.X(.84),c.Y(.56),.04,.12,.14,.17,'#22252b',RM_WHITE);rmB(c,c.X(.84),c.Y(.56),.01,.1,0,.14,'#59626b');rmMic(c,.5,.62);rmGuitar(c,.16,.4,'#c4503a');rmGuitar(c,.26,.3,'#3f6fe0');
    rmRug(c,.5,.7,c.W*.3,c.D*.2,'#c4503a','#8a2f2a');rmSit(c,.5,.72);rmSit(c,.22,.62);rmSit(c,.74,.62);rmSit(c,.5,.26);rmSit(c,.36,.9);return [.7,.86];},
  choir:function(c){rmWall(c,'L',.3,.7,.24,.4,'#3f5ea3','#d9a94a');rmCross(c,.5,.2);
    [0,1,2].forEach(function(i){var v=.14+i*.16,z=.12-i*.05;rmB(c,c.X(.56),c.Y(v),c.W*.3,c.D*.08,0,z+.02,CH_WOOD,'#b07a45',-4+i);[.3,.43,.56,.69,.82].forEach(function(u,j){if((i+j)%2===0||c.nu>3)rmSit(c,u,v,z+.02);});});
    chPiano(c.P,chRM(c.X(.0),c.Y(.5),c.X(.2),c.Y(.86)),c.fz,.3);rmStand(c,.56,.76);rmStand(c,.4,.9);rmStand(c,.72,.9);rmPlant(c,.97,.95);return [.56,.86];},
  // ----- 돌봄
  pantry:function(c){rmShelf(c,'L',.36,c.W*.34,.38,['#c4503a','#f2c14e','#5aa85c','#f4efe6','#e8762c','#4a78c7'],'#8a5a2b');rmShelf(c,'R',.6,c.D*.24,.3,['#c9b38a','#f4efe6','#c4503a']);
    rmCrate(c,.86,.16,.06,'#c99a64');rmCrate(c,.86,.16,.05,'#d9b07a',.19);rmCrate(c,.96,.4,.05,'#c99a64');rmCrate(c,.6,.6,.055,'#b98450');rmCrate(c,.72,.72,.05,'#d9b07a');
    rmB(c,c.X(.3),c.Y(.74),.06,.05,0,.1,'#e8dcc6','#f6f1e4');rmB(c,c.X(.42),c.Y(.84),.06,.05,0,.1,'#e8dcc6','#f6f1e4');rmB(c,c.X(.36),c.Y(.78),.05,.045,.1,.18,'#d9cdb8','#f6f1e4',.1);
    rmSit(c,.56,.9);rmSit(c,.8,.92);return [.5,.4];},
  counsel:function(c){rmWall(c,'L',.14,.5,.22,.38,'#d9c9e8','#f4efe6');rmWall(c,'L',.2,.44,.26,.3,'#7b6aa5');rmShelf(c,'L',.8,.11,.3);
    rmRug(c,.5,.64,.24,.2,'#7b6aa5','#c9bfe0');rmSofa(c,.3,.56,.09,'#c9853a');rmSofa(c,.72,.72,.09,'#5f8a8a');rmTable(c,.5,.66,.05,.05,RM_WOOD_L,.09);rmItem(c,.5,.66,.02,.1,.04,'#ffffff','#8fc3e0');
    rmSit(c,.72,.76,.06);rmPlant(c,.06,.95);rmLamp(c,.06,.14);return [.3,.6];},
  kids:function(c){['#e0567f','#f2c14e','#4a78c7','#3d9b7a','#e8762c'].forEach(function(col,i){rmWall(c,'L',.08+i*.18,.2+i*.18,.24+.03*(i%2),.38,col,'#fffaf0');});rmShelf(c,'R',.3,.14,.2,['#e0567f','#f2c14e','#4a78c7','#3d9b7a']);
    rmRug(c,.4,.6,c.W*.3,c.D*.26,'#8fd0d9','#fff3c4');[[.3,.56,'#c4503a'],[.38,.6,'#f2c14e'],[.34,.5,'#3f6fe0'],[.48,.66,'#3d9b7a']].forEach(function(p){rmItem(c,p[0],p[1],.025,0,.05,p[2]);});rmItem(c,.36,.57,.02,.05,.04,'#e8762c');
    rmB(c,c.X(.84),c.Y(.3),.06,.08,0,.2,'#e8762c','#f2a04a');rmB(c,c.X(.84),c.Y(.3)+.14,.05,.06,0,.1,'#f2c14e','#f6d76a');rmB(c,c.X(.84),c.Y(.3)+.24,.05,.04,0,.04,'#f2c14e','#f6d76a');
    [[.76,.8],[.3,.9]].forEach(function(p){rmTable(c,p[0],p[1],.08,.06,'#f6d76a',.08);rmItem(c,p[0],p[1],.03,.09,.008,'#ffffff');rmStool(c,p[0]-.1/c.W,p[1],'#e0567f');rmStool(c,p[0]+.1/c.W,p[1],'#4a78c7');rmSit(c,p[0]+.11/c.W,p[1]+.04);});
    rmSit(c,.5,.56);rmSit(c,.22,.66);rmCrate(c,.06,.95,.045,'#e0567f');return [.6,.28];},
  kinder:function(c){['#f0a030','#e0567f','#4a78c7','#3d9b7a'].forEach(function(col,i){rmWall(c,'L',.08+i*.22,.24+i*.22,.24+.03*(i%2),.38,col,'#fffaf0');});
    rmRug(c,.5,.62,c.W*.34,c.D*.3,'#f6d98a','#fff3c4');rmItem(c,.4,.6,.03,0,.06,'#e0567f');rmItem(c,.5,.66,.03,0,.06,'#4a78c7');rmItem(c,.6,.58,.03,0,.06,'#3d9b7a');
    [.2,.38,.56,.74].forEach(function(u,i){rmStool(c,u,.86,['#e0567f','#f2c14e','#4a78c7','#3d9b7a'][i]);rmSit(c,u,.9);});
    rmB(c,c.X(.86),c.Y(.3),.05,.07,0,.18,'#4a78c7','#6f9bd6');rmShelf(c,'R',.3,.14,.2,['#e0567f','#f2c14e','#4a78c7']);rmPlant(c,.05,.95);return [.5,.3];},
  teens:function(c){rmWall(c,'L',.1,.5,.2,.4,'#2b2f45','#6a5bb5');['#f2c14e','#e0567f','#5ec8e0'].forEach(function(col,i){rmWall(c,'L',.16+i*.1,.2+i*.1,.26,.34,col);});
    rmWall(c,'L',.62,.92,.22,.38,'#f4efe6','#5e4630');rmWall(c,'L',.7,.84,.28,.3,'#6a5bb5');
    rmRug(c,.4,.62,c.W*.34,c.D*.3,'#6a5bb5','#a89be0');rmSofa(c,.3,.52,.16,'#e8762c');rmSofa(c,.7,.52,.12,'#3f8a5a');rmTable(c,.5,.7,.1,.06,'#2b2f45',.08);
    rmGuitar(c,.9,.16,'#c4503a');rmAmp(c,.8,.12);rmMic(c,.12,.2);[[.25,.56],[.7,.56],[.4,.86],[.65,.86]].forEach(function(p){rmSit(c,p[0],p[1]+.04);});rmPlant(c,.05,.95);return [.5,.28];},
  nursery:function(c){rmWall(c,'L',.1,.3,.24,.38,'#fff3c4','#f9d3e2');rmWall(c,'L',.16,.24,.28,.34,'#f2c14e');rmWall(c,'L',.4,.6,.26,.36,'#bfe0f2','#f9d3e2');rmWall(c,'L',.7,.9,.24,.38,'#fff3c4','#f9d3e2');rmWall(c,'L',.76,.84,.28,.34,'#e57a95');
    rmBed(c,.2,.2,'#bfe0f2','#f4efe6');rmBed(c,.56,.2,'#f9d3e2','#f4efe6');rmRug(c,.4,.72,c.W*.26,.14,'#bfe0f2','#fff3c4');rmItem(c,.34,.7,.025,0,.05,'#e57a95');rmItem(c,.44,.76,.022,0,.045,'#f2c14e');rmItem(c,.5,.68,.02,0,.04,'#5aa85c');
    rmChair(c,.86,.6,'#d9709a');rmCrate(c,.94,.92,.05,'#f2c14e');rmSit(c,.86,.64,.04);rmSit(c,.3,.86);rmSit(c,.6,.88);rmLamp(c,.94,.14);return [.84,.26];},
  elder:function(c){rmTV(c,'L',.3,.18,.22);rmWall(c,'L',.6,.9,.2,.38,'#f6f1e4','#5e4630');rmWall(c,'L',.68,.72,.24,.36,'#22252b');rmWall(c,'L',.78,.82,.24,.36,'#22252b');
    rmSofa(c,.3,.5,.18,'#8a6b4a');rmSit(c,.22,.54,.06);rmSit(c,.38,.54,.06);rmTable(c,.3,.7,.1,.05,RM_WOOD_L,.08);rmItem(c,.26,.7,.016,.09,.03,'#ffffff','#5aa85c');rmItem(c,.36,.7,.016,.09,.03,'#ffffff','#5aa85c');
    rmTable(c,.76,.66,.08,.08,'#d9b98a',.09);rmItem(c,.76,.66,.065,.1,.008,'#e8c98f');rmItem(c,.74,.64,.01,.11,.01,'#22252b');rmItem(c,.78,.68,.01,.11,.01,'#f4efe6');rmItem(c,.78,.63,.01,.11,.01,'#22252b');
    rmCushion(c,.76,.44,'#c4503a');rmCushion(c,.76,.9,'#3f5ea3');rmSit(c,.76,.92);rmSit(c,.92,.66);rmPlant(c,.05,.12);rmPlant(c,.95,.12);rmLamp(c,.05,.95);return [.56,.3];},
  clinic:function(c){rmWall(c,'L',.1,.3,.22,.38,'#ffffff','#4f9a83');rmWall(c,'L',.18,.22,.25,.35,'#d6453a');rmWall(c,'L',.14,.26,.285,.315,'#d6453a');rmShelf(c,'L',.76,.14,.36,['#ffffff','#8fc3e0','#f4efe6','#4f9a83'],'#dfe9ec');
    rmBed(c,.24,.34,'#bfe0f2');rmB(c,c.X(.46),c.Y(.34),.008,.11,0,.3,'#8fd0c0','#bfe9de');rmTable(c,.74,.6,.12,.07,RM_WHITE,.13);rmItem(c,.68,.6,.035,.14,.07,'#3d3d46','#8fc3e0');rmItem(c,.82,.6,.02,.14,.03,'#d6453a');
    rmChair(c,.74,.8,'#4f9a83');rmStool(c,.5,.66,'#8a9299');rmSit(c,.5,.7);rmSit(c,.24,.8);rmPlant(c,.96,.95);return [.9,.44];},
  study:function(c){rmWall(c,'L',.2,.7,.2,.38,'#f4f6f7','#8a6844');rmWall(c,'L',.26,.5,.32,.33,'#3f6fe0');rmWall(c,'L',.26,.6,.28,.29,'#22252b');rmWall(c,'L',.26,.44,.24,.25,'#c4503a');rmShelf(c,'R',.5,c.D*.26,.32);rmShelf(c,'L',.88,.1,.3);
    [[.3,.44],[.62,.44],[.9,.5],[.3,.72],[.62,.72],[.46,.94],[.8,.9]].forEach(function(p,i){rmTable(c,p[0],p[1],.08,.05,'#e8c98f',.11);rmItem(c,p[0]-.02,p[1],.028,.12,.012,RM_BOOKS[i%8]);rmItem(c,p[0]+.05,p[1],.01,.12,.04,'#f2c14e');rmStool(c,p[0],p[1]+.1/c.D,'#c08a2e');rmSit(c,p[0],p[1]+.12/c.D);});
    return [.5,.2];},
  foodbank:function(c){rmWall(c,'L',.3,.7,.26,.38,'#f6ecdc','#9a5b2b');rmWall(c,'L',.36,.64,.3,.33,'#c4503a');
    rmCounter(c,.42,.14,c.W*.36,.06,RM_STEEL,'#dfe6ea');[.14,.3,.46,.62].forEach(function(u,i){rmItem(c,u,.14,.04,.19,.07,'#8a9299',['#f2c98a','#c4503a','#f6f1e4','#5aa85c'][i]);});rmItem(c,.74,.14,.03,.19,.06,'#ffffff');
    rmFridge(c,.94);rmCrate(c,.04,.36,.055,'#c99a64');rmCrate(c,.04,.36,.045,'#d9b07a',.18);
    rmDine(c,.3,.56,c.W*.22,.075,'#d9b98a',3);rmDine(c,.3,.88,c.W*.22,.075,'#d9b98a',3);rmDine(c,.8,.56,c.W*.14,.075,'#d9b98a',2);rmDine(c,.8,.88,c.W*.14,.075,'#d9b98a',2);return [.42,.3];},
  // ----- 편의
  wc:function(c){rmStall(c,.24,'#8fb8c9');rmStall(c,.62,'#f2a9bd');rmSink(c,.9,.6);rmWall(c,'R',.5,.8,.22,.36,'#bfe0f2','#f4efe6');rmSit(c,.5,.86);rmPlant(c,.94,.94);return null;},
  wc2:function(c){[.14,.36,.58].forEach(function(u,i){rmStall(c,u,i<2?'#8fb8c9':'#f2a9bd');});rmSink(c,.82,.14);rmSink(c,.96,.14);rmWall(c,'L',.76,.99,.24,.36,'#bfe0f2','#f4efe6');rmSit(c,.4,.88);rmSit(c,.8,.7);rmPlant(c,.04,.95);return null;},
  info:function(c){rmWall(c,'L',.1,.56,.2,.38,'#f6efe0','#3f5ea3');rmWall(c,'L',.16,.3,.26,.34,'#86b86f');rmWall(c,'L',.34,.5,.24,.3,'#bfe0f2');rmWall(c,'L',.22,.24,.29,.31,'#d6453a');
    rmShelf(c,'L',.82,.1,.26,['#e0567f','#f2c14e','#4a78c7','#f4efe6']);rmCounter(c,.42,.5,c.W*.3,.055,'#3f5ea3','#f4efe6');rmItem(c,.3,.5,.03,.19,.03,'#f4efe6','#e0567f');rmItem(c,.5,.5,.016,.19,.06,'#f2c230');
    rmPlant(c,.94,.6);rmSit(c,.36,.88);rmSit(c,.66,.9);return [.42,.3];},
  nurse:function(c){rmWall(c,'L',.1,.5,.14,.4,'#f9d3e2');[.15,.25,.35,.45].forEach(function(u){rmWall(c,'L',u,u+.02,.14,.4,'#f2b6cc');});
    rmBed(c,.78,.2,'#fff3c4','#f4efe6');rmSofa(c,.3,.5,.1,'#c77d8f');rmSit(c,.3,.54,.06);rmTable(c,.62,.62,.05,.05,RM_WHITE,.1);rmItem(c,.62,.62,.016,.11,.05,'#ffffff','#8fc3e0');
    rmRug(c,.5,.8,.2,.1,'#f9d3e2','#fff3c4');rmPlant(c,.94,.94);rmLamp(c,.06,.14);return null;},
  lounge:function(c){rmWall(c,'L',.36,.62,.22,.38,'#bfe0f2','#f4efe6');rmWall(c,'L',.36,.62,.22,.27,'#86b86f');rmB(c,c.X(.9),c.by+.06,.07,.06,0,.36,'#c4503a','#3d4650');rmB(c,c.X(.9),c.by+.122,.05,.003,.14,.32,'#bfe0f2','#bfe0f2',.05);
    rmShelf(c,'L',.12,.09,.24,['#e0567f','#f4efe6','#4a78c7']);rmRug(c,.44,.66,c.W*.3,.16,'#5c8a5a','#bfe0c0');rmSofa(c,.3,.52,.15,'#5c8a5a');rmSofa(c,.68,.52,.12,'#c9853a');
    rmTable(c,.46,.74,.11,.05,RM_WOOD_L,.08);rmItem(c,.4,.74,.025,.09,.01,'#e0567f');rmItem(c,.52,.74,.015,.09,.03,'#ffffff');rmSit(c,.26,.56,.06);rmSit(c,.68,.56,.06);rmSit(c,.36,.56,.06);rmPlant(c,.04,.95);rmPlant(c,.97,.9);return [.86,.6];},
  // ----- 주차 타워: 주차 칸과 자동차
  parktower:function(c){var cols=['#c4503a','#3f6fe0','#f4efe6','#f2c14e','#3d9b7a','#59626b'],i;
    for(i=0;i<5;i++)rmB(c,c.X(i/4),c.Y(.22),.004,c.D*.2,.008,.01,'#f4efe6','#f4efe6',-8);for(i=0;i<5;i++)rmB(c,c.X(i/4),c.Y(.82),.004,c.D*.18,.008,.01,'#f4efe6','#f4efe6',-8);
    [.125,.375,.875].forEach(function(u,i){rmCar(c,u,.22,cols[i]);});[.125,.625,.875].forEach(function(u,i){rmCar(c,u,.82,cols[i+3]);});
    rmWall(c,'L',.36,.64,.3,.42,'#3f6fe0','#f4efe6');rmWall(c,'L',.46,.5,.32,.4,'#f4efe6');rmWall(c,'L',.46,.56,.37,.4,'#f4efe6');rmWall(c,'L',.53,.56,.345,.4,'#f4efe6');return null;}
};
ROOMS.mission=function(c){   // 선교관: 세계 지도와 깃발, 둥근 탁자
  rmWall(c,'L',.16,.62,.2,.4,'#bfe0f2','#8a6844');[[.2,.3,.3,.37],[.3,.38,.24,.3],[.4,.52,.28,.37],[.5,.58,.23,.27]].forEach(function(p){rmWall(c,'L',p[0],p[1],p[2],p[3],'#86b86f');});
  [.28,.44,.54].forEach(function(u){rmWall(c,'L',u,u+.012,.31,.33,'#d6453a');});rmCross(c,.8,.2);
  ['#c4503a','#3f6fe0','#f2c14e','#3d9b7a'].forEach(function(col,i){var u=.7+i*.085;rmB(c,c.X(u),c.by+.05,.006,.006,0,.3,'#8a7a5a');rmB(c,c.X(u)+.03,c.by+.05,.03,.004,.22,.3,col,col,.02);});
  rmShelf(c,'R',.5,c.D*.22,.32);rmRug(c,.5,.66,c.W*.34,c.D*.24,'#2f6b5e','#a8d0c0');
  rmTable(c,.5,.66,c.W*.2,.1,RM_WOOD_L,.12);rmItem(c,.5,.66,.04,.13,.07,'#3f6fe0','#86b86f');rmItem(c,.38,.66,.03,.13,.012,'#f6f1e4');rmItem(c,.62,.64,.03,.13,.012,'#f6f1e4');
  [.3,.5,.7].forEach(function(u){rmStool(c,u,.66-.19/c.D);rmStool(c,u,.66+.19/c.D);rmSit(c,u,.66+.21/c.D);});rmSit(c,.12,.66);rmSit(c,.9,.66);
  rmCrate(c,.95,.94,.05,'#c99a64');rmPlant(c,.04,.95);return [.84,.36];
};
