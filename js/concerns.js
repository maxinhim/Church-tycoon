'use strict';
/* ---------- 성도의 고민과 교회 안의 갈등 ----------
   가끔 성도 한 사람에게 가정·직장·건강·신앙의 고민이 생기거나, 두 성도 사이에 갈등이 생긴다.
   성도 화면의 '고민' 탭과 그 성도의 세부 정보 창에서 선택지 넷 가운데 하나를 고른다.
   · 고민마다 사연이 두 가지씩 있고(c.v), 사연 속 단서에 맞는 선택은 단 하나다. 나머지 셋은 그럴듯하지만
     그 사람의 속사정을 놓친 길이라 마음이 멀어지고(호감 레벨 −) 떠날 수도 있다. 돈으로 덮는 길도 정답이 아니다
   · 정답은 자금이 들지 않아 언제든 고를 수 있다 (교회가 갖춘 것에 막혀 못 푸는 일이 없게)
   · 선택지 순서는 사건마다 섞는다 (늘 첫 번째가 정답이 아니게). 선택에 따라 결과 글이 달라진다
   · 기한(CARE_DUE주) 안에 돌보지 않으면 마음이 멀어진다
   S.cares = [{id,k(종류),v(사연 번호),a(성도 id),b(갈등 상대 id, 없으면 0),w(생긴 주)}]. 수치는 balance.js CARE_* */
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
/* 고민의 종류. t: 제목, pair: 두 사람의 갈등, min: 그 성도의 최소 단계 깊이(봉사에 지친 사람 등),
   s: 사연들 [{x: 사연({a}·{b}는 이름), o: 선택지 넷}]
   선택지: cGood(말, 결과 글) = 정답, cBad(말, 결과 글, 레벨 −, 떠날 확률, 드는 자금, 분위기 −) = 오답.
   갈등(pair)의 오답은 레벨·떠날 확률을 [a, b] 둘로 준다 */
