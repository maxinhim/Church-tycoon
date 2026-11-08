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
  var yr=Math.floor(S.week/52)+1,w=S.week%52+1,day=DAYS[Math.min(6,Math.floor(S.t/WEEK*7))];
  $('#vDate').textContent=yr+'년 '+w+'주';
  $('#kDate').textContent=day+(S.evt==='rain'?' · 장마':S.evt==='festival'?' · 축제':'');
  $('#cname').textContent=S.name;
  var g=GOALS[S.goal];
  if(g){$('#goalTxt').textContent='목표 · '+g.n+' ('+g.d+')';$('#goalBar').style.width=clamp(g.p(S)*100,0,100)+'%';}
  else{$('#goalTxt').textContent='모든 목표를 이뤘어요. 자유롭게 키워보세요';$('#goalBar').style.width='100%';}
  if(UI.tab==='build'&&!UI.fold)refreshCards();
}
