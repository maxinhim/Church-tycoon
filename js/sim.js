'use strict';
/* ---------- 시뮬레이션 ---------- */
function update(dt){
  if(S.over)return;
  S.clock+=dt;S.t+=dt;
  var evM=S.evt==='festival'?1.6:(S.evt==='rain'?0.5:1);
  var parkF=clamp((A.park+4)/(S.members*0.35+6),0.35,1);
  var rate=0.2*(0.4+S.rep/75)*(1+A.vis)*MOD.vis*parkF*evM+S.members*0.0012;
  S.spawnAcc+=rate*dt;
  while(S.spawnAcc>=1){S.spawnAcc-=1;if(V.length<50)spawnV();}
  for(var i=0;i<V.length;i++)stepV(V[i],dt);
  V=V.filter(function(v){return !v.dead;});
  if(S.t>=WEEK){S.t-=WEEK;weekEnd();}
}
function addLog(msg){S.log.unshift({w:S.week,msg:msg});if(S.log.length>10)S.log.length=10;}
/* 한 주 정산
   수입: 헌금(출석 × 만족도) + 초기 후원(점점 줄어듦) + 이용 수입
   지출: 기본 운영비 + 성도 수에 비례하는 사역비 + 건물 유지비 + 사역팀·부교역자 사례비
   성도: 기본 이탈(관리하지 않으면 줄어든다) + 불만·좌석 부족·목양 과부하 이탈, 만족이 높으면 소개로 조금 늘어남 */
function weekEnd(){
  recalc();
  var dc=curDiff(),mood=S.mood,m=S.members;
  var attend=Math.min(m,A.seats);
  // 출석이 많을수록 한 사람당 헌금 효과는 줄어든다
  var offering=attend*9*(0.4+0.6*mood/100)*MOD.offer/(1+attend/500);
  var sponsor=Math.max(0,260-3.5*S.week);
  var opex=(110+m*2.6+A.up)*MOD.upkeep*dc.cost;
  var exp=opex+teamPay()+assocPay();
  var inc=offering+sponsor+S.weekInc;
  S.money+=offering+sponsor-exp;
  S.hist.push({inc:inc,exp:exp});if(S.hist.length>12)S.hist.shift();
  S.posWeeks=inc-exp>0?S.posWeeks+1:0;
  var msg='주일예배 · 출석 '+attend+'명 · 헌금 +'+fmt(offering)+(sponsor>0?' · 후원 +'+fmt(sponsor):'')+' · 지출 −'+fmt(exp);
  var churn=m*0.012;
  if(mood<60)churn+=m*0.07*(60-mood)/60;
  churn+=m*m/50000;
  churn*=MOD.loss*dc.churn;
  if(m>A.seats)churn+=(m-A.seats)*0.3;
  if(m>MOD.cap)churn+=(m-MOD.cap)*0.1;
  var lose=Math.floor(churn+Math.random());
  var gain=mood>=60?Math.floor(m*0.02*(mood-60)/40/(1+m/300)+Math.random()*0.8):0;
  S.members=Math.max(0,m-lose+gain);
  if(lose>gain)msg+=' · 성도 '+(lose-gain)+'명이 떠났어요';
  S.rep=clamp(S.rep+A.rep+MOD.rep+(mood-60)*0.015-(S.rep>50?(S.rep-50)*0.05:0),0,100);
  S.weekInc=0;S.visitsWeek=0;S.joinedWeek=0;S.week++;
  // 체력·일시 만족·행사·쿨다운·노후·직분 정리
  staminaWeek();
  S.tempMood=Math.abs(S.tempMood)<0.5?0:S.tempMood*0.5;
  if(S.restCd>0)S.restCd--;
  for(var id in S.ev){var st=S.ev[id];if(st.left>0)st.left--;if(st.cd>0)st.cd--;}
  decayWeek();
  for(var k in OFFICE){var mx=officeMax(k);if(S.off[k]>mx){addLog('성도가 줄어 '+OFFICE[k].name+' '+(S.off[k]-mx)+'명이 직분을 내려놓았어요');S.off[k]=mx;}}
  if(S.week-S.candWeek>=6)refreshCands();
  if(S.evtLeft>0){S.evtLeft--;if(S.evtLeft===0)S.evt=null;}
  else if(Math.random()<0.14){
    var r=Math.random();
    if(r<0.25){S.evt='rain';S.evtLeft=2;msg='장마철입니다. 2주간 방문자가 줄어요.';}
    else if(r<0.5){S.evt='festival';S.evtLeft=2;msg='동네 축제가 열렸어요. 2주간 거리가 북적여요.';}
    else if(r<0.75){S.money+=400;msg='익명의 감사 헌금 400이 들어왔어요.';}
    else{S.money-=250;msg='난방 설비 수리비 250이 나갔어요.';}
  }
  addLog(msg);toast(msg,4200);
  rollDilemma();
  recalc();
  checkGoal();
  recalc();
  if(S.money<-1500){S.over=true;showOver();}
  save();
  if(!UI.fold&&(UI.tab==='status'||UI.tab==='staff'||UI.tab==='events'))renderPanel();
  if(S.dlg&&typeof showDlg==='function')showDlg();
  hud(true);
}
