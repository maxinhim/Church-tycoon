'use strict';
/* ---------- 전체 화면 (행사 …) ----------
   아래 기능 버튼 가운데 '행사'처럼 고를 것이 많은 기능은 지도 위 작은 창 대신 화면 전체를 쓴다.
   · 게임은 멈추지 않는다 (게이지가 눈앞에서 차오른다). ✕·Esc로 닫는다
   · 위: 제목·탭·자금·✕ / 가운데: 카드 격자 / 카드를 누르면 가운데 정보 창
   · 행사 카드: 동그란 그림 둘레에 초록 원형 게이지. 진행 중이면 차오르고(진행 효과가 있으면 둘레에 불꽃 빛),
     다 차면 '보상 수령'이 뜬다. 눌러야 보상을 받는다
   UI.scr = 열린 화면('events'), UI.scrTab = 탭, UI.scrSel = 정보 창에 띄운 것 */
var SCREENS={
  events:{title:'행사',tabs:[['events','행사'],['pastor','담임목사'],['assoc','부교역자'],['vol','봉사자']]},
  people:{title:'성도',tabs:[['all','전체'],['vol','봉사자']]},
  status:{title:'현황',tabs:[['ind','지표'],['quest','퀘스트'],['fin','재정']]},
  officers:{title:'봉사자',tabs:[['dis','제자'],['off','직분자'],['B','리더'],['C','섬김이']]},
  hire:{title:'청빙',tabs:[['all','전체'],['assoc','부교역자'],['C','청빙직원']]},
  roster:{title:'직원',tabs:[['assoc','부교역자'],['staff','직원'],['hire','청빙']]},
  mgr:{title:'관리자 배치',tabs:[['pool','인력']]},
  sup:{title:'보조 인력',tabs:[['pool','직분자']]}
};
// 교회 Level이 되어야 열리는 탭 (balance.js FEAT_LV): 잠긴 탭은 자물쇠로 보이고 누르면 몇 Lv에 열리는지 알려 준다
var TAB_FEAT={'events:assoc':'hire','events:vol':'vol','roster:hire':'hire','officers:dis':'vol','officers:off':'vol','officers:B':'vol','officers:C':'vol','people:vol':'vol'};
function tabFeat(scr,tab){return TAB_FEAT[scr+':'+tab]||'';}
function tabLocked(scr,tab){var f=tabFeat(scr,tab);return !!f&&!featOk(f);}
/* Gemini 그림(assets/ui, tools/ui_buttons.py): 탭 이름 → 그림 이름. 선택됨·잠김은 CSS 필터 */
var TAB_IMG={'행사':'event','담임목사':'pastor','부교역자':'assoc','봉사자':'vol','전체':'all','지표':'ind','재정':'fin','퀘스트':'quest','직분자':'off','리더':'lead','섬김이':'serv','청빙직원':'hirestaff','직원':'staff','청빙':'hire','인력':'pool'};
function tabImg(label,on){var f=TAB_IMG[label];if(!f)return '';return ' tabi" style="--tbi:url(../assets/ui/tab_'+f+'.png)';}
/* 행사·사역팀 아이콘 그림(assets/ui/ev_*·tm_*.png). 목록에 없는 것은 이모지로 */
var ICO_EV=' smallgroup bible creed training communion street bazaar service retreat revival easter vbs thanks christmas pbook pstudy pmemo ppray psem pconf pdeg abook astudy amemo asem adeg minedu minfel offvow offsem offret leadtea leadsch leadmt servtool servws servthx volpray volpic volfeast ',ICO_TM=' evang praise care newcomer edu prayer admin media mission ';
function icoHtml(kind,id,emoji){var L=kind==='ev'?ICO_EV:ICO_TM;return L.indexOf(' '+id+' ')>=0?'<img class="icoi" alt="" src="assets/ui/'+kind+'_'+id+'.png">':emoji;}
function icoCls(kind,id){return (kind==='ev'?ICO_EV:ICO_TM).indexOf(' '+id+' ')>=0?' ico':'';}
var PP_PAGE=60;
var RING_C=2*Math.PI*46;
function openScreen(k,tab){
  // 지도에서 하던 일(짓기·고르기·작은 창)은 정리한다
  UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.choose=null;UI.sel=null;UI.selPiece=null;UI.selFloor=null;UI.fold=true;UI.lastBuilt=null;
  var tabs=SCREENS[k].tabs,want=tab||tabs[0][0];
  if(tabLocked(k,want)){var ft=tabs.filter(function(x){return !tabLocked(k,x[0]);})[0];want=ft?ft[0]:want;}   // 잠긴 탭이면 열린 첫 탭으로
  UI.scr=k;UI.scrTab=want;UI.scrSel=null;UI.ofPick=null;UI.careOnly=false;UI.ppList=false;UI.ppMore=PP_PAGE;if(k==='roster'){UI.hireFor=0;UI.rosPick=false;}
  sfx('page',.35);renderPanel();renderScreen();
}
function closeScreen(){UI.scr=null;UI.scrSel=null;renderScreen();syncTabs();}
// 청빙 화면: 봉사자 화면의 '청빙' 탭이나 관리자 배치 화면의 '외부 청빙'으로 연다. 닫으면 온 곳으로 돌아간다. forB: 청빙하자마자 맡길 건물
// 청빙 화면: 관리자 배치 화면('＋ 청빙')에서 열거나 직원 화면(roster)의 '청빙' 탭으로 연다. 닫으면 온 곳으로 돌아간다
function openHire(tab,forB){var back=UI.scr==='mgr'?'mgr':'roster';openScreen('hire',tab||'all');UI.hireBack=back;UI.hireFor=forB||0;}
function scrBack(){if(UI.scr==='hire'){if(UI.hireBack==='mgr'&&mgrScrB())openScreen('mgr');else openScreen('roster','assoc');}else closeScreen();}
function ringSvg(p,cls){
  return '<svg class="ring'+(cls?' '+cls:'')+'" viewBox="0 0 100 100" aria-hidden="true"><circle class="rt" cx="50" cy="50" r="46"/><circle class="rp" cx="50" cy="50" r="46" stroke-dasharray="'+RING_C.toFixed(1)+'" stroke-dashoffset="'+(RING_C*(1-p)).toFixed(1)+'"/></svg>';
}
// 행사 카드 아래 한 줄: 지금 상태
function evLine(id){
  var e=EVENTS[id],st=evState(id);
  if(!tierOk(e.goal||0))return {t:'Lv '+LV_TIER[e.goal]+' 후',c:'lock'};
  if(evReady(id))return {t:'보상 수령',c:'ready'};
  if(evRunning(id))return {t:evLeftText(id)+' 남음',c:'run'};
  if(e.season){var mo=monthOf();if(mo<e.season[0]||mo>e.season[1])return {t:evSeasonText(e)+'에 열려요',c:'wait'};}
  if(st.cd>0)return {t:st.cd+'주 뒤',c:'wait'};
  return {t:fmt(evCost(e)),c:S.money<evCost(e)?'poor':'cost'};
}
function evCardHtml(id){
  var e=EVENTS[id],ln=evLine(id),run=evRunning(id),rdy=evReady(id),p=evProg(id);
  // 카드의 빈 곳·아이콘·비용 어디를 눌러도 바로 시행(보상 수령·진행 중 알림 포함), 모서리의 ? 버튼만 정보·효과 창을 연다
  return '<div class="evc evgo '+ln.c+(run&&e.fx?' fx':'')+'" role="button" tabindex="0" data-act="evquick" data-v="'+id+'" data-ev="'+id+'" aria-label="'+e.name+', '+ln.t+' — 누르면 바로 시행">'+
    '<button class="evh" data-act="evopen" data-v="'+id+'" aria-label="'+e.name+' 정보·효과 보기" title="정보·효과">?</button>'+
    '<span class="evr">'+ringSvg(p)+'<span class="evi'+icoCls('ev',id)+'" style="--c:'+e.col+'">'+icoHtml('ev',id,e.ic)+'</span>'+(ln.c==='lock'?'<span class="evlk" aria-hidden="true">🔒</span>':'')+'</span>'+
    '<span class="evn">'+e.name+'</span><span class="evp" data-evp>'+(ln.c==='cost'||ln.c==='poor'?'<i class="coin" aria-hidden="true"></i>':'')+ln.t+'</span></div>';
}
function evDlgHtml(id){
  var e=EVENTS[id],st=evState(id),why=evBlock(id),run=evRunning(id),rdy=evReady(id),p=evProg(id);
  var rows=[['소요 시간',durText(e.dur)]];
  if(e.fx)rows.push(['진행 중 효과',e.fx]);
  if(e.rwt)rows.push(['마무리 보상',e.rwt]);
  rows.push(['다시 열기','보상을 받고 '+e.cd+'주 뒤'+(e.season?' · '+evSeasonText(e)+'에만':'')]);
  var cost='<span class="runc"><i class="coin" aria-hidden="true"></i>'+fmt(evCost(e))+'</span>';
  var btn=rdy?'<button class="btn pri big claim" data-act="evclaim" data-v="'+id+'">보상 수령</button>':
    run?'<button class="btn big" disabled data-evleft>진행 중 · '+evLeftText(id)+' 남음</button>':
    cost+'<button class="btn pri big" data-act="evstart" data-v="'+id+'"'+(why?' disabled':'')+'>실행</button>';
  return '<div class="sdlg" role="dialog" aria-label="'+e.name+'"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big'+(run&&e.fx?' fx':'')+'" data-ev="'+id+'">'+ringSvg(p)+'<span class="evi'+icoCls('ev',id)+'" style="--c:'+e.col+'">'+icoHtml('ev',id,e.ic)+'</span></span>'+
    '<div class="sdt"><h3>'+e.name+'</h3><p>'+e.desc+'</p>'+(run&&e.fx?'<p class="fxon">🔥 지금 효과가 적용되고 있어요</p>':'')+'</div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    (why&&!run&&!rdy?'<p class="swhy">'+why+'</p>':'')+'<div class="sdb">'+btn+'</div></div>';
}
function renderScreen(){
  var el=$('#scr');if(!el)return;
  el.hidden=!UI.scr;syncEvBadge();
  if(!UI.scr)return;
  var sc=SCREENS[UI.scr];
  $('#scrTitle').textContent=sc.title;
  $('#scrTabs').innerHTML=sc.tabs.length>1?sc.tabs.map(function(t){var on=UI.scrTab===t[0],lk=tabLocked(UI.scr,t[0]);return '<button role="tab" data-act="scrtab" data-v="'+t[0]+'" aria-selected="'+on+'" class="'+(on?'on':'')+(lk?' lock':'')+tabImg(t[1],on)+'"'+(lk?' aria-disabled="true" title="'+featWhy(tabFeat(UI.scr,t[0]))+'"':'')+'>'+(lk?'<i aria-hidden="true">🔒</i>':'')+t[1]+(lk?'<small>Lv '+featLv(tabFeat(UI.scr,t[0]))+'</small>':'')+'</button>';}).join(''):'';
  $('#scrMoney').textContent=fmt(S.money);
  var inf=$('#scrInfo');if(inf){inf.innerHTML='';inf.hidden=true;}
  var body=$('#scrBody'),top=body.scrollTop;
  if(UI.scr==='hire'||(UI.scr==='roster'&&UI.scrTab==='hire')){body.className='sbody hirescr';body.innerHTML=hireHtml();
  }else if(UI.scr==='roster'){body.className='sbody roster';body.innerHTML=rosterHtml();
  }else if(UI.scr==='status'){renderStatusScreen(body);
  }else if(UI.scr==='people'){body.className='sbody';body.className='sbody ppscr';body.innerHTML=(UI.ppList||UI.careOnly)?peopleBar()+peopleHtml():stageBar()+stagesHtml();}
  else if(UI.scr==='officers'){body.className='sbody leadscr';body.innerHTML=UI.scrTab==='dis'?disHtml():bulkBar()+offHtml();}
  else if(UI.scr==='mgr'){body.className='sbody';body.innerHTML=mgrHtml();}
  else if(UI.scr==='sup'){body.className='sbody';body.innerHTML=supHtml();}
  else if(UI.scr==='events'){
    body.className='sbody';
    // 탭마다 묶음(grp)이 다르다: 행사(묶음 없음) · 담임목사(pas) · 부교역자(asc) · 봉사자(vol)
    var grp={events:'',pastor:'pas',assoc:'asc',vol:'vol'}[UI.scrTab]||'';
    var ids=Object.keys(EVENTS).filter(function(id){return !EVENTS[id].hidden&&(EVENTS[id].grp||'')===grp;});
    var nr=evReadyCount();
    var head=(nr?'<div class="sbulk"><span>보상을 기다리는 행사 '+nr+'개</span><button class="btn pri claim" data-act="evclaimall">모두 보상 수령 · '+nr+'개</button></div>':'');
    if(grp==='pas')head+=pastorHead();
    else if(grp==='asc')head+='<p class="shint">부교역자 '+S.assoc.length+'명의 배움과 쉼을 돕는 행사예요. 마치면 <b>부교역자 모두 경험치</b>가 올라 레벨마다 효과가 +'+Math.round(ASSOC_LV_K*100)+'% 커져요. 값은 인원에 따라 늘어요.</p>';
    else if(grp==='vol')head+='<p class="shint"><b>직분자·리더·섬김이</b>를 위한 교육과 교제예요. 마치면 그 갈래의 봉사자 모두 경험치와 신뢰도가 올라요.</p>';
    else head+='<p class="shint">행사를 시작하면 둘레의 초록 게이지가 차올라요. 다 차면 <b>보상 수령</b>을 눌러 마무리하세요. 오래 열지 않으면 공동체가 침체돼요.</p>';
    var grid;
    if(grp==='vol')grid=['A','B','C','ABC'].map(function(g){var L=ids.filter(function(id){return EVENTS[id].vg===g;});
      return L.length?'<div class="ssec"><b>'+VOL_NAME[g]+(g==='ABC'?' 모두':'')+' '+offEvN(g)+'명</b><span>'+(g==='ABC'?'세 갈래가 함께하는 행사':PP_TRACK[g].desc)+'</span></div><div class="evg">'+L.map(evCardHtml).join('')+'</div>':'';}).join('');
    else grid='<div class="evg">'+ids.map(evCardHtml).join('')+'</div>';
    body.innerHTML=head+grid;
  }
  body.scrollTop=top;
  var dl=$('#scrDlg');
  var sel=UI.scrSel,dh='';
  if(sel&&sel.t==='ev'&&EVENTS[sel.id])dh=evDlgHtml(sel.id);
  else if(sel&&sel.t==='pp'&&ppById(sel.id))dh=ppDlgHtml(ppById(sel.id));
  else if(sel&&sel.t==='in'&&INDK[sel.id])dh=indDlgHtml(sel.id);
  else if(sel&&sel.t==='cr'&&careRes)dh=careResHtml();
  else if(sel&&sel.t==='tm'&&STAFF[sel.id])dh=teamDlgHtml(sel.id);
  else if(sel&&sel.t==='hc'&&(UI.scr==='hire'||UI.scr==='roster')&&hcFind(sel.id))dh=hcDlgHtml(sel.id);
  else UI.scrSel=null;
  dl.hidden=!dh;dl.innerHTML=dh;
}
// 0.25초마다(HUD 갱신 때): 게이지·남은 시간·자금만 고친다 (다시 그리지 않는다)
function syncScreen(){
  if(!UI.scr)return;
  $('#scrMoney').textContent=fmt(S.money);
  var els=document.querySelectorAll('#scr [data-ev]');
  for(var i=0;i<els.length;i++){
    var id=els[i].dataset.ev,rp=els[i].querySelector('.rp');if(!rp||!EVENTS[id])continue;
    rp.setAttribute('stroke-dashoffset',(RING_C*(1-evProg(id))).toFixed(1));
    if(evRunning(id)){var t=els[i].querySelector('[data-evp]');if(t)t.textContent=evLeftText(id)+' 남음';}
  }
  syncStatusScreen();
  var ps=document.querySelectorAll('#scr [data-pp]');
  for(var j=0;j<ps.length;j++){
    var pp=ppById(+ps[j].dataset.pp),rq=ps[j].querySelector('.rp');if(!pp||!rq)continue;
    rq.setAttribute('stroke-dashoffset',(RING_C*(1-ppProg(pp))).toFixed(1));
    if(pp.tr&&!pp.tr.ready){var t2=ps[j].querySelector('[data-evp]');if(t2)t2.textContent='교육 '+ppLeftText(pp);}
  }
  var sel=UI.scrSel,lb=document.querySelector('#scrDlg [data-evleft]');
  if(lb&&sel&&sel.t==='ev'&&evRunning(sel.id))lb.textContent='진행 중 · '+evLeftText(sel.id)+' 남음';
  if(lb&&sel&&sel.t==='pp'){var sp=ppById(sel.id);if(sp&&sp.tr&&!sp.tr.ready)lb.textContent=nodeTr(sp.tr.to,sp.g)+' 중 · '+ppLeftText(sp)+' 남음';}
}
// 행사 버튼 위 빨간 숫자: 보상을 기다리는 행사 수
function syncEvBadge(){
  var b=$('#evBadge');if(!b)return;var n=evReadyCount();
  b.hidden=!n;if(n)b.textContent=n;
  var pb=$('#ppBadge'),cn=caresCount(),pn=ppReadyCount()+cn;if(pb){pb.hidden=!pn;pb.classList.toggle('care',cn>0);if(pn)pb.textContent=cn?'!':pn;pb.setAttribute('aria-label',cn?'고민이 있는 성도 '+cn+'명':'');}   // 고민이 있으면 빨간 느낌표
  var of=document.querySelector('#fab [data-fab="officers"]');if(of)of.classList.toggle('lock',!featOk('vol'));
  var sb=$('#stBadge'),sn=indReadyCount();if(sb){sb.hidden=!sn;if(sn)sb.textContent=sn;}
}
function scrToast(msg,ms){
  var t=$('#scrToast');if(!t)return;t.textContent=msg;t.hidden=false;
  clearTimeout(scrToast.tm);scrToast.tm=setTimeout(function(){t.hidden=true;},ms||2400);
}
function scrClick(e){
  var el=e.target.closest('[data-act]');
  // 정보 창 바깥(어두운 곳)을 누르면 닫는다
  if(!el){if(e.target.id==='scrDlg'){UI.scrSel=null;renderScreen();}return;}
  if(scrStatusClick(el.dataset.act,el.dataset.v,el))return;
  if(scrRosterClick(el.dataset.act,el.dataset.v))return;
  if(scrLeadClick(el.dataset.act,el.dataset.v))return;
  if(scrOffClick(el.dataset.act,el.dataset.v))return;
  if(scrSupClick(el.dataset.act,el.dataset.v))return;
  if(scrTeamClick(el.dataset.act,el.dataset.v))return;
  if(scrPeopleClick(el.dataset.act,el.dataset.v,el))return;
  var a=el.dataset.act,v=el.dataset.v;
  if(a==='scrclose'){scrBack();return;}
  if(a==='scrtab'&&tabLocked(UI.scr,v)){scrToast('이 탭은 '+featWhy(tabFeat(UI.scr,v)),1800);sfx('error',.4);return;}
  if(scrHireClick(a,v))return;
  if(a==='scrtab'){UI.scrTab=v;UI.scrSel=null;UI.ofPick=null;UI.ppMore=PP_PAGE;$('#scrBody').scrollTop=0;renderScreen();return;}
  if(a==='evopen'){UI.scrSel={t:'ev',id:v};sfx('click',.4);renderScreen();return;}
  if(a==='evclose'){UI.scrSel=null;renderScreen();return;}
  if(a==='evstart'){
    var why=runEvent(v);
    if(why){scrToast(why,2000);sfx('error',.4);}
    else{sfx('coins',.55,0);scrToast(EVENTS[v].name+'을(를) 시작했어요 · '+durText(EVENTS[v].dur)+' 뒤 보상을 받을 수 있어요',2600);F.push({x:entC(),y:PZ-2.5,z:1.4,t:2.4,d:2.4,text:EVENTS[v].name,col:'#ffe28a',big:1});}
    renderScreen();hud(true);return;
  }
  if(scrMgrClick(a,v))return;
  if(a==='evquick'){
    if(evReady(v)){var gq=claimEvent(v);if(gq){sfx('coins',.7,0);scrToast(EVENTS[v].name+' 마무리 · '+(gq.join(' · ')||'수고했어요'),3000);}}
    else if(evRunning(v)){scrToast(EVENTS[v].name+' 진행 중 · '+evLeftText(v)+' 남음',1600);}
    else{var wq=runEvent(v);if(wq){scrToast(wq,2000);sfx('error',.4);}else{sfx('coins',.55,0);scrToast(EVENTS[v].name+'을(를) 시작했어요 · '+durText(EVENTS[v].dur)+' 뒤 보상을 받을 수 있어요',2600);}}
    renderScreen();hud(true);return;
  }
  if(a==='evclaimall'){
    var all=claimAllEvents();
    if(all.n){sfx('coins',.7,0);setTimeout(function(){sfx('join',.6,0);},180);scrToast('행사 '+all.n+'개 마무리 · '+(all.got.join(' · ')||'수고했어요'),3400);UI.scrSel=null;}
    else{scrToast('받을 보상이 없어요',1600);sfx('error',.4);}
    renderScreen();hud(true);return;
  }
  if(a==='evclaim'){
    var got=claimEvent(v);
    if(got){sfx('coins',.7,0);setTimeout(function(){sfx('join',.6,0);},180);scrToast(EVENTS[v].name+' 마무리 · '+(got.join(' · ')||'수고했어요'),3000);UI.scrSel=null;}
    renderScreen();hud(true);return;
  }
  // 그 밖(사역팀·청빙의 버튼들)은 패널과 같은 처리기로
  if(a==='dismiss')UI.scrSel=null;
  onPanel(e);renderScreen();
}
function setupScreens(){
  $('#scr').addEventListener('click',scrClick);
  setupStatusUI();setupAlert();
  $('#scr').addEventListener('keydown',function(e){var c=e.target;if((e.key==='Enter'||e.key===' ')&&c.classList&&c.classList.contains('evgo')){e.preventDefault();c.click();}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&UI.scr){if(UI.scrSel){UI.scrSel=null;renderScreen();}else scrBack();}});
}

