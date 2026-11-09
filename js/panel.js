'use strict';
/* ---------- 하단 패널 ---------- */
var panel;
// 건축 카드에 미리 보여 줄 효과 두 가지 (지을 때 건물 위에 뜨는 글씨와 같은 말)
function effTags(d){
  var t=[];
  if(d.seats)t.push('좌석 +'+d.seats);
  if(d.fcap)t.push('교제 +'+d.fcap);
  if(d.kcap)t.push('돌봄 +'+d.kcap);
  if(d.ccap)t.push('편의 +'+d.ccap);
  if(d.park)t.push('주차 +'+d.park);
  if(d.vis)t.push('방문자 +'+Math.round(d.vis*100)+'%');
  if(d.rep&&t.length<2)t.push('평판 ↑');
  if(d.beauty&&t.length<2)t.push(d.beauty>=1?'분위기 +'+d.beauty:'분위기 ↑');
  if(d.fill&&t.length<2){var bn=null;for(var n in d.fill)if(!bn||d.fill[n]>d.fill[bn])bn=n;t.push(NK[bn]+' +'+d.fill[bn]);}
  if(d.income&&t.length<2)t.push('판매 ~'+d.income);
  return t.slice(0,2);
}
function effText(d){
  var p=[];
  if(d.seats)p.push('좌석 +'+d.seats);
  if(d.park)p.push('주차 +'+d.park);
  if(d.fcap)p.push('교제 수용 +'+d.fcap);
  if(d.kcap)p.push('돌봄 수용 +'+d.kcap);
  if(d.ccap)p.push('편의 수용 +'+d.ccap);
  if(d.fill){for(var n in d.fill)p.push('방문자 '+NK[n]+' +'+d.fill[n]);}
  if(d.beauty)p.push('분위기 +'+d.beauty);
  if(d.vis)p.push('방문자 +'+Math.round(d.vis*100)+'%');
  if(d.income)p.push('한 번 팔 때 약 '+d.income);
  p.push('유지비 '+d.up+'/주');
  return p.join(' · ');
}
/* 기능 패널: 동그란 버튼(건축·행사·현황)과 상단 메뉴 버튼으로 연다.
   '행사' 버튼 안에는 행사·사역자 두 탭이 있다 */
