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
var QUESTS=[
  // 첫 걸음: 하나씩 차례로
  {id:'f1',g:'first',n:'교회 문 열기',d:'입구(파란 아치)를 눌러 교회 문을 열어요',ok:function(){return S.open;},m:250,xp:3},
  {id:'f2',g:'first',after:'f1',n:'첫 주일 맞기',d:'한 주를 보내면 주일 헌금이 들어와요',base:function(){return S.week;},ok:function(){return S.week>qBase(this);},m:250,xp:3},
  {id:'f3',g:'first',after:'f2',n:'화장실 짓기',d:'건축 › 편의에서 화장실을 지어요',ok:function(){return hasBuilt(GRIPES.wc.ids);},m:250,xp:3},
  {id:'f4',g:'first',after:'f3',n:'벤치 놓기',d:'다니는 길가에 벤치를 놓아요',ok:function(){return hasBuilt(['bench','picnic','gazebo','swing']);},m:250,xp:3},
  {id:'f5',g:'first',after:'f4',n:'길가 꾸미기',d:'정원·장식 두 개로 길가를 꾸며요',base:function(){return newDecor();},ok:function(){return newDecor()>=qBase(this)+2;},p:function(){return Math.min(1,(newDecor()-qBase(this))/2);},m:250,xp:3},
  {id:'f6',g:'first',after:'f5',n:'첫 행사 열기',d:'행사 화면에서 첫 행사를 열어요',ok:ranEvent,m:250,xp:3},
  // 교회의 성장 (예전 목표): 앞의 것부터 차례로
  {id:'g1',g:'goal',after:'f6',n:'첫 예배 공동체',d:'성도 12명',ok:function(){return S.members>=12;},p:function(){return S.members/12;},m:800,xp:15,rep:3},
  {id:'g2',g:'goal',after:'g1',n:'작은 예배 공동체',d:'성도 25명 · 신뢰도 지수 40',ok:function(){return S.members>=25&&trustIdx()>=40;},p:function(){return Math.min(S.members/25,trustIdx()/40);},m:1400,xp:20,rep:3},
  {id:'g3',g:'goal',after:'g2',n:'뿌리내리는 교회',d:'성도 50명 · 만족도 55%',ok:function(){return S.members>=50&&S.mood>=55;},p:function(){return Math.min(S.members/50,S.mood/55);},m:2000,xp:30,rep:4},
  {id:'g4',g:'goal',after:'g3',n:'스스로 서는 교회',d:'성도 90명 · 4주 연속 흑자',ok:function(){return S.members>=90&&S.posWeeks>=4;},p:function(){return Math.min(S.members/90,S.posWeeks/4);},m:3000,xp:40,rep:4},
  {id:'g5',g:'goal',after:'g4',n:'동네의 이웃',d:'성도 140명 · 신뢰도 지수 65 · 직분자 10명',ok:function(){return S.members>=140&&trustIdx()>=65&&offTotal(S)>=10;},p:function(){return Math.min(S.members/140,trustIdx()/65,offTotal(S)/10);},m:4400,xp:60,rep:5},
  {id:'g6',g:'goal',after:'g5',n:'지역을 섬기는 교회',d:'성도 220명 · 신뢰도 지수 80',ok:function(){return S.members>=220&&trustIdx()>=80;},p:function(){return Math.min(S.members/220,trustIdx()/80);},m:6000,xp:80,rep:5},
  {id:'g7',g:'goal',after:'g6',n:'부흥하는 교회',d:'성도 350명 · 만족도 70%',ok:function(){return S.members>=350&&S.mood>=70;},p:function(){return Math.min(S.members/350,S.mood/70);},m:10000,xp:100,rep:5},
  // 건축·사역 안내: 첫 걸음을 마치면 지금 할 수 있는 것부터 뜬다 (순서 없음)
  {id:'u1',g:'guide',after:'f6',n:'교제 공간 짓기',d:'건축 › 교제에서 교제실이나 카페를 지어 성도들이 어울리게 해요',ok:function(){return hasCat('fellow');},m:200,xp:6},
  {id:'u2',g:'guide',after:'f6',n:'기도실 짓기',d:'기도실을 지으면 영성의 기도 자리가 늘어요',ok:function(){return hasBuilt(['pray','dawn']);},m:200,xp:6},
  {id:'u3',g:'guide',after:'f6',n:'주차장 짓기',d:'도로 위 주차 구역에 주차장을 지어 편의를 높여요',need:function(){return !isLocked('lot');},ok:function(){return hasCat('park');},m:250,xp:6},
  {id:'u4',g:'guide',after:'f6',n:'돌봄 공간 짓기',d:'돌봄실이나 유아방으로 성도 가정을 돌봐요',ok:function(){return hasCat('care');},need:function(){return !isLocked('nursery');},m:250,xp:6},
  {id:'u5',g:'guide',after:'f6',n:'소모임 열기',d:'건축 › 소모임에서 운동·취미·음악 모임 하나를 시작해요',ok:function(){return hasCat('club');},m:200,xp:6},
  {id:'u6',g:'guide',after:'f6',n:'사역팀 꾸리기',d:'행사 › 사역팀에서 달란트를 넣어 첫 사역팀을 꾸려요',ok:function(){for(var k in S.staff)if(S.staff[k]>0)return true;return false;},m:200,xp:8},
  {id:'u7',g:'guide',after:'f6',n:'첫 세례 주기',d:'성도 화면에서 세례 교육을 마친 성도에게 세례를 줘요',ok:function(){return (S.people||[]).some(function(p){return p.node!=='new';});},m:200,xp:8},
  {id:'u8',g:'guide',after:'g1',n:'성도의 고민 들어 주기',d:'성도 화면 › 고민에서 한 성도의 사연을 들어 주고 풀어 줘요',ok:function(){return (S.careDone||0)>=1;},m:300,xp:10},
  {id:'u9',g:'guide',after:'g1',n:'매장 열기',d:'카페·서점 같은 매장을 지어 수익을 만들어요',need:function(){return !isLocked('shop');},ok:function(){return hasCat('shop');},m:300,xp:8},
  {id:'u10',g:'guide',after:'g2',n:'첫 직분자 세우기',d:'성도를 길러 집사·소그룹 리더·섬김이를 세워요',ok:function(){return (S.people||[]).some(function(p){return PP_TREE[p.node].d>=4;});},m:350,xp:12},
  {id:'u11',g:'guide',after:'g2',n:'부교역자 모시기',d:'직분자 화면 › 청빙에서 부교역자를 청빙해요',ok:function(){return S.assoc.length>0;},m:350,xp:12}
];
var QID={};QUESTS.forEach(function(q){QID[q.id]=q;});
var QG={first:'첫 걸음',goal:'교회의 성장',guide:'건축·사역 안내'};
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
    celebrate(q,lines,'퀘스트 완료');
  }else{
    toast('퀘스트 완료 · '+q.n+' · +'+fmt(q.m)+' · 사역 경험 +'+q.xp+(nx&&nx.g==='first'?' · 다음: '+nx.n:''),2800);sfx('coins',.5,0);
  }
  recalc();save();
}
// 상단 줄에 한 줄로 보여 줄 퀘스트와 진행 (0~1)
function questTop(){
  var a=qActive();if(!a.length)return null;
  var q=a[0];return {q:q,p:q.p?qProg(q):0};
}
