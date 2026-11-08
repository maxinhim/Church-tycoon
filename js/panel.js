'use strict';
/* ---------- 하단 패널 ---------- */
var panel;
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
  if(d.income)p.push('이용당 +'+d.income);
  p.push('유지비 '+d.up+'/주');
  return p.join(' · ');
}
function renderPanel(){
  panel=$('#panel');
  $('#dock').classList.toggle('fold',UI.fold);
  panel.hidden=UI.fold;
  if(UI.fold)return;
  var t=UI.tab;
  panel.className=(t==='build')?'build':'scroll';
  if(t==='build')renderBuild();else if(t==='staff')renderStaff();else if(t==='status')renderStatus();else renderMenu();
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
      el.insertAdjacentHTML('beforeend','<span class="nm">'+d.name+'</span><span class="pr">'+fmt(d.cost)+'</span>');
      cards.appendChild(el);
    });
  }
  refreshCards();renderDetail();
}
function refreshCards(){
  var cs=document.querySelectorAll('#cards .card');
  for(var i=0;i<cs.length;i++){var d=D[cs[i].dataset.v];cs[i].classList.toggle('poor',S.money<d.cost);cs[i].classList.toggle('sel',UI.tool===d.id);}
}
function dirPad(act,cur){
  var lab=['오른쪽 아래','왼쪽 아래','왼쪽 위','오른쪽 위'],rot=[45,135,225,315];
  return '<div class="dpad">'+[2,3,1,0].map(function(i){
    return '<button class="btn dbtn'+(i===cur?' on':'')+'" data-act="'+act+'" data-v="'+i+'" aria-label="'+lab[i]+'" aria-pressed="'+(i===cur)+'">'+
      '<svg viewBox="0 0 24 24" style="transform:rotate('+rot[i]+'deg)" aria-hidden="true"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  }).join('')+'</div>';
}
function segBtns(act,val,items,off){
  return '<div class="seg">'+items.map(function(it){var on=String(val)===String(it[0]);return '<button class="btn'+(on?' on':'')+'" data-act="'+act+'" data-v="'+it[0]+'" aria-pressed="'+on+'"'+(off?' disabled':'')+'>'+it[1]+'</button>';}).join('')+'</div>';
}
function bad(t){return '<span style="color:var(--bad)">'+t+'</span>';}
function renderDetail(){
  var el=$('#detail');if(!el)return;
  var h='',d,b;
  if(UI.tool==='path'){
    var c=UI.pc,p=pcPiece(),why=p?(pieceFits(p)||(S.money<pieceCost(p)?'자금이 부족해요':'')):'';
    var sky=c.k==='sky',sl=sky?0:c.slope;
    var info=!p?'지도를 눌러 시작할 곳을 고르세요. 지어 둔 길을 누르면 그 끝에서 이어 짓습니다':
      (why?bad(why):'다음: '+pieceName(p)+' · 높이 '+c.l+(sl?'→'+(c.l+sl):'')+' · '+fmt(pieceCost(p)));
    if(sky&&!why)info+='<br>같은 역할 건물의 위층 벽끼리 이으면 방문자가 다리를 건너 옮겨 다녀요';
    // 건설하기 버튼을 위에 두어 좁은 패널에서도 방향·경사를 바꾸며 바로 누를 수 있게
    var ctrl='<div class="pb"><div class="pg"><span class="lbl">방향</span>'+dirPad('pdir',worldToScreenDir(c.dir))+'</div>'+
      '<div class="pg"><span class="lbl">경사</span>'+segBtns('pslope',sl,[[-1,'내리막'],[0,'평지'],[1,'오르막']],sky)+
      '<span class="lbl">종류</span>'+segBtns('pkind',c.k,[['stone','돌길'],['wood','나무 데크'],['sky','연결 다리']])+'</div>'+
      '<div class="pg"><span class="lbl">시작 높이</span><div class="seg"><button class="btn" data-act="plevel" data-v="-1" aria-label="한 층 낮게"'+(c.l<=0?' disabled':'')+'>▼</button>'+
      '<span class="lvl">'+(c.l?c.l+1+'층':'땅')+'</span><button class="btn" data-act="plevel" data-v="1" aria-label="한 층 높게"'+(c.l>=MAXL?' disabled':'')+'>▲</button></div></div></div>'+
      '';
    h='<div class="tx">'+info+'</div><div class="btns">'+(c.hist.length?'<button class="btn" data-act="pundo">되돌리기</button>':'')+
      '<button class="btn pri" data-act="pbuild"'+(p&&!why?'':' disabled')+'>건설하기</button><button class="btn" data-act="cancel">완료</button></div>'+ctrl;
  }else if(isRoomDef(UI.tool)){
    var rd=D[UI.tool],rp=UI.ghost?tilePlan(UI.ghost.x,UI.ghost.y,UI.tool):null,line;
    if(!rp)line='빈 땅을 누르면 칸이 생기고, 같은 칸끼리 이어 붙이면 하나의 '+rd.rname+'이 됩니다. 지은 칸을 다시 누르면 위층이 올라갑니다(최대 '+MROOM.maxF+'층)';
    else if(!rp.ok)line=bad(rp.why);
    else if(S.money<rp.cost)line=bad('자금이 부족해요');
    else line=(rp.kind==='floor'?'이 칸을 누르면 위층을 올려요 · ':'이 칸을 누르면 칸을 지어요 · ')+fmt(rp.cost);
    h='<div class="tx"><b>'+rd.name+' '+fmt(rd.cost)+' · 위층 '+fmt(MROOM.floorCost)+'</b><br>'+line+'</div><div class="btns">'+(UI.undo.length?'<button class="btn" data-act="undo">되돌리기</button>':'')+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else if(isFloorDef(UI.tool)){
    var fd=D[UI.tool];
    h='<div class="tx"><b>'+fd.name+(fd.cost?' · 한 칸 '+fmt(fd.cost):'')+'</b><br>'+fd.desc+'. 땅을 누를 때마다 한 칸씩 칠해져요</div><div class="btns">'+(UI.undo.length?'<button class="btn" data-act="undo">되돌리기</button>':'')+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else if(UI.tool&&D[UI.tool]){
    d=D[UI.tool];
    var facing=(d.fill||d.w!==d.h)?'<div class="pb"><div class="pg"><span class="lbl">정면 방향 (기본 출입구 쪽)</span>'+dirPad('face',worldToScreenDir(UI.face))+'</div></div>':'';
    if(UI.ghost){
      var ok=canPlace(d,UI.ghost.x,UI.ghost.y,UI.face),afford=S.money>=d.cost;
      var why2=!ok?bad('이곳에는 지을 수 없어요. 건물을 끌어서 옮겨 보세요'):(!afford?bad('자금이 부족해요'):effText(d));
      h=facing+'<div class="tx"><b>'+d.name+' · '+fmt(d.cost)+'</b><br>'+why2+'</div><div class="btns"><button class="btn" data-act="cancel">취소</button><button class="btn pri" data-act="confirm"'+((ok&&afford)?'':' disabled')+'>짓기</button></div>';
    }else{
      h=facing+'<div class="tx"><b>'+d.name+' · '+fmt(d.cost)+'</b> ('+d.w+'×'+d.h+')<br>'+d.desc+'. 지도를 눌러 위치를 고르세요</div>';
    }
  }else if(UI.sel&&bById(UI.sel)){
    b=bById(UI.sel);var bd=defOf(b),st=isRoom(b)&&UI.selTile&&tileOf(b,UI.selTile.x,UI.selTile.y);
    var tileBtn=st?'<button class="btn" data-act="demtile">'+(st.f>1?'이 칸 '+st.f+'층':'이 칸')+' 철거 +'+fmt((st.f>1?MROOM.floorCost:D[b.def].cost)*0.5)+'</button>':'';
    if(canStack(b)){
      var nf=b.floors||1;
      if(nf<MAXF)tileBtn+='<button class="btn" data-act="floorup">층 올리기 '+fmt(floorCostOf(b))+'</button>';
      if(nf>1)tileBtn+='<button class="btn" data-act="floordown">맨 위층 철거 +'+fmt(floorCostOf(b)*0.5)+'</button>';
    }
    var lines=[effText(bd)],doorUI='';
    if(b.door){
      var warn=!b.acc?'':(!b.acc.ent?'입구까지 이어진 길이 없어요':(!b.acc.ext?'출구에서 나갈 길이 없어요':''));
      lines.push(doorText(b)+(warn?' · '+bad(warn+'. 방문자가 이용하지 못해요'):''));
      doorUI='<div class="doors"><span class="lbl">입구</span><button class="btn sm" data-act="door" data-v="ent:-1" aria-label="입구를 이전 자리로">◀</button><button class="btn sm" data-act="door" data-v="ent:1" aria-label="입구를 다음 자리로">▶</button>'+
        '<span class="lbl">출구</span><button class="btn sm" data-act="door" data-v="ext:-1" aria-label="출구를 이전 자리로">◀</button><button class="btn sm" data-act="door" data-v="ext:1" aria-label="출구를 다음 자리로">▶</button></div>';
    }
    if(b.links&&b.links.length)lines.push('연결 다리로 이어짐: '+b.links.map(function(id){var o=bById(id);return o?defOf(o).name:'';}).join(', '));
    h='<div class="tx full"><b>'+bd.name+'</b> · 이용 '+(b.uses||0)+'회'+(bd.cap?' · 지금 '+b.inUse+'/'+bd.cap+'명':'')+'<br>'+lines.join('<br>')+'</div>'+doorUI+
      '<div class="btns">'+tileBtn+'<button class="btn bad" data-act="demolish">'+(isRoom(b)?'전체 ':'')+'철거 +'+fmt(bd.cost*0.5)+'</button></div>';
  }else if(UI.selPiece&&pieceById(UI.selPiece)){
    var sp=pieceById(UI.selPiece);
    var sw=sp.k==='sky'&&NAV.badSky[sp.id]?'<br>'+bad('역할이 다른 건물을 잇고 있어 방문자가 건너지 않아요'):'';
    h='<div class="tx"><b>'+pieceName(sp)+'</b> · 높이 '+sp.l+(sp.s?'→'+(sp.l+1):'')+sw+'</div><div class="btns"><button class="btn bad" data-act="dempiece">철거 +'+fmt(pieceCost(sp)*0.5)+'</button></div>';
  }else{
    h='<div class="tx">'+(UI.tool==='demolish'?'철거할 건물이나 길을 눌러보세요.':'건물을 고른 뒤 지도를 눌러 지으세요. 지은 건물을 누르면 입구·출구를 옮길 수 있어요.')+'</div>';
  }
  el.innerHTML=h;
  var cs=$('#cards');if(cs)cs.hidden=UI.tool==='path'||(!UI.tool&&!!(UI.sel||UI.selPiece));
}
function renderStaff(){
  var h='<div class="staff">';
  Object.keys(STAFF).forEach(function(k){
    var s=STAFF[k],lv=S.staff[k],next=s.costs[lv];
    h+='<div class="srow"><div class="tx"><b>'+s.name+'</b> <span style="color:var(--muted);font-size:12px">단계 '+lv+'/3 · 주 '+s.week*lv+'</span><p>'+s.desc+'</p><div class="pips">'+[0,1,2].map(function(i){return '<i class="'+(i<lv?'on':'')+'"></i>';}).join('')+'</div></div>'+
      '<div class="btns">'+(lv>0?'<button class="btn" data-act="fire" data-v="'+k+'" aria-label="'+s.name+' 축소">−</button>':'')+
      (lv<3?'<button class="btn pri" data-act="hire" data-v="'+k+'"'+(S.money<next?' disabled':'')+'>'+fmt(next)+'</button>':'<button class="btn" disabled>최대</button>')+'</div></div>';
  });
  h+='</div>';
  panel.innerHTML=h;
}
function renderStatus(){
  var c=S.cov||{},rows=[['좌석',c.seat],['교제 공간',c.fel],['돌봄',c.care],['편의',c.comf],['주차',c.park]];
  var h='<div class="sec">성도 만족도</div><div class="cov"><span>전체</span><div class="bar"><i style="width:'+Math.round(S.mood)+'%"></i></div><span class="v">'+Math.round(S.mood)+'%</span>';
  rows.forEach(function(r){var v=Math.round((r[1]||0)*100);h+='<span>'+r[0]+'</span><div class="bar"><i style="width:'+v+'%;background:'+(v<60?'var(--bad)':'var(--good)')+'"></i></div><span class="v">'+v+'%</span>';});
  h+='</div><div class="sec">이번 주</div><div class="legend"><span>지금 부지에 '+V.length+'명</span><span>이번 주 방문 '+S.visitsWeek+'</span><span>새 성도 '+S.joinedWeek+'</span></div>';
  h+='<div class="legend" style="margin-top:6px">'+NEEDS.map(function(n){return '<span><i style="background:'+NC[n]+'"></i>'+NK[n]+'</span>';}).join('')+'<span>머리 위 점은 방문자가 찾는 것</span></div>';
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
    '<div class="btns"><button class="btn'+(UI.confirmNew?' bad':'')+'" data-act="newgame">'+(UI.confirmNew?'정말 처음부터 시작할까요? 한 번 더 누르세요':'새로 시작')+'</button></div>'+
    '<div class="sec">조작법</div><ul class="how"><li>한 손가락으로 끌기: 지도 이동</li><li>두 손가락 벌리기·오므리기: 확대·축소 (PC는 마우스 휠)</li><li>오른쪽 회전 버튼: 90°씩 시점 회전</li><li>건물을 고르면 미리보기가 놓입니다. 정면 방향을 고르고, 미리보기를 끌거나 지도를 눌러 옮긴 뒤 짓기를 누르세요</li><li>길 탭: 시작할 곳을 누르고 방향·경사·종류·높이를 고른 뒤 건설하기로 한 칸씩 잇습니다. 철골 계단 밑과 다리 아래로도 사람이 다닙니다</li><li>연결 다리: 같은 역할 건물의 위층 벽끼리 이으면, 한 건물이 차면 방문자가 다리를 건너 옆 건물로 갑니다</li><li>건물 쌓기: 지은 건물을 누르고 층 올리기(최대 5층). 칸 건물은 같은 칸을 다시 눌러 올립니다</li><li>바닥 탭: 땅을 눌러 바닥 타일을 칠합니다</li><li>지은 건물을 누르면 입구·출구를 ◀ ▶로 옮깁니다. 방문자는 입구로 들어가 출구로 나옵니다</li></ul>'+
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
