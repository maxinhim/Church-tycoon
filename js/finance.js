'use strict';
/* ---------- 재정: 교회 문 열기, 대출, 주일 정산 영수증 ----------
   교회 문: 처음엔 닫혀 있다. 열어야 방문자가 오고 주일에 성도가 예배하러 온다.
   닫으면 방문자가 오지 않고, 주일 헌금은 온라인 헌금 정도만 들어오며 만족도가 떨어진다 (공사·정리용).
   대출: 상품마다 금액·기간·주 이율이 정해져 있고, 매주 주일 정산 때 원리금을 균등하게 갚는다.
   남은 원금은 언제든 한 번에 갚을 수 있다. 빚 합계는 신용 한도(성도·평판에 따라)를 넘을 수 없다. */
var LOANS={
  small:{name:'소액 대출',amt:3000,weeks:16,rate:.006,desc:'급한 운영비를 메울 때'},
  mid:{name:'운영 자금 대출',amt:8000,weeks:30,rate:.005,desc:'건물 여러 채를 한꺼번에 지을 때'},
  big:{name:'건축 대출',amt:20000,weeks:52,rate:.004,goal:2,desc:'큰 예배당을 지을 때'}
};
var gateAsk=-1e9;
function loanPayment(p,r,n){return Math.ceil(p*r/(1-Math.pow(1+r,-n)));}
function debt(){return (S.loans||[]).reduce(function(t,l){return t+l.bal;},0);}
function creditLimit(){return Math.round((4000+S.members*90+S.rep*60)*(S.diff==='hard'?0.7:1)/100)*100;}
function loanBlock(k){
  var L=LOANS[k];
  if(L.goal&&S.goal<L.goal)return lockText(L.goal)+' 받을 수 있어요';
  if(S.loans.length>=3)return '대출은 3건까지 받을 수 있어요';
  if(debt()+L.amt>creditLimit())return '신용 한도('+fmt(creditLimit())+')를 넘어요';
  return '';
}
function borrow(k){
  var why=loanBlock(k);if(why)return why;
  var L=LOANS[k];
  S.money+=L.amt;
  S.loans.push({k:k,bal:L.amt,pay:loanPayment(L.amt,L.rate,L.weeks),rate:L.rate,left:L.weeks});
  addLog(L.name+' '+fmt(L.amt)+'을 받았어요');save();return '';
}
// 주일 정산 때: 이자를 붙이고 정해진 금액을 갚는다. 마지막 주에는 남은 것을 모두 갚는다
function payLoans(){
  var t=0;
  S.loans.forEach(function(l){
    var it=l.bal*l.rate,pay=Math.min(l.pay,Math.ceil(l.bal+it));
    l.bal=Math.max(0,l.bal+it-pay);l.left--;t+=pay;
    if(l.left<=0&&l.bal>0){t+=Math.ceil(l.bal);l.bal=0;}
  });
  S.loans=S.loans.filter(function(l){return l.bal>0.5;});
  return t;
}
function repayLoan(i){
  var l=S.loans[i];if(!l)return '갚을 대출이 없어요';
  var amt=Math.ceil(l.bal);if(S.money<amt)return '자금이 부족해요 ('+fmt(amt)+' 필요)';
  S.money-=amt;S.loans.splice(i,1);addLog(LOANS[l.k].name+'을 모두 갚았어요');save();return '';
}
function toggleGate(){
  if(!S.open){
    S.open=true;gateAsk=-1e9;addLog('교회 문을 열었어요');
    toast('교회 문을 열었어요! 방문자가 찾아오기 시작해요',2400);
    F.push({x:ENT+.5,y:PZ-.5,z:1.6,t:2.4,d:2.4,text:'교회 문을 열었어요',col:'#ffe28a',big:1});
    save();hud(true);return;
  }
  var now=performance.now();
  if(now-gateAsk>3000){gateAsk=now;toast('닫으면 방문자가 오지 않고 주일 헌금이 크게 줄어요. 한 번 더 누르면 닫혀요',3000);syncGate();return;}
  gateAsk=-1e9;S.open=false;
  // 주차 구역에 있던 사람은 돌아가고, 부지 안에 있던 사람은 볼일을 마치고 나간다
  V.forEach(function(v){if(v.y>=PZ&&v.state!=='leave'&&v.state!=='inside')goLeave(v);});
  addLog('교회 문을 닫았어요');toast('교회 문을 닫았어요',1800);save();hud(true);
}
// 교회 입구 위에 붙는 문 열기·닫기 버튼 (매 프레임 위치를 맞춘다)
function syncGate(){
  var el=$('#gateBtn');if(!el)return;
  var p=rotPt(ENT+.5,PZ),q=toScreen(p[0],p[1],1.75),vw=window.innerWidth,vh=window.innerHeight;
  var off=q[0]<-40||q[1]<-40||q[0]>vw+40||q[1]>vh+40;
  el.hidden=off;if(off)return;
  var asking=S.open&&performance.now()-gateAsk<3000;
  var cls=S.open?(asking?'gate ask':'gate on'):'gate off',txt=S.open?(asking?'한 번 더 누르면 닫혀요':'교회 문 열림'):'교회 문 열기';
  if(el.className!==cls){el.className=cls;}
  if(el.dataset.t!==txt){el.dataset.t=txt;el.querySelector('span').textContent=txt;el.setAttribute('aria-label',S.open?'교회 문 닫기':'교회 문 열기: 열어야 방문자가 들어와요');}
  el.style.transform='translate('+Math.round(q[0])+'px,'+Math.round(q[1])+'px) translate(-50%,-100%)';
}
/* ---------- 주일 정산 영수증 ---------- */
var rcptTimer=0;
function rcptLines(r){
  var L=[];
  if(r.closed)L.push(['온라인 헌금 (문 닫음)',r.online]);else L.push(['주일 헌금 · 출석 '+r.attend+'명',r.offering]);
  if(r.visGive)L.push(['방문자 헌금',r.visGive]);
  if(r.shop)L.push(['매장 수익',r.shop]);
  if(r.other)L.push(['그 밖의 수입',r.other]);
  if(r.sponsor)L.push(['개척 후원',r.sponsor]);
  L.push(['운영비·유지비',-r.opex]);
  if(r.pay)L.push(['사례비',-r.pay]);
  if(r.loan)L.push(['대출 상환',-r.loan]);
  return L;
}
function rcptHtml(r,full){
  return '<div class="rk">'+(Math.floor(r.w/52)+1)+'년 '+(r.w%52+1)+'주 · 주일 정산</div><ul>'+rcptLines(r).map(function(l){
    return '<li><span>'+l[0]+'</span><b class="'+(l[1]<0?'neg':'pos')+'">'+(l[1]<0?'−':'+')+fmt(Math.abs(l[1]))+'</b></li>';}).join('')+
    '<li class="tot"><span>합계</span><b class="'+(r.net<0?'neg':'pos')+'">'+(r.net<0?'−':'+')+fmt(Math.abs(r.net))+'</b></li></ul>'+(full?'':'<p class="rh">눌러서 재정 보기</p>');
}
function showReceipt(){
  var el=$('#rcpt');if(!el||!S.rcpt)return;
  el.innerHTML=rcptHtml(S.rcpt,false);el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  clearTimeout(rcptTimer);rcptTimer=setTimeout(function(){el.hidden=true;},5000);
}
