'use strict';
/* ---------- 밸런스 값 모음 ----------
   게임의 난이도와 속도를 정하는 숫자는 여기에만 둔다. 계산식 설명은 docs/balance.md.
   값을 바꾼 뒤에는 `node tools/sim.js`로 52주 결과를 다시 재 본다.
   (난이도별 자금·목표·대출·행사·사역팀 표는 ministry.js·finance.js에, 건물별 수치는 buildings.js에 있다) */

/* 값: 기능 건물(예배·교제·소모임·매장·돌봄·편의·주차)은 정의된 값의 BUILD_K배. 꾸미기·바닥·길·지형·편의 소품(prop)은 그대로 */
var BUILD_K=2,PRICY_CATS=['worship','fellow','club','shop','care','comfort','park'];

/* 수입 */
var VIS_RATE=0.6;        // 방문자가 오는 빠르기(초당, 평판·주차·사역 보정 전). 올리면 매장 수입·정착·붐빔이 함께 는다
var SHOP_K=8;            // 한 번 살 때 = 건물 income × SHOP_K
var SHOP_COST=0.25;      // 매장 재료비 비율 (판매 순간 빠진다)
var OFFER_PER=30;        // 주일 헌금: 출석 한 명당
var VIS_GIVE=3;          // 방문자 헌금: 한 명당
var SPONSOR0=600,SPONSOR_DROP=6;   // 개척 후원: 시작 금액, 주마다 줄어드는 양

/* 성도 수: 정착·이탈 */
var JOIN_P=0.072;        // 방문자 한 명의 정착 확률 계수. 성장 속도를 가장 크게 좌우한다 (한 사람씩 돌볼 수 있게 예전 0.09에서 낮춤)
var REFER_K=0.015;       // 만족도가 높을 때 소개로 오는 새 성도: 성도 × REFER_K × (만족도−MOOD_GAIN)/(100−MOOD_GAIN)
var MOOD_LEAVE=45;       // 만족도가 이보다 낮으면 떠나는 성도가 는다
var MOOD_GAIN=50;        // 만족도가 이보다 높으면 소개로 새 성도가 온다

/* 평판 */
var REP_MOOD0=50;        // 만족도·방문자 만족이 이 값일 때 평판이 제자리
var REP_DECAY=0.1;       // 평판이 40을 넘으면 넘은 만큼 × 이 값씩 매주 식는다

/* 성도 만족도 = 항목 점수 × MOOD_ITEMS + 좋은 보너스(최대 BONUS_MAX) − 나쁜 것 */
var MW={seat:.2,spirit:.25,past:.17,fel:.12,park:.1,care:.09,comf:.07};   // 항목 비중 (합 1)
var MOOD_ITEMS=85,BONUS_MAX=15;
var BLD_SAT=0.6;         // 건물 자리가 만족도 항목에 쳐지는 비율
// 항목 = (기본 b + 건물 자리 × BLD_SAT) ÷ max(최소 f, 성도 × r × 기대치). e=1이면 기대치를 곱한다
var SAT={seat:{f:29,r:1.0,b:0,e:0},fel:{f:20,r:.9,b:10,e:1},care:{f:12,r:.5,b:6,e:1},comf:{f:12,r:.4,b:6,e:1},park:{f:14,r:.55,b:7,e:1},past:{f:50,r:1.2,b:0,e:0}};
var EXP_LV=0.03;         // 기대치 = 1 + 성도/500 + (교회 Lv−1) × EXP_LV

/* 영성 = 말씀 w · 기도 p · 찬양 r · 성례 s */
var SPIRIT_W={w:.3,p:.2,r:.2,s:.3};
var SPIRIT_NEED={w:{f:12,r:.4,b:6},p:{f:8,r:.25,b:4},r:{f:10,r:.3,b:5}};   // 최소 f, 성도당 r, 기본 b
// 건물마다 말씀·기도·찬양 자리
var SPIRIT_B={
  bible:{w:12},mission:{w:14,p:4},books:{w:6},cell:{w:8},youth:{w:6},study:{w:4},calli:{w:4},library:{w:2},
  pray:{p:8},dawn:{p:16},
  praise:{r:20},outdoor:{r:16},choir:{r:12},band:{r:8},guitar:{r:5},bell:{r:3}
};
// 성례: 연 지 span주가 지나면 0이 된다. w는 성례 점수에서의 비중(합이 1을 넘으면 1로 자른다)
var SACRAMENT={communion:{span:8,w:.6},baptism:{span:12,w:.35},retreat:{span:16,w:.3},fest:{span:8,w:.2}};

