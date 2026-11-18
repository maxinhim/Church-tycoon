# 작업 이어받기 (새 세션이 가장 먼저 읽을 것)
대화 기록 없이 이어 가려고 남긴 메모. 코드 규칙은 `CLAUDE.md`, 수치는 `docs/balance.md`, 그림 프롬프트는 `docs/art/gemini-prompts.md`.

## 작업 방식 (사용자가 정한 것)
- **작업 흐름(사용자가 정함):** 기능마다 `main`에서 새 브랜치 → 작업 → `node tests/smoke.js`(약 4분, 모두 통과) → 커밋 → 브랜치 푸시 → **테스트 아티팩트에 그 브랜치를 올림** → 사용자가 아티팩트에서 직접 플레이해 확인 → 사용자가 **"병합해줘"**라고 하면 Claude가 PR 만들고(제목·설명 포함) 병합하고 브랜치를 정리한다. 말하기 전에는 PR·병합을 하지 않는다. 고칠 게 있으면 같은 브랜치에서 고치고 아티팩트를 다시 올린다.
- PR·병합은 `gh pr`가 안 되니 REST로 한다: `gh api repos/maxinhim/Church-tycoon/pulls -f title=… -f head=<브랜치> -f base=main -f body=…` → `gh api -X PUT repos/maxinhim/Church-tycoon/pulls/<번호>/merge -f merge_method=merge`. 권한·보호 규칙에 막히면 사용자에게 알린다. 이미 푸시한 브랜치를 rebase해 force push하는 것은 막히니 새 브랜치 이름으로 푸시한다.
- 아티팩트: `https://claude.ai/artifact/1yhkBxBuZSE6MgdtDgokV9`에 Artifact 도구로 같은 `index.html` 경로 + `url` + 바뀐 파일을 `files`로(`git diff --name-only <아티팩트에 올린 커밋> HEAD -- index.html js css assets`로 바뀐 파일을 구한다), 읽지 않은 기존 파일은 `overwrite_unread`로. **원본 `4AXaWUqHiBwgTsREStsh9D`는 건드리지 않는다.** 한 번에 255개·한 버전에 511개까지라 나눠 올리고, 쓰지 않는 파일은 `null`로 뺀다(2026-11: 491개). 마지막으로 올린 것: Version 41(브랜치 `feat/stage-sprites`).
- 보고: 짧은 한국어. 큰 새 기능·밸런스는 `node tools/sim.js`로 재고 `docs/balance.md`에 적는다.
- 이미지 바이너리를 통째로 읽지 말고 줄인 미리보기(PIL로 640px 안팎)만 본다.
- Gemini 프롬프트: 공통 화풍 문장을 풀어 쓴 한 덩어리, 글자 없는 그림은 맨 앞·뒤에 `ABSOLUTELY NO TEXT OF ANY KIND`.
- main 직접 푸시 금지.

## 지금 상태
- `main`: PR #5·#6·#8과 남은 아이콘 연결 PR까지 병합됨(UI 아이콘 21~29번 적용).
- 열린 브랜치 `feat/stage-sprites`(18~20번 연결: 지도 위 차량·배·산짐승·정수기·분리수거함·도시 이웃 건물 스프라이트, 강물·산촌 절벽·도시 보도·차도 질감)가 아티팩트 Version 41에 올라가 있다. 사용자가 확인한 뒤 "병합해줘"를 기다리는 중.

## 남은 일 (사용자가 말하면)
- 18~20번은 `feat/stage-sprites`에서 연결했다(`tools/slice_sheet.py`가 `stage-sprites.json`·`stage-city.json`·`stage-tex.json`도 읽음). 쓰지 않는 질감: `t_forest`·`t_path`·`t_bank`·`t_pier`.
- 선교지 1·2(스테이지 5·6)는 잠겨 있고 지도·그림이 없다 (테스트로만 평지에 들어간다).
- 테스트 게임은 누를 때마다 새로 시작한다(이어하기 없음).
- `docs/art/sheets`에서 옛 시트 20개(sheet-E~H, W1~W3)를 지웠다(기록에는 있음, 삭제 커밋 `f534ce9`).

- UI 아이콘 21~29번(`docs/art/gemini-prompts.md` 맨 아래, 시트 `docs/art/sheets/ui-buttons21~29`, `python3 tools/ui_buttons.py 21 … 29`로 135개를 `assets/ui/`에 자름)은 대부분 화면에 연결했다: 건축 분류 `cat_*`·하위 칩 `sub_*`, 지표 `ind_*`, 날씨 `wx_*`·계절 `ssn_*`, 동작 `act_*`(`aic()`, pixicons.js), 단계 휘장 `node_*`, 고민 종류 `care_*`, 짓기·선택 카드 버튼 `btn_*`.
- 파일만 있고 아직 안 붙인 것: 지표 `ind_*_rdy/_lock/claim`, 갈래 휘장 `br_*`, `btn_rot/info/deco`, `act_pay/mood/xp/like/fire/lock/resume`, 입구 `entr_*`·`deco_*`(입구 카드는 실제 문을 그려 쓰므로 불필요). 새 화면 요소가 생길 때 쓴다.

## 환경 함정
- 저장소 주소는 `maxinhim/Church-tycoon`(옛 `church-tycoon`은 옮겨짐). GraphQL이 막혀 `gh pr`는 안 되고 `gh api repos/maxinhim/Church-tycoon/...`(REST)를 쓴다.
- 이미 푸시한 브랜치를 rebase하면 force push가 막힌다 → 새 브랜치 이름으로 푸시한다.
- 얕은 클론이면 main과 공통 조상이 안 보인다 → `git fetch --unshallow origin`.
- `git fetch origin main`은 추적 ref를 안 바꾼다 → `git fetch origin main:refs/remotes/origin/main`.
- Gemini 그림 오른쪽 아래 별 표시는 `tools/gemini_mark.py`가 지운다(가장자리에서 121·120px).
