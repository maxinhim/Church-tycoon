'use strict';
/* ---------- 현황 지표 ----------
   영성·만족도·편의·신뢰도·사역 경험 다섯 가지를 점수로 매기고, 지표마다 레벨을 준다 (식과 값은 balance.js).
   · 점수는 실제로 채운 만큼이다 (항목마다 min(기본 + 건물 자리, SERVE_CAP × 필요))
   · 지표 레벨이 오르면 '보상 받기'를 눌러 자금을 받는다 (S.il[k] = {lv: 가장 높았던 레벨, cl: 보상 받은 레벨})
   · 신뢰도에는 평판(S.rep)이 한 재료로 들어간다. 평판은 더 이상 화면에 따로 나오지 않는다
   · 다섯 점수의 합이 교회 Level을 정한다 (level.js) */
var IND=[
  {k:'sp',n:'영성',col:'#8b6fd6',d:'말씀·기도·찬양 자리를 얼마나 채웠는지, 성례를 얼마나 최근에 열었는지',
   ic:'<path d="M12 3v18M6 9h12"/>'},
  {k:'mood',n:'만족도',col:'#e58a3a',d:'교제·돌봄·목양을 채우고 꾸밈은 더하고, 침체·낡음·불편은 빼요',
   ic:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.4 2 2 3.5 2s2.6-.6 3.5-2M9 9.8h.01M15 9.8h.01"/>'},
  {k:'conv',n:'편의',col:'#3d9b7a',d:'화장실·휴게실 같은 편의 시설, 주차 자리, 좌석',
   ic:'<path d="M5 12V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V12M3.5 12h17v4h-17zM6 16v3M18 16v3"/>'},
  {k:'trust',n:'신뢰도',col:'#d9577a',d:'성도·직분자와의 호감, 심방, 목양, 교회의 평판',
   ic:'<path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>'},
  {k:'xp',n:'사역 경험',col:'#d4a017',d:'퀘스트를 마치며 쌓은 사역 경험',
   ic:'<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.7l1.1-6L3.4 9.5l6-.8z"/>'}
];
var INDK={};IND.forEach(function(d){INDK[d.k]=d;});
function indIcon(k,cls){return '<svg class="'+(cls||'indi')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+INDK[k].ic+'</svg>';}
// 항목 하나를 채운 양 (기본 + 건물 자리, 필요의 SERVE_CAP배까지만)
function served(k){var i=satInfo(k);return Math.min(i.base+i.have,SERVE_CAP*i.need);}
function avgHeart(){var L=S.people||[];if(!L.length)return 1;var t=0;L.forEach(function(p){t+=p.lv;});return t/L.length;}
// 심방·선물·격려를 한 만큼 쌓였다가 매주 식는 '관심' (신뢰도 재료)
function trustAct(n){S.tv=Math.min(1e4,(S.tv||0)+n);}
function trustParts(c){
  var vis=Math.min(TRUST_VIS_MAX,(S.tv||0)*TRUST_VIS);
  return {rep:S.rep*TRUST_REP,lv:avgHeart()*TRUST_LV,off:offTotal(S)*TRUST_OFF,past:(c.past||0)*TRUST_PAST,vis:vis};
}
function calcInd(c){
  var sp=c.sp,sw=0,o={};
  ['w','p','r'].forEach(function(q){sw+=Math.min(sp.cap[q],SERVE_CAP*sp.need[q]);});
  o.sp=sw*(IND_SAC0+(1-IND_SAC0)*sp.s);
  o.mood=Math.max(0,served('fel')+served('care')+IND_PAST*served('past')+IND_BEAUTY*beautyBonus()+IND_NEG*(c.malus||0));
  o.conv=served('comf')+served('park')+IND_SEAT*served('seat');
  var t=trustParts(c);o.trust=t.rep+t.lv+t.off+t.past+t.vis;
  o.xp=S.qxp||0;
  var tot=0;IND.forEach(function(d){o[d.k]=Math.round(o[d.k]);tot+=o[d.k];});o.tot=tot;
  return o;
}
// 신뢰도 지수 0~100: 방문자가 오는 빠르기·방문자 헌금·신용 한도가 따른다
function trustIdx(){
  var x=Math.max(0,((S.ind&&S.ind.trust)||0)*TRUST_IDX);
  if(x>TRUST_SOFT)x=TRUST_SOFT+(100-TRUST_SOFT)*(1-Math.exp(-(x-TRUST_SOFT)/TRUST_SOFT_K));
  return clamp(x,0,100);
}
/* 지표 레벨 */
function indNeed(k,L){return L<=1?0:IND_B[k]+IND_U[k]*Math.pow(L-2,IND_P);}
function indLevelOf(k,sc){if(!(sc>=IND_B[k]))return 1;return Math.min(IND_MAX,2+Math.floor(Math.pow((sc-IND_B[k])/IND_U[k],1/IND_P)+1e-9));}
function indGift(L){return IND_GIFT0+IND_GIFT_K*L;}
function ilState(){
  if(!S.il)S.il={};
  IND.forEach(function(d){if(!S.il[d.k])S.il[d.k]={lv:1,cl:1,fresh:1};});
  return S.il;
}
// 지금 점수로 그 지표의 게이지: lv(가장 높았던 레벨), p(다음 레벨까지 0~1)
function indProg(k){
  var il=ilState()[k],sc=(S.ind&&S.ind[k])||0,L=il.lv,lo=indNeed(k,L),hi=indNeed(k,L+1);
  return {lv:L,sc:sc,lo:lo,hi:hi,p:L>=IND_MAX?1:clamp((sc-lo)/Math.max(1,hi-lo),0,1),cl:il.cl};
}
function indReady(k){var il=ilState()[k];return il.lv>il.cl;}
function indReward(k){var il=ilState()[k],t=0;for(var L=il.cl+1;L<=il.lv;L++)t+=indGift(L);return t;}
function indReadyCount(){var n=0;IND.forEach(function(d){if(indReady(d.k))n++;});return n;}
// 레벨이 오르면 알린다 (quiet: 불러오기·새로 시작할 때는 조용히 맞추고 보상은 없다)
function indTick(quiet){
  var il=ilState();if(!S.ind)return;
  IND.forEach(function(d){
    var s=il[d.k],L=indLevelOf(d.k,S.ind[d.k]);
    // 처음 만든 상태(새 교회·예전 저장)는 지금 레벨까지 보상받은 것으로 쳐 준다
    if(quiet||s.fresh){s.lv=Math.max(s.lv,L);if(s.fresh){s.cl=s.lv;delete s.fresh;}return;}
    if(L>s.lv){
      var prev=s.lv;s.lv=L;
      toast(d.n+' Lv '+L+'! 현황에서 보상을 받으세요 · +'+fmt(indReward(d.k))+(d.k==='xp'?' · 달란트 +'+TALENT_PER_LV*(L-prev):''),2800);sfx('bell',.5,0);
      var el=document.querySelector('#inds [data-ind="'+d.k+'"]');
      if(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
    }
  });
  if(fitTalents())recalc();
}
// 받을 수 있는 보상을 모두 한꺼번에 받는다: {n: 받은 지표 수, g: 받은 자금 합}
function claimAllInd(){
  var o={n:0,g:0};
  IND.forEach(function(d){if(indReady(d.k)){var g=claimInd(d.k);if(g){o.n++;o.g+=g;}}});
  return o;
}
function claimInd(k){
  if(!indReady(k))return 0;
  var il=ilState()[k],g=indReward(k);
  S.money+=g;S.weekInc+=0;il.cl=il.lv;
  addLog(INDK[k].n+' Lv '+il.lv+' 보상 +'+fmt(g));
  sfx('coins',.6,0);save();return g;
}
/* 점수가 어떻게 나왔는지 (현황 화면에서 지표를 누르면) */
function indWhy(k){
  var c=S.cov||{},L=[],r=function(v){return Math.round(v);},m=Math.max(1,S.members);
  var sv=function(key,nm){var i=satInfo(key);L.push(nm+' '+r(Math.min(i.base+i.have,SERVE_CAP*i.need))+' (자리 '+r(i.base+i.have)+' / 필요 '+r(i.need)+')');};
  if(k==='sp'){
    var sp=c.sp,nm={w:'말씀',p:'기도',r:'찬양'};
    ['w','p','r'].forEach(function(q){L.push(nm[q]+' '+r(Math.min(sp.cap[q],SERVE_CAP*sp.need[q]))+' (자리 '+r(sp.cap[q])+' / 필요 '+r(sp.need[q])+')');});
    L.push('성례 '+Math.round(sp.s*100)+'% → 위 합계 × '+(IND_SAC0+(1-IND_SAC0)*sp.s).toFixed(2));
    L.push('말씀: 성경공부방·선교관·소그룹실 / 기도: 기도실·새벽기도실 / 찬양: 찬양실·합창실. 성찬식·세례식·수련회·절기 예배를 가끔 열어요');
  }else if(k==='mood'){
    sv('fel','교제');sv('care','돌봄');L.push('목양 '+r(IND_PAST*served('past'))+' (돌볼 수 있는 성도 '+r(MOD.cap)+'명 × '+IND_PAST+')');
    L.push('꾸밈 +'+r(IND_BEAUTY*beautyBonus())+' (정원·장식·바닥 아름다움)');
    L.push('침체·낡음·불편 '+(c.malus?'−'+r(-IND_NEG*c.malus):'0')+' · 지난주 불편 −'+(S.gripPen||0));
    L.push('성도 만족도 '+Math.round(S.mood)+'% (헌금·이탈·소개가 이 값을 따라요)');
  }else if(k==='conv'){
    sv('comf','편의 시설');sv('park','주차');L.push('좌석 '+r(IND_SEAT*served('seat'))+' (좌석 '+r(A.seats)+' · 성도 '+m+'명)');
    L.push('화장실·휴게실·편의실, 주차 구역의 주차장, 예배당 좌석으로 채워요');
  }else if(k==='trust'){
    var t=trustParts(c);
    L.push('평판 '+r(t.rep)+' (행사·봉사·바람 들어주기로 쌓이고 서서히 식어요)');
    L.push('성도 평균 호감 Lv '+avgHeart().toFixed(1)+' → '+r(t.lv));
    L.push('직분자 '+offTotal(S)+'명 → '+r(t.off)+' · 목양 충족 '+Math.round((c.past||0)*100)+'% → '+r(t.past));
    L.push('최근 심방·선물 활동 → '+r(t.vis)+' (매주 '+Math.round((1-TRUST_VIS_DECAY)*100)+'%씩 식어요)');
    L.push('신뢰도 지수 '+Math.round(trustIdx())+'/100 → 방문자 수·방문자 헌금·신용 한도');
  }else if(k==='xp'){
    L.push('퀘스트를 마칠 때마다 사역 경험이 쌓여요 · 지금 '+(S.qxp||0));
    L.push('사역 경험 Lv 1당 달란트 '+TALENT_PER_LV+'개 → 지금 '+talentTotal()+'개 (남은 '+talentFree()+'개). 행사 › 사역팀에서 나눠 써요');
  }
  return L;
}

/* ---------- 맨 윗줄 칩 ---------- */
function setupInds(){
  var box=$('#inds');if(!box||box.children.length)return;
  box.innerHTML=IND.map(function(d){return '<button class="ind" data-ind="'+d.k+'" style="--c:'+d.col+'" aria-label="'+d.n+'">'+indIcon(d.k)+'<b>Lv 1</b><span class="ig"><i></i></span></button>';}).join('');
}
function syncInds(){
  var box=$('#inds');if(!box)return;
  if(!box.children.length)setupInds();
  IND.forEach(function(d){
    var el=box.querySelector('[data-ind="'+d.k+'"]');if(!el)return;
    var g=indProg(d.k),t='Lv '+g.lv,b=el.querySelector('b');
    if(b.textContent!==t)b.textContent=t;
    el.querySelector('.ig i').style.width=Math.round(g.p*100)+'%';
    el.classList.toggle('rdy',indReady(d.k));
    el.setAttribute('aria-label',d.n+' 레벨 '+g.lv+(indReady(d.k)?', 보상 받기 가능':'')+'. 누르면 현황');
  });
  var q=$('#qchip'),t2=questTop();
  if(q){
    q.hidden=!t2;
    if(t2){var tx=t2.q.n+(t2.q.g==='first'?' · '+t2.q.d:'');if($('#qTxt').textContent!==tx)$('#qTxt').textContent=tx;$('#qBar').style.width=Math.round(t2.p*100)+'%';q.title=t2.q.d;}
  }
}
