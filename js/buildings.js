'use strict';
/* ---------- 건물 정의 ---------- */
var DEFS=[];
function mk(id,name,cat,w,h,cost,up,kind,wall,roofc,o){
  var d={id:id,name:name,cat:cat,w:w,h:h,cost:cost,up:up,kind:kind,wall:wall,roofc:roofc,H:1,roof:'flat',rh:0,deco:'',towerH:0,
    seats:0,fcap:0,ccap:0,kcap:0,park:0,beauty:0,vis:0,rep:0,cap:0,dur:5,income:0,fill:null,desc:''};
  for(var k in o) d[k]=o[k];
  DEFS.push(d); return d;
}
mk('room','작은 예배실','worship',2,2,900,8,'bld','#efe8da','#4f6db0',{H:.95,roof:'gable',rh:.55,deco:'crossRidge',seats:24,fill:{word:48},cap:10,dur:5,desc:'작고 따뜻한 첫 예배 공간'});
mk('chapel','예배당','worship',3,2,2800,24,'bld','#efe8da','#3f5ea3',{H:1.15,roof:'gable',rh:.7,deco:'tower',towerH:2.2,stained:1,seats:70,fill:{word:60,fel:8},cap:28,dur:6,desc:'종탑이 있는 주일예배 공간'});
mk('grand','대예배당','worship',4,3,7600,60,'bld','#f2ece0','#34508f',{H:1.5,roof:'gable',rh:.95,deco:'tower',towerH:3.0,stained:1,seats:190,fill:{word:70,fel:10},cap:70,dur:7,desc:'수백 명이 모이는 큰 예배당'});
mk('pray','기도실','worship',1,1,420,3,'bld','#ece5d6','#6a7fb0',{H:.8,roof:'hip',rh:.55,deco:'crossApex',seats:4,fill:{word:28,comf:12},cap:2,dur:4,desc:'조용히 머무는 작은 기도 공간'});
mk('mroom','예배실 칸','worship',1,1,400,3,'mroom','#efe8da','#4f6db0',{seats:10,fill:{word:43},cap:4,dur:5,desc:'칸을 이어 붙이면 하나의 예배실이 되고, 지은 칸을 다시 누르면 2층이 올라갑니다'});
mk('cafe','카페','fellow',2,1,700,10,'bld','#eadfce','#7d5440',{H:.8,roof:'flat',deco:'awning',fcap:8,ccap:4,fill:{fel:38,comf:16},cap:6,dur:4,income:3,desc:'커피 한 잔의 교제. 이용마다 소액 수입'});
mk('cell','소그룹실','fellow',2,2,1300,14,'bld','#e9e2d2','#5f8a5a',{H:.95,roof:'gable',rh:.5,fcap:16,fill:{fel:46,word:16},cap:10,dur:6,desc:'속 깊은 나눔이 이뤄지는 방'});
mk('hall','친교실','fellow',3,2,2600,28,'bld','#eadfcd','#a0603f',{H:1.0,roof:'flat',bigwin:1,fcap:34,ccap:6,fill:{fel:62,comf:10},cap:24,dur:6,desc:'식사와 모임을 위한 넓은 공간'});
mk('pantry','구제창고','care',2,1,850,12,'bld','#c99a64','#8a5a2b',{H:.85,roof:'gable',rh:.5,deco:'barn',kcap:8,fill:{care:56},cap:4,dur:4,rep:0.5,desc:'이웃을 돕는 나눔. 평판이 천천히 오릅니다'});
mk('counsel','상담실','care',1,1,650,8,'bld','#ece5d6','#7b6aa5',{H:.85,roof:'hip',rh:.5,kcap:4,fill:{care:44,word:10},cap:2,dur:6,rep:0.2,desc:'마음을 들어주는 작은 방'});
mk('kids','어린이부실','care',2,2,1600,18,'bld','#f6e3b0','#e08a2c',{H:.95,roof:'gable',rh:.55,deco:'dots',kcap:16,ccap:4,fill:{care:20,comf:34,fel:14},cap:10,dur:6,desc:'아이들을 맡기고 마음 놓는 공간'});
mk('wc','화장실','comfort',1,1,360,4,'bld','#dfe6ea','#6c8794',{H:.7,roof:'flat',deco:'wc',ccap:12,fill:{comf:60},cap:3,dur:3,desc:'꼭 필요한 편의시설'});
mk('lot','주차장','comfort',3,2,1100,6,'lot','#5b646d','#5b646d',{park:12,desc:'주차 12대. 방문자 유입과 성도 만족에 영향'});
mk('lots','소형 주차장','comfort',2,1,520,3,'lot','#5b646d','#5b646d',{park:4,desc:'주차 4대'});
mk('tree','나무','garden',1,1,110,0,'tree','#3d7a3d','#3d7a3d',{beauty:1,desc:'부지 분위기가 좋아집니다'});
mk('flower','화단','garden',1,1,70,0,'flower','#6b4f3a','#d9567a',{beauty:1,desc:'꽃이 피는 작은 화단'});
mk('bench','벤치','garden',1,1,160,0,'bench','#8a6a46','#8a6a46',{ccap:2,beauty:0.4,fill:{comf:22,fel:10},cap:2,dur:4,desc:'잠깐 앉아 쉬어가는 자리'});
mk('spire','십자가 첨탑','garden',1,1,700,2,'spire','#efe8da','#3f5ea3',{beauty:2,vis:0.08,rep:0.2,desc:'멀리서도 보이는 표지. 방문자 +8%'});
mk('path','길·계단','path',1,1,40,0,'path','#d6c6a6','#9c8664',{desc:'방향과 경사를 골라 길·계단·다리를 한 칸씩 이어 짓습니다'});
var D={}; DEFS.forEach(function(d){D[d.id]=d;});
function heightOf(id){
  var d=D[id];
  if(d.kind==='bld')return Math.max(d.H+(d.rh||0.05),d.towerH?d.towerH+0.75:0);
  return {lot:.12,tree:1.4,flower:.25,bench:.45,spire:2.7}[d.kind]||1;
}

