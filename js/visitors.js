'use strict';
/* ---------- 방문자 ----------
   방문자는 길찾기 노드(땅 칸·길 조각)를 따라 움직이고, 건물에는 입구로 들어가 출구로 나온다.
   입구·출구가 입구 아치에서 닿지 않는 건물은 고르지 않는다.
   연결 다리로 이어진 같은 역할 건물은 한 묶음: 들어간 건물이 꽉 차면 다리를 건너 옆 건물로 가고,
   자기 출구가 막혀 있어도 묶음의 다른 출구로 나올 수 있다. */
// member: 주일에 예배하러 오는 성도 (정착 판정 없음, 말씀이 가장 급하다). wallet: 매장에서 쓸 수 있는 돈
function spawnV(member){
  var needs={};NEEDS.forEach(function(n){needs[n]=22+Math.random()*34;});
  if(member)needs.word=8+Math.random()*10;
  V.push({x:ENT+0.5,y:ROWS-0.5,z:0,node:gateNode(),needs:needs,state:'idle',t:0.2,path:null,pi:0,target:0,want:'',inside:0,wait:0,annoy:0,idleN:0,blocked:{},
    member:!!member,wallet:Math.round(member?36+Math.random()*120:20+Math.random()*96),
    life:55+Math.random()*30,speed:1.9+Math.random()*0.7,ph:Math.random()*6.28,
    tint:['#c75b4a','#4a78c7','#8a5bb5','#d19a2e','#3d9b7a','#b5587f','#e0e0e0'][(Math.random()*7)|0],
    pant:['#3b4252','#5b4a3a','#2f3e5c'][(Math.random()*3)|0],dead:false});
  gripeInit(V[V.length-1]);
}
// 한 주가 48초라 한 주에 오는 방문자가 예전(240초)보다 적어, 한 번 방문의 정착 확률을 올려 한 주 합계를 맞춘다
var JOIN_P=0.09;
/* 발자국: 노드마다 지나간 사람 수 (저장하지 않음, 주마다 절반으로 줄어든다).
   둘러보는 방문자는 발길이 덜 닿은 곳(새로 깐 길·데크)을 골라 간다 */
