'use strict';
/* ---------- HUD / 토스트 ---------- */
var toastTimer=0;
function toast(msg,ms){
  var el=$('#toast');el.textContent=msg;el.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true;},ms||2400);
}
function showOver(){
  var o=$('#over');o.hidden=false;
  o.innerHTML='<div class="box"><h2>개척을 멈춥니다</h2><p>재정이 바닥나 더는 문을 열 수 없게 됐어요. 성도 '+S.members+'명, '+(Math.floor(S.week/52)+1)+'년차 '+(S.week%52+1)+'주까지 함께했습니다.</p><button class="btn pri" data-act="restart">다시 시작</button></div>';
}
var lastHud=0;
function hud(force){
  var now=performance.now();
  if(!force&&now-lastHud<250)return;lastHud=now;
  var vm=$('#vMoney');vm.textContent=fmt(S.money);vm.className=S.money<0?'neg':'';
  $('#vMem').innerHTML=S.members+' <small>명</small>';
  $('#vRep').innerHTML=Math.round(S.rep)+' <small>/100</small>';
  var dt=debt();$('#sDebt').hidden=dt<1;if(dt>=1)$('#vDebt').textContent=fmt(dt);
  syncClock();
  $('#cname').textContent=S.name;
  var g=GOALS[S.goal];
  if(g){$('#goalTxt').textContent='목표 · '+g.n+' ('+g.d+')';$('#goalBar').style.width=clamp(g.p(S)*100,0,100)+'%';}
  else{$('#goalTxt').textContent='모든 목표를 이뤘어요. 자유롭게 키워보세요';$('#goalBar').style.width='100%';}
  if(UI.tab==='build'&&!UI.fold){refreshCards();if(isPlacing())renderPbar();}
}
// 오른쪽 위 시계: 연·주, 요일 칸(지난 날은 흐리게, 오늘은 강조), 주일 정산까지 남은 날
function syncClock(){
  var yr=Math.floor(S.week/52)+1,wn=S.week%52+1,di=dayIdx(),left=6-di;
  $('#ckWeek').textContent=yr+'년 '+wn+'주';
  $('#ckLeft').textContent=(left?'주일 정산까지 '+left+'일':'오늘은 주일')+(S.evt==='festival'?' · 축제':'');
  var w=ensureWx(),nd=wxWhen(),wk=w.cur+'|'+w.next+'|'+nd;
  if(syncClock.k!==wk){syncClock.k=wk;
    $('#wxNow').innerHTML=wxIcon(w.cur)+WEATHER[w.cur].n;
    $('#wxNext').innerHTML=nd+' '+wxIcon(w.next)+WEATHER[w.next].n;}
  var ds=$('#ckDays').children;for(var i=0;i<7;i++){ds[i].classList.toggle('now',i===di);ds[i].classList.toggle('past',i<di);}
  $('#ckBar').style.width=clamp(S.t/WEEK*100,0,100)+'%';
  $('#clock').setAttribute('aria-label',yr+'년 '+wn+'주 '+DAYS[di]+', '+(left?'주일 정산까지 '+left+'일':'오늘 주일 정산')+', 날씨 '+WEATHER[w.cur].n+', '+nd+' '+WEATHER[w.next].n+'. 누르면 날씨 설명');
}
// 다음 날씨가 오는 때: '내일' 또는 'n일 뒤'
function wxWhen(){var l=ensureWx().left;return !l||l<=1?'내일':l+'일 뒤';}
// 시계를 누르면 오늘·내일 날씨가 무슨 뜻인지 알려 준다
function wxExplain(){
  var w=ensureWx(),se=WX_SEASON[seasonKey()].n;
  toast(se+' · 오늘 '+WEATHER[w.cur].n+': '+WEATHER[w.cur].tip+' / '+wxWhen()+' '+WEATHER[w.next].n,4200);
}
