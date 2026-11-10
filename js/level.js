'use strict';
/* ---------- 교회 Level ----------
   점수 = 시설 가치(지은 건물·층·칸·바닥·길·땅 높이의 값, 이번 주에 지은 건물은 다음 주부터) + (자금 − 빚) × 0.2 + 만족도 × 20 + 성도 × 50 + 평판 × 20
   Level L이 되려면 점수가 10,000 + 800 × (L−1)^1.55 이상 (Level 2는 10,800, 5는 약 1만 7천, 10은 약 3만 4천, 50은 약 34만, 100은 약 100만).
   한 번 오른 Level은 내려가지 않는다(가장 높았던 점수 기준). 오르면 화면 가운데 큰 배지와 폭죽이 2.5초쯤 떴다가 사라진다 */
var LV_MAX=100,LV_BASE=10000,LV_K=800,LV_P=1.55;
function lvNeed(L){return L<=1?0:LV_BASE+LV_K*Math.pow(L-1,LV_P);}
function levelOf(sc){if(!(sc>=LV_BASE))return 1;return Math.min(LV_MAX,1+Math.floor(Math.pow((sc-LV_BASE)/LV_K,1/LV_P)+1e-9));}
// 시설 가치: 지금 서 있는 것들의 값 (건물·층·칸 건물의 칸과 위층·바닥 타일·길 조각·땅 높이·경사로)
function assetValue(){
  var t=0;
  S.buildings.forEach(function(b){
    var d=defOf(b);if(!d)return;
    // 이번 주에 지은 것은 아직 전액 되돌릴 수 있으므로 다음 주부터 친다 (짓고 되돌리기로 Level만 올리지 못하게)
    if(b.bw===S.week)return;
    if(isRoom(b)){b.tiles.forEach(function(q){t+=D[b.def].cost+((q.f||1)-1)*MROOM.floorCost;});return;}
    t+=d.cost+((b.floors||1)-1)*floorCostOf(b);
  });
  for(var k in S.floor){var fd=D[S.floor[k]];if(fd)t+=fd.cost;}
  S.paths.forEach(function(p){t+=pieceCost(p)+(p.f&&D[p.f]?D[p.f].cost:0);});
  for(var h in S.hgt)t+=(S.hgt[h]||0)*TER_UP;
  for(var s in S.slp)t+=TER_RAMP;
  return t;
}
function scoreParts(){
  // 자금은 빚을 뺀 만큼만 (대출로 Level을 올리지 못하게)
  var a=assetValue(),m=Math.max(0,S.money-debt())*0.2,md=S.mood*20,mb=S.members*50,rp=S.rep*20;
  return {asset:a,money:m,mood:md,mem:mb,rep:rp,total:Math.round(a+m+md+mb+rp)};
}
function churchScore(){return scoreParts().total;}
// 매 HUD 갱신: 점수가 새 Level에 닿으면 올리고 축하한다 (처음 불러올 때는 조용히 맞춘다)
function levelTick(quiet){
  var L=levelOf(churchScore());
  if(S.lvl==null||quiet){S.lvl=Math.max(S.lvl||1,L);syncLevel();return;}
  if(L>S.lvl){var from=S.lvl;S.lvl=L;syncLevel(true);showLevelUp(L,from);save();}
  else syncLevel();
}
function syncLevel(pop){
  var el=$('#clvl');if(!el)return;
  var t='Lv '+(S.lvl||1);if(el.textContent!==t)el.textContent=t;
  el.setAttribute('aria-label','교회 레벨 '+(S.lvl||1)+'. 누르면 점수');
  if(pop){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
}
// 레벨 배지를 누르면: 지금 점수와 다음 레벨까지
function levelInfo(){
  var p=scoreParts(),L=S.lvl||1,nx=L<LV_MAX?Math.max(0,Math.ceil(lvNeed(L+1)-p.total)):0;
  toast('교회 Lv '+L+' · 점수 '+fmt(p.total)+' (시설 '+fmt(Math.round(p.asset))+' · 자금 '+fmt(Math.round(p.money))+' · 만족·성도·평판 '+fmt(Math.round(p.mood+p.mem+p.rep))+')'+(L<LV_MAX?' · 다음 레벨까지 '+fmt(nx):' · 최고 레벨'),4200);
}
/* ---------- 레벨 업 축하: 큰 배지 + 빛 + 폭죽 (게임은 멈추지 않고, 누르면 바로 닫힌다) ---------- */
var lvTimer=0;
function showLevelUp(L,from){
  var el=$('#lvup');if(!el)return;
  $('#lvN').textContent=L;
  $('#lvS').textContent=S.name+(L-from>1?' · '+(L-from)+'단계 올랐어요':'')+(L>=LV_MAX?' · 최고 레벨!':'');
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
