'use strict';
/* ---------- 방문자 ----------
   방문자는 길찾기 노드(땅 칸·길 조각)를 따라 움직이고, 건물에는 입구로 들어가 출구로 나온다.
   입구·출구가 입구 아치에서 닿지 않는 건물은 고르지 않는다. */
function spawnV(){
  var needs={};NEEDS.forEach(function(n){needs[n]=22+Math.random()*34;});
  V.push({x:ENT+0.5,y:ROWS-0.5,z:0,node:gateNode(),needs:needs,state:'idle',t:0.2,path:null,pi:0,target:0,want:'',inside:0,wait:0,annoy:0,idleN:0,blocked:{},
    life:38+Math.random()*20,speed:1.5+Math.random()*0.6,ph:Math.random()*6.28,
    tint:['#c75b4a','#4a78c7','#8a5bb5','#d19a2e','#3d9b7a','#b5587f','#e0e0e0'][(Math.random()*7)|0],
    pant:['#3b4252','#5b4a3a','#2f3e5c'][(Math.random()*3)|0],dead:false});
}
function placeAt(v,n){var p=nodePos(n);v.x=p.x;v.y=p.y;v.z=p.z;v.node=n;}
function moveAlong(v,dt){
  var rem=v.speed*dt;
  while(rem>0&&v.pi<v.path.length){
    var p=v.path[v.pi];
    if(!nodeOk(p.n))return 'blocked';
    var dx=p.x-v.x,dy=p.y-v.y,d=Math.hypot(dx,dy);
    if(d<=rem){v.x=p.x;v.y=p.y;v.z=p.z;v.node=p.n;v.pi++;rem-=d;}
    else{var k=rem/d;v.x+=dx*k;v.y+=dy*k;v.z+=(p.z-v.z)*k;rem=0;}
  }
  return v.pi>=v.path.length;
}
function usable(b){return !!(b&&b.acc&&b.acc.ok);}
function arrive(v){
  if(!v.target){v.state='idle';v.t=0.8+Math.random();return;}
  var b=bById(v.target);
  if(!usable(b)){v.state='idle';v.t=0.2;v.target=0;return;}
  if(b.inUse<defOf(b).cap)enter(v,b);
  else{v.state='wait';v.wait=5;}
}
function enter(v,b){b.inUse++;v.state='inside';v.inside=b.id;v.t=defOf(b).dur*(0.8+Math.random()*0.4);}
function finishVisit(v){
  var b=bById(v.inside);
  if(b){
    var d=defOf(b);b.inUse=Math.max(0,b.inUse-1);b.uses=(b.uses||0)+1;
    for(var n in d.fill){
      var amt=d.fill[n];
      if(n==='care')amt*=1+0.15*S.staff.care;
      if(n==='word')amt*=1+0.08*S.staff.praise;
      v.needs[n]=Math.min(100,v.needs[n]+amt);
    }
    if(d.income){S.money+=d.income;S.weekInc+=d.income;}
    // 출구로 나온다. 출구가 막혔으면 입구로, 둘 다 막혔으면 입구 아치로
    var out=b.door?doorNode(b.door.ext):-1;
    if(out<0&&b.door)out=doorNode(b.door.ent);
    placeAt(v,out>=0?out:gateNode());
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
  v.dead=true;
  var avg=NEEDS.reduce(function(s,n){return s+v.needs[n];},0)/4-v.annoy*5;
  S.rep=clamp(S.rep+(avg-58)*0.006,0,100);
  S.visitsWeek++;
  var p=clamp((avg-42)/50,0,1)*0.6*(1+0.1*S.staff.evang)*(v.needs.word>=45?1:0.25);
  if(Math.random()<p){S.members++;S.joinedWeek++;F.push({x:ENT+0.5,y:ROWS-1.2,t:1.6,text:'+1 성도'});}
}
function decide(v){
  var avg=NEEDS.reduce(function(s,n){return s+v.needs[n];},0)/4;
  if(v.life<=0||avg>=80){goLeave(v);return;}
  var order=NEEDS.slice().sort(function(a,b){return v.needs[a]-v.needs[b];});
  for(var oi=0;oi<order.length;oi++){
    var n=order[oi];
    if(v.needs[n]>=75)continue;
    var cands=S.buildings.filter(function(b){var d=defOf(b);return d.fill&&d.fill[n]&&usable(b)&&!(v.blocked[b.id]>S.clock);});
    cands.sort(function(a,b){return (Math.abs(a.x-v.x)+Math.abs(a.y-v.y))-(Math.abs(b.x-v.x)+Math.abs(b.y-v.y));});
    for(var ci=0;ci<Math.min(3,cands.length);ci++){
      var b=cands[ci],tn=doorNode(b.door.ent),p=navPath(v.node,function(m){return m===tn;});
      if(p){v.path=p;v.pi=0;v.target=b.id;v.want=n;v.state='walk';if(!p.length)arrive(v);return;}
    }
  }
  v.idleN++;
  if(v.idleN>=3){goLeave(v);return;}
  var tx=clamp(Math.floor(v.x)+((Math.random()*7)|0)-3,0,COLS-1),ty=clamp(Math.floor(v.y)+((Math.random()*7)|0)-3,0,ROWS-1);
  if(!groundOk(tx,ty)){v.t=0.5;return;}
  var tg=gid(tx,ty),wp=navPath(v.node,function(m){return m===tg;});
  if(wp&&wp.length){v.path=wp;v.pi=0;v.target=0;v.want='';v.state='walk';}else v.t=0.6;
}
function stepV(v,dt){
  v.life-=dt;
  if(v.state==='walk'||v.state==='leave'){
    var r=moveAlong(v,dt);
    if(r==='blocked'){
      if(v.state==='leave')goLeave(v);else{v.state='idle';v.t=0.2;v.target=0;}
      return;
    }
    if(r===true){if(v.state==='leave')depart(v);else arrive(v);}
  }else if(v.state==='wait'){
    var b=bById(v.target);
    if(!usable(b)){v.state='idle';v.t=0.2;v.target=0;return;}
    if(b.inUse<defOf(b).cap)enter(v,b);
    else{v.wait-=dt;if(v.wait<=0){v.annoy++;v.blocked[v.target]=S.clock+14;v.target=0;v.state='idle';v.t=0.3;}}
  }else if(v.state==='inside'){
    v.t-=dt;if(v.t<=0)finishVisit(v);
  }else if(v.state==='idle'){
    v.t-=dt;if(v.t<=0)decide(v);
  }
}
