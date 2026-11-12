'use strict';
/* ---------- 건물 정의 ---------- */
var DEFS=[];
function mk(id,name,cat,w,h,cost,up,kind,wall,roofc,o){
  var d={id:id,name:name,cat:cat,w:w,h:h,cost:cost,up:up,kind:kind,wall:wall,roofc:roofc,H:1,roof:'flat',rh:0,deco:'',towerH:0,
    seats:0,fcap:0,ccap:0,kcap:0,park:0,beauty:0,vis:0,rep:0,cap:0,dur:5,income:0,fill:null,desc:''};
  for(var k in o) d[k]=o[k];
  // 예전 한 칸 = G×G 칸: 그림 크기는 그대로 두고 차지하는 칸만 늘린다. 칸 건물·바닥·지형·길은 한 칸 그대로
  // 꾸미기·조경·편의 소품(건물·주차장·칸 건물이 아닌 한 칸짜리)은 새 칸 하나에 작게 놓는다 (그림도 절반 크기)
  if(['bld','lot','mroom','floor','terrain','path','gate'].indexOf(kind)<0&&w===1&&h===1)d.cell=true;
  if(kind!=='mroom'&&kind!=='floor'&&kind!=='terrain'&&kind!=='path'&&kind!=='gate'&&!d.cell){d.w*=G;d.h*=G;}
  // 한 칸짜리는 칸이 작아진 만큼 값도 줄인다: 바닥은 같은 길이의 길이 같은 값이 되게 절반, 칸 건물은 넓이대로 1/4
  if(kind==='floor'){d.cost=Math.round(d.cost/G);d.beauty=d.beauty/3;}
  if(kind==='mroom'){d.cost=Math.round(d.cost/(G*G));for(var pk in d.per)d.per[pk]=d.per[pk]/(G*G);}
  DEFS.push(d); return d;
}
mk('room','작은 예배실','worship',2,2,900,8,'bld','#efe8da','#4f6db0',{H:.95,roof:'gable',rh:.55,deco:'crossRidge',seats:24,fill:{word:48},cap:10,dur:5,desc:'작고 따뜻한 첫 예배 공간'});
mk('chapel','예배당','worship',3,2,2800,24,'bld','#efe8da','#3f5ea3',{H:1.15,roof:'gable',rh:.7,deco:'tower',towerH:2.2,stained:1,seats:70,fill:{word:60,fel:8},cap:28,dur:6,desc:'종탑이 있는 주일예배 공간'});
mk('grand','대예배당','worship',4,3,7600,60,'bld','#f2ece0','#34508f',{H:1.5,roof:'gable',rh:.95,deco:'tower',towerH:3.0,stained:1,seats:190,fill:{word:70,fel:10},cap:70,dur:7,desc:'수백 명이 모이는 큰 예배당'});
mk('pray','기도실','worship',1,1,420,3,'bld','#ece5d6','#6a7fb0',{H:.8,roof:'hip',rh:.55,deco:'crossApex',seats:4,fill:{word:28,comf:12},cap:2,dur:4,desc:'조용히 머무는 작은 기도 공간'});
mk('mroom','예배실 칸','worship',1,1,400,3,'mroom','#efe8da','#4f6db0',{rname:'예배실',per:{seats:10,cap:4,up:3},fk:'word',seats:10,fill:{word:43},cap:4,dur:5,desc:'같은 칸끼리 이어 붙이면 하나의 예배실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 10층)'});
mk('bible','성경공부방','worship',2,1,600,6,'bld','#ece5d6','#5a74b8',{H:.8,roof:'hip',rh:.45,seats:10,fill:{word:36,fel:10},cap:6,dur:5,desc:'말씀을 함께 읽고 나누는 방'});
mk('praise','찬양실','worship',2,2,1500,16,'bld','#efe6f2','#7a5bb5',{H:1.0,roof:'gable',rh:.55,deco:'crossRidge',stained:1,seats:30,fill:{word:44,comf:8},cap:12,dur:5,desc:'찬양과 기도로 채워지는 공간'});
mk('dawn','새벽기도실','worship',1,2,900,8,'bld','#e6e9f0','#3c4f7d',{H:.9,roof:'hip',rh:.6,deco:'crossApex',seats:14,fill:{word:40,care:8},cap:6,dur:5,desc:'이른 아침 기도의 자리'});
mk('mission','선교관','worship',3,2,3200,30,'bld','#efe9df','#2f6b5e',{H:1.2,roof:'gable',rh:.7,deco:'crossRidge',seats:40,fill:{word:46,care:12},cap:16,dur:6,rep:0.4,desc:'선교사를 보내고 맞이하는 집. 평판이 오릅니다'});
mk('outdoor','야외 예배터','worship',3,3,1800,8,'stage','#d8cbb4','#3f5ea3',{seats:40,fill:{word:40,fel:10},cap:20,dur:5,desc:'하늘 아래 함께 드리는 예배. 비 오는 주에는 쓰지 못해요'});
mk('cafe','카페','shop',2,1,700,10,'bld','#eadfce','#7d5440',{H:.8,roof:'flat',deco:'awning',fcap:8,ccap:4,fill:{fel:38,comf:16},cap:6,dur:4,income:4,desc:'커피 한 잔의 교제. 방문자가 음료를 사 마셔요'});
mk('cell','소그룹실','fellow',2,2,1300,14,'bld','#e9e2d2','#5f8a5a',{H:.95,roof:'gable',rh:.5,fcap:16,fill:{fel:46,word:16},cap:10,dur:6,desc:'속 깊은 나눔이 이뤄지는 방'});
mk('hall','친교실','fellow',3,2,2600,28,'bld','#eadfcd','#a0603f',{H:1.0,roof:'flat',bigwin:1,fcap:34,ccap:6,fill:{fel:62,comf:10},cap:24,dur:6,desc:'식사와 모임을 위한 넓은 공간'});
mk('books','북카페','shop',2,2,1400,14,'bld','#f1e7d6','#6b8f71',{H:.95,roof:'flat',bigwin:1,deco:'awning',fcap:14,ccap:4,fill:{fel:40,word:12},cap:10,dur:5,income:5,desc:'책과 커피가 있는 쉼과 교제. 책과 음료를 팔아요'});
mk('dining','식당','shop',3,2,2200,22,'bld','#f2e3cf','#b5654a',{H:1.0,roof:'gable',rh:.5,bigwin:1,fcap:28,ccap:4,fill:{fel:54,comf:14},cap:20,dur:6,income:8,desc:'함께 밥을 먹는 식탁 교제. 주일 점심이 잘 팔려요'});
mk('bakery','빵집','shop',2,1,800,8,'bld','#f6ead4','#c9853a',{H:.8,roof:'flat',deco:'awning',ccap:6,fcap:2,fill:{comf:34,fel:12},cap:5,dur:3,income:4,desc:'갓 구운 빵 냄새가 나는 작은 빵집'});
mk('bookstore','기독교 서점','shop',2,1,1100,9,'bld','#eef0e6','#4f6db0',{H:.85,roof:'flat',bigwin:1,deco:'awning',ccap:4,fill:{word:20,comf:18},cap:5,dur:4,income:6,desc:'성경과 신앙 서적, 작은 선물을 파는 서점'});
mk('market','나눔장터','shop',3,2,1300,10,'market','#c9b38a','#d65a6e',{fcap:10,ccap:6,fill:{fel:30,comf:22},cap:10,dur:4,income:5,rep:0.2,desc:'중고 물건과 손수 만든 먹거리를 나누는 장터. 수익 일부로 이웃을 도와 평판이 조금 오릅니다'});
mk('youth','청년부실','fellow',2,2,1500,14,'bld','#e3eef2','#2f8f9d',{H:.95,roof:'flat',deco:'dots',fcap:18,fill:{fel:48,word:12},cap:12,dur:5,desc:'청년들이 모이고 어울리는 방'});
mk('gym','체육관','club',4,3,4200,40,'bld','#e6e9ec','#5a6b7c',{sub:'sport',H:1.4,roof:'flat',bigwin:1,fcap:40,ccap:6,fill:{fel:60,comf:10},cap:30,dur:6,desc:'운동과 큰 행사를 함께하는 넓은 공간'});
mk('mfel','교제실 칸','fellow',1,1,380,3,'mroom','#eadfce','#a0603f',{rname:'교제실',per:{fcap:6,cap:4,up:3},fk:'fel',fcap:6,fill:{fel:43},cap:4,dur:5,desc:'같은 칸끼리 이어 붙이면 하나의 교제실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 10층)'});
mk('pantry','구제창고','care',2,1,850,12,'bld','#c99a64','#8a5a2b',{H:.85,roof:'gable',rh:.5,deco:'barn',kcap:8,fill:{care:56},cap:4,dur:4,rep:0.5,desc:'이웃을 돕는 나눔. 평판이 천천히 오릅니다'});
mk('counsel','상담실','care',1,1,650,8,'bld','#ece5d6','#7b6aa5',{H:.85,roof:'hip',rh:.5,kcap:4,fill:{care:44,word:10},cap:2,dur:6,rep:0.2,desc:'마음을 들어주는 작은 방'});
mk('kids','어린이부실','care',2,2,1600,18,'bld','#f6e3b0','#e08a2c',{H:.95,roof:'gable',rh:.55,deco:'dots',kcap:16,ccap:4,fill:{care:20,comf:34,fel:14},cap:10,dur:6,desc:'아이들을 맡기고 마음 놓는 공간'});
mk('nursery','유아방','care',2,1,900,10,'bld','#fbe7ef','#d9709a',{H:.8,roof:'gable',rh:.45,deco:'dots',kcap:8,ccap:2,fill:{care:30,comf:28},cap:6,dur:5,desc:'영아·유아를 돌보는 아늑한 방'});
mk('elder','경로 쉼터','care',2,2,1500,14,'bld','#efe7d8','#8a6b4a',{H:.9,roof:'hip',rh:.55,kcap:12,fill:{care:46,fel:12},cap:8,dur:6,rep:0.3,desc:'어르신들이 쉬고 이야기 나누는 곳. 평판이 천천히 오릅니다'});
mk('clinic','의료 봉사실','care',2,1,1300,14,'bld','#f4f6f7','#4f9a83',{H:.85,roof:'flat',deco:'clinic',kcap:6,fill:{care:58},cap:4,dur:6,rep:0.6,desc:'이웃을 위한 무료 진료 봉사. 평판이 오릅니다'});
mk('study','공부방','care',2,2,1300,12,'bld','#f3eedb','#c08a2e',{H:.9,roof:'gable',rh:.5,deco:'dots',kcap:14,fill:{care:40,word:10},cap:10,dur:6,desc:'방과 후 아이들의 공부를 돕는 방'});
mk('foodbank','무료 급식소','care',3,2,2600,26,'bld','#efe3cf','#9a5b2b',{H:1.0,roof:'gable',rh:.55,deco:'barn',kcap:22,fill:{care:52},cap:14,dur:5,rep:1.0,desc:'이웃에게 따뜻한 한 끼를 나누는 곳. 평판이 크게 오릅니다'});
mk('playground','놀이터','care',2,2,900,4,'playground','#e0c48a','#e8892c',{kcap:6,fcap:6,fill:{care:24,fel:22},cap:8,dur:4,desc:'아이들이 뛰노는 놀이터. 가족 방문자가 좋아해요'});
mk('mcare','돌봄실 칸','care',1,1,420,3,'mroom','#f3e6d2','#8a5a2b',{rname:'돌봄실',per:{kcap:5,cap:3,up:3},fk:'care',kcap:5,fill:{care:43},cap:3,dur:5,desc:'같은 칸끼리 이어 붙이면 하나의 돌봄실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 10층)'});
mk('wc','화장실','comfort',1,1,360,4,'bld','#dfe6ea','#6c8794',{H:.7,roof:'flat',deco:'wc',ccap:12,fill:{comf:60},cap:3,dur:3,desc:'꼭 필요한 편의시설'});
mk('lot','주차장','park',3,2,1100,6,'lot','#5b646d','#5b646d',{park:12,desc:'주차 12대. 방문자 유입과 성도 만족에 영향'});
mk('lots','소형 주차장','park',2,1,520,3,'lot','#5b646d','#5b646d',{park:4,desc:'주차 4대'});
mk('info','안내실','comfort',1,1,500,5,'bld','#e8eef2','#3f5ea3',{H:.75,roof:'flat',deco:'info',ccap:6,fill:{comf:30,fel:10},cap:3,dur:3,vis:0.03,desc:'처음 온 사람을 맞이하는 안내 창구. 방문자 +3%'});
mk('nurse','수유실','comfort',1,1,600,5,'bld','#f6eef0','#c77d8f',{H:.75,roof:'hip',rh:.45,ccap:4,kcap:2,fill:{comf:44,care:16},cap:2,dur:4,desc:'아기와 부모를 위한 조용한 방'});
mk('lounge','휴게실','comfort',2,1,800,7,'bld','#e9efe6','#5c8a5a',{H:.8,roof:'flat',bigwin:1,ccap:10,fill:{comf:50,fel:8},cap:6,dur:4,desc:'잠시 앉아 쉬어가는 실내 공간'});
mk('shop','매점','shop',1,1,450,3,'bld','#f2ede4','#d1a02e',{H:.7,roof:'flat',deco:'awning',ccap:4,fill:{comf:30,fel:6},cap:3,dur:3,income:3,desc:'간식과 음료를 파는 작은 매점'});
mk('parktower','주차 타워','park',2,2,3000,18,'bld','#c9ced3','#59626b',{H:1.6,roof:'flat',deco:'park',park:24,desc:'좁은 땅에 많은 차를 세우는 주차 타워. 층을 올리면 더 늘어나요'});
mk('busstop','버스 정류장','comfort',1,1,300,2,'busstop','#3f5ea3','#d6e2ea',{dir:'face',vis:0.05,desc:'교회 앞 버스 정류장. 방문자 +5%'});
mk('mcomf','편의실 칸','comfort',1,1,360,2,'mroom','#dfe6ea','#6c8794',{rname:'편의실',per:{ccap:6,cap:4,up:2},fk:'comf',ccap:6,fill:{comf:43},cap:4,dur:4,desc:'같은 칸끼리 이어 붙이면 하나의 편의실이 되고, 지은 칸을 다시 누르면 위층이 올라갑니다(최대 10층)'});
mk('tree','나무','garden',1,1,110,0,'tree','#3d7a3d','#3d7a3d',{beauty:1,desc:'부지 분위기가 좋아집니다'});
mk('cherry','벚나무','garden',1,1,180,0,'tree','#3d7a3d','#e9a3bd',{shape:'round',leaf:['#d97f9f','#eaa1bb','#f8cfdc'],beauty:1.4,desc:'봄이면 분홍 꽃이 흐드러지는 나무'});
mk('maple','단풍나무','garden',1,1,170,0,'tree','#3d7a3d','#d65a2c',{shape:'round',leaf:['#b8402a','#d9632f','#f0a04a'],beauty:1.3,desc:'붉게 물든 단풍나무'});
mk('ginkgo','은행나무','garden',1,1,160,0,'tree','#3d7a3d','#e8c43a',{shape:'round',leaf:['#c9a21f','#e3c23c','#f6e27a'],beauty:1.2,desc:'노랗게 물드는 은행나무'});
mk('pine','소나무','garden',1,1,150,0,'tree','#2e6a44','#2e6a44',{shape:'cone',leaf:['#22573a','#2f6f47','#3f8656'],beauty:1.1,desc:'사철 푸른 소나무'});
mk('topiary','둥근 회양목','garden',1,1,90,0,'topiary','#3f7d3c','#5a9a4f',{beauty:0.7,desc:'둥글게 다듬은 작은 나무'});
mk('tulip','튤립 화단','garden',1,1,80,0,'flower','#6b4f3a','#e0453a',{petals:['#e0453a','#f2c14e','#ff8a4a'],beauty:1,desc:'빨강·노랑 튤립이 핀 화단'});
mk('lavender','라벤더 화단','garden',1,1,90,0,'flower','#6b4f3a','#9a7ad6',{petals:['#9a7ad6','#b79be6','#7d5bc0'],beauty:1.1,desc:'보랏빛 라벤더가 핀 화단'});
mk('canal','물길','garden',1,1,140,1,'canal','#9aa3a8','#5fa3d0',{beauty:1.1,desc:'돌로 테두리를 두른 물길. 옆에 이어 지으면 물이 이어져 흘러요'});
mk('birdbath','새 물그릇','garden',1,1,240,0,'birdbath','#c9c2b6','#86bfe0',{beauty:1,desc:'작은 새들이 쉬어 가는 돌 물그릇'});
mk('flower','화단','garden',1,1,70,0,'flower','#6b4f3a','#d9567a',{beauty:1,desc:'꽃이 피는 작은 화단'});
mk('fir','전나무','garden',1,1,150,0,'tree','#2e6a44','#2e6a44',{shape:'cone',leaf:['#1f5236','#2e6a44','#3f8656'],beauty:1.1,desc:'곧게 뻗은 늘푸른 전나무'});
mk('birch','자작나무','garden',1,1,170,0,'tree','#3d7a3d','#7fb35a',{shape:'round',leaf:['#5f9a3c','#7fb35a','#a8d07a'],beauty:1.2,desc:'하얀 줄기가 고운 자작나무'});
mk('conetopiary','원뿔 회양목','garden',1,1,100,0,'topiary','#3f7d3c','#5a9a4f',{beauty:0.8,desc:'원뿔 모양으로 다듬은 회양목'});
mk('azalea','진달래 덤불','garden',1,1,90,0,'flower','#3f7d3c','#e46aa0',{petals:['#e46aa0','#f39cc2','#d14a86'],beauty:1,desc:'분홍 진달래가 소복한 덤불'});
mk('hydrangea','수국 덤불','garden',1,1,100,0,'flower','#3f7d3c','#7f8ee0',{petals:['#7f8ee0','#a59be6','#5d7fd6'],beauty:1.1,desc:'파랑·보라 꽃송이가 탐스러운 수국'});
mk('rose','장미 덤불','garden',1,1,110,0,'flower','#3f7d3c','#d63a46',{petals:['#d63a46','#e8606a','#b82a36'],beauty:1.2,desc:'붉은 장미가 핀 덤불'});
mk('sunflower','해바라기 화단','garden',1,1,90,0,'flower','#6b4f3a','#f2c14e',{petals:['#f2c14e','#e8a830','#f6d76a'],beauty:1.1,desc:'키 큰 해바라기가 모인 화단'});
mk('pampas','억새','garden',1,1,80,0,'flower','#7a8a4a','#e8dcc0',{petals:['#e8dcc0','#d6c6a0','#f2ead6'],beauty:0.9,desc:'바람에 하늘거리는 억새 한 무더기'});
mk('urn','돌 화분','garden',1,1,150,0,'planter','#b8b2a6','#5a9a4f',{beauty:1,desc:'담쟁이가 늘어진 돌 항아리 화분'});
mk('basket','걸이 화분','garden',1,1,120,0,'planter','#3d4650','#e57a95',{beauty:0.8,desc:'쇠기둥에 매단 꽃바구니'});
mk('lilypond','수련 물그릇','garden',1,1,320,0,'birdbath','#c9c2b6','#86bfe0',{beauty:1.6,desc:'수련이 떠 있는 둥근 돌 물그릇'});
mk('bench','벤치','comfort',1,1,160,0,'bench','#8a6a46','#8a6a46',{prop:1,dir:'face',ccap:2,beauty:0.4,fill:{comf:22,fel:10},cap:2,dur:4,desc:'잠깐 앉아 쉬어가는 자리'});
mk('spire','십자가 첨탑','garden',1,1,700,2,'spire','#efe8da','#3f5ea3',{beauty:2,vis:0.08,rep:0.2,desc:'멀리서도 보이는 표지. 방문자 +8%'});
mk('fountain','분수','garden',1,1,600,2,'fountain','#c9c2b6','#7fb7d9',{beauty:2,desc:'물소리가 들리는 작은 분수'});
mk('wfount','물 분수','garden',1,1,250,2,'wfount','#c9c2b6','#7fb7d9',{beauty:1.2,water:true,cell:true,desc:'호수·강 위에 띄우는 분수. 물이 찬 칸에만 놓아요'});
mk('lamp','가로등','deco',1,1,120,1,'lamp','#3d4650','#f5e6a8',{beauty:0.5,desc:'저녁에도 길을 밝혀요'});
mk('hedge','생울타리','deco',1,1,90,0,'hedge','#3f7d3c','#5a9a4f',{beauty:0.6,desc:'잘 다듬은 낮은 나무 울타리'});
mk('rosearch','꽃 아치','garden',1,1,260,0,'arch','#f1ece2','#d9567a',{spr:'pergola',dir:'axis',beauty:1.2,desc:'장미가 감긴 정원 아치'});
mk('pond','연못','garden',2,2,700,2,'pond','#6fa8c9','#3d7a3d',{beauty:3,desc:'물고기가 노니는 작은 연못'});
mk('picnic','피크닉 테이블','comfort',1,1,200,1,'picnic','#a07a52','#c75b4a',{prop:1,dir:'axis',fill:{fel:14,comf:14},cap:4,dur:3,beauty:0.4,desc:'잔디 위에서 함께 먹고 이야기하는 자리'});
mk('statue','십자가 조형물','deco',1,1,900,1,'statue','#e9e4da','#c9a24a',{spr:'cross',beauty:2.5,rep:0.1,desc:'교회를 상징하는 조형물. 평판이 조금 오릅니다'});
mk('planter','화분','garden',1,1,60,0,'planter','#b9694c','#e57a95',{beauty:0.5,desc:'꽃이 핀 큰 화분'});
mk('gazebo','정자','comfort',2,2,900,4,'gazebo','#a07a52','#8a5a2b',{prop:1,fill:{comf:30,fel:12},cap:6,dur:4,beauty:1,desc:'그늘에 앉아 쉬어가는 정자'});
mk('fence_w','흰 울타리','deco',1,1,60,0,'fence','#f4f1ea','#d9d3c6',{style:'picket',beauty:0.4,desc:'하얀 나무 울타리. 화살표로 놓는 방향을 고르세요'});
mk('fence_s','낮은 돌담','deco',1,1,90,0,'fence','#a59d90','#8a8276',{style:'stone',beauty:0.5,desc:'자연석을 쌓은 낮은 돌담'});
mk('fence_i','철제 난간','deco',1,1,80,0,'fence','#2f343a','#2f343a',{style:'iron',beauty:0.4,desc:'검은 철제 난간'});
mk('fence_b','벽돌 담','deco',1,1,100,0,'fence','#b9694c','#d8cfc0',{style:'brick',beauty:0.5,desc:'갓돌을 얹은 낮은 벽돌 담'});
mk('lamp2','쌍등 가로등','deco',1,1,200,1,'lamp2','#3d4650','#f5e6a8',{beauty:0.8,desc:'등이 두 개 달린 가로등'});
mk('bollard','정원등','deco',1,1,70,0,'bollard','#3d4650','#f5e6a8',{beauty:0.3,desc:'길가를 비추는 낮은 정원등'});
mk('stonelamp','석등','deco',1,1,320,0,'stonelamp','#b8b2a6','#f5d98a',{beauty:1.3,desc:'화강암으로 깎은 전통 석등'});
mk('bin','쓰레기통','comfort',1,1,50,0,'bin','#3f7a52','#2f5f40',{prop:1,ccap:1,beauty:0.1,desc:'마당이 깨끗해져요. 편의 수용 +1'});
mk('board','게시판','deco',1,1,150,0,'board','#8a6844','#6b4f3a',{dir:'face',beauty:0.3,vis:0.01,desc:'교회 소식을 붙이는 작은 게시판. 방문자 +1%'});
mk('bell','종','deco',1,1,600,1,'bell','#8a6844','#b8862f',{beauty:1.2,rep:0.1,desc:'나무 틀에 매단 작은 종. 평판이 조금 오릅니다'});
mk('lantern','초롱 등','deco',1,1,140,0,'lamp','#7a5530','#f5e6a8',{beauty:0.7,desc:'나무 기둥에 매단 종이 초롱'});
/* 시트 C 그림으로 그리는 꾸미기. kind 'spr'는 그림이 없을 때 단순한 상자로 그린다.
   dir: 'face' 앞·뒤 그림이 있어 화살표가 바라보는 방향 / 'axis' 앞뒤가 같은 긴 것(화살표가 이어 짓는 방향, 눕는 방향도 따라감) / 없으면 방향 없음
   hgt: 높이(칸), 눌러서 고를 때와 카드·미리보기에 쓴다 */
