# 휴대폰 디자인 규칙 (`/m` — 배치 · 부품)

근거: 사용자 Figma "홈"(390) 실측 · 사용자가 준 기준 금융 앱 화면 13장 분석(`requirements/reports/research/2026-11-20-mobile-reference-screens.md`) ·
사용자 2026-11-20 "이렇게 만들어야돼" · "카드랑 저런 아이콘 그리고 글래스 느낌" · "이런 아이콘들 카드 배경". 글자 · 색 · 쓰기는 `screen-mobile.md`, 움직임은 `mobile-motion.md`.
**문서 · 코드 · 커밋에 기준 서비스 이름을 쓰지 않는다**(`check-done.mjs` 6번이 센다).

## 1. 화면은 두 가지뿐이다

| 화면 | 모양 | 쓰는 곳 | 부품 |
|---|---|---|---|
| **탭 화면** | 회색 바탕(grey100 `#F2F4F6`) 위 흰 카드 쌓기 — 모서리 20 · 안쪽 20 · 좌우 15 · 카드 사이 14 | `/m/home` · `/m/goals` · `/m/household` · `/m/investments` | `MobileScreen` · `MobileSection` · `MobileCard` · `MobileSummary` |
| **상세 화면** | 흰 섹션 꽉 찬 폭 + 섹션 사이 회색 띠 16 · 섹션 제목 22 Bold · 머리는 흰 칸 | 목표 상세 · 종목 상세 · 코치 리포트 | `MobileScreen variant="detail"` · `MobileDetailTop` |

- 둘을 섞지 않는다 — 상세 안에 둥근 카드를 다시 쌓지 않는다
- 같이 쓰는 데스크톱 패널(`@repo/web-shared/ui/surface.css` `panel`)은 `/m` 에서 저절로 흰 섹션(모서리 0 · 선 0 · 24 × 20 · 제목 22) — 화면마다 덮지 않는다(`FE-REQ-074` FR-7)
- 그림자는 떠 있는 것(하단 탭 · 시트 · 하단 고정 버튼)에만. 카드는 면 색 차이로 가른다

## 2. 부품 — 새로 만들기 전에 이것을 쓴다

| 부품 | 값 | 어디 |
|---|---|---|
| 금액 행 | 왼쪽 아이콘 판 44 · 금액 `t3` 22 Bold 위 · 이름 `t6` 15 grey500 아래 · 오른쪽 회색 알약 하나 | `layout/mobile/home` 도메인 카드 |
| 금액 카드(탭 요약) | 금액 행 + 나머지 칸은 카드 바닥 줄 — 알약 없음(기록 버튼은 하단 고정) | `MobileSummary icon` — 저축 · 가계부(`FE-REQ-074`) |
| 아이콘 판 | 44 · 모서리 12 · grey100 면 + **사용자 3D 아이콘**(`@repo/ui/serviceicon`) 28 | 금액 행 · 목록 행 |
| 회색 알약 | grey100 · 모서리 12 · 높이 36 · `t6` Semibold grey700 · 그 도메인의 다음 행동 한 단어(넣기 · 적기 · 보기). 카드 전체가 링크면 알약은 모양만 | 행 오른쪽 |
| 카드 바닥 줄 | 위 1px grey100 선 · 보조 값 한 줄(이름 · 값) | 도메인 카드 |
| 미리보기 | 데스크톱 홈 카드와 **같은 서버 값**(흐름선 · 날마다 막대 · 목표 진척) · 높이 56 · 도메인 색 · 아래 한 줄 글 | `MobileCardPreview` |
| 두 칸 타일 | 흰 면 + 오른쪽 아래로 번지는 옅은 도메인 색 · 제목 두 줄 `t5` Bold · 오른쪽 아래 3D 그림 56 · 높이 108 | 홈 "바로 하기" |
| 바로가기 목록 카드 | 행 56 · 3D 아이콘 32 · 이름 `t5` Semibold(+ 보조 `t7`) · 셰브론 grey400 | `MobileShortcuts` — 홈 "바로가기" · 투자 탭 코치 리포트 |
| 설정 · 바닥 알약 | 가운데 · grey100 면 + 1px grey200 테두리 · 아이콘 18 · 높이 44 — 회색 바탕에 글자 링크를 맨글자로 두지 않는다 | `MobileFoot.css` — 홈 설정 · `DesktopViewFoot`(안내 한 줄 + "데스크톱 화면으로 보기") |
| 하단 탭 | 떠 있는 글래스 알약 — 좌우 16 · 아래 12 + 안전 영역 · 높이 64 · 반투명 흰 + 흐림 20 · 옅은 테두리 · 그림자 · 고른 칸 회색 알약 | `MobileTabBar` |
| 바텀 시트 | 떠 있다 — 좌우 · 아래 10 · 모서리 32 · 손잡이 · 제목 `t4` | `MobileSheetAction` |
| 하단 고정 버튼 | 탭 바로 위 · 꽉 찬 폭 · 화면당 하나(기록 버튼만) · **오프라인이면 막힘 + 이유 한 줄**(큐 · 낙관적 갱신 0) | `MobileSheetAction` |
| 마지막 화면 한 벌 | 홈 · 저축 · 가계부만 — 표시용 글자를 IndexedDB 에, 그 사용자 것만. 띠 grey200 · `t7` "오프라인 · HH:MM 기준"(받기 실패면 "불러오지 못했어요") · 빨강 · 느낌표 0 | `MobileOfflineSave` · `MobileOfflineFallback` · 오프라인 한 장 `offlinePage.ts`(2026-11-21 `FE-REQ-073`) |
| 설치 안내 | 홈 맨 아래 카드 한 장 — 첫 진입 0 · 닫으면 다시 안 뜸 · standalone 0 · 몸통은 보일 때 받는 청크 | `MobileInstallCard` |
| 알림 칸 | 홈 설치 안내 다음 카드 — 설치 앱(standalone)에서만 토글 · 도메인 셋 = 데스크톱 설정과 같은 값 · 켜짐 = 도메인 켬 + 이 기기 구독 · 권한 요청은 누름 안에서만 · 토글 누름 칸 44 | `MobilePushCard` · 판정 `@repo/core/mobile` `push`(2026-11-21 `FE-REQ-078`) |

