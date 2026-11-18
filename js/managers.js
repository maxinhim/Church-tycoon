'use strict';
/* ---------- 건물 관리자 (인력 배치·외부 청빙) ----------
   · 관리자가 있어야 가동하는 건물(mgrRole): 예배(추가 예배당) → 부교역자(pastor), 교제 → 직분자·리더(leader), 매장 → 직원(staff).
     처음부터 있는 대예배당(b.fixed)은 담임목사가 맡아 따로 배치하지 않는다
   · 인력 풀(mgrPool): 교회에서 기른 사람('in' — 성도를 교육해 임명한 직분자·리더·섬김 갈래, 신학교를 마친 부교역자)과
     밖에서 청빙한 사람('ex' — S.hires, 청빙한 부교역자). 기른 사람의 성능(k: 효과·회전 배율)이 더 높다
   · b.mgr = 일꾼 열쇠('p'+성도 id / 'a'+부교역자 uid / 'h'+청빙 직원 id / 'v' 예전 저장의 자원봉사자). 한 사람은 한 건물만 맡는다
   · 시험에서 관리자 없이 가동하려면 S.freeMgr = true (smoke는 기본으로 켠다: __CT_TEST && !__CT_MGR)
   수치는 balance.js MGR_*·HIRE_* */
var MGR_ROLE={pastor:{n:'부교역자',who:'부교역자를',sub:'부교역자가'},staff:{n:'청빙직원',who:'청빙직원을',sub:'청빙직원이'}};
var MGC={},MGB={};   // 건물 id → 관리자, 일꾼 열쇠 → 건물 id (fitMgrs가 다시 만든다)
function mgrRole(b){var d=b&&defOf(b);if(!d||b.fixed||!d.fill||!d.cap||d.prop||d.nomgr)return '';return MGR_NEED[d.cat]||'';}
function asUid(a){if(!a.uid){S.uidN=(S.uidN||0)+1;a.uid=S.uidN;}return a.uid;}
function mgrSeed(a){if(a.seed)return a.seed;var s=7;for(var i=0;i<a.name.length;i++)s=(s*31+a.name.charCodeAt(i))%999983;return s;}
function exK(skill){return MGR_EX_K0+MGR_EX_STEP*skill;}
function mgrPool(role){
  var L=[];
  if(role==='pastor')(S.assoc||[]).forEach(function(a){var inn=!!a.home,sd=mgrSeed(a);
    L.push({key:'a'+asUid(a),name:a.name+' '+a.title,g:a.g||(sd%2?'m':'f'),seed:sd,src:inn?'in':'ex',k:(inn?MGR_IN_K*(1+MGR_LV_K*((a.lv||1)-1)):exK(a.skill))*stMul(a),sub:'★'+a.skill,carer:true});});
  else{
    // 매장은 청빙직원(p.ext)만 맡는다. 섬김 갈래(사역간사 포함)는 사역팀만
    (S.people||[]).forEach(function(p){if(!p.ext)return;
      L.push({key:'p'+p.id,pid:p.id,ext:1,name:p.n+' '+ppRankName(p),g:p.g,seed:p.seed,src:'ex',k:exK(p.ext.skill)*(1+MGR_PLV_K*p.lv)*stMul(p),sub:'★'+p.ext.skill+' · 월 '+fmtS(p.ext.pay),carer:false});});
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
function mgrK0(b){if(b&&b.fixed)return pastorK();var w=mgrRole(b)&&MGC[b.id];return w?w.k:1;}   // 대예배당은 담임목사 레벨만큼
function mgrK(b){return mgrK0(b)*supK(b);}   // 메인 관리자 × 보조 직분자 버프
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
   봉사자 화면의 해당 탭에 나오며, 여느 성도처럼 심방·교육으로 더 기를 수 있다. 월 사례비(p.ext.pay)는 사례비에 더한다 */
var VOL_NODE={C:'cstaff'},VOL_TYPES=['C'];   // 청빙할 수 있는 것은 부교역자(ministry.js)와 청빙직원(C, 성도 명단에 p.ext로 들어간다)뿐
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
  var sk=cheap?1:1+Math.floor(Math.pow(Math.random(),1.3)*5),pay=STAFF_PAY[sk-1],pk=hirePortraitPick('staff'),g=pk.g;
  return {t:t,name:hirePick(SURN)+hirePick(g==='m'?PP_MALE:PP_FEMALE),g:g,seed:1+Math.floor(Math.random()*99990),pi:pk.pi,skill:sk,pay:pay,fee:HIRE_FEE,story:pk.story};
}
// 후보 3명. 처음 HIRE_EARLY번은 별 1개짜리 값싼 후보가 반드시 한 명 낀다
function genVol(t){var L=[makeVol(t,(S.hireN||0)<HIRE_EARLY)];while(L.length<HIRE_CAND0)L.push(makeVol(t));return L.sort(function(a,b){return a.pay-b.pay;});}
function volCands(t){S.vc=S.vc||{};return S.vc[t]||(S.vc[t]=genVol(t));}
/* 이력서 도착: 매주(sim.js) HIRE_RESUME_P 확률로 부교역자나 청빙직원 이력서가 한 장 와서 후보 목록 끝에 붙는다(갈래마다 HIRE_CAND_MAX명까지).
   새로 온 후보는 c.nw(카드에 NEW). 돌려주는 것: 온 후보 {t, c} 또는 null */
function resumeArrive(t){
  if(!featOk('hire'))return null;
  var open=['assoc','C'].filter(function(k){return (k==='assoc'?(S.cands||[]):volCands(k)).length<HIRE_CAND_MAX;});
  if(t&&open.indexOf(t)<0)return null;
  t=t||open[Math.floor(Math.random()*open.length)];if(!t)return null;
  var c;
  if(t==='assoc'){c=makeCand();S.cands=S.cands||[];S.cands.push(c);}
  else{var L=volCands(t);c=makeVol(t,(S.hireN||0)<HIRE_EARLY&&!L.some(function(x){return x.skill===1;}));L.push(c);}
  c.nw=1;
  var who=c.name+' '+(t==='assoc'?c.title:'청빙직원')+' 후보';
  addLog('📨 '+who+'의 이력서가 도착했어요');
  try{toast('📨 이력서 도착 · '+who+' (직원 › 청빙)',3200);}catch(e){}
  S.resumeN=(S.resumeN||0)+1;
  return {t:t,c:c};
}
function resumeWeek(){if(Math.random()<HIRE_RESUME_P)resumeArrive();}
/* 후보 교체: 후보 칸(t, i)마다 딱 한 번, HIRE_REROLL만원을 내고 다른 후보로. 새 후보는 rr=1(다시 못 바꿈) */
function hireSwapWhy(t,i){
  var L=t==='assoc'?(S.cands||[]):volCands(t),c=L[i];
  if(!featOk('hire'))return '청빙은 '+featWhy('hire');
  if(!c)return '후보가 없어요';
  if(c.rr)return '이 자리는 이미 한 번 바꿨어요';
  if(S.money<HIRE_REROLL)return '자금이 부족해요';
  return '';
}
function hireSwap(t,i){
  var w=hireSwapWhy(t,i);if(w)return w;
  var L=t==='assoc'?S.cands:volCands(t),c=t==='assoc'?makeCand():makeVol(t);
  c.rr=1;L[i]=c;S.money-=HIRE_REROLL;save();return '';
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
  S.money-=c.fee;S.hireN=(S.hireN||0)+1;S.vc[t].splice(i,1);
  var p=volJoin(c);
  addLog(c.name+'님을 직원으로 청빙했어요');noteNew();
  recalc();
  if(bid&&bById(bid)&&mgrPool(mgrRole(bById(bid))||'x').some(function(w){return w.key==='p'+p.id;}))mgrSet(bid,'p'+p.id);
  save();return '';
}
// 예전 이름으로도 부를 수 있게 (봇·도구): 역할 → 후보 목록 / 청빙
function hireCands(role){return role==='pastor'?S.cands:volCands('C');}
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


/* ---------- 보조 인력 (직분자 슬롯) ----------
   건물 카드의 슬롯 줄: [메인 관리자 1칸] | [보조 직분자 N칸]. 메인 관리자는 위(mgrSet)대로, 보조 인력은 직분자 갈래(헌신성도·집사·장로/권사)를 b.supportStaff(사람 id)에 세운다.
   · 칸 수 supSlots(b) = 티어 1 SUP_SLOTS[0], 티어 2 SUP_SLOTS[1], 대예배당 SUP_SLOTS[2] (예배·교제·매장 건물과 대예배당만)
   · 한 사람은 한 건물만. ⚙️ 직분자 자동 배치(supAuto)는 대예배당부터 빈 칸을 호감 Lv 높은 직분자로 채운다 */
// 보조 직분자 한 명의 버프 (건물 성능에 더하는 몫)
function supBuff(p){return p?(SUP_BUFF[p.node]||SUP_BUFF.devoted)+p.lv*SUP_BUFF_LV:0;}
function supK(b){if(!b||!b.supportStaff||!b.supportStaff.length)return 1;var t=0;b.supportStaff.forEach(function(i){t+=supBuff(ppById(i));});return 1+t;}
function pctS(v){return Math.round(v*1000)/10+'%';}
function supSlots(b){
  if(!b)return 0;if(b.fixed)return SUP_SLOTS[2];
  if(!mgrRole(b))return 0;return SUP_SLOTS[defOf(b).tier===2?1:0];
}
function supEligible(p){return !!p&&ppTrack(p)==='A';}   // 직분자 갈래
function supOf(pid){var b=S.buildings.filter(function(x){return (x.supportStaff||[]).indexOf(pid)>=0;})[0];return b?b.id:0;}
function supFree(){return (S.people||[]).filter(function(p){return supEligible(p)&&!supOf(p.id);}).sort(function(a,b){return b.lv-a.lv||a.id-b.id;});}
function supPutWhy(bid,pid){
  var b=bById(bid),p=ppById(pid);
  if(!b||!p)return '찾을 수 없어요';
  if(!supSlots(b))return '이 건물에는 보조 인력 자리가 없어요';
  if(!supEligible(p))return '직분자 갈래(헌신성도·집사·장로·권사)만 보조 인력이 돼요';
  if(supOf(pid))return supOf(pid)===bid?'이미 이 건물에 있어요':'이미 '+defOf(bById(supOf(pid))).name+'에서 일해요';
  if((b.supportStaff||[]).length>=supSlots(b))return '보조 자리가 가득 찼어요';
  return '';
}
function supPut(bid,pid){var w=supPutWhy(bid,pid);if(w)return w;var b=bById(bid);(b.supportStaff=b.supportStaff||[]).push(pid);save();return '';}
function supRemove(bid,pid){var b=bById(bid);if(b){b.supportStaff=(b.supportStaff||[]).filter(function(i){return i!==pid;});save();}}
// ⚙️ 직분자 자동 배치: 대예배당부터, 빈 칸을 호감 Lv 높은 직분자로. 채운 수
function supAuto(){
  var n=0,L=S.buildings.filter(function(b){return supSlots(b)>0;}).sort(function(a,b){return (b.fixed?1:0)-(a.fixed?1:0)||a.id-b.id;});
  L.forEach(function(b){supFree().forEach(function(p){if((b.supportStaff||[]).length<supSlots(b)&&!supPut(b.id,p.id))n++;});});
  return n;
}
// 건물 슬롯의 사람 그림 (청빙한 사람은 청빙 카드 그림, 기른 사람은 성도 아이콘, 담임목사는 코드 그림)
function mgrFace(w){
  if(w.key==='me')return chrArtUrl(CHR_SPECS.pastor,4);
  var e=(w.key.charAt(0)==='a'||w.key.charAt(0)==='p')?rosEnt(w.key):null;
  return e?rosArt(e):memberIcon({seed:w.seed,g:w.g});
}
// 건물 카드(selcard.js) 아래쪽 슬롯 줄: 메인 관리자 | 보조 직분자 + ⚙️ 자동 배치
function slotsHtml(b){
  var n=supSlots(b),mr=mgrRole(b);if(!n&&!mr&&!b.fixed)return '';
  var main,sup='',mw=mgrOf(b),L=b.supportStaff||[];
  if(b.fixed&&mw)main='<span class="slt full fix" title="담임목사" aria-label="메인 관리자 담임목사"><img alt="" src="'+mgrFace(mw)+'"></span>';
  else if(mw)main='<button class="slt full" data-act="mgr" aria-label="메인 관리자 '+mw.name+' — 바꾸기" title="'+mw.name+' · 누르면 바꿔요"><img alt="" src="'+mgrFace(mw)+'"></button>';
  else main='<button class="slt empty" data-act="mgr" aria-label="메인 관리자 빈 칸 — 배치">'+aic('act_mgr')+'</button>';
  for(var i=0;i<n;i++){
    var p=L[i]&&ppById(L[i]);
    sup+=p?'<button class="slt full" data-act="supdel" data-v="'+p.id+'" aria-label="보조 '+p.n+' 빼기, 성능 +'+pctS(supBuff(p))+'" title="'+p.n+' · 성능 +'+pctS(supBuff(p))+' · 누르면 빼요"><img alt="" src="'+personFace(p)+'"></button>':
      '<button class="slt empty" data-act="supopen" aria-label="보조 인력 빈 칸 — 직분자 배치">＋</button>';
  }
  return '<div class="scs"><div class="scs-g"><small>메인</small><div class="scs-r">'+main+'</div></div>'+(n?'<i class="scs-sep" aria-hidden="true"></i>'+
    '<div class="scs-g"><small>보조 '+L.length+'/'+n+(L.length?' · +'+pctS(supK(b)-1):'')+'</small><div class="scs-r">'+sup+'</div></div><button class="btn sm scs-auto" data-act="supauto" aria-label="직분자 자동 배치" title="직분자 자동 배치">'+aic('act_autosup')+'</button>':'')+'</div>';
}
/* 보조 인력 화면: 칸을 눌러 열고(UI.supB = 건물 id), 직분자 카드를 눌러 세우거나 뺀다 */
function supScrB(){var b=UI.supB&&bById(UI.supB);return b&&supSlots(b)?b:null;}
function supHtml(){
  var b=supScrB();if(!b)return '<p class="sempty">보조 인력을 둘 건물을 지도에서 골라 주세요.</p>';
  var L=(S.people||[]).filter(supEligible).sort(function(a,c){return c.lv-a.lv||a.id-c.id;}),n=supSlots(b),k=(b.supportStaff||[]).length;
  var h='<div class="sbulk mgrh"><span><b>'+defOf(b).name+'</b> · 보조 직분자 '+k+' / '+n+'칸 · 직분자 갈래(헌신성도·집사·장로·권사)를 세워요</span><button class="btn pri" data-act="supauto">'+aic('act_autosup')+' 직분자 자동 배치</button></div>';
  if(!L.length)return h+'<p class="sempty">아직 직분자 갈래 성도가 없어요. 성도 화면에서 제자반 뒤 직분자 갈래로 세워 주세요.</p>';
  return h+'<div class="lp-g sup-lp">'+L.map(function(p){
    var at=supOf(p.id),here=at===b.id,ob=at&&!here?bById(at):null;
    return '<button class="lp'+(here?' here':'')+(ob?' away':'')+'" data-act="supset" data-v="'+p.id+'" aria-label="'+p.n+' '+ppRankName(p)+', '+(here?'이 건물':ob?defOf(ob).name:'대기')+'"><img alt="" src="'+personFace(p)+'"><span>'+p.n+'</span><small>'+(here?'여기':ob?defOf(ob).name:ppRankName(p))+'</small></button>';}).join('')+'</div>';
}
function scrSupClick(a,v){
  if(UI.scr!=='sup')return false;
  var b=supScrB();if(!b)return false;
  if(a==='supset'){
    var pid=+v,why;
    if(supOf(pid)===b.id){supRemove(b.id,pid);sfx('click',.4);}
    else{why=supPut(b.id,pid);if(why){scrToast(why,2200);sfx('error',.4);return true;}sfx('join',.5,0);}
  }else if(a==='supauto'){var n=supAuto();if(n){sfx('join',.5,0);scrToast('직분자 '+n+'명을 배치했어요',1800);}else{sfx('error',.4);scrToast('배치할 직분자나 빈 칸이 없어요',1800);}}
  else return false;
  renderScreen();hud(true);return true;
}
