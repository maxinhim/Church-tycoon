'use strict';
/* ---------- 현황 화면 (전체 화면) ----------
   탭: 지표(다섯 칸 + 교회 Level) · 퀘스트 · 이번 주(챙길 일·수입 그래프·소식) · 재정
   지표 카드를 누르면 정보 창: 점수·다음 레벨·계산 방식, 레벨이 올랐으면 '보상 받기' */
var IND_ITEMS={sp:[['spirit','영성']],mood:[['fel','교제 공간'],['care','돌봄'],['past','목양']],conv:[['comf','편의 시설'],['park','주차'],['seat','좌석']],trust:[],xp:[]};
function covPct(k){var c=S.cov||{};return Math.round((c[k]==null?1:c[k])*100);}
function indCardHtml(k){
  var d=INDK[k],g=indProg(k),rdy=indReady(k);
  return '<button class="evc indc'+(rdy?' ready':'')+'" data-act="inopen" data-v="'+k+'" data-ind="'+k+'" aria-label="'+d.n+' 레벨 '+g.lv+(rdy?', 보상 받기 가능':'')+'">'+
    '<span class="evr">'+ringSvg(g.p)+'<span class="evi" style="--c:'+d.col+'">'+indIcon(k,'indbig')+'</span></span>'+
    '<span class="evn">'+d.n+' <b class="inlv">Lv '+g.lv+'</b></span><span class="evp" data-evp>'+(rdy?'보상 받기':'점수 '+fmt(g.sc))+'</span></button>';
}
// 위쪽 한 줄: 교회 Level과 합계 점수, 다음 Level까지
function churchSumHtml(){
  var L=S.lvl||1,p=scoreParts(),lo=lvNeed(L),hi=lvNeed(L+1),pr=L>=LV_MAX?1:clamp((p.total-lo)/Math.max(1,hi-lo),0,1);
  var nu='';for(var k=L+1;k<=LV_MAX&&!nu;k++){var n=lvUnlockNames(k).concat(tierNames(k));if(n.length)nu='Lv '+k+'에 '+n.slice(0,3).join(', ')+(n.length>3?' 외 '+(n.length-3):'')+' 열려요';}
  return '<div class="stsum"><b class="stlv">교회 Lv '+L+'</b><div class="bar"><i style="width:'+Math.round(pr*100)+'%"></i></div>'+
    '<span>지표 점수 합 '+fmt(p.total)+(L<LV_MAX?' · 다음 Lv까지 '+fmt(Math.max(0,Math.ceil(hi-p.total))):'')+'</span>'+(nu?'<span class="stnu">'+nu+'</span>':'')+'</div>';
}
function indDlgHtml(k){
  var d=INDK[k],g=indProg(k),rdy=indReady(k),open=UI.mexp;
  var rows=[['점수',fmt(g.sc)],['다음 레벨',g.lv>=IND_MAX?'최고 레벨':'Lv '+(g.lv+1)+' · 점수 '+fmt(Math.ceil(g.hi))+' (남은 '+fmt(Math.max(0,Math.ceil(g.hi-g.sc)))+')'],
    ['레벨 보상',rdy?'자금 +'+fmt(indReward(k)):(g.lv<IND_MAX?'Lv '+(g.lv+1)+'이 되면 자금 +'+fmt(indGift(g.lv+1)):'—')]];
  var items=IND_ITEMS[k].map(function(r){
    var v=covPct(r[0]),on=open===r[0],col=v<50?'var(--bad)':v<80?'var(--gold)':'var(--good)';
    return '<button class="covb'+(on?' open':'')+'" data-act="mexp" data-v="'+r[0]+'" aria-expanded="'+on+'"><span>'+r[1]+'</span><div class="bar"><i style="width:'+v+'%;background:'+col+'"></i></div><span class="v">'+v+'%</span></button>'+(on?'<ul class="rwhy">'+moodWhy(r[0])+'</ul>':'');
  }).join('');
  var why=indWhy(k).map(function(t){return '<li>'+t+'</li>';}).join('');
  var btn=rdy?'<button class="btn pri big claim" data-act="inclaim" data-v="'+k+'">보상 받기 · +'+fmt(indReward(k))+'</button>':'';
  return '<div class="sdlg" role="dialog" aria-label="'+d.n+'"><button class="sx" data-act="inclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big" data-ind="'+k+'">'+ringSvg(g.p)+'<span class="evi" style="--c:'+d.col+'">'+indIcon(k,'indbig')+'</span></span>'+
    '<div class="sdt"><h3>'+d.n+' <span class="rchip t0">Lv '+g.lv+'</span></h3><p>'+d.d+'</p></div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    (items?'<div class="cov sdcov">'+items+'</div>':'')+
    '<ul class="swhyl">'+why+'</ul>'+(btn?'<div class="sdb">'+btn+'</div>':'')+'</div>';
}
function qRowHtml(q){
  var pr=q.p?Math.round(qProg(q)*100):-1;
  return '<div class="qrow"><div class="qt"><b>'+q.n+'</b><span>'+q.d+'</span>'+(pr>=0?'<div class="bar"><i style="width:'+pr+'%"></i></div>':'')+'</div>'+
    '<div class="qr"><span class="qm"><i class="coin" aria-hidden="true"></i>'+fmt(q.m)+'</span><span class="qx">사역 경험 +'+q.xp+'</span></div></div>';
}
function questHtml(){
  var act=qActive(),h='<p class="shint">퀘스트를 이루면 자금과 사역 경험을 바로 받아요. 사역 경험은 현황의 한 지표가 되어 교회 Level을 올려요.</p>';
  ['first','goal','guide'].forEach(function(g){
    var L=act.filter(function(q){return q.g===g;});if(!L.length)return;
    h+='<div class="sec">'+QG[g]+'</div>'+L.map(qRowHtml).join('');
  });
  var dn=QUESTS.filter(function(q){return qDone(q.id);});
  if(!act.length)h+='<p class="qok">지금 할 수 있는 퀘스트를 모두 마쳤어요. 교회가 자라면 새 퀘스트가 열려요.</p>';
  h+='<div class="sec">마친 퀘스트 '+dn.length+' / '+QUESTS.length+'</div>'+(dn.length?'<div class="qdone">'+dn.map(function(q){return '<span>'+q.n+'</span>';}).join('')+'</div>':'<p class="hint">아직 없어요.</p>');
  return h;
}
function weekHtml(){
  var h=statusSummary()+'<div class="sec">이번 주</div><div class="legend"><span>지금 교회 마당에 '+V.length+'명</span></div>';
  h+='<div class="legend" style="margin-top:6px">'+NEEDS.map(function(n){return '<span><i style="background:'+NC[n]+'"></i>'+NK[n]+'</span>';}).join('')+'<span>머리 위 점은 방문자가 찾는 것</span></div>';
  var rp=needRepair(),rc=rp.reduce(function(t,b){return t+repairCost(b);},0);
  if(rp.length)h+='<div class="btns"><button class="btn pri" data-act="repairAll"'+(S.money<rc?' disabled':'')+'>낡은 건물 '+rp.length+'곳 모두 수리 · '+fmt(rc)+'</button></div>';
  h+='<div class="sec">주간 수입과 지출</div>'+chart();
  h+='<div class="sec">소식</div><ul class="log">'+(S.log.length?S.log.map(function(l){return '<li>'+dateText(l.w,true)+' · '+l.msg+'</li>';}).join(''):'<li>아직 소식이 없어요. 한 주가 지나면 기록됩니다.</li>')+'</ul>';
  return '<div class="staff">'+h+'</div>';
}
// renderScreen에서 부른다: 현황 화면의 가운데
function renderStatusScreen(body){
  if(UI.scrTab==='fin'){body.className='sbody list';var keep=panel;panel=body;renderFinance();panel=keep;return;}
  if(UI.scrTab==='quest'){body.className='sbody list';body.innerHTML='<div class="staff">'+questHtml()+'</div>';return;}
  if(UI.scrTab==='week'){body.className='sbody list';body.innerHTML=weekHtml();return;}
  body.className='sbody';
  body.innerHTML=churchSumHtml()+'<div class="evg indg">'+IND.map(function(d){return indCardHtml(d.k);}).join('')+'</div>';
}
function scrStatusClick(a,v,el){
  if(a==='inopen'){UI.scrSel={t:'in',id:v};UI.mexp=null;sfx('click',.4);renderScreen();return true;}
  if(a==='inclose'){UI.scrSel=null;renderScreen();return true;}
  if(a==='mexp'){UI.mexp=UI.mexp===v?null:v;renderScreen();return true;}
  if(a==='inclaim'){
    var g=claimInd(v);
    if(g){scrToast(INDK[v].n+' 보상 +'+fmt(g),2400);setTimeout(function(){sfx('join',.6,0);},180);}
    else{scrToast('받을 보상이 없어요',1600);sfx('error',.4);}
    renderScreen();hud(true);return true;
  }
  return false;
}
// 0.25초마다: 지표 카드 게이지·점수만 고친다
function syncStatusScreen(){
  if(UI.scr!=='status')return;
  var els=document.querySelectorAll('#scr [data-ind]');
  for(var i=0;i<els.length;i++){
    var k=els[i].dataset.ind;if(!INDK[k])continue;
    var rp=els[i].querySelector('.rp');if(rp)rp.setAttribute('stroke-dashoffset',(RING_C*(1-indProg(k).p)).toFixed(1));
  }
}

// 맨 윗줄의 지표 칩·퀘스트 칸을 누르면 현황 화면으로
function setupStatusUI(){
  setupInds();
  $('#inds').addEventListener('click',function(e){var b=e.target.closest('[data-ind]');if(!b)return;openScreen('status','ind');UI.scrSel={t:'in',id:b.dataset.ind};renderScreen();});
  $('#qchip').addEventListener('click',function(){openScreen('status','quest');});
}
