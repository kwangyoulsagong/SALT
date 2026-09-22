# FE-REQ-011 (F000 FUNC) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/FE-REQ-011-F000-FUNC.md`
- 브랜치: `feat/f000-watchlist-tab`(#41) · `feat/f000-invite-onboarding-slice`(#42) ·
  `feat/f000-realtime-reliability`(#43) · `feat/f000-market-table`(#44)
- 검증일: 2026-09-18 ~ 2026-09-21 (근거 기록) · 이 문서는 2026-09-22 머지 후 백필
- 상태: **부분 완료** — 관심 종목 동기화 · 실시간 수신 표시 · 터치 선택 · 반응형 · 초대 상태가 닫혔다.
  문구 정리 · 인증 축소 · 동면 호출 제거 · 2026-09-21 추가분은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md` ·
  `F000-invite-onboarding.md` · `F000-realtime-reliability.md` · `F000-market-table.md`

코드 위치는 `apps/web/src` 기준이다. "코드" 표시는 실행 실측 없이 코드로만 확인한 것이다.

## 1. 상태 동기화 — 관심 종목 (FR-1~7)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-1 단일 소스 · 같은 쿼리 | **pass** | `marketQueryKeys.watchlist` 하나를 두 탭이 본다. 루트 watchlist §1 #6 |
| FR-2 `features/toggle-watchlist` mutation · 무효화 | **pass** | `useToggleWatchlist` — `onSettled` 에서 watchlist 키 무효화 |
| FR-3 낙관적 갱신 허용 | **다르게** | 하지 않는다. 행에 현재가가 있어 미리 그리려면 가격을 지어내야 한다(`useToggleWatchlist` 주석). 토글 중 버튼 비활성 |
| FR-4 실패 시 되돌림 + 토스트 | **미충족** | 되돌릴 낙관 상태는 없지만 **실패를 알리는 표시도 없다** — 무효화 후 별이 원래대로 돌아갈 뿐이다 |
| FR-5 상한 409 `TRACKED_ASSET_LIMIT` 인라인 안내 | 미착수 | 2026-09-21 개정. 서버 상한 미구현 |
| FR-6 검색 · 표 · 탭 ★ 같은 쿼리 | 미착수 | 검색 화면 없음 |
| FR-7 보유 종목 ★ 해제 금지 | 미착수 | |

## 2. 종목 검색 · 뉴스 북마크 · 목표 수량 (2026-09-21 추가)

| FR | 판정 | 비고 |
|---|---|---|
| FR-80~84 검색 동작 | 미착수 | `features/search-asset` 없음 |
| FR-85~88 북마크 동작 | 미착수 | `features/toggle-news-bookmark` 없음 |
| FR-90~92 목표 수량 폼 | 미착수 | |

## 3. WebSocket 마지막 수신 시각 (FR-10~14)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-10 수신 시각을 `entities/market/model` 에 | **다르게** | `wsClient.getLastMessageAt()` — 수신 시각은 시세가 아니라 연결의 사실이다(`a76cec1`) |
| FR-11 헤더에 시각 표시 | **pass** | "실시간 오늘 12:09 기준" (Playwright 1440) |
| FR-12 끊기면 "연결 끊김" | **pass** | BFF WS 종료 2.5초 뒤 "실시간 연결 끊김 · 재연결 중", 재기동 뒤 복구 |
| FR-13 시각 갱신이 표를 리렌더하지 않는다 | **pass** | 헤더를 `RealtimeAsOf` 로 분리(`a76cec1`). Profiler 측정은 없다 |
| FR-14 하드코딩 `"실시간 오늘 19:30 기준"` 0건 | **pass** | `350f3e7` (`FE-REQ-010` FR-2) |

## 4. 터치 선택 · 반응형 (FR-20~32)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-20 `onClick` 추가 · `onMouseEnter` 유지 | **pass** | `350f3e7` |
| FR-21 키보드 Enter/Space | **pass** | `entities/market/lib/rowSelection.ts` (두 표 공통) |
| FR-22 선택 시각 표시 · hover 와 구분 | **다르게** | 선택 행에 색을 칠하지 않는다(`05b0427` 사용자 결정). 우측 프리뷰 + `aria-selected`. 첫 행에 멈춰 있던 `aria-selected` 를 `85913fc` 에서 고쳤다 |
| FR-23 sticky hover 방지 | **pass** | `(hover: hover)` 안에서만 칠한다(`85913fc`) |
| FR-30 모바일 프리뷰 접기 — CSS | **pass** | 375 에서 아래로 접힘(`8a8b321`). 루트 market-table §3 |
| FR-31 JS 뷰포트 판단은 마운트 후 | **pass (코드)** | `shared/lib/useElementWidth.ts` — `useEffect` 안에서 `ResizeObserver`. `matchMedia`/`innerWidth` 사용 0 |
| FR-32 선택 시 표 스크롤 위치 유지 | 미착수 | 측정 기록 없음 |

## 5. 문구 정리 (FR-40~44)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-40 사용자 문구를 `shared/i18n` 으로 | 미착수 | `HTTP_ERROR_MESSAGE` · `TOAST_MESSAGES` · `ERROR_MESSAGE` 는 `packages/core/src/http/constants.ts` 에 `NETWORK` · `HTTP_STATUS_CODE` 와 함께 있고 `shared/i18n` 은 재수출만 한다. 슬라이스 문구는 `FE-REQ-009` 에서 `model/messages.ts` 로 갔다 |
| FR-41 `constants/api.ts` 에 URL · 상수만 | 미착수 | 앱에 그 파일은 없다. 같은 문제가 위 `constants.ts` 로 옮겨 갔다 |
| FR-42 `덜 썻어요` 오타 | **pass** | `8d7574a`. 남은 1건은 수정 경위 주석 |
| FR-43 금지 표현 검사 | 미착수 | 검사 스크립트 · lint 없음 |
| FR-44 서버 코드 → i18n 키, 매핑 없으면 미렌더 | **부분** | 초대 경로만 — 매핑 없는 코드는 `unknownError` 로(`InviteCodeForm` `submitErrorOf`). 다른 경로는 확인하지 않았다 |

## 6. 초대 · 온보딩 상태 (FR-50~56)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-50 단계를 서버가 결정 | **pass** | `OnboardingFlow` 가 BFF `nextStep` 을 쓴다. 인덱스 변환만 한다 |
| FR-51 `invite/check` 디바운스 300ms | **다르게** | **400ms** + 6자 게이트 + 코드별 캐시 키. 루트 invite §1 #14 |
| FR-52 `invite/accept` 재시도 0 | **pass (코드)** | `useAcceptInvite` 에 `retry` 설정 없음(TanStack mutation 기본 0). `useInviteCheck` 도 `retry: false` |
| FR-53 성공 시 토큰 저장 · 홈 이동 · **쿠키** | **미충족** | `writeSession` 이 **`localStorage`** 에 저장한다. 수락 뒤 홈이 아니라 온보딩 다음 단계를 보여 준다(상태 무효화). 쿠키는 `FE-REQ-013` |
| FR-54 실패 `reasonCode` 3종 다른 문구 | **pass** | `INVITE_REASON_MESSAGES`. 상한 초과는 입력 중에는 노출되지 않고 **수락 시점에만** 별도 문구가 있다 |
| FR-55 `type="password"` · `new-password` | **pass (코드)** | `InviteCodeForm` 비밀번호 `TextField` |
| FR-56 재진입 시 완료 단계 건너뜀 | **pass (코드 · 계약)** | 서버 `nextStep` = 첫 미완료(루트 invite §1 #10). **화면 실측 없음** |

## 7. 인증 축소 · 동면 호출 (FR-60~73)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-60 회원가입 · 비밀번호 · 계정삭제 화면 · 훅 제거 | **pass** | 회원가입 화면은 구현된 적이 없었다. `/signup` 을 `PUBLIC_PATHS` 에서 제거(`bfe19ba`). 세 경로를 부르는 코드 grep 0 |
| FR-61 그 경로 직접 진입 → `/` | 미착수 | 리다이렉트 코드 없음 |
| FR-62 만료 시 refresh · 실패 시 로그인 | 미착수 | `apps/web/src` 에 refresh 호출 없음 |
| FR-63 로그인 화면 초대 안내 | 미착수 | `pages/login` 에 초대 · 온보딩 링크 없음 |
| FR-70~73 동면 API 호출 · 훅 · 화면 제거, 410 0건 | 미착수 | 2026-09-22 grep 으로 앱 코드 호출 0건이지만 MSW `rankingHandlers` 등록이 남아 있고, BFF 410 이 없어 FR-72 검증 수단이 없다 |

## 8. 명령

루트 체크리스트의 게이트를 따른다 — `check-types` · `lint`(`--max-warnings 0`) · `build` pass
(#41~#44). **웹에 테스트 러너가 없다** — 위 판정은 Playwright · curl 실측 또는 코드 확인이다.

## 9. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-13 Profiler 측정 · 하이드레이션 경고 0건 | 측정하지 않았다 | 웹 테스트 러너(`FE-REQ-013`) |
| 끊김 문구 375/390 | 1440 만 봤다(루트 realtime §5) | 다음 투자 화면 작업 |
| 온보딩 화면 브라우저 실측 (FR-50 · 56) | 계약만 curl 로 확인 | 이월 — 루트 invite §5 |
| FR-53 쿠키 | 토큰이 `localStorage` | `FE-REQ-013` |
| FR-40 · 41 문구 위치 | F000 에서 다루지 않았다 | 별도 작업 — `@repo/core/http` 분리 |