mk('swing','그네 의자','comfort',1,1,380,1,'spr','#8a6a46','#a07a52',{prop:1,hgt:1.3,dir:'face',ccap:2,fcap:2,fill:{comf:20,fel:14},cap:2,dur:4,beauty:0.8,desc:'지붕 아래 둘이 앉아 이야기하는 그네 의자'});
mk('library','작은 도서함','deco',1,1,260,0,'spr','#8a6844','#6b4f3a',{hgt:1.2,dir:'face',fill:{word:12,comf:8},cap:2,dur:3,beauty:0.5,vis:0.01,desc:'책을 빌려 읽고 나누는 작은 도서함. 방문자 +1%'});
mk('drinkfount','식수대','comfort',1,1,180,0,'spr','#c9c2b6','#9aa3a8',{prop:1,hgt:1.1,dir:'face',ccap:2,fill:{comf:16},cap:2,dur:2,beauty:0.3,desc:'목을 축이는 돌 식수대. 편의 수용 +2'});
mk('grill','바비큐 그릴','deco',1,1,300,1,'spr','#3d4650','#59626b',{hgt:1.4,dir:'face',fcap:3,fill:{fel:26,comf:6},cap:3,dur:4,beauty:0.3,desc:'함께 구워 먹으며 교제하는 그릴'});
mk('lectern','야외 강대상','deco',1,1,350,0,'spr','#8a6844','#c9c2b6',{hgt:1.2,dir:'face',beauty:0.7,rep:0.05,desc:'야외 예배에 쓰는 작은 강대상. 평판이 조금 오릅니다'});
mk('vending','자판기','shop',1,1,420,2,'spr','#3d4650','#59626b',{hgt:1.5,dir:'face',ccap:2,fill:{comf:20},cap:2,dur:3,income:2,desc:'음료 자판기. 방문자가 음료를 사 마셔요'});
mk('coffeecart','커피 카트','shop',1,1,650,3,'spr','#8a6844','#a07a52',{hgt:1.5,dir:'face',ccap:3,fcap:3,fill:{fel:20,comf:14},cap:3,dur:3,income:3,desc:'지붕 달린 작은 커피 카트. 방문자가 커피를 사 마셔요'});
mk('flowercart','꽃 가판대','shop',1,1,600,3,'spr','#8a6844','#d9567a',{hgt:1.5,dir:'face',ccap:3,fill:{comf:24,fel:8},cap:3,dur:3,income:3,beauty:0.5,desc:'꽃을 파는 작은 수레 가판대'});
mk('gate','정원 문','deco',1,1,140,0,'spr','#8a6844','#c9c2b6',{hgt:1.0,dir:'axis',beauty:0.3,desc:'돌기둥 사이의 나무 문. 화살표로 놓는 방향을 고르세요'});
mk('trellis','덩굴 격자','deco',1,1,110,0,'spr','#8a6844','#5a9a4f',{hgt:1.3,dir:'axis',beauty:0.5,desc:'덩굴이 타고 오르는 나무 격자'});
mk('stringlight','줄조명','deco',1,1,160,0,'spr','#8a6844','#f5e6a8',{hgt:1.6,dir:'axis',beauty:0.8,desc:'기둥 사이에 건 따뜻한 전구 줄'});
mk('spotlight','정원 조명','deco',1,1,90,0,'spr','#3d4650','#f5e6a8',{hgt:.5,beauty:0.3,desc:'나무와 꽃을 위로 비추는 작은 조명'});
mk('bridge_a','아치 돌다리','garden',1,1,420,0,'spr','#9aa3a8','#c9c2b6',{hgt:.8,dir:'axis',beauty:1.2,desc:'물길 위에 놓는 둥근 돌다리'});
mk('bridge_w','나무 다리','garden',1,1,240,0,'spr','#a07a52','#8a6844',{hgt:.35,dir:'axis',beauty:0.7,desc:'물길 위에 놓는 납작한 나무 다리'});
mk('bikerack','자전거 거치대','park',1,1,120,0,'bikerack','#9aa3a8','#59626b',{park:1,desc:'자전거 세 대를 세울 수 있어요. 주차 +1 (부지 안에도 둘 수 있어요)'});
mk('parasol','파라솔 테이블','comfort',1,1,240,1,'parasol','#e8e2d4','#d65a4a',{prop:1,fill:{comf:16,fel:12},cap:4,dur:3,beauty:0.5,desc:'햇빛을 가리는 파라솔 아래 쉼 자리'});
/* ---------- 소모임: 운동·취미·음악 (외로움을 풀어 준다) ----------
   운동 시설은 야외 코트(court)라 비·눈 오는 날엔 쉬고, 취미·음악 방은 실내(층 올리기 가능) */