function cGood(l,r,c){return {l:l,r:r,ok:1,cost:c||0};}
function cBad(l,r,lv,leave,c,mood){return {l:l,r:r,ok:0,lv:lv,leave:leave||0,cost:c||0,mood:mood||0};}
var CARES={
  job:{t:'직장을 잃었어요',s:[
    {x:'{a} 성도가 회사 구조조정으로 해고됐어요. 가장인데 아직 가족에게는 말하지 못하고 혼자 끙끙 앓아요.',o:[
      cGood('먼저 조용히 만나 이야기를 들어 주고, 가족에게 함께 알릴 방법을 의논한다','마음의 짐을 덜고 가족에게 털어놓을 용기를 얻었어요.'),
      cBad('교회 일자리 게시판에 바로 소개해 준다','아직 마음의 준비가 안 됐는데 소문이 날까 부담스러워했어요.',1),
      cBad('생활비를 넉넉히 지원한다','자존심이 상해 받기를 불편해했어요.',1,0,CARE_COST),
      cBad('온 교회가 함께 기도하도록 기도 제목으로 나눈다','숨기고 싶던 일이 퍼져 수치스러워했어요.',2,.1)]},
    {x:'{a} 성도가 해고된 뒤 매일 일자리를 찾아 헤매다 지쳐 보여요. 이력서는 이미 수십 곳에 넣었대요.',o:[
      cGood('교우들의 인맥을 따로 알아봐 믿을 만한 자리를 소개한다','사람을 통한 소개로 면접 기회를 얻었어요.'),
      cBad('자격증 교육비를 지원한다','이미 갖춘 자격이라 도움이 되지 않았어요.',1,0,CARE_COST),
      cBad('당분간 쉬면서 하나님께 맡기라고 권한다','시간만 흘러 더 초조해했어요.',1),
      cBad('교회 봉사를 맡겨 바쁘게 지내게 한다','일자리 찾을 시간을 뺏겼다며 서운해했어요.',2,.08)]}]},
  marriage:{t:'부부 갈등',s:[
    {x:'{a} 성도 부부가 자주 다퉈요. 남편은 ‘아내가 내 말을 안 듣는다’, 아내는 ‘남편이 집안일엔 관심이 없다’고 따로 하소연해요.',o:[
      cGood('양쪽 이야기를 각각 충분히 들은 뒤, 함께 앉아 서로의 마음을 말하도록 돕는다','서로의 서운함을 처음으로 제대로 들었어요.'),
      cBad('{a} 성도 편에서 상대에게 따끔하게 말한다','한쪽 편만 든다는 느낌에 더 상처받았어요.',1,.1,0,1),
      cBad('부부 세미나 신청서를 건네며 가 보라고 한다','떠넘긴다는 생각에 서운해했어요.',1),
      cBad('참고 기도하면 해결된다고 말한다','문제를 외면당한 듯 마음이 닫혔어요.',2,.15)]},
    {x:'{a} 성도 부부가 오래 별거 중이래요. 이혼을 마음먹은 듯하다며 마지막으로 상의하고 싶어해요.',o:[
      cGood('결정을 대신하지 않고, 이혼 전에 전문 상담을 받아 보도록 곁에서 함께한다','서두르지 않고 충분히 생각해 보기로 했어요.'),
      cBad('교회 가르침대로 이혼은 안 된다고 단호하게 말한다','판단받는 것 같아 입을 닫았어요.',2,.2),
      cBad('본인이 편한 쪽으로 정하라고 한다','외면당한 것 같아 외로워했어요.',1),
      cBad('배우자를 먼저 불러 설득하겠다고 나선다','허락 없이 나섰다며 화를 냈어요.',2,.15)]}]},
  kids:{t:'자녀 문제',s:[
    {x:'{a} 성도의 중학생 아들이 ‘교회가 재미없다’며 주일마다 안 나오려 해요.',o:[
      cGood('아이를 혼내지 않고 무엇이 힘든지 먼저 들어 본 뒤, 또래 모임에서 맡을 역할을 줘 본다','자기 얘기를 들어 주자 조금씩 마음을 열었어요.'),
      cBad('예배에 안 오면 용돈을 끊으라고 조언한다','집안 분위기만 험해졌어요.',1),
      cBad('청소년부 교사에게 강하게 지도해 달라고 부탁한다','아이가 더 반발하며 교회를 멀리해요.',2,.1),
      cBad('크면 돌아올 테니 지켜만 보자고 한다','부모가 혼자 외롭게 버티게 됐어요.',1)]},
    {x:'{a} 성도의 초등학생 딸이 학교에서 따돌림을 당해 위축돼 있어요.',o:[
      cGood('부모와 함께 학교 상담 교사에게 알리도록 돕고, 교회가 아이에게 안전한 곳이 되게 곁을 지킨다','학교와 가정이 함께 움직이자 아이가 안심했어요.'),
      cBad('‘원수를 사랑하라’며 참고 용서하라고 가르친다','아이가 더 입을 다물었어요.',2,.1),
      cBad('아이를 전학시키라고 권한다','문제를 피하기만 한다며 부모가 망설였어요.',1),
      cBad('교회 이름으로 가해 아이 부모에게 연락한다','일이 커져 가족이 곤란해졌어요.',2,.15)]}]},
  health:{t:'가족의 병환',s:[
    {x:'{a} 성도의 어머니가 큰 수술을 앞두고 있어요. 직장 때문에 병원에 자주 가지 못해 미안해해요.',o:[
      cGood('수술 날짜에 맞춰 교우들이 병원 방문과 식사를 돌아가며 맡도록 조율한다','든든한 손길이 이어져 마음의 짐을 덜었어요.'),
      cBad('병원비를 지원한다','돈 걱정이 아니라 곁을 지킬 사람이 필요했어요.',1,0,CARE_COST),
      cBad('기도하면 다 나을 거라고 확신 있게 말한다','현실의 불안을 가볍게 여겨 서운해했어요.',1),
      cBad('직장을 쉬고 어머니 곁을 지키라고 권한다','생계가 걸린 일이라 마음이 더 무거워졌어요.',2,.1)]},
    {x:'{a} 성도의 남편이 암 진단을 받고 치료 중이에요. 성도는 ‘왜 하필 우리냐’며 하나님께 화가 났다고 털어놓아요.',o:[
      cGood('원망하는 마음도 괜찮다고 받아 주며 말없이 곁에서 들어 준다','마음껏 울고 나서 다시 기도할 힘을 찾았어요.'),
      cBad('욥기를 읽어 주며 고난의 의미를 설명한다','설명이 아니라 위로가 필요했는데 서운해했어요.',1),
      cBad('원망은 불신앙이니 회개하자고 권한다','죄책감까지 얹혀 더 무너졌어요.',2,.2),
      cBad('투병 후원금 모금부터 시작한다','마음은 못 알아주고 일만 앞세웠다고 느꼈어요.',1)]}]},
  doubt:{t:'신앙의 회의',s:[
    {x:'{a} 성도가 ‘요즘은 기도해도 응답이 없는 것 같고 예배가 형식 같다’고 털어놔요.',o:[
      cGood('질문을 막지 않고 진솔하게 들은 뒤, 함께 말씀을 읽어 보자고 제안한다','마음속 질문을 꺼내 놓을 곳이 생겼어요.'),
      cBad('기도가 부족해서 그렇다고 말한다','자신을 탓하게 돼 더 위축됐어요.',2,.2),
      cBad('좋은 신앙 서적을 선물한다','읽지도 않은 채 책장에 꽂아 뒀어요.',1,0,PP_GIFT.cost),
      cBad('교리공부 행사에 나오게 한다','숙제처럼 느껴져 부담스러워했어요.',1)]},
    {x:'{a} 성도가 인터넷에서 본 글 때문에 성경의 사실성에 의문을 갖고 있어요.',o:[
      cGood('논쟁하지 않고 진지하게 받아들이며, 함께 공부할 자리를 만들겠다고 약속한다','무시당하지 않았다는 것만으로 마음이 놓였어요.'),
      cBad('답을 아는 장로님을 불러 그 자리에서 논리로 설득한다','몰아세운다고 느껴 마음을 닫았어요.',2,.15),
      cBad('그런 글은 읽지 말라고 말한다','의심만 더 깊어졌어요.',1),
      cBad('신앙 서적을 선물한다','질문에 답해 주는 사람이 없다며 서운해했어요.',1,0,PP_GIFT.cost)]}]},
  burnout:{t:'봉사에 지침',min:4,s:[
    {x:'{a}님이 주방·주차·찬양팀을 모두 맡아 요즘은 예배가 오히려 힘들다고 해요. 그래도 ‘내가 빠지면 안 된다’고 해요.',o:[
      cGood('역할 하나를 내려놓게 돕고, 그 자리를 이어받을 사람을 함께 세운다','짐을 덜자 다시 기쁨으로 섬길 수 있었어요.'),
      cBad('한 달 동안 모든 봉사에서 빼 준다','필요 없는 사람이 된 것 같아 상처받았어요.',1),
      cBad('수고비를 드린다','돈이 아니라 쉼과 인정이 필요했어요.',1,0,CARE_COST),
      cBad('조금만 더 힘내 달라고 부탁한다','지쳐서 마음이 더 닫혔어요.',2,.15)]},
    {x:'{a}님이 봉사 중 작은 실수로 여러 사람 앞에서 질책을 받은 뒤 의욕을 잃고 말수가 줄었어요.',o:[
      cGood('따로 조용히 만나 마음을 들어 주고, 그 자리의 질책이 지나쳤음을 인정해 준다','자신의 마음을 알아주자 눈물을 보이며 풀렸어요.'),
      cBad('질책한 사람과 함께 만나 그 자리에서 사과하게 한다','준비 없이 마주해 더 어색해졌어요.',1),
      cBad('한동안 봉사를 쉬게 한다','쫓겨난 것 같다며 서운해했어요.',1),
      cBad('작은 선물로 격려한다','선물로 덮으려 한다는 느낌을 받았어요.',1,0,PP_GIFT.cost)]}]},
  debt:{t:'빚 문제',s:[
    {x:'{a} 성도가 사업 실패로 큰 빚을 졌고 독촉에 시달려요. 아직 교회에는 거의 말하지 않았대요.',o:[
      cGood('신뢰할 만한 재정 전문 성도와 함께 빚 목록을 정리하고 상환 계획을 세우도록 돕는다','할 수 있는 일이 보이자 한숨 돌렸어요.'),
      cBad('교회 돈을 빌려준다','빚만 하나 더 늘어 부담이 커졌어요.',1,0,CARE_COST*2),
      cBad('헌금 생활을 더 열심히 하라고 권한다','형편은 외면한 말이라 크게 상처받았어요.',2,.25),
      cBad('소문이 나지 않게 기도만 하라고 한다','혼자 짊어지다 더 지쳤어요.',1)]},
    {x:'{a} 성도가 빚을 갚으려고 급히 ‘고수익 투자’에 돈을 넣으려 해요. 교회 사람들에게도 권해 볼 생각이래요.',o:[
      cGood('투자의 위험을 차분히 짚어 주고, 결정 전에 전문가에게 함께 확인해 보자고 제안한다','한 걸음 물러서 다시 따져 보기로 했어요.'),
      cBad('믿음으로 결정하라며 기도해 보라고 한다','위험을 모른 채 서둘러 돈을 넣고 말았어요.',2,.1),
      cBad('교회 안에서는 권하지 말라고만 못 박는다','자기는 막지 못한 채 서운해했어요.',1),
      cBad('필요한 돈을 대신 빌려준다','빚을 돌려막는 사이 더 위험해졌어요.',1,0,CARE_COST*2)]}]},
  lonely:{t:'외로움',s:[
    {x:'혼자 사는 {a} 성도가 주일엔 인사를 나누지만 평일엔 말할 사람이 없다고 해요.',o:[
      cGood('평일에도 만나는 작은 모임에 직접 함께 가자고 손을 이끈다','처음 나간 모임에서 웃음을 되찾았어요.'),
      cBad('행사마다 봉사를 맡겨 바쁘게 지내게 한다','일만 늘고 마음 나눌 사람은 여전히 없었어요.',1),
      cBad('선물을 보낸다','고마웠지만 여전히 혼자라고 느꼈어요.',1,0,PP_GIFT.cost),
      cBad('먼저 다가가 보라고 권한다','용기가 없는데 떠미는 것 같아 더 움츠러들었어요.',1)]},
    {x:'새로 등록한 {a} 성도가 아는 사람이 없어 예배가 끝나면 서둘러 돌아가요. ‘이미 친한 사람들끼리 모인 것 같다’고 해요.',o:[
      cGood('비슷한 처지의 성도 한두 명에게 먼저 인사시키고 식사를 같이 하도록 자리를 만든다','부담 없는 자리에서 첫 친구를 사귀었어요.'),
      cBad('새가족 환영 시간에 모두 앞에서 소개한다','쑥스러워 얼굴이 빨개져 더 위축됐어요.',1),
      cBad('소그룹 명단에 이름부터 올려 둔다','묻지도 않고 정했다며 부담스러워했어요.',1),
      cBad('시간이 지나면 자연스러워질 거라며 둔다','아무도 신경 쓰지 않는다고 느꼈어요.',2,.2)]}]},
  // 두 사람의 갈등
  seat:{pair:1,t:'봉사 순서 다툼',s:[
    {x:'{a} 성도와 {b} 성도가 주일 봉사 순서를 두고 다퉜어요. {a}는 오래 섬겼는데 밀렸다고, {b}는 늘 힘든 순서만 맡는다고 해요.',o:[
      cGood('각자 사정을 들어 보고, 순서를 돌아가며 공정하게 정하는 규칙을 함께 세운다','불만이 풀리고 규칙에 모두 수긍했어요.'),
      cBad('오래 섬긴 {a} 성도 편을 든다','{b} 성도가 차별받았다며 크게 서운해했어요.',[0,2],[0,.3]),
      cBad('목사님이 순서를 일방적으로 정해 버린다','두 사람 모두 말할 기회가 없었다며 불쾌해했어요.',[1,1]),
      cBad('두 사람 모두 봉사를 쉬게 한다','일손은 줄고 감정은 그대로 남았어요.',[1,1],0,0,1)]},
    {x:'{a} 성도와 {b} 성도가 주차 봉사 자리를 두고 언성을 높였어요. 둘 다 ‘내가 먼저 맡았다’고 해요.',o:[
      cGood('그동안의 사정을 같이 확인하고, 두 사람이 각자 맡을 자리를 나눠 준다','각자 인정받는 자리가 생겨 화해했어요.'),
      cBad('나이 많은 성도를 존중해 양보하라고 한다','양보한 쪽만 속상해졌어요.',[0,1]),
      cBad('제비를 뽑아 정한다','진 쪽이 억울해하며 뒤끝이 남았어요.',[1,1]),
      cBad('두 사람 모두 사과하라고 한다','누가 옳은지 가리지 않아 둘 다 불쾌했어요.',[1,1],0,0,1)]}]},
  offering:{pair:1,t:'헌금 사용 불만',s:[
    {x:'{a} 성도가 헌금이 어디에 쓰이는지 모르겠다며 공개적으로 따졌고, {b} 성도가 ‘교회를 의심하느냐’며 맞섰어요.',o:[
      cGood('재정 내역을 정리해 두 사람이 함께 보는 자리에서 투명하게 설명한다','숫자를 같이 보며 오해가 풀렸어요.'),
      cBad('{a} 성도를 따로 불러 조용히 하라고 말한다','입막음당한 것 같아 신뢰가 깨졌어요.',[2,0],[.25,0]),
      cBad('{b} 성도에게 사과하게 하고 {a}의 불만은 덮는다','문제는 그대로인 채 {a} 성도가 마음을 닫았어요.',[2,1],[.2,0]),
      cBad('주보에 감사의 말씀만 싣는다','핵심을 피한다며 두 사람 다 더 불만이 커졌어요.',[1,1],0,0,1)]},
    {x:'{a} 성도가 건축 헌금 사용 내역 중 일부가 비어 있다고 지적했고, {b} 성도는 ‘그 정도는 목사님 재량’이라고 해요.',o:[
      cGood('빈 항목을 먼저 확인해 사실대로 밝히고, 앞으로의 보고 방식을 함께 정한다','잘못이 있으면 고치겠다는 모습에 신뢰가 깊어졌어요.'),
      cBad('확인되지 않은 부분은 오해라고만 설명한다','근거 없이 덮으려 한다며 의심이 커졌어요.',[2,0],[.2,0]),
      cBad('재정에 관여하지 않는 성도는 몰라도 된다고 선을 긋는다','소통을 막는다며 두 사람 모두 불쾌해했어요.',[2,1],[.15,0]),
      cBad('재정위원을 따로 세워 지켜보게 한다','서로를 감시한다는 분위기가 번졌어요.',[1,1],0,0,1)]}]},
  style:{pair:1,t:'예배 방식 갈등',s:[
    {x:'{a} 성도는 찬양을 현대적으로 바꾸자고, {b} 성도는 전통 찬송을 지키자고 해서 감정이 상했어요.',o:[
      cGood('두 입장의 이유를 듣고, 순서마다 섞어 보는 시범 기간을 두어 의견을 모은다','서로의 이유를 알게 되자 한발씩 물러났어요.'),
      cBad('다수결로 정한다','진 쪽이 소외감을 느끼고 마음이 식었어요.',[0,2],[0,.25]),
      cBad('예배 시간을 나눠 각자 원하는 방식으로 드리게 한다','공동체가 갈라진다며 오히려 갈등이 커졌어요.',[1,1]),
      cBad('목사님이 전통을 지키라고 정해 버린다','{a} 성도가 무시당했다고 느꼈어요.',[2,0],[.2,0])]},
    {x:'{a} 성도가 예배 때 악기 소리가 너무 크다고 불평했고, {b} 성도는 ‘은혜가 안 되면 오지 마라’고 맞받았어요.',o:[
      cGood('음량 기준을 함께 정하고 두 사람이 같이 소리를 점검해 본다','같이 조정해 보며 서로의 말이 풀렸어요.'),
      cBad('{b} 성도의 말이 심했으니 사과부터 요구한다','일의 원인은 그대로인 채 {b} 성도가 억울해했어요.',[0,2],[0,.2]),
      cBad('{a} 성도의 취향이니 이해하라고 한다','불편은 무시당한 채 {a} 성도가 서운해했어요.',[2,0],[.15,0]),
      cBad('악기 연주를 줄여 버린다','찬양팀 사기가 꺾이고 불만이 번졌어요.',[1,1],0,0,1)]}]},
  gossip:{pair:1,t:'뒷말',s:[
    {x:'{b} 성도가 {a} 성도에 대한 뒷말을 퍼뜨렸다는 소문이 돌아 {a} 성도가 크게 상처받았어요.',o:[
      cGood('먼저 {b} 성도에게 사실인지 조용히 확인하고, 사실이면 두 사람이 만나 사과하도록 돕는다','진솔한 사과로 서로의 오해가 풀렸어요.'),
      cBad('광고 시간에 공개적으로 경고한다','{b} 성도가 공개 망신을 당했다며 크게 상처받았어요.',[0,2],[0,.35],0,1),
      cBad('{a} 성도에게 참고 넘어가라고 한다','상처는 외면당한 채 {a} 성도가 마음을 닫았어요.',[2,0],[.2,0]),
      cBad('{b} 성도에게 바로 책임을 묻겠다고 말한다','확인도 없이 몰아세운다며 반발했어요.',[1,2],[0,.2])]},
    {x:'{a} 성도와 {b} 성도가 서로를 향한 뒷말로 감정이 상했고, 주위 성도들도 편을 갈라 수군거려요.',o:[
      cGood('두 사람을 각자 따로 만나 이야기를 듣고, 주변에는 확인되지 않은 말을 옮기지 말아 달라고 부탁한다','말이 더 퍼지지 않고 가라앉기 시작했어요.'),
      cBad('두 사람을 바로 한자리에 앉혀 화해시킨다','감정이 가라앉기 전에 마주해 더 크게 다퉜어요.',[1,1]),
      cBad('잘못이 큰 쪽을 가려 주위에 알린다','편 가르기가 심해져 분위기가 무거워졌어요.',[1,2],[0,.2],0,2),
      cBad('시간이 지나면 잠잠해질 거라며 둔다','방치되는 사이 소문이 더 커졌어요.',[1,1],0,0,2)]}]}
};
function careById(id){var L=S.cares||[];for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null;}
function careOf(p){var L=S.cares||[];for(var i=0;i<L.length;i++)if(L[i].a===p.id||L[i].b===p.id)return L[i];return null;}
function caresCount(){return (S.cares||[]).length;}
function careText(c,s){var a=ppById(c.a),b=ppById(c.b);return s.replace(/\{a\}/g,a?a.n:'').replace(/\{b\}/g,b?b.n:'');}
// 이 고민의 사연 (옛 저장·시험용으로 v가 없으면 첫 사연)
function careScn(c){var S0=CARES[c.k].s;return S0[(c.v||0)%S0.length];}
// 정답 선택지의 번호
function careBest(c){var o=careScn(c).o;for(var i=0;i<o.length;i++)if(o[i].ok)return i;return 0;}
// 선택지 순서: 사건마다 섞되, 같은 사건은 늘 같은 순서
function careOrder(c){var n=careScn(c).o.length,ix=[];for(var i=0;i<n;i++)ix.push(i);return ix.sort(function(x,y){return ppRand(c.id*7+x,3)-ppRand(c.id*7+y,3);});}
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
  var c={id:S.careId++,k:k,v:Math.floor(Math.random()*t.s.length),a:a.id,b:b,w:S.week};S.cares.push(c);
  toast((t.pair?'갈등 · ':'고민 · ')+careText(c,t.pair?'{a}·{b} 성도':'{a} 성도')+' — '+t.t+' · 성도 화면에서 돌봐 주세요',3200);
  addLog((t.pair?'갈등 · ':'고민 · ')+careText(c,'{a}'+(b?'·{b}':''))+' — '+t.t);
}
// 선택지가 지금 안 되는 까닭 ('' = 할 수 있음). 정답은 자금이 들지 않아 늘 고를 수 있다
function careWhy(c,i){var o=careScn(c).o[i];return o&&o.cost&&S.money<o.cost?'자금이 부족해요':'';}
// 마지막으로 고른 것이 정답이었는지 (화면이 소리를 고를 때 쓴다)
var careLastOk=false,careRes=null;
// 고르면 결과 글을 돌려준다 (못 고르면 null). 정답은 두 사람(갈등이면) 모두 호감이 크게 오르고,
// 오답은 레벨이 내려가고 떠날 수도 있다
function careChoose(id,i){
  var c=careById(id);if(!c)return null;var t=CARES[c.k],o=careScn(c).o[i];if(!o||careWhy(c,i))return null;
  var a=ppById(c.a),b=c.b?ppById(c.b):null,parts=[];
  if(o.cost)careMoney(o.cost);
  if(o.ok){
    S.tempMood+=1;parts.push(careHit(a,CARE_GOOD));if(b)parts.push(careHit(b,CARE_GOOD));
  }else{
    var la=Array.isArray(o.lv)?o.lv[0]:o.lv,lb=Array.isArray(o.lv)?o.lv[1]:0,ea=Array.isArray(o.leave)?o.leave[0]:o.leave,eb=Array.isArray(o.leave)?o.leave[1]:0;
    if(b===null||!c.b){lb=0;eb=0;}
    S.tempMood-=o.mood||0;
    if(la)parts.push(careHit(a,-la,ea));if(lb)parts.push(careHit(b,-lb,eb));
  }
  var story=careText(c,o.r),eff=parts.filter(Boolean);
  parts.push(story);
  careLastOk=!!o.ok;
  // 결과 창에 보여 줄 내용: 무엇을 골랐고, 누구에게 어떤 영향이 있었는지
  careRes={ok:!!o.ok,t:t.t,pick:careText(c,o.l),story:story,eff:eff,cost:o.cost||0,mood:(o.ok?1:-(o.mood||0)),w:t.pair?'갈등':'고민'};
  S.cares=S.cares.filter(function(q){return q!==c;});S.careDone=(S.careDone||0)+1;if(o.ok)S.careGood=(S.careGood||0)+1;
  addLog(t.t+' · '+careText(c,o.l)+(o.ok?'':' (잘못된 선택)'));recalc();save();
  return parts.filter(Boolean).join(' · ');
}
// 선택 결과 창
function careResHtml(){
  var r=careRes;if(!r)return '';
  var rows=r.eff.map(function(t){var good=/호감 \+/.test(t);return '<li class="'+(good?'g':'b')+'"><i aria-hidden="true">'+(good?'▲':'▼')+'</i>'+t+'</li>';}).join('');
  var chips=[];if(r.cost)chips.push('<span class="b">자금 −'+fmt(r.cost)+'</span>');if(r.mood)chips.push('<span class="'+(r.mood>0?'g':'b')+'">교회 분위기 '+(r.mood>0?'+':'−')+Math.abs(r.mood)+'</span>');
  return '<div class="sdlg cres '+(r.ok?'ok':'no')+'" role="dialog" aria-label="선택 결과"><div class="crh"><span class="cri">'+(r.ok?'👍':'😔')+'</span><div><b>'+(r.ok?'지혜로운 선택이었어요':'아쉬운 선택이었어요')+'</b><small>'+r.w+' · '+r.t+'</small></div></div>'+
    '<p class="crp">“'+r.pick+'”</p><p class="crs">'+r.story+'</p>'+(rows?'<ul class="cre">'+rows+'</ul>':'')+(chips.length?'<div class="crc">'+chips.join('')+'</div>':'')+
    '<div class="sdb"><button class="btn pri big" data-act="evclose">확인</button></div></div>';
}
// 세부 정보 창에 넣는 고민 칸
function concernBlock(p){
  var c=careOf(p);if(!c)return '';var t=CARES[c.k],sc=careScn(c),left=Math.max(0,CARE_DUE-(S.week-c.w));
  return '<div class="scare"><div class="sct2"><b>'+(t.pair?'갈등 · ':'고민 · ')+t.t+'</b><span>'+(left?left+'주 안에 돌봐 주세요':'이번 주가 지나면 마음이 멀어져요')+'</span></div><p>'+careText(c,sc.x)+'</p><div class="scopts">'+
    careOrder(c).map(function(i){var o=sc.o[i],w=careWhy(c,i);return '<button class="btn" data-act="carepick" data-v="'+c.id+'" data-i="'+i+'"'+(w?' disabled title="'+w+'"':'')+'><b>'+careText(c,o.l)+'</b>'+(w?'<small class="bad">'+w+'</small>':(o.cost?'<small>자금 '+fmt(o.cost)+'</small>':''))+'</button>';}).join('')+'</div></div>';
}
