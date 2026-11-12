'use strict';
/* ---------- 전체 화면 (행사 …) ----------
   아래 기능 버튼 가운데 '행사'처럼 고를 것이 많은 기능은 지도 위 작은 창 대신 화면 전체를 쓴다.
   · 게임은 멈추지 않는다 (게이지가 눈앞에서 차오른다). ✕·Esc로 닫는다
   · 위: 제목·탭·자금·✕ / 가운데: 카드 격자 / 카드를 누르면 가운데 정보 창
   · 행사 카드: 동그란 그림 둘레에 초록 원형 게이지. 진행 중이면 차오르고(진행 효과가 있으면 둘레에 불꽃 빛),
     다 차면 '보상 수령'이 뜬다. 눌러야 보상을 받는다
   UI.scr = 열린 화면('events'), UI.scrTab = 탭, UI.scrSel = 정보 창에 띄운 것 */
var SCREENS={
  events:{title:'행사',tabs:[['events','행사'],['staff','사역팀']]},
  people:{title:'성도',tabs:[['all','전체'],['todo','할 일'],['new','새가족'],['grow','양육 중'],['lead','갈래']]},
  officers:{title:'직분자',tabs:[['off','직분'],['B','교역'],['C','섬김'],['assoc','부교역자'],['cands','청빙']]}
};
var PP_PAGE=60;
var RING_C=2*Math.PI*46;
function openScreen(k,tab){
  // 지도에서 하던 일(짓기·고르기·작은 창)은 정리한다
  UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.choose=null;UI.sel=null;UI.selPiece=null;UI.selFloor=null;UI.fold=true;UI.lastBuilt=null;
  UI.scr=k;UI.scrTab=tab||SCREENS[k].tabs[0][0];UI.scrSel=null;UI.ppMore=PP_PAGE;
  sfx('page',.35);renderPanel();renderScreen();
}
function closeScreen(){UI.scr=null;UI.scrSel=null;renderScreen();syncTabs();}
function ringSvg(p,cls){
  return '<svg class="ring'+(cls?' '+cls:'')+'" viewBox="0 0 100 100" aria-hidden="true"><circle class="rt" cx="50" cy="50" r="46"/><circle class="rp" cx="50" cy="50" r="46" stroke-dasharray="'+RING_C.toFixed(1)+'" stroke-dashoffset="'+(RING_C*(1-p)).toFixed(1)+'"/></svg>';
}
// 행사 카드 아래 한 줄: 지금 상태
function evLine(id){
  var e=EVENTS[id],st=evState(id);
  if((e.goal||0)>S.goal)return {t:'목표 '+e.goal+'개 후',c:'lock'};
  if(evReady(id))return {t:'보상 수령',c:'ready'};
  if(evRunning(id))return {t:evLeftText(id)+' 남음',c:'run'};
  if(e.season){var mo=monthOf();if(mo<e.season[0]||mo>e.season[1])return {t:evSeasonText(e)+'에 열려요',c:'wait'};}
  if(st.cd>0)return {t:st.cd+'주 뒤',c:'wait'};
  return {t:fmt(evCost(e)),c:S.money<evCost(e)?'poor':'cost'};
}
function evCardHtml(id){
  var e=EVENTS[id],ln=evLine(id),run=evRunning(id),rdy=evReady(id),p=evProg(id);
  return '<button class="evc '+ln.c+(run&&e.fx?' fx':'')+'" data-act="evopen" data-v="'+id+'" data-ev="'+id+'" aria-label="'+e.name+', '+ln.t+'">'+
    '<span class="evr">'+ringSvg(p)+'<span class="evi" style="--c:'+e.col+'">'+e.ic+'</span>'+(ln.c==='lock'?'<span class="evlk" aria-hidden="true">🔒</span>':'')+'</span>'+
    '<span class="evn">'+e.name+'</span><span class="evp" data-evp>'+(ln.c==='cost'||ln.c==='poor'?'<i class="coin" aria-hidden="true"></i>':'')+ln.t+'</span></button>';
}
function evDlgHtml(id){
  var e=EVENTS[id],st=evState(id),why=evBlock(id),run=evRunning(id),rdy=evReady(id),p=evProg(id);
  var rows=[['비용',fmt(evCost(e))],['소요 시간',durText(e.dur)]];
  if(e.fx)rows.push(['진행 중 효과',e.fx]);
  if(e.rwt)rows.push(['마무리 보상',e.rwt]);
  rows.push(['다시 열기','보상을 받고 '+e.cd+'주 뒤'+(e.season?' · '+evSeasonText(e)+'에만':'')]);
  var btn=rdy?'<button class="btn pri big claim" data-act="evclaim" data-v="'+id+'">보상 수령</button>':
    run?'<button class="btn big" disabled data-evleft>진행 중 · '+evLeftText(id)+' 남음</button>':
    '<button class="btn pri big" data-act="evstart" data-v="'+id+'"'+(why?' disabled':'')+'>행사 시작 · '+fmt(evCost(e))+'</button>';
  return '<div class="sdlg" role="dialog" aria-label="'+e.name+'"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big'+(run&&e.fx?' fx':'')+'" data-ev="'+id+'">'+ringSvg(p)+'<span class="evi" style="--c:'+e.col+'">'+e.ic+'</span></span>'+
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
  $('#scrTabs').innerHTML=sc.tabs.length>1?sc.tabs.map(function(t){var on=UI.scrTab===t[0];return '<button role="tab" data-act="scrtab" data-v="'+t[0]+'" aria-selected="'+on+'" class="'+(on?'on':'')+'">'+t[1]+'</button>';}).join(''):'';
  $('#scrMoney').textContent=fmt(S.money);
  var body=$('#scrBody'),top=body.scrollTop;
  if(UI.scr==='events'&&UI.scrTab==='staff'){
    // 사역팀·목양 수용력은 줄 목록으로
    body.className='sbody list';var keep=panel;panel=body;renderStaff('teams');panel=keep;
  }else if(UI.scr==='officers'&&UI.scrTab==='cands'){
    body.className='sbody list';var keep2=panel;panel=body;renderStaff('cands');panel=keep2;
  }else if(UI.scr==='people'){body.className='sbody';body.innerHTML=bulkBar()+peopleHtml();}
  else if(UI.scr==='officers'){body.className='sbody';body.innerHTML=bulkBar()+(UI.scrTab==='assoc'?assocHtml():officersHtml());}
  else if(UI.scr==='events'){
    body.className='sbody';
    var ids=Object.keys(EVENTS).filter(function(id){return !EVENTS[id].hidden;});
    body.innerHTML='<p class="shint">행사를 시작하면 둘레의 초록 게이지가 차올라요. 다 차면 <b>보상 수령</b>을 눌러 마무리하세요. 오래 열지 않으면 공동체가 침체돼요.</p><div class="evg">'+ids.map(evCardHtml).join('')+'</div>';
  }
  body.scrollTop=top;
  var dl=$('#scrDlg');
  var sel=UI.scrSel,dh='';
  if(sel&&sel.t==='ev'&&EVENTS[sel.id])dh=evDlgHtml(sel.id);
  else if(sel&&sel.t==='pp'&&ppById(sel.id))dh=ppDlgHtml(ppById(sel.id));
  else if(sel&&sel.t==='as'&&S.assoc[sel.id])dh=asDlgHtml(sel.id);
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
  var pb=$('#ppBadge'),pn=ppReadyCount();if(pb){pb.hidden=!pn;if(pn)pb.textContent=pn;}
}
function scrToast(msg,ms){
  var t=$('#scrToast');if(!t)return;t.textContent=msg;t.hidden=false;
  clearTimeout(scrToast.tm);scrToast.tm=setTimeout(function(){t.hidden=true;},ms||2400);
}
function scrClick(e){
  var el=e.target.closest('[data-act]');
  // 정보 창 바깥(어두운 곳)을 누르면 닫는다
  if(!el){if(e.target.id==='scrDlg'){UI.scrSel=null;renderScreen();}return;}
  if(scrPeopleClick(el.dataset.act,el.dataset.v,el))return;
  var a=el.dataset.act,v=el.dataset.v;
  if(a==='scrclose'){closeScreen();return;}
  if(a==='scrtab'){UI.scrTab=v;UI.scrSel=null;UI.ppMore=PP_PAGE;$('#scrBody').scrollTop=0;renderScreen();return;}
  if(a==='evopen'){UI.scrSel={t:'ev',id:v};sfx('click',.4);renderScreen();return;}
  if(a==='evclose'){UI.scrSel=null;renderScreen();return;}
  if(a==='evstart'){
    var why=runEvent(v);
    if(why){scrToast(why,2000);sfx('error',.4);}
    else{sfx('coins',.55,0);scrToast(EVENTS[v].name+'을(를) 시작했어요 · '+durText(EVENTS[v].dur)+' 뒤 보상을 받을 수 있어요',2600);F.push({x:entC(),y:PZ-2.5,z:1.4,t:2.4,d:2.4,text:EVENTS[v].name,col:'#ffe28a',big:1});}
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
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&UI.scr){if(UI.scrSel){UI.scrSel=null;renderScreen();}else closeScreen();}});
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
  return '<button class="evc ppc '+ln.c+'" data-act="ppopen" data-v="'+p.id+'" data-pp="'+p.id+'" aria-label="'+p.n+' '+ppRankName(p)+', 호감 레벨 '+p.lv+', '+ln.t+'">'+
    '<span class="evr">'+ringSvg(ppProg(p))+'<span class="ppi">'+portraitSvg(p)+'</span>'+heartLv(p.lv)+'</span>'+
    '<span class="evn">'+p.n+'</span><span class="evp" data-evp>'+ln.t+'</span></button>';
}
// 급한 순서: 임명 대기 → 다음 단계 가능 → 교육 중 → 직분·레벨 높은 순
function ppOrder(a,b){
  var k=function(p){return (p.tr&&p.tr.ready?4000:0)+(ppCanStep(p)?2000:0)+(p.tr&&!p.tr.ready?1000:0)+ppDepth(p)*120+p.lv;};
  return k(b)-k(a)||a.id-b.id;
}
// 지금 화면(탭)에 보이는 성도 목록 — 일괄 심방·선물도 이 목록에 한다
function scrPeople(){
  var all=(S.people||[]).slice(),tab=UI.scrTab;
  if(UI.scr==='officers')return all.filter(function(p){return ppTrack(p)===(tab==='off'?'A':tab);}).sort(ppOrder);
  return all.filter(function(p){var d=ppDepth(p);return tab==='new'?d===0:tab==='grow'?d>=1&&d<=3:tab==='lead'?d>=4:tab==='todo'?((p.tr&&p.tr.ready)||ppCanStep(p)):true;}).sort(ppOrder);
}
function bulkBar(){
  if(UI.scr==='officers'&&UI.scrTab==='assoc'){
    var na=S.assoc.filter(function(a){var w=asCheerWhy(a);return !w||w==='자금이 부족해요';}).length;
    if(!S.assoc.length)return '';
    return '<div class="sbulk"><span>부교역자 '+S.assoc.length+'명</span><button class="btn'+(na?' pri':'')+'" data-act="bulk" data-v="cheer"'+(na?'':' disabled')+'>모두 격려 · '+na+'명 · '+fmt(na*ASSOC_CHEER.cost)+'</button></div>';
  }
  var L=scrPeople();if(!L.length)return '';
  var nv=L.filter(function(p){return ppCareOk(p,'visit');}).length,ng=L.filter(function(p){return ppCareOk(p,'gift');}).length;
  return '<div class="sbulk"><span>이 목록 '+L.length+'명</span>'+
    '<button class="btn'+(nv?' pri':'')+'" data-act="bulk" data-v="visit"'+(nv?'':' disabled')+'>모두 심방 · '+nv+'명 · '+fmt(nv*PP_VISIT.cost)+'</button>'+
    '<button class="btn'+(ng?' pri':'')+'" data-act="bulk" data-v="gift"'+(ng?'':' disabled')+'>모두 선물 · '+ng+'명 · '+fmt(ng*PP_GIFT.cost)+'</button></div>';
}
function peopleHtml(){
  var all=(S.people||[]),tab=UI.scrTab,L=scrPeople();
  var cnt='등록 성도 '+all.length+'명 · 세례교인 '+all.filter(ppBaptized).length+'명 · 직분자 '+offTotal()+'명';
  var h='<p class="shint">'+cnt+'. 심방·선물로 호감 레벨을 올려 <b>세례 → 양육반 → 제자반</b>으로 기르고, 제자반 뒤에는 <b>직분·교역·섬김</b> 가운데 한 갈래로 세워요. 마지막 단계는 Lv 70부터예요.</p>';
  if(!L.length)return h+'<p class="sempty">'+(tab==='todo'?'지금 임명하거나 다음 단계로 세울 성도가 없어요. 심방으로 호감을 쌓아 보세요.':'여기에 해당하는 성도가 아직 없어요.')+'</p>';
  var n=Math.min(L.length,UI.ppMore||PP_PAGE);
  h+='<div class="evg">'+L.slice(0,n).map(ppCardHtml).join('')+'</div>';
  if(L.length>n)h+='<div class="smore"><button class="btn" data-act="ppmore">더 보기 · '+(L.length-n)+'명</button></div>';
  return h;
}
// 직분자 화면: 갈래(직분·교역·섬김)마다 단계별로 묶는다
function officersHtml(){
  var tk=UI.scrTab==='off'?'A':UI.scrTab,T=PP_TRACK[tk],L=scrPeople();
  var h='<p class="shint"><b>'+T.n+'</b> 갈래 · '+T.desc+'.</p>';
  if(!L.length)return h+'<p class="sempty">아직 이 갈래에 들어선 성도가 없어요. 성도 화면에서 제자반까지 기른 뒤 이 갈래를 골라 주세요.</p>';
  var ids=Object.keys(PP_TREE).filter(function(id){return PP_TREE[id].t===tk&&id!=='assoc';}).sort(function(a,b){return PP_TREE[b].d-PP_TREE[a].d;});
  ids.forEach(function(id){
    var G=L.filter(function(p){return p.node===id;});if(!G.length)return;var t=PP_TREE[id];
    var nm=id==='elder'?'장로·권사':t.n,eff=id==='deacon'?OFFICE.deacon.desc:id==='elder'?OFFICE.elder.desc+' / 권사: '+OFFICE.kwonsa.desc:nodeEff(id);
    h+='<div class="ssec"><b>'+nm+' '+G.length+'명</b><span>'+eff+'</span></div><div class="evg">'+G.map(ppCardHtml).join('')+'</div>';
  });
  return h;
}
// 단계 하나가 주는 것 (매주 헌금·목양·운영비·노후)
function nodeEff(id){
  var t=PP_TREE[id],L=[];
  if(t.give)L.push('매주 헌금 +'+t.give);if(t.cap)L.push('목양 수용력 +'+t.cap);if(t.upk)L.push('운영비 −'+Math.round(t.upk*1000)/10+'%');if(t.dec)L.push('노후 −'+Math.round(t.dec*100)+'%');
  if(id==='deacon')L.push(OFFICE.deacon.desc);if(id==='elder')L.push('장로: '+OFFICE.elder.desc+' / 권사: '+OFFICE.kwonsa.desc);
  return L.join(', ');
}
function asSeed(a){if(a.seed)return a.seed;var s=7;for(var i=0;i<a.name.length;i++)s=(s*31+a.name.charCodeAt(i))%999983;return s;}
function assocHtml(){
  var h='<p class="shint">함께 사역하는 부교역자 '+S.assoc.length+' / '+assocSlots()+'명 · 사례비 주 '+fmt(assocPay())+'. 눌러서 격려하면 레벨이 오르고 효과가 커져요. 새 사역자는 <b>청빙</b> 탭이나, 성도를 신학교에 보내 얻어요.</p>';
  if(!S.assoc.length)return h+'<p class="sempty">아직 함께 사역하는 부교역자가 없어요.</p>';
  return h+'<div class="evg">'+S.assoc.map(function(a,i){
    return '<button class="evc ppc rank" data-act="asopen" data-v="'+i+'" aria-label="'+a.name+' '+a.title+'"><span class="evr">'+ringSvg(0)+'<span class="ppi">'+portraitSvg({seed:asSeed(a),g:a.g||(asSeed(a)%2?'m':'f')})+'</span>'+heartLv(a.lv||1)+'</span>'+
      '<span class="evn">'+a.name+' '+a.title+'</span><span class="evp">'+FIELDS[a.field].name+' '+stars(a.skill)+'</span></button>';}).join('')+'</div>';
}
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
  var h='<div class="sdlg" role="dialog" aria-label="'+p.n+' 성도"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big" data-pp="'+p.id+'">'+ringSvg(ppProg(p))+'<span class="ppi">'+portraitSvg(p)+'</span></span>'+
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
function asDlgHtml(i){
  var a=S.assoc[i],cw=asCheerWhy(a),k=asSkill(a);
  var rows=[['분야',FIELDS[a.field].name+' '+stars(a.skill)+(a.home?' · 우리 교회에서 자란 사역자':'')],['효과',FIELDS[a.field].desc+' (별마다) · 목양 수용력 +35'],['지금 실력','별 '+(Math.round(k*10)/10)+'개만큼 일해요'],['사례비','주 '+fmt(a.pay)]];
  return '<div class="sdlg" role="dialog" aria-label="'+a.name+' '+a.title+'"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big">'+ringSvg(0)+'<span class="ppi">'+portraitSvg({seed:asSeed(a),g:a.g||(asSeed(a)%2?'m':'f')})+'</span></span>'+
    '<div class="sdt"><h3>'+a.name+' <span class="rchip r5">'+a.title+'</span></h3>'+lvBar(a.lv||1,a.xp||0,asNeed(a.lv||1),ASSOC_LV_MAX)+'<p>레벨마다 효과 +'+Math.round(ASSOC_LV_K*100)+'%</p></div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    '<div class="sdb two">'+careBtn('ascheer',i,'격려',ASSOC_CHEER.cost,cw)+'<button class="btn" data-act="dismiss" data-v="'+i+'">사임</button></div>'+
    '<p class="snote">'+(cw&&cw!=='자금이 부족해요'?cw:'격려하면 경험치 +'+ASSOC_CHEER.xp)+'</p></div>';
}
// 성도·직분자 화면의 버튼. 처리했으면 true
function scrPeopleClick(a,v,el){
  if(a==='ppopen'){UI.scrSel={t:'pp',id:+v};sfx('click',.4);renderScreen();return true;}
  if(a==='asopen'){UI.scrSel={t:'as',id:+v};sfx('click',.4);renderScreen();return true;}
  if(a==='bulk'){
    var o=v==='cheer'?asCheerAll():ppCareAll(scrPeople(),v),nm={visit:'심방',gift:'선물',cheer:'격려'}[v];
    if(!o.done){scrToast(o.poor?'자금이 부족해요':'지금 '+nm+'할 사람이 없어요',2000);sfx('error',.4);}
    else{sfx('coins',.6,0);if(o.up)setTimeout(function(){sfx('join',.6,0);},160);scrToast(o.done+'명에게 '+nm+'했어요'+(o.up?' · '+o.up+'명 레벨 업':'')+(o.poor?' · '+o.poor+'명은 자금이 모자라 다음에':''),2800);}
    renderScreen();hud(true);return true;
  }
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
    else{scrToast('부교역자 자리가 없어요 (성도 50명마다 한 자리)',2200);sfx('error',.4);}
    renderScreen();hud(true);return true;
  }
  if(a==='ascheer'){
    var as=S.assoc[+v],r2=asCheer(+v);
    if(r2&&r2.charAt(0)!=='+'){scrToast(r2,2000);sfx('error',.4);}else{sfx('coins',.5,0);scrToast(as.name+' '+as.title+'님을 격려했어요'+(r2?' · Lv '+as.lv:''),2000);}
    renderScreen();hud(true);return true;
  }
  return false;
}
