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
/* 교회 문: 지도에서 교회 입구(파란 아치)를 누르면 작은 카드가 떠서 열고 닫는다.
   닫혀 있는 동안에는 아치 위에 자물쇠 표시가 떠 있어 어디를 누르면 되는지 알 수 있다 */
var gatePopUntil=0;
function setGate(open){
  if(open===!!S.open)return;
  S.open=open;
  if(open){
    addLog('교회 문을 열었어요');sfx('gate_open',.8,0);toast('교회 문을 열었어요! 방문자가 찾아오기 시작해요',2400);
    F.push({x:ENT+.5,y:PZ-.5,z:1.6,t:2.4,d:2.4,text:'교회 문을 열었어요',col:'#ffe28a',big:1});
  }else{
    // 주차 구역에 있던 사람은 돌아가고, 부지 안에 있던 사람은 볼일을 마치고 나간다
    V.forEach(function(v){if(v.y>=PZ&&v.state!=='leave'&&v.state!=='inside')goLeave(v);});
    addLog('교회 문을 닫았어요');sfx('gate_close',.8,0);toast('교회 문을 닫았어요',1800);
  }
  save();hud(true);
}
function toggleGate(){setGate(!S.open);closeGatePop();}
function openGatePop(){gatePopUntil=performance.now()+7000;renderGatePop();syncGate();var b=$('#gpBtn');if(b)b.focus({preventScroll:true});}
function closeGatePop(){gatePopUntil=0;syncGate();}
function renderGatePop(){
  $('#gpT').textContent=S.open?'교회 문이 열려 있어요':'교회 문이 닫혀 있어요';
  $('#gpS').textContent=S.open?'닫으면 방문자가 오지 않고 주일 헌금이 크게 줄어요':'열어야 방문자가 들어오고 주일에 성도가 예배하러 와요';
  var b=$('#gpBtn');b.textContent=S.open?'문 닫기':'문 열기';b.className='btn '+(S.open?'bad':'pri');
}
// 화면의 (px,py)가 교회 입구 아치 위인지 (여유 10px)
function gateHit(px,py){
  var L=1e9,R=-1e9,T=1e9,B=-1e9;
  [[ENT-.1,PZ],[ENT+1.1,PZ]].forEach(function(p){[0,1.5].forEach(function(z){var r=rotPt(p[0],p[1]),q=toScreen(r[0],r[1],z);L=Math.min(L,q[0]);R=Math.max(R,q[0]);T=Math.min(T,q[1]);B=Math.max(B,q[1]);});});
  var pad=Math.max(10,14*cam.z);
  return px>=L-pad&&px<=R+pad&&py>=T-pad&&py<=B+pad;
}
// 카드를 아치 위에 붙인다 (매 프레임)
function syncGate(){
  var el=$('#gatePop');if(!el)return;
  var on=performance.now()<gatePopUntil&&!isPortrait();
  if(el.hidden===on)el.hidden=!on;
  if(!on)return;
  var p=rotPt(ENT+.5,PZ),q=toScreen(p[0],p[1],1.8),vw=window.innerWidth;
  var x=clamp(q[0],110,vw-110),y=Math.max(q[1],el.offsetHeight+60);
  el.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px) translate(-50%,-100%)';
}
/* ---------- 주일 정산 영수증 ---------- */
var rcptTimer=0;
function rcptLines(r){
  var L=[];
  if(r.closed)L.push(['온라인 헌금 (문 닫음)',r.online,'online']);else L.push(['주일 헌금 · 출석 '+r.attend+'명',r.offering,'offering']);
  if(r.visGive)L.push(['방문자 헌금',r.visGive,'visGive']);
  if(r.shop)L.push(['매장 판매',r.shop,'shop']);
  if(r.other)L.push(['그 밖의 수입',r.other,'other']);
  if(r.sponsor)L.push(['개척 후원',r.sponsor,'sponsor']);
  L.push(['운영비·유지비',-r.opex,'opex']);
  if(r.pay)L.push(['사례비',-r.pay,'pay']);
  if(r.supply)L.push(['매장 재료비',-r.supply,'supply']);
  if(r.loan)L.push(['대출 상환',-r.loan,'loan']);
  return L;
}
/* 재정 항목 설명: 무엇이 그 금액을 정했는지 (지난 주일 정산의 실제 숫자로) */
function pct(v){return Math.round(v*100)+'%';}
function rcptWhy(r,k){
  var x=r.x;if(!x)return '다음 주일 정산부터 계산 내역이 보여요.';
  var L=[];
  if(k==='offering'){
    L.push('출석 '+r.attend+'명 = 성도 '+x.m+'명 중 좌석('+x.seats+'석) 안에 든 '+x.full+'명'+(r.wxLost>0?' − 주일 날씨로 '+r.wxLost+'명 줄어듦':''));
    L.push('헌금 = 출석 × 9 × 만족도 보정 '+pct(0.4+0.6*x.mood/100)+' (만족도 '+x.mood+'%) × 사역 보정 '+pct(x.offerMod));
    L.push('출석이 많을수록 한 사람당 효과가 줄어요 (÷ '+(1+r.attend/500).toFixed(2)+')');
    L.push('늘리려면: 좌석(예배당), 만족도, 재정·목양 사역팀');
  }else if(k==='online'){L.push('교회 문을 닫은 주일에는 온라인 헌금만 들어와요: 성도 '+x.m+'명 × 1.2');L.push('문을 열면 주일 헌금으로 바뀌어요');}
  else if(k==='visGive'){L.push('이번 주 방문자 '+x.visits+'명 × 0.5 × 평판 보정 '+pct(0.5+x.rep/100)+' (평판 '+x.rep+')');}
  else if(k==='shop'){L.push('방문자가 주중에 매장(카페·식당·빵집·서점 등)에서 산 금액의 합계예요');L.push('이 중 '+pct(x.shopRate)+'는 팔 때마다 재료비로 바로 나가요');}
  else if(k==='other'){L.push('행사·특별 후원 등 매장 밖에서 주중에 들어온 돈이에요');}
  else if(k==='sponsor'){L.push('개척 초기 후원: 260 − 3.5 × 지난 주 수('+x.week+') — 주마다 줄어 약 75주 뒤 끝나요');}
  else if(k==='opex'){
    L.push('(기본 운영비 110 + 성도 '+x.m+'명 × 2.6 + 건물 유지비 '+fmt(x.up)+')');
    L.push('× 사역 보정 '+pct(x.upMod)+' (관리팀·행정·집사가 줄여 줘요) × 난이도 '+x.dn+' '+pct(x.dc));
    L.push('낡은 건물은 유지비가 최대 60%까지 늘어나요');
    if(x.upTop&&x.upTop.length)L.push('유지비가 큰 건물: '+x.upTop.map(function(o){return o.n+' '+fmt(o.u)+(o.w?' ('+WEAR_NAME[o.w]+')':'');}).join(', '));
  }
  else if(k==='pay'){L.push('사역팀 '+fmt(x.team)+' + 부교역자 '+fmt(x.assoc));L.push('행사 › 사역자 탭에서 단계를 낮추거나 사임시키면 줄어요');}
  else if(k==='supply'){L.push('매장 판매 '+fmt(r.shop)+' × '+pct(x.shopRate)+' — 판 만큼 재료를 다시 사 와요');}
  else if(k==='loan'){L.push((x.loans.length?x.loans.map(function(l){return l.n+' 주 '+fmt(l.p);}).join(', '):'대출 상환')+' (원금과 이자를 나눠 갚아요)');L.push('남은 원금은 아래에서 한 번에 갚을 수 있어요');}
  return L.map(function(t){return '<li>'+t+'</li>';}).join('');
}
// 합계에는 주중에 이미 들어온 매장 순수익이 들어 있다 → 정산 순간 자금이 얼마 변했는지 따로 알려 준다
function settleNote(r){
  if(r.settle==null||!r.pre)return '';
  return '<p class="rn">정산 때 자금 '+(r.settle<0?'−':'+')+fmt(Math.abs(r.settle))+' · 주중에 이미 번 '+(r.pre<0?'−':'+')+fmt(Math.abs(r.pre))+'은 포함돼 있어요</p>';
}
function rcptHtml(r,full){
  var wn=r.wx&&WEATHER[r.wx]?'<div class="rw">'+wxIcon(r.wx)+'주일 날씨 '+WEATHER[r.wx].n+(r.wxLost>0?' · 출석 '+r.wxLost+'명 줄었어요':'')+'</div>':'';
  return '<div class="rk">'+(Math.floor(r.w/52)+1)+'년 '+(r.w%52+1)+'주 · 주일 정산'+(full?' <small>· 항목을 누르면 계산 방식</small>':'')+'</div>'+wn+'<ul>'+rcptLines(r).map(function(l){
    var row='<span>'+l[0]+'</span><b class="'+(l[1]<0?'neg':'pos')+'">'+(l[1]<0?'−':'+')+fmt(Math.abs(l[1]))+'</b>';
    if(!full)return '<li>'+row+'</li>';
    var open=UI.fexp===l[2];
    return '<li class="rx'+(open?' open':'')+'"><button class="rxb" data-act="fexp" data-v="'+l[2]+'" aria-expanded="'+open+'">'+row+'</button>'+(open?'<ul class="rwhy">'+rcptWhy(r,l[2])+'</ul>':'')+'</li>';}).join('')+
    '<li class="tot"><span>합계</span><b class="'+(r.net<0?'neg':'pos')+'">'+(r.net<0?'−':'+')+fmt(Math.abs(r.net))+'</b></li></ul>'+settleNote(r)+(full?'':'<p class="rh">눌러서 재정 보기</p>');
}
function showReceipt(){
  var el=$('#rcpt');if(!el||!S.rcpt)return;
  // 주일 종소리와 동전 소리
  sfx('bell',.75,0);setTimeout(function(){sfx('coins',.6,0);},450);
  el.innerHTML=rcptHtml(S.rcpt,false);el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  clearTimeout(rcptTimer);rcptTimer=setTimeout(function(){el.hidden=true;},5000);
}
