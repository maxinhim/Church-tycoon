'use strict';
/* ---------- 방문자 불편 ----------
   방문자는 머무는 동안 실제로 겪는 일이 생긴다. 맞는 시설을 직접 찾아가고, 못 찾으면 불편을 겪는다.
   · 화장실: 머문 지 얼마 지나면 급해진다 → 화장실·편의실 칸. 못 찾으면 일찍 돌아간다
   · 쉴 자리: 오래 걸으면 다리가 아프다 → 벤치·피크닉 테이블·정자·휴게실 등 (가까이 있어야 한다)
   · 목마름: 오래 걷거나 폭염이면 목이 마르다 → 식수대·자판기·카페 등
   · 배고픔: 머문 지 얼마 지나면 배가 고프다 → 매점·빵집·식당·카페 등
   · 외로움: 혼자 온 방문자는 어울릴 곳을 찾는다 → 소모임(운동·취미·음악)·소그룹실·청년부실
   · 쓰레기: 매장에서 먹을 것을 산 뒤 근처에 쓰레기통이 없으면 불편
   · 삭막함: 걸어 다닌 곳 둘레에 나무·화단·장식이 거의 없으면 불편
   · 붐빔: 건물이 꽉 차서 기다리다 돌아섬 (예전부터 있던 판정)
   불편을 겪으면 그 방문자는 정착·평판에 손해를 보고(annoy), 한 주 동안 겪은 불편의 비율만큼
   다음 주 성도 만족도가 내려간다(최대 8, 불편마다 무게가 다르다). 현황 › 챙길 일에 무엇이 모자란지 보인다. */
