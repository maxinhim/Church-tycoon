'use strict';
/* ---------- 목회 운영 ----------
   난이도 · 목표와 보상(잠금 해제) · 사역팀 · 부교역자 청빙 · 직분자 임명 · 목양 수용력
   · 특별행사 · 목회 고민거리(선택 카드) · 건물 노후와 수리.
   여기서 계산한 효과는 MOD에 모이고, 시뮬레이션·만족도·방문자가 MOD를 읽는다. */

/* ---------- 난이도 ---------- */
var DIFF={
  easy:{name:'테스트',money:50000,cost:.8,churn:.7,desc:'자금 50,000으로 넉넉하게 시험해 봅니다'},
  normal:{name:'보통',money:20000,cost:1,churn:1,desc:'적은 자금에서 차근차근 세워 갑니다'},
  hard:{name:'어려움',money:14000,cost:1.2,churn:1.25,desc:'더 적은 자금, 더 높은 운영비와 이탈'}
};
function curDiff(){return DIFF[S.diff]||DIFF.normal;}

/* ---------- 목표: 이루면 후원금·평판과 함께 새 건물·사역·행사가 열린다 ---------- */
var GOALS=[
  {n:'첫 예배 공동체',d:'성도 12명',t:function(s){return s.members>=12;},p:function(s){return s.members/12;},r:800,rep:3},
  {n:'작은 예배 공동체',d:'성도 25명 · 평판 40',t:function(s){return s.members>=25&&s.rep>=40;},p:function(s){return Math.min(s.members/25,s.rep/40);},r:1400,rep:3},
  {n:'뿌리내리는 교회',d:'성도 50명 · 만족도 55',t:function(s){return s.members>=50&&s.mood>=55;},p:function(s){return Math.min(s.members/50,s.mood/55);},r:2000,rep:4},
  {n:'스스로 서는 교회',d:'성도 90명 · 4주 연속 흑자',t:function(s){return s.members>=90&&s.posWeeks>=4;},p:function(s){return Math.min(s.members/90,s.posWeeks/4);},r:3000,rep:4},
  {n:'동네의 이웃',d:'성도 140명 · 평판 65 · 직분자 10명',t:function(s){return s.members>=140&&s.rep>=65&&offTotal(s)>=10;},p:function(s){return Math.min(s.members/140,s.rep/65,offTotal(s)/10);},r:4400,rep:5},
  {n:'지역을 섬기는 교회',d:'성도 220명 · 평판 80',t:function(s){return s.members>=220&&s.rep>=80;},p:function(s){return Math.min(s.members/220,s.rep/80);},r:6000,rep:5},
  {n:'부흥하는 교회',d:'성도 350명 · 만족도 70',t:function(s){return s.members>=350&&s.mood>=70;},p:function(s){return Math.min(s.members/350,s.mood/70);},r:10000,rep:5}
];
function lastNet(s){var h=s.hist[s.hist.length-1];return h?h.inc-h.exp:0;}
// 목표를 n개 이루면 열리는 것들 (건물 id, 'sky'=연결 다리)
var UNLOCK={
  chapel:1,hall:1,kids:1,lot:1,praise:1,books:1,nursery:1,mfel:1,mcomf:1,lamp:1,picnic:1,planter:1,
  dining:2,youth:2,elder:2,counsel:2,pantry:2,lounge:2,nurse:2,fountain:2,spire:2,mcare:2,study:2,gazebo:2,playground:2,shop:2,sky:2,
  badminton:1,jokgu:1,gateball:1,calli:1,art:1,
  hoops:2,craft:2,cook:2,band:2,choir:2,
  futsal:3,grand:3,clinic:3,dawn:3,rosearch:3,mission:3,gym:3,foodbank:3,parktower:3,pond:3,statue:3,outdoor:3
};
function lockGoal(id){return UNLOCK[id]||0;}
function isLocked(id){return lockGoal(id)>S.goal;}
function lockText(n){return '목표 '+n+'개 달성 후';}
// 목표 n개째를 이뤘을 때 새로 열리는 것들의 이름
function unlockNames(n){
  var out=[];
  for(var id in UNLOCK)if(UNLOCK[id]===n)out.push(id==='sky'?'연결 다리':(D[id]?D[id].name:id));
  for(var k in STAFF)if((STAFF[k].goal||0)===n&&n>0)out.push(STAFF[k].name);
  for(var e in EVENTS)if((EVENTS[e].goal||0)===n&&n>0&&!EVENTS[e].hidden)out.push(EVENTS[e].name);
  for(var o in OFFICE)if(OFFICE[o].goal===n)out.push(OFFICE[o].name+' 임명');
  return out;
}
function checkGoal(){
  var g=GOALS[S.goal];
  if(!g||!g.t(S))return;
  S.money+=g.r;S.rep=clamp(S.rep+g.rep,0,100);S.goal++;
  var opened=unlockNames(S.goal);
  var lines=['후원금 +'+fmt(g.r),'평판 +'+g.rep];
  if(opened.length)lines.push('새로 열림 · '+opened.join(', '));
  addLog('목표 달성 · '+g.n);
  if(typeof celebrate==='function')celebrate(g,lines);
}