/* ---------- 성도 · 직분자 화면 ---------- */
function ppLine(p){
  if(p.tr&&p.tr.ready)return {t:nodeDone(p.tr.to,p.g),c:'ready'};
  if(p.tr)return {t:'교육 '+ppLeftText(p),c:'run'};
  if(ppCanStep(p)){var nx=ppNexts(p).filter(function(id){return p.lv>=PP_TREE[id].lv;});return {t:(nx.length>1?'갈래 고르기':nodeAct(nx[0],p.g))+' 가능',c:'can'};}
  return {t:ppRankName(p),c:'rank t'+(ppTrack(p)||'0')+' d'+ppDepth(p)};
}
function heartLv(lv){return '<span class="hlv" aria-label="호감 레벨 '+lv+'"><i aria-hidden="true">♥</i>'+lv+'</span>';}
function ppCardHtml(p){
  var ln=ppLine(p);
  return '<button class="evc ppc '+ln.c+(p.ext?' ext':'')+'" data-act="ppopen" data-v="'+p.id+'" data-pp="'+p.id+'" aria-label="'+p.n+' '+ppRankName(p)+', 호감 레벨 '+p.lv+', '+ln.t+'">'+
    '<span class="evr">'+ringSvg(ppProg(p))+'<span class="ppi">'+portraitHtml(p)+'</span>'+heartLv(p.lv)+(careOf(p)?'<span class="pcare" aria-label="고민 있음">!</span>':'')+'</span>'+
    '<span class="evn">'+p.n+'</span><span class="evp" data-evp>'+ln.t+'</span></button>';
}
// 급한 순서: 임명 대기 → 다음 단계 가능 → 교육 중 → 직분·레벨 높은 순
function ppOrder(a,b){
  var k=function(p){return (careOf(p)?8000:0)+(p.tr&&p.tr.ready?4000:0)+(ppCanStep(p)?2000:0)+(p.tr&&!p.tr.ready?1000:0)+ppDepth(p)*120+p.lv;};
  return k(b)-k(a)||a.id-b.id;
}
// 지금 화면(탭)에 보이는 성도 목록 — 일괄 심방·선물도 이 목록에 한다
function scrPeople(){
  var all=(S.people||[]).slice(),tab=UI.scrTab;
  // 봉사자 화면: 갈래별 봉사자·직원. 제자반을 갓 마쳐 아직 갈래가 없는 봉사자는 첫 탭에서 갈래를 고른다
  if(UI.scr==='officers')return all.filter(function(p){return !p.ext&&(tab==='dis'?p.node==='disciple':ppTrack(p)===(tab==='off'?'A':tab));}).sort(ppOrder);
  // 성도 화면: 전체(등록 성도 모두) · 봉사자(제자반을 마친 봉사자와 직원). 고민 단추를 켜면 고민이 있는 사람만
  return all.filter(function(p){return (tab==='vol'?ppClass(p)!=='saint':true)&&(!UI.careOnly||!!careOf(p));}).sort(ppOrder);
}
// 행사 › 담임목사 탭 맨 위: 담임목사의 레벨·학위와 효과
function pastorHead(){
  var p=pastorSt(),tt=pastorTitle();
  return '<div class="pashd"><span class="ppi"><img class="pxart" alt="" src="'+chrArtUrl(CHR_SPECS.pastor,4)+'"></span><div class="pasx"><h3>담임목사'+(tt?' <span class="rchip r5">'+tt+'</span>':'')+'</h3>'+
    '<div class="lvrow"><span class="hlv">Lv '+p.lv+'</span><div class="bar"><i style="width:'+(p.lv>=PAS_LV_MAX?100:Math.round(clamp(p.xp/pasNeed(p.lv),0,1)*100))+'%"></i></div><span>'+(p.lv>=PAS_LV_MAX?'최고':Math.floor(p.xp)+' / '+pasNeed(p.lv))+'</span></div>'+
    '<p>대예배당 성능 ×'+pastorK().toFixed(2)+' · 목양 수용력 +'+PAS_CAP*(p.lv-1)+(p.deg?' · 말씀 효과 +'+Math.round(PAS_DEG_WORD*p.deg*100)+'%':'')+' <small>(레벨마다 성능 +'+Math.round(PAS_LV_K*100)+'%, 수용력 +'+PAS_CAP+')</small></p></div></div>';
}
function bulkBar(slim){
  var L=scrPeople();if(!L.length)return '';
  var cnt=slim?'':'<span>이 목록 '+L.length+'명</span>';
  if(!featOk('bulk'))return '<div class="sbulk">'+cnt+'<span class="lockn">🔒 한꺼번에 심방·교육하기는 '+featWhy('bulk')+'</span></div>';
  var nv=L.filter(function(p){return ppCareOk(p,'visit');}).length,ng=L.filter(function(p){return ppCareOk(p,'gift');}).length;
  var gr={};   // 일괄 성장 단추: 다음 단계마다 하나
  L.forEach(function(p){
    if(p.tr&&p.tr.ready){var g=gr['a'+p.tr.to]||(gr['a'+p.tr.to]={k:'ap',to:p.tr.to,n:0,lv:p.lv,g:p.g});g.n++;g.lv=Math.min(g.lv,p.lv);}
    else if(!p.tr){var to=ppSoleNext(p);if(to&&ppTrainOk(p,to)){var h=gr['t'+to]||(gr['t'+to]={k:'tr',to:to,n:0,lv:p.lv,g:p.g});h.n++;h.lv=Math.min(h.lv,p.lv);}}
  });
  var gh=Object.keys(gr).map(function(k){var x=gr[k],tr=x.k==='tr';
    return '<button class="btn'+(tr?' pri':' pri claim')+'" data-act="bulkgrow" data-k="'+x.k+'" data-to="'+x.to+'">전체 '+(tr?nodeTr(x.to,x.g)+' 시작':nodeDone(x.to,x.g))+' · '+x.n+'명'+(tr?' · '+fmt(x.n*PP_TREE[x.to].cost):'')+'</button>';}).join('');
  return '<div class="sbulk">'+cnt+'<div class="bgr">'+
    '<div class="bgp"><button class="bic'+(nv?' on':'')+'" data-act="bulk" data-v="visit"'+(nv?'':' disabled')+' aria-label="모두 심방 '+nv+'명, '+fmt(nv*PP_VISIT.cost)+'" title="모두 심방 · '+fmt(PP_VISIT.cost)+'씩">💬<b>심방</b>'+(nv?'<i>'+nv+'</i>':'')+'</button><small class="bcost'+(nv?' on':'')+'">'+fmtS(nv?nv*PP_VISIT.cost:PP_VISIT.cost)+'</small></div>'+
    '<div class="bgp"><button class="bic'+(ng?' on':'')+'" data-act="bulk" data-v="gift"'+(ng?'':' disabled')+' aria-label="모두 선물 '+ng+'명, '+fmt(ng*PP_GIFT.cost)+'" title="모두 선물 · '+fmt(PP_GIFT.cost)+'씩">🎁<b>선물</b>'+(ng?'<i>'+ng+'</i>':'')+'</button><small class="bcost'+(ng?' on':'')+'">'+fmtS(ng?ng*PP_GIFT.cost:PP_GIFT.cost)+'</small></div></div>'+(gh?'<div class="bgw">'+gh+'</div>':'')+'</div>';
}
/* 성도 화면: 현황은 머리띠(탭 오른쪽)의 작은 글(peopleInfo), 본문 맨 위는 한 줄 도구(peopleBar: 고민 · 심방 · 선물 · 전체 ○○ 시작) */
function peopleInfo(){   // 도구 줄 옆의 큼직한 현황 (평균 호감·할 일은 뺐다)
  var all=S.people||[],cl={saint:0,volunteer:0,staff:0};
  all.forEach(function(p){cl[ppClass(p)]++;});
  var it=function(l,v){return '<span class="pf"><i>'+l+'</i><b>'+v+'</b></span>';};
  return '<div class="pfs" role="group" aria-label="성도 현황">'+it('등록',all.length+'명')+it('성도',cl.saint)+it('봉사자',cl.volunteer)+it('직원',cl.staff)+it('세례',all.filter(ppBaptized).length)+it('직분',offTotal())+
    (UI.careOnly||UI.scrTab!=='all'?it('목록',scrPeople().length+'명'):'')+'</div>';
}
function careBtnHtml(){
  var cn=caresCount();
  return '<button class="pcb'+(cn?' hot':'')+(UI.careOnly?' sel':'')+'" data-act="carefilter" aria-pressed="'+(!!UI.careOnly)+'" aria-label="고민 '+cn+'명'+(UI.careOnly?' — 눌러서 전체 보기':'')+'" title="'+(UI.careOnly?'눌러서 전체 보기':'고민 있는 성도만 보기')+'"><i aria-hidden="true">'+(cn?'!':'💬')+'</i><b>고민</b><span>'+cn+'</span></button>';
}
function peopleBar(){
  var b=bulkBar(true),back='<button class="btn sgl-list on" data-act="pplist">🃏 단계 보기</button>';
  return b?b.replace('<div class="sbulk">','<div class="sbulk pbar">'+careBtnHtml()+(UI.ppList?back:'')+peopleInfo()):'<div class="sbulk pbar">'+careBtnHtml()+(UI.ppList?back:'')+peopleInfo()+'</div>';
}
/* 성도 화면 기본 보기: 단계마다 돌봄이 가장 필요한 대표 한 명을 큰 카드로(숨 쉬는 초상화). 카드 위 단추(심방·선물·다음 단계 교육·임명)는
   그 단계에 있는 사람 모두에게 한 번에 적용된다(호감 낮은 사람부터, 자금이 되는 만큼). 한 사람씩 보려면 '명단' 단추(UI.ppList) */