/* 꾸밈 보너스 = 아름다움 × BEAUTY_K + 새로 꾸민 것 × FRESH_K (최대 +8). 새로 꾸민 것은 주마다 × FRESH_DECAY */
var BEAUTY_K=0.15,FRESH_K=1,FRESH_DECAY=0.85;

/* 방문자 불편 */
var GRIPE_W={wc:1,food:.8,drink:.5,lonely:.6,seat:.6,bin:.3,bare:.6,crowd:1.2,queue:1};   // 불편마다 무게
var GRIPE_MAX=8;         // 만족도를 깎는 최대치
var GRIPE_K=11;          // 불편 비율 × 이 값만큼 깎는다
var GRIPE_N0=14;         // 방문자가 이보다 적으면 이 수로 나눈다 (초반에 몇 명에 크게 흔들리지 않게)
var GRIPE_SHOW=0.1;      // 챙길 일에는 방문자의 이 비율(최소 3명) 이상이 겪은 불편만

/* 방문자 행동 */
/* 달력: 한 달 5주, 한 해 12달 = 60주. 계절은 달로 나눈다 (봄 3~5, 여름 6~8, 가을 9~11, 겨울 12~2월). 처음 시작은 1월 1주 */
var WEEKS_PER_MONTH=5,YEAR_WEEKS=60;
/* 성도 한 사람 한 사람 (people.js)
   · 호감 레벨 1~PP_LV_MAX. 다음 레벨까지 경험치 = PP_XP0 + PP_XP_K × 지금 레벨 (Lv 70까지 약 1,400).
     매주 예배에 나오며 PP_WEEK_XP(만족도 50 아래면 PP_WEEK_XP_LOW), 심방 PP_VISIT·선물 PP_GIFT(한 사람에게 cd주에 한 번), 교육 행사(모든 성도)로 오른다
   · 성장 단계(PP_TREE): 새가족 → 세례 → 양육반 → 제자반 → 세 갈래
       직분: 헌신성도 → 집사 → 장로(남)·권사(여)          (Lv 70)
       교역: 소그룹 리더 → 공동체 리더 → 간사 → 신학교 입학 → (부교역자로 섭외)   (Lv 70)
       섬김: 섬김이 → 사역팀장 → 사역부장 → 교회직원       (Lv 70)
     단계마다 lv(필요 호감 레벨)·cost(값)·dur(교육 주)·give(매주 헌금 더)·sp(영성 자리)·cap(목양 수용력)·upk(운영비 −)·dec(노후 −)
   · 헌금: 성도들의 평균 레벨마다 +PP_GIVE_LV. 영성 자리 = Σ((레벨−1) × PP_SPIRIT_LV + 단계 sp) × PP_SPIRIT_K
   · 교회에서 기른 부교역자: 별 5개, 효과 × ASSOC_HOME_K, 사례비 ASSOC_HOME_PAY. 부교역자도 격려(ASSOC_CHEER)로 레벨이 오르고 레벨마다 효과 +ASSOC_LV_K */