/* ---------- 사역팀 ---------- */
var STAFF={
  evang:{name:'전도팀',desc:'방문자 +20%, 정착률 +10% (단계마다)',week:70,costs:[400,900,1600],goal:0},
  praise:{name:'찬양팀',desc:'헌금 +12%, 말씀 효과 +6%, 만족 +2 (단계마다)',week:55,costs:[350,800,1500],goal:0},
  care:{name:'돌봄팀',desc:'돌봄 효과 +15%, 목양 수용력 +8, 만족 +1 (단계마다)',week:60,costs:[380,850,1500],goal:0},
  newcomer:{name:'새가족팀',desc:'정착률 +12%, 이탈 -5% (단계마다)',week:50,costs:[300,700,1300],goal:1},
  edu:{name:'교육팀',desc:'돌봄 효과 +12%, 가족 방문자 +6% (단계마다)',week:60,costs:[400,900,1600],goal:1},
  prayer:{name:'중보기도팀',desc:'만족 +2, 이탈 -4% (단계마다)',week:30,costs:[250,600,1100],goal:1},
  admin:{name:'관리팀',desc:'건물 노후 -20%, 운영비 -4% (단계마다)',week:65,costs:[450,1000,1800],goal:2},
  media:{name:'미디어팀',desc:'방문자 +12%, 평판 +0.2/주 (단계마다)',week:75,costs:[500,1100,2000],goal:2},
  mission:{name:'선교팀',desc:'평판 +0.5/주, 지역 봉사 효과 +50% (단계마다)',week:70,costs:[500,1200,2200],goal:3}
};
function teamPay(){var t=0;for(var k in STAFF)t+=STAFF[k].week*(S.staff[k]||0);return t;}
function hireTeam(k){
  var s=STAFF[k],lv=S.staff[k]||0;
  if((s.goal||0)>S.goal)return lockText(s.goal)+' 꾸릴 수 있어요';
  if(lv>=3)return '이미 최대 단계예요';
  if(S.money<s.costs[lv])return '자금이 부족해요';
  S.money-=s.costs[lv];S.staff[k]=lv+1;recalc();save();return '';
}

/* ---------- 부교역자 청빙 ---------- */
var FIELDS={
  edu:{name:'교육',desc:'돌봄 효과 +4%'},
  praise:{name:'찬양',desc:'말씀 효과 +4%, 만족 +0.6'},
  visit:{name:'심방',desc:'목양 수용력 +12, 이탈 -3%'},
  admin:{name:'행정',desc:'운영비 -3%, 노후 -6%'},
  mission:{name:'선교',desc:'방문자 +4%, 평판 +0.15/주'}
};
var SURN=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','홍'];
var GIVEN=['민준','서연','도윤','하은','지호','수빈','예준','지우','현우','유진','성민','은지','동현','혜린','준혁','다은','시온','하람','은혜','소망'];
function makeCand(){
  var sk=1+Math.floor(Math.pow(Math.random(),1.5)*5),fk=Object.keys(FIELDS)[Math.floor(Math.random()*5)];
  var pay=50+sk*30;
  return {name:SURN[Math.floor(Math.random()*SURN.length)]+GIVEN[Math.floor(Math.random()*GIVEN.length)],title:sk>=3?'부목사':'전도사',field:fk,skill:sk,pay:pay,fee:pay*4};
}
function refreshCands(){S.cands=[makeCand(),makeCand(),makeCand()];S.candWeek=S.week;}
function assocSlots(){return Math.min(5,1+Math.floor(S.members/50));}
function assocPay(){return S.assoc.reduce(function(t,a){return t+a.pay;},0);}
function hireAssoc(i){
  var c=S.cands[i];if(!c)return '후보가 없어요';
  if(S.assoc.length>=assocSlots())return '지금 성도 수로는 '+assocSlots()+'명까지 청빙할 수 있어요';
  if(S.money<c.fee)return '청빙 비용이 부족해요';
  S.money-=c.fee;S.assoc.push(c);S.cands.splice(i,1);recalc();save();return '';
}
function dismissAssoc(i){
  var a=S.assoc[i];if(!a)return false;
  S.assoc.splice(i,1);S.tempMood-=3;recalc();save();addLog(a.name+' '+a.title+'님이 사임했어요');return true;
}
function searchCands(){if(S.money<100)return '자금이 부족해요';S.money-=100;refreshCands();save();return '';}