var GROUP_TITLE={build:'건축',minis:'행사',status:'현황',menu:'메뉴'};
var SUBTABS={minis:[['events','행사'],['staff','사역자']],status:[['status','현황'],['finance','재정']]};
function tabGroup(t){return (t==='staff'||t==='events')?'minis':(t==='finance'?'status':t);}
function openGroup(g){
  UI.lastBuilt=null;
  // 지도에서 짓는 중에 건축 버튼을 누르면 짓기를 그만두고 목록으로
  if(g==='build'&&isPlacing()){endPlace();return;}
  if(!UI.fold&&tabGroup(UI.tab)===g){closeDock();return;}
  // 건축이 아닌 패널로 옮기면 짓던 것(미리보기)은 취소한다
  if(g!=='build'){UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];}
  UI.sel=null;UI.selPiece=null;UI.selTile=null;
  UI.tab=g==='minis'?(UI.minisTab||'events'):(g==='status'?(UI.statusTab||'status'):g);UI.fold=false;UI.confirmNew=false;
  renderPanel();
}
// 닫으면 짓던 것도 함께 취소한다 (미리보기만 지도에 남지 않게)
function closeDock(){
  UI.fold=true;UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.sel=null;UI.selPiece=null;UI.confirmNew=false;UI.lastBuilt=null;
  renderPanel();
}
function renderPanel(){
  panel=$('#panel');
  var dock=$('#dock');
  // 지도에서 짓는 동안은 패널을 닫고 아래 작은 띠만 보인다
  dock.hidden=UI.fold||isPlacing();syncTabs();renderPbar();renderSelCard();
  if(dock.hidden)return;
  var t=UI.tab,g=tabGroup(t);
  $('#dtitle').textContent=GROUP_TITLE[g];
  $('#subtabs').innerHTML=SUBTABS[g]?SUBTABS[g].map(function(s){return '<button role="tab" data-act="subtab" data-v="'+s[0]+'" aria-selected="'+(t===s[0])+'" class="'+(t===s[0]?'on':'')+'">'+s[1]+'</button>';}).join(''):'';
  panel.className=(t==='build')?'build':'scroll';
  if(t==='build')renderBuild();else if(t==='finance')renderFinance();else if(t==='staff')renderStaff();else if(t==='events')renderEvents();else if(t==='status')renderStatus();else renderMenu();
}
function renderBuild(){
  var chips=CATS.map(function(c){return '<button class="chip'+(UI.cat===c[0]&&UI.tool!=='demolish'?' on':'')+'" data-act="cat" data-v="'+c[0]+'">'+c[1]+'</button>';}).join('')+
    '<button class="chip warn'+(UI.tool==='demolish'?' on':'')+'" data-act="dem">철거</button>';
  panel.innerHTML='<div class="chips">'+chips+'</div><div class="cards" id="cards"></div><div class="detail" id="detail"></div>';
  var cards=$('#cards');
  if(UI.tool==='demolish'){cards.innerHTML='<p class="hint">철거할 건물을 지도에서 누르세요. 건축비의 절반이 돌아옵니다.</p>';}
  else{
    DEFS.filter(function(d){return d.cat===UI.cat;}).forEach(function(d){
      var el=document.createElement('button');el.className='card';el.dataset.act='pick';el.dataset.v=d.id;
      el.appendChild(iconCanvas(d));
      var lk=isLocked(d.id);if(lk)el.classList.add('lock');
      var tg=effTags(d);
      el.setAttribute('aria-label',d.name+', '+(lk?'잠김':fmt(d.cost))+'. '+effText(d));
      el.insertAdjacentHTML('beforeend','<span class="nm">'+d.name+'</span><span class="pr">'+(lk?'목표 '+lockGoal(d.id)+'개 후':fmt(d.cost)+(d.up?'<small> · 주 '+d.up+'</small>':''))+'</span>'+
        '<span class="ef">'+(tg.length?tg.map(function(x){return '<i>'+x+'</i>';}).join(''):'<i>'+(d.short||'')+'</i>')+'</span>');
      cards.appendChild(el);
    });
  }
  refreshCards();renderDetail();
}
function refreshCards(){
  var cs=document.querySelectorAll('#cards .card');
  for(var i=0;i<cs.length;i++){var d=D[cs[i].dataset.v];if(!d)continue;cs[i].classList.toggle('poor',S.money<d.cost||isLocked(d.id));cs[i].classList.toggle('sel',UI.tool===d.id);}
}
function segBtns(act,val,items,off){
  return '<div class="seg">'+items.map(function(it){var on=String(val)===String(it[0]);return '<button class="btn'+(on?' on':'')+'" data-act="'+act+'" data-v="'+it[0]+'" aria-pressed="'+on+'"'+(off?' disabled':'')+'>'+it[1]+'</button>';}).join('')+'</div>';
}
function bad(t){return '<span style="color:var(--bad)">'+t+'</span>';}
function renderDetail(){
  renderSelCard();
  if(isPlacing()){renderPbar();return;}
  var el=$('#detail');if(!el)return;
  var h='<div class="tx">'+(UI.tool==='demolish'?'철거할 건물이나 길을 누르면 지도 위 카드에 철거 버튼이 나와요.':'지을 것을 고르면 지도에 미리보기가 놓여요. 지은 건물을 누르면 지도 위 작은 카드에서 옮기기·돌리기, 입구·출구, 철거를 할 수 있어요.')+'</div>';
  el.innerHTML=h;
}
function stars(n){return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);}
function meter(v){var p=Math.round(clamp(v,0,1)*100);return '<div class="bar"><i style="width:'+p+'%;background:'+(p<30?'var(--bad)':p<60?'var(--gold)':'var(--good)')+'"></i></div>';}
function srow(title,meta,desc,btns,extra){
  return '<div class="srow"><div class="tx"><b>'+title+'</b> <span class="meta">'+meta+'</span><p>'+desc+'</p>'+(extra||'')+'</div><div class="btns">'+btns+'</div></div>';
}
function renderStaff(){
  var h='<div class="staff"><div class="sec">목양</div>';
  h+=srow('목양 수용력',S.members+' / '+Math.round(MOD.cap)+'명','담임목사·부교역자·직분자·돌봄팀이 함께 돌볼 수 있는 성도 수예요. 넘으면 그만큼 성도가 떠나요.','',meter(MOD.cap/Math.max(1,S.members)));
  h+='<div class="sec">부교역자 · '+S.assoc.length+' / '+assocSlots()+'명</div>';
  if(!S.assoc.length)h+='<p class="hint">아직 함께 사역하는 부교역자가 없어요. 성도 50명마다 한 명씩 더 청빙할 수 있어요.</p>';
  S.assoc.forEach(function(a,i){
    h+=srow(a.name+' '+a.title,FIELDS[a.field].name+' '+stars(a.skill)+' · 사례비 주 '+a.pay,FIELDS[a.field].desc+' (별마다), 목양 수용력 +35','<button class="btn" data-act="dismiss" data-v="'+i+'">사임</button>');
  });
  h+='<p class="hint">청빙 후보 · 6주마다 새 후보가 찾아와요. 청빙 비용은 사례비 4주치예요.</p>';
  S.cands.forEach(function(c,i){
    var full=S.assoc.length>=assocSlots();
    h+=srow(c.name+' '+c.title+' 후보',FIELDS[c.field].name+' '+stars(c.skill)+' · 사례비 주 '+c.pay,FIELDS[c.field].desc+' (별마다)',
      '<button class="btn pri" data-act="hireA" data-v="'+i+'"'+(full||S.money<c.fee?' disabled':'')+'>'+(full?'자리 없음':'청빙 '+fmt(c.fee))+'</button>');
  });
  h+='<div class="btns"><button class="btn" data-act="searchA"'+(S.money<100?' disabled':'')+'>다른 후보 찾기 · 100</button></div>';
  h+='<div class="sec">직분자 임명 · 모두 '+offTotal()+'명</div>';
  Object.keys(OFFICE).forEach(function(k){
    var o=OFFICE[k],mx=officeMax(k),lk=o.goal>S.goal;
    h+=srow(o.name,S.off[k]+' / '+mx+'명 · 성도 '+o.per+'명마다 한 명',o.desc+'. 임직식 비용 '+fmt(o.cost),
      lk?'<button class="btn" disabled>'+lockText(o.goal)+'</button>':'<button class="btn pri" data-act="appoint" data-v="'+k+'"'+(S.off[k]>=mx||S.money<o.cost?' disabled':'')+'>임명</button>');
  });
  h+='<div class="sec">사역팀 · 주 '+fmt(teamPay())+'</div>';
  Object.keys(STAFF).forEach(function(k){
    var t=STAFF[k],lv=S.staff[k]||0,lk=(t.goal||0)>S.goal,next=t.costs[lv];
    var btn=lk?'<button class="btn" disabled>'+lockText(t.goal)+'</button>':
      (lv>0?'<button class="btn" data-act="fire" data-v="'+k+'" aria-label="'+t.name+' 축소">−</button>':'')+
      (lv<3?'<button class="btn pri" data-act="hire" data-v="'+k+'"'+(S.money<next?' disabled':'')+'>'+fmt(next)+'</button>':'<button class="btn" disabled>최대</button>');
    h+=srow(t.name,'단계 '+lv+'/3 · 주 '+t.week*lv,t.desc,btn,'<div class="pips">'+[0,1,2].map(function(i){return '<i class="'+(i<lv?'on':'')+'"></i>';}).join('')+'</div>');
  });
  h+='</div>';
  panel.innerHTML=h;
}
function renderEvents(){
  var act=activeEvents().filter(function(id){return !EVENTS[id].hidden;});
  var h='<div class="staff"><p class="hint">행사는 자금을 쓰고, 한 번 열면 정해진 주가 지나야 다시 열 수 있어요. 오래 열지 않으면 공동체가 침체돼요. 올해 '+weekOfYear()+'주째예요.</p>';
  if(act.length)h+='<div class="qev">'+act.map(function(id){return '<span>진행 중 · '+EVENTS[id].name+' '+S.ev[id].left+'주</span>';}).join('')+'</div>';
  Object.keys(EVENTS).forEach(function(id){
    var e=EVENTS[id];if(e.hidden)return;
    var why=evBlock(id),meta='비용 '+fmt(evCost(e))+(e.season?' · '+e.season[0]+'~'+e.season[1]+'주':'')+(e.cd?' · 열면 '+e.cd+'주 뒤 다시':'');
    h+=srow(e.name,meta,e.desc+(why?'<br>'+bad(why):''),'<button class="btn pri" data-act="runEv" data-v="'+id+'"'+(why?' disabled':'')+'>열기</button>');
  });
  h+='</div>';
  panel.innerHTML=h;
}