var PP_LV_MAX=99,PP_XP0=10,PP_XP_K=.3,PP_WEEK_XP=1.5,PP_WEEK_XP_LOW=.6;
var PP_VISIT={cost:40,xp:15,cd:2},PP_GIFT={cost:120,xp:30,cd:4};
var PP_TREE={
  new:{n:'새가족',d:0,next:['bapt']},
  bapt:{n:'세례교인',act:'세례',tr:'세례 교육',done:'세례 주기',lv:3,cost:50,dur:2,d:1,give:1,sp:.2,cap:1,next:['nurture']},
  nurture:{n:'양육반 수료',act:'양육반',tr:'양육반',done:'양육반 수료',lv:8,cost:80,dur:3,d:2,give:1,sp:.3,cap:1,next:['disciple']},
  disciple:{n:'제자반 수료',act:'제자반',tr:'제자반',done:'제자반 수료',lv:15,cost:150,dur:4,d:3,give:2,sp:.5,cap:2,next:['devoted','sgl','server']},
  devoted:{n:'헌신성도',act:'헌신성도',tr:'헌신 훈련',done:'헌신성도 세우기',lv:25,cost:250,dur:4,d:4,t:'A',give:3,sp:.6,cap:3,next:['deacon']},
  deacon:{n:'집사',act:'집사 임명',tr:'집사 교육',done:'집사 임명',lv:45,cost:500,dur:6,d:5,t:'A',give:6,sp:.8,cap:0,next:['elder']},
  elder:{n:'장로',nf:'권사',act:'장로 임명',actf:'권사 임명',tr:'장로 교육',trf:'권사 교육',done:'장로 임명',donef:'권사 임명',lv:70,cost:1200,dur:10,d:6,t:'A',give:20,sp:1.2,cap:0,next:[]},
  sgl:{n:'소그룹 리더',act:'소그룹 리더',tr:'리더 훈련',done:'소그룹 리더 세우기',lv:25,cost:250,dur:4,d:4,t:'B',give:2,sp:.8,cap:8,next:['cml']},
  cml:{n:'공동체 리더',act:'공동체 리더',tr:'공동체 리더 훈련',done:'공동체 리더 세우기',lv:40,cost:450,dur:6,d:5,t:'B',give:3,sp:1,cap:15,next:['kanji']},
  kanji:{n:'간사',act:'간사',tr:'간사 수련',done:'간사 임명',lv:55,cost:800,dur:8,d:6,t:'B',give:4,sp:1.3,cap:20,next:['seminary']},
  seminary:{n:'신학 수료',act:'신학교 입학',tr:'신학교 수업',done:'졸업 축하',lv:70,cost:2500,dur:12,d:7,t:'B',give:120,sp:2,cap:25,next:['assoc']},
  assoc:{n:'부교역자',act:'부교역자로 섭외',tr:'부교역자 수련',done:'부교역자 임명',lv:70,cost:1200,dur:3,d:8,t:'B',next:[]},
  server:{n:'섬김이',act:'섬김이',tr:'섬김 훈련',done:'섬김이 세우기',lv:25,cost:200,dur:4,d:4,t:'C',give:2,sp:.4,cap:2,upk:.005,dec:.01,next:['tlead']},
  tlead:{n:'사역팀장',act:'사역팀장',tr:'팀장 훈련',done:'사역팀장 임명',lv:40,cost:400,dur:6,d:5,t:'C',give:3,sp:.5,cap:4,upk:.01,dec:.02,next:['dlead']},
  dlead:{n:'사역부장',act:'사역부장',tr:'부장 훈련',done:'사역부장 임명',lv:55,cost:700,dur:8,d:6,t:'C',give:5,sp:.6,cap:6,upk:.015,dec:.03,next:['cstaff']},
  cstaff:{n:'교회직원',act:'교회직원 임명',tr:'직원 수습',done:'교회직원 임명',lv:70,cost:1500,dur:10,d:7,t:'C',give:8,sp:.8,cap:8,upk:.03,dec:.05,next:[]}
};
var PP_TRACK={A:{n:'직분',desc:'헌신성도 → 집사 → 장로·권사. 헌금과 목양 수용력, 만족·이탈을 돕는 직분자'},B:{n:'교역',desc:'소그룹 리더 → 공동체 리더 → 간사 → 신학교. 목양 수용력과 영성, 끝에는 부교역자'},C:{n:'섬김',desc:'섬김이 → 사역팀장 → 사역부장 → 교회직원. 운영비와 건물 노후를 줄이는 섬김'}};
var PP_UPK_MAX=.25,PP_DEC_MAX=.4;
var PP_GIVE_LV=.005;
// 교육 행사: 보상 수령 때 모든 성도 경험치 + xp. 값 = base + 성도 × per
var EDU_EV={bible:{base:150,per:2,xp:12},creed:{base:250,per:3,xp:20},training:{base:600,per:5,xp:40}};
var PP_SPIRIT_LV=.01,PP_SPIRIT_K=.15;
/* 성도의 고민·갈등 (concerns.js): 매주 min(CARE_P_MAX, 성도 × CARE_P_PER) 확률로 하나 생긴다 (동시에 CARE_MAX개까지, 성도 CARE_MIN_MEM명부터)
   지혜로운 선택 CARE_GOOD · 보통 CARE_OK · 돈으로만 CARE_MONEY(값 CARE_COST) 경험치. CARE_DUE주 안에 고르지 않으면 레벨 −2, CARE_LEAVE 확률로 떠남, 만족 −CARE_IGNORE_MOOD */