mk('pingpong','탁구대','club',2,1,300,1,'court','#3f7a52','#2a56c6',{sub:'sport',court:'pingpong',surf:'#c9c2b6',dir:'face',fcap:4,fill:{fel:20,comf:6},cap:4,dur:3,desc:'둘이서, 넷이서 땀 흘리며 친해지는 탁구대'});
mk('fitness','야외 운동기구','club',2,1,350,1,'court','#3f6fe0','#59626b',{sub:'sport',court:'fitness',surf:'#d9c9a3',dir:'face',fcap:3,fill:{fel:12,comf:10,care:6},cap:4,dur:3,desc:'철봉·허리 돌리기 같은 운동기구. 어르신과 동네 이웃이 함께 써요'});
mk('badminton','배드민턴장','club',3,2,650,3,'court','#3d9b7a','#f4efe6',{sub:'sport',court:'badminton',surf:'#4f8a6a',dir:'axis',fcap:8,fill:{fel:28,comf:4},cap:6,dur:4,desc:'네트 하나로 금방 어울리는 배드민턴 코트'});
mk('jokgu','족구장','club',3,2,700,3,'court','#c96f3d','#f4efe6',{sub:'sport',court:'jokgu',surf:'#c98f5c',dir:'axis',fcap:10,fill:{fel:30},cap:8,dur:4,desc:'낮은 네트를 사이에 두고 발로 겨루는 족구장. 남선교회의 단골'});
mk('gateball','게이트볼장','club',3,3,800,3,'court','#8fb05a','#f4efe6',{sub:'sport',court:'gateball',surf:'#9cbf6a',fcap:10,kcap:4,fill:{fel:26,care:10},cap:10,dur:5,rep:0.2,desc:'어르신들이 모여 공을 치는 잔디 게이트볼장'});
mk('hoops','농구장','club',3,3,1000,4,'court','#d9823b','#f4efe6',{sub:'sport',court:'hoops',surf:'#b8564a',dir:'face',fcap:12,fill:{fel:32,comf:4},cap:10,dur:4,desc:'골대 하나 있는 하프 코트. 청소년들이 모여들어요'});
mk('futsal','풋살장','club',5,3,1600,6,'court','#3f8656','#f4efe6',{sub:'sport',court:'futsal',surf:'#3f8a4c',dir:'axis',fcap:18,fill:{fel:36},cap:14,dur:5,desc:'작은 골대 두 개가 있는 풋살장. 주일 오후 조기 축구회가 모여요'});
mk('boardgame','보드게임실','club',2,2,800,7,'bld','#efe3cf','#7a5bc7',{sub:'hobby',H:.85,roof:'flat',deco:'sign',sign:'보드',signc:'#7a5bc7',fcap:10,fill:{fel:40},cap:8,dur:5,desc:'둘러앉아 웃음이 터지는 보드게임 모임방'});
mk('calli','서예교실','club',2,2,900,7,'bld','#f2ece0','#3d3d46',{sub:'hobby',H:.9,roof:'hip',rh:.45,deco:'sign',sign:'서예',signc:'#3d3d46',fcap:8,fill:{fel:30,word:8},cap:8,dur:6,desc:'말씀 구절을 붓으로 옮겨 쓰는 서예 모임'});
mk('art','미술교실','club',2,2,900,7,'bld','#f4efe6','#d9567a',{sub:'hobby',H:.9,roof:'flat',bigwin:1,deco:'sign',sign:'미술',signc:'#d9567a',fcap:8,fill:{fel:32,care:6},cap:8,dur:6,desc:'그림을 그리며 마음을 나누는 미술 모임'});
mk('craft','공방','club',2,2,1000,8,'bld','#e8dcc6','#8a5a2b',{sub:'hobby',H:.9,roof:'gable',rh:.45,deco:'sign',sign:'공방',signc:'#8a5a2b',fcap:8,fill:{fel:34,comf:4},cap:8,dur:6,desc:'뜨개질·목공으로 손수 만드는 공방 모임'});
mk('cook','요리교실','club',3,2,1100,10,'bld','#f6ecdc','#d1a02e',{sub:'hobby',H:.9,roof:'flat',deco:'sign',sign:'요리',signc:'#c4503a',fcap:12,fill:{fel:36,comf:8},cap:10,dur:6,desc:'함께 만들고 나눠 먹는 요리 모임'});
mk('guitar','기타·우쿨렐레 교실','club',2,2,900,7,'bld','#ece4d4','#c9853a',{sub:'music',H:.85,roof:'flat',deco:'sign',sign:'기타',signc:'#c9853a',fcap:8,fill:{fel:32,word:6},cap:8,dur:5,desc:'처음 잡아 보는 기타·우쿨렐레를 함께 배워요'});
mk('band','밴드연습실','club',2,2,1300,10,'bld','#3f4650','#c4503a',{sub:'music',H:.95,roof:'flat',deco:'sign',sign:'밴드',signc:'#c4503a',fcap:10,fill:{fel:36,word:8},cap:8,dur:5,desc:'드럼과 앰프가 있는 밴드 연습실. 찬양팀 청년들의 아지트'});
mk('choir','합창실','club',3,2,1500,12,'bld','#efe9dc','#3f5ea3',{sub:'music',H:1.0,roof:'gable',rh:.5,deco:'sign',sign:'합창',signc:'#3f5ea3',fcap:16,fill:{fel:38,word:10},cap:14,dur:6,desc:'목소리를 맞추며 하나 되는 합창 모임'});
mk('path','길·계단','path',1,1,40,0,'path','#d6c6a6','#9c8664',{short:'계단·다리도',desc:'방향과 경사를 골라 길·계단·다리를 한 칸씩 이어 짓습니다'});
mk('f_block','보도블록','floor',1,1,15,0,'floor','#c9c2b6','#a59d90',{pat:'grid',beauty:0.04,desc:'단정한 회색 보도블록'});
mk('f_brick','벽돌 바닥','floor',1,1,20,0,'floor','#b9694c','#8c4a33',{pat:'brick',beauty:0.05,desc:'따뜻한 붉은 벽돌'});
mk('f_gravel','자갈','floor',1,1,10,0,'floor','#c3b8a5','#8f8573',{pat:'dots',beauty:0.03,desc:'밟으면 소리 나는 자갈길'});
mk('f_wood','나무 바닥','floor',1,1,25,0,'floor','#b88a58','#7d5732',{pat:'plank',beauty:0.05,desc:'결이 보이는 나무 바닥'});
mk('f_step','디딤돌','floor',1,1,25,0,'floor','#7fae63','#a8a294',{pat:'stepping',beauty:0.08,desc:'잔디 위에 놓은 넓적한 디딤돌. 걸을 수 있어요'});
mk('f_clover','꽃잔디','floor',1,1,20,0,'floor','#76a85a','#e57aa5',{pat:'flower',beauty:0.1,desc:'분홍 꽃이 핀 낮은 잔디'});
// 대기줄 타일: 건물 입구 앞 칸부터 이어 깔면 그 건물의 대기줄이 된다 (queue.js). 모양만 다르고 기능은 같다
mk('q_rope','로프 대기줄','path',1,1,24,0,'floor','#cfc7b8','#b5332e',{queue:true,qs:'rope',pat:'grid',beauty:0.03,short:'입구 앞부터',desc:'금색 기둥과 붉은 로프. 건물 입구 앞 칸부터 이어 깔면 대기줄이 돼요'});
mk('q_wood','나무 울타리 대기줄','path',1,1,20,0,'floor','#c9b48f','#7a5530',{queue:true,qs:'wood',pat:'plank',beauty:0.03,short:'입구 앞부터',desc:'낮은 나무 울타리로 가른 대기줄'});
mk('q_chain','쇠사슬 대기줄','path',1,1,20,0,'floor','#bfc3c6','#59626b',{queue:true,qs:'chain',pat:'grid',beauty:0.02,short:'입구 앞부터',desc:'쇠기둥과 사슬로 가른 대기줄'});
mk('q_hedge','화단 대기줄','path',1,1,30,0,'floor','#d6cdb9','#4f8a4a',{queue:true,qs:'hedge',pat:'',beauty:0.06,short:'입구 앞부터',desc:'꽃이 핀 낮은 화단으로 가른 대기줄'});
mk('q_paint','바닥 선 대기줄','path',1,1,12,0,'floor','#b9b3a7','#f2c230',{queue:true,qs:'paint',pat:'',beauty:0.01,short:'입구 앞부터',desc:'바닥에 노란 선만 그은 가장 싼 대기줄'});
var GATE_DESIGNS=[['arch','벽돌 현관'],['wood','나무 현관'],['glass','유리 현관'],['stone','돌 현관'],['flower','꽃 현관']];
// 입구·출구 건물 (gates.js): 이용 효과가 있는 건물은 둘 다 붙여 지어야 운영된다. 한 칸, 모양만 다르다
GATE_DESIGNS.forEach(function(g,i){
  var cost=[120,80,150,140,110][i];
  mk('g_'+g[0],g[1]+' 입구','gate',1,1,cost,0,'gate','#3f9d5a','#3f9d5a',{role:'ent',design:g[0],cell:true,beauty:.2,hgt:1.05,desc:'건물 바로 옆 칸에 붙여 짓는 작은 현관 건물. 방문자가 이 문으로 들어가요'});
  mk('x_'+g[0],g[1]+' 출구','gate',1,1,cost,0,'gate','#e08a2c','#e08a2c',{role:'ext',design:g[0],cell:true,beauty:.2,hgt:1.05,desc:'건물 바로 옆 칸에 붙여 짓는 작은 현관 건물. 방문자가 이 문으로 나와요'});
});
mk('f_erase','바닥 지우기','floor',1,1,0,0,'floor','#7fae63','#5c8a48',{pat:'erase',short:'반값 환불',desc:'칠한 바닥을 걷어내고 잔디로 되돌립니다. 비용의 절반이 돌아옵니다'});
mk('ter_set','땅 높이','path',1,1,60,0,'terrain','#9b7752','#2f4a3c',{short:'한 층 30',desc:'칸을 눌러 고른 높이로 땅을 올리거나 내립니다. 위에 있는 건물·바닥도 함께 움직여요. 한 층 올리기 60, 내리기 30'});
mk('ter_ramp','흙 경사로','path',1,1,80,0,'terrain','#b48d5f','#7a5530',{short:'오르내리는 길',desc:'한 층 높은 땅으로 걸어 오르는 흙 비탈. 화살표가 오르는 방향이고, 그쪽 땅이 낮으면 한 층 높여 줘요(값 포함)'});
/* 꾸미기에 마음 쓰도록: 기능 건물(예배·교제·매장·돌봄·편의·주차)은 2배 값.
   정원·장식·바닥·길·지형·편의 소품은 그대로. 초기 자금·목표 보상·대출·신용 한도도 같은 비율로 올렸다 */
