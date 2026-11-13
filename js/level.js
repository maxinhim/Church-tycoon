'use strict';
/* ---------- 교회 Level ----------
   점수 = 현황 다섯 지표(영성·만족도·편의·신뢰도·사역 경험) 점수의 합 (status.js). 건물 값·자금·성도 수는 직접 치지 않는다.
   Level L이 되려면 합이 LV_BASE + LV_K × (L−1)^LV_P 이상 (값은 balance.js).
   한 번 오른 Level은 내려가지 않는다. 오르면 화면 가운데 큰 배지와 폭죽이 2.5초쯤 떴다가 사라진다.
   보상: 오를 때마다 축하금(lvGift). 건물·사역팀·행사는 정해진 Level에 열리고(LV_TIER), 새 꾸미기는 LV_UNLOCK에 열린다 */
function lvGift(L){return LV_GIFT0+LV_GIFT_K*L;}
function lvNeed(L){return L<=1?0:LV_BASE+LV_K*Math.pow(L-1,LV_P);}
function levelOf(sc){if(!(sc>=LV_BASE))return 1;return Math.min(LV_MAX,1+Math.floor(Math.pow((sc-LV_BASE)/LV_K,1/LV_P)+1e-9));}
function scoreParts(){var o=S.ind||{};return {sp:o.sp||0,mood:o.mood||0,conv:o.conv||0,trust:o.trust||0,xp:o.xp||0,total:o.tot||0};}
function churchScore(){return scoreParts().total;}
// 매 HUD 갱신: 합이 새 Level에 닿으면 올리고 축하한다 (처음 불러올 때는 조용히 맞춘다)
function levelTick(quiet){
  indTick(quiet);
  var L=levelOf(churchScore());
  if(S.lvl==null||quiet){S.lvl=Math.max(S.lvl||1,L);syncLevel();return;}
  if(L>S.lvl){
    var from=S.lvl,gift=0,opened=[];
    for(var k=from+1;k<=L;k++){gift+=lvGift(k);opened=opened.concat(lvUnlockNames(k),tierNames(k));}
    S.lvl=L;S.money+=gift;
    addLog('교회 Lv '+L+' · 축하금 +'+fmt(gift)+(opened.length?' · 새로 열림 '+opened.join(', '):''));
    syncLevel(true);showLevelUp(L,from,gift,opened);save();
  }
  else syncLevel();
}
function syncLevel(pop){
  var el=$('#clvl');if(!el)return;
  var t='Lv '+(S.lvl||1);if(el.textContent!==t)el.textContent=t;
  el.setAttribute('aria-label','교회 레벨 '+(S.lvl||1)+'. 누르면 점수');
  if(pop){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
}
// 레벨 배지를 누르면: 지금 합계 점수와 다음 레벨까지
function levelInfo(){
  var p=scoreParts(),L=S.lvl||1,nx=L<LV_MAX?Math.max(0,Math.ceil(lvNeed(L+1)-p.total)):0;
  var nu='';for(var k=L+1;k<=LV_MAX&&!nu;k++){var n=lvUnlockNames(k).concat(tierNames(k));if(n.length)nu=' · Lv '+k+'에 '+n.slice(0,4).join(', ')+(n.length>4?' 외':'')+' 열림';}
  toast('교회 Lv '+L+' · 지표 점수 합 '+fmtN(p.total)+(L<LV_MAX?' · 다음 레벨까지 '+fmtN(nx)+nu:' · 최고 레벨'),4200);
}
/* ---------- 레벨 업 축하: 큰 배지 + 빛 + 폭죽 (게임은 멈추지 않고, 누르면 바로 닫힌다) ---------- */
var lvTimer=0;
function showLevelUp(L,from,gift,opened){
  var el=$('#lvup');if(!el)return;
  $('#lvN').textContent=L;
  $('#lvS').textContent='축하금 +'+fmt(gift||0)+(opened&&opened.length?' · 새로 열림 '+opened.slice(0,3).join(', ')+(opened.length>3?' 외 '+(opened.length-3):''):'')+(L-from>1?' · '+(L-from)+'단계 올랐어요':'')+(L>=LV_MAX?' · 최고 레벨!':'');
  el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  sfx('bell',.9,0);setTimeout(function(){sfx('join',.8,0);},250);setTimeout(function(){sfx('coins',.6,0);},520);
  clearTimeout(lvTimer);lvTimer=setTimeout(function(){el.hidden=true;},2600);
  if(!REDUCED.matches)fireworks();
}
function fireworks(){
  var cols=['#ffd23f','#ff6b6b','#4ecdc4','#7aa0ff','#ffffff','#c77dff','#8bd450','#ff9f43'];
  for(var k=0;k<6;k++)(function(k){
    setTimeout(function(){
      var cx=VW*(0.18+0.64*Math.random()),cy=VH*(0.16+0.3*Math.random()),c0=cols[k%cols.length],c1=cols[(k+3)%cols.length];
      for(var i=0;i<46;i++){var a=i/46*6.283+Math.random()*.2,sp=170+Math.random()*190;
        CF.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-60,r:0,vr:0,w:4,h:4,col:i%3?c0:c1,life:1.1+Math.random()*.7});}
    },k*230);
  })(k);
  // 양옆에서 꽃가루도
  for(var j=0;j<90;j++){var L=j%2===0;CF.push({x:L?-10:VW+10,y:VH*0.6+Math.random()*VH*0.25,vx:(L?1:-1)*(240+Math.random()*380),vy:-(360+Math.random()*380),r:Math.random()*6,vr:(Math.random()-.5)*14,w:5+Math.random()*5,h:3+Math.random()*3,col:cols[j%cols.length],life:2.4+Math.random()});}
}
