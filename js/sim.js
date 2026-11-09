'use strict';
/* ---------- 시뮬레이션 ---------- */
function update(dt){
  if(S.over)return;
  S.clock+=dt;S.t+=dt;
  var evM=S.evt==='festival'?1.6:(S.evt==='rain'?0.5:1);
  var parkF=clamp((A.park+4)/(S.members*0.35+6),0.35,1);
  // 초반에도 마당이 비어 보이지 않게 방문자는 넉넉히, 대신 한 사람의 정착 확률은 낮게
  // 교회 문이 닫혀 있으면 아무도 오지 않는다. 주일에는 성도들이 예배하러 온다
  if(S.open){
    var rate=VIS_RATE*(0.4+S.rep/75)*(1+A.vis)*MOD.vis*parkF*evM+S.members*0.0008;
    S.spawnAcc+=rate*dt;
    while(S.spawnAcc>=1){S.spawnAcc-=1;if(V.length<60)spawnV(false);}
    if(isSunday()){
      S.memAcc+=Math.min(S.members,A.seats)*0.4/(WEEK/7)*dt;
      while(S.memAcc>=1){S.memAcc-=1;if(V.length<90)spawnV(true);}
    }
  }
  for(var i=0;i<V.length;i++)stepV(V[i],dt);
  V=V.filter(function(v){return !v.dead;});
  if(S.t>=WEEK){S.t-=WEEK;weekEnd();}
}
var VIS_RATE=0.32;
function isSunday(){return S.t>=WEEK*6/7;}
function dayIdx(){return Math.min(6,Math.floor(S.t/WEEK*7));}
function addLog(msg){S.log.unshift({w:S.week,msg:msg});if(S.log.length>10)S.log.length=10;}
/* 주일 정산 (주일이 끝날 때)
   수입: 주일 헌금(출석 × 만족도, 문을 닫았으면 온라인 헌금만) + 방문자 헌금 + 매장 수익(주중에 이미 들어옴) + 초기 후원(점점 줄어듦)
   지출: 운영비·유지비 + 사례비 + 대출 원리금
   지출: 기본 운영비 + 성도 수에 비례하는 사역비 + 건물 유지비 + 사역팀·부교역자 사례비
   성도: 기본 이탈(관리하지 않으면 줄어든다) + 불만·좌석 부족·목양 과부하 이탈, 만족이 높으면 소개로 조금 늘어남 */
function weekEnd(){
  recalc();
  var dc=curDiff(),mood=S.mood,m=S.members;
  var closed=!S.open,attend=closed?0:Math.min(m,A.seats);
  // 출석이 많을수록 한 사람당 헌금 효과는 줄어든다
  var offering=Math.round(attend*9*(0.4+0.6*mood/100)*MOD.offer/(1+attend/500));
  var online=closed?Math.round(m*1.2):0;
  var visGive=Math.round(S.visitsWeek*1.2*(0.5+S.rep/100));
  var sponsor=Math.round(Math.max(0,260-3.5*S.week));
  var opex=Math.round((110+m*2.6+A.up)*MOD.upkeep*dc.cost),pay=Math.round(teamPay()+assocPay());
  var loan=payLoans();
  var exp=opex+pay+loan,give=offering+online+visGive+sponsor;
  var inc=give+S.weekInc;
  S.money+=give-opex-pay-loan;
  S.hist.push({inc:inc,exp:exp});if(S.hist.length>12)S.hist.shift();
  S.posWeeks=inc-exp>0?S.posWeeks+1:0;
  S.rcpt={w:S.week,closed:closed,attend:attend,offering:offering,online:online,visGive:visGive,shop:Math.round(S.weekShop),other:Math.round(S.weekInc-S.weekShop),sponsor:sponsor,opex:opex,pay:pay,loan:loan,net:Math.round(inc-exp)};
  if(closed)S.tempMood-=6;
  var msg=closed?'문을 닫은 주일 · 온라인 헌금 +'+fmt(online):'주일예배 · 출석 '+attend+'명 · 헌금 +'+fmt(offering)+(S.weekShop?' · 매장 +'+fmt(S.weekShop):'')+' · 지출 −'+fmt(exp);
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
  S.weekInc=0;S.weekShop=0;S.visitsWeek=0;S.joinedWeek=0;S.week++;
  // 일시 만족·행사·쿨다운·노후·직분 정리
  S.tempMood=Math.abs(S.tempMood)<0.5?0:S.tempMood*0.5;
  for(var id in S.ev){var st=S.ev[id];if(st.left>0)st.left--;if(st.cd>0)st.cd--;}
  decayWeek();
  for(var k in OFFICE){var mx=officeMax(k);if(S.off[k]>mx){addLog('성도가 줄어 '+OFFICE[k].name+' '+(S.off[k]-mx)+'명이 직분을 내려놓았어요');S.off[k]=mx;}}
  if(S.week-S.candWeek>=6)refreshCands();
  var ev='';
  if(S.evtLeft>0){S.evtLeft--;if(S.evtLeft===0)S.evt=null;}
  else if(Math.random()<0.14){
    var r=Math.random();
    if(r<0.25){S.evt='rain';S.evtLeft=2;ev='장마철입니다. 2주간 방문자가 줄어요.';}
    else if(r<0.5){S.evt='festival';S.evtLeft=2;ev='동네 축제가 열렸어요. 2주간 거리가 북적여요.';}
    else if(r<0.75){S.money+=400;ev='익명의 감사 헌금 400이 들어왔어요.';}
    else{S.money-=250;ev='난방 설비 수리비 250이 나갔어요.';}
  }
  addLog(msg);
  if(ev){addLog(ev);toast(ev,4200);}
  if(typeof showReceipt==='function')showReceipt();
  rollDilemma();
  recalc();
  checkGoal();
  recalc();
  if(S.money<-1500){S.over=true;showOver();}
  save();
  if(!UI.fold&&(UI.tab==='status'||UI.tab==='finance'||UI.tab==='staff'||UI.tab==='events'))renderPanel();
  if(S.dlg&&typeof showDlg==='function')showDlg();
  hud(true);
}
