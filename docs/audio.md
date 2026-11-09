# 소리 출처 (모두 CC0)

모든 음원은 OpenGameArt.org에서 **CC0**(퍼블릭 도메인)으로 공개된 것만 골랐다. 여러 라이선스가 함께 적힌 작품은 그중 CC0로 쓴다.
게임에는 `assets/audio/`의 mp3만 넣는다 (모바일 Safari까지 재생되게 mp3, 효과음 80kbps 모노, 앞쪽 무음은 잘라 냄).
배경 음악은 조용하고 고르게 들리도록 모두 같은 크기로 맞춘다: `ffmpeg -i 원본 -af loudnorm=I=-24:TP=-3:LRA=11 -ac 2 -b:a 80k bgm_이름.mp3` (게임 안 음량은 다시 15%).

| 파일 | 쓰는 곳 | 원본 | 만든 사람 | 출처 |
|---|---|---|---|---|
| bgm_sun.mp3 | 맑은 날·흐림·바람·폭염 배경 음악 | first_light_particles (사용자가 후보 5곡 중 선택) | Yoiyami | https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track |
| bgm_snow.mp3 | 눈 오는 날 배경 음악 | wintery loop (사용자가 후보 7곡 중 선택) | Emma_MA | https://opengameart.org/content/wintery-loop |
| amb_rain.mp3 | 비 올 때 깔리는 빗소리 | amb_rain_loop_1 | Kresiek The Furry | https://opengameart.org/content/amb-rain-loop-1 |
| sfx_build.mp3 | 건물·칸 짓기, 층 올리기, 수리 | hammer_04 | rubberduck | https://opengameart.org/content/100-cc0-metal-and-wood-sfx |
| sfx_demolish.mp3 | 철거 | wood_falling_04 | rubberduck | 위와 같음 |
| sfx_gate_open.mp3 | 교회 문 열기 | door_open_01 | rubberduck | 위와 같음 |
| sfx_gate_close.mp3 | 교회 문 닫기 | wood_close_01 | rubberduck | 위와 같음 |
| sfx_place.mp3 | 조경·꾸미기 놓기, 옮기기 | item_wood_01 | rubberduck | https://opengameart.org/content/80-cc0-rpg-sfx |
| sfx_floor.mp3 | 바닥·길 깔기 | stones_01 | rubberduck | 위와 같음 |
| sfx_coins.mp3 | 주일 정산·대출 | item_coins_03 | rubberduck | 위와 같음 |
| sfx_join.mp3 | 새 성도, 목표 달성 | item_gem_01 | rubberduck | 위와 같음 |
| sfx_error.mp3 | 못 짓는 자리, 실패 | lock_01 | rubberduck | 위와 같음 |
| sfx_page.mp3 | 패널 열기 | book_02 | rubberduck | 위와 같음 |
| sfx_click.mp3 | 버튼 동작 | wood_05 | rubberduck | 위와 같음 |
| sfx_coin.mp3 | 매장에서 물건이 팔릴 때 | coin.1 | StarNinjas | https://opengameart.org/content/12-coin-sound-effects |
| sfx_bell.mp3 | 주일 종소리(정산 영수증), 목표 달성 | bell.wav | Fupi | https://opengameart.org/content/correct-bell |

- 비 오는 날은 배경 음악 없이 빗소리(amb_rain)만 깔고, 이따금 먼 천둥이 친다. 천둥(벼락 포함)은 파일 없이 `js/audio.js`의 `thunder()`가 잡음으로 직접 만든다.
- 다시 만들 때: 원본을 내려받아 `ffmpeg -i 원본 -ac 1 -b:a 80k -af silenceremove=start_periods=1:start_threshold=-50dB sfx_이름.mp3` (음악은 `-ac 2 -b:a 96k`).
