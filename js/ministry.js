'use strict';
/* ---------- 목회 운영 ----------
   난이도 · 잠금 해제 · 부교역자 청빙 · 직분자 임명 · 목양 수용력
   · 특별행사 · 목회 고민거리(선택 카드) · 건물 노후와 수리.
   여기서 계산한 효과는 MOD에 모이고, 시뮬레이션·만족도·방문자가 MOD를 읽는다. */

/* ---------- 난이도 ---------- */
var DIFF={
  easy:{name:'테스트',money:50000,cost:.8,churn:.7,desc:'자금 50,000으로 넉넉하게 시험해 봅니다'},
  normal:{name:'보통',money:20000,cost:1,churn:1,desc:'적은 자금에서 차근차근 세워 갑니다'},
  hard:{name:'어려움',money:14000,cost:1.2,churn:1.25,desc:'더 적은 자금, 더 높은 운영비와 이탈'}
};
function curDiff(){return DIFF[S.diff]||DIFF.normal;}

function lastNet(s){var h=s.hist[s.hist.length-1];return h?h.inc-h.exp:0;}
// 목표를 n개 이루면 열리는 것들 (건물 id)
var UNLOCK={
  chapel:1,hall:1,kids:1,lot:1,praise:1,books:1,nursery:1,picnic:1,
  dining:2,youth:2,elder:2,counsel:2,pantry:2,lounge:2,nurse:2,spire:2,study:2,gazebo:2,playground:2,shop:2,
  badminton:1,jokgu:1,gateball:1,calli:1,art:1,
  hoops:2,craft:2,cook:2,band:2,choir:2,
  futsal:3,grand:3,clinic:3,dawn:3,mission:3,gym:3,foodbank:3,parktower:3,outdoor:3
};
/* 교회 Level이 오르면 열리는 꾸미기: 목표는 기능 건물을, Level은 아름다움이 큰 꾸미기를 연다.
   값싼 기본 꾸미기(화단·나무·울타리 등)는 처음부터 열려 있다 */
var LV_UNLOCK={
  cherry:2,maple:2,lantern:2,stringlight:2,
  ginkgo:3,lamp2:3,birdbath:3,
  lilypond:4,rosearch:4,bridge_w:4,
  stonelamp:5,bridge_a:5,
  fountain:6,bell:7,pond:8,statue:10
};
function lockGoal(id){return UNLOCK[id]||0;}
function lockLv(id){return LV_UNLOCK[id]||0;}
// 지금 열려 있는 교회 Level (S.unlockAll은 시험·점검용으로 모두 여는 스위치)
function unlockLevel(){return S.unlockAll?999:(S.lvl||1);}
// 목록의 n번째 단계(예전 목표 n개째)가 열렸는지: LV_TIER[n]
function tierOk(n){return !n||unlockLevel()>=LV_TIER[n];}
function isLocked(id){return (D[id]&&D[id].retired)||!tierOk(lockGoal(id))||lockLv(id)>unlockLevel();}
function lockText(n){return '교회 Lv '+LV_TIER[n]+' 달성 후';}
// 건물 잠금 문구 (short: 카드 가격 자리에 넣는 짧은 꼴)
function lockLabel(id,short){
  if(D[id]&&D[id].retired)return short?'통합됨':'다른 시설로 통합돼 더는';
  if(!tierOk(lockGoal(id)))return short?'Lv '+LV_TIER[lockGoal(id)]+' 후':lockText(lockGoal(id));
  return 'Lv '+lockLv(id)+(short?' 후':' 달성 후');
}
// Level L이 되면 새로 열리는 꾸미기 이름
function lvUnlockNames(L){var o=[];for(var id in LV_UNLOCK)if(LV_UNLOCK[id]===L&&D[id])o.push(D[id].name);return o;}
// 단계 n이 열릴 때 새로 열리는 것들의 이름
function unlockNames(n){
  var out=[];
  for(var id in UNLOCK)if(UNLOCK[id]===n)out.push(D[id]?D[id].name:id);
  for(var k in STAFF)if((STAFF[k].goal||0)===n&&n>0)out.push(STAFF[k].name);
  for(var e in EVENTS)if((EVENTS[e].goal||0)===n&&n>0&&!EVENTS[e].hidden)out.push(EVENTS[e].name);
  return out;
}
// 교회 Level L에 열리는 단계의 이름들
function tierNames(L){var out=[];for(var t=1;t<LV_TIER.length;t++)if(LV_TIER[t]===L)out=out.concat(unlockNames(t));return out;}

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
// 직분은 성도 화면에서 한 사람씩 세운다 (people.js). 여기는 직분마다의 효과 설명
var OFFICE={
  deacon:{name:'집사',desc:'목양 수용력 +6, 운영비 -1% (최대 -12%)'},
  kwonsa:{name:'권사',desc:'목양 수용력 +10, 만족 +0.4 (최대 +6)'},
  elder:{name:'장로',desc:'목양 수용력 +18, 이탈 -2% (최대 -20%), 평판 +0.1/주'},
  cstaff:{name:'교회직원',desc:'운영비 −3%, 건물 노후 −5% (섬김 갈래 합쳐 최대 −25%·−40%)'}
};
function offTotal(s){s=s||S;return (s.off.deacon||0)+(s.off.kwonsa||0)+(s.off.elder||0)+(s.off.cstaff||0);}

