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
  people:{title:'성도',tabs:[['all','전체'],['todo','할 일'],['new','새가족'],['bapt','세례교인']]},
  officers:{title:'직분자',tabs:[['off','직분자'],['assoc','부교역자'],['cands','청빙']]}
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
  }else if(UI.scr==='people'){body.className='sbody';body.innerHTML=peopleHtml();}
  else if(UI.scr==='officers'){body.className='sbody';body.innerHTML=UI.scrTab==='assoc'?assocHtml():officersHtml();}
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
  if(lb&&sel&&sel.t==='pp'){var sp=ppById(sel.id);if(sp&&sp.tr&&!sp.tr.ready)lb.textContent=ppTrainName(sp)+' 중 · '+ppLeftText(sp)+' 남음';}
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
  if(scrPeopleClick(el.dataset.act,el.dataset.v))return;
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
  if(p.tr&&p.tr.ready)return {t:ppDoneName(p),c:'ready'};
  if(p.tr)return {t:'교육 '+ppLeftText(p),c:'run'};
  if(ppStep(p)&&p.lv>=ppStep(p).lv)return {t:['세례','집사',p.g==='m'?'장로':'권사','신학교','부교역자'][p.rank]+' 가능',c:'can'};
  return {t:ppRankName(p),c:'rank r'+p.rank};
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
  var k=function(p){return (p.tr&&p.tr.ready?4000:0)+(!p.tr&&ppStep(p)&&p.lv>=ppStep(p).lv?2000:0)+(p.tr&&!p.tr.ready?1000:0)+p.rank*50+p.lv;};
  return k(b)-k(a)||a.id-b.id;
}
function peopleHtml(){
  var all=(S.people||[]).slice(),tab=UI.scrTab;
  var L=all.filter(function(p){return tab==='new'?p.rank===0:tab==='bapt'?p.rank===1:tab==='todo'?((p.tr&&p.tr.ready)||(!p.tr&&ppStep(p)&&p.lv>=ppStep(p).lv)):true;}).sort(ppOrder);
  var cnt='등록 성도 '+all.length+'명 · 세례교인 '+all.filter(function(p){return p.rank>=1;}).length+'명 · 직분자 '+offTotal()+'명';
  var h='<p class="shint">'+cnt+'. 성도를 눌러 <b>심방</b>하고, 호감 레벨이 오르면 <b>세례 → 집사 → 장로·권사 → 신학교</b>로 세워 가요. 교육이 끝나면 직접 임명해 주세요.</p>';
  if(!L.length)return h+'<p class="sempty">'+(tab==='todo'?'지금 임명하거나 다음 단계로 세울 성도가 없어요. 심방으로 호감을 쌓아 보세요.':'여기에 해당하는 성도가 아직 없어요.')+'</p>';
  var n=Math.min(L.length,UI.ppMore||PP_PAGE);
  h+='<div class="evg">'+L.slice(0,n).map(ppCardHtml).join('')+'</div>';
  if(L.length>n)h+='<div class="smore"><button class="btn" data-act="ppmore">더 보기 · '+(L.length-n)+'명</button></div>';
  return h;
}
function officersHtml(){
  var all=(S.people||[]).filter(function(p){return p.rank>=2;});
  var h='<p class="shint">집사·권사·장로와 신학교를 마친 성도예요. 직분자는 목양 수용력을 늘리고 매주 헌금을 더 드려요. 눌러서 심방하고 다음 단계로 세워 주세요.</p>';
  if(!all.length)return h+'<p class="sempty">아직 세워진 직분자가 없어요. 성도 화면에서 세례를 베풀고 집사로 세워 보세요.</p>';
  [['신학 수료',function(p){return p.rank===4;},'평신도로 남으면 큰 헌금, 부교역자로 섭외하면 별 5개 사역자'],['장로',function(p){return p.rank===3&&p.g==='m';},OFFICE.elder.desc],['권사',function(p){return p.rank===3&&p.g==='f';},OFFICE.kwonsa.desc],['집사',function(p){return p.rank===2;},OFFICE.deacon.desc]].forEach(function(g){
    var L=all.filter(g[1]).sort(ppOrder);if(!L.length)return;
    h+='<div class="ssec"><b>'+g[0]+' '+L.length+'명</b><span>'+g[2]+'</span></div><div class="evg">'+L.map(ppCardHtml).join('')+'</div>';
  });
  return h;
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
  var st=ppStep(p),tw=ppTrainWhy(p),vw=ppCareWhy(p,'visit'),gw=ppCareWhy(p,'gift'),ready=p.tr&&p.tr.ready,train=p.tr&&!p.tr.ready;
  var eff={2:OFFICE.deacon.desc,3:p.g==='m'?OFFICE.elder.desc:OFFICE.kwonsa.desc,1:'목양 수용력 +'+PP_CAP_RANK[1],4:'목양 수용력 +'+PP_CAP_RANK[4]}[p.rank];
  var rows=[['매주 헌금','약 '+fmt(ppGiveOf(p))+(PP_GIVE_RANK[p.rank]?' <small>(직분 +'+PP_GIVE_RANK[p.rank]+')</small>':'')],['은사',FIELDS[p.gift].name],['등록',dateText(p.jw,true)]];
  if(eff)rows.splice(1,0,[ppRankName(p)+'의 섬김',eff]);
  var h='<div class="sdlg" role="dialog" aria-label="'+p.n+' 성도"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big" data-pp="'+p.id+'">'+ringSvg(ppProg(p))+'<span class="ppi">'+portraitSvg(p)+'</span></span>'+
    '<div class="sdt"><h3>'+p.n+' <span class="rchip r'+p.rank+'">'+ppRankName(p)+'</span></h3>'+lvBar(p.lv,p.xp,ppNeed(p.lv),PP_LV_MAX)+'<p class="say">“'+ppThought(p)+'”</p></div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    '<div class="sdb two">'+careBtn('ppvisit',p.id,'심방',PP_VISIT.cost,vw)+careBtn('ppgift',p.id,'선물',PP_GIFT.cost,gw)+'</div>'+
    ((vw&&vw!=='자금이 부족해요')||(gw&&gw!=='자금이 부족해요')?'<p class="snote">'+(vw===gw?vw:[vw?'심방: '+vw:'',gw?'선물: '+gw:''].filter(Boolean).join(' · '))+'</p>':'<p class="snote">심방 호감 +'+PP_VISIT.xp+' · 선물 호감 +'+PP_GIFT.xp+'</p>');
  if(st){
    h+='<div class="snext"><div class="snt"><b>다음 단계 · '+ppStepName(p)+'</b><span>호감 Lv '+st.lv+'부터 · '+ppTrainName(p)+' '+durText(st.dur)+'</span></div>';
    if(p.rank===4)h+='<p class="snote left">평신도로 남으면 매주 헌금 +'+PP_GIVE_RANK[4]+'을 계속 드려요. 부교역자가 되면 그 헌금은 사라지지만 별 5개('+FIELDS[p.gift].name+', 효과 × '+ASSOC_HOME_K+') 사역자를 얻어요.</p>';
    h+=ready?'<button class="btn pri big claim" data-act="ppappoint" data-v="'+p.id+'">'+ppDoneName(p)+'</button>':
      train?'<button class="btn big" disabled data-evleft>'+ppTrainName(p)+' 중 · '+ppLeftText(p)+' 남음</button>':
      '<button class="btn pri big" data-act="pptrain" data-v="'+p.id+'"'+(tw?' disabled':'')+'>'+ppTrainName(p)+' 시작 · '+fmt(st.cost)+'</button>'+(tw?'<p class="swhy">'+tw+'</p>':'');
    h+='</div>';
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
function scrPeopleClick(a,v){
  if(a==='ppopen'){UI.scrSel={t:'pp',id:+v};sfx('click',.4);renderScreen();return true;}
  if(a==='asopen'){UI.scrSel={t:'as',id:+v};sfx('click',.4);renderScreen();return true;}
  if(a==='ppmore'){UI.ppMore=(UI.ppMore||PP_PAGE)+PP_PAGE;renderScreen();return true;}
  if(a==='ppvisit'||a==='ppgift'){
    var p=ppById(+v),r=ppCare(+v,a==='ppgift'?'gift':'visit');
    if(r&&r.charAt(0)!=='+'){scrToast(r,2000);sfx('error',.4);}
    else{sfx('coins',.5,0);if(r){setTimeout(function(){sfx('join',.6,0);},160);scrToast(p.n+' 성도와 더 가까워졌어요 · 호감 Lv '+p.lv,2400);}else scrToast(a==='ppgift'?p.n+' 성도에게 선물을 전했어요':p.n+' 성도를 심방했어요',1800);}
    renderScreen();hud(true);return true;
  }
  if(a==='pptrain'){
    var q=ppById(+v),w=ppTrain(+v);
    if(w){scrToast(w,2000);sfx('error',.4);}else{sfx('coins',.55,0);scrToast(q.n+' 성도의 '+ppTrainName(q)+'을(를) 시작했어요',2200);}
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
