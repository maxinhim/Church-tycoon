'use strict';
/* ---------- 건물 운영 방식·레벨·티어 ----------
   · 운영 방식(bMode): 'batch' 예배·교제 건물 — 정원이 차면 한꺼번에 가동하고 끝나면 모두 내보낸다. 주일이 되는 순간,
     같은 주 금·토요일에 가동한 적이 없으면 정원이 덜 차도 가동하고(batchSunday), 주일 동안은 모이는 대로 BATCH_SUN_WAIT초마다 가동한다.
     'single' 매장·편의 시설 — 수용 1명, 레벨이 오를수록 회전 시간이 짧아진다. 'multi' 그 밖 — 정원만큼 각자 머문다
   · 레벨 1~BLV_MAX (b.lv, b.bx = 이번 레벨 투자 횟수). 선택 카드에서 자금을 내고 투자한다(investBld)
   · 외형은 3단계(bStage): Lv 1~3 천막·가건물 → 4~6 보통 건물 → 7~10 큰 시설
   · 티어: 같은 기능의 기본(1)·상위(2). 티어 2는 티어 1의 효과·정원·회전을 이어받고 × TIER2_K. 값은 티어 1 Lv 10까지의 투자만큼 더
   수치는 balance.js */
function retired(id){return RETIRED.indexOf(id)>=0;}
(function(){
  RETIRED.forEach(function(id){if(D[id])D[id].retired=true;});
  var inv=0;for(var L=1;L<BLV_MAX;L++)inv+=BLV_XP*BLV_INVEST*(1+BLV_INVEST_UP*(L-1));
  TIER_PAIRS.forEach(function(p){
    var a=D[p[0]],b=D[p[1]];if(!a||!b)return;
    a.tier=1;a.t2=b.id;b.tier=2;b.t1=a.id;
    ['fill','cap','dur','income','seats','fcap','ccap','kcap'].forEach(function(k){b[k]=a[k];});
    b.cost=Math.round(a.cost*(1+inv)/10)*10;b.up=Math.max(b.up,a.up);
    if(typeof UNLOCK!=='undefined'&&!UNLOCK[b.id])UNLOCK[b.id]=1;
  });
})();
function bMode(d){
  if(!d||!d.fill)return '';
  if(d.cat==='worship'||d.cat==='fellow')return 'batch';
  if(d.cat==='shop'||d.cat==='comfort')return 'single';
  return 'multi';
}
// 레벨이 있는 건물: 이용 효과가 있는 건물
function hasLv(b){var d=defOf(b);return !!(d&&d.fill);}
function bLv(b){return hasLv(b)?Math.max(1,Math.min(BLV_MAX,b.lv||1)):1;}
function tierK(b){var d=defOf(b);return d&&d.tier===2?TIER2_K:1;}
function bStage(b){var l=bLv(b);return l<=3?1:l<=6?2:3;}
// 한 번 이용할 때 효과 배율
function bPerf(b){return hasLv(b)?tierK(b)*(1+BLV_FX*(bLv(b)-1)):1;}
// 정원·좌석·수용 배율
function bCapK(b){return hasLv(b)?tierK(b)*(1+BLV_CAP*(bLv(b)-1)):1;}
function bCap(b){
  var d=defOf(b),m=bMode(d);if(!d.cap)return 0;
  if(m==='single')return 1;
  return Math.max(2,Math.round(d.cap*(m==='batch'?BATCH_CAP0:1)*bCapK(b)));
}
// 한 사람(또는 한 번 가동)이 머무는 시간
function rotTime(b){
  var d=defOf(b),m=bMode(d),t=d.dur*STAY*TEMPO_ROT;
  if(m==='batch')return t*BATCH_ROT;
  if(m==='single')return t*SINGLE_ROT/(tierK(b)*(1+BLV_ROT*(bLv(b)-1)));
  return t;
}
/* 레벨 올리기: 한 번 투자 값, 투자 */
function investCost(b){var d=defOf(b);return Math.max(10,Math.round(d.cost*BLV_INVEST*(1+BLV_INVEST_UP*(bLv(b)-1))/10)*10);}
function investWhy(b){
  if(!hasLv(b))return '레벨이 없는 시설이에요';
  if(bLv(b)>=BLV_MAX)return '최고 레벨이에요';
  if(S.money<investCost(b))return '자금이 부족해요';
  return '';
}
// 투자 한 번: 레벨이 오르면 새 레벨을 돌려준다 (못 하면 0)
function investBld(b){
  if(investWhy(b))return 0;
  S.money-=investCost(b);b.lv=bLv(b);b.bx=(b.bx||0)+1;
  if(b.bx>=BLV_XP){b.bx=0;b.lv++;}
  recalc();save();return b.lv;
}
/* 티어 1 개수 제한 */
function tierWhy(id){
  var d=D[id];if(!d||d.tier!==1)return '';
  var n=S.buildings.filter(function(b){return b.def===id;}).length,mx=isLocked(d.t2)?TIER1_MAX:TIER1_MAX_OPEN;
  return n>=mx?d.name+'은(는) '+mx+'개까지 지을 수 있어요'+(mx===TIER1_MAX?' · '+D[d.t2].name+'이(가) 열리면 더 지을 수 있어요':''):'';
}
/* 일괄 가동 */
function batchStart(b){
  b.run=rotTime(b);b.runW=S.week;
  var di=dayIdx();if(di===4||di===5)b.fsW=S.week;   // 금·토요일에 가동함
}
// 매 프레임: 가동이 끝나면 안에 있던 사람을 모두 내보낸다
function batchTick(dt){
  var sun=isSunday()&&S.sunW===S.week;
  S.buildings.forEach(function(b){
    // 주일 예배: 주일이 된 뒤 모여드는 사람도 BATCH_SUN_WAIT초마다 함께 드린다 (금·토에 가동한 건물은 빼고)
    if(sun&&!(b.run>0)&&b.inUse>0&&b.fsW!==S.week&&bMode(defOf(b))==='batch'){b.sw=(b.sw||0)+dt;if(b.sw>=BATCH_SUN_WAIT){b.sw=0;batchStart(b);}}
    if(!(b.run>0))return;
    b.run-=dt;
    if(b.run<=0){b.run=0;V.forEach(function(v){if(v.inside===b.id&&v.state==='inside')finishVisit(v);});}
  });
}
// 주일이 되는 순간: 금·토에 가동하지 않은 일괄 건물은 사람이 있으면 가동한다 (한 주에 한 번)
function batchSunday(){
  if(!isSunday()||S.sunW===S.week)return;
  S.sunW=S.week;
  S.buildings.forEach(function(b){if(bMode(defOf(b))==='batch'&&b.inUse>0&&!(b.run>0)&&b.fsW!==S.week)batchStart(b);});
}