/* ---------- 직분자 ---------- */
var OFFICE={
  deacon:{name:'집사',per:8,cost:150,goal:1,desc:'목양 수용력 +6, 운영비 -1% (최대 -12%)'},
  kwonsa:{name:'권사',per:15,cost:300,goal:2,desc:'목양 수용력 +10, 만족 +0.4 (최대 +6)'},
  elder:{name:'장로',per:25,cost:600,goal:3,desc:'목양 수용력 +18, 이탈 -2% (최대 -20%), 평판 +0.1/주'}
};
function offTotal(s){s=s||S;return (s.off.deacon||0)+(s.off.kwonsa||0)+(s.off.elder||0);}
function officeMax(k){return Math.floor(S.members/OFFICE[k].per);}
function appoint(k){
  var o=OFFICE[k];
  if(o.goal>S.goal)return lockText(o.goal)+' 임명할 수 있어요';
  if(S.off[k]>=officeMax(k))return '성도 '+o.per+'명마다 '+o.name+' 한 명을 세울 수 있어요';
  if(S.money<o.cost)return '임직식 비용이 부족해요';
  S.money-=o.cost;S.off[k]++;recalc();save();return '';
}

/* ---------- 특별행사 ---------- */
// season: [시작 주, 끝 주] (한 해 52주 중, 1부터). need(): 조건이 안 되면 이유 문장
var EVENTS={
  smallgroup:{name:'소그룹 모임',cost:150,cd:2,dur:2,goal:0,desc:'2주간 만족 +6, 이탈 -30%',
    need:function(){var n=Math.ceil(Math.min(20,S.members*0.25));return A.fcap>=n?'':'교제 공간이 '+n+' 이상 필요해요';},mods:function(m){m.mood+=6;m.loss*=0.7;}},
  communion:{name:'성찬식',cost:200,cd:4,dur:2,goal:0,desc:'영성(성례) 크게 ↑, 2주간 만족 +4',
    need:function(){return A.seats>=S.members*0.6?'':'좌석이 성도의 60% 이상 필요해요';},mods:function(m){m.mood+=4;}},
  baptism:{name:'세례식',cost:300,cd:6,dur:4,goal:0,desc:'영성(성례) ↑, 평판 +4, 4주간 새 성도 정착(이탈 -25%, 만족 +2)',
    need:function(){return S.newSinceBap>=3?'':'지난 세례 뒤 새 성도가 3명 이상 필요해요 (지금 '+S.newSinceBap+'명)';},
    now:function(){S.rep=clamp(S.rep+4,0,100);S.newSinceBap=0;},mods:function(m){m.loss*=0.75;m.mood+=2;}},
  street:{name:'노방전도',cost:250,cd:3,dur:2,goal:0,desc:'2주간 방문자 +40%',mods:function(m){m.vis*=1.4;}},
  bazaar:{name:'바자회',cost:300,cd:8,dur:0,goal:1,desc:'수익 600 + 성도×12, 평판 +2',
    now:function(){var g=600+S.members*12;S.money+=g;S.weekInc+=g;S.rep=clamp(S.rep+2,0,100);}},
  service:{name:'지역 봉사의 날',cost:400,cd:6,dur:0,goal:1,desc:'평판 +6 (선교팀 단계마다 +50%)',
    now:function(){S.rep=clamp(S.rep+6*(1+0.5*S.staff.mission),0,100);}},
  retreat:{name:'수련회',cost:1500,cd:12,dur:3,goal:2,desc:'영성(성례) ↑, 3주간 만족 +12, 이탈 -50% (비용 1,500 + 성도×15)',
    costFn:function(){return 1500+S.members*15;},mods:function(m){m.mood+=12;m.loss*=0.5;}},
  revival:{name:'부흥회',cost:3000,cd:16,dur:1,goal:3,desc:'1주간 방문자 +120%, 정착률 +50%',
    need:function(){return A.seats>=80?'':'좌석이 80석 이상 필요해요';},mods:function(m){m.vis*=2.2;m.join*=1.5;}},
  easter:{name:'부활절 연합예배',season:[12,16],cost:500,cd:20,dur:1,goal:0,desc:'방문자 +60%, 헌금 +30%',mods:function(m){m.vis*=1.6;m.offer*=1.3;}},
  vbs:{name:'여름성경학교',season:[26,33],cost:800,cd:20,dur:2,goal:1,desc:'2주간 가족 방문자 +30%, 돌봄 효과 +20%',
    need:function(){return A.kcap>=10?'':'돌봄 공간이 10 이상 필요해요';},mods:function(m){m.vis*=1.3;m.care*=1.2;}},
  thanks:{name:'추수감사 예배',season:[44,47],cost:300,cd:20,dur:1,goal:0,desc:'헌금 +50%, 만족 +5',mods:function(m){m.offer*=1.5;m.mood+=5;}},
  christmas:{name:'성탄 축하 예배',season:[49,52],cost:800,cd:20,dur:1,goal:0,desc:'방문자 +80%, 만족 +6',mods:function(m){m.vis*=1.8;m.mood+=6;}},
  joint:{name:'연합 행사',hidden:true,cost:0,cd:0,dur:2,goal:0,desc:'',mods:function(m){m.vis*=1.2;}}
};
function weekOfYear(){return S.week%52+1;}
function evCost(e){return e.costFn?e.costFn():e.cost;}
function evState(id){return S.ev[id]||(S.ev[id]={cd:0,left:0});}
// 열 수 없으면 이유, 열 수 있으면 ''
function evBlock(id){
  var e=EVENTS[id],st=evState(id);
  if((e.goal||0)>S.goal)return lockText(e.goal)+' 열 수 있어요';
  if(e.season){var w=weekOfYear();if(w<e.season[0]||w>e.season[1])return e.season[0]+'~'+e.season[1]+'주에만 열 수 있어요';}
  if(st.left>0)return '진행 중이에요';
  if(st.cd>0)return st.cd+'주 뒤에 다시 열 수 있어요';
  if(S.money<evCost(e))return '자금이 부족해요';
  return e.need?e.need():'';
}
function runEvent(id){
  var why=evBlock(id);if(why)return why;
  var e=EVENTS[id],st=evState(id);
  S.money-=evCost(e);
  if(e.now)e.now();
  st.left=e.dur;st.cd=e.cd;if(!e.hidden)S.lastEv=S.week;
  // 영성(성례)은 언제 열었는지로 계산한다
  S.evW=S.evW||{};S.evW[id]=S.week;
  addLog(e.name+'을(를) 열었어요');recalc();save();return '';
}
function evIdleWeeks(){return S.week<8?0:S.week-(S.lastEv||0);}
function activeEvents(){return Object.keys(S.ev).filter(function(id){return S.ev[id].left>0&&EVENTS[id];});}

