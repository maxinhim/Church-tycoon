'use strict';
/* ---------- 성도 한 사람 한 사람 ----------
   교회에 등록한 성도(S.members명)를 한 명씩 이름·초상화·호감 레벨로 관리한다 (지도를 걸어 다니는 방문자와는 따로다).
   S.people = [{id,n(이름),g('m'|'f'),seed,lv,xp,node(성장 단계 PP_TREE의 id),gift(은사),jw(등록한 주),vw·gw(마지막 심방·선물 주),
               tr(교육 중이면 {to,t0,end,ready})}]
   · 사람 수는 언제나 S.members를 따른다(syncPeople): 늘면 새가족이 생기고, 줄면 가장 마음이 덜 붙은 사람부터 떠난다
   · 성장: 새가족 → 세례 → 양육반 → 제자반 → 직분(헌신성도·집사·장로/권사) / 교역(소그룹 리더·공동체 리더·간사·신학교 → 부교역자)
           / 섬김(섬김이·사역팀장·사역부장·교회직원). 단계마다 호감 레벨이 되면 값을 내고 교육(게이지)을 하고, 다 차면 직접 임명한다
   · 직분 수 S.off(집사·권사·장로·교회직원)와 합계 PA는 여기서 다시 센 값이다. 수치는 balance.js PP_* */
