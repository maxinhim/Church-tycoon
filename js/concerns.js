'use strict';
/* ---------- 성도의 고민과 교회 안의 갈등 ----------
   가끔 성도 한 사람에게 가정·직장·건강·신앙의 고민이 생기거나, 두 성도 사이에 갈등이 생긴다.
   성도 화면의 '고민' 탭과 그 성도의 세부 정보 창에서 여러 선택지 가운데 하나를 고른다.
   · 돈으로 해결하는 길은 늘 있지만 효과가 어중간하다. 교회가 갖춘 것(상담실·구제창고·소그룹·권사·장로·부교역자…)을
     잘 이어 주는 선택이 가장 지혜롭고, 무시하거나 다그치면 마음이 멀어진다(호감 레벨이 떨어지고 떠날 수도 있다)
   · 선택지 순서는 사건마다 섞는다 (늘 첫 번째가 정답이 아니게)
   · 기한(CARE_DUE주) 안에 돌보지 않으면 마음이 멀어진다
   S.cares = [{id,k(종류),a(성도 id),b(갈등 상대 id, 없으면 0),w(생긴 주)}]. 수치는 balance.js CARE_* */
function careHas(ids){return S.buildings.some(function(b){return ids.indexOf(b.def)>=0;});}
function careNode(ids){return (S.people||[]).some(function(p){return ids.indexOf(p.node)>=0;});}
function careKwonsa(){return (S.people||[]).some(function(p){return p.node==='elder'&&p.g==='f';});}
function careElder(){return (S.people||[]).some(function(p){return p.node==='elder'&&p.g==='m';});}
// 결과: 호감 경험치(+)·마음이 멀어짐(레벨 −)·떠남
function ppHurt(p,n){if(!p)return;p.lv=Math.max(1,p.lv-n);p.xp=0;}
function ppLeave(p){
  if(!p)return false;
  S.people=S.people.filter(function(q){return q!==p;});S.members=Math.max(0,S.members-1);
  addLog(p.n+' 성도가 마음이 상해 교회를 떠났어요');return true;
}
// 한 사람에게 결과를 주고 글을 돌려준다: x>0 경험치, x<0 레벨 −x만큼 내려감, leave: 떠날 확률
function careHit(p,x,leave){
  if(!p)return '';
  if(x>0){var up=ppGain(p,x);return p.n+' 호감 +'+x+(up?' (Lv '+p.lv+')':'');}
  if(leave&&Math.random()<leave&&ppLeave(p))return p.n+' 성도가 교회를 떠났어요';
  if(x<0){ppHurt(p,-x);return p.n+' 마음이 멀어졌어요 (Lv '+p.lv+')';}
  return '';
}
function careMoney(v){if(S.money<v)return false;S.money-=v;return true;}
/* 고민의 종류. t: 제목, x: 사연({a}·{b}는 이름). o: 선택지 {l: 고르는 말, d: 짧은 설명, need(): 안 되면 이유, f(a,b): 결과 글}
   pair: 두 사람의 갈등. min: 그 성도의 최소 단계 깊이(봉사에 지친 사람 등) */