/* ---------- 목양 수용력과 각종 효과를 MOD로 모은다 ---------- */
var MOD={vis:1,join:1,mood:0,loss:1,offer:1,rep:0,word:1,care:1,upkeep:1,decay:1,cap:25};
function refreshMods(){
  var st=S.staff,m={vis:1,join:1,mood:0,loss:1,offer:1,rep:0,word:1,care:1,upkeep:1,decay:1,cap:25};
  m.vis*=(1+0.2*st.evang)*(1+0.12*st.media)*(1+0.06*st.edu);
  m.join*=(1+0.1*st.evang)*(1+0.12*st.newcomer);
  // 만족도에 더하고 빼는 것들을 이름과 함께 남겨 현황에서 설명한다
  var mp=[],part=function(n,v){if(Math.abs(v)>=0.05)mp.push([n,v]);m.mood+=v;};
  part('사역팀 (찬양·돌봄·중보기도)',2*st.praise+st.care+2*st.prayer);
  m.offer*=1+0.12*st.praise;m.word*=1+0.06*st.praise;
  m.care*=(1+0.15*st.care)*(1+0.12*st.edu);
  m.cap+=8*st.care;m.loss*=1-0.04*st.prayer;
  m.decay*=1-0.2*st.admin;m.upkeep*=1-0.04*st.admin;m.loss*=1-0.05*st.newcomer;
  m.rep+=0.2*st.media+0.5*st.mission;
  S.assoc.forEach(function(a){
    m.cap+=35;var k=a.skill;
    if(a.field==='edu')m.care*=1+0.04*k;
    else if(a.field==='praise'){m.word*=1+0.04*k;part('찬양 부교역자',0.6*k);}
    else if(a.field==='visit'){m.cap+=12*k;m.loss*=1-0.03*k;}
    else if(a.field==='admin'){m.upkeep*=1-0.03*k;m.decay*=1-0.06*k;}
    else if(a.field==='mission'){m.vis*=1+0.04*k;m.rep+=0.15*k;}
  });
  var o=S.off;
  m.cap+=6*o.deacon+10*o.kwonsa+18*o.elder;
  m.upkeep*=1-Math.min(0.12,0.01*o.deacon);
  part('권사',Math.min(6,0.4*o.kwonsa));
  m.loss*=1-Math.min(0.2,0.02*o.elder);
  m.rep+=Math.min(1,0.1*o.elder);
  var em=m.mood;activeEvents().forEach(function(id){if(EVENTS[id].mods)EVENTS[id].mods(m);});
  var ev=m.mood-em;m.mood=em;part('진행 중인 행사',ev);
  // 행사를 오래 열지 않으면 공동체가 침체된다
  var idle=evIdleWeeks();if(idle>6)part('행사를 연 지 '+idle+'주 (침체)',-Math.min(15,(idle-6)*1.5));
  // 많이 낡은 건물이 늘수록 성도 만족이 떨어진다
  var worn=S.buildings.filter(function(b){return wearStage(b)>=3;}).length;part('검은 연기 나는 낡은 건물 '+worn+'곳',-Math.min(12,worn*1.2));
  part('최근 일 (고민 선택·행사 여운)',S.tempMood);
  // 지난주 방문자가 겪은 불편(화장실·쉴 자리·삭막함 등)
  part('지난주 방문자 불편',-(S.gripPen||0));
  m.parts=mp;
  MOD=m;
}
/* ---------- 목회 고민거리: 가끔 선택을 묻는 카드가 뜨고, 고르는 동안 게임이 멈춘다 ---------- */
function anyBld(){return S.buildings.filter(function(b){return maintainable(b);});}
var DILEMMAS=[
  {id:'feud',t:'집사들의 다툼',x:'두 집사가 예배 순서 문제로 크게 다퉜어요. 성도들이 눈치를 보고 있어요.',ok:function(){return S.off.deacon>=2;},
    o:[{l:'직접 중재한다',d:'자금 -150 (상담·식사 자리)',f:function(){S.money-=150;}},
       {l:'장로에게 맡긴다',d:'장로가 있어야 해요',ok:function(){return S.off.elder>0;},f:function(){}},
       {l:'시간이 해결하게 둔다',d:'만족 -8, 성도 -2',f:function(){S.tempMood-=8;S.members=Math.max(0,S.members-2);}}]},
  {id:'parking',t:'주차 민원',x:'이웃 주민이 주일마다 골목이 막힌다며 민원을 넣었어요.',ok:function(){return S.members>=20;},
    o:[{l:'주차 안내 봉사를 세운다',d:'자금 -200, 평판 +1',f:function(){S.money-=200;S.rep+=1;}},
       {l:'사과만 한다',d:'평판 -3',f:function(){S.rep-=3;}}]},
  {id:'donor',t:'조건 붙은 큰 헌금',x:'한 사업가가 5,000을 헌금하겠다며 교회 운영에 참여하고 싶어 해요.',ok:function(){return S.week>=6;},
    o:[{l:'받는다',d:'자금 +5,000, 만족 -6, 평판 -2',f:function(){S.money+=5000;S.weekInc+=5000;S.tempMood-=6;S.rep-=2;}},
       {l:'정중히 사양한다',d:'평판 +2, 만족 +2',f:function(){S.rep+=2;S.tempMood+=2;}}]},
  {id:'joint',t:'연합 행사 제안',x:'이웃 교회가 함께 지역 행사를 열자고 제안했어요.',
    o:[{l:'함께한다',d:'자금 -400, 2주간 방문자 +20%, 평판 +3',f:function(){S.money-=400;S.rep+=3;evState('joint').left=2;}},
       {l:'이번엔 사양한다',d:'변화 없음',f:function(){}}]},
  {id:'illness',t:'성도 가정의 위기',x:'한 성도 가정에 큰 병이 생겼어요.',
    o:[{l:'심방하고 돕는다',d:'자금 -300, 만족 +5, 평판 +2',f:function(){S.money-=300;S.tempMood+=5;S.rep+=2;}},
       {l:'기도를 부탁한다',d:'만족 -4',f:function(){S.tempMood-=4;}}]},
  {id:'youth',t:'청년들의 이탈 조짐',x:'청년들이 예배가 지루하다며 하나둘 빠지고 있어요.',ok:function(){return S.members>=30;},
    o:[{l:'청년 예배를 새로 연다',d:'자금 -600, 만족 +4',f:function(){S.money-=600;S.tempMood+=4;}},
       {l:'지금 방식을 지킨다',d:'성도 -3',f:function(){S.members=Math.max(0,S.members-3);}}]},
  {id:'leak',t:'지붕 누수',x:'건물 지붕에서 비가 새기 시작했어요.',ok:function(){return anyBld().length>0;},
    o:[{l:'바로 고친다',d:'자금 -400',f:function(){S.money-=400;}},
       {l:'다음에 고친다',d:'그 건물 상태 -30',f:function(){var b=bById(S.dlgB);if(b)b.cond=Math.max(0,(b.cond==null?100:b.cond)-30);}}]}
];
function dlgById(id){for(var i=0;i<DILEMMAS.length;i++)if(DILEMMAS[i].id===id)return DILEMMAS[i];return null;}
function rollDilemma(){
  if(S.dlg||S.week<4||Math.random()>=0.12)return;
  var pool=DILEMMAS.filter(function(d){return !d.ok||d.ok();});
  if(!pool.length)return;
  var d=pool[Math.floor(Math.random()*pool.length)];
  S.dlg=d.id;
  if(d.id==='leak'){var bs=anyBld();S.dlgB=bs[Math.floor(Math.random()*bs.length)].id;}
}
function chooseDlg(i){
  var d=dlgById(S.dlg);if(!d)return '';
  var o=d.o[i];if(!o)return '';
  if(o.ok&&!o.ok())return o.d;
  o.f();S.rep=clamp(S.rep,0,100);
  addLog(d.t+' · '+o.l);S.dlg=null;S.dlgB=0;recalc();save();return '';
}