var CARE_P_PER=.01,CARE_P_MAX=.45,CARE_MAX=3,CARE_MIN_MEM=6,CARE_GOOD=60,CARE_OK=25,CARE_MONEY=10,CARE_COST=300,CARE_DUE=3,CARE_LEAVE=.3,CARE_IGNORE_MOOD=1.5;
/* 부교역자에게 성도 돌봄 맡기기: 매주 부교역자 한 사람이 (ASSOC_CARE0 + ASSOC_CARE_K × 실력)명을 심방하고, 선물 때가 된 사람에게는 선물도 한다.
   맡길 성도는 호감 Lv(S.deleg.lv) 아래인 사람만, 레벨이 낮은 순으로. 교회 자금이 ASSOC_CARE_RES 아래로 내려가면 멈춘다 */
var ASSOC_CARE0=4,ASSOC_CARE_K=2,ASSOC_CARE_RES=800,DELEG_LV0=25,DELEG_STEP=5;
var ASSOC_HOME_K=1.4,ASSOC_HOME_PAY=120,ASSOC_LV_K=.08,ASSOC_LV_MAX=5,ASSOC_CHEER={cost:100,xp:8,cd:2};
var STAY=0.8;            // 건물 안에 머무는 시간 배율
/* 회전 시간과 대기줄
   회전 시간 = 건물의 dur × STAY × 성격(ROT_CAT) × 수용 인원 보정(capK) × 줄 보정.
   · 줄 없음: 시간 ×QUEUE_NONE_T, 효과 ×QUEUE_NONE_E (짧게 머물고 조금 얻는다)
   · 줄 n칸: 시간 ×(1+QUEUE_T·f), 효과 ×(1+QUEUE_E·f), f = min(1, n/QUEUE_FULL)
     → 줄이 꽉 길면 머무는 1초당 효과가 약 19% 좋고(줄 없는 건물은 6%), 꽉 찬 동안 사람을 놓치지 않는다.
       넘친 효과는 QUEUE_SPILL만큼 다른 필요로 가서, 한 건물에서 오래 머문 사람은 들를 곳이 줄어든다.
       대신 기다리는 동안은 아무것도 채우지 못하고, QUEUE_PATIENCE초를 넘기면 불편 '줄'이 생긴다 */
var ROT_CAT={worship:1.15,fellow:1.05,club:1.05,care:1,shop:.8,comfort:.75};
var QUEUE_NONE_T=.8,QUEUE_NONE_E=.85,QUEUE_T=.35,QUEUE_E=.6,QUEUE_FULL=10;
var QUEUE_SPILL=.3;      // 줄 있는 건물에서 한 필요가 100을 넘겨 채워지면, 넘친 몫의 이만큼이 가장 모자란 다른 필요로 간다 (오래 머문 만큼 두루 채워진다)
var QUEUE_PATIENCE=14,QUEUE_ANNOY=1.2;   // 줄에서 이만큼(초) 넘게 기다리면 불만
var WAIT_T=3.5;          // 꽉 찬 건물 앞에서 기다리는 시간(초)
var CROWD_ANNOY=1.5;     // 기다리다 돌아설 때의 불만
var NEED_OK=88;          // 욕구가 이만큼 차면 됐다고 본다 (높을수록 건물을 더 많이 들른다)
var NEED_DRAIN=0.4;      // 밖에 있는 동안 욕구가 줄어드는 빠르기(초당)

/* 건물 노후와 수리 */
var DECAY_BASE=0.8,DECAY_USE=0.008;   // 한 주에 낡는 양: 기본 + 이용 한 번마다
var REPAIR_K=0.1;        // 수리비 = 건물 값 × REPAIR_K × 낡은 정도
var WEAR_EFF=[1,.9,.75,.55];          // 노후 단계별 효율 (멀쩡 · 거미줄 · 하얀 연기 · 검은 연기)

