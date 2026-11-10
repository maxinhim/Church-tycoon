'use strict';
/* ---------- 첫 걸음: 처음 할 일 안내 ----------
   새 교회는 작은 예배실과 바닥 길을 갖고 문이 닫힌 채 시작한다. 위쪽 목표 줄에 할 일을 한 줄씩 보여 주고
   (새 창 없음), 하나 이룰 때마다 STEP_GIFT를 준다. 모두 이루면 목표 줄은 원래 목표로 돌아간다.
   on: 이 단계가 시작될 때 한 번 (기준값을 적어 둔다) */
function hasBuilt(ids){return S.buildings.some(function(b){return ids.indexOf(b.def)>=0;});}
function newDecor(){return S.buildings.filter(function(b){var d=defOf(b);return b.bw!=null&&d&&(d.cat==='garden'||d.cat==='deco');}).length;}
function ranEvent(){var w=S.evW||{};for(var k in w)if(w[k]>=0)return true;return false;}
var STEPS=[
  {t:'입구(파란 아치)를 눌러 교회 문 열기',ok:function(){return S.open;}},
  {t:'첫 주일 맞기 · 주일에 헌금이 들어와요',on:function(){S.stepW=S.week;},ok:function(){return S.week>S.stepW;}},
  {t:'건축 › 편의에서 화장실 짓기',ok:function(){return hasBuilt(GRIPES.wc.ids);}},
  {t:'다니는 길가에 벤치 놓기',ok:function(){return hasBuilt(['bench','picnic','gazebo','swing']);}},
  {t:'정원·장식으로 길가 꾸미기 (2개)',on:function(){S.stepW=newDecor();},ok:function(){return newDecor()>=S.stepW+2;}},
  {t:'행사 › 행사에서 첫 행사 열기',ok:ranEvent}
];
function stepActive(){return (S.step||0)<STEPS.length;}
// HUD 갱신마다: 지금 단계를 이뤘으면 보상하고 다음 단계로 (한 번에 하나씩만)
function stepTick(){
  if(!stepActive())return;
  var st=STEPS[S.step];
  if(!st.ok())return;
  S.money+=STEP_GIFT;S.step++;
  addLog('첫 걸음 · '+st.t);
  var nx=STEPS[S.step];if(nx&&nx.on)nx.on();
  toast(nx?'첫 걸음 '+S.step+'/'+STEPS.length+' 완료 · +'+fmt(STEP_GIFT):'첫 걸음을 모두 마쳤어요 · +'+fmt(STEP_GIFT)+' · 이제 목표를 향해 키워 가요',2400);
  sfx('coins',.5,0);save();
}
function stepLine(){return '첫 걸음 '+(S.step+1)+'/'+STEPS.length+' · '+STEPS[S.step].t;}
