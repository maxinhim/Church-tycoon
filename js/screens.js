'use strict';
/* ---------- 전체 화면 (행사 …) ----------
   아래 기능 버튼 가운데 '행사'처럼 고를 것이 많은 기능은 지도 위 작은 창 대신 화면 전체를 쓴다.
   · 게임은 멈추지 않는다 (게이지가 눈앞에서 차오른다). ✕·Esc로 닫는다
   · 위: 제목·탭·자금·✕ / 가운데: 카드 격자 / 카드를 누르면 가운데 정보 창
   · 행사 카드: 동그란 그림 둘레에 초록 원형 게이지. 진행 중이면 차오르고(진행 효과가 있으면 둘레에 불꽃 빛),
     다 차면 '보상 수령'이 뜬다. 눌러야 보상을 받는다
   UI.scr = 열린 화면('events'), UI.scrTab = 탭, UI.scrSel = 정보 창에 띄운 것 */
var SCREENS={events:{title:'행사',tabs:[['events','행사'],['staff','사역자']]}};
var RING_C=2*Math.PI*46;
function openScreen(k,tab){
  // 지도에서 하던 일(짓기·고르기·작은 창)은 정리한다
  UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.choose=null;UI.sel=null;UI.selPiece=null;UI.selFloor=null;UI.fold=true;UI.lastBuilt=null;
  UI.scr=k;UI.scrTab=tab||SCREENS[k].tabs[0][0];UI.scrSel=null;
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
    // 사역자(사역팀·부교역자·직분자)는 예전 목록을 그대로 쓴다
    body.className='sbody list';var keep=panel;panel=body;renderStaff();panel=keep;
  }else if(UI.scr==='events'){
    body.className='sbody';
    var ids=Object.keys(EVENTS).filter(function(id){return !EVENTS[id].hidden;});
    body.innerHTML='<p class="shint">행사를 시작하면 둘레의 초록 게이지가 차올라요. 다 차면 <b>보상 수령</b>을 눌러 마무리하세요. 오래 열지 않으면 공동체가 침체돼요.</p><div class="evg">'+ids.map(evCardHtml).join('')+'</div>';
  }
  body.scrollTop=top;
  var dl=$('#scrDlg');
  if(UI.scrSel&&EVENTS[UI.scrSel]){dl.hidden=false;dl.innerHTML=evDlgHtml(UI.scrSel);}else{dl.hidden=true;dl.innerHTML='';}
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
  var lb=document.querySelector('#scrDlg [data-evleft]');if(lb&&UI.scrSel&&evRunning(UI.scrSel))lb.textContent='진행 중 · '+evLeftText(UI.scrSel)+' 남음';
}
// 행사 버튼 위 빨간 숫자: 보상을 기다리는 행사 수
function syncEvBadge(){
  var b=$('#evBadge');if(!b)return;var n=evReadyCount();
  b.hidden=!n;if(n)b.textContent=n;
}
function scrToast(msg,ms){
  var t=$('#scrToast');if(!t)return;t.textContent=msg;t.hidden=false;
  clearTimeout(scrToast.tm);scrToast.tm=setTimeout(function(){t.hidden=true;},ms||2400);
}
function scrClick(e){
  var el=e.target.closest('[data-act]');
  // 정보 창 바깥(어두운 곳)을 누르면 닫는다
  if(!el){if(e.target.id==='scrDlg'){UI.scrSel=null;renderScreen();}return;}
  var a=el.dataset.act,v=el.dataset.v;
  if(a==='scrclose'){closeScreen();return;}
  if(a==='scrtab'){UI.scrTab=v;UI.scrSel=null;$('#scrBody').scrollTop=0;renderScreen();return;}
  if(a==='evopen'){UI.scrSel=v;sfx('click',.4);renderScreen();return;}
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
  // 그 밖(사역자 탭의 버튼들)은 패널과 같은 처리기로
  onPanel(e);renderScreen();
}
function setupScreens(){
  $('#scr').addEventListener('click',scrClick);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&UI.scr){if(UI.scrSel){UI.scrSel=null;renderScreen();}else closeScreen();}});
}
