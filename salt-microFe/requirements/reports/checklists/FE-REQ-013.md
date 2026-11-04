# FE-REQ-013 (F000 PERF) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-013-F000-PERF.md`

## 2026-09-23 — 첫 로드 (`next build`, worktree)

| 경로 | 전 | 후 | 이유 |
|---|---|---|---|
| `/coach/report` | 134 kB | **109 kB** | MSW 게이트 · 목 제거 |
| `/investments/[symbol]` | 134 kB | **113 kB** | 목 제거(−24) + SEO 머리 서버 렌더(+3). 중간에 161 kB 회귀 → 머리를 서버 컴포넌트로 · 서버가 배럴을 안 가져오게 고쳐 닫음 |
| `/investments` | — | 140 kB | 변화 없음 |

규칙으로 남김: `performance-frontend.md` §7 — 서버 컴포넌트는 슬라이스 배럴을 값으로 import 하지 않는다.

## F011 슬라이스 6 — 국내 지수 · 투자자 순매수 (2026-10-26, 파일만 걸침)

| 항목 | 결과 |
|---|---|
| 번들 | `/investments` 153 kB · `/investments/[symbol]` 137 kB — 직전과 같음 |
| 자리 고정 | 지수 띠 청크 · 응답 전 74px — 표가 밀리지 않음(실화면 확인) |
| 갱신 주기 | 지수 1분(표와 같음) · 투자자 30분 stale(하루 한 번 모이는 값) |

미검증: 없음

## F011 슬라이스 6b (2026-10-27)

| 항목 | 결과 |
|---|---|
| 번들 | `web` 빌드 `/investments` 153 kB · `/investments/[symbol]` 137 kB — 6 과 같다 |
| 폴링 | 호가 10초는 장 중만 · 화면 숨으면 멈춤(TanStack 기본) · 4xx 면 멈춤 |

미검증: 호가 폴링이 열린 탭 여러 개일 때 서버 캐시 적중률 — 언제: 하루 쓴 뒤 서버 로그로

## 2026-10-29 스펙 파일 정리

