'use strict';
/* ---------- 예배 공간과 영성 ----------
   · 예배 공간(HALLS): 교회의 중심. 문을 열려면 닿을 수 있는 예배 공간이 하나는 있어야 하고,
     문이 열려 있는 동안 마지막 예배 공간은 철거할 수 없다
   · 영성(성도 만족도의 한 항목, 비중 25%) = 말씀 30% + 기도 20% + 찬양 20% + 성례 30%
     - 말씀·기도·찬양: 그 일을 하는 건물 자리 + 사역팀·부교역자 ÷ 성도 수에 맞는 필요 (성도가 늘수록 기대치도 오른다)
     - 성례: 최근에 연 성찬식·세례식·수련회·절기 예배. 시간이 지나면 줄어들어 꾸준히 열어야 한다 */
var HALLS=['room','chapel','grand','mroom','outdoor'];
function isHall(b){return !!b&&HALLS.indexOf(b.def)>=0;}
function hallsReach(){return S.buildings.some(function(b){return isHall(b)&&usable(b);});}
// 문을 열 수 없으면 이유
function gateWhy(){
  if(S.open)return '';
  var hs=S.buildings.filter(isHall);
  if(!hs.length)return '예배 공간(작은 예배실·예배당·예배실 칸 등)을 먼저 지어야 문을 열 수 있어요';
  if(!hs.some(usable))return '예배 공간까지 길이 이어져야 문을 열 수 있어요';
  return '';
}
// 문이 열려 있는 동안 마지막 예배 공간은 철거하지 못한다
function lastHallWhy(b){
  if(!S.open||!isHall(b))return '';
  return S.buildings.some(function(o){return o!==b&&isHall(o);})?'':'교회 문이 열려 있는 동안 마지막 예배 공간은 철거할 수 없어요. 다른 예배 공간을 먼저 지어 주세요';
}
// 건물마다 말씀(w)·기도(p)·찬양(r) 자리
var SPIRIT_B={
  bible:{w:12},mission:{w:14,p:4},books:{w:6},cell:{w:8},youth:{w:6},study:{w:4},calli:{w:4},library:{w:2},
  pray:{p:8},dawn:{p:16},
  praise:{r:20},outdoor:{r:16},choir:{r:12},band:{r:8},guitar:{r:5},bell:{r:3}
};
var SPIRIT_W={w:.3,p:.2,r:.2,s:.3};
// 기대치: 성도 300명이면 +0.6, 교회 Level 30이면 +0.435 (Level 하나에 +0.015)
var EXP_LV=0.015;
function expectK(m){return 1+m/500+Math.max(0,(S.lvl||1)-1)*EXP_LV;}
// 그 행사를 연 지 몇 주 지났는지에 따라 1 → 0
function recent(id,span){var w=(S.evW||{})[id];if(w==null)return 0;return Math.max(0,1-(S.week-w)/span);}
function spiritParts(){
  var m=Math.max(1,S.members),E=expectK(m),st=S.staff,cap={w:3,p:3,r:3};
  S.buildings.forEach(function(b){var s=SPIRIT_B[b.def];if(!s)return;var k=condFactor(b)*(b.floors||1);for(var q in s)cap[q]+=s[q]*k;});
  cap.w+=8*st.edu;cap.p+=8*st.prayer+Math.min(6,S.off.kwonsa);cap.r+=10*st.praise;
  S.assoc.forEach(function(a){if(a.field==='edu')cap.w+=6*a.skill;else if(a.field==='praise')cap.r+=6*a.skill;else if(a.field==='visit')cap.p+=4*a.skill;});
  var need={w:m*0.25*E,p:m*0.15*E,r:m*0.2*E},o={cap:cap,need:need,E:E};
  ['w','p','r'].forEach(function(q){o[q]=Math.min(1,cap[q]/Math.max(1,need[q]));});
  var fest=Math.max(recent('easter',8),recent('thanks',8),recent('christmas',8),recent('revival',8));
  o.sac={communion:recent('communion',8),baptism:recent('baptism',12),retreat:recent('retreat',16),fest:fest};
  o.s=Math.min(1,.6*o.sac.communion+.35*o.sac.baptism+.3*o.sac.retreat+.2*fest);
  o.v=SPIRIT_W.w*o.w+SPIRIT_W.p*o.p+SPIRIT_W.r*o.r+SPIRIT_W.s*o.s;
  return o;
}
/* 익숙해짐: 꾸밈 보너스 = 아름다움 합 × 0.15 + 새로 꾸민 것 × 1.0 (최대 +8).
   새로 지은 정원·장식·바닥의 아름다움은 S.fresh에 쌓였다가 한 주에 15%씩 줄어든다 → 계속 새로 꾸미거나 바꿔야 유지된다 */
var FRESH_DECAY=0.85;
function addFresh(v){if(v>0)S.fresh=(S.fresh||0)+v;}
var BEAUTY_K=0.15,FRESH_K=1;
function beautyBonus(){return Math.min(8,A.beauty*BEAUTY_K+(S.fresh||0)*FRESH_K);}