- 같이 쓰는 조각(entities · features · widgets)의 휴대폰 값은 `/m` 표지(`ON_MOBILE` · `MOBILE_ROOT`)로만 — 데스크톱 `pages` 는 쓰지 않는다(시험)
- 디자인 시스템 작은 단(배지 sm · 버튼 · `Text body` · 고지 칸)은 크기 표지(`data-badge` …)로 틀이 한 번에 키운다 — 화면마다 덮지 않는다

## 3. 아이콘 · 그림

- 3D 아이콘은 **사용자 제작 한 벌**(`apps/web/public/assets/Icons`, `ServiceIcon` — mission · analysis · ranking · tip · social · game · household)만. 기준 서비스 그림 · 로고를 옮기지 않는다
- 새 그림이 필요하면 같은 화풍으로 한 벌에 더한다(`ServiceIconVariant`) — 화면에 SVG 를 흩지 않는다(`motion.md` §1)
- 아이콘은 장식(빈 `alt`) — 뜻은 옆 글자가 말한다

## 4. 옮기지 않는 것 — 제품 선

1. 주문 버튼(구매 · 매도) — 주문 실행 경로 0(공통 수용 기준 2)
2. 호재 · 악재 이름표 · 확신 문장(`i18n-policy.md` · 수용 기준 4)
3. 커뮤니티 · 쇼핑 · 광고 · 첫 진입 동의 시트(`screen-mobile.md` §5)
4. 지어낸 숫자 — 서버 값이 없는 카드(미션 · 순위 · 게임)는 기능이 생길 때 붙인다

## 5. 확인 — 바꾸면 이것을 다시 잰다

390(iPhone UA) · 360(Android UA) 탭 · 상세 화면 전부: 가로 넘침 0 · 글자 13 미만 0 · 누름 칸 44 미만 0 · 기기 글자 ×2 잘림 0 · 페이지 오류 0
(`FE-REQ-072` 체크리스트의 Playwright 측정 — 웹뷰 UA 가 아니라 휴대폰 브라우저 UA)

- **오프라인 시험은 서비스 워커 요청까지 끊는다** — `context.setOffline` 만으로는 워커의 요청이 나가 서버가 응답한다. `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1` 로 돌린다(2026-11-21 `FE-REQ-073` — 첫 회차 13건 가짜 실패)

## 6. 배터리 — 휴대폰은 데스크톱보다 먼저 본다(사용자 2026-11-21)

- 새 타이머 · 폴링을 `/m` 에 더하지 않는다 — 상태는 사건(`online` · `visibilitychange` …)으로. 간격 조회는 TanStack 기본(화면이 안 보이면 멈춤)을 끄지 않는다
- 첫 진입에 안 보이는 무거운 잎(시트 · 모션 그림)은 보일 때 받는다(`useLazyComponent`) — 받는 바이트도 배터리다
- 저장소 쓰기는 값이 바뀔 때 한 번. 무한 애니메이션은 로딩 표시만(`mobile-motion.md` §4)
- 실시간 소켓은 숨은 채 휴대폰 10초 · 데스크톱 5분이면 쉰다(`wsClient` `HIDDEN_CLOSE_MS` — `FE-REQ-077`). 새 실시간 연결도 이 클라이언트로만
- 하단 탭 흐림은 스크롤 GPU 작업 약 2.4배(버린 프레임 0, 2026-11-21 측정) — 그대로 둔다(사용자 2026-11-21 "그대로"). 흐림 · 그림자 요소를 더 늘리지 않는다