// s: 건물 설명에 붙는 짧은 이름 (이 건물이 무엇을 풀어 주는지)
var GRIPES={
  wc:{s:'화장실',n:'화장실을 못 찾은',fix:'화장실·편의실 칸',ids:['wc','mcomf']},
  food:{s:'배고픔',n:'배가 고파도 먹을 곳이 없던',fix:'매점·빵집·식당·카페',ids:['shop','bakery','dining','cafe','grill','market','cook']},
  drink:{s:'목마름',n:'목이 말라도 마실 곳이 없던',fix:'식수대·자판기·커피 카트·카페',ids:['drinkfount','vending','coffeecart','cafe','shop','books','bakery'],near:24*G},
  lonely:{s:'외로움',n:'어울릴 곳이 없어 외로웠던',fix:'소모임(운동·취미·음악)·소그룹실·청년부실',ids:['cell','youth'],cat:'club'},
  seat:{s:'다리 아픔',n:'다리가 아파도 쉴 곳이 없던',fix:'벤치·피크닉 테이블·정자·휴게실을 다니는 길 곳곳에',ids:['bench','picnic','gazebo','lounge','swing','sunbed','parasol','elder'],near:18*G},
  bin:{n:'쓰레기 버릴 곳이 없던',fix:'매장 둘레에 쓰레기통'},
  bare:{n:'볼거리 없이 삭막하다고 느낀',fix:'다니는 길 둘레에 나무·화단·장식'},
  crowd:{n:'건물이 붐벼 그냥 돌아선',fix:'자리를 늘리세요 (층 올리기·하나 더)'}
};
var GRIPE_ORDER=['wc','food','drink','lonely','seat','bin','bare','crowd'];
// 이 건물이 그 불편을 풀어 주는지
function gripeFits(g,d){return !!g.ids&&(g.ids.indexOf(d.id)>=0||(!!g.cat&&d.cat===g.cat));}
// 건물 설명용: 이 건물이 풀어 주는 불편 이름들
function gripeFixes(d){var o=[];for(var k in GRIPES){var g=GRIPES[k];if(g.s&&gripeFits(g,d))o.push(g.s);}return o;}
// 사 들고 다니다 쓰레기가 생기는 매장
var TRASHY=['cafe','bakery','vending','coffeecart','shop'];
// 불편마다 무게: 쓰레기·붐빔은 가볍게. 방문자가 적을 때(20명 미만)는 20명으로 나눠 몇 명에 크게 흔들리지 않게
// 민감도: 만족도는 최대 8까지, 비율 × 11, 방문자가 적어도 14명으로 나눔(초반에도 느끼게). 챙길 일에는 방문자 10% 이상(최소 3명)이 겪은 불편만
/* 장식 목록: 둘러본 곳이 삭막한지, 쓰레기통이 가까운지 볼 때 쓴다 (recalc 때마다 다시 만든다) */
var DECOR=[],BINS=[];
function rebuildDecor(){
  DECOR=[];BINS=[];
  S.buildings.forEach(function(b){
    var d=defOf(b),bd=bDims(b),p={x:b.x+bd.w/2,y:b.y+bd.h/2,v:d.beauty||0};
    if(b.def==='bin')BINS.push(p);
    if(p.v>0&&(d.cat==='garden'||d.cat==='deco'||d.prop))DECOR.push(p);
  });
}
function nearSum(L,x,y,r){var t=0;for(var i=0;i<L.length;i++){var p=L[i];if(Math.abs(p.x-x)<=r&&Math.abs(p.y-y)<=r)t+=p.v;}return t;}
function nearAny(L,x,y,r){for(var i=0;i<L.length;i++){var p=L[i];if(Math.abs(p.x-x)<=r&&Math.abs(p.y-y)<=r)return true;}return false;}
/* 방문자마다: 화장실이 급해질 때, 다리가 아파질 거리, 목이 마를 거리 */
function gripeInit(v){
  v.wcT=Math.random()<0.42?16+Math.random()*28:1e9;
  v.foodT=Math.random()<0.36?20+Math.random()*28:1e9;
  // 혼자 온 새 방문자가 더 외롭다
  v.lonT=Math.random()<(v.member?0.15:0.34)?8+Math.random()*22:1e9;
  v.walked=0;v.legs=32+Math.random()*16;v.walkT=0;v.thirst=42+Math.random()*22;
  v.urge='';v.drank=false;v.trash=false;v.looks=0;v.nice=0;
}
function addGripe(k,name){
  S.grip=S.grip||{};S.grip[k]=(S.grip[k]||0)+1;
  if(name){S.gripB=S.gripB||{};S.gripB[name]=(S.gripB[name]||0)+1;}
}
// 걸은 거리와 시간으로 급한 일이 생긴다 (stepV에서 매 프레임)
function gripeTick(v,dt,walkedNow){
  if(v.wcT==null)gripeInit(v);
  v.walked+=walkedNow;v.walkT+=walkedNow;
  if(v.state!=='inside'){v.wcT-=dt;v.foodT-=dt;v.lonT-=dt;}
  if(v.urge)return;
  // 급한 순서: 화장실 → 배고픔 → 목마름 → 외로움 → 다리
  if(v.wcT<=0){v.urge='wc';return;}
  if(v.foodT<=0){v.urge='food';return;}
  if(!v.drank&&(v.walkT>=v.thirst||(wxNow()==='heat'&&v.walkT>=v.thirst*.5))){v.urge='drink';return;}
  if(v.lonT<=0){v.urge='lonely';return;}
  if(v.walked>=v.legs)v.urge='seat';
}
// 갈 곳을 고를 때: 급한 일이 있으면 그 시설부터 찾아간다. 못 찾으면 불편을 겪고 넘어간다 (true = 길을 잡았다)
function urgeGo(v){
  var k=v.urge,g=GRIPES[k];if(!k||!g)return false;
  var all=S.buildings.filter(function(b){return gripeFits(g,defOf(b))&&usable(b);});
  var open=all.filter(function(b){return wxOpen(defOf(b))&&!(v.blocked[b.id]>S.clock);});
  open.sort(function(a,b){return Math.abs(a.x-v.x)+Math.abs(a.y-v.y)-Math.abs(b.x-v.x)-Math.abs(b.y-v.y);});
  for(var i=0;i<Math.min(3,open.length);i++){
    var b=open[i],tn=doorNode(b.door.ent),p=navPath(v.node,function(m){return m===tn;});
    if(p&&(!g.near||p.length<=g.near)){v.path=p;v.pi=0;v.target=b.id;v.want=k==='lonely'?'fel':'comf';v.state='walk';if(!p.length)arrive(v);return true;}
  }
  // 비·눈으로 야외 자리만 닫혀 있으면 탓하지 않는다
  var wxOnly=all.length>0&&open.length===0&&all.some(function(b){return !wxOpen(defOf(b));});
  if(!wxOnly){addGripe(k);v.annoy+=k==='wc'||k==='food'?1:0.5;}
  gripeDone(v,k);
  if(k==='wc'&&!wxOnly)v.life=Math.min(v.life,3);
  return false;
}
function gripeDone(v,k){
  if(k==='wc')v.wcT=1e9;
  else if(k==='food')v.foodT=1e9;
  else if(k==='lonely')v.lonT=1e9;
  else if(k==='seat'){v.walked=0;v.legs=32+Math.random()*16;}
  else if(k==='drink')v.drank=true;
  if(v.urge===k)v.urge='';
}
// 건물을 쓰고 나올 때: 그 건물이 풀어 주는 급한 일을 지운다. 앉아 있던 실내는 다리도 조금 쉰다
function gripeUsed(v,b){
  if(v.wcT==null)gripeInit(v);
  var d=defOf(b);for(var k in GRIPES)if(gripeFits(GRIPES[k],d))gripeDone(v,k);
  v.walked*=0.5;
}
function gripeBought(v,b){if(TRASHY.indexOf(b.def)>=0&&Math.random()<0.5)v.trash=true;}
// 둘러보며: 둘레가 꾸며져 있는지 보고, 쓰레기통이 가까우면 버린다
function gripeLook(v){
  if(v.wcT==null)gripeInit(v);
  v.looks++;if(nearSum(DECOR,v.x,v.y,4*G)>=1)v.nice++;
  if(v.trash&&nearAny(BINS,v.x,v.y,7*G))v.trash=false;
}
// 떠날 때: 남은 쓰레기, 삭막했던 둘러보기
function gripeLeave(v){
  if(v.wcT==null)return;
  S.gripN=(S.gripN||0)+1;
  if(v.trash){addGripe('bin');v.annoy+=0.3;}
  if(v.looks>=4&&v.nice/v.looks<0.2){addGripe('bare');v.annoy+=0.5;}
}
/* 주일 정산: 이번 주 불편을 지난주로 넘기고, 비율만큼 다음 주 만족도를 깎는다 */
function gripeWeek(){
  var g=S.grip||{},t=0;for(var k in g)t+=g[k]*(GRIPE_W[k]||1);
  S.gripPen=Math.round(Math.min(GRIPE_MAX,t/Math.max(GRIPE_N0,S.gripN||0)*GRIPE_K)*10)/10;
  S.gripL=g;S.gripBL=S.gripB||{};S.gripNL=S.gripN||0;
  S.grip={};S.gripB={};S.gripN=0;
}
// 챙길 일에 보일 불편: 이번 주와 지난주 가운데 많은 쪽, 많이 겪은 순서로
function gripeList(){
  var g=S.grip||{},gl=S.gripL||{},n=Math.max(S.gripN||0,S.gripNL||0),out=[];
  GRIPE_ORDER.forEach(function(k){
    var c=Math.max(g[k]||0,gl[k]||0);if(c<Math.max(3,n*GRIPE_SHOW))return;
    var fix=GRIPES[k].fix;
    if(k==='crowd'){var B=(g.crowd||0)>=(gl.crowd||0)?S.gripB:S.gripBL,top=null;for(var nm in B||{})if(!top||B[nm]>B[top])top=nm;if(top)fix=top+' '+fix;}
    out.push({k:k,c:c,t:GRIPES[k].n+' 방문자 '+c+'명 → '+fix});
  });
  return out.sort(function(a,b){return b.c-a.c;});
}