/* ---------- 특별행사 ----------
   행사 화면(screens.js)에서 고른다. 시작하면 값을 내고, 소요 시간(dur 주, 게임 속 시간) 동안 진행 효과(mods)가 적용된다.
   시간이 다 차면 '보상 수령'을 눌러야 마무리 보상(rw)을 받고, 그때부터 쉬는 기간(cd 주)이 지나야 다시 열 수 있다.
   season: [시작 월, 끝 월] (1~12월). need(): 조건이 안 되면 이유 문장. rw(): 마무리 보상을 주고 받은 것들을 글로 돌려준다
   상태 S.ev[id] = {cd, run(진행 중이거나 보상 대기), t0(시작), end(끝), ready(보상 대기)}  (시각은 주 단위 실수: evNow()) */
function evNow(){return S.week+S.t/WEEK;}
function rwMoney(v){v=Math.round(v);S.money+=v;S.weekInc+=v;return '자금 +'+fmt(v);}
function rwRep(v){gainRep(v);return '평판 +'+v;}
function rwMood(v){S.tempMood+=v;return '만족 +'+v;}
function eduRw(k){var x=EDU_EV[k].xp,n=ppGainAll(x);return '모든 성도 경험치 +'+x+(n?' ('+n+'명 레벨 업)':'');}
var EVENTS={
  smallgroup:{name:'소그룹 모임',ic:'🫖',col:'#6fa86a',cost:150,cd:2,dur:2,goal:0,desc:'가정과 교회에서 모여 삶을 나눠요',fx:'만족 +6, 이탈 -30%',rwt:'만족 +2',
    need:function(){var n=Math.ceil(Math.min(20,S.members*0.25));return A.fcap>=n?'':'교제 공간이 '+n+' 이상 필요해요';},mods:function(m){m.mood+=6;m.loss*=0.7;},rw:function(){return [rwMood(2)];}},
  bible:{name:'성경공부',ic:'📖',col:'#5a74b8',cost:EDU_EV.bible.base,cd:3,dur:1,goal:0,edu:'bible',desc:'함께 말씀을 읽고 나눠요',fx:'말씀 효과 +10%',rwt:'모든 성도 경험치 +'+EDU_EV.bible.xp,
    costFn:function(){return EDU_EV.bible.base+S.members*EDU_EV.bible.per;},mods:function(m){m.word*=1.1;},rw:function(){return [eduRw('bible')];}},
  creed:{name:'교리공부',ic:'📜',col:'#8a6a46',cost:EDU_EV.creed.base,cd:6,dur:2,goal:1,edu:'creed',desc:'신앙의 기초를 차근차근 배워요',fx:'말씀 효과 +10%',rwt:'모든 성도 경험치 +'+EDU_EV.creed.xp,
    costFn:function(){return EDU_EV.creed.base+S.members*EDU_EV.creed.per;},mods:function(m){m.word*=1.1;},rw:function(){return [eduRw('creed')];}},
  training:{name:'제자훈련 세미나',ic:'🎓',col:'#2f8f9d',cost:EDU_EV.training.base,cd:12,dur:3,goal:2,edu:'training',desc:'강사를 모시고 온 교회가 제자훈련을 받아요',fx:'말씀 효과 +15%, 만족 +2',rwt:'모든 성도 경험치 +'+EDU_EV.training.xp,
    costFn:function(){return EDU_EV.training.base+S.members*EDU_EV.training.per;},mods:function(m){m.word*=1.15;m.mood+=2;},rw:function(){return [eduRw('training')];}},
  communion:{name:'성찬식',ic:'🍞',col:'#b0763f',cost:200,cd:4,dur:2,goal:0,desc:'떡과 잔을 나누며 은혜를 기억해요 (세례는 성도 화면에서 한 사람씩 베풀어요)',fx:'영성(성례) 크게 ↑, 만족 +4',rwt:'만족 +2',
    need:function(){return A.seats>=S.members*0.6?'':'좌석이 성도의 60% 이상 필요해요';},mods:function(m){m.mood+=4;},rw:function(){return [rwMood(2)];}},
  street:{name:'노방전도',ic:'📣',col:'#d98a3a',cost:250,cd:3,dur:2,goal:0,desc:'거리에서 이웃을 만나 교회를 소개해요',fx:'방문자 +40%',rwt:'평판 +1',mods:function(m){m.vis*=1.4;},rw:function(){return [rwRep(1)];}},
  bazaar:{name:'바자회',ic:'🛍️',col:'#c9627a',cost:300,cd:8,dur:3/7,goal:1,desc:'물건을 모아 팔고 수익으로 이웃을 도와요',fx:'',rwt:'수익 600 + 성도×12, 평판 +2',
    rw:function(){return [rwMoney(600+S.members*12),rwRep(2)];}},
  service:{name:'지역 봉사의 날',ic:'🧹',col:'#4f9a83',cost:400,cd:6,dur:3/7,goal:1,desc:'동네를 청소하고 이웃을 섬겨요',fx:'',rwt:'평판 +6 (선교팀 단계마다 +50%)',
    rw:function(){return [rwRep(Math.round(6*(1+0.5*teamEff().mission)))];}},
  retreat:{name:'수련회',ic:'⛺',col:'#5c8a48',cost:1500,cd:12,dur:3,goal:2,desc:'온 교회가 함께 떠나 말씀과 쉼을 누려요 (비용 1,500 + 성도×15)',fx:'영성(성례) ↑, 만족 +12, 이탈 -50%',rwt:'만족 +3',
    costFn:function(){return 1500+S.members*15;},mods:function(m){m.mood+=12;m.loss*=0.5;},rw:function(){return [rwMood(3)];}},
  revival:{name:'부흥회',ic:'🔥',col:'#d65a4a',cost:3000,cd:16,dur:1,goal:3,desc:'강사를 모시고 온 동네를 초청해요',fx:'방문자 +120%, 정착률 +50%',rwt:'평판 +3',
    need:function(){return A.seats>=80?'':'좌석이 80석 이상 필요해요';},mods:function(m){m.vis*=2.2;m.join*=1.5;},rw:function(){return [rwRep(3)];}},
  easter:{name:'부활절 연합예배',ic:'🌷',col:'#b98bd6',season:[4,4],cost:500,cd:20,dur:1,goal:0,desc:'부활의 아침을 이웃 교회와 함께 맞아요',fx:'방문자 +60%, 헌금 +30%',rwt:'평판 +2',mods:function(m){m.vis*=1.6;m.offer*=1.3;},rw:function(){return [rwRep(2)];}},
  vbs:{name:'여름성경학교',ic:'🎒',col:'#e0a030',season:[7,8],cost:800,cd:20,dur:2,goal:1,desc:'동네 아이들을 초대해 여름을 함께 보내요',fx:'가족 방문자 +30%, 돌봄 효과 +20%',rwt:'평판 +2',
    need:function(){return A.kcap>=10?'':'돌봄 공간이 10 이상 필요해요';},mods:function(m){m.vis*=1.3;m.care*=1.2;},rw:function(){return [rwRep(2)];}},
  thanks:{name:'추수감사 예배',ic:'🌾',col:'#c08a2e',season:[11,11],cost:300,cd:20,dur:1,goal:0,desc:'한 해의 열매를 감사하며 드려요',fx:'헌금 +50%, 만족 +5',rwt:'감사 헌금 300 + 성도×4',mods:function(m){m.offer*=1.5;m.mood+=5;},rw:function(){return [rwMoney(300+S.members*4)];}},
  christmas:{name:'성탄 축하 예배',ic:'🎄',col:'#3f7a52',season:[12,12],cost:800,cd:20,dur:1,goal:0,desc:'성탄의 기쁨을 온 동네와 나눠요',fx:'방문자 +80%, 만족 +6',rwt:'평판 +3',mods:function(m){m.vis*=1.8;m.mood+=6;},rw:function(){return [rwRep(3)];}},
  joint:{name:'연합 행사',hidden:true,auto:true,cost:0,cd:0,dur:2,goal:0,desc:'',mods:function(m){m.vis*=1.2;}}
};
// 달력 (balance.js WEEKS_PER_MONTH·YEAR_WEEKS): 몇 년차 몇 월 몇 주
function weekOfYear(w){return (w==null?S.week:w)%YEAR_WEEKS+1;}
function monthOf(w){return Math.floor((weekOfYear(w)-1)/WEEKS_PER_MONTH)+1;}
function weekInMonth(w){return (weekOfYear(w)-1)%WEEKS_PER_MONTH+1;}
function yearOf(w){return Math.floor((w==null?S.week:w)/YEAR_WEEKS)+1;}
function dateText(w,withYear){return (withYear?yearOf(w)+'년차 ':'')+monthOf(w)+'월 '+weekInMonth(w)+'주';}
function evCost(e){return e.costFn?e.costFn():e.cost;}
function evState(id){
  var st=S.ev[id]||(S.ev[id]={cd:0});
  // 예전 저장(남은 주 left로 세던 때)을 지금 꼴로
  if(st.left>0&&st.end==null){st.run=true;st.t0=evNow();st.end=st.t0+st.left;st.ready=false;}
  if(st.left!=null)delete st.left;
  return st;
}
// 진행 중(효과가 적용되는 동안) / 끝나서 보상을 기다리는 중 / 얼마나 찼는지(0~1) / 남은 시간 글
function evRunning(id){var st=S.ev[id];return !!(st&&st.run&&!st.ready&&st.end!=null);}
function evReady(id){var st=S.ev[id];return !!(st&&st.run&&st.ready);}
function evProg(id){var st=S.ev[id];if(!st||!st.run)return 0;if(st.ready)return 1;return clamp((evNow()-st.t0)/Math.max(1e-6,st.end-st.t0),0,1);}
function durText(w){var d=Math.max(1,Math.round(w*7));return d>=7&&d%7===0?(d/7)+'주':(d>7?Math.floor(d/7)+'주 '+(d%7)+'일':d+'일');}
function evLeftText(id){var st=S.ev[id];if(!st||!st.run||st.ready)return '';return durText(Math.max(1/7,st.end-evNow()));}
function evSeasonText(e){return e.season?(e.season[0]===e.season[1]?e.season[0]+'월':e.season[0]+'~'+e.season[1]+'월'):'';}
// 열 수 없으면 이유, 열 수 있으면 ''
function evBlock(id){
  var e=EVENTS[id],st=evState(id);
  if(!tierOk(e.goal||0))return lockText(e.goal)+' 열 수 있어요';
  if(st.run)return st.ready?'보상을 먼저 받아 주세요':'진행 중이에요';
  if(e.season){var mo=monthOf();if(mo<e.season[0]||mo>e.season[1])return evSeasonText(e)+'에만 열 수 있어요';}
  if(st.cd>0)return st.cd+'주 뒤에 다시 열 수 있어요';
  if(S.money<evCost(e))return '자금이 부족해요';
  return e.need?e.need():'';
}
function evBegin(id){var e=EVENTS[id],st=evState(id);st.run=true;st.ready=false;st.t0=evNow();st.end=st.t0+e.dur;}
function runEvent(id){
  var why=evBlock(id);if(why)return why;
  var e=EVENTS[id];
  S.money-=evCost(e);
  if(e.now)e.now();
  evBegin(id);if(!e.hidden)S.lastEv=S.week;
  // 영성(성례)은 언제 열었는지로 계산한다
  S.evW=S.evW||{};S.evW[id]=S.week;
  // 지난번과 다른 행사면 '새로 한 일', 바람으로 바라던 행사면 들어준 것
  if(!e.hidden){if(S.lastEvId!==id)noteNew();S.lastEvId=id;if(S.wish&&S.wish.t==='event'&&S.wish.id===id)S.wishRan=id;}
  addLog(e.name+'을(를) 열었어요');recalc();save();return '';
}
// 0.5초마다: 시간이 다 찬 행사는 효과를 멈추고 보상 대기로 (자동 행사는 그냥 끝난다)
function evTick(){
  var now=evNow(),ch=false;
  for(var id in S.ev){var st=S.ev[id],e=EVENTS[id];if(!e||!st.run||st.ready||st.end==null||now<st.end)continue;
    ch=true;
    if(e.auto||!e.rw){st.run=false;st.cd=e.cd||0;continue;}
    st.ready=true;toast(e.name+'이(가) 끝났어요 · 행사에서 보상을 받으세요',2600);sfx('bell',.5,0);
  }
  if(ch){recalc();save();if(typeof syncEvBadge==='function')syncEvBadge();if(UI.scr&&typeof renderScreen==='function')renderScreen();}
}
// 보상 수령: 마무리 보상을 주고 쉬는 기간을 시작한다. 받은 것들의 글 목록(못 받으면 null)
function claimEvent(id){
  var e=EVENTS[id],st=S.ev[id];if(!e||!st||!st.run||!st.ready)return null;
  var got=e.rw?e.rw():[];
  st.run=false;st.ready=false;st.cd=e.cd||0;
  S.evW=S.evW||{};S.evW[id]=S.week;
  addLog(e.name+' 마무리 · '+(got.join(', ')||'보상 없음'));recalc();save();
  return got;
}
// 보상을 기다리는 행사를 한꺼번에 수령한다: {n: 받은 행사 수, got: 받은 것들의 글 목록}
function claimAllEvents(){
  var o={n:0,got:[]};
  Object.keys(S.ev).forEach(function(id){if(!evReady(id)||!EVENTS[id]||EVENTS[id].hidden)return;var g=claimEvent(id);if(g){o.n++;o.got=o.got.concat(g);}});
  return o;
}
function evReadyCount(){var n=0;for(var id in S.ev)if(evReady(id)&&EVENTS[id]&&!EVENTS[id].hidden)n++;return n;}
function evIdleWeeks(){return S.week<8?0:S.week-(S.lastEv||0);}
function activeEvents(){return Object.keys(S.ev).filter(function(id){return EVENTS[id]&&evRunning(id);});}

