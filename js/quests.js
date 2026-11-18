'use strict';
/* ---------- 퀘스트 ----------
   처음 할 일 안내(첫 걸음), 교회의 성장 목표, 새로 지을 것을 이끄는 건축 안내를 한곳에 모은다.
   · 퀘스트를 이루면 곧바로 자금(m)과 사역 경험(xp)을 받는다. 사역 경험은 현황 지표 '사역 경험'의 점수가 된다 (S.qxp)
   · 건물·사역팀·행사는 교회 Level로 열린다 (목표가 열던 때와 달리). 퀘스트는 길잡이일 뿐이다
   · after: 앞 퀘스트를 마쳐야 뜬다. need(): 지금 할 수 있어야 뜬다. base(): 뜰 때 한 번 적어 두는 기준값
   S.qd = {id: 1} 마친 퀘스트, S.qb = {id: 기준값}, S.qxp = 사역 경험 */
function hasBuilt(ids){return S.buildings.some(function(b){return ids.indexOf(b.def)>=0;});}
function hasCat(cat){return S.buildings.some(function(b){var d=defOf(b);return d&&d.cat===cat;});}
function newDecor(){return S.buildings.filter(function(b){var d=defOf(b);return b.bw!=null&&d&&(d.cat==='garden'||d.cat==='deco');}).length;}
function ranEvent(){var w=S.evW||{};for(var k in w)if(w[k]>=0)return true;return false;}
function qBase(q){return S.qb&&S.qb[q.id];}
// 퀘스트 판정에 쓰는 작은 도우미
function qFloors(){return Object.keys(S.floor||{}).length;}
function qClaimedEv(grp){var w=S.evW||{};for(var k in w)if(w[k]>=0&&EVENTS[k]&&(EVENTS[k].grp||'')===grp)return true;return false;}
function qEntr(){var e=S.entr;return !!e&&(e.lv>1||(e.own||[]).length>1||(e.sgOwn||[]).length>1||(e.dOwn||[]).length>0);}
function qMgrd(cat){return S.buildings.some(function(b){var d=defOf(b);return !b.fixed&&d&&(!cat||d.cat===cat)&&!!mgrOf(b);});}
function qDepth(n){return (S.people||[]).some(function(p){return PP_TREE[p.node]&&PP_TREE[p.node].d>=n;});}
function qVols(){return (S.people||[]).filter(function(p){return ppClass(p)!=='saint';}).length;}
/* 스테이지 1(농촌 목회) 퀘스트. 모든 기능을 한 번씩 써 보며 성도 100명(마지막 퀘스트 = 스테이지 목표 STAGE_GOAL)에 닿도록 짰다.
   · 첫 걸음(f): 하나씩 차례로
   · 교회의 성장(g): 성도 수 목표, 마지막이 스테이지 목표(final)
   · 사역 안내(p)·건축 안내(b): 두 줄이 따로 하나씩 이어진다. 교회 Level로 열리는 기능(need)은 열릴 때까지 그 줄이 기다린다
     (예전 저장과 맞도록 같은 일을 하던 안내는 예전 id(u…)를 그대로 쓴다) */
