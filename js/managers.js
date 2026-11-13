'use strict';
/* ---------- 건물 관리자 (인력 배치·외부 청빙) ----------
   · 관리자가 있어야 가동하는 건물(mgrRole): 예배(추가 예배당) → 부교역자(pastor), 교제 → 직분자·리더(leader), 매장 → 직원(staff).
     처음부터 있는 대예배당(b.fixed)은 담임목사가 맡아 따로 배치하지 않는다
   · 인력 풀(mgrPool): 교회에서 기른 사람('in' — 성도를 교육해 임명한 직분자·리더·섬김 갈래, 신학교를 마친 부교역자)과
     밖에서 청빙한 사람('ex' — S.hires, 청빙한 부교역자). 기른 사람의 성능(k: 효과·회전 배율)이 더 높다
   · b.mgr = 일꾼 열쇠('p'+성도 id / 'a'+부교역자 uid / 'h'+청빙 직원 id / 'v' 예전 저장의 자원봉사자). 한 사람은 한 건물만 맡는다
   · 건물을 맡은 사람은 성도 돌봄 맡기기(자동 심방, people.js delegCap)에서 빠진다 — 둘 중 하나만
   · 시험에서 관리자 없이 가동하려면 S.freeMgr = true (smoke는 기본으로 켠다: __CT_TEST && !__CT_MGR)
   수치는 balance.js MGR_*·HIRE_* */
var MGR_ROLE={pastor:{n:'부교역자',who:'부교역자를',sub:'부교역자가'},leader:{n:'직분자·리더',who:'직분자나 리더를',sub:'직분자나 리더가'},staff:{n:'직원',who:'직원을',sub:'직원이'}};
var MGC={},MGB={};   // 건물 id → 관리자, 일꾼 열쇠 → 건물 id (fitMgrs가 다시 만든다)
function mgrRole(b){var d=b&&defOf(b);if(!d||b.fixed||!d.fill||!d.cap||d.prop)return '';return MGR_NEED[d.cat]||'';}
function asUid(a){if(!a.uid){S.uidN=(S.uidN||0)+1;a.uid=S.uidN;}return a.uid;}
function mgrSeed(a){if(a.seed)return a.seed;var s=7;for(var i=0;i<a.name.length;i++)s=(s*31+a.name.charCodeAt(i))%999983;return s;}
function exK(skill){return MGR_EX_K0+MGR_EX_STEP*skill;}
function mgrPool(role){
  var L=[];
  if(role==='pastor')(S.assoc||[]).forEach(function(a){var inn=!!a.home,sd=mgrSeed(a);
    L.push({key:'a'+asUid(a),name:a.name+' '+a.title,g:a.g||(sd%2?'m':'f'),seed:sd,src:inn?'in':'ex',k:inn?MGR_IN_K*(1+MGR_LV_K*((a.lv||1)-1)):exK(a.skill),sub:'★'+a.skill,carer:true});});
  else{
    var nodes=role==='leader'?MGR_LEADER_NODES:MGR_STAFF_NODES;
    (S.people||[]).forEach(function(p){if(nodes.indexOf(p.node)<0)return;
      L.push({key:'p'+p.id,name:p.n+' '+ppRankName(p),g:p.g,seed:p.seed,src:'in',k:MGR_IN_K*(1+MGR_PLV_K*p.lv),sub:'호감 Lv '+p.lv,carer:LEAD_NODES.indexOf(p.node)>=0});});
    (S.hires||[]).forEach(function(h){if(h.role!==role)return;L.push({key:'h'+h.id,name:h.name,g:h.g,seed:h.seed,src:'ex',k:exK(h.skill),sub:'★'+h.skill+' · 주 '+fmtS(h.pay)});});
  }
  L.forEach(function(w){w.at=MGB[w.key]||0;});
  return L.sort(function(a,b){return b.k-a.k;});
}
// 관리자 목록을 다시 맞춘다 (recalc 때): 떠났거나 자격을 잃은 사람은 건물에서 빠진다. 예전 저장은 있던 건물에 자원봉사자를 둔다
function fitMgrs(){
  if(!S.hires){S.hires=[];S.hireId=1;S.hireN=0;S.hcand={};}
  if(!S.hrV){S.hrV=1;S.buildings.forEach(function(b){if(mgrRole(b)&&!b.mgr)b.mgr='v';});
    var b0=S.buildings[0];if(b0&&!S.buildings.some(function(b){return b.fixed;})&&isHall(b0))b0.fixed=true;}
  MGC={};MGB={};
  var pools={};
  S.buildings.forEach(function(b){
    if(b.fixed){MGC[b.id]={key:'me',name:'담임목사',g:'m',seed:17,src:'in',k:1};return;}
    var r=mgrRole(b);if(!r||!b.mgr){if(b.mgr)delete b.mgr;return;}
    if(b.mgr==='v'){MGC[b.id]={key:'v',name:'자원봉사자',g:b.id%2?'m':'f',seed:b.id*7+3,src:'ex',k:exK(1),sub:'자원봉사'};return;}
    if(MGB[b.mgr]){delete b.mgr;return;}
    var P=pools[r]||(pools[r]=mgrPool(r)),w=null;
    for(var i=0;i<P.length;i++)if(P[i].key===b.mgr){w=P[i];break;}
    if(!w){delete b.mgr;return;}
    MGC[b.id]=w;MGB[b.mgr]=b.id;
  });
}
function mgrOf(b){return (b&&MGC[b.id])||null;}
function mgrAt(key){return MGB[key]||0;}
function staffed(b){return !mgrRole(b)||!!S.freeMgr||!!MGC[b.id];}
function mgrK(b){var w=mgrRole(b)&&MGC[b.id];return w?w.k:1;}
// 가동하는 건물: 문 앞까지 길이 닿고(usable), 관리자가 있다
function bOpen(b){return usable(b)&&staffed(b);}
function unstaffed(){return S.freeMgr?[]:S.buildings.filter(function(b){return mgrRole(b)&&!MGC[b.id];});}
// 배치·해제. 다른 건물을 맡고 있던 사람이면 그 건물에서 옮겨 온다. 못 하면 이유
function mgrSet(bid,key){
  var b=bById(bid),r=mgrRole(b);if(!r)return '관리자가 필요 없는 건물이에요';
  if(!mgrPool(r).some(function(w){return w.key===key;}))return '이 건물을 맡을 수 없는 사람이에요';
  S.buildings.forEach(function(x){if(x.mgr===key)delete x.mgr;});
  b.mgr=key;recalc();save();return '';
}
function mgrClear(bid){var b=bById(bid);if(b&&b.mgr){delete b.mgr;recalc();save();}}