var CARES={
  job:{t:'직장을 잃었어요',x:'{a} 성도가 회사에서 갑자기 해고됐어요. 가장이라 앞날이 막막하대요.',o:[
    {l:'교회 안 집사·직원들의 인맥으로 일자리를 이어 준다',d:'집사·장로·교회직원이 있으면',need:function(){return S.off.deacon+S.off.elder+S.off.cstaff>0?'':'집사·장로·교회직원이 있어야 해요';},f:function(a){S.tempMood+=1;return careHit(a,CARE_GOOD)+' · 교우의 소개로 새 일을 찾았어요';}},
    {l:'구제창고로 생필품을 돕고 매주 안부를 묻는다',d:'구제창고가 있으면',need:function(){return careHas(['pantry','foodbank'])?'':'구제창고나 무료 급식소가 있어야 해요';},f:function(a){return careHit(a,CARE_OK+10)+' · 당장의 걱정을 덜었어요';}},
    {l:'생활비를 지원한다',d:'자금 '+fmt(CARE_COST),need:function(){return S.money>=CARE_COST?'':'자금이 부족해요';},f:function(a){careMoney(CARE_COST);return careHit(a,CARE_MONEY)+' · 고마워했지만 막막함은 그대로예요';}},
    {l:'"믿음으로 이겨내세요"라고 권면만 한다',d:'',f:function(a){return careHit(a,-2,.1)+' · 서운해했어요';}}]},
  marriage:{t:'부부 갈등',x:'{a} 성도 가정에 부부 싸움이 잦아 이혼 이야기까지 나와요.',o:[
    {l:'상담실에서 부부 상담을 연다',d:'상담실이 있으면',need:function(){return careHas(['counsel'])?'':'상담실이 있어야 해요';},f:function(a){S.tempMood+=1;return careHit(a,CARE_GOOD)+' · 서로의 마음을 알게 됐어요';}},
    {l:'권사님께 함께 기도하며 들어 달라고 맡긴다',d:'권사가 있으면',need:function(){return careKwonsa()?'':'권사가 있어야 해요';},f:function(a){return careHit(a,CARE_OK+10)+' · 권사님의 기도에 위로받았어요';}},
    {l:'목사님이 직접 심방해 양쪽 이야기를 듣는다',d:'자금 '+fmt(PP_VISIT.cost),need:function(){return S.money>=PP_VISIT.cost?'':'자금이 부족해요';},f:function(a){careMoney(PP_VISIT.cost);return careHit(a,CARE_OK)+' · 조금 누그러졌어요';}},
    {l:'한쪽 편을 들어 조언한다',d:'',f:function(a){S.tempMood-=1;return careHit(a,-1,.15)+' · 오히려 더 상처받았어요';}}]},
  kids:{t:'자녀 문제',x:'{a} 성도의 사춘기 자녀가 교회에 안 나오겠다고 해요.',o:[
    {l:'청년부실·어린이부실에서 또래 친구를 붙여 준다',d:'청년부실이나 어린이부실이 있으면',need:function(){return careHas(['youth','kids','study'])?'':'청년부실·어린이부실·공부방이 있어야 해요';},f:function(a){return careHit(a,CARE_GOOD)+' · 아이가 친구 따라 다시 나와요';}},
    {l:'소그룹 리더에게 그 가정을 맡긴다',d:'소그룹 리더 이상이 있으면',need:function(){return careNode(['sgl','cml','kanji','seminary'])?'':'소그룹 리더가 있어야 해요';},f:function(a){return careHit(a,CARE_OK+10)+' · 리더가 아이와 친해졌어요';}},
    {l:'용돈을 주고 데려오게 한다',d:'자금 '+fmt(CARE_COST/3),need:function(){return S.money>=CARE_COST/3?'':'자금이 부족해요';},f:function(a){careMoney(CARE_COST/3);return careHit(a,CARE_MONEY/2)+' · 잠깐 나왔다가 다시 안 나와요';}},
    {l:'억지로라도 데려오라고 한다',d:'',f:function(a){return careHit(a,-1)+' · 집안 분위기가 더 나빠졌어요';}}]},
  health:{t:'가족의 병환',x:'{a} 성도의 어머니가 큰 수술을 앞두고 있어요.',o:[
    {l:'의료 봉사실과 이어 병원 안내를 돕는다',d:'의료 봉사실이 있으면',need:function(){return careHas(['clinic'])?'':'의료 봉사실이 있어야 해요';},f:function(a){return careHit(a,CARE_GOOD)+' · 든든하다며 눈물을 흘렸어요';}},
    {l:'중보기도팀에 기도 제목을 나눈다',d:'중보기도팀이 있으면',need:function(){return S.staff.prayer>0?'':'중보기도팀이 있어야 해요';},f:function(a){S.tempMood+=1;return careHit(a,CARE_OK+10)+' · 온 교회가 함께 기도했어요';}},
    {l:'병원 심방을 가서 함께 기도한다',d:'자금 '+fmt(PP_VISIT.cost),need:function(){return S.money>=PP_VISIT.cost?'':'자금이 부족해요';},f:function(a){careMoney(PP_VISIT.cost);return careHit(a,CARE_OK)+' · 큰 위로가 됐어요';}},
    {l:'바빠서 문자만 보낸다',d:'',f:function(a){return careHit(a,-1)+' · 서운해했어요';}}]},
  doubt:{t:'신앙의 회의',x:'{a} 성도가 기도해도 응답이 없다며 신앙에 회의를 느껴요.',o:[
    {l:'성경공부방에서 함께 말씀을 읽자고 이끈다',d:'성경공부방이 있으면',need:function(){return careHas(['bible','mission','books'])?'':'성경공부방·선교관·북카페가 있어야 해요';},f:function(a){return careHit(a,CARE_GOOD)+' · 말씀 안에서 다시 힘을 얻었어요';}},
    {l:'부교역자에게 1:1 양육을 맡긴다',d:'부교역자가 있으면',need:function(){return S.assoc.length?'':'부교역자가 있어야 해요';},f:function(a){return careHit(a,CARE_OK+10)+' · 마음을 열고 이야기했어요';}},
    {l:'좋은 신앙 서적을 선물한다',d:'자금 '+fmt(PP_GIFT.cost),need:function(){return S.money>=PP_GIFT.cost?'':'자금이 부족해요';},f:function(a){careMoney(PP_GIFT.cost);return careHit(a,CARE_MONEY)+' · 고맙다고 했지만 아직 마음이 무거워요';}},
    {l:'"기도가 부족해서 그래요"라고 말한다',d:'',f:function(a){return careHit(a,-2,.25)+' · 크게 상처받았어요';}}]},
  burnout:{t:'봉사에 지침',min:4,x:'{a}님이 여러 봉사를 맡아 너무 지쳤다고 털어놔요.',o:[
    {l:'일을 나눠 맡을 섬김이를 세워 짐을 덜어 준다',d:'섬김 갈래 성도가 둘 이상이면',need:function(){return (S.people||[]).filter(function(p){return ppTrack(p)==='C';}).length>=2?'':'섬김이·사역팀장 등이 두 명 이상 있어야 해요';},f:function(a){S.tempMood+=1;return careHit(a,CARE_GOOD)+' · 다시 기쁨으로 섬겨요';}},
    {l:'한 달 쉬게 하고 안부를 묻는다',d:'',f:function(a){return careHit(a,CARE_OK)+' · 쉼을 얻고 돌아왔어요';}},
    {l:'수고비를 드린다',d:'자금 '+fmt(CARE_COST),need:function(){return S.money>=CARE_COST?'':'자금이 부족해요';},f:function(a){careMoney(CARE_COST);return careHit(a,CARE_MONEY)+' · 돈보다 쉼이 필요했어요';}},
    {l:'조금만 더 힘내 달라고 한다',d:'',f:function(a){return careHit(a,-2,.15)+' · 지쳐서 마음이 닫혔어요';}}]},
  debt:{t:'빚 문제',x:'{a} 성도가 사업 실패로 빚에 시달리고 있어요.',o:[
    {l:'살림에 밝은 장로님께 상담을 부탁한다',d:'장로가 있으면',need:function(){return careElder()?'':'장로가 있어야 해요';},f:function(a){return careHit(a,CARE_GOOD)+' · 갚아 갈 길이 보였어요';}},
    {l:'구제창고와 이웃의 도움을 이어 준다',d:'구제창고가 있으면',need:function(){return careHas(['pantry','foodbank'])?'':'구제창고나 무료 급식소가 있어야 해요';},f:function(a){return careHit(a,CARE_OK+5)+' · 숨 돌릴 틈이 생겼어요';}},
    {l:'교회 돈을 빌려준다',d:'자금 '+fmt(CARE_COST*2),need:function(){return S.money>=CARE_COST*2?'':'자금이 부족해요';},f:function(a){careMoney(CARE_COST*2);return careHit(a,CARE_MONEY)+' · 고마워했지만 빚은 여전해요';}},
    {l:'헌금 생활을 더 열심히 하라고 한다',d:'',f:function(a){return careHit(a,-2,.3)+' · 상처받았어요';}}]},
  lonely:{t:'외로움',x:'혼자 사는 {a} 성도가 교회에서 마음 나눌 친구가 없다며 외로워해요.',o:[
    {l:'소그룹에 이어 준다',d:'소그룹실이나 소그룹 리더가 있으면',need:function(){return careHas(['cell'])||careNode(['sgl','cml','kanji'])?'':'소그룹실이나 소그룹 리더가 있어야 해요';},f:function(a){return careHit(a,CARE_GOOD)+' · 함께할 사람들이 생겼어요';}},
    {l:'교제실·카페에서 차 한잔 하자고 초대한다',d:'교제 공간이 있으면',need:function(){return careHas(['hall','cafe','books','dining','mfel'])?'':'교제실·카페·북카페·식당이 있어야 해요';},f:function(a){return careHit(a,CARE_OK+5)+' · 즐거운 시간을 보냈어요';}},
    {l:'선물을 보낸다',d:'자금 '+fmt(PP_GIFT.cost),need:function(){return S.money>=PP_GIFT.cost?'':'자금이 부족해요';},f:function(a){careMoney(PP_GIFT.cost);return careHit(a,CARE_MONEY)+' · 고마웠지만 여전히 혼자예요';}},
    {l:'다들 바쁘니 이해해 달라고 한다',d:'',f:function(a){return careHit(a,-1,.15)+' · 더 외로워졌어요';}}]},
  // 두 사람의 갈등
  seat:{pair:1,t:'봉사 순서 다툼',x:'{a} 성도와 {b} 성도가 봉사 순서 문제로 크게 다퉜어요.',o:[
    {l:'공동체 리더나 장로에게 중재를 맡긴다',d:'공동체 리더·간사·장로가 있으면',need:function(){return careNode(['cml','kanji','seminary'])||careElder()?'':'공동체 리더·간사·장로가 있어야 해요';},f:function(a,b){S.tempMood+=1;return careHit(a,CARE_GOOD)+' · '+careHit(b,CARE_GOOD)+' · 서로 사과했어요';}},
    {l:'두 사람을 함께 만나 서로 이야기를 듣게 한다',d:'',f:function(a,b){return careHit(a,CARE_OK)+' · '+careHit(b,CARE_OK)+' · 오해가 풀렸어요';}},
    {l:'오래 다닌 {a} 성도 편을 든다',d:'',f:function(a,b){return careHit(a,CARE_MONEY)+' · '+careHit(b,-2,.3);}},
    {l:'모른 척한다',d:'',f:function(a,b){S.tempMood-=3;return careHit(a,-1)+' · '+careHit(b,-1)+' · 교회 분위기가 무거워졌어요';}}]},
  offering:{pair:1,t:'헌금 사용 불만',x:'{a} 성도가 헌금을 어디에 쓰는지 모르겠다고 공개적으로 불만을 말했고, {b} 성도가 맞서 다툼이 났어요.',o:[
    {l:'재정 보고를 투명하게 공개한다',d:'',f:function(a,b){gainRep(1);return careHit(a,CARE_OK+5)+' · '+careHit(b,CARE_OK)+' · 신뢰가 깊어졌어요';}},
    {l:'교회직원·사역부장에게 설명을 맡긴다',d:'교회직원이나 사역부장이 있으면',need:function(){return careNode(['cstaff','dlead'])?'':'교회직원이나 사역부장이 있어야 해요';},f:function(a,b){S.tempMood+=1;return careHit(a,CARE_GOOD)+' · '+careHit(b,CARE_OK+5)+' · 자세한 설명에 모두 수긍했어요';}},
    {l:'불만을 말한 {a} 성도를 꾸짖는다',d:'',f:function(a,b){return careHit(a,-2,.35)+' · '+careHit(b,CARE_MONEY);}},
    {l:'모른 척한다',d:'',f:function(a,b){S.tempMood-=3;gainRep(-1);return careHit(a,-1)+' · 뒷말이 퍼졌어요';}}]},
  style:{pair:1,t:'예배 방식 갈등',x:'{a} 성도는 찬양을 더 현대적으로, {b} 성도는 전통 찬송을 원해 의견이 갈렸어요.',o:[
    {l:'찬양팀과 함께 두 가지를 섞은 순서를 만든다',d:'찬양팀이 있으면',need:function(){return S.staff.praise>0?'':'찬양팀이 있어야 해요';},f:function(a,b){return careHit(a,CARE_GOOD)+' · '+careHit(b,CARE_GOOD)+' · 모두 만족했어요';}},
    {l:'예배 공간을 나눠 시간마다 다르게 드린다',d:'예배 공간이 둘 이상이면',need:function(){return S.buildings.filter(isHall).length>=2?'':'예배 공간이 두 곳 이상 있어야 해요';},f:function(a,b){return careHit(a,CARE_OK+5)+' · '+careHit(b,CARE_OK+5);}},
    {l:'다수결로 정한다',d:'',f:function(a,b){return careHit(a,CARE_MONEY)+' · '+careHit(b,-1,.15);}},
    {l:'지금대로 둔다',d:'',f:function(a,b){S.tempMood-=2;return careHit(a,-1)+' · '+careHit(b,-1);}}]},
  gossip:{pair:1,t:'뒷말',x:'{b} 성도가 {a} 성도에 대한 뒷말을 퍼뜨려 {a} 성도가 크게 상처받았어요.',o:[
    {l:'{b} 성도를 따로 만나 권면하고 사과하도록 돕는다',d:'',f:function(a,b){return careHit(a,CARE_OK+10)+' · '+careHit(b,CARE_OK)+' · 화해했어요';}},
    {l:'권사님께 두 사람을 맡긴다',d:'권사가 있으면',need:function(){return careKwonsa()?'':'권사가 있어야 해요';},f:function(a,b){S.tempMood+=1;return careHit(a,CARE_GOOD)+' · '+careHit(b,CARE_GOOD)+' · 함께 기도하며 화해했어요';}},
    {l:'광고 시간에 공개적으로 경고한다',d:'',f:function(a,b){S.tempMood-=1;return careHit(a,CARE_MONEY)+' · '+careHit(b,-2,.35);}},
    {l:'모른 척한다',d:'',f:function(a,b){return careHit(a,-2,.3)+' · '+careHit(b,0);}}]}
};
function careById(id){var L=S.cares||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
function careOf(p){var L=S.cares||[];for(var i=0;i<L.length;i++)if(L[i].a===p.id||L[i].b===p.id)return L[i];return null;}
function caresCount(){return (S.cares||[]).length;}
function careText(c,s){var a=ppById(c.a),b=ppById(c.b);return s.replace(/\{a\}/g,a?a.n:'').replace(/\{b\}/g,b?b.n:'');}
// 선택지 순서: 사건마다 섞되, 같은 사건은 늘 같은 순서
function careOrder(c){var n=CARES[c.k].o.length,ix=[];for(var i=0;i<n;i++)ix.push(i);return ix.sort(function(x,y){return ppRand(c.id*7+x,3)-ppRand(c.id*7+y,3);});}
// 한 주가 끝나면: 오래 둔 고민은 마음이 멀어지고, 새 고민이 생길 수 있다
function caresWeek(){
  if(!S.cares)S.cares=[];if(!S.careId)S.careId=1;
  S.cares=S.cares.filter(function(c){
    var a=ppById(c.a),b=c.b?ppById(c.b):null;
    if(!a||(c.b&&!b))return false;          // 떠난 사람의 고민은 사라진다
    if(S.week-c.w<CARE_DUE)return true;
    careHit(a,-2,CARE_LEAVE);if(b)careHit(b,-1);S.tempMood-=CARE_IGNORE_MOOD;
    addLog(CARES[c.k].t+' · 돌보지 못해 마음이 멀어졌어요');return false;
  });
  var P=(S.people||[]).filter(function(p){return !careOf(p);});
  if(P.length<CARE_MIN_MEM||S.cares.length>=CARE_MAX)return;
  if(Math.random()>=Math.min(CARE_P_MAX,S.members*CARE_P_PER))return;
  var ks=Object.keys(CARES).filter(function(k){var t=CARES[k];if(t.pair&&P.length<CARE_MIN_MEM+2)return false;return !t.min||P.some(function(p){return ppDepth(p)>=t.min;});});
  var k=ks[Math.floor(Math.random()*ks.length)],t=CARES[k];
  var pool=t.min?P.filter(function(p){return ppDepth(p)>=t.min;}):P;
  var a=pool[Math.floor(Math.random()*pool.length)],b=0;
  if(t.pair){var rest=P.filter(function(p){return p!==a;});b=rest[Math.floor(Math.random()*rest.length)].id;}
  var c={id:S.careId++,k:k,a:a.id,b:b,w:S.week};S.cares.push(c);
  toast((t.pair?'갈등 · ':'고민 · ')+careText(c,t.pair?'{a}·{b} 성도':'{a} 성도')+' — '+t.t+' · 성도 화면에서 돌봐 주세요',3200);
  addLog((t.pair?'갈등 · ':'고민 · ')+careText(c,'{a}'+(b?'·{b}':''))+' — '+t.t);
}
// 선택지가 지금 안 되는 까닭 ('' = 할 수 있음)
function careWhy(c,i){var o=CARES[c.k].o[i];return o&&o.need?o.need():'';}
// 고르면 결과 글을 돌려준다 (못 고르면 null)
function careChoose(id,i){
  var c=careById(id);if(!c)return null;var t=CARES[c.k],o=t.o[i];if(!o||careWhy(c,i))return null;
  var a=ppById(c.a),b=c.b?ppById(c.b):null,r=o.f(a,b);
  S.cares=S.cares.filter(function(q){return q!==c;});
  addLog(t.t+' · '+careText(c,o.l));recalc();save();
  return r;
}
// 세부 정보 창에 넣는 고민 칸
function concernBlock(p){
  var c=careOf(p);if(!c)return '';var t=CARES[c.k],left=Math.max(0,CARE_DUE-(S.week-c.w));
  return '<div class="scare"><div class="sct2"><b>'+(t.pair?'갈등 · ':'고민 · ')+t.t+'</b><span>'+(left?left+'주 안에 돌봐 주세요':'이번 주가 지나면 마음이 멀어져요')+'</span></div><p>'+careText(c,t.x)+'</p><div class="scopts">'+
    careOrder(c).map(function(i){var o=t.o[i],w=careWhy(c,i);return '<button class="btn" data-act="carepick" data-v="'+c.id+'" data-i="'+i+'"'+(w?' disabled title="'+w+'"':'')+'><b>'+careText(c,o.l)+'</b>'+(w?'<small class="bad">'+w+'</small>':(o.d?'<small>'+o.d+'</small>':''))+'</button>';}).join('')+'</div></div>';
}
