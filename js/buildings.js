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
mk('mroom','예배실 칸','worship',1,1,400,3,'mroom','#efe8da','#4f6db0',{rname:'예배실',per:{seats:10,cap:4,up:3},fk:'word',seats:10,fill:{word:43},cap:4,dur:5,desc:'같은 칸끼리 이어 붙이면 하나의 예배실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 5층)'});
mk('bible','성경공부방','worship',2,1,600,6,'bld','#ece5d6','#5a74b8',{H:.8,roof:'hip',rh:.45,seats:10,fill:{word:36,fel:10},cap:6,dur:5,desc:'말씀을 함께 읽고 나누는 방'});
mk('praise','찬양실','worship',2,2,1500,16,'bld','#efe6f2','#7a5bb5',{H:1.0,roof:'gable',rh:.55,deco:'crossRidge',stained:1,seats:30,fill:{word:44,comf:8},cap:12,dur:5,desc:'찬양과 기도로 채워지는 공간'});
mk('dawn','새벽기도실','worship',1,2,900,8,'bld','#e6e9f0','#3c4f7d',{H:.9,roof:'hip',rh:.6,deco:'crossApex',seats:14,fill:{word:40,care:8},cap:6,dur:5,desc:'이른 아침 기도의 자리'});
mk('cafe','카페','fellow',2,1,700,10,'bld','#eadfce','#7d5440',{H:.8,roof:'flat',deco:'awning',fcap:8,ccap:4,fill:{fel:38,comf:16},cap:6,dur:4,income:3,desc:'커피 한 잔의 교제. 이용마다 소액 수입'});
mk('cell','소그룹실','fellow',2,2,1300,14,'bld','#e9e2d2','#5f8a5a',{H:.95,roof:'gable',rh:.5,fcap:16,fill:{fel:46,word:16},cap:10,dur:6,desc:'속 깊은 나눔이 이뤄지는 방'});
mk('hall','친교실','fellow',3,2,2600,28,'bld','#eadfcd','#a0603f',{H:1.0,roof:'flat',bigwin:1,fcap:34,ccap:6,fill:{fel:62,comf:10},cap:24,dur:6,desc:'식사와 모임을 위한 넓은 공간'});
mk('books','북카페','fellow',2,2,1400,14,'bld','#f1e7d6','#6b8f71',{H:.95,roof:'flat',bigwin:1,deco:'awning',fcap:14,ccap:4,fill:{fel:40,word:12},cap:10,dur:5,income:2,desc:'책과 커피가 있는 쉼과 교제. 이용마다 소액 수입'});
mk('dining','식당','fellow',3,2,2200,22,'bld','#f2e3cf','#b5654a',{H:1.0,roof:'gable',rh:.5,bigwin:1,fcap:28,ccap:4,fill:{fel:54,comf:14},cap:20,dur:6,income:4,desc:'함께 밥을 먹는 식탁 교제. 이용마다 소액 수입'});
mk('youth','청년부실','fellow',2,2,1500,14,'bld','#e3eef2','#2f8f9d',{H:.95,roof:'flat',deco:'dots',fcap:18,fill:{fel:48,word:12},cap:12,dur:5,desc:'청년들이 모이고 어울리는 방'});
mk('mfel','교제실 칸','fellow',1,1,380,3,'mroom','#eadfce','#a0603f',{rname:'교제실',per:{fcap:6,cap:4,up:3},fk:'fel',fcap:6,fill:{fel:43},cap:4,dur:5,desc:'같은 칸끼리 이어 붙이면 하나의 교제실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 5층)'});
mk('pantry','구제창고','care',2,1,850,12,'bld','#c99a64','#8a5a2b',{H:.85,roof:'gable',rh:.5,deco:'barn',kcap:8,fill:{care:56},cap:4,dur:4,rep:0.5,desc:'이웃을 돕는 나눔. 평판이 천천히 오릅니다'});
mk('counsel','상담실','care',1,1,650,8,'bld','#ece5d6','#7b6aa5',{H:.85,roof:'hip',rh:.5,kcap:4,fill:{care:44,word:10},cap:2,dur:6,rep:0.2,desc:'마음을 들어주는 작은 방'});
mk('kids','어린이부실','care',2,2,1600,18,'bld','#f6e3b0','#e08a2c',{H:.95,roof:'gable',rh:.55,deco:'dots',kcap:16,ccap:4,fill:{care:20,comf:34,fel:14},cap:10,dur:6,desc:'아이들을 맡기고 마음 놓는 공간'});
mk('nursery','유아방','care',2,1,900,10,'bld','#fbe7ef','#d9709a',{H:.8,roof:'gable',rh:.45,deco:'dots',kcap:8,ccap:2,fill:{care:30,comf:28},cap:6,dur:5,desc:'영아·유아를 돌보는 아늑한 방'});
mk('elder','경로 쉼터','care',2,2,1500,14,'bld','#efe7d8','#8a6b4a',{H:.9,roof:'hip',rh:.55,kcap:12,fill:{care:46,fel:12},cap:8,dur:6,rep:0.3,desc:'어르신들이 쉬고 이야기 나누는 곳. 평판이 천천히 오릅니다'});
mk('clinic','의료 봉사실','care',2,1,1300,14,'bld','#f4f6f7','#4f9a83',{H:.85,roof:'flat',deco:'clinic',kcap:6,fill:{care:58},cap:4,dur:6,rep:0.6,desc:'이웃을 위한 무료 진료 봉사. 평판이 오릅니다'});
mk('mcare','돌봄실 칸','care',1,1,420,3,'mroom','#f3e6d2','#8a5a2b',{rname:'돌봄실',per:{kcap:5,cap:3,up:3},fk:'care',kcap:5,fill:{care:43},cap:3,dur:5,desc:'같은 칸끼리 이어 붙이면 하나의 돌봄실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 5층)'});
mk('wc','화장실','comfort',1,1,360,4,'bld','#dfe6ea','#6c8794',{H:.7,roof:'flat',deco:'wc',ccap:12,fill:{comf:60},cap:3,dur:3,desc:'꼭 필요한 편의시설'});
mk('lot','주차장','comfort',3,2,1100,6,'lot','#5b646d','#5b646d',{park:12,desc:'주차 12대. 방문자 유입과 성도 만족에 영향'});
mk('lots','소형 주차장','comfort',2,1,520,3,'lot','#5b646d','#5b646d',{park:4,desc:'주차 4대'});
mk('info','안내실','comfort',1,1,500,5,'bld','#e8eef2','#3f5ea3',{H:.75,roof:'flat',deco:'info',ccap:6,fill:{comf:30,fel:10},cap:3,dur:3,vis:0.03,desc:'처음 온 사람을 맞이하는 안내 창구. 방문자 +3%'});
mk('nurse','수유실','comfort',1,1,600,5,'bld','#f6eef0','#c77d8f',{H:.75,roof:'hip',rh:.45,ccap:4,kcap:2,fill:{comf:44,care:16},cap:2,dur:4,desc:'아기와 부모를 위한 조용한 방'});
mk('lounge','휴게실','comfort',2,1,800,7,'bld','#e9efe6','#5c8a5a',{H:.8,roof:'flat',bigwin:1,ccap:10,fill:{comf:50,fel:8},cap:6,dur:4,desc:'잠시 앉아 쉬어가는 실내 공간'});
mk('mcomf','편의실 칸','comfort',1,1,360,2,'mroom','#dfe6ea','#6c8794',{rname:'편의실',per:{ccap:6,cap:4,up:2},fk:'comf',ccap:6,fill:{comf:43},cap:4,dur:4,desc:'같은 칸끼리 이어 붙이면 하나의 편의실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 5층)'});
mk('tree','나무','garden',1,1,110,0,'tree','#3d7a3d','#3d7a3d',{beauty:1,desc:'부지 분위기가 좋아집니다'});
mk('flower','화단','garden',1,1,70,0,'flower','#6b4f3a','#d9567a',{beauty:1,desc:'꽃이 피는 작은 화단'});
mk('bench','벤치','garden',1,1,160,0,'bench','#8a6a46','#8a6a46',{ccap:2,beauty:0.4,fill:{comf:22,fel:10},cap:2,dur:4,desc:'잠깐 앉아 쉬어가는 자리'});
mk('spire','십자가 첨탑','garden',1,1,700,2,'spire','#efe8da','#3f5ea3',{beauty:2,vis:0.08,rep:0.2,desc:'멀리서도 보이는 표지. 방문자 +8%'});
mk('fountain','분수','garden',1,1,600,2,'fountain','#c9c2b6','#7fb7d9',{beauty:2,desc:'물소리가 들리는 작은 분수'});
mk('lamp','가로등','garden',1,1,120,1,'lamp','#3d4650','#f5e6a8',{beauty:0.5,desc:'저녁에도 길을 밝혀요'});
mk('hedge','생울타리','garden',1,1,90,0,'hedge','#3f7d3c','#5a9a4f',{beauty:0.6,desc:'잘 다듬은 낮은 나무 울타리'});
mk('rosearch','꽃 아치','garden',1,1,260,0,'arch','#f1ece2','#d9567a',{beauty:1.2,desc:'장미가 감긴 정원 아치'});
mk('path','길·계단','path',1,1,40,0,'path','#d6c6a6','#9c8664',{desc:'방향과 경사를 골라 길·계단·다리를 한 칸씩 이어 짓습니다'});
mk('f_block','보도블록','floor',1,1,15,0,'floor','#c9c2b6','#a59d90',{pat:'grid',beauty:0.04,desc:'단정한 회색 보도블록'});
mk('f_brick','벽돌 바닥','floor',1,1,20,0,'floor','#b9694c','#8c4a33',{pat:'brick',beauty:0.05,desc:'따뜻한 붉은 벽돌'});
mk('f_gravel','자갈','floor',1,1,10,0,'floor','#c3b8a5','#8f8573',{pat:'dots',beauty:0.03,desc:'밟으면 소리 나는 자갈길'});
mk('f_wood','나무 바닥','floor',1,1,25,0,'floor','#b88a58','#7d5732',{pat:'plank',beauty:0.05,desc:'결이 보이는 나무 바닥'});
mk('f_clover','꽃잔디','floor',1,1,20,0,'floor','#76a85a','#e57aa5',{pat:'flower',beauty:0.1,desc:'분홍 꽃이 핀 낮은 잔디'});
mk('f_erase','바닥 지우기','floor',1,1,0,0,'floor','#7fae63','#5c8a48',{pat:'erase',desc:'칠한 바닥을 걷어내고 잔디로 되돌립니다. 비용의 절반이 돌아옵니다'});
var D={}; DEFS.forEach(function(d){D[d.id]=d;});
function heightOf(id){
  var d=D[id];
  if(d.kind==='bld')return Math.max(d.H+(d.rh||0.05),d.towerH?d.towerH+0.75:0);
  return {lot:.12,tree:1.4,flower:.25,bench:.45,spire:2.7,fountain:.9,lamp:1.7,hedge:.55,arch:1.45,floor:.02}[d.kind]||1;
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