function ppStages(){
  var L=scrPeople(),by={},order=Object.keys(PP_TREE);
  L.forEach(function(p){(by[p.node]=by[p.node]||[]).push(p);});
  return order.filter(function(k){return by[k];}).map(function(k){return {node:k,list:by[k]};});
}
function stageRep(list){   // 대표: 고민 있는 사람 → 임명 대기 → 호감 낮은 사람
  return list.slice().sort(function(a,b){return (careOf(b)?1:0)-(careOf(a)?1:0)||((b.tr&&b.tr.ready)?1:0)-((a.tr&&a.tr.ready)?1:0)||a.lv-b.lv||a.id-b.id;})[0];
}
function shortTr(to,g){return nodeTr(to,g).replace(/\s+/g,'');}
function stgBtn(k,node,label,sub,n,cls){
  return '<button class="sgb '+k+(cls?' '+cls:'')+'" data-act="stg" data-k="'+k+'" data-v="'+node+'"'+(n?'':' disabled')+' aria-label="'+label+' '+n+'명 '+sub+'"><b>'+label+'</b><small>'+(n?n+'명':'—')+'</small><small class="sgc-c">'+sub+'</small></button>';
}
function stageCardHtml(st){
  var L=st.list,rep=stageRep(L),t=PP_TREE[st.node],g=rep.g;
  var nv=L.filter(function(p){return ppCareOk(p,'visit');}).length,ng=L.filter(function(p){return ppCareOk(p,'gift');}).length;
  var ready=L.filter(function(p){return p.tr&&p.tr.ready;}),run=L.filter(function(p){return p.tr&&!p.tr.ready;}).length;
  var to=ppSoleNext(rep),nt=to?L.filter(function(p){return !p.tr&&ppTrainOk(p,to);}).length:0,cares=L.filter(function(p){return careOf(p);}).length;
  var btn=stgBtn('visit',st.node,'심방',fmtS(PP_VISIT.cost*Math.max(nv,1)),nv)+(featOk('gift')?stgBtn('gift',st.node,'선물',fmtS(PP_GIFT.cost*Math.max(ng,1)),ng):'');
  if(ready.length)btn+=stgBtn('ap',st.node,'임명',nodeDone(ready[0].tr.to,g).replace(/\s+/g,''),ready.length,'hot');
  else if(to)btn+=stgBtn('tr',st.node,shortTr(to,g),fmtS(PP_TREE[to].cost*Math.max(nt,1)),nt,'grow');
  var why=to&&!nt&&!run?ppTrainWhy(rep,to):'';
  return '<div class="sgc'+(cares?' care':'')+'">'+
    '<div class="sgb-row">'+btn+'</div>'+
    '<button class="sg-art" data-act="ppopen" data-v="'+rep.id+'" aria-label="'+rep.n+' 자세히"><img alt="" src="'+personFace(rep)+'">'+(careOf(rep)?'<span class="pcare">!</span>':'')+'</button>'+
    '<div class="sg-foot"><b>'+nodeName(st.node,g)+' <em>'+L.length+'명</em></b><span>대표 '+rep.n+' · ♥'+rep.lv+(run?' · 교육 중 '+run+'명':'')+(cares?' · 고민 '+cares+'명':'')+'</span>'+
    (why?'<small class="sg-why">'+why+'</small>':'')+'</div></div>';
}
function stageBar(){
  return '<div class="sbulk pbar">'+careBtnHtml()+'<button class="btn sgl-list" data-act="pplist">📋 명단 보기</button>'+peopleInfo()+'</div>';
}
function stagesHtml(){
  var S0=ppStages();
  if(!S0.length)return '<p class="sempty">'+(UI.scrTab==='vol'?'아직 봉사자가 없어요. 성도를 제자반까지 길러 보세요.':'등록된 성도가 아직 없어요.')+'</p>';
  return '<div class="sgg">'+S0.map(stageCardHtml).join('')+'</div>';
}
function peopleHtml(){
  var tab=UI.scrTab,L=scrPeople();
  var h='';
  if(!L.length)return h+'<p class="sempty">'+(UI.careOnly?'지금 고민이나 갈등을 겪는 성도가 없어요.':tab==='vol'?'아직 봉사자가 없어요. 성도를 제자반까지 길러 보세요.':'등록된 성도가 아직 없어요.')+'</p>';
  var n=Math.min(L.length,UI.ppMore||PP_PAGE);
  h+='<div class="evg">'+L.slice(0,n).map(ppCardHtml).join('')+'</div>';
  if(L.length>n)h+='<div class="smore"><button class="btn" data-act="ppmore">더 보기 · '+(L.length-n)+'명</button></div>';
  return h;
}
/* ---------- 봉사자 › 제자 탭: 제자반을 마친 성도를 큰 카드(4열)로 — 카드 위 직분·리더·섬김 단추로 바로 갈래를 정한다 ----------
   단추를 누르면 그 갈래의 첫 단계 교육(DIS_FIRST: 헌신성도·소그룹 리더·섬김이)이 시작되고, 교육이 끝나면 카드의 '임명'을 눌러 마친다 */
