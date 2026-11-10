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
// 기대치: 성도 300명이면 +0.6, 교회 Level 30이면 +0.435 (Level 하나에 +0.015)
function expectK(m){return 1+m/500+Math.max(0,(S.lvl||1)-1)*EXP_LV;}
// 그 행사를 연 지 몇 주 지났는지에 따라 1 → 0
function recent(id,span){var w=(S.evW||{})[id];if(w==null)return 0;return Math.max(0,1-(S.week-w)/span);}
function spiritParts(){
  // 기본은 바닥의 절반(처음엔 50% 안팎), 건물 자리는 × 0.6, 사역팀·부교역자·권사는 그대로
  var m=Math.max(1,S.members),E=expectK(m),st=S.staff,N=SPIRIT_NEED,cap={w:N.w.b,p:N.p.b,r:N.r.b};
  S.buildings.forEach(function(b){var s=SPIRIT_B[b.def];if(!s)return;var k=condFactor(b)*(b.floors||1)*BLD_SAT;for(var q in s)cap[q]+=s[q]*k;});
  cap.w+=8*st.edu;cap.p+=8*st.prayer+Math.min(6,S.off.kwonsa);cap.r+=10*st.praise;
  S.assoc.forEach(function(a){if(a.field==='edu')cap.w+=6*a.skill;else if(a.field==='praise')cap.r+=6*a.skill;else if(a.field==='visit')cap.p+=4*a.skill;});
  var need={w:Math.max(N.w.f,m*N.w.r*E),p:Math.max(N.p.f,m*N.p.r*E),r:Math.max(N.r.f,m*N.r.r*E)},o={cap:cap,need:need,E:E};
  ['w','p','r'].forEach(function(q){o[q]=Math.min(1,cap[q]/Math.max(1,need[q]));});
  var SC=SACRAMENT,fs=SC.fest.span,fest=Math.max(recent('easter',fs),recent('thanks',fs),recent('christmas',fs),recent('revival',fs));
  o.sac={communion:recent('communion',SC.communion.span),baptism:recent('baptism',SC.baptism.span),retreat:recent('retreat',SC.retreat.span),fest:fest};
  o.s=Math.min(1,SC.communion.w*o.sac.communion+SC.baptism.w*o.sac.baptism+SC.retreat.w*o.sac.retreat+SC.fest.w*fest);
  o.v=SPIRIT_W.w*o.w+SPIRIT_W.p*o.p+SPIRIT_W.r*o.r+SPIRIT_W.s*o.s;
  return o;
}
/* 익숙해짐: 꾸밈 보너스 = 아름다움 합 × 0.15 + 새로 꾸민 것 × 1.0 (최대 +8).
   새로 지은 정원·장식·바닥의 아름다움은 S.fresh에 쌓였다가 한 주에 15%씩 줄어든다 → 계속 새로 꾸미거나 바꿔야 유지된다 */
function addFresh(v){if(v>0)S.fresh=(S.fresh||0)+v;}
function beautyBonus(){return Math.min(8,A.beauty*BEAUTY_K+(S.fresh||0)*FRESH_K);}
