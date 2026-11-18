# 작업 이어받기 (새 세션이 가장 먼저 읽을 것)
대화 기록 없이 이어 가려고 남긴 메모. 코드 규칙은 `CLAUDE.md`, 수치는 `docs/balance.md`, 그림 프롬프트는 `docs/art/gemini-prompts.md`.

## 작업 방식 (사용자가 정한 것)
- 변경마다: `node tests/smoke.js`(약 4분, 모두 통과할 때까지) → 커밋 → 푸시 → 테스트 아티팩트 다시 올리기.
- 아티팩트: `https://claude.ai/artifact/1yhkBxBuZSE6MgdtDgokV9`에 Artifact 도구로 같은 `index.html` 경로 + `url` + 바뀐 파일을 `files`로, 읽지 않은 기존 파일은 `overwrite_unread`로. **원본 `4AXaWUqHiBwgTsREStsh9D`는 건드리지 않는다.**
- 보고: 짧은 한국어. 큰 새 기능·밸런스는 `node tools/sim.js`로 재고 `docs/balance.md`에 적는다.
- 이미지 바이너리를 통째로 읽지 말고 줄인 미리보기(PIL로 640px 안팎)만 본다.
- Gemini 프롬프트: 공통 화풍 문장을 풀어 쓴 한 덩어리, 글자 없는 그림은 맨 앞·뒤에 `ABSOLUTELY NO TEXT OF ANY KIND`.
- main 직접 푸시 금지. 기능마다 브랜치 → PR. PR·병합은 사용자가 말할 때만.

## 지금 상태
- `main`: PR #5(코드 단면·스테이지 2~4·인트로)까지 병합됨 + 사용자가 올린 그림 업로드 커밋.
- `feat/stage-art`(푸시됨, **PR 없음, 병합 안 됨**): 스테이지 1~4 Gemini 그림 적용(카드 그림·엠블럼·차량·산짐승·도시 아이콘·차량 탭·인물 4명) + 프롬프트 문서 12~20번. 테스트 아티팩트 Version 38이 이 브랜치.
- 다음 작업은 이 브랜치가 main에 병합된 뒤 main에서 새 브랜치를 따서 시작한다(병합 전이면 `feat/stage-art`에서 딴다).

## 남은 일 (사용자가 말하면)
- 18~20번 그림(`docs/art/sheets/sprites-stage.jpeg`·`sheet-city.jpeg`·`textures-stage.png`)은 받아만 두고 자르거나 연결하지 않았다. 지도 위 차량·배·산짐승 스프라이트, 도시 이웃 건물 5종, 질감 8종.
- 선교지 1·2(스테이지 5·6)는 잠겨 있고 지도·그림이 없다 (테스트로만 평지에 들어간다).
- 테스트 게임은 누를 때마다 새로 시작한다(이어하기 없음).
- `docs/art/sheets`에서 옛 시트 20개(sheet-E~H, W1~W3)를 지웠다(기록에는 있음, 삭제 커밋 `f534ce9`).

## 환경 함정
- 저장소 주소는 `maxinhim/Church-tycoon`(옛 `church-tycoon`은 옮겨짐). GraphQL이 막혀 `gh pr`는 안 되고 `gh api repos/maxinhim/Church-tycoon/...`(REST)를 쓴다.
- 얕은 클론이면 main과 공통 조상이 안 보인다 → `git fetch --unshallow origin`.
- `git fetch origin main`은 추적 ref를 안 바꾼다 → `git fetch origin main:refs/remotes/origin/main`.
- Gemini 그림 오른쪽 아래 별 표시는 `tools/gemini_mark.py`가 지운다(가장자리에서 121·120px).
