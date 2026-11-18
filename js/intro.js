'use strict';
/* ---------- 인트로 화면 · 스테이지 고르기 ----------
   게임을 열면 지도 위를 모두 덮는 인트로(#intro-screen: 마을 배경 + 둥실 뜨는 로고 + 맥동하는 시작 단추)가 뜬다.
   누르면 단추가 살짝 눌렸다가 화면이 0.6초 동안 사라지고, 그 밑에 깔려 있던 스테이지 고르기(#stage-screen, 2행 3열 카드)가 보인다.
   열린 스테이지(지금은 '농촌 목회'뿐)를 고르면 뒤에서 기다리던 게임 화면으로 들어간다. 그동안 게임 시간은 멈춘다(UI.intro, main.js frame).
   그림: assets/intro (원본은 docs/art/sheets/intro-*.webp, tools/intro_assets.py로 떼어 낸다). 잠긴 스테이지의 예시 그림은 코드로 그린 SVG다.
   시험(__CT_TEST)에서는 뜨지 않는다. 인트로를 시험하려면 __CT_INTRO를 켠다 */
var STAGES=[
  {id:'rural',n:'농촌 목회',d:'벚꽃 피는 시골 마을에서 첫 교회를 세워요',open:true},
  {id:'mount',n:'산촌 목회',d:'굽이진 협곡 끝 분지의 교회 · 차량 운행과 산짐승',open:true},
  {id:'sea',n:'어촌 목회',d:'큰 강 건너편의 교회 · 배로 태워 와야 해요',open:true},
  {id:'city',n:'도시 목회',d:'빌딩 숲 사이 · 부지 매입과 주차, 이웃 민원',open:true},
  {id:'miss1',n:'선교지 1',d:'야자수 아래, 열대 섬마을의 첫 예배'},
  {id:'miss2',n:'선교지 2',d:'눈 덮인 먼 땅에 세우는 따뜻한 교회'}
];
// 작은 교회 (예시 그림마다 하나씩 선다)
function stChurch(x,y,k,wall,roof){
  return '<g transform="translate('+x+' '+y+') scale('+k+')"><rect x="-9" y="-12" width="18" height="12" fill="'+(wall||'#fff6e0')+'"/><path d="M-11-12L0-21 11-12z" fill="'+(roof||'#b8674a')+'"/>'+
    '<rect x="-2" y="-7" width="4" height="7" fill="#7a4a2a"/><rect x="-7" y="-9" width="3" height="4" fill="#8fd0e6"/><rect x="4" y="-9" width="3" height="4" fill="#8fd0e6"/>'+
    '<path d="M-1-29h2v3h3v2h-3v5h-2v-5h-3v-2h3z" fill="#f2c94e"/></g>';
}
function stPine(x,y,k){return '<g transform="translate('+x+' '+y+') scale('+(k||1)+')"><rect x="-1" y="-3" width="2" height="4" fill="#6b4a2e"/><path d="M0-16L6-3H-6z" fill="#2f6f4a"/><path d="M0-21L4.5-10h-9z" fill="#3f8a5a"/></g>';}
function stPalm(x,y,k){return '<g transform="translate('+x+' '+y+') scale('+(k||1)+')"><path d="M0 0q2-10 1-18" stroke="#8a5a2b" stroke-width="2.4" fill="none"/><g fill="#3f9a5a"><path d="M1-18q-9-5-14 1q8-2 14 1z"/><path d="M1-18q9-6 15 0q-8-2-15 2z"/><path d="M1-18q-4-9-11-8q7 2 10 9z"/><path d="M1-18q5-9 12-7q-7 2-11 8z"/></g></g>';}
// 잠긴 스테이지의 예시 그림 (160×100)
function stageArt(id){
  var h='<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
  if(id==='mount'){
    h+='<rect width="160" height="100" fill="#bfe3f2"/><circle cx="128" cy="20" r="9" fill="#fff3c4"/>'+
      '<path d="M-5 70L38 18 70 62 96 30 140 74 165 60V100H-5z" fill="#8fb0a6"/><path d="M38 18l9 12-6-3-5 5-4-5z" fill="#fff"/><path d="M96 30l8 11-5-2-4 4-4-5z" fill="#fff"/>'+
      '<path d="M-5 78Q40 56 80 74T165 70V100H-5z" fill="#6fa86a"/><path d="M-5 88Q50 74 100 86T165 84V100H-5z" fill="#5a9a55"/>'+
      '<path d="M20 100Q60 86 78 78" stroke="#e8d9b0" stroke-width="3" fill="none"/>'+stPine(22,80,1)+stPine(34,84,.8)+stPine(118,82,1.1)+stPine(132,86,.8)+stPine(60,78,.7)+stChurch(84,78,1,'#fff6e0','#8a5a3a');
  }else if(id==='sea'){
    h+='<rect width="160" height="100" fill="#cdeaf7"/><circle cx="30" cy="20" r="10" fill="#fff3c4"/><path d="M96 18q6-5 12 0q6-5 12 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>'+
      '<rect y="48" width="160" height="52" fill="#5fb0d6"/><path d="M0 56q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" stroke="#bfe6f5" stroke-width="1.6" fill="none"/><path d="M0 68q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" stroke="#8fd0ea" stroke-width="1.6" fill="none"/>'+
      '<path d="M-5 100V74q30-14 62-6 28 8 40 32z" fill="#e8d9a8"/><path d="M-5 100V82q26-10 52-4 22 6 30 22z" fill="#7cc276"/>'+
      '<g transform="translate(118 60)"><path d="M-12 0h24l-4 7h-16z" fill="#b8674a"/><rect x="-1" y="-16" width="2" height="16" fill="#6b4a2e"/><path d="M1-15l10 11H1z" fill="#fff"/></g>'+
      '<g transform="translate(146 50)"><rect x="-4" y="-22" width="8" height="24" fill="#fff"/><rect x="-4" y="-14" width="8" height="5" fill="#d6504a"/><rect x="-5" y="-27" width="10" height="5" fill="#3d3d46"/><rect x="-3" y="-26" width="6" height="3" fill="#ffd76a"/></g>'+
      stChurch(34,84,1.05,'#fff6e0','#3f7fb0');
  }else if(id==='city'){
    h+='<rect width="160" height="100" fill="#dfe9f5"/><circle cx="130" cy="18" r="9" fill="#ffe9a6"/>';
    [[4,34,22,'#9fb2c8'],[28,22,20,'#8aa0ba'],[50,40,18,'#b3c2d4'],[98,26,22,'#8aa0ba'],[122,38,18,'#9fb2c8'],[142,18,22,'#7f95b0']].forEach(function(b){
      h+='<rect x="'+b[0]+'" y="'+b[1]+'" width="'+b[2]+'" height="'+(86-b[1])+'" fill="'+b[3]+'"/>';
      for(var y=b[1]+5;y<78;y+=8)for(var x=b[0]+3;x<b[0]+b[2]-3;x+=6)h+='<rect x="'+x+'" y="'+y+'" width="3" height="4" fill="'+((x+y)%5?'#eaf4ff':'#ffe28a')+'"/>';
    });
    h+='<rect y="84" width="160" height="16" fill="#6c7880"/><path d="M0 92h160" stroke="#f2e6a8" stroke-width="1.4" stroke-dasharray="8 6"/><rect y="80" width="160" height="4" fill="#c9d3da"/>'+
      '<circle cx="70" cy="78" r="5" fill="#5aa85c"/><rect x="69" y="78" width="2" height="5" fill="#6b4a2e"/>'+stChurch(84,82,1.25,'#fff6e0','#c4503a')+
      '<g transform="translate(24 90)"><rect x="-8" y="-5" width="16" height="6" rx="2" fill="#e0624a"/><rect x="-5" y="-8" width="10" height="4" rx="1.5" fill="#bfe0f2"/><circle cx="-5" cy="1.5" r="2" fill="#2b2b33"/><circle cx="5" cy="1.5" r="2" fill="#2b2b33"/></g>';
  }else if(id==='miss1'){
    h+='<rect width="160" height="100" fill="#ffe2b0"/><circle cx="120" cy="34" r="16" fill="#ffb85c"/><rect y="52" width="160" height="48" fill="#58b8c9"/><path d="M0 60q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" stroke="#aee3ea" stroke-width="1.6" fill="none"/>'+
      '<path d="M-5 100V78q34-18 76-10 36 8 54 32z" fill="#f0dca6"/><path d="M-5 100V86q30-12 62-6 26 6 38 20z" fill="#7cc276"/>'+
      stPalm(18,84,1.2)+stPalm(98,80,1)+stPalm(112,88,.8)+
      '<g transform="translate(70 86)"><rect x="-7" y="-8" width="14" height="8" fill="#d9b07a"/><path d="M-10-8L0-17 10-8z" fill="#b98450"/><rect x="-2" y="-5" width="4" height="5" fill="#6b4a2e"/></g>'+stChurch(44,88,1,'#fff6e0','#b98450');
  }else{
    h+='<rect width="160" height="100" fill="#cfe0f2"/><circle cx="34" cy="20" r="8" fill="#fff"/>'+
      '<path d="M-5 64L30 30 58 58 90 26 128 62 165 44V100H-5z" fill="#a9bdd6"/><path d="M30 30l10 10-6-1-5 4-5-5zM90 26l11 11-7-1-5 4-5-6z" fill="#fff"/>'+
      '<path d="M-5 74Q40 62 82 72T165 68V100H-5z" fill="#f4f8fc"/><path d="M-5 88Q50 78 100 86T165 84V100H-5z" fill="#e3edf6"/>'+
      stPine(20,80,1)+stPine(136,82,1.1)+stPine(118,78,.8)+
      '<g transform="translate(112 90)"><rect x="-7" y="-8" width="14" height="8" fill="#b9694c"/><path d="M-9-8L0-15 9-8z" fill="#fff"/><rect x="2" y="-18" width="3" height="5" fill="#6b4a2e"/></g>'+stChurch(66,84,1.15,'#f6ead4','#fff');
    for(var i=0;i<26;i++)h+='<circle cx="'+((i*37)%160)+'" cy="'+((i*53)%96)+'" r="'+(i%3?1:1.5)+'" fill="#fff" opacity=".85"/>';
  }
  return h+'</svg>';
}
// 스테이지 목표: 그 스테이지의 마지막 퀘스트(STAGE_GOAL, quests.js)와 같다. 이룬 스테이지는 ✓
function stageGoalHtml(s){
  if(!s.open||typeof QID==='undefined'||!QID[STAGE_GOAL])return '';
  var q=QID[STAGE_GOAL],done=stageClears()[s.id]!=null;
  return '<span class="stgoal'+(done?' done':'')+'"><i aria-hidden="true">'+(done?'✓':uiImg('stage_goal','stgi'))+'</i>목표 · '+q.n+'</span>';
}
// 스테이지마다 일반 저장이 있는지 (테스트 저장은 치지 않는다)와 저장된 진행(주·성도 수)
function stageSaved(id){try{return !!localStorage.getItem(stageKey(id));}catch(e){return false;}}
function stageSaveInfo(id){try{var o=JSON.parse(localStorage.getItem(stageKey(id))||'null');return o?dateText(o.week||0,true)+' · 성도 '+Math.round(o.members||0)+'명':'';}catch(e){return '';}}
/* 스테이지 카드: 그림(목표 칩) · 번호(저장된 진행) · 이름 · 한 줄 설명 · 시작 단추 셋
   처음부터(new) — 새 지도로 시작 (저장이 있으면 한 번 더 눌러야: UI.stArm, 3초) · 이어하기(cont) — 저장에서 이어서 (저장이 없으면 흐림) ·
   테스트(test) — 언제나 새 테스트 게임(stages.js testSetup: 100억·모든 기능, 저장은 따로). 잠긴 스테이지(선교지)는 테스트로만 들어간다.
   흐린 단추도 누를 수 있게 두고(aria-disabled) 누르면 카드가 흔들린다 */