var PP_MALE=['민준','도윤','지호','예준','현우','성민','동현','준혁','시온','요한','다니엘','은찬','재원','태영','상훈','영수','기현','정훈','바울','요셉'];
var PP_FEMALE=['서연','하은','수빈','지우','유진','은지','혜린','다은','하람','은혜','소망','예린','지민','미영','순자','영희','한나','에스더','사랑','주은'];
var PP_SKIN=['#f6d3b3','#eec39a','#e0ac80','#f9dcc4'],PP_HAIR=['#2b2522','#4a3426','#6b4a2e','#1f1f24','#8a8a8a','#b9b2a6'],PP_SHIRT=['#4f6db0','#d65a4a','#5c8a48','#d1a02e','#7b6aa5','#2f8f9d','#c9627a','#8a6a46','#efe8da'],PP_BG=['#cfe3ee','#e8dcc8','#d9ead3','#f3d9df','#e3dcf0','#f6e7b8'];
// 예전 저장의 rank(0 새가족·1 세례·2 집사·3 장로/권사·4 신학 수료)를 단계로
var PP_OLD_RANK=['new','bapt','deacon','elder','seminary'];
function ppRand(seed,k){var x=Math.sin(seed*12.9898+k*78.233)*43758.5453;return x-Math.floor(x);}
function ppPick(seed,k,arr){return arr[Math.floor(ppRand(seed,k)*arr.length)%arr.length];}
function makePerson(){
  var g=Math.random()<.5?'m':'f',seed=Math.floor(Math.random()*1e6);
  return {id:S.ppId++,n:SURN[Math.floor(Math.random()*SURN.length)]+(g==='m'?PP_MALE:PP_FEMALE)[Math.floor(Math.random()*20)],g:g,seed:seed,lv:1,xp:0,node:'new',
    gift:Object.keys(FIELDS)[Math.floor(Math.random()*5)],jw:S.week,vw:-99,gw:-99,tr:null};
}
function ppById(id){var L=S.people||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
function ppNode(p){return PP_TREE[p.node]||PP_TREE.new;}
function nodeName(id,g){var t=PP_TREE[id];return g==='f'&&t.nf?t.nf:t.n;}
function nodeAct(id,g){var t=PP_TREE[id];return g==='f'&&t.actf?t.actf:t.act;}
function nodeTr(id,g){var t=PP_TREE[id];return g==='f'&&t.trf?t.trf:t.tr;}
function nodeDone(id,g){var t=PP_TREE[id];return g==='f'&&t.donef?t.donef:t.done;}
function ppRankName(p){return nodeName(p.node,p.g);}
function ppTrack(p){return ppNode(p).t||'';}
function ppDepth(p){return ppNode(p).d||0;}
// 세례 이상 / 직분자(집사·장로·권사·교회직원) / 제자반 다음 갈래에 들어선 사람
function ppBaptized(p){return ppDepth(p)>=1;}
function isOfficer(p){return p.node==='deacon'||p.node==='elder'||p.node==='cstaff';}
function ppNeed(lv){return Math.round(PP_XP0+PP_XP_K*lv);}
// 마음이 붙은 정도: 성도가 줄 때 낮은 사람부터 떠난다
function ppBond(p){return p.lv+ppDepth(p)*6+(p.tr?50:0)+ppRand(p.seed,9)*.9;}
var PA={bapt:0,grad:0,flat:0,sp:0,lv:0,cap:0,upk:0,dec:0};
function syncPeople(){
  if(typeof S==='undefined'||!S)return;
  var fresh=!S.people;
  if(fresh){S.people=[];S.ppId=1;}
  var want=Math.max(0,Math.round(S.members));
  while(S.people.length<want)S.people.push(makePerson());
  if(S.people.length>want){
    S.people.sort(function(a,b){return ppBond(b)-ppBond(a);});
    var gone=S.people.splice(want);
    gone.forEach(function(p){if(ppDepth(p)>=4)addLog(p.n+' '+ppRankName(p)+'님이 교회를 떠났어요');});
    S.people.sort(function(a,b){return a.id-b.id;});
  }
  // 예전 저장: rank → 단계
  S.people.forEach(function(p){if(!p.node){p.node=PP_OLD_RANK[p.rank||0]||'new';if(p.tr&&typeof p.tr.to==='number')p.tr.to=PP_OLD_RANK[p.tr.to]||'assoc';}if(p.rank!=null)delete p.rank;});
  // 더 예전 저장: 수로만 세던 직분자를 사람에게 나눠 준다 (한 번만)
  if(fresh&&S.off&&(S.off.deacon||S.off.kwonsa||S.off.elder)){
    var give=function(n,node,g){for(var k=0;k<2;k++)for(var i=0;i<S.people.length&&n>0;i++){var p=S.people[i];if(p.node==='new'&&(k||!g||p.g===g)){p.node=node;if(g)p.g=g;p.lv=Math.max(p.lv,PP_TREE[node].lv);n--;}}};
    give(S.off.elder||0,'elder','m');give(S.off.kwonsa||0,'elder','f');give(S.off.deacon||0,'deacon',null);
  }
  // 직분 수와 합계 (MOD·영성·헌금이 읽는다)
  var o={deacon:0,kwonsa:0,elder:0,cstaff:0},a={bapt:0,grad:0,flat:0,sp:0,lv:0,cap:0,upk:0,dec:0};
  S.people.forEach(function(p){
    var t=ppNode(p);
    if(p.node==='deacon')o.deacon++;else if(p.node==='elder'){if(p.g==='m')o.elder++;else o.kwonsa++;}else if(p.node==='cstaff')o.cstaff++;else if(p.node==='seminary')a.grad++;
    if(t.d>=1)a.bapt++;
    a.flat+=t.give||0;a.sp+=(p.lv-1)*PP_SPIRIT_LV+(t.sp||0);a.lv+=p.lv;a.cap+=t.cap||0;a.upk+=t.upk||0;a.dec+=t.dec||0;
  });
  a.upk=Math.min(PP_UPK_MAX,a.upk);a.dec=Math.min(PP_DEC_MAX,a.dec);
  S.off=o;PA=a;
}
// 헌금 배율: 성도들의 평균 호감 레벨
function ppGiveK(){var n=(S.people||[]).length;return n?1+PP_GIVE_LV*(PA.lv/n-1):1;}
// 한 사람이 한 주에 드리는 헌금 어림 (세부 정보에 보여 준다)
function ppGiveOf(p){
  var at=Math.max(1,Math.min(S.members,A.seats));
  return Math.round(OFFER_PER*(0.4+0.6*S.mood/100)*MOD.offer/ppGiveK()*(1+PP_GIVE_LV*(p.lv-1))/(1+at/500)+(ppNode(p).give||0));
}
function ppGain(p,xp){
  p.xp+=xp;var up=0;
  while(p.lv<PP_LV_MAX&&p.xp>=ppNeed(p.lv)){p.xp-=ppNeed(p.lv);p.lv++;up++;}
  if(p.lv>=PP_LV_MAX)p.xp=Math.min(p.xp,ppNeed(p.lv));
  return up;
}
// 모든 성도에게 경험치 (교육 행사). 레벨이 오른 사람 수를 돌려준다
function ppGainAll(xp){var n=0;(S.people||[]).forEach(function(p){if(ppGain(p,xp))n++;});return n;}
// 한 주가 지나면: 예배에 나오며 조금씩 정이 든다
function peopleWeek(){
  var x=S.mood>=50?PP_WEEK_XP:PP_WEEK_XP_LOW;
  (S.people||[]).forEach(function(p){ppGain(p,x);});
  (S.assoc||[]).forEach(function(a){asGain(a,.5);});
  delegWeek();
}
/* 부교역자에게 성도 돌봄 맡기기 (balance.js ASSOC_CARE*) */
function delegState(){return S.deleg||(S.deleg={on:false,lv:DELEG_LV0,last:null});}
function asCare(a){return Math.round(ASSOC_CARE0+ASSOC_CARE_K*asSkill(a));}
function delegCap(){return (S.assoc||[]).reduce(function(t,a){return t+asCare(a);},0);}
function delegPool(){var L=delegState().lv;return (S.people||[]).filter(function(p){return p.lv<L;});}
function delegWeek(){
  var d=delegState();d.last=null;
  if(!d.on||!S.assoc.length)return;
  var cap=delegCap(),n=0,cost=0,up=0;
  delegPool().sort(function(a,b){return a.lv-b.lv||a.vw-b.vw;}).forEach(function(p){
    if(n>=cap)return;var did=false;
    ['visit','gift'].forEach(function(k){var c=k==='gift'?PP_GIFT:PP_VISIT;if(ppCareWhy(p,k)||S.money-c.cost<ASSOC_CARE_RES)return;var r=ppCare(p.id,k);did=true;cost+=c.cost;if(r)up++;});
    if(did)n++;
  });
  d.last={n:n,cost:cost,up:up,w:S.week};
  if(n)addLog('부교역자들이 성도 '+n+'명을 돌봤어요 · '+fmt(cost));
}
/* 심방·선물 */
function ppCareWhy(p,kind){
  var c=kind==='gift'?PP_GIFT:PP_VISIT,last=kind==='gift'?p.gw:p.vw;
  if(p.lv>=PP_LV_MAX)return '이미 가장 깊은 사이예요';
  if(S.week-last<c.cd)return (c.cd-(S.week-last))+'주 뒤에 다시 할 수 있어요';
  if(S.money<c.cost)return '자금이 부족해요';
  return '';
}
function ppCare(id,kind){
  var p=ppById(id);if(!p)return '성도를 찾을 수 없어요';
  var why=ppCareWhy(p,kind);if(why)return why;
  var c=kind==='gift'?PP_GIFT:PP_VISIT;
  S.money-=c.cost;if(kind==='gift')p.gw=S.week;else p.vw=S.week;
  var up=ppGain(p,c.xp);trustAct(kind==='gift'?2:1);recalc();save();
  return up?'+'+p.lv:'';   // '+레벨'이면 레벨이 올랐다
}
// 일괄 심방·선물: 지금 할 수 있는 사람(대기 기간·최고 레벨이 아닌)만, 자금이 되는 만큼 앞에서부터
function ppCareOk(p,kind){var w=ppCareWhy(p,kind);return !w||w==='자금이 부족해요';}
function ppCareAll(list,kind){
  var c=kind==='gift'?PP_GIFT:PP_VISIT,o={done:0,poor:0,up:0};
  list.forEach(function(p){if(!ppCareOk(p,kind))return;if(S.money<c.cost){o.poor++;return;}var r=ppCare(p.id,kind);if(r===''||r.charAt(0)==='+'){o.done++;if(r)o.up++;}});
  return o;
}
function asCheerAll(){
  var o={done:0,poor:0,up:0};
  S.assoc.forEach(function(a,i){var w=asCheerWhy(a);if(w&&w!=='자금이 부족해요')return;if(S.money<ASSOC_CHEER.cost){o.poor++;return;}var r=asCheer(i);if(r===''||r.charAt(0)==='+'){o.done++;if(r)o.up++;}});
  return o;
}
/* 다음 단계: 갈래가 여럿이면 하나를 고른다. 교육을 시작하고(값), 다 차면 임명한다 */
function ppNexts(p){return ppNode(p).next||[];}
// 다음 단계 중 레벨이 된 것이 있는지 (카드 '가능' 표시용)
function ppCanStep(p){return !p.tr&&ppNexts(p).some(function(id){return p.lv>=PP_TREE[id].lv;});}
function ppTrainWhy(p,to){
  var nx=ppNexts(p);if(!nx.length)return '더 오를 단계가 없어요';
  if(to==null)to=nx[0];
  if(nx.indexOf(to)<0)return '이 성도의 다음 단계가 아니에요';
  var st=PP_TREE[to];
  if(p.tr)return p.tr.ready?'임명을 기다리고 있어요':'교육 중이에요';
  if(p.lv<st.lv)return '호감 Lv '+st.lv+'부터 할 수 있어요';
  if(to==='assoc'&&S.assoc.length>=assocSlots())return '부교역자 자리가 없어요 (성도 50명마다 한 자리)';
  if(S.money<st.cost)return '자금이 부족해요';
  return '';
}
function ppTrain(id,to){
  var p=ppById(id);if(!p)return '성도를 찾을 수 없어요';
  if(to==null)to=ppNexts(p)[0];
  var why=ppTrainWhy(p,to);if(why)return why;
  var st=PP_TREE[to];S.money-=st.cost;
  p.tr={to:to,t0:evNow(),end:evNow()+st.dur,ready:false};
  addLog(p.n+' 성도 · '+nodeTr(to,p.g)+' 시작');save();return '';
}
function ppProg(p){if(!p.tr)return 0;if(p.tr.ready)return 1;return clamp((evNow()-p.tr.t0)/Math.max(1e-6,p.tr.end-p.tr.t0),0,1);}
function ppLeftText(p){return p.tr&&!p.tr.ready?durText(Math.max(1/7,p.tr.end-evNow())):'';}
// 0.5초마다: 교육이 끝난 사람은 임명 대기로
function peopleTick(){
  var now=evNow(),n=0;
  (S.people||[]).forEach(function(p){if(p.tr&&!p.tr.ready&&now>=p.tr.end){p.tr.ready=true;n++;toast(p.n+' 성도의 '+nodeTr(p.tr.to,p.g)+'이(가) 끝났어요 · '+nodeDone(p.tr.to,p.g)+'을(를) 눌러 주세요',2800);}});
  if(n){sfx('bell',.5,0);save();if(typeof syncEvBadge==='function')syncEvBadge();if(UI.scr&&typeof renderScreen==='function')renderScreen();}
}
// 임명: 교육이 끝난 사람을 다음 단계로. 부교역자면 성도 명단에서 사역자로 옮긴다. 돌려주는 글은 축하 문구(못 하면 null)
function ppAppoint(id){
  var p=ppById(id);if(!p||!p.tr||!p.tr.ready)return null;
  var to=p.tr.to,msg;
  if(to==='assoc'){
    if(S.assoc.length>=assocSlots())return null;
    S.assoc.push({name:p.n,title:'부목사',field:p.gift,skill:5,pay:ASSOC_HOME_PAY,fee:0,home:true,g:p.g,seed:p.seed,lv:1,xp:0,cw:-99});
    S.people=S.people.filter(function(q){return q!==p;});S.members=Math.max(0,S.members-1);
    msg=p.n+' 부목사님이 사역을 시작해요 (별 5개 · '+FIELDS[p.gift].name+')';
  }else{
    p.node=to;p.tr=null;
    if(to==='bapt'){S.evW=S.evW||{};S.evW.baptism=S.week;gainRep(.5);}
    else if(PP_TREE[to].d>=4)gainRep(Math.min(4,PP_TREE[to].d-3));
    msg=p.n+' 성도가 '+(to==='bapt'?'세례를 받았어요':to==='seminary'?'신학교를 마쳤어요':nodeName(to,p.g)+'(으)로 세워졌어요');
  }
  noteNew();addLog(msg);recalc();save();return msg;
}
function ppReadyCount(){var n=0;(S.people||[]).forEach(function(p){if(p.tr&&p.tr.ready)n++;});return n;}
/* 성도의 한마디: 지금 교회 형편에서 그 사람이 느끼는 것 (사람마다, 주마다 다르게) */
var PP_SAY={
  seat:['자리가 모자라 서서 예배드렸어요','예배당이 좀 더 넓었으면 해요'],spirit:['말씀을 더 깊이 배우고 싶어요','기도할 조용한 곳이 있으면 좋겠어요','찬양 시간이 기다려져요, 더 있었으면'],
  fel:['함께 밥 먹고 이야기할 곳이 아쉬워요','소그룹으로 모이고 싶어요'],care:['아이 맡길 곳이 마땅치 않아요','어르신들 쉴 자리가 있었으면 해요'],
  comf:['화장실 줄이 너무 길어요','잠깐 앉아 쉴 곳이 없어요'],park:['주차할 곳을 찾느라 한참 돌았어요','차 댈 곳이 늘 걱정이에요'],past:['목사님 얼굴 뵙기가 어려워요','누가 안부를 물어 주면 좋겠어요'],
  good:['요즘 교회 오는 게 참 즐거워요','이 교회에 오길 잘했다 싶어요','주일이 기다려져요','이웃에게도 우리 교회를 소개했어요'],
  ok:['큰 불편은 없어요. 조용히 다니고 있어요','조금씩 정이 들고 있어요'],
  low:['요즘은 마음이 좀 멀어졌어요','다른 교회도 한번 가 볼까 생각했어요']
};
function ppThought(p){
  var c=S.cov||{},ks=['seat','spirit','fel','care','comf','park','past'].filter(function(k){return c[k]!=null&&c[k]<.6;}).sort(function(a,b){return c[a]-c[b];});
  var r=ppRand(p.seed,S.week+1),pool;
  // 호감이 높을수록 좋은 말을, 교회에 모자란 것이 많을수록 아쉬운 말을 한다
  if(ks.length&&r<.35+.12*ks.length-.03*p.lv)pool=PP_SAY[ks[Math.floor(ppRand(p.seed,S.week+7)*Math.min(3,ks.length))]];
  else pool=S.mood<45?PP_SAY.low:(S.mood>=60||p.lv>=4?PP_SAY.good:PP_SAY.ok);
  return pool[Math.floor(ppRand(p.seed,S.week+3)*pool.length)%pool.length];
}
/* 초상화: 씨앗 값으로 그리는 간단한 얼굴 (나중에 생성 이미지로 바꾼다) */
function portraitSvg(o){
  var s=o.seed||1,f=o.g==='f',skin=ppPick(s,1,PP_SKIN),hair=ppPick(s,2,PP_HAIR),shirt=ppPick(s,3,PP_SHIRT),bg=ppPick(s,4,PP_BG),st=Math.floor(ppRand(s,5)*3);
  var h='<svg class="pt" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="'+bg+'"/>';
  // 뒷머리(여성: 긴 머리·단발·묶음), 어깨, 목, 얼굴
  if(f)h+=st===0?'<path d="M14 30c0-14 8-20 18-20s18 6 18 20v18H14z" fill="'+hair+'"/>':st===1?'<path d="M15 30c0-13 8-19 17-19s17 6 17 19v8H15z" fill="'+hair+'"/>':'<circle cx="32" cy="10" r="6" fill="'+hair+'"/>';
  h+='<path d="M10 64c1-13 10-18 22-18s21 5 22 18z" fill="'+shirt+'"/><rect x="27" y="38" width="10" height="10" rx="3" fill="'+skin+'"/><circle cx="32" cy="28" r="13" fill="'+skin+'"/>';
  // 앞머리
  if(f)h+='<path d="M19 27c0-10 6-15 13-15s13 5 13 15c-4-6-9-9-13-9s-9 3-13 9z" fill="'+hair+'"/>';
  else h+=st===0?'<path d="M19 26c0-9 6-14 13-14s13 5 13 14c-3-5-8-7-13-7s-10 2-13 7z" fill="'+hair+'"/>':st===1?'<path d="M19 25c1-9 7-13 13-13s12 4 13 13l-4-5H23z" fill="'+hair+'"/>':'<path d="M20 24c2-7 7-11 12-11s10 4 12 11c-4-3-8-4-12-4s-8 1-12 4z" fill="'+hair+'"/>';
  h+='<circle cx="27" cy="29" r="1.6" fill="#2b2522"/><circle cx="37" cy="29" r="1.6" fill="#2b2522"/><path d="M28 34.5q4 3 8 0" stroke="#2b2522" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
  if(ppRand(s,6)<.22)h+='<g fill="none" stroke="#2b2522" stroke-width="1.2"><circle cx="27" cy="29" r="3.6"/><circle cx="37" cy="29" r="3.6"/><path d="M30.6 29h2.8"/></g>';
  return h+'</svg>';
}
/* 부교역자의 레벨: 격려하면 오르고, 레벨마다 효과가 커진다 */
function asNeed(lv){return PP_XP0+PP_XP_K*lv;}
function asGain(a,xp){
  if(a.lv==null){a.lv=1;a.xp=0;a.cw=-99;}
  a.xp+=xp;var up=0;while(a.lv<ASSOC_LV_MAX&&a.xp>=asNeed(a.lv)){a.xp-=asNeed(a.lv);a.lv++;up++;}
  if(a.lv>=ASSOC_LV_MAX)a.xp=Math.min(a.xp,asNeed(a.lv));return up;
}
// 효과에 쓰는 실력: 별 × (교회에서 기른 사람이면 ASSOC_HOME_K) × 레벨 보정
function asSkill(a){return a.skill*(a.home?ASSOC_HOME_K:1)*(1+ASSOC_LV_K*((a.lv||1)-1));}
function asCheerWhy(a){
  if((a.lv||1)>=ASSOC_LV_MAX)return '이미 최고 레벨이에요';
  if(S.week-(a.cw==null?-99:a.cw)<ASSOC_CHEER.cd)return (ASSOC_CHEER.cd-(S.week-a.cw))+'주 뒤에 다시 할 수 있어요';
  if(S.money<ASSOC_CHEER.cost)return '자금이 부족해요';
  return '';
}
function asCheer(i){
  var a=S.assoc[i];if(!a)return '사역자를 찾을 수 없어요';
  var why=asCheerWhy(a);if(why)return why;
  S.money-=ASSOC_CHEER.cost;a.cw=S.week;var up=asGain(a,ASSOC_CHEER.xp);trustAct(1);recalc();save();return up?'+'+a.lv:'';
}
