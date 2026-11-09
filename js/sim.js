'use strict';
/* ---------- 시뮬레이션 ---------- */
function update(dt){
  if(S.over)return;
  S.clock+=dt;S.t+=dt;
  wxTick(dt);
  var evM=(S.evt==='festival'?1.6:1)*WEATHER[wxNow()].vis;
  var parkF=clamp((A.park+4)/(S.members*0.35+6),0.35,1);
  // 초반에도 마당이 비어 보이지 않게 방문자는 넉넉히, 대신 한 사람의 정착 확률은 낮게
  // 교회 문이 닫혀 있으면 아무도 오지 않는다. 주일에는 성도들이 예배하러 온다
  if(S.open){
    var rate=VIS_RATE*(0.4+S.rep/75)*(1+A.vis)*MOD.vis*parkF*evM+S.members*0.0003;
    S.spawnAcc+=rate*dt;
    while(S.spawnAcc>=1){S.spawnAcc-=1;if(V.length<70)spawnV(false);}
    if(isSunday()){
      S.memAcc+=Math.min(S.members,A.seats)*0.25/(WEEK/7)*dt;
      while(S.memAcc>=1){S.memAcc-=1;if(V.length<90)spawnV(true);}
    }
  }
  for(var i=0;i<V.length;i++)stepV(V[i],dt);
  // 목표는 주중에도 이루는 즉시 보상 (0.5초마다 확인)
  S.goalAcc=(S.goalAcc||0)+dt;if(S.goalAcc>=.5){S.goalAcc=0;checkGoal();}
  V=V.filter(function(v){return !v.dead;});
  if(S.t>=WEEK){S.t-=WEEK;weekEnd();}
}
// 한 주 48초 기준. 자금 걱정보다 짓고 꾸미는 재미에 집중하도록 수입을 넉넉하게:
// 매장은 한 번 살 때 8배(SHOP_K), 재료비는 판매액의 25%. 헌금은 출석 한 명당 30, 방문자 한 명당 3, 개척 후원은 600에서 주마다 6씩 줄어든다
var MOOD_LEAVE=45,MOOD_GAIN=50;
var VIS_RATE=0.6,SHOP_COST=0.25,SHOP_K=8,OFFER_PER=30,VIS_GIVE=3,SPONSOR0=600,SPONSOR_DROP=6;
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
  // 주일 날씨(비·눈·폭우)에 따라 출석이 줄어든다
  var closed=!S.open,full=closed?0:Math.min(m,A.seats),attend=Math.round(full*wxAttend()),wxLost=full-attend;
  // 출석이 많을수록 한 사람당 헌금 효과는 줄어든다
  var offering=Math.round(attend*OFFER_PER*(0.4+0.6*mood/100)*MOD.offer/(1+attend/500));
  var online=closed?Math.round(m*1.2):0;
  var visGive=Math.round(S.visitsWeek*VIS_GIVE*(0.5+S.rep/100));
  var sponsor=Math.round(Math.max(0,SPONSOR0-SPONSOR_DROP*S.week));
  var opex=Math.round((110+m*2.6+A.up)*MOD.upkeep*dc.cost),pay=Math.round(teamPay()+assocPay());
  // 재정 화면에서 항목마다 어떻게 계산됐는지 보여 주려고 계산 재료를 함께 남긴다
  var loanList=S.loans.map(function(l){return {n:LOANS[l.k].name,p:Math.round(l.pay)};});
  var upTop=S.buildings.map(function(b){var d=defOf(b),u=d.up*(maintainable(b)?1+0.6*(100-condOf(b))/100:1);return {n:d.name,u:u,w:wearStage(b)};})
    .filter(function(o){return o.u>0;}).sort(function(a,b){return b.u-a.u;}).slice(0,3);
  var X={m:m,seats:Math.round(A.seats),full:full,mood:Math.round(mood),offerMod:MOD.offer,visits:S.visitsWeek,rep:Math.round(S.rep),week:S.week,
    up:Math.round(A.up),upMod:MOD.upkeep,dc:dc.cost,dn:dc.name,team:Math.round(teamPay()),assoc:Math.round(assocPay()),upTop:upTop,loans:loanList,shopRate:SHOP_COST};
  var loan=payLoans();
  // 매장 재료비는 팔 때마다 바로 나갔다(S.weekSup). 정산 때는 나머지만 오간다
  var supply=S.weekSup||0;
  var exp=opex+pay+loan+supply,give=offering+online+visGive+sponsor;
  var inc=give+S.weekInc;
  var settle=give-opex-pay-loan,pre=S.weekInc-supply;
  S.money+=settle;
  S.hist.push({inc:inc,exp:exp});if(S.hist.length>12)S.hist.shift();
  S.posWeeks=inc-exp>0?S.posWeeks+1:0;
  S.rcpt={w:S.week,closed:closed,attend:attend,offering:offering,online:online,visGive:visGive,shop:Math.round(S.weekShop),other:Math.round(S.weekInc-S.weekShop),sponsor:sponsor,opex:opex,pay:pay,loan:loan,supply:supply,wx:wxNow(),wxLost:wxLost,net:Math.round(inc-exp),settle:Math.round(settle),pre:Math.round(pre),x:X};
  if(closed)S.tempMood-=6;
  var msg=closed?'문을 닫은 주일 · 온라인 헌금 +'+fmt(online):'주일예배 · 출석 '+attend+'명 · 헌금 +'+fmt(offering)+(S.weekShop?' · 매장 +'+fmt(S.weekShop):'')+' · 지출 −'+fmt(exp);
  var churn=m*0.012;
  // 만족도 45 아래면 떠나는 성도가 늘고, 50 위면 소개로 새 성도가 온다
  if(mood<MOOD_LEAVE)churn+=m*0.07*(MOOD_LEAVE-mood)/MOOD_LEAVE;
  churn+=m*m/50000;
  churn*=MOD.loss*dc.churn;
  if(m>A.seats)churn+=(m-A.seats)*0.3;
  if(m>MOD.cap)churn+=(m-MOD.cap)*0.1;
  var lose=Math.floor(churn+Math.random());
  var gain=mood>=MOOD_GAIN?Math.floor(m*0.02*(mood-MOOD_GAIN)/(100-MOOD_GAIN)/(1+m/300)+Math.random()*0.8):0;
  S.members=Math.max(0,m-lose+gain);
  if(lose>gain)msg+=' · 성도 '+(lose-gain)+'명이 떠났어요';
  // 평판: 40을 넘으면 넘은 만큼 빨리 식는다. 봉사·선교·행사·미디어로 꾸준히 채워야 80을 지킨다
  S.rep=clamp(S.rep+A.rep+MOD.rep+(mood-60)*0.02-(S.rep>40?(S.rep-40)*0.08:0),0,100);
  S.weekInc=0;S.weekShop=0;S.weekSup=0;S.visitsWeek=0;S.joinedWeek=0;S.week++;
  // 일시 만족·행사·쿨다운·노후·직분 정리
  S.tempMood=Math.abs(S.tempMood)<0.5?0:S.tempMood*0.5;
  for(var id in S.ev){var st=S.ev[id];if(st.left>0)st.left--;if(st.cd>0)st.cd--;}
  decayWeek();trafWeek();gripeWeek();S.fresh=(S.fresh||0)*FRESH_DECAY;
  for(var k in OFFICE){var mx=officeMax(k);if(S.off[k]>mx){addLog('성도가 줄어 '+OFFICE[k].name+' '+(S.off[k]-mx)+'명이 직분을 내려놓았어요');S.off[k]=mx;}}
  if(S.week-S.candWeek>=6)refreshCands();
  var ev='';
  if(S.evtLeft>0){S.evtLeft--;if(S.evtLeft===0)S.evt=null;}
  else if(Math.random()<0.14){
    var r=Math.random();
    if(r<0.4){S.evt='festival';S.evtLeft=2;ev='동네 축제가 열렸어요. 2주간 거리가 북적여요.';}
    else if(r<0.72){S.money+=400;ev='익명의 감사 헌금 400이 들어왔어요.';}
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