function stBtn(s,mode,label,on,arm){
  return '<button class="stb '+mode+(on?'':' off')+(arm?' arm':'')+'" data-stage="'+s.id+'" data-mode="'+mode+'"'+(on?'':' aria-disabled="true"')+
    ' aria-label="'+s.n+' '+(arm?'정말 처음부터 — 한 번 더 누르면 저장된 게임 대신 새로 시작해요':label)+'">'+(arm?'정말 새로?':label)+'</button>';
}
// 스테이지 카드 그림(Gemini, 12번 시트 → assets/intro/stage_<id>.webp)과 엠블럼(13번 시트 → assets/ui/stg_<id>[_clear].png)이 있는 스테이지. 선교지는 아직 SVG
var STAGE_IMG={rural:1,mount:1,sea:1,city:1};
function stagePic(s){
  if(!STAGE_IMG[s.id])return stageArt(s.id);
  var clr=stageClears()[s.id]!=null;
  return '<img class="stimg" alt="" src="assets/intro/stage_'+s.id+'.webp"><img class="stemb'+(clr?' clear':'')+'" alt="" src="assets/ui/stg_'+s.id+(clr?'_clear':'')+'.png">';
}
function renderStages(){
  var el=document.getElementById('stage-grid');if(!el)return;
  var arm=UI.stArm&&performance.now()<UI.stArm.t?UI.stArm.id:null;
  el.innerHTML=STAGES.map(function(s,i){
    var op=!!s.open,sv=op&&stageSaved(s.id),inf=sv?stageSaveInfo(s.id):'';
    return '<div class="stcard'+(op?'':' lock')+'" data-card="'+s.id+'" role="group" aria-label="스테이지 '+(i+1)+' '+s.n+(op?'':' (잠김 · 테스트로만)')+'">'+
      '<span class="stpic">'+stagePic(s)+(op?'':'<span class="stlock" aria-hidden="true"><i>🔒</i>잠김</span>')+stageGoalHtml(s)+'</span>'+
      '<span class="stno">STAGE '+(i+1)+(inf?'<em class="stsv">'+inf+'</em>':'')+'</span><b>'+s.n+'</b><small>'+s.d+'</small>'+
      '<span class="stbtns">'+stBtn(s,'new','처음부터',op,arm===s.id)+stBtn(s,'cont','이어하기',sv)+stBtn(s,'test','테스트',true)+'</span></div>';}).join('');
}
// 인트로를 닫고 스테이지 고르기를 보인다: 단추가 눌렸다가(0.95배) 화면이 0.6초 동안 사라진다
function introStart(){
  var el=document.getElementById('intro-screen'),st=document.getElementById('stage-screen');
  if(!el||el.classList.contains('press')||el.classList.contains('out'))return;
  UI.stArm=null;renderStages();if(st){st.style.display='';st.classList.remove('out');}
  el.classList.add('press');if(typeof sfx==='function')sfx('click',.6,0);
  setTimeout(function(){if(st)st.hidden=false;el.classList.add('out');},130);
  setTimeout(function(){el.style.display='none';},130+620);
}
// 카드의 단추를 눌렀을 때: 안 되는 것은 카드가 흔들리고, 되는 것은 그 방식으로 들어간다
function stagePick(id,mode){
  var s=STAGES.filter(function(x){return x.id===id;})[0],st=document.getElementById('stage-screen');if(!s||!st||st.hidden||st.classList.contains('out'))return;
  mode=mode||'cont';
  var card=st.querySelector('[data-card="'+id+'"]'),no=function(){if(card){card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake');}if(typeof sfx==='function')sfx('error',.4);};
  if(!s.open&&mode!=='test')return no();
  if(mode==='cont'&&!stageSaved(id))return no();
  if(mode==='new'&&stageSaved(id)&&!(UI.stArm&&UI.stArm.id===id&&performance.now()<UI.stArm.t)){
    UI.stArm={id:id,t:performance.now()+3000};renderStages();if(typeof sfx==='function')sfx('click',.4);
    setTimeout(function(){if(UI.stArm&&UI.stArm.id===id&&performance.now()>=UI.stArm.t){UI.stArm=null;renderStages();}},3100);return;
  }
  UI.stArm=null;
  enterStage(id,mode);if(typeof sfx==='function')sfx('page',.5);   // 스테이지마다 지도·저장이 따로다 (stages.js)
  st.classList.add('out');
  setTimeout(function(){st.style.display='none';UI.intro=false;},460);
}
/* 설정 메뉴(톱니바퀴)의 이동: 스테이지 선택 · 메인 화면.
   하던 게임은 저장하고(손대지 않은 빈 게임은 빼고, saveIfPlayed) 열린 창·카드를 닫은 뒤 시간을 멈춘다(UI.intro) */
function leaveGame(){
  saveIfPlayed();
  if(UI.scr)closeScreen();if(isPlacing())endPlace();
  UI.sel=null;UI.selPiece=null;UI.selFloor=null;UI.alertOpen=false;UI.fold=true;
  closeGatePop();renderPanel();renderSelCard();syncAlert();
  UI.intro=true;
}
function showStageScreen(){
  var el=document.getElementById('intro-screen'),st=document.getElementById('stage-screen');
  if(!st){toast('스테이지 고르기 화면이 없어요',1600);return;}
  leaveGame();UI.stArm=null;renderStages();
  if(el)el.style.display='none';
  st.style.display='';st.classList.remove('out');st.hidden=false;if(typeof sfx==='function')sfx('page',.4);
}
function showIntro(){
  var el=document.getElementById('intro-screen'),st=document.getElementById('stage-screen');
  if(!el){toast('메인 화면이 없어요',1600);return;}
  leaveGame();
  if(st){st.hidden=true;st.classList.remove('out');st.style.display='';}
  el.classList.remove('press','out');el.style.display='';if(typeof sfx==='function')sfx('page',.4);
}
// 인트로와 스테이지 고르기를 바로 치운다 (시험·점검용)
function introSkip(){['intro-screen','stage-screen'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});UI.intro=false;}
function setupIntro(){
  var el=document.getElementById('intro-screen'),st=document.getElementById('stage-screen');
  if(!el||!st)return;
  if(window.__CT_TEST&&!window.__CT_INTRO){el.parentNode.removeChild(el);st.parentNode.removeChild(st);return;}
  UI.intro=true;renderStages();
  el.addEventListener('click',function(){introStart();});
  st.addEventListener('click',function(e){var b=e.target.closest('[data-stage][data-mode]');if(b)stagePick(b.dataset.stage,b.dataset.mode);});
  document.addEventListener('keydown',function(e){if(UI.intro&&el.style.display!=='none'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();introStart();}});
}