/* ---------- 건물 노후와 수리 ---------- */
function maintainable(b){var k=D[b.def]&&D[b.def].kind;return k==='bld'||k==='mroom';}
function condOf(b){return b.cond==null?100:b.cond;}
/* 노후 단계: 지도에 보이는 표시와 효율이 함께 바뀐다
   80% 이하 거미줄·효율 90% → 70% 이하 하얀 연기·75% → 60% 이하 검은 연기·55% */
function wearStage(b){if(!maintainable(b))return 0;var c=condOf(b);return c<=60?3:(c<=70?2:(c<=80?1:0));}
var WEAR_EFF=[1,.9,.75,.55],WEAR_NAME=['','거미줄','하얀 연기','검은 연기'];
function condFactor(b){return WEAR_EFF[wearStage(b)];}
// 노후·수리: 한 주에 기본 0.8 + 이용 한 번에 0.008씩 낡고(관리팀·행정 부교역자가 줄여 줌), 수리비는 낡은 만큼 건물 값의 10%까지
var DECAY_BASE=0.8,DECAY_USE=0.008,REPAIR_K=0.1;
function repairCost(b){return Math.round(defOf(b).cost*REPAIR_K*(100-condOf(b))/100);}
function repair(b){
  var c=repairCost(b);if(c<=0)return '고칠 곳이 없어요';
  if(S.money<c)return '수리비가 부족해요';
  S.money-=c;b.cond=100;recalc();save();return '';
}
function needRepair(){return S.buildings.filter(function(b){return wearStage(b)>0;});}
function repairAll(){
  var list=needRepair(),cost=list.reduce(function(t,b){return t+repairCost(b);},0);
  if(!list.length)return '고칠 건물이 없어요';
  if(S.money<cost)return '수리비 '+fmt(cost)+'이(가) 필요해요';
  list.forEach(function(b){S.money-=repairCost(b);b.cond=100;});recalc();save();return '';
}
function decayWeek(){
  S.buildings.forEach(function(b){
    if(!maintainable(b))return;
    b.cond=Math.max(0,condOf(b)-(DECAY_BASE+(b.weekUses||0)*DECAY_USE)*MOD.decay);
    b.weekUses=0;
  });
}