function renderStatus(){
  var c=S.cov||{},rows=[['좌석',c.seat],['교제 공간',c.fel],['돌봄',c.care],['편의',c.comf],['주차',c.park],['목양',c.past]];
  var h=statusSummary()+'<div class="sec">성도 만족도</div><div class="cov"><span>전체</span><div class="bar"><i style="width:'+Math.round(S.mood)+'%"></i></div><span class="v">'+Math.round(S.mood)+'%</span>';
  rows.forEach(function(r){var v=Math.round((r[1]||0)*100);h+='<span>'+r[0]+'</span><div class="bar"><i style="width:'+v+'%;background:'+(v<60?'var(--bad)':'var(--good)')+'"></i></div><span class="v">'+v+'%</span>';});
  h+='</div><div class="sec">이번 주</div><div class="legend"><span>지금 교회 마당에 '+V.length+'명</span><span>이번 주 방문 '+S.visitsWeek+'</span><span>새 성도 '+S.joinedWeek+'</span></div>';
  h+='<div class="legend" style="margin-top:6px">'+NEEDS.map(function(n){return '<span><i style="background:'+NC[n]+'"></i>'+NK[n]+'</span>';}).join('')+'<span>머리 위 점은 방문자가 찾는 것</span></div>';
  var rp=needRepair(),rc=rp.reduce(function(t,b){return t+repairCost(b);},0);
  if(rp.length)h+='<div class="btns"><button class="btn pri" data-act="repairAll"'+(S.money<rc?' disabled':'')+'>낡은 건물 '+rp.length+'곳 모두 수리 · '+fmt(rc)+'</button></div>';
  h+='<div class="sec">주간 수입과 지출</div>'+chart();
  h+='<div class="sec">소식</div><ul class="log">'+(S.log.length?S.log.map(function(l){return '<li>'+(Math.floor(l.w/52)+1)+'년차 '+(l.w%52+1)+'주 · '+l.msg+'</li>';}).join(''):'<li>아직 소식이 없어요. 한 주가 지나면 기록됩니다.</li>')+'</ul>';
  panel.innerHTML=h;
}
function chart(){
  var hs=S.hist;
  if(!hs.length)return '<p class="hint" style="padding:2px 0">첫 주일이 지나면 표시됩니다.</p>';
  var W=300,H=96,pad=18,mx=1;
  hs.forEach(function(x){mx=Math.max(mx,x.inc,x.exp);});
  var bw=(W-pad)/Math.max(hs.length,6),svg='<svg viewBox="0 0 '+W+' '+(H+14)+'" width="100%" role="img" aria-label="주간 수입과 지출 막대그래프">';
  svg+='<line x1="'+pad+'" y1="'+H+'" x2="'+W+'" y2="'+H+'" stroke="var(--line)"/><text x="0" y="10" font-size="9">'+fmt(mx)+'</text><text x="0" y="'+H+'" font-size="9">0</text>';
  hs.forEach(function(x,i){
    var x0=pad+i*bw+bw*0.1,w=bw*0.38,hi=x.inc/mx*(H-14),he=x.exp/mx*(H-14);
    svg+='<rect x="'+x0.toFixed(1)+'" y="'+(H-hi).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+hi.toFixed(1)+'" fill="var(--accent)"/>';
    svg+='<rect x="'+(x0+w+1).toFixed(1)+'" y="'+(H-he).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+he.toFixed(1)+'" fill="var(--muted)" opacity=".55"/>';
  });
  svg+='<text x="'+pad+'" y="'+(H+11)+'" font-size="9">파랑 수입 · 회색 지출 (최근 '+hs.length+'주)</text></svg>';
  return svg;
}
function renderMenu(){
  panel.innerHTML='<div class="field"><label for="churchName">교회 이름</label><input id="churchName" maxlength="14" value="'+S.name.replace(/"/g,'&quot;')+'"></div>'+
    (UI.confirmNew?'<div class="sec">난이도를 고르면 처음부터 시작해요 (지금 진행은 사라져요)</div><div class="diffs">'+Object.keys(DIFF).map(function(k){return '<button class="btn'+(k==='normal'?' pri':'')+'" data-act="newgame" data-v="'+k+'"><b>'+DIFF[k].name+'</b><small>'+DIFF[k].desc+'</small></button>';}).join('')+'<button class="btn" data-act="newgame">취소</button></div>':
      '<div class="btns"><button class="btn" data-act="newgame">새로 시작</button></div>')+'<p class="hint">지금 난이도: '+curDiff().name+'</p>'+
    '<div class="sec">조작법</div><ul class="how"><li>한 손가락으로 끌기: 지도 이동</li><li>두 손가락 벌리기·오므리기: 확대·축소 (PC는 마우스 휠)</li><li>오른쪽 회전 버튼: 90°씩 시점 회전</li><li>교회 문: 처음엔 닫혀 있고 입구(파란 아치)에 자물쇠가 떠 있어요. 입구를 누르면 문 열기·닫기 카드가 떠요. 닫으면 방문자가 오지 않고 주일 헌금이 크게 줄어요</li><li>방문자는 바닥 타일·길·계단·다리 위로만 걸어요. 새 건물은 입구까지 바닥을 깔거나, 건물을 눌러 \'입구까지 길 잇기\'를 쓰세요</li><li>도로 위 4줄은 주차 구역이에요. 주차장·주차 타워는 그곳에만, 그곳엔 주차장만 지을 수 있어요</li><li>매장(카페·식당·빵집·서점·나눔장터 등)은 방문자가 물건을 사면 수익이 생겨요 (건물 위 금색 숫자)</li><li>오른쪽 위 시계: 한 주는 4분(하루 약 34초), 주일이 끝나면 주간 정산 영수증이 떠요. 현황 › 재정에서 내역과 대출을 볼 수 있어요. 톱니바퀴에서 8배속까지 고를 수 있어요</li><li>날씨: 시계에 오늘·내일 날씨가 보이고, 누르면 효과를 알려 줘요. 비엔 야외 자리가 쉬고 실내 매장이 붐벼요. 폭우엔 벼락이 치니 십자가 첨탑(피뢰침)을 세우세요. 겨울엔 눈, 여름엔 폭염(물가 장식이 있으면 덜 지쳐요). 비가 그치면 무지개가 뜨기도 해요. 주일에 비·눈이 오면 출석이 줄어요(주차장이 넉넉하면 덜 줄어요)</li><li>대출: 신용 한도 안에서 빌리고, 매주 주일 정산 때 원금과 이자를 나눠 갚아요. 남은 원금은 언제든 한 번에 갚을 수 있어요</li><li>건축 목록의 카드에는 지으면 늘어나는 효과와 주간 유지비가 적혀 있어요</li><li>카드를 고르면 목록이 닫히고 지도에 미리보기가 놓입니다. 끌거나 지도를 눌러 옮기고, 둘레 화살표로 건물이 바라볼 방향(정면·출입구)을 고르면 건물이 그쪽으로 돌아가요. 왼쪽 위 초록 ✓로 짓고, 오른쪽 위 빨간 ✕로 그만둡니다 (PC: Enter·Esc·R)</li><li>조경은 짓고 나면 옆자리에 미리보기가 다시 놓여 ✓만 눌러 이어 지을 수 있어요. 큰 건물은 지은 주 안에 목록에서 전액 되돌릴 수 있어요</li><li>길: 시작할 곳을 누르고 화살표로 방향, 아래 띠에서 종류·경사·높이를 고른 뒤 ✓로 한 칸씩 잇습니다. 철골 계단 밑과 다리 아래로도 사람이 다닙니다</li><li>연결 다리: 같은 역할 건물의 위층 벽끼리 이으면, 한 건물이 차면 방문자가 다리를 건너 옆 건물로 갑니다</li><li>건물 쌓기: 지은 건물을 누르고 층 올리기(최대 5층). 칸 건물은 같은 칸을 다시 눌러 올립니다</li><li>바닥: 지도를 눌러 시작할 칸을 고르고, 화살표로 깔아 나갈 방향을 정한 뒤 ✓를 누를 때마다 한 칸씩 깔아요</li><li>오른쪽 아래 동그란 버튼: 건축 · 행사(행사·사역자) · 현황. 같은 버튼을 다시 누르면 닫힙니다. 교회 이름·새로 시작은 위쪽 톱니바퀴 메뉴</li><li>행사 버튼: 행사 탭에서 특별행사·절기 행사를, 사역자 탭에서 부교역자 청빙·직분자 임명·사역팀을 다룹니다</li><li>건물은 시간이 지나면 낡아요. 주황 ! 표시는 수리, 빨간 ? 표시는 입구·출구에 닿는 길이 없다는 뜻이에요</li><li>지은 건물을 누르면 입구·출구를 ◀ ▶로 옮깁니다. 방문자는 입구로 들어가 출구로 나옵니다</li></ul>'+
    '<div class="sec">만든 방식과 참고 자료</div>'+
    '<p class="hint" style="padding:0 0 4px">그래픽과 시스템은 모두 이 페이지의 코드로 새로 그렸고, 외부 이미지·소리·소스를 가져오지 않았습니다. 개발 중 참고한 공개 자료입니다.</p>'+
    '<ul class="refs"><li><a href="https://kenney.nl/assets/isometric-landscape" target="_blank" rel="noopener">Kenney 아이소메트릭 에셋 (CC0)</a> · 나중에 그림을 바꿀 때 쓸 후보</li>'+
    '<li><a href="https://opengameart.org/" target="_blank" rel="noopener">OpenGameArt</a> · CC0 에셋 모음 (라이선스 확인 필요)</li>'+
    '<li><a href="https://www.openrct2.org/about" target="_blank" rel="noopener">OpenRCT2</a> · 장르의 운영 구조를 이해하는 참고</li>'+
    '<li><a href="https://unity.com/blog/outlier-mars-attracts-interview" target="_blank" rel="noopener">욕구 기반 방문자 AI 개발 인터뷰</a> · 방문자 행동 설계 참고</li></ul>';
  var inp=$('#churchName');
  inp.addEventListener('input',function(){S.name=inp.value.trim()||'새빛교회';$('#cname').textContent=S.name;});
  inp.addEventListener('change',save);
}

function renderFinance(){
  var h='<div class="staff">';
  h+='<div class="qnums"><div><span>자금</span><b class="'+(S.money<0?'neg':'')+'">'+fmt(S.money)+'</b></div><div><span>빚</span><b>'+fmt(debt())+'</b></div><div><span>신용 한도</span><b>'+fmt(creditLimit())+'</b></div><div><span>이번 주 매장</span><b class="pos">+'+fmt(S.weekShop)+'</b></div></div>';
  h+='<div class="sec">지난 주일 정산</div>'+(S.rcpt?'<div class="rcpt">'+rcptHtml(S.rcpt,true)+'</div>':'<p class="hint">첫 주일이 지나면 정산 내역이 보여요. 헌금은 출석(좌석 안의 성도)과 만족도에 따라 들어와요.</p>');
  h+='<div class="sec">받은 대출</div>';
  if(!S.loans.length)h+='<p class="hint">받은 대출이 없어요.</p>';
  S.loans.forEach(function(l,i){
    var L=LOANS[l.k];
    h+=srow(L.name,'남은 원금 '+fmt(l.bal)+' · 주 '+fmt(l.pay)+' · '+l.left+'주 남음','매주 주일 정산 때 원금과 이자를 갚아요 (주 이율 '+(L.rate*100).toFixed(1)+'%)',
      '<button class="btn" data-act="repay" data-v="'+i+'"'+(S.money<l.bal?' disabled':'')+'>모두 갚기 '+fmt(Math.ceil(l.bal))+'</button>');
  });
  h+='<div class="sec">대출 받기</div><p class="hint" style="padding-top:0">빚 합계는 신용 한도까지예요. 성도와 평판이 늘면 한도가 올라가요.</p>';
  Object.keys(LOANS).forEach(function(k){
    var L=LOANS[k],why=loanBlock(k),pay=loanPayment(L.amt,L.rate,L.weeks);
    h+=srow(L.name+' '+fmt(L.amt),L.weeks+'주 동안 주 '+fmt(pay)+' · 모두 '+fmt(pay*L.weeks),L.desc+(why?'<br>'+bad(why):''),'<button class="btn pri" data-act="borrow" data-v="'+k+'"'+(why?' disabled':'')+'>빌리기</button>');
  });
  h+='</div>';
  panel.innerHTML=h;
}