var QUESTS=[
  // 첫 걸음: 하나씩 차례로
  {id:'f1',g:'first',n:'교회 문 열기',d:'입구(파란 아치)를 눌러 교회 문을 열어요',ok:function(){return S.open;},m:250,xp:3},
  {id:'f2',g:'first',after:'f1',n:'첫 주일 맞기',d:'한 주를 보내면 주일 헌금이 들어와요',base:function(){return S.week;},ok:function(){return S.week>qBase(this);},m:250,xp:3},
  {id:'f3',g:'first',after:'f2',n:'화장실 짓기',d:'건축 › 편의에서 화장실을 지어요',ok:function(){return hasBuilt(GRIPES.wc.ids);},m:250,xp:3},
  {id:'f4',g:'first',after:'f3',n:'벤치 놓기',d:'다니는 길가에 벤치를 놓아요',ok:function(){return hasBuilt(['bench','picnic','gazebo','swing']);},m:250,xp:3},
  {id:'f5',g:'first',after:'f4',n:'길가 꾸미기',d:'정원·장식 두 개로 길가를 꾸며요',base:function(){return newDecor();},ok:function(){return newDecor()>=qBase(this)+2;},p:function(){return Math.min(1,(newDecor()-qBase(this))/2);},m:250,xp:3},
  {id:'f6',g:'first',after:'f5',n:'첫 행사 열기',d:'행사 화면에서 행사를 열고, 다 차면 보상을 받아요',ok:ranEvent,m:250,xp:3},
  // 교회의 성장: 앞의 것부터 차례로. 마지막(final)이 스테이지 목표
  {id:'g1',g:'goal',after:'f6',n:'첫 예배 공동체',d:'성도 12명',ok:function(){return S.members>=12;},p:function(){return S.members/12;},m:800,xp:15,rep:3},
  {id:'g2',g:'goal',after:'g1',n:'작은 예배 공동체',d:'성도 25명 · 신뢰도 지수 40',ok:function(){return S.members>=25&&trustIdx()>=40;},p:function(){return Math.min(S.members/25,trustIdx()/40);},m:1400,xp:20,rep:3},
  {id:'g3',g:'goal',after:'g2',n:'뿌리내리는 교회',d:'성도 45명 · 만족도 55%',ok:function(){return S.members>=45&&S.mood>=55;},p:function(){return Math.min(S.members/45,S.mood/55);},m:2000,xp:30,rep:4},
  {id:'g4',g:'goal',after:'g3',n:'함께 섬기는 교회',d:'성도 70명 · 봉사자 5명',ok:function(){return S.members>=70&&qVols()>=5;},p:function(){return Math.min(S.members/70,qVols()/5);},m:3000,xp:40,rep:4},
  {id:'g5',g:'goal',after:'g4',final:true,n:'성도 100명의 교회',d:'성도 100명 — 스테이지 목표',ok:function(){return S.members>=100;},p:function(){return S.members/100;},m:5000,xp:60,rep:5},
  // 사역 안내: 사람을 돌보고 세우는 기능을 하나씩
  {id:'p1',g:'guide',after:'f6',n:'성도 심방하기',d:'성도 화면에서 단계 카드의 심방을 눌러 성도를 찾아가요 (호감이 올라요)',ok:function(){return (S.people||[]).some(function(p){return p.vw>=0;});},m:200,xp:5},
  {id:'u7',g:'guide',after:'p1',n:'첫 세례 주기',d:'호감 Lv 3이 된 새가족에게 세례 교육을 시작하고, 마치면 임명(세례)해요',ok:function(){return qDepth(1);},m:250,xp:8},
  {id:'p3',g:'guide',after:'u7',n:'담임목사 말씀 연구',d:'행사 › 담임목사 탭에서 서적 구매나 말씀 연구를 열고 보상을 받아요',ok:function(){return qClaimedEv('pas');},m:250,xp:6},
  {id:'p4',g:'guide',after:'p3',n:'현황 보상 받기',d:'왼쪽 아래 자금·성도 칩을 눌러 현황에서 지표 보상을 받아요',ok:function(){var il=S.il||{};for(var k in il)if(il[k].cl>1)return true;return false;},m:200,xp:5},
  {id:'p5',g:'guide',after:'p4',n:'선물하기',d:'성도 화면에서 선물로 마음을 전해요 (심방보다 호감이 많이 올라요)',need:function(){return featOk('gift');},ok:function(){return (S.people||[]).some(function(p){return p.gw>=0;});},m:250,xp:6},
  {id:'u11',g:'guide',after:'p5',n:'부교역자 모시기',d:'직원 화면 › 청빙에서 부교역자를 청빙해요',need:function(){return featOk('hire');},ok:function(){return S.assoc.length>0;},m:350,xp:12},
  {id:'p7',g:'guide',after:'u11',n:'관리자 세우기',d:'교제실 같은 건물을 누르고 👤 관리자에서 부교역자를 배치해요 (관리자가 있어야 문을 열어요)',ok:function(){return qMgrd();},m:300,xp:8},
  {id:'u8',g:'guide',after:'p7',n:'성도의 고민 들어 주기',d:'성도 화면 › 고민에서 사연을 읽고 알맞은 답을 골라요',need:function(){return featOk('care');},ok:function(){return (S.careDone||0)>=1;},m:300,xp:10},
  {id:'p9',g:'guide',after:'u8',n:'제자반 수료',d:'성도를 양육반 → 제자반까지 길러요 (호감 레벨이 차면 교육 → 임명)',need:function(){return ppNodeOpen('disciple');},ok:function(){return qDepth(3);},m:400,xp:12},
  {id:'u10',g:'guide',after:'p9',n:'봉사자 갈래 정하기',d:'봉사자 › 제자 탭에서 직분·리더·섬김 가운데 하나를 골라 첫 단계를 마치고 임명해요',need:function(){return featOk('vol');},ok:function(){return qDepth(4);},m:400,xp:12},
  {id:'p11',g:'guide',after:'u10',n:'건물 보조 직분자',d:'봉사자 › 직분자 탭에서 건물의 보조 빈칸에 직분자를 세워 성능을 올려요',ok:function(){return S.buildings.some(function(b){return (b.supportStaff||[]).length>0;});},m:300,xp:8},
  {id:'p12',g:'guide',after:'u10',n:'리더에게 성도 맡기기',d:'봉사자 › 리더 탭에서 리더의 성도 칸을 채워요 (맡은 성도는 매주 호감이 올라요)',ok:function(){return (S.people||[]).some(function(p){return (p.assignedSaints||[]).length>0;});},m:300,xp:8},
  {id:'u6',g:'guide',after:'u10',n:'사역팀 꾸리기',d:'봉사자 › 섬김이 탭에서 사역팀 빈칸에 섬김이를 세워요',need:function(){return featOk('teams');},ok:function(){for(var k in S.staff)if(S.staff[k]>0)return true;return false;},m:300,xp:8},
  // 건축 안내: 지을 것과 키울 것을 하나씩
  {id:'b1',g:'guide',after:'f6',n:'바닥 넓게 깔기',d:'건축 › 바닥에서 2×2 같은 넓이 단추를 고르고 바닥을 한 번에 깔아요',base:function(){return qFloors();},ok:function(){return qFloors()>=qBase(this)+4;},p:function(){return (qFloors()-qBase(this))/4;},m:200,xp:5},
  {id:'u3',g:'guide',after:'b1',n:'주차장 짓기',d:'도로 위 주차 구역에 주차장을 지어 편의를 높여요',need:function(){return !isLocked('lot');},ok:function(){return hasCat('park');},m:250,xp:6},
  {id:'u1',g:'guide',after:'u3',n:'교제 공간 짓기',d:'건축 › 교제에서 교제실이나 카페를 지어 성도들이 어울리게 해요',need:function(){return !isLocked('cell');},ok:function(){return hasCat('fellow');},m:250,xp:6},
  {id:'u2',g:'guide',after:'u1',n:'기도실 짓기',d:'기도실을 지으면 영성의 기도 자리가 늘어요',need:function(){return !isLocked('pray');},ok:function(){return hasBuilt(['pray','dawn']);},m:250,xp:6},
  {id:'b5',g:'guide',after:'u2',n:'입구 꾸미기',d:'입구를 눌러 꾸미기에서 입구를 키우거나 새 모양·현수막을 달아요 (방문자가 늘어요)',need:function(){return featOk('entr');},ok:qEntr,m:300,xp:6},
  {id:'b6',g:'guide',after:'b5',n:'건물 키우기',d:'건물을 누르고 투자해 레벨을 올려요 (정원·효과가 커져요)',ok:function(){return S.buildings.some(function(b){return (b.lv||1)>1||(b.bx||0)>0;});},m:300,xp:6},
  {id:'u9',g:'guide',after:'b6',n:'매장 열기',d:'카페·서점 같은 매장을 짓고, 직원 화면에서 청빙한 직원을 관리자로 세워요',need:function(){return !isLocked('shop');},ok:function(){return qMgrd('shop');},m:350,xp:8},
  {id:'u4',g:'guide',after:'u9',n:'부서실 짓기',d:'영유아실·유치부실·초등부실로 성도 가정을 돌봐요',need:function(){return !isLocked('nursery');},ok:function(){return hasBuilt(['nursery','kinder','kids','teens','study','playground','elder','clinic','pantry','counsel','foodbank']);},m:300,xp:6},
  {id:'u5',g:'guide',after:'u4',n:'소모임 열기',d:'건축 › 소모임에서 운동·취미·음악 모임 하나를 시작해요',need:function(){return !isLocked('pingpong');},ok:function(){return hasCat('club');},m:300,xp:6},
  // 스테이지 안내 (그 스테이지에서만): 차량·배를 마련해 운전자 세우기 · 이웃 부지 사기
  {id:'s1',g:'guide',after:'f6',n:'승합차 운행',d:'직원 화면 › 차량에서 승합차를 마련하고 봉사자나 부교역자를 운전자로 세워요',need:function(){return stg().trans==='road'&&featOk('hire');},ok:function(){return vehs().some(function(v){return !VEH[v.k].free&&vehRun(v);});},m:600,xp:10},
  {id:'s2',g:'guide',after:'f6',n:'배 늘리기',d:'직원 화면 › 차량에서 배를 마련하고 운전자를 세워 나루에서 기다리는 사람을 더 태워 와요',need:function(){return stg().trans==='water'&&featOk('hire');},ok:function(){return vehs().some(function(v){return !VEH[v.k].free&&vehRun(v);});},m:600,xp:10},
  {id:'s3',g:'guide',after:'f6',n:'이웃 부지 사기',d:'이웃 건물을 누르고 부지 매입으로 땅을 넓혀요 (주차장 자리를 먼저 마련해 보세요)',need:function(){return !!stg().city;},ok:function(){return (S.landN||0)>=1;},m:500,xp:10}
];
// 스테이지 목표 = 마지막 퀘스트 (스테이지 고르기 카드에도 적는다)
var STAGE_GOAL='g5';
var QID={};QUESTS.forEach(function(q){QID[q.id]=q;});
var QG={first:'첫 걸음',goal:'교회의 성장',guide:'사역·건축 안내'};
function qDone(id){return !!(S.qd&&S.qd[id]);}
function qOpen(q){return !qDone(q.id)&&(!q.after||qDone(q.after))&&(!q.need||q.need());}
// 지금 보이는(할 수 있는) 퀘스트: 첫 걸음 → 성장 목표 → 건축 안내 순
function qActive(){return QUESTS.filter(qOpen);}
function qCount(){var n=0;QUESTS.forEach(function(q){if(qDone(q.id))n++;});return n;}
function qReward(q){return '자금 +'+fmt(q.m)+' · 사역 경험 +'+q.xp;}
function qProg(q){return q.p?clamp(q.p.call(q),0,1):0;}
// 0.5초마다: 뜬 퀘스트의 기준값을 적고, 이뤘으면 보상한다 (한 번에 하나씩)
function questTick(){
  if(!S.qd)S.qd={};if(!S.qb)S.qb={};
  var act=qActive();
  for(var i=0;i<act.length;i++){
    var q=act[i];
    if(q.base&&S.qb[q.id]===undefined)S.qb[q.id]=q.base();
    if(q.ok()){questDone(q);return;}
  }
}
function questDone(q){
  S.qd[q.id]=1;S.money+=q.m;S.qxp=(S.qxp||0)+q.xp;if(q.rep)gainRep(q.rep);
  var nx=QUESTS.filter(function(o){return o.after===q.id&&qOpen(o);})[0];
  addLog('퀘스트 완료 · '+q.n);
  if(q.g==='goal'&&typeof celebrate==='function'){
    var lines=['후원금 +'+fmt(q.m),'사역 경험 +'+q.xp];if(q.rep)lines.push('신뢰 +'+q.rep);
    celebrate(q,lines,q.final?'스테이지 목표 달성!':'퀘스트 완료');
    if(q.final){S.stageClear=S.stageClear||{};S.stageClear[S.stage||'rural']=S.week;stageClearSave(S.stage||'rural');}
  }else{
    toast('퀘스트 완료 · '+q.n+' · +'+fmt(q.m)+' · 사역 경험 +'+q.xp+(nx&&nx.g==='first'?' · 다음: '+nx.n:''),2800);sfx('reward',.55,0);
  }
  recalc();save();
}
// 상단 줄에 한 줄로 보여 줄 퀘스트와 진행 (0~1)
function questTop(){
  var a=qActive();if(!a.length)return null;
  var q=a[0];return {q:q,p:q.p?qProg(q):0};
}
