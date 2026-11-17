'use strict';
/* ---------- 성도 한 사람 한 사람 ----------
   교회에 등록한 성도(S.members명)를 한 명씩 이름·초상화·호감 레벨로 관리한다 (지도를 걸어 다니는 방문자와는 따로다).
   S.people = [{id,n(이름),g('m'|'f'),seed,lv,xp,node(성장 단계 PP_TREE의 id),gift(은사),jw(등록한 주),vw·gw(마지막 심방·선물 주),
               tr(교육 중이면 {to,t0,end,ready})}]
   · 사람 수는 언제나 S.members를 따른다(syncPeople): 늘면 새가족이 생기고, 줄면 가장 마음이 덜 붙은 사람부터 떠난다
   · 성장: 새가족 → 세례 → 양육반 → 제자반 → 직분(헌신성도·집사·장로/권사) / 교역(소그룹 리더·공동체 리더·간사·신학교 → 부교역자)
           / 섬김(섬김이·사역팀장·사역부장·사역간사). 단계마다 호감 레벨이 되면 값을 내고 교육(게이지)을 하고, 다 차면 직접 임명한다
   · 직분 수 S.off(집사·권사·장로·사역간사)와 합계 PA는 여기서 다시 센 값이다. 수치는 balance.js PP_* */
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
    gift:Object.keys(FIELDS)[Math.floor(Math.random()*5)],jw:S.week,vw:-99,gw:-99,tr:null,assignedSaints:[],cls:'saint'};
}
function ppById(id){var L=S.people||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
function ppNode(p){return PP_TREE[p.node]||PP_TREE.new;}
function nodeName(id,g){var t=PP_TREE[id];return g==='f'&&t.nf?t.nf:t.n;}
function nodeAct(id,g){var t=PP_TREE[id];return g==='f'&&t.actf?t.actf:t.act;}
function nodeTr(id,g){var t=PP_TREE[id];return g==='f'&&t.trf?t.trf:t.tr;}
function nodeDone(id,g){var t=PP_TREE[id];return g==='f'&&t.donef?t.donef:t.done;}
function ppRankName(p){return p.ext?'청빙직원':nodeName(p.node,p.g);}
/* 명단 구분: 성도(saint) → 제자반 수료하면 봉사자(volunteer) → 각 갈래 끝이거나 청빙직원이면 직원(staff).
   부교역자가 되면 사람 명단(S.people)에서 S.assoc(직원)으로 옮겨 간다. 구분은 p.cls에 적고 단계가 바뀔 때마다 다시 정한다 */
function ppClass(p){
  if(p.ext||PP_STAFF_NODES.indexOf(p.node)>=0)return 'staff';
  return ppDepth(p)>=PP_VOL_D?'volunteer':'saint';
}
function ppReclass(p,quiet){
  var c=ppClass(p);
  if(p.cls!==c){
    if(p.cls&&!quiet){addLog(p.n+' 님이 '+(c==='volunteer'?'봉사자':c==='staff'?'직원':'성도')+' 명단으로 옮겨 갔어요');}
    p.cls=c;if(c==='staff')p.assignedSaints=[];
  }
  return c;
}
function ppSaints(){return (S.people||[]).filter(function(p){return ppClass(p)==='saint';});}
function ppVolunteers(){return (S.people||[]).filter(function(p){return ppClass(p)==='volunteer';});}
function ppStaffPeople(){return (S.people||[]).filter(function(p){return ppClass(p)==='staff';});}
// 소그룹 리더(리더 갈래)에게 맡긴 성도 칸: assignedSaints = 성도 id 목록. 칸 수는 그 단계의 cap
function ppAssignWhy(leader,saint){
  if(!leader||!saint)return '사람을 찾을 수 없어요';
  if(ppTrack(leader)!=='B'||leader.node==='seminary')return '소그룹 리더가 아니에요';
  if(ppClass(saint)!=='saint')return '성도만 맡길 수 있어요';
  if((leader.assignedSaints||[]).length>=leadSlots(leader))return '맡을 자리가 없어요 (호감 Lv '+LEAD_SLOT_LV+'마다 한 칸)';
  if((S.people||[]).some(function(q){return (q.assignedSaints||[]).indexOf(saint.id)>=0;}))return '이미 다른 리더가 맡고 있어요';
  return '';
}
// 리더가 맡을 수 있는 성도 칸 수: 호감 Lv에 비례(단계의 cap까지). 소그룹 리더 앞 단계(예비신학생 등)는 맡지 않는다
function leadSlots(p){if(!p||ppTrack(p)!=='B'||p.node==='seminary')return 0;return Math.min(ppNode(p).cap||0,1+Math.floor(p.lv/LEAD_SLOT_LV));}
function ppAssignedAny(sid){return (S.people||[]).some(function(q){return (q.assignedSaints||[]).indexOf(sid)>=0;});}
// 아직 어느 리더도 맡지 않은 성도 (호감 Lv 낮은 사람부터)
function ppFreeSaints(){return ppSaints().filter(function(p){return !ppAssignedAny(p.id);}).sort(function(a,b){return a.lv-b.lv||a.id-b.id;});}
// ⚡ 자동 배정: 빈 칸을 호감 Lv 낮은 성도부터 채운다. 채운 수
// 리더가 맡은 성도 한 명이 매주 더 받는 호감 경험치
function leadXp(l){return l?LEAD_SAINT_XP*(1+l.lv*LEAD_SAINT_LV):0;}
// 매주: 리더가 맡은 성도에게 호감 경험치
function leadWeek(){(S.people||[]).forEach(function(l){(l.assignedSaints||[]).forEach(function(i){var s=ppById(i);if(s)ppGain(s,leadXp(l));});});}
function ppAutoAssign(lid){var l=ppById(lid),n=0;if(!l)return 0;ppFreeSaints().forEach(function(s){if(!ppAssignWhy(l,s)&&!ppAssign(lid,s.id))n++;});return n;}
function ppAssign(lid,sid){var l=ppById(lid),s=ppById(sid),why=ppAssignWhy(l,s);if(why)return why;l.assignedSaints.push(sid);return '';}
function ppUnassign(lid,sid){var l=ppById(lid);if(l)l.assignedSaints=(l.assignedSaints||[]).filter(function(x){return x!==sid;});}
function ppTrack(p){return ppNode(p).t||'';}
function ppDepth(p){return ppNode(p).d||0;}
// 세례 이상 / 직분자(집사·장로·권사·사역간사) / 제자반 다음 갈래에 들어선 사람
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
  // 슬롯 배열: 성도 칸(assignedSaints)·건물 보조 인력(supportStaff)·사역팀 봉사자(S.servants). 예전 저장에 없으면 채우고, 없는 사람은 비운다
  var ids={};S.people.forEach(function(p){ids[p.id]=1;});
  S.people.forEach(function(p){
    ppReclass(p,true);
    p.assignedSaints=(p.assignedSaints||[]).filter(function(i){return ids[i]&&ppClass(ppById(i))==='saint'&&ppTrack(p)==='B'&&ppClass(p)!=='staff';}).slice(0,leadSlots(p));
  });
  var supSeen={};(S.buildings||[]).forEach(function(b){b.supportStaff=(b.supportStaff||[]).filter(function(i){if(!ids[i]||supSeen[i]||!supEligible(ppById(i)))return false;supSeen[i]=1;return true;}).slice(0,supSlots(b));});
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
  leadWeek();delegWeek();
}
/* 부교역자·소그룹 리더에게 성도 돌봄 맡기기 (balance.js ASSOC_CARE*·LEAD_*·DELEG_*) */
function delegState(){return S.deleg||(S.deleg={on:false,lv:DELEG_LV0,last:null});}
function asCare(a){return Math.round(ASSOC_CARE0+ASSOC_CARE_K*asSkill(a));}
function leaders(){return (S.people||[]).filter(function(p){return LEAD_NODES.indexOf(p.node)>=0;});}
function leadCare(p){return Math.max(1,Math.round((PP_TREE[p.node].cap||0)*LEAD_CARE_K));}
function leadCap(){return leaders().filter(function(p){return !mgrAt('p'+p.id);}).reduce(function(t,p){return t+leadCare(p);},0);}
function delegCap(){return (S.assoc||[]).reduce(function(t,a){return t+(a.uid&&mgrAt('a'+a.uid)?0:asCare(a));},0)+leadCap();}
// 맡길 수 있는 일꾼이 있는지 (부교역자나 소그룹 리더)
function delegHelpers(){return (S.assoc||[]).length+leaders().length;}
function delegPool(){var L=delegState().lv;return (S.people||[]).filter(function(p){return p.lv<L;});}
function delegWeek(){
  var d=delegState();d.last=null;
  if(!d.on||!delegHelpers()||!featOk('deleg'))return;
  var cap=delegCap(),n=0,cost=0,up=0;
  delegPool().sort(function(a,b){return a.lv-b.lv||a.vw-b.vw;}).forEach(function(p){
    if(n>=cap)return;var did=false;
    ['visit','gift'].forEach(function(k){if(ppCareWhy(p,k,true)||S.money-ppCareCost(k,true)<ASSOC_CARE_RES)return;var c0=ppCareCost(k,true),r=ppCare(p.id,k,true);did=true;cost+=c0;if(r)up++;});
    if(did)n++;
  });
  d.last={n:n,cost:cost,up:up,w:S.week};
  if(n)addLog('부교역자·소그룹 리더들이 성도 '+n+'명을 돌봤어요 · '+fmt(cost));
}
/* 심방·선물 */
// cheap: 부교역자·리더가 맡아 할 때는 값이 DELEG_COST_K배, 경험치가 DELEG_XP_K배
function ppCareCost(kind,cheap){var c=kind==='gift'?PP_GIFT:PP_VISIT;return cheap?Math.round(c.cost*DELEG_COST_K):c.cost;}
function ppCareXp(kind,cheap){var c=kind==='gift'?PP_GIFT:PP_VISIT;return cheap?Math.round(c.xp*DELEG_XP_K):c.xp;}
function ppCareWhy(p,kind,cheap){
  var c=kind==='gift'?PP_GIFT:PP_VISIT,last=kind==='gift'?p.gw:p.vw;
  if(kind==='gift'&&!featOk('gift'))return '선물은 '+featWhy('gift');
  if(p.lv>=PP_LV_MAX)return '이미 가장 깊은 사이예요';
  if(S.week-last<c.cd)return (c.cd-(S.week-last))+'주 뒤에 다시 할 수 있어요';
  if(S.money<ppCareCost(kind,cheap))return '자금이 부족해요';
  return '';
}
function ppCare(id,kind,cheap){
  var p=ppById(id);if(!p)return '성도를 찾을 수 없어요';
  var why=ppCareWhy(p,kind,cheap);if(why)return why;
  S.money-=ppCareCost(kind,cheap);if(kind==='gift')p.gw=S.week;else p.vw=S.week;
  var up=ppGain(p,ppCareXp(kind,cheap));trustAct((kind==='gift'?2:1)*(cheap?.5:1));recalc();save();
  return up?'+'+p.lv:'';   // '+레벨'이면 레벨이 올랐다
}
// 일괄 심방·선물: 지금 할 수 있는 사람(대기 기간·최고 레벨이 아닌)만, 자금이 되는 만큼 앞에서부터
function ppCareOk(p,kind){var w=ppCareWhy(p,kind);return !w||w==='자금이 부족해요';}
function byLow(a,b){return (a.lv||1)-(b.lv||1)||(a.id||0)-(b.id||0);}
function ppCareAll(list,kind){
  var c=kind==='gift'?PP_GIFT:PP_VISIT,o={done:0,poor:0,up:0};
  list.slice().sort(byLow).forEach(function(p){if(!ppCareOk(p,kind))return;if(S.money<c.cost){o.poor++;return;}var r=ppCare(p.id,kind);if(r===''||r.charAt(0)==='+'){o.done++;if(r)o.up++;}});
  return o;
}
// 일괄 성장: 갈래가 하나뿐인 성도의 다음 단계 교육 시작(자금이 되는 만큼, 호감 레벨 낮은 사람부터), 교육이 끝난 성도 임명
function ppSoleNext(p){var n=ppNexts(p);return n.length===1?n[0]:null;}
function ppTrainOk(p,to){var w=ppTrainWhy(p,to);return !w||w==='자금이 부족해요';}
function ppTrainAll(list,to){
  var o={done:0,poor:0};
  list.filter(function(p){return !p.tr&&ppSoleNext(p)===to&&ppTrainOk(p,to);}).sort(byLow).forEach(function(p){if(ppTrain(p.id,to)==='')o.done++;else o.poor++;});
  return o;
}
function ppAppointAll(list,to){
  var o={done:0,poor:0};
  list.filter(function(p){return p.tr&&p.tr.ready&&p.tr.to===to;}).sort(byLow).forEach(function(p){if(ppAppoint(p.id))o.done++;else o.poor++;});
  return o;
}
/* 다음 단계: 갈래가 여럿이면 하나를 고른다. 교육을 시작하고(값), 다 차면 임명한다 */
function ppNexts(p){return ppNode(p).next||[];}
// 다음 단계 중 레벨이 된 것이 있는지 (카드 '가능' 표시용)
function ppCanStep(p){return !p.tr&&ppNexts(p).some(function(id){return p.lv>=PP_TREE[id].lv&&ppNodeOpen(id);});}
function ppTrainWhy(p,to){
  var nx=ppNexts(p);if(!nx.length)return '더 오를 단계가 없어요';
  if(to==null)to=nx[0];
  if(nx.indexOf(to)<0)return '이 성도의 다음 단계가 아니에요';
  var st=PP_TREE[to];
  if(p.tr)return p.tr.ready?'임명을 기다리고 있어요':'교육 중이에요';
  if(!ppNodeOpen(to))return '교회 Lv '+ppNodeLv(to)+'부터 할 수 있어요';
  if(p.lv<st.lv)return '호감 Lv '+st.lv+'부터 할 수 있어요';
  if(to==='assoc'&&S.assoc.length>=assocSlots())return '부교역자 자리가 없어요 (성도 '+ASSOC_PER+'명마다 한 자리)';
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
    p.assignedSaints=[];   // 부교역자가 되면 맡던 성도는 모두 풀린다
    S.assoc.push({name:p.n,title:'부목사',field:p.gift,skill:5,pay:ASSOC_HOME_PAY,fee:0,home:true,g:p.g,seed:p.seed,lv:1,xp:0,cw:-99});
    S.people=S.people.filter(function(q){return q!==p;});S.members=Math.max(0,S.members-1);
    msg=p.n+' 부목사님이 사역을 시작해요 (별 5개 · '+FIELDS[p.gift].name+')';
  }else{
    p.node=to;p.tr=null;ppReclass(p);
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
/* 성도 아이콘: 성별(g)에 맞는 생성 초상화(assets/portraits/icons/members, tools/members_icons.py)에서 씨앗(seed)으로 한 명을 고른다.
   같은 사람은 언제나 같은 얼굴이다. 이름은 성별로 지으므로(PP_MALE·PP_FEMALE) 그림과 어긋나지 않는다 */
var MEMBER_ICONS={f:23,m:25};
function memberIcon(o){var g=o.g==='f'?'f':'m',n=MEMBER_ICONS[g];return 'assets/portraits/icons/members/member_'+g+(1+Math.floor(ppRand(o.seed||1,4)*n)%n)+'.png';}
// 사람 한 명의 얼굴 그림 주소: 청빙한 사람은 청빙 카드 그림, 기른 사람은 성도 아이콘
function personFace(p){return p.ext?hirePortrait(p.ext,'C'):memberIcon(p);}
function portraitHtml(o){return '<img class="pt" alt="" src="'+memberIcon(o)+'">';}
/* 부교역자의 레벨: 격려하면 오르고, 레벨마다 효과가 커진다 */
function asNeed(lv){return AS_XP0+AS_XP_K*lv;}
function asGain(a,xp){
  if(a.lv==null){a.lv=1;a.xp=0;a.cw=-99;}
  a.xp+=xp;var up=0;while(a.lv<ASSOC_LV_MAX&&a.xp>=asNeed(a.lv)){a.xp-=asNeed(a.lv);a.lv++;up++;}
  if(a.lv>=ASSOC_LV_MAX)a.xp=Math.min(a.xp,asNeed(a.lv));return up;
}
// 효과에 쓰는 실력: 별 × (교회에서 기른 사람이면 ASSOC_HOME_K) × 레벨 보정
function asSkill(a){return a.skill*(a.home?ASSOC_HOME_K:1)*(1+ASSOC_LV_K*((a.lv||1)-1))*stMul(a);}