var STAFF={
  evang:{name:'전도팀',desc:'방문자 +25%, 정착률 +10% (단계마다)',week:70,costs:[400,900,1600]},
  praise:{name:'찬양팀',desc:'헌금 +15%, 성도 만족 +3 (단계마다)',week:50,costs:[350,800,1500]},
  care:{name:'돌봄팀',desc:'돌봄 효과 +15%, 성도 만족 +2 (단계마다)',week:60,costs:[380,850,1500]}
};
var GOALS=[
  {n:'작은 예배 공동체',d:'성도 15명',t:function(s){return s.members>=15;},p:function(s){return s.members/15;},r:500},
  {n:'뿌리내리는 교회',d:'성도 35명 · 평판 45',t:function(s){return s.members>=35&&s.rep>=45;},p:function(s){return Math.min(s.members/35,s.rep/45);},r:900},
  {n:'스스로 서는 교회',d:'성도 70명 · 주간 흑자',t:function(s){return s.members>=70&&lastNet(s)>0;},p:function(s){return Math.min(s.members/70,lastNet(s)>0?1:0.9);},r:1200},
  {n:'동네의 이웃',d:'성도 120명 · 평판 65',t:function(s){return s.members>=120&&s.rep>=65;},p:function(s){return Math.min(s.members/120,s.rep/65);},r:1500},
  {n:'지역을 섬기는 교회',d:'성도 200명 · 평판 80',t:function(s){return s.members>=200&&s.rep>=80;},p:function(s){return Math.min(s.members/200,s.rep/80);},r:0}
];
function lastNet(s){var h=s.hist[s.hist.length-1];return h?h.inc-h.exp:0;}