/* 성도들의 바람: WISH_GAP주(최소~최대)마다 하나, 기한 WISH_DUE주. 들어주면 WISH_FX_WEEKS주간 만족 WISH_GOOD과 평판 WISH_REP, 놓치면 WISH_BAD */
var WISH_FIRST=2,WISH_GAP=[2,3],WISH_DUE=5,WISH_GOOD=6,WISH_BAD=-5,WISH_FX_WEEKS=3,WISH_REP=2;
/* 매너리즘: 새 건물·다른 행사가 STALE_AFTER주 넘게 없으면 넘은 주마다 STALE_STEP씩, 최대 STALE_MAX까지 만족도가 내려간다 */
var STALE_AFTER=4,STALE_STEP=1.5,STALE_MAX=9;

/* 현황 지표 (status.js): 영성·만족도·편의·신뢰도·사역 경험 다섯 가지를 점수로 매기고, 지표마다 레벨을 준다.
   · 점수는 '실제로 채운 만큼'이다: 항목마다 min(기본 + 건물 자리, SERVE_CAP × 필요). 필요는 성도 수에 맞춰 늘기 때문에, 성도가 늘수록 채워야 할 몫도 커진다
   · 영성 = (말씀·기도·찬양 채운 합) × (IND_SAC0 + (1−IND_SAC0) × 성례)
   · 만족도 = 교제 + 돌봄 + 목양 × IND_PAST + 꾸밈 × IND_BEAUTY + 나쁜 것(침체·낡음·불편) × IND_NEG
   · 편의 = 편의 시설 + 주차 + 좌석 × IND_SEAT
   · 신뢰도 = 평판 × TRUST_REP + 성도 평균 호감 Lv × TRUST_LV + 직분자 × TRUST_OFF + 목양 충족 × TRUST_PAST + 심방·선물 활동 (최대 TRUST_VIS_MAX, 매주 × TRUST_VIS_DECAY)
     신뢰도 지수(0~100): x = 점수 × TRUST_IDX, x가 TRUST_SOFT를 넘으면 넘은 몫은 점점 덜 오른다 (TRUST_SOFT + (100−TRUST_SOFT) × (1 − e^(−(x−TRUST_SOFT)/TRUST_SOFT_K))).
     방문자가 오는 빠르기·방문자 헌금·신용 한도가 이 지수를 따른다
   · 사역 경험 = 퀘스트로 쌓은 경험치
   지표 레벨 L(2 이상)이 되려면 점수 ≥ IND_B[지표] + IND_U[지표] × (L−2)^IND_P (IND_B는 Lv 2 문턱 = 처음 점수보다 조금 높게).
   레벨이 오르면 '보상 받기'로 자금 IND_GIFT0 + IND_GIFT_K × L을 받는다 */
var SERVE_CAP=1.2;
var IND_SAC0=.7,IND_PAST=.5,IND_SEAT=.5,IND_BEAUTY=5,IND_NEG=5;
var TRUST_REP=1,TRUST_LV=1.5,TRUST_OFF=2,TRUST_PAST=20,TRUST_VIS=2,TRUST_VIS_MAX=40,TRUST_VIS_DECAY=.85,TRUST_IDX=.62,TRUST_SOFT=60,TRUST_SOFT_K=50;
var IND_B={sp:26,mood:50,conv:40,trust:50,xp:10},IND_U={sp:14,mood:24,conv:12,trust:14,xp:30},IND_P=1.2,IND_MAX=50;
var IND_GIFT0=40,IND_GIFT_K=25;
/* 교회 Level = 다섯 지표 점수의 합. L이 되려면 합 ≥ LV_BASE + LV_K × (L−1)^LV_P (한 번 오른 Level은 내려가지 않는다) */
var LV_MAX=100,LV_BASE=200,LV_K=36,LV_P=1.4;
// Level이 오를 때 축하금 = LV_GIFT0 + LV_GIFT_K × 새 Level (Lv 2는 250, Lv 10은 650)
var LV_GIFT0=150,LV_GIFT_K=50;
// 건물·사역팀·행사가 열리는 교회 Level (예전 목표 1·2·3개째)
var LV_TIER=[1,2,3,5];
// 퀘스트 한 칸마다 받는 돈은 퀘스트 목록(quests.js)에 있다