var DIS_FIRST={A:'devoted',B:'sgl',C:'server'},DIS_LBL={A:'직분',B:'리더',C:'섬김'};
function disCardHtml(p){
  var bar='';
  if(p.tr&&p.tr.ready)bar='<button class="btn pri claim dis-ap" data-act="ppappoint" data-v="'+p.id+'">'+nodeDone(p.tr.to,p.g)+'</button>';
  else if(p.tr)bar='<div class="dis-run" data-pp="'+p.id+'"><span class="bar"><i style="width:'+Math.round(ppProg(p)*100)+'%"></i></span><small>'+nodeTr(p.tr.to,p.g)+' · '+ppLeftText(p)+' 남음</small></div>';
  else bar='<div class="dis-b">'+['A','B','C'].map(function(t){var to=DIS_FIRST[t],w=ppTrainWhy(p,to),st=PP_TREE[to];
    return '<button class="dis-btn t'+t+'" data-act="disgo" data-v="'+p.id+':'+t+'"'+(w?' disabled':'')+' title="'+(w||nodeTr(to,p.g)+' · '+fmt(st.cost))+'" aria-label="'+DIS_LBL[t]+' 갈래 — '+(w||nodeTr(to,p.g))+'">'+DIS_LBL[t]+'<small>'+(w?(/Lv/.test(w)?w.replace(/.*?(Lv \d+).*/,'$1~'):'—'):fmtS(st.cost))+'</small></button>';}).join('')+'</div>';
  return '<div class="dcard'+(p.tr?' run':'')+'" aria-label="'+p.n+' 제자반 수료, 호감 Lv '+p.lv+'">'+bar+
    '<img alt="" src="'+personFace(p)+'"><span class="dc-lv">♥'+p.lv+'</span><span class="dc-n">'+p.n+'</span></div>';
}
function disHtml(){
  var L=scrPeople();
  var h='<p class="shint"><b>제자반을 마친 성도</b>예요. 카드 위의 <b>직분·리더·섬김</b> 단추로 갈래를 정하면 첫 단계 교육이 시작돼요 (헌신성도 · 소그룹 리더 · 섬김이).</p>';
  if(!L.length)return h+'<p class="sempty">제자반을 마친 성도가 아직 없어요. 성도 화면에서 심방·선물로 호감을 쌓아 제자반까지 길러 주세요.</p>';
  return h+'<div class="disg">'+L.map(disCardHtml).join('')+'</div>';
}
/* ---------- 봉사자 화면 4:6 (직분자 · 리더 · 섬김이 탭 모두) ----------
   왼쪽 40%: 고른 사람의 큰 카드(레벨·능력치·지금 맡은 곳) + 그 갈래 사람 카드. 오른쪽 60%: 배치 대상
     · 직분자 → 기능 건물 카드(건물 레벨·기본 성능·보조 칸·보조 버프)  · 리더 → 맡을 성도 칸  · 섬김이 → 사역팀 카드(패시브 효과·섬김이 증폭)
   오른쪽의 빈칸을 누르면 고르기 모드(UI.ofPick = {t:'sup'|'tm', v: 건물 id | 팀}), 그다음 왼쪽 카드를 누르면 그 칸에 배치된다.
   UI.leadSel = 왼쪽에서 고른 사람 id */
