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
var MGR_ROLE={pastor:{n:'부교역자',who:'부교역자를',sub:'부교역자가'},staff:{n:'직원',who:'직원을',sub:'직원이'}};
var MGC={},MGB={};   // 건물 id → 관리자, 일꾼 열쇠 → 건물 id (fitMgrs가 다시 만든다)
function mgrRole(b){var d=b&&defOf(b);if(!d||b.fixed||!d.fill||!d.cap||d.prop||d.nomgr)return '';return MGR_NEED[d.cat]||'';}
function asUid(a){if(!a.uid){S.uidN=(S.uidN||0)+1;a.uid=S.uidN;}return a.uid;}
function mgrSeed(a){if(a.seed)return a.seed;var s=7;for(var i=0;i<a.name.length;i++)s=(s*31+a.name.charCodeAt(i))%999983;return s;}
function exK(skill){return MGR_EX_K0+MGR_EX_STEP*skill;}
function mgrPool(role){
  var L=[];
  if(role==='pastor')(S.assoc||[]).forEach(function(a){var inn=!!a.home,sd=mgrSeed(a);
    L.push({key:'a'+asUid(a),name:a.name+' '+a.title,g:a.g||(sd%2?'m':'f'),seed:sd,src:inn?'in':'ex',k:inn?MGR_IN_K*(1+MGR_LV_K*((a.lv||1)-1)):exK(a.skill),sub:'★'+a.skill,carer:true});});
  else{
    var nodes=MGR_STAFF_NODES;
    (S.people||[]).forEach(function(p){if(nodes.indexOf(p.node)<0)return;
      if(p.ext)L.push({key:'p'+p.id,pid:p.id,ext:1,name:p.n+' '+ppRankName(p),g:p.g,seed:p.seed,src:'ex',k:exK(p.ext.skill)*(1+MGR_PLV_K*p.lv),sub:'★'+p.ext.skill+' · 주 '+fmtS(p.ext.pay),carer:LEAD_NODES.indexOf(p.node)>=0});
      else L.push({key:'p'+p.id,name:p.n+' '+ppRankName(p),g:p.g,seed:p.seed,src:'in',k:MGR_IN_K*(1+MGR_PLV_K*p.lv),sub:'호감 Lv '+p.lv,carer:LEAD_NODES.indexOf(p.node)>=0});});
  }
  L.forEach(function(w){w.at=MGB[w.key]||0;});
  return L.sort(function(a,b){return b.k-a.k;});
}
// 관리자 목록을 다시 맞춘다 (recalc 때): 떠났거나 자격을 잃은 사람은 건물에서 빠진다. 예전 저장은 있던 건물에 자원봉사자를 둔다
function fitMgrs(){
  if(!S.hires){S.hires=[];S.hireId=1;S.hireN=0;S.hcand={};}
  if(!S.hrV){S.hrV=1;S.buildings.forEach(function(b){if(mgrRole(b)&&!b.mgr)b.mgr='v';});
    var b0=S.buildings[0];if(b0&&!S.buildings.some(function(b){return b.fixed;})&&isHall(b0))b0.fixed=true;}
  if(S.hires.length){   // 예전 저장: 따로 두던 청빙 직원을 성도 명단의 봉사자로 옮긴다
    S.hires.forEach(function(h){var p=volJoin({t:'C',name:h.name,g:h.g,seed:h.seed,pi:h.pi,skill:h.skill,pay:h.pay,story:h.story});
      S.buildings.forEach(function(b){if(b.mgr==='h'+h.id)b.mgr='p'+p.id;});});
    S.hires=[];syncPeople();
  }
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
function mgrK(b){if(b&&b.fixed)return pastorK();var w=mgrRole(b)&&MGC[b.id];return w?w.k:1;}   // 대예배당은 담임목사 레벨만큼
// 가동하는 건물: 문 앞까지 길이 닿고(usable), 관리자가 있다
function bOpen(b){return usable(b)&&staffed(b);}
function unstaffed(){return S.freeMgr?[]:S.buildings.filter(function(b){return mgrRole(b)&&!MGC[b.id];});}
// 배치·해제. 다른 건물을 맡고 있던 사람이면 그 건물에서 옮겨 온다. 못 하면 이유
function mgrSet(bid,key){
  var b=bById(bid),r=mgrRole(b);if(!r)return '관리자가 필요 없는 건물이에요';
  if(!mgrPool(r).some(function(w){return w.key===key;}))return '이 건물을 맡을 수 없는 사람이에요';
  var at=MGB[key]&&MGB[key]!==bid?bById(MGB[key]):null;
  if(at)return '이미 '+defOf(at).name+'을(를) 맡고 있어요. 그 건물에서 먼저 빼거나 다른 분으로 바꿔 주세요';
  b.mgr=key;recalc();save();return '';
}
function mgrClear(bid){var b=bById(bid);if(b&&b.mgr){delete b.mgr;recalc();save();}}

/* ---------- 외부 청빙 ----------
   봉사자 후보는 갈래마다 3명(S.vc: A 직분자 · B 리더 · C 섬김이), 부교역자 후보는 S.cands(ministry.js).
   청빙한 봉사자는 성도 명단(S.people)에 들어간다(p.ext = {skill, pay, story}): 그 갈래의 첫 직책(VOL_NODE)으로 시작하고,
   봉사자 화면의 해당 탭에 나오며, 여느 성도처럼 심방·교육으로 더 기를 수 있다. 주급(p.ext.pay)은 사례비에 더한다 */
var VOL_NODE={C:'cstaff'},VOL_TYPES=['C'];   // 청빙할 수 있는 것은 부교역자(ministry.js)와 직원(C, 교회직원으로 성도 명단에 들어간다)뿐
/* 초상화 8명(hiredata.js)의 성별 — 이름·그림이 어긋나지 않게 */
var HIRE_PORTRAIT_G={subpastor:'mfmfmmmm',staff:'mfmmffff'};
// 후보 한 명의 그림(pi: 0~7)·성별·한 줄 사연을 정한다. kind: 'subpastor' | 'staff'
function hirePortraitPick(kind){
  var L=HIRE_PORTRAIT_DATA[kind],pi=Math.floor(Math.random()*L.length),st=L[pi].stories;
  return {pi:pi,g:HIRE_PORTRAIT_G[kind].charAt(pi),story:st[Math.floor(Math.random()*st.length)]};
}
function hirePortrait(c,t){   // 후보(또는 성도 p.ext)의 그림 주소. pi가 없는 옛 저장은 seed로 정한다
  var kind=t==='assoc'?'subpastor':'staff',L=HIRE_PORTRAIT_DATA[kind],i=c.pi!=null?c.pi:((c.seed||0)%L.length);
  return L[i].portrait;
}
function hirePick(a){return a[Math.floor(Math.random()*a.length)];}
function makeVol(t,cheap){
  var sk=cheap?1:1+Math.floor(Math.pow(Math.random(),1.3)*5),pay=HIRE_PAY0+HIRE_PAY_K*sk,pk=hirePortraitPick('staff'),g=pk.g;
  return {t:t,name:hirePick(SURN)+hirePick(g==='m'?PP_MALE:PP_FEMALE),g:g,seed:1+Math.floor(Math.random()*99990),pi:pk.pi,skill:sk,pay:pay,fee:pay*HIRE_FEE_K,story:pk.story};
}
// 후보 3명. 처음 HIRE_EARLY번은 별 1개짜리 값싼 후보가 반드시 한 명 낀다
function genVol(t){return [makeVol(t,(S.hireN||0)<HIRE_EARLY),makeVol(t),makeVol(t)].sort(function(a,b){return a.fee-b.fee;});}
function volCands(t){S.vc=S.vc||{};return S.vc[t]||(S.vc[t]=genVol(t));}
// 새 후보 찾기: 봉사자 세 갈래와 부교역자 후보를 모두 새로
function volReroll(){
  if(!featOk('hire'))return '청빙은 '+featWhy('hire');
  if(S.money<HIRE_REROLL)return '자금이 부족해요';
  S.money-=HIRE_REROLL;S.vc={};VOL_TYPES.forEach(volCands);refreshCands();save();return '';
}
// 후보를 성도 명단에 넣는다 (사람 수도 함께 는다)
function volJoin(c){
  var p=makePerson(),node=VOL_NODE[c.t];
  p.n=c.name;p.g=c.g;p.seed=c.seed;p.node=node;p.lv=8+4*(c.skill-1);p.ext={skill:c.skill,pay:c.pay,story:c.story,pi:c.pi,w:S.week};
  S.people.push(p);S.members=Math.round(S.members)+1;return p;
}
// 청빙: 갈래 t의 후보 i를 들이고, bid가 있고 맡을 수 있으면 그 건물에 바로 배치한다. 못 하면 이유
function volHire(t,i,bid){
  if(!featOk('hire'))return '청빙은 '+featWhy('hire');
  var c=volCands(t)[i];if(!c)return '후보가 없어요';
  if(S.money<c.fee)return '청빙 비용이 부족해요';
  S.money-=c.fee;S.hireN=(S.hireN||0)+1;S.vc[t].splice(i,1);if(!S.vc[t].length)S.vc[t]=null;
  var p=volJoin(c);
  addLog(c.name+'님을 직원으로 청빙했어요');noteNew();
  recalc();
  if(bid&&bById(bid)&&mgrPool(mgrRole(bById(bid))||'x').some(function(w){return w.key==='p'+p.id;}))mgrSet(bid,'p'+p.id);
  save();return '';
}
// 예전 이름으로도 부를 수 있게 (봇·도구): 역할 → 후보 목록 / 청빙
function hireCands(role){return role==='pastor'?S.cands:volCands('C');}
function hireReroll(){return volReroll();}
function hireTake(role,i,bid){return role==='pastor'?hireAssoc(i,bid):volHire('C',i,bid);}
// 내보내기: 청빙한 봉사자(성도 id)를 명단에서 뺀다
function hireFire(pid){var p=ppById(pid);if(!p||!p.ext)return;S.people=S.people.filter(function(q){return q!==p;});S.members=Math.max(0,Math.round(S.members)-1);addLog(p.n+' '+ppRankName(p)+'님을 내보냈어요');recalc();save();}
function hirePay(){return (S.people||[]).reduce(function(t,p){return t+(p.ext?p.ext.pay:0);},0);}
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