// 편의로 옮긴 작은 소품(prop: 벤치·쓰레기통·식수대 등)은 꾸미기 때 값 그대로
DEFS.forEach(function(d){if(PRICY_CATS.indexOf(d.cat)>=0&&!d.prop)d.cost=Math.round(d.cost*BUILD_K/10)*10;});
// 소모임 코트의 그림 높이 (가려짐·눌러 고르기용)
var COURT_H={pingpong:.5,fitness:1.2,badminton:.9,jokgu:.5,gateball:.4,hoops:1.7,futsal:.8};
DEFS.forEach(function(d){if(d.kind==='court')d.hgt=COURT_H[d.court];});
var D={}; DEFS.forEach(function(d){D[d.id]=d;});
// 한 칸짜리 소품은 그림을 절반 크기로 그리므로 높이도 절반 (입구·출구는 제 높이)
function heightOf(id){var d=D[id];return heightOfDef(d)*(d.cell&&d.kind!=='gate'?CELL_K:1);}
function heightOfDef(d){
  if(d.hgt!=null)return d.hgt;
  if(d.kind==='bld')return Math.max(d.H+(d.rh||0.05),d.towerH?d.towerH+0.75:0);
  return {market:.95,canal:.1,birdbath:.7,topiary:.7,fence:.62,lamp2:1.8,bollard:.5,stonelamp:1.2,bin:.5,board:1.1,bell:1.6,bikerack:.4,parasol:1.3,lot:.12,tree:1.4,flower:.25,bench:.45,spire:2.7,wfount:1.1,fountain:.9,lamp:1.7,hedge:.55,arch:1.45,floor:.02,stage:.7,playground:1.2,pond:.15,picnic:.5,statue:1.7,planter:.6,gazebo:1.4,busstop:1.1}[d.kind]||1;
}