function ofTrack(){return UI.scrTab==='off'?'A':UI.scrTab;}
function ofSelOf(L){var s=L.filter(function(p){return p.id===UI.leadSel;})[0]||L[0]||null;if(s)UI.leadSel=s.id;return s;}
function ofCanPick(p){var k=UI.ofPick;if(!k)return false;return k.t==='sup'?supEligible(p):teamEligible(p);}
// 사람이 지금 맡은 곳 한 줄
function ofWhere(p){
  var t=ppTrack(p);
  if(t==='A'){var b=supOf(p.id)&&bById(supOf(p.id));return b?'📍 '+defOf(b).name:'대기';}
  if(t==='C'){var k=teamOf(p.id);return k?STAFF[k].ic+' '+STAFF[k].name:'대기';}
  if(t==='B'){var sl=leadSlots(p);return sl?'성도 '+(p.assignedSaints||[]).length+' / '+sl:'성도 칸 없음';}
  return '갈래 고르기 전';
}
function leadCardHtml(p,on){
  var ln=ppLine(p),pk=UI.ofPick,ok=pk&&ofCanPick(p),todo=ln.c==='ready'||ln.c==='can';
  return '<button class="lcard'+(on?' on':'')+(pk?(ok?' pk':' pkx'):'')+'" data-act="'+(pk?'ofpick':'ldopen')+'" data-v="'+p.id+'" aria-label="'+p.n+' '+ppRankName(p)+', 호감 Lv '+p.lv+', '+ofWhere(p)+'">'+
    '<img alt="" src="'+personFace(p)+'"><span class="lc-rk">'+ppRankName(p)+'</span><span class="lc-lv">♥'+p.lv+'</span>'+(todo?'<span class="lc-todo" title="'+ln.t+'">!</span>':'')+
    '<span class="lc-n">'+p.n+'</span><span class="lc-s">'+(todo?ln.t:ofWhere(p))+'</span></button>';
}
// 큰 카드: 레벨 · 능력치 · 맡은 곳
function ofBigHtml(p){
  var t=ppTrack(p),need=ppNeed(p.lv),xp=Math.min(1,p.xp/need),st=[],ln=ppLine(p),btn='';
  st.push(['호감 레벨','♥ '+p.lv+' <small>('+Math.floor(p.xp)+' / '+need+')</small>']);
  if(t==='A'){var bb=supBuff(p),b=supOf(p.id)&&bById(supOf(p.id));
    st.push(['보조 버프','건물 성능 +'+pctS(bb)+' <small>(단계 +'+pctS(SUP_BUFF[p.node]||SUP_BUFF.devoted)+' · 호감 +'+pctS(p.lv*SUP_BUFF_LV)+')</small>']);
    st.push(['근무',b?'📍 '+defOf(b).name:'<em>대기</em>']);if(b)btn='<button class="btn sm" data-act="ofsupdel" data-v="'+b.id+':'+p.id+'">빼기</button>';}
  else if(t==='B'){var sl=leadSlots(p);
    st.push(['성도 칸',(p.assignedSaints||[]).length+' / '+sl+(sl<(ppNode(p).cap||0)?' <small>(호감 Lv '+(Math.floor(p.lv/LEAD_SLOT_LV)+1)*LEAD_SLOT_LV+'에 한 칸 더)</small>':'')]);
    st.push(['돌봄 효과','맡은 성도마다 ♥ +'+tN(leadXp(p))+'/주']);}
  else if(t==='C'){var k=teamOf(p.id);
    st.push(['섬김 능력','팀 효과 +'+pctS(svPow(p))+' <small>(호감 +'+pctS(p.lv*TEAM_SV_LV)+' · 단계 +'+pctS(TEAM_SV_NODE[p.node]||0)+')</small>']);
    st.push(['소속 팀',k?STAFF[k].ic+' '+STAFF[k].name:'<em>대기</em>']);if(k)btn='<button class="btn sm" data-act="tmfree" data-v="'+k+':'+p.id+'">빼기</button>';}
  else st.push(['다음','제자반을 마쳤어요 · 상세에서 갈래를 골라 주세요']);
  var ne=nodeEff(p.node);if(ne)st.push(['직분 효과',ne]);
  return '<div class="lbig t'+(t||'0')+'"><div class="lb-art"><img alt="" src="'+personFace(p)+'"></div>'+
    '<div class="lb-h"><h3>'+p.n+'</h3><span class="rchip t'+(t||'0')+'">'+ppRankName(p)+'</span></div>'+
    '<span class="bar lb-xp"><i style="width:'+Math.round(xp*100)+'%"></i></span>'+
    '<dl class="lb-s">'+st.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    '<div class="lb-b"><button class="btn'+(ln.c==='ready'||ln.c==='can'?' pri':'')+'" data-act="ppopen" data-v="'+p.id+'">상세 · '+ln.t+'</button>'+btn+'</div></div>';
}
function ofLeftHtml(L,sel){
  var pk=UI.ofPick,ph='';
  if(pk){var nm=pk.t==='sup'?(bById(pk.v)?defOf(bById(pk.v)).name+' 보조 칸':''):(STAFF[pk.v]?STAFF[pk.v].name+' 빈칸':'');
    ph='<div class="of-pk"><b>👇 '+nm+'에 세울 사람을 고르세요</b><button class="btn sm" data-act="ofcancel">취소</button></div>';}
  return '<div class="lead-l">'+(pk?'':ofBigHtml(sel))+ph+'<div class="lc-g">'+L.map(function(p){return leadCardHtml(p,!pk&&p.id===sel.id);}).join('')+'</div></div>';
}
function offHtml(){
  var tk=ofTrack(),T=PP_TRACK[tk],L=scrPeople();
  if(!L.length)return '<p class="shint"><b>'+T.n+'</b> 갈래 · '+T.desc+'.</p><p class="sempty">아직 이 갈래에 들어선 성도가 없어요. 성도 화면에서 제자반까지 기른 뒤 이 갈래를 골라 주세요.</p>'+(tk==='C'?'<div class="lead-r">'+teamsHtml()+'</div>':tk==='A'?'<div class="lead-r">'+supBldHtml()+'</div>':'');
  var sel=ofSelOf(L),r=tk==='A'?supBldHtml():tk==='C'?teamsHtml():leadRightHtml(sel);
  return '<div class="lead t'+tk+'">'+ofLeftHtml(L,sel)+'<div class="lead-r">'+r+'</div></div>';
}
/* 직분자 탭 오른쪽: 보조 칸이 있는 기능 건물 카드 */
function supBldHtml(){
  var B=S.buildings.filter(function(b){return supSlots(b)>0;}).sort(function(a,b){return (b.fixed?1:0)-(a.fixed?1:0)||a.id-b.id;});
  var used=B.reduce(function(n,b){return n+(b.supportStaff||[]).length;},0),fr=supFree().length;
  var h='<div class="sbulk tbar"><span class="tinfo">보조 직분자 '+used+'명 배치 · 대기 '+fr+'명 · 빈칸을 누르고 왼쪽 직분자를 고르세요</span><button class="btn pri" data-act="ofsupauto"'+(fr?'':' disabled')+'>⚙️ 직분자 자동 배치</button></div>';
  if(!B.length)return h+'<p class="sempty">보조 인력을 둘 기능 건물(예배·교제·매장)이 아직 없어요.</p>';
  return h+'<div class="bsg">'+B.map(supCardHtml).join('')+'</div>';
}
function supCardHtml(b){
  var d=defOf(b),n=supSlots(b),L=b.supportStaff||[],k0=bPerf(b)/supK(b),bf=supK(b)-1,mw=mgrOf(b),pk=UI.ofPick,sl='';
  for(var i=0;i<n;i++){var p=L[i]&&ppById(L[i]);
    sl+=p?'<button class="slt full" data-act="ofsupdel" data-v="'+b.id+':'+p.id+'" title="'+p.n+' · 누르면 빼요" aria-label="'+p.n+' 빼기, 성능 +'+pctS(supBuff(p))+'"><img alt="" src="'+personFace(p)+'"><em>+'+pctS(supBuff(p))+'</em></button>':
      '<button class="slt empty'+(pk&&pk.t==='sup'&&pk.v===b.id?' pk':'')+'" data-act="ofslot" data-v="sup:'+b.id+'" aria-label="'+d.name+' 보조 빈칸 — 직분자 배치">＋</button>';}
  var ef=effText(d).split(' · ').filter(function(x){return !/^유지비/.test(x);}).slice(0,2).join(' · ');
  return '<div class="bsc'+(L.length?' on':'')+'"><div class="bsc-h"><b>'+d.name+'</b><span class="bsc-lv">'+(hasLv(b)?'★ Lv '+bLv(b):'')+'</span></div>'+
    '<p class="bsc-e">'+(ef?ef+' · ':'')+'기본 성능 ×'+k0.toFixed(2)+(b.fixed?' (담임목사)':mw?' ('+mw.name+')':' <em>(메인 관리자 없음)</em>')+'</p>'+
    '<div class="bsc-s">'+sl+'</div>'+
    '<p class="bsc-b">'+(L.length?'보조 버프 <b>+'+pctS(bf)+'</b> → 성능 ×'+(k0*(1+bf)).toFixed(2):'보조 직분자를 세우면 성능이 올라요')+'</p></div>';
}
/* 리더 탭 오른쪽: 고른 리더가 맡은 성도 칸. 빈칸을 누르면 담당할 성도를 고른다 */
function leadSlotHtml(sid,l){
  var s=sid&&ppById(sid),x=tN(leadXp(l));
  if(!s)return '<button class="lslot empty" data-act="ldslot" aria-label="빈 칸 — 담당할 성도 배치, 매주 호감 +'+x+'"><span>＋</span><small>♥+'+x+'/주</small></button>';
  return '<button class="lslot full" data-act="ldfree" data-v="'+s.id+'" aria-label="'+s.n+' 빼기" title="누르면 빼요 · 매주 호감 +'+x+'"><img alt="" src="'+personFace(s)+'"><span class="ls-n">'+s.n+'</span><span class="ls-l">♥'+s.lv+'</span><span class="ls-x">+'+x+'/주</span></button>';
}
function leadRightHtml(sel){
  var sl=leadSlots(sel),mine=sel.assignedSaints||[],free=ppFreeSaints(),slots='';
  for(var i=0;i<sl;i++)slots+=leadSlotHtml(mine[i],sel);
  var nx=sl<(ppNode(sel).cap||0)?'호감 Lv '+(Math.floor(sel.lv/LEAD_SLOT_LV)+1)*LEAD_SLOT_LV+'에 한 칸 더':'최대 칸이에요';
  var r='<div class="lead-h"><div><b>'+sel.n+' '+ppRankName(sel)+'</b><small>맡은 성도 '+mine.length+' / '+sl+' · '+(sl?'성도마다 매주 ♥ +'+tN(leadXp(sel))+' · '+nx:'소그룹 리더가 되면 성도를 맡아요')+'</small></div>'+
    '<button class="btn pri" data-act="ldauto"'+(sl&&mine.length<sl&&free.length?'':' disabled')+'>⚡ 자동 배정</button></div>';
  r+=sl?'<div class="lead-slots">'+slots+'</div>':'<p class="sempty">이 단계는 성도를 맡지 않아요.</p>';
  if(UI.leadPick&&sl&&mine.length<sl)r+='<div class="lead-pick"><b>담당할 성도를 고르세요 <small>(호감 Lv 낮은 순)</small></b>'+(free.length?'<div class="lp-g">'+free.map(function(s){
    return '<button class="lp" data-act="ldpick" data-v="'+s.id+'" aria-label="'+s.n+' 호감 Lv '+s.lv+'"><img alt="" src="'+personFace(s)+'"><span>'+s.n+'</span><small>♥'+s.lv+'</small></button>';}).join('')+'</div>':'<p class="sempty">맡길 성도가 없어요 (제자반 전 성도만 맡길 수 있어요)</p>')+'</div>';
  return r;
}
// 예전 이름 (봇·시험)
function leadHtml(){return offHtml();}
function officersHtml(){return offHtml();}
function scrLeadClick(a,v){
  if(UI.scr!=='officers'||a.indexOf('ld')!==0)return false;
  if(a==='ldopen'){UI.leadSel=+v;UI.leadPick=false;sfx('click',.4);}
  else if(a==='ldslot'){UI.leadPick=!UI.leadPick;sfx('click',.4);}
  else if(a==='ldpick'){var w=ppAssign(UI.leadSel,+v);if(w){scrToast(w,2200);sfx('error',.4);}else{sfx('join',.5,0);var l=ppById(UI.leadSel);if((l.assignedSaints||[]).length>=leadSlots(l))UI.leadPick=false;}save();}
  else if(a==='ldfree'){ppUnassign(UI.leadSel,+v);sfx('click',.4);save();}
  else if(a==='ldauto'){var n=ppAutoAssign(UI.leadSel);if(n){sfx('join',.5,0);scrToast('성도 '+n+'명을 배정했어요',1800);save();}else{scrToast('배정할 성도나 빈 칸이 없어요',1800);sfx('error',.4);}UI.leadPick=false;}
  else return false;
  renderScreen();return true;
}
// 빈칸 → 왼쪽 카드로 배치. 다른 곳에 있던 사람은 옮겨 온다
function ofPlace(pid){
  var k=UI.ofPick,w='';if(!k)return '';
  var p=ppById(pid);if(!p)return '찾을 수 없어요';
  if(k.t==='sup'){
    var b=bById(k.v);if(!b)return '찾을 수 없어요';
    if(!supEligible(p))return '직분자 갈래(헌신성도·집사·장로·권사)만 보조 인력이 돼요';
    var at=supOf(pid);if(at===k.v)return '이미 이 건물에 있어요';
    if((b.supportStaff||[]).length>=supSlots(b))return '보조 자리가 가득 찼어요';
    if(at)supRemove(at,pid);w=supPut(k.v,pid);if(!w)recalc();
  }else{
    var tm=teamOf(pid);if(tm===k.v)return '이미 이 팀이에요';
    if(tm){S.servants[tm]=teamServants(tm).filter(function(i){return i!==pid;});w=teamServeWhy(k.v,pid);if(w){teamServants(tm).push(pid);return w;}}
    w=teamServe(k.v,pid);
  }
  return w;
}
function scrOffClick(a,v){
  if(UI.scr!=='officers')return false;
  if(a==='disgo'){var q=String(v).split(':'),pp=ppById(+q[0]),w=ppTrain(+q[0],DIS_FIRST[q[1]]);if(w){scrToast(w,2000);sfx('error',.4);}else{sfx('coins',.55,0);scrToast(pp.n+' 성도의 '+nodeTr(pp.tr.to,pp.g)+'을(를) 시작했어요',2200);}}
  else if(a==='ofslot'){var s=String(v).split(':');UI.ofPick={t:s[0],v:s[0]==='sup'?+s[1]:s[1]};sfx('click',.4);}
  else if(a==='tmslot'){UI.ofPick={t:'tm',v:v};sfx('click',.4);}
  else if(a==='ofcancel'){UI.ofPick=null;}
  else if(a==='ofpick'){var w=ofPlace(+v);if(w){scrToast(w,2200);sfx('error',.4);}else{sfx('join',.5,0);UI.leadSel=+v;UI.ofPick=null;}}
  else if(a==='ofsupdel'){var q=String(v).split(':');supRemove(+q[0],+q[1]);recalc();sfx('click',.4);}
  else if(a==='ofsupauto'){var n=supAuto();if(n){recalc();sfx('join',.5,0);scrToast('직분자 '+n+'명을 배치했어요',1800);}else{sfx('error',.4);scrToast('배치할 직분자나 빈 칸이 없어요',1800);}}
  else return false;
  renderScreen();hud(true);return true;
}
// 단계 하나가 주는 것 (매주 헌금·목양·운영비·노후)
function nodeEff(id){
  var t=PP_TREE[id],L=[];
  if(t.give)L.push('매주 헌금 +'+t.give);if(t.cap)L.push('목양 수용력 +'+t.cap);if(t.upk)L.push('운영비 −'+Math.round(t.upk*1000)/10+'%');if(t.dec)L.push('노후 −'+Math.round(t.dec*100)+'%');
  if(id==='deacon')L.push(OFFICE.deacon.desc);if(id==='elder')L.push('장로: '+OFFICE.elder.desc+' / 권사: '+OFFICE.kwonsa.desc);
  return L.join(', ');
}
function asSeed(a){if(a.seed)return a.seed;var s=7;for(var i=0;i<a.name.length;i++)s=(s*31+a.name.charCodeAt(i))%999983;return s;}
function lvBar(lv,xp,need,max){
  var full=lv>=max,p=full?100:Math.round(clamp(xp/need,0,1)*100);
  return '<div class="lvrow">'+heartLv(lv)+'<div class="bar"><i style="width:'+p+'%"></i></div><span>'+(full?'최고':Math.floor(xp)+' / '+need)+'</span></div>';
}
function careBtn(act,v,label,cost,why){
  return '<button class="btn'+(why?'':' pri')+'" data-act="'+act+'" data-v="'+v+'"'+(why?' disabled':'')+' title="'+(why||'')+'">'+label+' · '+fmt(cost)+'</button>';
}
function ppDlgHtml(p){
  var t=ppNode(p),nx=ppNexts(p),vw=ppCareWhy(p,'visit'),gw=ppCareWhy(p,'gift'),ready=p.tr&&p.tr.ready,train=p.tr&&!p.tr.ready;
  var rows=[['매주 헌금','약 '+fmt(ppGiveOf(p))+(t.give?' <small>(단계 +'+t.give+')</small>':'')],['은사',FIELDS[p.gift].name],['등록',dateText(p.jw,true)]];
  var eff=nodeEff(p.node);if(eff)rows.splice(1,0,[ppRankName(p)+'의 섬김',eff]);
  if(p.ext)rows.push(['청빙',stars(p.ext.skill)+' · 월 사례비 '+fmt(p.ext.pay)+' <button class="btn sm" data-act="ppfire" data-v="'+p.id+'">내보내기</button>']);
  var h='<div class="sdlg" role="dialog" aria-label="'+p.n+' 성도"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big" data-pp="'+p.id+'">'+ringSvg(ppProg(p))+'<span class="ppi">'+portraitHtml(p)+'</span></span>'+
    '<div class="sdt"><h3>'+p.n+' <span class="rchip t'+(ppTrack(p)||'0')+'">'+ppRankName(p)+'</span></h3>'+lvBar(p.lv,p.xp,ppNeed(p.lv),PP_LV_MAX)+'<p class="say">“'+ppThought(p)+'”</p></div></div>'+
    (typeof concernBlock==='function'?concernBlock(p):'')+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    '<div class="sdb two">'+careBtn('ppvisit',p.id,'심방',PP_VISIT.cost,vw)+careBtn('ppgift',p.id,'선물',PP_GIFT.cost,gw)+'</div>'+
    ((vw&&vw!=='자금이 부족해요')||(gw&&gw!=='자금이 부족해요')?'<p class="snote">'+(vw===gw?vw:[vw?'심방: '+vw:'',gw?'선물: '+gw:''].filter(Boolean).join(' · '))+'</p>':'<p class="snote">심방 호감 +'+PP_VISIT.xp+' · 선물 호감 +'+PP_GIFT.xp+'</p>');
  if(ready||train){
    var to=p.tr.to;
    h+='<div class="snext"><div class="snt"><b>'+nodeTr(to,p.g)+'</b><span>다 마치면 '+(to==='assoc'?'부교역자':nodeName(to,p.g))+'</span></div>'+
      (ready?'<button class="btn pri big claim" data-act="ppappoint" data-v="'+p.id+'">'+nodeDone(to,p.g)+'</button>':'<button class="btn big" disabled data-evleft>'+nodeTr(to,p.g)+' 중 · '+ppLeftText(p)+' 남음</button>')+'</div>';
  }else if(nx.length){
    h+='<div class="snext"><div class="snt"><b>다음 단계'+(nx.length>1?' · 갈래를 하나 골라요':'')+'</b><span>'+(nx.length>1?'한 번 고르면 바꿀 수 없어요':'')+'</span></div>';
    if(p.node==='seminary')h+='<p class="snote left">평신도로 남으면 매주 헌금 +'+t.give+'을 계속 드려요. 부교역자가 되면 그 헌금은 사라지지만 별 5개('+FIELDS[p.gift].name+', 효과 × '+ASSOC_HOME_K+') 사역자를 얻어요.</p>';
    h+='<div class="sopts">'+nx.map(function(id){var st=PP_TREE[id],w=ppTrainWhy(p,id),tk=st.t&&nx.length>1?PP_TRACK[st.t]:null;
      return '<div class="sopt"><div><b>'+nodeAct(id,p.g)+'</b>'+(tk?' <span class="rchip t'+st.t+'">'+tk.n+'</span>':'')+'<small>호감 Lv '+st.lv+' · '+nodeTr(id,p.g)+' '+durText(st.dur)+(tk?' · '+tk.desc:'')+'</small>'+(w?'<small class="bad">'+w+'</small>':'')+'</div>'+
        '<button class="btn pri" data-act="pptrain" data-v="'+p.id+'" data-to="'+id+'"'+(w?' disabled':'')+'>시작 · '+fmt(st.cost)+'</button></div>';}).join('')+'</div></div>';
  }
  return h+'</div>';
}
// 성도·직분자 화면의 버튼. 처리했으면 true
function scrPeopleClick(a,v,el){
  if(a==='ppopen'){UI.scrSel={t:'pp',id:+v};sfx('click',.4);renderScreen();return true;}
  if(a==='ppfire'){var fp=ppById(+v);if(fp&&fp.ext){hireFire(+v);UI.scrSel=null;scrToast(fp.n+'님을 내보냈어요 · 사례비가 더 나가지 않아요',2000);}renderScreen();hud(true);return true;}
  if((a==='bulk'||a==='bulkgrow')&&!featOk('bulk')){scrToast('일괄 처리는 '+featWhy('bulk'),1800);sfx('error',.4);return true;}
  if(a==='bulk'){
    var o=ppCareAll(scrPeople(),v),nm={visit:'심방',gift:'선물'}[v];
    if(!o.done){scrToast(o.poor?'자금이 부족해요':'지금 '+nm+'할 사람이 없어요',2000);sfx('error',.4);}
    else{sfx('coins',.6,0);if(o.up)setTimeout(function(){sfx('join',.6,0);},160);scrToast(o.done+'명에게 '+nm+'했어요'+(o.up?' · '+o.up+'명 레벨 업':'')+(o.poor?' · '+o.poor+'명은 자금이 모자라 다음에':''),2800);}
    renderScreen();hud(true);return true;
  }
  if(a==='bulkgrow'){
    var to=el.dataset.to,tr=el.dataset.k==='tr',o2=tr?ppTrainAll(scrPeople(),to):ppAppointAll(scrPeople(),to),g0=scrPeople()[0];
    if(!o2.done){scrToast(o2.poor?(tr?'자금이 모자라요':'자리가 없어요'):'할 수 있는 사람이 없어요',2000);sfx('error',.4);}
    else{sfx(tr?'coins':'bell',.6,0);if(!tr)setTimeout(function(){sfx('join',.6,0);},180);scrToast(o2.done+'명 '+(tr?nodeTr(to,'m')+' 시작':nodeDone(to,'m'))+(o2.poor?' · '+o2.poor+'명은 '+(tr?'자금이 모자라 다음에':'자리가 없어요'):'')+' (낮은 레벨부터)',2800);}
    renderScreen();hud(true);return true;
  }
  if(a==='carepick'){
    var cr=careChoose(+v,+el.dataset.i);
    if(cr==null){scrToast('지금은 고를 수 없어요',1800);sfx('error',.4);}
    else{sfx(careLastOk?'join':'error',.6,0);UI.scrSel={t:'cr'};}
    renderScreen();hud(true);return true;
  }
  if(a==='pplist'){UI.ppList=!UI.ppList;UI.ppMore=PP_PAGE;sfx('click',.4);renderScreen();return true;}
  if(a==='stg'){
    var k=el.dataset.k,L2=scrPeople().filter(function(p){return p.node===v;}),nm2,o3;
    if(k==='visit'||k==='gift'){o3=ppCareAll(L2,k);nm2=k==='visit'?'심방':'선물';
      if(!o3.done){scrToast(o3.poor?'자금이 부족해요':'지금 '+nm2+'할 사람이 없어요',2000);sfx('error',.4);}
      else{sfx('coins',.6,0);if(o3.up)setTimeout(function(){sfx('join',.6,0);},160);scrToast(nodeName(v,'m')+' '+o3.done+'명에게 '+nm2+'했어요'+(o3.up?' · '+o3.up+'명 레벨 업':'')+(o3.poor?' · '+o3.poor+'명은 자금이 모자라 다음에':''),2800);}}
    else if(k==='tr'){var to3=ppSoleNext(L2[0]);o3=to3?ppTrainAll(L2,to3):{done:0,poor:0};
      if(!o3.done){scrToast(o3.poor?'자금이 모자라요':'지금 시작할 수 있는 사람이 없어요',2000);sfx('error',.4);}
      else{sfx('coins',.6,0);scrToast(o3.done+'명 '+nodeTr(to3,'m')+' 시작'+(o3.poor?' · '+o3.poor+'명은 자금이 모자라 다음에':''),2600);}}
    else if(k==='ap'){var tos={},n3=0,p3=0;L2.forEach(function(p){if(p.tr&&p.tr.ready)tos[p.tr.to]=1;});
      Object.keys(tos).forEach(function(t){var r=ppAppointAll(L2,t);n3+=r.done;p3+=r.poor;});
      if(!n3){scrToast(p3?'자리가 없어요':'임명할 사람이 없어요',2000);sfx('error',.4);}
      else{sfx('bell',.7,0);setTimeout(function(){sfx('join',.6,0);},180);scrToast(n3+'명을 임명했어요'+(p3?' · '+p3+'명은 자리가 없어요':''),2600);}}
    renderScreen();hud(true);return true;
  }
  if(a==='carefilter'){UI.careOnly=!UI.careOnly;UI.ppMore=PP_PAGE;sfx('click',.4);renderScreen();return true;}
  if(a==='ppmore'){UI.ppMore=(UI.ppMore||PP_PAGE)+PP_PAGE;renderScreen();return true;}
  if(a==='ppvisit'||a==='ppgift'){
    var p=ppById(+v),r=ppCare(+v,a==='ppgift'?'gift':'visit');
    if(r&&r.charAt(0)!=='+'){scrToast(r,2000);sfx('error',.4);}
    else{sfx('coins',.5,0);if(r){setTimeout(function(){sfx('join',.6,0);},160);scrToast(p.n+' 성도와 더 가까워졌어요 · 호감 Lv '+p.lv,2400);}else scrToast(a==='ppgift'?p.n+' 성도에게 선물을 전했어요':p.n+' 성도를 심방했어요',1800);}
    renderScreen();hud(true);return true;
  }
  if(a==='pptrain'){
    var q=ppById(+v),to=el&&el.dataset.to,w=ppTrain(+v,to||undefined);
    if(w){scrToast(w,2000);sfx('error',.4);}else{sfx('coins',.55,0);scrToast(q.n+' 성도의 '+nodeTr(q.tr.to,q.g)+'을(를) 시작했어요',2200);}
    renderScreen();hud(true);return true;
  }
  if(a==='ppappoint'){
    var msg=ppAppoint(+v);
    if(msg){sfx('bell',.7,0);setTimeout(function(){sfx('join',.7,0);},200);scrToast(msg,3000);if(!ppById(+v))UI.scrSel=null;}
    else{scrToast('부교역자 자리가 없어요 (성도 '+ASSOC_PER+'명마다 한 자리)',2200);sfx('error',.4);}
    renderScreen();hud(true);return true;
  }
  return false;
}