/* ---------- 목양 수용력과 각종 효과를 MOD로 모은다 ---------- */
var MOD={vis:1,join:1,mood:0,loss:1,offer:1,rep:0,word:1,care:1,upkeep:1,decay:1,cap:25};
function refreshMods(){
  var st=teamEff(),m={vis:1,join:1,mood:0,loss:1,offer:1,rep:0,word:1,care:1,upkeep:1,decay:1,cap:25};
  m.vis*=(1+0.2*st.evang)*(1+0.12*st.media)*(1+0.06*st.edu);
  m.join*=(1+0.1*st.evang)*(1+0.12*st.newcomer);
  // 만족도에 더하고 빼는 것들을 이름과 함께 남겨 현황에서 설명한다
  var mp=[],part=function(n,v){if(Math.abs(v)>=0.05)mp.push([n,v]);m.mood+=v;};
  part('사역팀 (찬양·돌봄·중보기도)',st.praise+.5*st.care+st.prayer);
  m.offer*=1+0.12*st.praise;m.word*=1+0.06*st.praise;
  m.care*=(1+0.15*st.care)*(1+0.12*st.edu);
  m.cap+=8*st.care;m.loss*=1-0.04*st.prayer;
  m.decay*=Math.max(.2,1-0.2*st.admin);m.upkeep*=1-0.04*st.admin;m.loss*=1-0.05*st.newcomer;
  m.rep+=0.2*st.media+0.5*st.mission;
  S.assoc.forEach(function(a){
    m.cap+=35;var k=asSkill(a);
    if(a.field==='edu')m.care*=1+0.04*k;
    else if(a.field==='praise'){m.word*=1+0.04*k;part('찬양 부교역자',0.6*k);}
    else if(a.field==='visit'){m.cap+=12*k;m.loss*=1-0.03*k;}
    else if(a.field==='admin'){m.upkeep*=1-0.03*k;m.decay*=1-0.06*k;}
    else if(a.field==='mission'){m.vis*=1+0.04*k;m.rep+=0.15*k;}
  });
  var o=S.off;
  m.cap+=6*o.deacon+10*o.kwonsa+18*o.elder+PA.cap;
  m.offer*=ppGiveK();
  m.upkeep*=1-Math.min(0.12,0.01*o.deacon);
  // 섬김 갈래(섬김이·사역팀장·사역부장·교회직원): 운영비·노후를 줄인다
  m.upkeep*=1-PA.upk;m.decay*=1-PA.dec;
  part('권사',Math.min(6,0.4*o.kwonsa));
  m.loss*=1-Math.min(0.2,0.02*o.elder);
  m.rep+=Math.min(1,0.1*o.elder);
  var em=m.mood;activeEvents().forEach(function(id){if(EVENTS[id].mods)EVENTS[id].mods(m);});
  var ev=m.mood-em;m.mood=em;part('진행 중인 행사',ev);
  // 행사를 오래 열지 않으면 공동체가 침체된다
  // 매너리즘: 새로 하는 일이 없으면 조금씩 내려간다
  var stale=stalePen();if(stale>0)part('매너리즘 (새로 한 일 없이 '+(S.week-(S.lastNew||0))+'주)',-stale);
  if(S.wishLeft>0&&S.wishMood)part(S.wishMood>0?'성도들의 바람을 들어줌':'성도들의 바람을 놓침',S.wishMood);
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
    o:[{l:'함께한다',d:'자금 -400, 2주간 방문자 +20%, 평판 +3',f:function(){S.money-=400;S.rep+=3;evBegin('joint');}},
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
function maintainable(b){var k=D[b.def]&&D[b.def].kind;return k==='bld';}
function condOf(b){return b.cond==null?100:b.cond;}
/* 노후 단계: 지도에 보이는 표시와 효율이 함께 바뀐다
   80% 이하 거미줄·효율 90% → 70% 이하 하얀 연기·75% → 60% 이하 검은 연기·55% */
function wearStage(b){if(!maintainable(b))return 0;var c=condOf(b);return c<=60?3:(c<=70?2:(c<=80?1:0));}
var WEAR_NAME=['','거미줄','하얀 연기','검은 연기'];
function condFactor(b){return WEAR_EFF[wearStage(b)];}
// 노후·수리: 한 주에 기본 0.8 + 이용 한 번에 0.008씩 낡고(관리팀·행정 부교역자가 줄여 줌), 수리비는 낡은 만큼 건물 값의 10%까지
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
