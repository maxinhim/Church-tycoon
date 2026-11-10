'use strict';
/* ---------- 성도들의 바람과 매너리즘 ----------
   · 성도들의 바람: 2~3주마다 성도들이 한 가지를 바란다(지금 가장 모자란 것에서 고른다).
     기한 안에 들어주면 몇 주간 만족도가 오르고 평판도 오른다. 놓치면 몇 주간 만족도가 내려간다.
     화면에는 현황 › 챙길 일 맨 위 한 줄과, 새 바람이 생길 때 짧은 알림 한 번만.
   · 매너리즘: 새 건물(꾸미기 포함)이나 지난번과 다른 행사가 STALE_AFTER주 넘게 없으면 만족도가 조금씩 내려간다.
     무언가 새로 하면 바로 풀린다. (예전의 '행사를 오래 안 열면 침체'를 대신한다)
   값은 js/balance.js (WISH_*, STALE_*) */
function noteNew(){S.lastNew=S.week;}
function staleWeeks(){return Math.max(0,S.week-(S.lastNew||0)-STALE_AFTER);}
function stalePen(){return Math.min(STALE_MAX,staleWeeks()*STALE_STEP);}
function countDef(id){var n=0;S.buildings.forEach(function(b){if(b.def===id)n+=isRoom(b)?b.tiles.length:1;});return n;}
// 바랄 만한 건물: 잠기지 않았고, 값이 너무 비싸지 않고, 칸 건물·바닥이 아닌 것
function wishable(d){return !isLocked(d.id)&&d.cost>0&&d.cost<=Math.max(3000,S.money*1.5)&&!isRoomDef(d.id)&&d.kind!=='floor'&&d.kind!=='terrain'&&d.kind!=='path';}
var WISH_ITEM={fel:['fcap','함께 모일 곳'],care:['kcap','돌봄 공간'],comf:['ccap','편의 시설'],park:['park','주차 자리'],seat:['seats','예배 자리']};
// 받침이 있으면 '이', 없으면 '가'
function iga(w){var c=w.charCodeAt(w.length-1);return w+(c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28?'이':'가');}
var WISH_SP={w:'말씀을 배울 곳',p:'기도할 곳',r:'찬양할 곳'};
// 지금 바랄 수 있는 것들을 모은다 (모자란 정도가 클수록 앞에)
function wishCands(){
  var L=[],c=S.cov||{},sp=spiritParts();
  var pickB=function(val,filter){ // 아직 없는 건물을 먼저, 그중 값 대비 효과가 좋은 것
    var best=null,bs=-1;DEFS.forEach(function(d){if(!wishable(d)||(filter&&!filter(d)))return;var v=val(d);if(!(v>0))return;var sc=v/d.cost*(countDef(d.id)?0.4:1);if(sc>bs){bs=sc;best=d;}});return best;};
  ['w','p','r'].forEach(function(q){if(sp[q]>=0.85)return;var d=pickB(function(d){return (SPIRIT_B[d.id]||{})[q]||0;});
    if(d)L.push({t:'build',id:d.id,n:countDef(d.id),need:1-sp[q],label:WISH_SP[q]+'이 있으면 좋겠어요 ('+d.name+')'});});
  for(var k in WISH_ITEM){if(c[k]==null||c[k]>=0.85)continue;var key=WISH_ITEM[k][0];
    var d2=pickB(function(d){return d[key]||0;},k==='seat'?function(d){return HALLS.indexOf(d.id)>=0;}:null);
    if(d2)L.push({t:'build',id:d2.id,n:countDef(d2.id),need:1-c[k],label:iga(WISH_ITEM[k][1])+' 더 필요해요 ('+d2.name+')'});}
  var g=gripeList()[0];
  if(g&&GRIPES[g.k].ids){var G=GRIPES[g.k],d3=pickB(function(d){return gripeFits(G,d)?1:0;});
    if(d3)L.push({t:'build',id:d3.id,n:countDef(d3.id),need:0.6,label:GRIPES[g.k].s+' 때문에 힘들어요 ('+d3.name+')'});}
  [['communion','성찬식을 한 지 오래됐어요',8],['smallgroup','소그룹으로 모이고 싶어요',6],['retreat','수련회를 가고 싶어요',16],['service','이웃을 섬기는 날을 갖고 싶어요',10]].forEach(function(e){
    var ev=EVENTS[e[0]];if(!ev||(ev.goal||0)>S.goal)return;var st=S.ev[e[0]]||{cd:0};
    if(st.cd>WISH_DUE-1||recent(e[0],e[2])>0.3)return;
    if(evCost(ev)>Math.max(2000,S.money*1.2))return;
    L.push({t:'event',id:e[0],need:0.45+0.4*(1-recent(e[0],e[2])),label:e[1]+' ('+ev.name+')'});});
  return L.sort(function(a,b){return b.need-a.need;});
}
function newWish(){
  var L=wishCands();if(!L.length){S.wishNext=S.week+1;return;}
  // 가장 모자란 셋 가운데 하나 (매번 같은 것만 바라지 않게)
  var w=L[(Math.random()*Math.min(3,L.length))|0];
  S.wish={t:w.t,id:w.id,n:w.n||0,label:w.label,w0:S.week,due:S.week+WISH_DUE};
  toast('성도들의 바람 · '+w.label,3600);addLog('성도들의 바람: '+w.label);
}
function wishDone(w){
  if(w.t==='build')return countDef(w.id)>w.n;
  return S.wishRan===w.id;   // 바람이 생긴 뒤에 그 행사를 열었다 (runEvent가 적어 둔다)
}
function wishEnd(ok){
  var w=S.wish;S.wish=null;S.wishRan=null;S.wishNext=S.week+WISH_GAP[0]+((Math.random()*(WISH_GAP[1]-WISH_GAP[0]+1))|0);
  S.wishMood=ok?WISH_GOOD:WISH_BAD;S.wishLeft=WISH_FX_WEEKS;
  if(ok){S.wishOk=(S.wishOk||0)+1;gainRep(WISH_REP);toast('성도들의 바람을 들어줬어요 · 만족 +'+WISH_GOOD,2600);addLog('바람을 들어줬어요: '+w.label);sfx('join',.5,0);}
  else{S.wishFail=(S.wishFail||0)+1;toast('성도들의 바람을 놓쳤어요 · 만족 '+WISH_BAD,2600);addLog('바람을 놓쳤어요: '+w.label);}
  recalc();
}
// 0.5초마다(목표 확인과 함께): 들어줬는지 본다
function wishTick(){if(S.wish&&wishDone(S.wish))wishEnd(true);}
// 주일 정산 뒤: 효과가 한 주 줄고, 기한이 지났으면 놓친 것으로, 때가 됐으면 새 바람
function wishWeek(){
  if(S.wishLeft>0){S.wishLeft--;if(S.wishLeft<=0)S.wishMood=0;}
  if(S.wish&&S.week>S.wish.due)wishEnd(false);
  if(!S.wish&&S.open&&S.week>=(S.wishNext==null?WISH_FIRST:S.wishNext))newWish();
}
// 챙길 일 맨 위 한 줄
function wishLine(){var w=S.wish;if(!w)return '';var left=w.due-S.week;return '성도들의 바람: '+w.label+' · '+(left>0?left+'주 남음':'이번 주까지');}