- 본문(165줄)이 `to-do/`, 이력 9줄 파일이 `in-progress/` 에 두 벌이었다 → 본문을 `in-progress/` 로 옮기고 이력 3줄 합침. 옛 경로를 가리키는 문서 0건(grep). 내용 · 상태(in-progress) 무변경

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-11 의 `event-bus` · `remove()` 는 구독 · 리스너 해제로(PreviewChart 는 SVG) · FR-20~21 모바일 기준은 FE- / **FR-80 추가** — 쿠키 세션(서버 조회) 이전: 마스터 인덱스가 이 REQ 에 남겨 둔 일인데 FR 이 없었다. 지금 토큰은 `localStorage`(

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 번들 — `/search` 156 kB(라우트 청크) · `/investments` 153 kB 그대로
- 확인: web build

미검증: 없음 — 판단 무변경

## 2026-10-30 — F004 슬라이스 18 설정 화면

- `/settings` 첫 로드 130 kB(`/coach/report` 130 kB 와 같음). `ssr:false` 화면 목록에 하나 추가. 미검증 · 범위 밖: 서버 렌더 전환은 이 REQ 본 작업 때

## 2026-10-30 — F011 FR-41 휴장 사유 이름(장 상태 줄)

- 번들: `/investments` 154 kB · `/investments/[symbol]` 137 kB. 바꾸기 직전 웹 파일 3개를 사본으로 바꿔 넣은 같은 빌드도 154 · 137 — 이 변경의 증가 0(153 → 154 는 그 사이 머지분). `web-tax` 102 kB
- 미검증 · 범위 밖: 없음. 루트 `requirements/reports/checklists/F011-fr14-future-holidays.md`

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 앱 프레임 · 프로바이더 · 프로필 메뉴를 zone 공용 레이아웃으로(설정 · 로그아웃 이동은 문서 이동)(`d8692621`) · 셸 홈 → 도메인 요약 카드(투자 블록 · 매입가 숨김 잎 삭제)(`417076d8`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 로그인 표지 쿠키 + 셸 미들웨어(로그인 상태 `/` → 서버에서 `/home`)(`562adfad`). 파일 8개(경로 이동 내용 무변경 2 · 수정 3 · 추가 2 · 삭제 1). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

- 2026-11-02 MONEY-F1 최종 HEAD 번들(위 스펙 Changelog 행) — main 워크트리 빌드 대조

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 번들(PERF) — `FE-REQ-054` 앱 내비게이션이 모든 화면 레이아웃에 들어왔다. Next 표: 셸 공용 103 · `/home` 169 → 158 · `/settings` 132 · `/onboarding` 149(main 워크트리 빌드 대조). **HTML 이 실제로 싣는 JS gzip**: `/home` 215.0 → 224.2(+9.2) · `/settings` 218.2 → 220.8(+2.6) · `/onboarding` 221.2 → 223.7(+2.5) KB(최종 HEAD `5c7218e9`) — 예산 40 KB 안. Next 표가 줄어든 것은 레이아웃 몫을 화면 표에서 빼고 세기 때문(`5a86dafa` · `e0bce695`)
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`)

- **기존 결함 수정** `f6587a53` — 로그인 화면(`RedirectSignedIn`)이 Redux 사용자(`USER`)로, 셸 미들웨어 표지 쿠키는 토큰으로 판단해 토큰 없이 `USER` 만 남은 브라우저는 들어올 때마다 로그인 화면이 비쳤다가 홈으로 갔다(사용자 보고 "여전히 localhost:3000 들어가면 로그인 창 갔다가 홈으로"). 판단을 토큰(`useHasAccessToken`) 하나로 · 토큰 없는 `USER` 는 복원(`useInitializeAuth`) 때 지운다 — 표지 쿠키(이 REQ 쿠키 세션 이관 전 임시)와 화면 판단이 같은 기준이 됐다
- 재현 · 확인(임시 사용자, 실 BFF · 서버): USER 만 남긴 상태 방문 2회 — 전 로그인 폼 → `/home` 2/2 · 후 로그인 화면 유지 2/2 + USER 지워짐. 토큰 있고 쿠키만 없는 상태 — 첫 방문 1회 비침(쿠키를 이때 단다) · 둘째부터 서버 307. 새 로그인 — 307 → `/home`, 로그인 폼 0

## 2026-11-03 — 번들 최종

- 위 Changelog 줄과 같다(HTML 스크립트 gzip, main 워크트리 대조)

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`c60f5bfb`): 저축 첫 숫자 서버 렌더(`FE-REQ-056` FR-13)가 이 REQ(토큰 → 쿠키)를 기다린다 — 저축 조회 훅이 같은 이유로 클라이언트
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`
- 번들(Next 표 First Load, 운영 빌드): 저축 zone 새 화면 `/goals` 146 · `/goals/[id]` 146 · `/goals/new` 125 kB(공용 102) · 셸 `/home` 158 → 154 kB(F2 기록 대비 — 임시 목표 목록 · `goal` store 삭제) · 투자 zone 무변경

## 2026-11-03 — 쿠키 세션 1단계 `0ef25f6b`

- FR-80 **1단계 done** — 셸 Route Handler `/api/session`(같은 origin 만 · JWT 모양 · 수명 = exp, 최대 하루)이 httpOnly `salt_at` 을 쓰고 지운다. 로그인 · 갱신 · 로그아웃 · 탭 첫 진입이 같이 부른다. 서버 컴포넌트가 이 쿠키로 BFF 를 부른다(첫 소비처: 저축). **2단계 남음**: 브라우저 저장소 토큰 제거 · BFF 쿠키 → Authorization · WS · SSE
- 실측: `/api/session` POST 204 + HttpOnly · 다른 사이트 403 · 모양 틀림 400 · DELETE 지움 · 셸 경유 `/goals` · `/goals/[id]` HTML 에 목표 이름 · 금액(쿠키 없으면 없음) · 브라우저 첫 진입에 쿠키 채움 · `document.cookie` 에 안 보임 · 수화 오류 0. 모노레포 check-types · lint · test · web · web-savings 빌드 · 훅

## 2026-11-03 — MONEY-S1b

- MONEY-S1b — 파일만 걸침(`6ad345fc` · `5171d03d`): 저축 조회 훅 파일(`useGoalQueries.ts`, 머리 주석에 이 REQ)에 저울 · 비상시 계산 훅 둘 추가 · 쓰기 요청을 `goalApi.ts` `savingsRequest` 한 곳으로. 토큰 경로(`authHeader` · 쿠키 서버 렌더)는 그대로 — FR-80 2단계 무관
- 확인: 저축 목록 · 상세 서버 HTML 에 장면 글 · 엽서(쿠키로 서버 조회) — 첫 숫자 서버 렌더 유지

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] web-household 운영 빌드 표
- [ ] FR-80 2단계 — 변함없이 별 슬라이스

## 2026-11-04 — 가계부 S1c 번들

- [x] `/household` 158 → 160 kB · `/household/new` 131 → 133 kB · `/household/budget` 131 kB · 공용 102 kB(가계부 zone 운영 빌드, 최종 HEAD)

## 2026-11-04 — 가계부 S1d(`MONEY-S1d-household-challenge`)

- [x] 번들 `/household/challenges` 153 kB(새) · `/household` 161 · `/goals/[id]` 154 · 공용 102 kB(Next 표)

## 2026-11-04 — 가계부 S1e(`MONEY-S1e-household-fixed-cost`)

- [x] 번들 `/household` 161 → 162 kB · 공용 103 kB(가계부 zone 운영 빌드) · 월 화면 요청 수 하나 그대로