var TRAF={};
function trafWeek(){for(var k in TRAF){TRAF[k]*=.5;if(TRAF[k]<.5)delete TRAF[k];}}
// 새로 지은 건물(6주 안)과 아직 덜 쓰인 건물에 끌린다
function novelty(b){var age=b.bw==null?99:S.week-b.bw;return (age<6?4*(1-age/6):0)+((b.uses||0)<8?1.5:0);}
// 둘러볼 곳: 부지 안 바닥 노드 몇 개를 뽑아, 발길이 적고 너무 멀지 않은 곳
function wanderGoal(v){
  var L=NAV.walk||[];if(!L.length)return -1;
  var best=-1,bs=1e9;
  for(var i=0;i<12;i++){
    var n=L[(Math.random()*L.length)|0];if(n===v.node)continue;
    var q=nodePos(n),sc=(TRAF[n]||0)*1.5+Math.hypot(q.x-v.x,q.y-v.y)*.12+Math.random()*2;
    if(sc<bs){bs=sc;best=n;}
  }
  return best;
}
function placeAt(v,n){var p=nodePos(n);v.x=p.x;v.y=p.y;v.z=p.z;v.node=n;}
function moveAlong(v,dt){
  var rem=v.speed*wxSpeed()*dt;
  while(rem>0&&v.pi<v.path.length){
    var p=v.path[v.pi];
    if(!nodeOk(p.n))return 'blocked';
    var dx=p.x-v.x,dy=p.y-v.y,d=Math.hypot(dx,dy);
    if(d<=rem){v.x=p.x;v.y=p.y;v.z=p.z;if(v.node!==p.n)TRAF[p.n]=(TRAF[p.n]||0)+1;v.node=p.n;v.pi++;rem-=d;}
    else{var k=rem/d;v.x+=dx*k;v.y+=dy*k;v.z+=(p.z-v.z)*k;rem=0;}
  }
  return v.pi>=v.path.length;
}
function usable(b){
  if(!b||!b.acc||!b.acc.ent)return false;
  return b.acc.ext||(b.links||[]).some(function(id){var o=bById(id);return !!(o&&o.acc&&o.acc.ext);});
}
function linkWithSpace(b){
  var ids=b.links||[];
  for(var i=0;i<ids.length;i++){var o=bById(ids[i]);if(o&&o.inUse<defOf(o).cap)return o;}
  return null;
}
// 꽉 찬 건물 안에서 연결 다리를 건너 옆 건물로. 자리는 미리 잡아 둔다
function startXfer(v,from,to){
  var r=skyRoute(from,to);if(!r)return false;
  to.inUse++;
  v.state='xfer';v.target=to.id;v.path=r;v.pi=1;
  v.x=r[0].x;v.y=r[0].y;v.z=r[0].z;v.node=r[0].n;
  return true;
}
// 나올 곳: 자기 출구 → 묶음의 다른 출구 → 자기 입구 → 묶음의 입구 → 입구 아치
function exitNodeFor(b){
  if(!b)return gateNode();
  var mates=(b.links||[]).map(bById).filter(function(o){return o&&o.door;}),cand=[];
  if(b.door)cand.push(b.door.ext);
  mates.forEach(function(o){cand.push(o.door.ext);});
  if(b.door)cand.push(b.door.ent);
  mates.forEach(function(o){cand.push(o.door.ent);});
  for(var i=0;i<cand.length;i++){var n=doorNode(cand[i]);if(n>=0&&NAV.reach[n])return n;}
  return gateNode();
}
function arrive(v){
  if(!v.target){v.state='idle';v.t=0.8+Math.random();return;}
  var b=bById(v.target);
  if(!usable(b)){v.state='idle';v.t=0.2;v.target=0;return;}
  if(b.inUse<defOf(b).cap)enter(v,b);
  else{var alt=linkWithSpace(b);if(!(alt&&startXfer(v,b,alt))){v.state='wait';v.wait=WAIT_T;}}
}
// 한 주 48초에 맞춰 건물 안에 머무는 시간을 짧게
var STAY=0.8;
// 꽉 찬 건물 앞에서 기다리는 시간. 넘으면 크게 불만(평판·정착 손해, 불편 '붐빔')
var WAIT_T=3.5,CROWD_ANNOY=1.5;
function enter(v,b){b.inUse++;v.state='inside';v.inside=b.id;v.t=defOf(b).dur*STAY*(0.8+Math.random()*0.4);}
function finishVisit(v){
  var b=bById(v.inside);
  if(b){
    var d=defOf(b);b.inUse=Math.max(0,b.inUse-1);b.uses=(b.uses||0)+1;b.weekUses=(b.weekUses||0)+1;
    for(var n in d.fill){
      var amt=d.fill[n];
      if(n==='care')amt*=MOD.care;
      if(n==='word')amt*=MOD.word;
      amt*=wxFill(d);
      v.needs[n]=Math.min(100,v.needs[n]+amt);
    }
    // 매장: 가진 돈 안에서 사 간다. 건물 위에 번 돈이 뜬다
    if(d.income&&v.wallet>0){
      var pay=Math.min(v.wallet,Math.round(d.income*SHOP_K*wxSale(d)*(0.7+Math.random()*0.6)));
      if(pay>0){var sup=Math.round(pay*SHOP_COST);v.wallet-=pay;S.money+=pay-sup;S.weekInc+=pay;S.weekShop+=pay;S.weekSup=(S.weekSup||0)+sup;gripeBought(v,b);sfx('coin',.3,160);var bd=bDims(b);F.push({x:b.x+bd.w/2,y:b.y+bd.h/2,z:bLevel(b)*LV+bHeight(b)+.1,t:1.1,d:1.1,text:'+'+pay,col:'#ffd76a'});}
    }
    gripeUsed(v,b);
    placeAt(v,exitNodeFor(b));
  }
  v.inside=0;v.target=0;v.state='idle';v.t=0.3;v.idleN=0;
}
function goLeave(v){
  var g=gateNode(),p=navPath(v.node,function(n){return n===g;});
  if(!p){depart(v);return;}
  v.path=p;v.pi=0;v.state='leave';v.target=0;
  if(!p.length)depart(v);
}
function depart(v){
  v.dead=true;gripeLeave(v);
  var avg=NEEDS.reduce(function(s,n){return s+v.needs[n];},0)/4-v.annoy*5;
  if(v.member){gainRep((avg-REP_MOOD0)*0.001);return;}
  gainRep((avg-REP_MOOD0)*0.003);
  S.visitsWeek++;
  // 교회가 클수록 한 사람이 정착하기 어렵다 (끝없는 성장 방지)
  var p=clamp((avg-42)/50,0,1)*JOIN_P*MOD.join*(v.needs.word>=45?1:0.25)/(1+S.members/200);
  if(Math.random()<p){S.members++;S.joinedWeek++;S.newSinceBap++;sfx('join',.45,300);F.push({x:ENT+0.5,y:PZ-0.6,t:1.6,text:'+1 성도',col:'#fff2b0'});}
}
// 욕구가 이만큼 차면 그 욕구는 됐다고 보고, 평균이 이만큼이면 돌아간다 (높을수록 건물을 더 많이 들른다)
var NEED_OK=88,NEED_DRAIN=0.4;
function decide(v){
  var avg=NEEDS.reduce(function(s,n){return s+v.needs[n];},0)/4;
  if(v.life<=0||avg>=NEED_OK){goLeave(v);return;}
  // 둘레를 둘러보고(삭막한지·쓰레기통), 급한 일(화장실·쉴 자리·마실 것)이 있으면 그것부터
  gripeLook(v);
  if(v.urge&&urgeGo(v))return;
  // 가장 모자란 욕구부터 보되, 사람마다 조금씩 섞어 여러 종류의 건물을 고루 들른다
  var nr={};NEEDS.forEach(function(n){nr[n]=v.needs[n]+Math.random()*30;});
  var order=NEEDS.slice().sort(function(a,b){return nr[a]-nr[b];});
  for(var oi=0;oi<order.length;oi++){
    var n=order[oi];
    if(v.needs[n]>=NEED_OK)continue;
    var cands=S.buildings.filter(function(b){var d=defOf(b);return d.fill&&d.fill[n]&&usable(b)&&!(v.blocked[b.id]>S.clock)&&wxOpen(d);});
    // 지갑에 돈이 있으면 매장에 조금 더 끌린다
    // 모든 건물을 골고루: 거리보다 '이번 주에 얼마나 쓰였나(자리 대비)'와 '지금 붐비나'를 더 크게 본다.
    // 새 건물에는 조금만 더 끌리고, 사람마다 조금씩 다르게 고른다
    var jit={};cands.forEach(function(b){jit[b.id]=Math.random()*4;});
    var cost=function(b){var d=defOf(b),cp=Math.max(1,d.cap);return (Math.abs(b.x-v.x)+Math.abs(b.y-v.y))*.3+(b.weekUses||0)/cp*2.5+b.inUse/cp*4-(d.income&&v.wallet>=d.income*SHOP_K?3:0)-novelty(b)+jit[b.id];};
    cands.sort(function(a,b){return cost(a)-cost(b);});
    for(var ci=0;ci<Math.min(3,cands.length);ci++){
      var b=cands[ci],tn=doorNode(b.door.ent),p=navPath(v.node,function(m){return m===tn;});
      if(p){v.path=p;v.pi=0;v.target=b.id;v.want=n;v.state='walk';if(!p.length)arrive(v);return;}
    }
  }
  // 할 일이 없으면 대부분 바로 돌아가고, 가끔만 둘러본다 (마당을 떠도는 사람을 줄인다)
  v.idleN++;
  if(v.idleN>=2||Math.random()<0.75){goLeave(v);return;}
  var tg=wanderGoal(v);if(tg<0||!nodeOk(tg)){v.t=0.5;return;}
  var wp=navPath(v.node,function(m){return m===tg;});
  if(wp&&wp.length){v.path=wp;v.pi=0;v.target=0;v.want='';v.state='walk';}else v.t=0.6;
}
function stepV(v,dt){
  v.life-=dt;
  // 비·폭염·눈 속을 걸으면 편의 욕구가 떨어진다
  if(v.state!=='inside'){var dr=wxDrain();if(dr)v.needs.comf=Math.max(0,v.needs.comf-dr*dt);
    // 밖에 있는 동안 욕구가 천천히 줄어 다음 건물을 찾게 된다
    for(var ni=0;ni<NEEDS.length;ni++){var nk=NEEDS[ni];v.needs[nk]=Math.max(0,v.needs[nk]-NEED_DRAIN*dt);}}
  // 걸은 거리(지난 프레임)와 머문 시간으로 급한 일이 생긴다
  gripeTick(v,dt,v.mv||0);v.mv=0;
  if(v.state==='walk'||v.state==='leave'){
    var ox=v.x,oy=v.y,r=moveAlong(v,dt);v.mv=Math.abs(v.x-ox)+Math.abs(v.y-oy);
    if(r==='blocked'){
      if(v.state==='leave')goLeave(v);else{v.state='idle';v.t=0.2;v.target=0;}
      return;
    }
    if(r===true){if(v.state==='leave')depart(v);else arrive(v);}
  }else if(v.state==='wait'){
    var b=bById(v.target);
    if(!usable(b)){v.state='idle';v.t=0.2;v.target=0;return;}
    if(b.inUse<defOf(b).cap)enter(v,b);
    else if(linkWithSpace(b)&&startXfer(v,b,linkWithSpace(b))){}
    else{v.wait-=dt;if(v.wait<=0){v.annoy+=CROWD_ANNOY;addGripe('crowd',defOf(b).name);v.blocked[v.target]=S.clock+14;v.target=0;v.state='idle';v.t=0.3;}}
  }else if(v.state==='xfer'){
    var to=bById(v.target),r2=moveAlong(v,dt);
    if(r2==='blocked'||!to){if(to)to.inUse=Math.max(0,to.inUse-1);placeAt(v,exitNodeFor(to));v.state='idle';v.t=0.3;v.target=0;return;}
    if(r2===true){v.state='inside';v.inside=to.id;v.t=defOf(to).dur*STAY*(0.8+Math.random()*0.4);}
  }else if(v.state==='inside'){
    v.t-=dt;if(v.t<=0)finishVisit(v);
  }else if(v.state==='idle'){
    v.t-=dt;if(v.t<=0)decide(v);
  }
}
