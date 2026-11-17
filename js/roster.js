'use strict';
/* ---------- 직원 화면 · 영웅 로스터 (하단 '👥 직원') ----------
   #scr의 roster 화면: 탭 부교역자 · 직원 · 청빙. 부교역자·직원 탭은 왼쪽 60%에 큰 초상화 카드 격자, 오른쪽 40%에 고른 사람의 상세 패널.
   · 카드 테두리: 교회에서 기른 사람(in)은 황금색, 밖에서 청빙한 사람(ex)은 푸른색. 카드 아래에 근무지(맡은 건물) 뱃지
   · 상세 패널: 숨 쉬는 큰 초상화, 월 사례비·성능·사기·훈련 경험·한 줄 사연, 그리고 쿨타임 없이 바로 되는 네 버튼
       📍 근무지 배치/변경(건물 메인 관리자로 바로 꽂음) · 📖 직무 교육(영구 성능↑) · 🎁 특별 격려(사기↑) · 🎓 직급 승급
   · 직원마다 st = {tr 직무교육 횟수, mo 사기, xp 훈련 경험, rk 직급}을 따로 둔다. 수치는 balance.js ST_* */
function stOf(o){
  if(!o.st){
    var rk=0;if(o.title){var i=ST_RANK.assoc.indexOf(o.title);rk=i>0?i:0;}
    o.st={tr:0,mo:100,xp:0,rk:rk,rb:rk};   // rb: 처음 직급(승급으로 얻은 것만 성능에 친다)
  }
  return o.st;
}
// 성능 배수 (부교역자·직원의 효과에 곱한다: asSkill, mgrPool)
function stMul(o){var s=stOf(o);return (1+ST_TRAIN.k*s.tr)*(1+ST_RANK.k*(s.rk-s.rb))*(ST_MO_LO+(1-ST_MO_LO)*s.mo/100);}
// 매주: 사기는 떨어지고, 건물을 맡은 사람은 훈련 경험이 쌓인다
function stWeek(){
  (S.assoc||[]).concat(ppStaffPeople()).forEach(function(o){
    var s=stOf(o),key=o.n!=null?'p'+o.id:'a'+asUid(o);
    s.mo=Math.max(0,s.mo-ST_MO_DECAY);if(MGB[key])s.xp+=ST_XP_WEEK;
  });
}
/* 한 사람을 같은 모양으로 다룬다 (key: 'a'+부교역자 uid / 'p'+성도 id — 건물 관리자 열쇠와 같다) */
function rosEnt(key){
  var o=null,kind=key.charAt(0),id=key.slice(1);
  if(kind==='a')o=(S.assoc||[]).filter(function(a){return String(a.uid)===id;})[0];
  else o=ppById(+id);
  if(!o)return null;
  var as=kind==='a',ex=as?!o.home:!!o.ext,role=as?'pastor':(o.node==='cstaff'?'staff':'');
  var pool=role?mgrPool(role).filter(function(w){return w.key===key;})[0]:null;
  var pay=as?o.pay:(o.ext?o.ext.pay:0),s=stOf(o);
  return {key:key,kind:kind,o:o,as:as,ex:ex,role:role,name:as?o.name:o.n,rank:as?o.title:ppRankName(o),g:o.g||(mgrSeed(as?o:{name:o.n,seed:o.seed})%2?'m':'f'),seed:as?mgrSeed(o):o.seed,
    pay:pay,k:pool?pool.k:null,at:MGB[key]||0,st:s,story:as?o.story:(o.ext&&o.ext.story),
    ladder:as?ST_RANK.assoc:(role==='staff'?ST_RANK.staff:null)};
}
function rosList(tab){
  if(tab==='assoc')return (S.assoc||[]).map(function(a){return rosEnt('a'+asUid(a));});
  return ppStaffPeople().map(function(p){return rosEnt('p'+p.id);});
}
// 초상화: 청빙한 사람은 청빙 카드 그림, 기른 사람은 성도 때의 얼굴
function rosArt(e){
  if(e.ex)return hirePortrait(e.as?e.o:e.o.ext,e.as?'assoc':'C');
  return memberIcon({seed:e.seed,g:e.g});
}
function rosAtName(e){var b=e.at&&bById(e.at);return b?defOf(b).name:'';}
function rosCardHtml(e,on){
  var at=rosAtName(e);
  return '<button class="rcard '+(e.ex?'ex':'in')+(on?' on':'')+'" data-act="rosopen" data-v="'+e.key+'" aria-label="'+e.name+' '+e.rank+', '+(e.ex?'청빙':'교회에서 기름')+', '+(at?at+' 근무':'대기')+'">'+
    '<img alt="" src="'+rosArt(e)+'"><span class="rc-rk">'+e.rank+'</span>'+
    '<span class="rc-n">'+e.name+'</span><span class="rc-at'+(at?'':' idle')+'">'+(at?'📍 '+at:'대기')+'</span></button>';
}
function rosCost(n){return Math.round(ST_TRAIN.cost*(1+ST_TRAIN.grow*n));}
function rosWhyTrain(e){
  if(e.st.tr>=ST_TRAIN.max)return '더 배울 것이 없어요 (최대 '+ST_TRAIN.max+'회)';
  if(e.st.xp<ST_TRAIN.xp)return '훈련 경험이 모자라요 ('+Math.floor(e.st.xp)+'/'+ST_TRAIN.xp+') · 특별 격려나 근무로 쌓여요';
  if(S.money<rosCost(e.st.tr))return '자금이 부족해요';
  return '';
}
function rosWhyCheer(e){
  if(e.st.mo>=100)return '사기가 가득해요';
  if(S.money<ST_CHEER.cost)return '자금이 부족해요';
  return '';
}
function rosWhyPromote(e){
  if(!e.ladder)return '직분은 성도 화면에서 임명으로 올려요';
  var r=e.st.rk;
  if(r>=e.ladder.length-1)return '최고 직급이에요';
  if(e.st.tr<ST_RANK.need[r])return '직무 교육 '+ST_RANK.need[r]+'회가 필요해요 (지금 '+e.st.tr+'회)';
  if(S.money<ST_RANK.cost[r])return '자금이 부족해요';
  return '';
}
function rosDetailHtml(e){
  if(!e)return '<div class="rd empty"><p>왼쪽에서 사람을 골라 보세요</p></div>';
  var at=rosAtName(e),s=e.st,tw=rosWhyTrain(e),cw=rosWhyCheer(e),pw=rosWhyPromote(e),r=s.rk,nx=e.ladder&&r<e.ladder.length-1?e.ladder[r+1]:'';
  var story=e.story||(e.ex?'새 사역지에서 열심히 섬기고 있어요.':'우리 교회에서 자라 사역자가 되었어요. 교회의 사정을 누구보다 잘 알아요.');
  var h='<div class="rd '+(e.ex?'ex':'in')+'"><div class="rd-art"><img alt="" src="'+rosArt(e)+'"></div>'+
    '<div class="rd-h"><h3>'+e.name+'</h3><span class="rchip '+(e.ex?'ex':'in')+'">'+e.rank+'</span><span class="rorg">'+(e.ex?'청빙':'양육')+'</span></div>'+
    '<p class="say">“'+story+'”</p>'+
    '<dl class="rd-s"><div><dt>근무지</dt><dd>'+(at?'📍 '+at:'<em>대기 중</em>')+'</dd></div>'+
    '<div><dt>월 사례비</dt><dd>'+(e.pay?fmt(e.pay):'없음')+'</dd></div>'+
    '<div><dt>성능</dt><dd>'+(e.k!=null?kText(e.k):'—')+'</dd></div>'+
    '<div><dt>직무 교육</dt><dd>'+s.tr+' / '+ST_TRAIN.max+'회</dd></div>'+
    '<div><dt>훈련 경험</dt><dd>'+Math.floor(s.xp)+'</dd></div>'+
    '<div class="mo"><dt>사기</dt><dd><span class="bar"><i style="width:'+Math.round(s.mo)+'%"></i></span>'+Math.round(s.mo)+'</dd></div></dl>'+
    '<div class="rd-b">'+
    '<button class="btn pri" data-act="rospick"'+(e.role?'':' disabled')+'>📍 근무지 '+(at?'변경':'배치')+'</button>'+
    '<button class="btn" data-act="rostrain"'+(tw?' disabled':'')+' title="'+tw+'">📖 직무 교육<small>'+(s.tr>=ST_TRAIN.max?'최대':fmtS(rosCost(s.tr))+' · 경험 '+ST_TRAIN.xp)+'</small></button>'+
    '<button class="btn" data-act="roscheer"'+(cw?' disabled':'')+' title="'+cw+'">🎁 특별 격려<small>'+fmtS(ST_CHEER.cost)+' · 사기 +'+ST_CHEER.mo+'</small></button>'+
    '<button class="btn" data-act="rospromo"'+(pw?' disabled':'')+' title="'+pw+'">🎓 직급 승급<small>'+(nx?e.rank+' → '+nx+' · '+fmtS(ST_RANK.cost[r]):'—')+'</small></button></div>'+
    (e.as?'<button class="btn rd-x" data-act="rosdismiss">사임시키기</button>':'');
  var why=!e.role?'건물 관리자는 부교역자와 사역간사·청빙직원만 맡을 수 있어요':(tw&&cw&&pw?'':'');
  if(why)h+='<p class="swhy">'+why+'</p>';
  else if(UI.rosPick){
    var L=S.buildings.filter(function(b){return mgrRole(b)===e.role;}).sort(function(a,b){return (!!MGC[a.id])-(!!MGC[b.id])||a.id-b.id;});
    h+='<div class="rd-pick"><b>맡길 건물</b>'+(L.length?L.map(function(b){var m=mgrOf(b),here=m&&MGB[e.key]===b.id;
      return '<button class="rpk'+(here?' here':'')+(m?'':' open')+'" data-act="rosplace" data-v="'+b.id+'">'+defOf(b).name+'<small>'+(here?'지금 여기':m?m.name+' 담당':'비어 있어요')+'</small></button>';}).join('')+
      (e.at?'<button class="rpk off" data-act="rosplace" data-v="0">배치 해제</button>':''):'<p>이 일을 맡을 건물이 아직 없어요</p>')+'</div>';
  }
  return h+'</div>';
}
function rosterHtml(){
  var tab=UI.scrTab,L=rosList(tab).filter(Boolean),sel=L.filter(function(e){return e.key===UI.rosSel;})[0]||L[0]||null;
  if(sel)UI.rosSel=sel.key;
  var asn=tab==='assoc';
  var head='<div class="rost-h"><span>'+(asn?'부교역자 '+S.assoc.length+' / '+assocSlots()+'명':'직원 '+L.length+'명')+' · 카드를 눌러 육성하세요 <i class="mk in"></i>기른 사람 <i class="mk ex"></i>청빙</span></div>';
  var grid=L.length?'<div class="rost-g">'+L.map(function(e){return rosCardHtml(e,sel&&e.key===sel.key);}).join('')+'</div>':
    '<p class="sempty">'+(asn?'아직 부교역자가 없어요. <b>청빙</b> 탭에서 모셔 오세요.':'아직 직원이 없어요. 성도를 길러 사역간사·장로·권사로 세우거나 <b>청빙</b> 탭에서 직원을 모셔 오세요.')+'</p>';
  return head+'<div class="rost"><div class="rost-l">'+grid+'</div><div class="rost-r">'+rosDetailHtml(sel)+'</div></div>';
}
function rosDone(msg){recalc();save();scrToast(msg,2000);renderScreen();hud(true);}
function scrRosterClick(a,v){
  if(UI.scr!=='roster'||a.indexOf('ros')!==0)return false;
  var e=rosEnt(UI.rosSel||''),why;
  if(a==='rosopen'){UI.rosSel=v;UI.rosPick=false;sfx('click',.4);renderScreen();return true;}
  if(!e)return true;
  if(a==='rospick'){UI.rosPick=!UI.rosPick;sfx('click',.4);renderScreen();return true;}
  if(a==='rosplace'){
    var bid=+v;
    if(!bid){mgrClear(e.at);UI.rosPick=false;rosDone(e.name+'님의 배치를 풀었어요');return true;}
    if(e.at&&e.at!==bid)mgrClear(e.at);
    if(mgrAt(e.key)!==bid){mgrClear(bid);why=mgrSet(bid,e.key);}
    if(why){scrToast(why,2400);sfx('error',.4);return true;}
    UI.rosPick=false;sfx('join',.5,0);rosDone(e.name+'님을 '+defOf(bById(bid)).name+' 관리자로 배치했어요');return true;
  }
  if(a==='rostrain'){
    why=rosWhyTrain(e);if(why){scrToast(why,2400);sfx('error',.4);return true;}
    S.money-=rosCost(e.st.tr);e.st.xp-=ST_TRAIN.xp;e.st.tr++;sfx('coins',.5,0);rosDone(e.name+'님이 직무 교육을 마쳤어요 · 성능 영구 +'+Math.round(ST_TRAIN.k*100)+'%');return true;
  }
  if(a==='roscheer'){
    why=rosWhyCheer(e);if(why){scrToast(why,2400);sfx('error',.4);return true;}
    S.money-=ST_CHEER.cost;e.st.mo=Math.min(100,e.st.mo+ST_CHEER.mo);e.st.xp+=ST_CHEER.xp;sfx('coins',.5,0);rosDone(e.name+'님의 사기가 올랐어요 · '+Math.round(e.st.mo));return true;
  }
  if(a==='rosdismiss'){
    var ai=(S.assoc||[]).findIndex(function(x){return asUid(x)===+e.key.slice(1);});
    if(ai<0||!dismissAssoc(ai)){scrToast('사임할 수 없어요',2000);sfx('error',.4);return true;}
    UI.rosSel=null;rosDone('부교역자가 사임했어요');return true;
  }
  if(a==='rospromo'){
    why=rosWhyPromote(e);if(why){scrToast(why,2400);sfx('error',.4);return true;}
    var r=e.st.rk;S.money-=ST_RANK.cost[r];e.st.rk=r+1;
    if(e.as)e.o.title=ST_RANK.assoc[r+1];
    if(e.pay){var np=Math.round(e.pay*(1+ST_RANK.pay));if(e.as)e.o.pay=np;else e.o.ext.pay=np;}
    sfx('bell',.5,0);rosDone(e.name+'님이 '+e.ladder[r+1]+'(으)로 승급했어요');return true;
  }
  return false;
}