/* ---------- 관리자 배치 화면 (managers.js) ----------
   선택 카드의 '👤 관리자'로 연다 (UI.mgrB = 건물 id). 이 건물을 맡을 수 있는 사람들을 카드로 보여 주고, 누르면 배치·해제한다.
   교회에서 기른 사람은 금빛 테두리, 밖에서 청빙한 사람은 푸른 테두리. 한켠의 '외부 청빙'은 후보 3명 창(다시 뽑기는 큰돈) */
function mgrScrB(){var b=UI.mgrB&&bById(UI.mgrB);return b&&mgrRole(b)?b:null;}
function kText(k){return '성능 ×'+(Math.round(k*100)/100).toFixed(2);}
function mgrHtml(){
  var b=mgrScrB();if(!b)return '<p class="sempty">관리자를 둘 건물을 지도에서 골라 주세요.</p>';
  var r=mgrRole(b),R=MGR_ROLE[r],cur=mgrOf(b),L=mgrPool(r);
  var h='<div class="sbulk mgrh"><span><b>'+defOf(b).name+'</b> · '+R.sub+' 맡아야 가동해요 · 지금: '+(cur?cur.name+' ('+kText(cur.k)+')':'<em>없음</em>')+'</span>'+
    (cur?'<button class="btn" data-act="mgrclear">관리자 빼기</button>':'')+'<button class="btn pri" data-act="hireopen">＋ 청빙</button></div>'+
    '<p class="shint"><i class="mk in"></i>교회에서 기른 사람(성능이 높아요) · <i class="mk ex"></i>밖에서 청빙한 사람. 건물을 맡은 사람은 <b>성도 돌봄(자동 심방)</b>에서 빠져요 — 둘 중 하나만 할 수 있어요. 이미 다른 건물을 맡은 분은 그 건물에서 먼저 빼거나 바꿔야 해요.</p>';
  if(!L.length)return h+'<p class="sempty">아직 맡길 '+R.n+'이(가) 없어요. <b>＋ 청빙</b>으로 '+R.n+'을(를) 모셔 오세요'+(r==='staff'?' (매장은 청빙직원만 맡아요)':' (신학교를 마친 성도도 부교역자가 돼요)')+'.</p>';
  return h+'<div class="evg">'+L.map(function(w){
    var here=w.at===b.id,ob=w.at&&!here?bById(w.at):null,st=here?'이 건물 담당':ob?defOf(ob).name+' 담당':'대기 중';
    return '<div class="mgrw"><button class="evc ppc mgrc '+w.src+(here?' here':'')+(ob?' away':'')+'" data-act="mgrset" data-v="'+w.key+'" aria-label="'+w.name+', '+(w.src==='in'?'교회에서 기른 사람':'외부 청빙')+', '+st+'">'+
      '<span class="evr">'+ringSvg(0)+'<span class="ppi">'+portraitHtml({seed:w.seed,g:w.g})+'</span></span>'+
      '<span class="evn">'+w.name+'</span><span class="evp">'+kText(w.k)+'</span><small>'+st+'</small></button>'+
      (w.ext?'<button class="mgrx" data-act="hirefire" data-v="'+w.pid+'" aria-label="'+w.name+' 내보내기" title="내보내기 (사례비가 더 나가지 않아요)">내보내기</button>':'')+'</div>';}).join('')+'</div>';
}
function scrMgrClick(a,v){
  if(UI.scr!=='mgr')return false;
  var b=mgrScrB();if(!b)return false;var r=mgrRole(b),why;
  if(a==='mgrset'){
    if(b.mgr===v){mgrClear(b.id);scrToast('관리자를 뺐어요 · 다시 성도 돌봄을 맡을 수 있어요',2000);}
    else{why=mgrSet(b.id,v);if(why){scrToast(why,2000);sfx('error',.4);}else{sfx('join',.5,0);scrToast(mgrOf(b).name+'님이 '+defOf(b).name+'을(를) 맡았어요',2200);}}
  }else if(a==='mgrclear'){mgrClear(b.id);scrToast('관리자를 뺐어요',1600);}
  else if(a==='hirefire'){hireFire(+v);scrToast('내보냈어요 · 사례비가 더 나가지 않아요',1800);}
  else if(a==='hireopen'){sfx('click',.4);openHire(r==='pastor'?'assoc':'C',b.id);return true;}
  else return false;
  renderScreen();hud(true);return true;
}