/* ---------- 외부 청빙 ---------- */
var HIRE_STORY={
  pastor:['신학교를 갓 졸업하고 첫 사역지를 찾고 있어요. 서툴지만 새벽마다 기도로 하루를 열어요.','개척교회에서 오래 섬기다 교회가 합쳐지며 사역지를 잃었어요. 작은 교회의 사정을 잘 알아요.','선교지에서 돌아와 다시 목회를 시작하려 해요. 낯선 이를 맞는 일에 익숙해요.','청년부를 맡아 두 배로 키운 적이 있어요. 설교보다 듣는 일을 먼저 해요.','늦깎이로 신학을 공부했어요. 직장 생활을 오래 해서 성도들의 한 주를 잘 헤아려요.'],
  leader:['이웃 교회에서 구역장으로 십 년을 섬겼어요. 이사 와서 섬길 자리를 찾고 있어요.','대학 선교단체 간사 출신이에요. 처음 온 사람이 말문을 열게 하는 재주가 있어요.','어려운 시절 소그룹에서 받은 사랑을 갚고 싶어 해요. 아직 인도는 서툴러요.','은퇴한 교사예요. 아이부터 어르신까지 이름을 금세 외워요.','기도 모임을 스스로 꾸려 본 적이 있어요. 조용하지만 꾸준해요.'],
  staff:['동네 분식집을 오래 꾸렸어요. 손이 빠르고 계산이 정확해요.','취업 준비 중인 청년이에요. 일은 처음이지만 인사성이 밝아요.','카페에서 일하며 신앙을 갖게 됐어요. 손님 얼굴을 잘 기억해요.','아이들을 다 키우고 다시 일을 찾고 있어요. 살림 솜씨가 야무져요.','작은 가게를 접고 쉬던 중이에요. 물건 정리와 장부에 밝아요.']
};
function makeHire(role,cheap){
  var sk=cheap?1:1+Math.floor(Math.pow(Math.random(),1.3)*5),st=HIRE_STORY[role];
  var pay=role==='pastor'?50+sk*30:HIRE_PAY0+HIRE_PAY_K*sk;
  var h={role:role,name:SURN[Math.floor(Math.random()*SURN.length)]+GIVEN[Math.floor(Math.random()*GIVEN.length)],g:Math.random()<.5?'m':'f',seed:1+Math.floor(Math.random()*99990),
    skill:sk,pay:pay,fee:pay*HIRE_FEE_K,story:st[Math.floor(Math.random()*st.length)]};
  if(role==='pastor'){h.title=sk>=3?'부목사':'전도사';h.field=Object.keys(FIELDS)[Math.floor(Math.random()*5)];}
  return h;
}
// 후보 3명. 처음 HIRE_EARLY번은 별 1개짜리 값싼 후보가 반드시 한 명 낀다
function genHire(role){var L=[makeHire(role,(S.hireN||0)<HIRE_EARLY),makeHire(role),makeHire(role)];return L.sort(function(a,b){return a.fee-b.fee;});}
function hireCands(role){S.hcand=S.hcand||{};return S.hcand[role]||(S.hcand[role]=genHire(role));}
function hireReroll(role){
  if(S.money<HIRE_REROLL)return '자금이 부족해요';
  S.money-=HIRE_REROLL;S.hcand[role]=genHire(role);save();return '';
}
// 청빙: 후보 i를 들이고, bid가 있으면 그 건물에 바로 배치한다. 못 하면 이유
function hireTake(role,i,bid){
  var c=hireCands(role)[i];if(!c)return '후보가 없어요';
  if(S.money<c.fee)return '청빙 비용이 부족해요';
  var key;
  if(role==='pastor'){
    if(S.assoc.length>=assocSlots())return '지금 성도 수로는 부교역자를 '+assocSlots()+'명까지 청빙할 수 있어요';
    var a={name:c.name,title:c.title,field:c.field,skill:c.skill,pay:c.pay,fee:c.fee,g:c.g,seed:c.seed,story:c.story};S.assoc.push(a);key='a'+asUid(a);
  }else{var h={id:S.hireId++,role:role,name:c.name,g:c.g,seed:c.seed,skill:c.skill,pay:c.pay,story:c.story};S.hires.push(h);key='h'+h.id;}
  S.money-=c.fee;S.hireN=(S.hireN||0)+1;S.hcand[role]=null;
  addLog(c.name+'님을 '+MGR_ROLE[role].n+'(으)로 청빙했어요');
  recalc();
  if(bid&&bById(bid)&&mgrRole(bById(bid))===role)mgrSet(bid,key);
  save();return '';
}
function hireFire(id){S.hires=(S.hires||[]).filter(function(h){return h.id!==id;});recalc();save();}
function hirePay(){return (S.hires||[]).reduce(function(t,h){return t+h.pay;},0);}
/* 봇·도구용: 관리자가 없는 건물에 비어 있는 사람을 배치하고, 없으면 자금(reserve를 남기고)이 되는 대로 가장 싼 후보를 청빙한다. 배치한 수 */
function autoStaff(reserve){
  var n=0;
  unstaffed().forEach(function(b){
    var r=mgrRole(b),free=mgrPool(r).filter(function(w){return !w.at;});
    if(free.length){if(!mgrSet(b.id,free[0].key))n++;return;}
    var C=hireCands(r);if(C[0]&&S.money>=C[0].fee+(reserve||0)&&!hireTake(r,0,b.id))n++;
  });
  return n;
}
