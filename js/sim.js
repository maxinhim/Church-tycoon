'use strict';
/* ---------- 시뮬레이션 ---------- */
function update(dt){
  if(S.over)return;
  S.clock+=dt;S.t+=dt;
  var evM=S.evt==='festival'?1.6:(S.evt==='rain'?0.5:1);
  var parkF=clamp((A.park+4)/(S.members*0.35+6),0.35,1);
  var rate=0.22*(0.45+S.rep/70)*(1+0.25*S.staff.evang)*(1+A.vis)*parkF*evM+S.members*0.004;
  S.spawnAcc+=rate*dt;
  while(S.spawnAcc>=1){S.spawnAcc-=1;if(V.length<40)spawnV();}
  for(var i=0;i<V.length;i++)stepV(V[i],dt);
  V=V.filter(function(v){return !v.dead;});
  for(var j=0;j<F.length;j++){F[j].t-=dt;}
  F=F.filter(function(f){return f.t>0;});
  if(S.t>=WEEK){S.t-=WEEK;weekEnd();}
}
function addLog(msg){S.log.unshift({w:S.week,msg:msg});if(S.log.length>8)S.log.length=8;}
function weekEnd(){
  recalc();
  var mood=S.mood;
  var attend=Math.min(S.members,A.seats);
  var offering=attend*10*(0.4+0.6*mood/100)*(1+0.15*S.staff.praise);
  var sponsor=Math.max(0,260-6.5*S.week);
  var exp=160+A.up+S.staff.evang*STAFF.evang.week+S.staff.praise*STAFF.praise.week+S.staff.care*STAFF.care.week;
  var inc=offering+sponsor+S.weekInc;
  S.money+=offering+sponsor-exp;
  S.hist.push({inc:inc,exp:exp});if(S.hist.length>12)S.hist.shift();
  var msg='주일예배 · 출석 '+attend+'명 · 헌금 +'+fmt(offering)+(sponsor>0?' · 후원 +'+fmt(sponsor):'')+' · 지출 −'+fmt(exp);
  var lose=0,gain=0;
  if(mood<50)lose+=Math.floor(S.members*0.07*(50-mood)/50+Math.random());
  if(S.members>A.seats)lose+=Math.floor((S.members-A.seats)*0.3+Math.random());
  if(mood>=55)gain=Math.floor(S.members*0.03*(mood-55)/45+Math.random());
  S.members=Math.max(0,S.members-lose+gain);
  if(lose>0)msg+=' · 성도 '+lose+'명이 떠났어요';
  S.rep=clamp(S.rep+A.rep+(mood-60)*0.015-(S.rep>50?(S.rep-50)*0.05:0),0,100);
  S.weekInc=0;S.visitsWeek=0;S.joinedWeek=0;S.week++;
  if(S.evtLeft>0){S.evtLeft--;if(S.evtLeft===0)S.evt=null;}
  else if(Math.random()<0.14){
    var r=Math.random();
    if(r<0.25){S.evt='rain';S.evtLeft=2;msg='장마철입니다. 2주간 방문자가 줄어요.';}
    else if(r<0.5){S.evt='festival';S.evtLeft=2;msg='동네 축제가 열렸어요. 2주간 거리가 북적여요.';}
    else if(r<0.75){S.money+=400;msg='익명의 감사 헌금 400이 들어왔어요.';}
    else{S.money-=250;msg='난방 설비 수리비 250이 나갔어요.';}
  }
  addLog(msg);toast(msg,4200);
  var g=GOALS[S.goal];
  if(g&&g.t(S)){
    S.money+=g.r;addLog('목표 달성 · '+g.n);
    toast('목표 달성 · '+g.n+(g.r?' (후원금 +'+fmt(g.r)+')':''),4800);
    S.goal++;
  }
  recalc();
  if(S.money<-1500){S.over=true;showOver();}
  save();
  if(UI.tab==='status'&&!UI.fold)renderPanel();
  hud(true);
}