/* ---------- 청빙 화면 ----------
   큰 카드 한 줄(옆으로 넘김): 갈래 휘장 · 세로 이름 · 등급 · 큰 그림 · 아래 능력과 값. 누르면 사연과 '청빙' 단추가 있는 창.
   그림은 생성 초상화(assets/portraits/hirecard, hcPortrait)다 (.hc-art) */
var HC_GRADE=['','D','C','B','A','S'],HC_EM={C:'직',assoc:'교'};
function hcList(){
  var tab=UI.scr==='roster'?'all':UI.scrTab,L=[];
  VOL_TYPES.forEach(function(t){if(tab==='all'||tab===t)volCands(t).forEach(function(c,i){L.push({id:t+':'+i,t:t,i:i,c:c});});});
  if(tab==='all'||tab==='assoc')(S.cands||[]).forEach(function(c,i){L.push({id:'assoc:'+i,t:'assoc',i:i,c:c});});
  return L;
}
function hcFind(id){var s=String(id).split(':'),t=s[0],i=+s[1],c=t==='assoc'?(S.cands||[])[i]:(VOL_TYPES.indexOf(t)>=0?volCands(t)[i]:null);return c?{id:id,t:t,i:i,c:c}:null;}
/* 초상화: 후보마다 8명 중 한 명(c.pi, hiredata.js) */
function hcPortrait(x){return hirePortrait(x.c,x.t);}
function hcRole(x){return x.t==='assoc'?x.c.title:'청빙직원';}
function hcStars(n){return '<span class="hst" aria-label="능력 별 '+n+'개">'+'★★★★★'.slice(0,n)+'<i>'+'★★★★★'.slice(n)+'</i></span>';}
function hcCardHtml(x){
  var c=x.c,poor=S.money<c.fee;
  return '<button class="hcard t'+x.t+(poor?' poor':'')+'" data-act="hcopen" data-v="'+x.id+'" aria-label="'+c.name+' '+hcRole(x)+', 능력 별 '+c.skill+'개, 청빙'+(c.fee?' '+fmt(c.fee):'')+(c.nw?', 새 이력서':'')+'">'+
    (c.nw?'<span class="hc-new">NEW</span>':'')+'<span class="hc-em" aria-hidden="true">'+HC_EM[x.t]+'</span><span class="hc-name">'+c.name+'</span><span class="hc-grade g'+c.skill+'">'+HC_GRADE[c.skill]+'</span>'+
    '<span class="hc-art"><img alt="" src="'+hcPortrait(x)+'"></span>'+
    '<span class="hc-foot"><b>'+hcRole(x)+'</b>'+hcStars(c.skill)+'<small class="hc-story">'+(c.story||'')+'</small><small>'+(x.t==='assoc'?FIELDS[c.field].name+' 사역':kText(exK(c.skill)))+' · 월 '+fmtS(c.pay)+'</small><em>'+(c.fee?'<i class="coin" aria-hidden="true"></i>'+fmt(c.fee):'청빙비 없음')+(c.rr?' · 교체함':' · 🎲 교체 1회')+'</em></span></button>';
}
function hireHtml(){
  var L=hcList(),fb=UI.hireFor&&bById(UI.hireFor);
  var h='<div class="sbulk"><span>'+(fb?'<b>'+defOf(fb).name+'</b>을(를) 맡을 분을 찾는 중 · ':'')+'후보 '+L.length+'명 · 부교역자 '+S.assoc.length+' / '+assocSlots()+'명 · 📨 이력서는 때때로 도착해요 (갈래마다 최대 '+HIRE_CAND_MAX+'명)</span></div>'+
    '<p class="shint">카드를 눌러 사연을 읽고 청빙하세요. 청빙비는 없고 <b>월 사례비</b>만 나가요. 예배·교제 건물(부서실 포함)은 <b>부교역자</b>가, 매장은 <b>청빙직원</b>이 메인 관리자로 맡아야 가동돼요. 마음에 들지 않으면 후보마다 한 번 '+fmt(HIRE_REROLL)+'을 내고 다른 후보로 바꿀 수 있어요.</p>';
  if(!L.length)return h+'<p class="sempty">지금은 후보가 없어요. 이력서가 도착하면 알려 드릴게요.</p>';
  return h+'<div class="hcards">'+L.map(hcCardHtml).join('')+'</div>';
}
function hcDlgHtml(id){
  var x=hcFind(id),c=x.c,as=x.t==='assoc',full=as&&S.assoc.length>=assocSlots(),poor=S.money<c.fee,sw=hireSwapWhy(x.t,x.i);
  var rows=as?[['분야',FIELDS[c.field].name+' — '+FIELDS[c.field].desc+' (별마다)'],['맡는 일','예배·교제 건물(부서실 포함) 관리 · 성도 돌봄 · 목양 수용력 +35'],['월 사례비',fmt(c.pay)]]:
    [['자리','청빙직원으로 성도 명단과 직원 화면에 들어가요'],['맡는 일','매장(기능 건물) 메인 관리자만 · '+kText(exK(c.skill))+' (호감 레벨이 오르면 더 좋아져요)'],['월 사례비',fmt(c.pay)]];
  return '<div class="sdlg hcdlg t'+x.t+'" role="dialog" aria-label="'+c.name+' 청빙"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="hc-art big"><img alt="" src="'+hcPortrait(x)+'"></span>'+
    '<div class="sdt"><h3>'+c.name+' <span class="rchip t'+(as?'B':x.t)+'">'+hcRole(x)+'</span></h3>'+hcStars(c.skill)+'<p class="say">“'+(c.story||'새 사역지를 찾고 있어요.')+'”</p></div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    (full?'<p class="swhy">부교역자 자리가 없어요 (성도 '+ASSOC_PER+'명마다 한 자리)</p>':'')+
    '<div class="sdb"><button class="btn" data-act="hcswap" data-v="'+id+'"'+(sw?' disabled title="'+sw+'"':'')+' title="이 후보 자리는 한 번만 다른 후보로 바꿀 수 있어요">🎲 '+(c.rr?'교체함':'교체 1회 · '+fmt(HIRE_REROLL))+'</button><span class="runc">'+(c.fee?'<i class="coin" aria-hidden="true"></i>'+fmt(c.fee):'청빙비 없음')+'</span><button class="btn pri big" data-act="hctake" data-v="'+id+'"'+(full||poor?' disabled':'')+'>청빙</button></div></div>';
}
function scrHireClick(a,v){
  if(UI.scr!=='hire'&&!(UI.scr==='roster'&&UI.scrTab==='hire'))return false;
  var why;
  if(a==='hcopen'){UI.scrSel={t:'hc',id:v};var hx=hcFind(v);if(hx)delete hx.c.nw;sfx('click',.4);}
  else if(a==='hcswap'){var sx=hcFind(v);why=sx?hireSwap(sx.t,sx.i):'후보가 없어요';if(why){scrToast(why,2000);sfx('error',.4);}else{sfx('coins',.5,0);scrToast('다른 후보가 찾아왔어요 · '+hcFind(v).c.name,1800);}}
  else if(a==='hctake'){
    var x=hcFind(v);if(!x)return true;var nm=x.c.name,fb=UI.hireFor&&bById(UI.hireFor)?UI.hireFor:0;
    why=x.t==='assoc'?hireAssoc(x.i,fb):volHire(x.t,x.i,fb);
    if(why){scrToast(why,2400);sfx('error',.4);}
    else{UI.scrSel=null;sfx('join',.6,0);var put=fb&&mgrOf(bById(fb));
      if(put){scrBack();scrToast(nm+'님을 모셨어요 · '+defOf(bById(fb)).name+' 가동 시작',2600);hud(true);return true;}
      scrToast(nm+'님을 '+(x.t==='assoc'?'부교역자':'청빙직원')+'(으)로 모셨어요'+(x.t==='assoc'?'':' · 매장 관리자로 배치할 수 있어요'),2600);}
  }else return false;
  renderScreen();hud(true);return true;
}
