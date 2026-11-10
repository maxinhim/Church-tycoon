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
var JOIN_P=0.09;         // 방문자 한 명의 정착 확률 계수. 성장 속도를 가장 크게 좌우한다
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
var EXP_LV=0.015;        // 기대치 = 1 + 성도/500 + (교회 Lv−1) × EXP_LV

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
var GRIPE_W={wc:1,food:.8,drink:.5,lonely:.6,seat:.6,bin:.3,bare:.6,crowd:1.2};   // 불편마다 무게
var GRIPE_MAX=8;         // 만족도를 깎는 최대치
var GRIPE_K=11;          // 불편 비율 × 이 값만큼 깎는다
var GRIPE_N0=14;         // 방문자가 이보다 적으면 이 수로 나눈다 (초반에 몇 명에 크게 흔들리지 않게)
var GRIPE_SHOW=0.1;      // 챙길 일에는 방문자의 이 비율(최소 3명) 이상이 겪은 불편만

/* 방문자 행동 */
var STAY=0.8;            // 건물 안에 머무는 시간 배율
var WAIT_T=3.5;          // 꽉 찬 건물 앞에서 기다리는 시간(초)
var CROWD_ANNOY=1.5;     // 기다리다 돌아설 때의 불만
var NEED_OK=88;          // 욕구가 이만큼 차면 됐다고 본다 (높을수록 건물을 더 많이 들른다)
var NEED_DRAIN=0.4;      // 밖에 있는 동안 욕구가 줄어드는 빠르기(초당)

/* 건물 노후와 수리 */
var DECAY_BASE=0.8,DECAY_USE=0.008;   // 한 주에 낡는 양: 기본 + 이용 한 번마다
var REPAIR_K=0.1;        // 수리비 = 건물 값 × REPAIR_K × 낡은 정도
var WEAR_EFF=[1,.9,.75,.55];          // 노후 단계별 효율 (멀쩡 · 거미줄 · 하얀 연기 · 검은 연기)

/* 교회 Level: L이 되려면 점수 ≥ LV_BASE + LV_K × (L−1)^LV_P */
var LV_MAX=100,LV_BASE=10000,LV_K=800,LV_P=1.55;
