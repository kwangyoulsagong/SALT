# FE-REQ-071 회고

## 2026-11-20

- **배럴에 올릴 뻔했다** — 공용 로그인 폼 · 휴대폰 틀을 `@repo/web-shared/layout` 배럴에 넣으면 그 배럴을 읽는 데스크톱 zone 다섯 레이아웃에 클라이언트 모듈이 딸려 간다(팁 글 +34 kB 와 같은 원인). 입구를 따로 열고 레이어 규칙 목록(`WEB_SHARED_DIRECT_ENTRIES`)에 넣었다
- **잠금 파일의 peer 변형** — 새 zone 의 `next` 가 다른 zone 과 다른 peer 조합(`@opentelemetry/api` 없음)으로 풀려 webpack 이 두 벌 → `mini-css-extract-plugin` 직렬화기 중복으로 빌드 실패. 새 zone 앱을 더할 때 `readlink apps/<새>/node_modules/next` 가 다른 zone 과 같은지 본다
- vanilla-extract `selectors` 는 자식 선택자를 못 받는다(`& input`) — `globalStyle` 로
- 리다이렉트 기본값이 307 — 스펙(302)과 달라 실측에서 잡았다. 표 시험은 판정만 보고 상태 코드는 안 봤다
- Action: `FE-REQ-072` 에서 도메인 패키지 `src/mobile` 을 만들 때 `no-cross-zone-link` 의 `appOf` 가 그 파일을 휴대폰 zone 앱으로 보게 고친다(지금은 도메인 zone 앱으로 판정)
- 결함 주입 6개 중 `/m` 되돌림 가드가 살아남았다 — 경계 표가 "그 가드가 없어도 같은 답"인 입력만 갖고 있었다. 가드마다 **그 가드만 막는 입력**(잘못된 대응표)을 표에 둔다

## 2026-11-20 `FE-REQ-072` 가 걸침

- `/m` 탭 넷 자리 화면(`MobilePendingPage`)을 실제 화면으로 바꿨다 · 레이아웃에 표면 표지 `data-surface` · 휴대폰 틀에 조각(`MobileScreen` · `MobileHead` · `MobileSection` · `MobileSummary` · `MobileSheetAction` — 앱 웹뷰 계약이 없어지며 같이 바뀌었다. 데스크톱 배치 변화는 main 비교로 0

## 2026-11-20 `FE-REQ-074` 걸침

- 이 REQ 파일을 `/m` 값 때문에 고쳤다 — `layout/mobile` 입구에 `DesktopViewFoot`(바닥 안내 + 회색 알약) · `MobileShortcuts`(바로가기 목록 카드 — 홈에서 꺼냄)를 더했다. 새 할 일 없음

- 2026-11-20 걸침(`FE-REQ-076` 1단계): 휴대폰 홈 알약 문구를 `@repo/core/labels` `HOME_CARD_PILL_LABEL` 로 옮김(데스크톱 홈과 한 벌) — 값 그대로 — 할 일 없음

- 2026-11-21 걸침(`FE-REQ-073`): 서비스 워커 오프라인 한 장이 그 경로의 한 벌을 그린다(인라인 스크립트 · `offlinePage.ts` 로 옮김) · 루트 레이아웃 잎이 설치 사건을 붙잡는다 · `@repo/core/mobile` 에 `offline` 계약 — 새 할 일 없음

- 2026-11-21 걸침(`FE-REQ-078`): 서비스 워커 푸시 처리 · 구독 대조 — 할 일 없음
