---
id: FE-REQ-013
feature: F000
area: fe
kind: PERF
title: "F000 정리·편집 — 웹 성능 정의 (실시간 테이블 60fps 유지 · 정리 효과)"
priority: high
labels: [fe, performance, budget, websocket, table, bundle]
created: 2026-09-09
---

> **2026-10-29 전수 조사 — 아래 본문 중 지금과 다른 것** (본문은 당시 기록으로 둔다)
> - FR-11 의 `event-bus` · `remove()` 는 구독 · 리스너 해제로(PreviewChart 는 SVG) · FR-20~21 모바일 기준은 FE-REQ-043 안내로 웹 해당 없음
> - **FR-80 추가** — 쿠키 세션(서버 조회) 이전: 마스터 인덱스가 이 REQ 에 남겨 둔 일인데 FR 이 없었다. ~~지금 토큰은 `localStorage`(`shared/api/authToken.ts`)~~ **2026-11-05 2단계 done** — 토큰은 httpOnly 쿠키뿐(`web-shared/src/api/session.ts`)


## Summary

F000의 성능 급소는 **실시간 테이블**이다. 100행 × WS 초당 수십 회 갱신 × 변동률 blink 2초 애니메이션이 동시에 돈다. 이 화면은 **변경 금지 목록**이므로 수리 과정에서 성능이 나빠지면 안 된다.

## 예산

| 지점 | 예산 | 비고 |
|---|---|---|
| 홈 첫 페인트 | **400ms** | F006에서 5블록으로 바뀌기 전 |
| `/investments` 첫 페인트 | 500ms | 테이블 100행 |
| **실시간 테이블 스크롤** | **60fps** | **변경 금지 — 현재 성능 유지** |
| **변동률 blink** | **60fps** | 2초 애니메이션 |
| 종목 선택 → 우측 프리뷰 갱신 | **200ms** | 차트 + 게이지 + 뉴스 |
| 차트 종목 전환 | 300ms | 인스턴스 재사용 |
| 관심 종목 탭 전환 | 200ms | |
| 뉴스 프리뷰 갱신 | 200ms | |
| 온보딩 단계 전환 | 150ms | |
| `invite/check` 디바운스 | 300ms | |
| 클라이언트 JS 증가분 | **0KB 목표** | 수리는 코드를 늘리지 않는다 |
| 검색 입력 → 결과 표시 (2026-09-21) | **디바운스 300ms + 300ms** | 이전 결과를 유지한 채 교체 |
| ★ · ☆ 토글 반응 (2026-09-21) | **100ms** | 낙관적 갱신 |
| `/search` 첫 페인트 (2026-09-21) | 300ms | 검색바 + 최근 검색 |
| 뉴스 카드 배지 · 칩 추가 후 프리뷰 갱신 (2026-09-21) | 200ms 유지 | FR-12 예산 불변 |

## 급소 1 — 실시간 테이블 (변경 금지 목록)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 수리 전/후 **스크롤 프레임과 blink 프레임을 측정**해 동일하거나 개선됨을 확인한다 | Must |
| FR-2 | **행 컴포넌트를 셀 단위로 쪼갠다.** 가격 셀만 바뀔 때 행 전체가 리렌더되면 100행 × 초당 N회다 | Must |
| FR-3 | WS 메시지를 **throttle**한다(`@repo/ui/useThrottle`). 화면 갱신은 60fps 이상 필요하지 않다 | Must |
| FR-4 | **리스트 `key`에 index를 쓰지 않는다.** 정렬·필터 5종이 있어 전부 재마운트된다 | Must |
| FR-5 | blink는 **`transform`/`opacity`만** 쓴다. `background-color` 애니메이션은 페인트를 유발한다 | Must |
| FR-6 | `onClick` 추가(FR-6 수리)가 **리렌더를 늘리지 않는다.** 핸들러를 행마다 새로 만들지 않는다 | Must |
| FR-7 | 마지막 수신 시각 갱신이 **헤더만** 리렌더한다. 테이블 전체를 건드리지 않는다 | Must |
| FR-8 | **100행은 가상화 임계값 경계다.** 서버 페이징이 있으므로 가상화 전에 페이징을 먼저 검토한다. 가상화하면 `Ctrl+F`가 안 먹는다 | Must |

## 급소 2 — 우측 프리뷰 갱신

종목을 바꾸면 차트·게이지·뉴스 3개가 동시에 갱신된다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **차트 인스턴스를 재사용**한다. 종목 전환마다 새로 만들지 않고 데이터만 교체한다 | Must |
| FR-11 | 언마운트 시 `remove()`. 종목을 여러 번 바꿀 때 메모리가 새면 안 된다 | Must |
| FR-12 | 3개 호출(차트·게이지·뉴스)을 **병렬**로 띄운다 | Must |
| FR-13 | 종목 선택을 **디바운스**한다(hover로 선택되므로 마우스가 지나갈 때마다 요청이 나간다). 150ms 기본 | Must |
| FR-14 | 이전 종목의 요청을 **`AbortSignal`로 취소**한다. 빠르게 여러 행을 지나가면 요청이 쌓인다 | Must |
| FR-15 | 뉴스 이미지에 `loading="lazy"` + 크기 고정. CLS 방지 | Must |

## 급소 3 — 반응형 수리가 성능을 해치지 않게

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `MarketPreview` 접힘을 **CSS 미디어 쿼리**로 한다. JS 분기는 하이드레이션 불일치와 리렌더를 만든다 | Must |
| FR-21 | 접힌 상태에서 **차트를 마운트하지 않는다.** 모바일에서 보이지 않는 차트가 WS를 구독하면 낭비다 | Must |
| FR-22 | `maxHeight`를 `calc(100vh - N)`로. **리사이즈마다 JS로 계산하지 않는다** | Must |
| FR-23 | 표 `overflow-x` 컨테이너가 **스크롤 성능을 해치지 않는지** 확인한다. `will-change`를 남발하지 않는다 | Must |

## 번들 — 수리는 코드를 늘리지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 클라이언트 JS 증가분 **0KB 목표**. 수리는 기능 추가가 아니다 | Must |
| FR-31 | 관심 종목 탭·온보딩 화면이 추가되므로 **그만큼만** 늘어난다. 측정해서 기록한다 | Must |
| FR-32 | 문구를 `shared/i18n`으로 옮기는 것이 **번들을 늘리지 않는지** 확인한다. 카탈로그 전체가 초기 번들에 들어가면 안 된다 | Must |
| FR-33 | 제거된 동면 호출·훅·쿼리 키만큼 **번들이 줄어야 한다** | Should |
| FR-34 | 새 의존성 추가 시 증가분을 PR에 적는다 | Must |

## 2026-09-21 추가 — 검색 · 뉴스 배지 · 북마크

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `/search` 는 **별도 라우트 청크**다. `/investments` 초기 번들에 검색 코드가 들어가지 않는다 (D8) | Must |
| FR-71 | 검색 결과 행은 최대 50 이다. 가상화하지 않는다 (D8) | Must |
| FR-72 | 뉴스 배지 · 칩 · ☆ 추가가 프리뷰의 **CLS 를 늘리지 않는다**(고정 높이 · 한 줄 말줄임, `FE-REQ-010` FR-82). CLS before/after 기록 (기본안 — 감사 문서 B11) | Must |
| FR-73 | 북마크 블록은 관심 종목 탭에서만 요청한다. 시장 탭 진입 시 북마크 목록을 부르지 않는다 (D5) | Must |
| FR-74 | 상태 스켈레톤(`FE-REQ-010` FR-100~104)이 실제 콘텐츠와 **같은 크기**다. 로드 완료 시 레이아웃 이동 0 (기본안 — 감사 문서 B22) | Must |
| FR-75 | 증가분(`/search` 청크 · 북마크 블록 · 배지)을 측정해 FR-31 기록에 더한다 | Must |

## 정리 효과 측정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `pnpm build` 시간을 정리 전/후 측정한다 | Should |
| FR-41 | 클라이언트 JS 크기를 정리 전/후 측정한다 | Must |
| FR-42 | 제거된 훅·쿼리 키 수를 기록한다 | Should |
| FR-43 | 측정값을 `requirements/reports/checklists/FE-REQ-013.md`에 남긴다 | Must |

## 접근성 성능

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `prefers-reduced-motion`에서 blink를 **멈추지 않고 느리게** 한다. 변동률 표시는 필수 피드백이다 | Must |
| FR-51 | WS 갱신이 스크린리더를 **매초 낭독하게 하지 않는다.** 가격 셀에 `aria-live`를 쓰지 않는다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정: 테이블 스크롤 프레임, blink 프레임, 종목 전환 시간, WS 수신률·throttle 후 갱신률, 차트 전환 시간, 클라이언트 JS 크기, 빌드 시간 | Must |
| FR-61 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## 2026-10-29 추가 — 쿠키 세션

| ID | 요구사항 | 우선 |
|---|---|---|
| FR-80 | 액세스 토큰을 `localStorage` 에서 httpOnly 쿠키 세션(서버 컴포넌트 조회)으로 옮긴다 — 마스터 인덱스가 이 REQ 에 남긴 일("쿠키 세션은 남음"). 지금 `shared/api/authToken.ts` 가 미달을 적고 있다. `FE-REQ-011` FR-53 · `FE-REQ-028` FR-80 이 이것을 기다린다. **done 2026-11-05**(1단계 `0ef25f6b` · 2단계 `721063fc`) | Must |
| FR-81 | **서버 조회로 옮길 클라이언트 화면**(2026-11-05 — FR-80 2단계로 서버가 쿠키를 읽는다. 지금까지 "토큰이 `localStorage`"가 이유였던 자리): 셸 홈 카드(`HomeCards` · `HomeBriefing`) · 온보딩 상태 · 투자 코치 리포트 · 판정 근거 · 코치 설정 · 상세 분석 본문 · 관심 목록 탭. 국내 주식 상세 · 시세는 **대상 아님**(약관상 서버 HTML 금지). 화면마다 첫 숫자 HTML · 번들 · 수화를 재고 옮긴다 — 투자 쪽은 동결(2026-10-30) 해제 또는 그 화면을 다시 만질 때 | Should |
| FR-82 | **비공개 경로 서버 보호**(2026-11-05) — 로그인 표지 · 세션 쿠키가 없으면 미들웨어가 로그인으로 보낸다. 셸 미들웨어 주석이 "쿠키로 간 뒤"로 미뤄 둔 일. zone 5 미들웨어 · 운영 경로 라우팅(`OPS-001` FR-13)과 같이 정한다 | Should |

## Acceptance Criteria

- [ ] **실시간 테이블 스크롤이 수리 전/후 60fps를 유지한다** (측정값 기록)
- [ ] **변동률 blink가 60fps를 유지한다** (측정값 기록)
- [ ] 행 컴포넌트가 셀 단위로 쪼개져 있고 가격 셀만 리렌더된다 (Profiler)
- [ ] WS 메시지가 throttle된다
- [ ] 리스트 `key`에 index가 0건이다
- [ ] blink가 `transform`/`opacity`만 쓴다
- [ ] `onClick` 추가로 리렌더가 늘지 않았다 (Profiler 비교)
- [ ] 마지막 수신 시각 갱신이 헤더만 리렌더한다
- [ ] 가상화 여부가 페이징 검토 후 결정되고 근거가 기록되어 있다
- [ ] 종목 전환 시 차트 인스턴스가 재사용된다
- [ ] 언마운트 시 `remove()`가 호출된다 (메모리 누수 0건)
- [ ] 프리뷰 3개 호출이 병렬이다
- [ ] 종목 선택이 디바운스된다 (행 5개를 빠르게 지나가면 요청 1~2건)
- [ ] 이전 종목 요청이 취소된다
- [ ] 뉴스 이미지에 `loading="lazy"`와 크기 고정이 있다 (CLS 측정)
- [ ] `MarketPreview` 접힘이 CSS로 처리된다 (JS 분기 0건)
- [ ] **접힌 상태에서 차트가 마운트되지 않는다**
- [ ] `maxHeight`가 `calc()`이고 리사이즈 JS 계산이 0건이다
- [ ] 표 `overflow-x`가 스크롤 성능을 해치지 않는다
- [ ] 클라이언트 JS 증가분이 신규 화면분만큼이다 (측정값 기록)
- [ ] i18n 카탈로그 전체가 초기 번들에 들어가지 않는다
- [ ] 동면 호출 제거로 번들이 줄었다 (측정값 기록)
- [ ] `pnpm build` 시간이 기록되어 있다
- [ ] 측정값이 checklist 리포트에 있다
- [ ] `prefers-reduced-motion`에서 blink가 멈추지 않고 느려진다
- [ ] 가격 셀에 `aria-live`가 0건이다
- [ ] `/search` 가 별도 청크이고 `/investments` First Load 가 늘지 않았다 (2026-09-21)
- [ ] 검색 입력 → 결과 600ms 이내 (측정값 기록)
- [ ] ★ · ☆ 반응 100ms 이내
- [ ] 뉴스 배지 · 칩 추가 전후 프리뷰 CLS 가 같거나 낮다
- [ ] 시장 탭에서 북마크 목록 요청이 0건이다
- [ ] 스켈레톤 → 콘텐츠 전환에서 레이아웃 이동이 0이다

## Dependencies

- **선행:** `FE-REQ-010`~`012` · `BFF-REQ-010`(BFF 성능)
- **규칙:** `performance-frontend.md` · `canvas.md` · `a11y-policy.md`

## Open Questions

- 100행을 가상화할지. **서버 페이징이 이미 있으므로 페이징을 먼저 검토**하고, 가상화하면 `Ctrl+F`가 안 먹는 대가를 진다 → 현재 60fps가 나오면 건드리지 않는 것이 맞다.
- 종목 선택 디바운스가 hover 선택 UX를 해치는지. 150ms면 체감이 없을 가능성이 높지만 확인 필요.
- i18n 카탈로그를 코드 분할할지. 문구가 많지 않으면 불필요하다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | **스토리보드 갭 감사 반영.** 예산 4행(검색 · 토글 · `/search` 첫 페인트 · 배지 추가 후 프리뷰)과 FR-70~75(`/search` 별도 청크 · 가상화 안 함 · 배지 CLS · 북마크 지연 요청 · 스켈레톤 크기 · 증가분 기록) 추가. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |
| 2026-09-23 | 첫 로드 실측 — 리포트 134 → 109 kB · 상세 134 → 113 kB(목 제거 · 머리 서버 컴포넌트). 서버 컴포넌트의 배럴 import 규칙 추가(`performance-frontend.md`) |
| 2026-10-26 | F011 슬라이스 6(국내 지수 · 투자자 순매수) — `MarketBoard` 국내 탭에 지수 띠 잎(`ssr:false` · 자리 고정). `/investments` 153 kB · 상세 137 kB 그대로 |
| 2026-10-27 | F011 슬라이스 6b(호가 · 시간외) — 국내 상세에 호가 잎(장 중 10초 폴링 · 화면 숨으면 멈춤). `/investments` 153 kB · 상세 137 kB 그대로 |
| 2026-10-29 | **파일 정리** — 본문이 `to-do/` 에, 이력만 든 9줄 파일이 `in-progress/` 에 따로 있었다(상태를 in-progress 로 옮길 때 본문을 옮기지 않아 이후 이력이 빈 경로에 쌓였다). 본문을 `in-progress/` 로 옮기고 위 세 줄(09-23 · 10-26 · 10-27)을 합쳤다. 내용 무변경. F009 슬라이스 9 전수 조사에서 발견 |
| 2026-10-29 | 전수 조사 — 현재와 다른 서술 정정(머리 블록). 본문은 당시 기록으로 둠 |
| 2026-10-30 | 번들 — `/search` 156 kB(라우트 청크) · `/investments` 153 kB 그대로 — F000 종목 검색 슬라이스. 루트 `requirements/specs/in-progress/F000-asset-search-slice.md` |
| 2026-10-30 | 번들 — F011 FR-41 장 상태 줄 휴장 사유(문구 하나 · 분기 하나). `/investments` 154 kB · 상세 137 kB — **바꾸기 직전 파일로 같은 빌드도 154 · 137**(사본 교체 대조), 증가 0. 153 → 154 는 그 사이 머지분. 루트 `requirements/specs/in-progress/F011-fr14-future-holidays-slice.md` |
| 2026-10-30 | F004 슬라이스 18 — `ssr:false` 화면이 하나 늘었다(`/settings` 본문 — 토큰이 `localStorage` 에만 있어서). 토큰 쿠키로 옮길 때 같이 서버로 옮길 목록에 더한다. 번들 `/settings` 130 kB(리포트와 같은 수준) |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 앱 프레임 · 프로바이더 · 프로필 메뉴를 zone 공용 레이아웃으로(설정 · 로그아웃 이동은 문서 이동)(`d8692621`) · 셸 홈 → 도메인 요약 카드(투자 블록 · 매입가 숨김 잎 삭제)(`417076d8`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 로그인 표지 쿠키 + 셸 미들웨어(로그인 상태 `/` → 서버에서 `/home`)(`562adfad`). 파일 8개(경로 이동 내용 무변경 2 · 수정 3 · 추가 2 · 삭제 1). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로 |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 번들 — 셸: 공용 103 kB(전 105) · `/` 146(전 149) · `/home` 169(전 178 — 투자 블록 → 카드) · `/settings` 132 · `/onboarding` 149 · 미들웨어 33 kB(로그인 표지). 투자 zone `/search` 157(전 셸 156). 웹 글꼴 `next/font` 같은 origin(런타임 외부 요청 0) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 번들(PERF) — `FE-REQ-054` 앱 내비게이션이 모든 화면 레이아웃에 들어왔다. Next 표: 셸 공용 103 · `/home` 169 → 158 · `/settings` 132 · `/onboarding` 149(main 워크트리 빌드 대조). **HTML 이 실제로 싣는 JS gzip**: `/home` 215.0 → 224.2(+9.2) · `/settings` 218.2 → 220.8(+2.6) · `/onboarding` 221.2 → 223.7(+2.5) KB(최종 HEAD `5c7218e9`) — 예산 40 KB 안. Next 표가 줄어든 것은 레이아웃 몫을 화면 표에서 빼고 세기 때문(`5a86dafa` · `e0bce695`) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — **기존 결함 수정** `f6587a53` — 로그인 화면(`RedirectSignedIn`)이 Redux 사용자(`USER`)로, 셸 미들웨어 표지 쿠키는 토큰으로 판단해 토큰 없이 `USER` 만 남은 브라우저는 들어올 때마다 로그인 화면이 비쳤다가 홈으로 갔다(사용자 보고 "여전히 localhost:3000 들어가면 로그인 창 갔다가 홈으로"). 판단을 토큰(`useHasAccessToken`) 하나로 · 토큰 없는 `USER` 는 복원(`useInitializeAuth`) 때 지운다 — 표지 쿠키(이 REQ 쿠키 세션 이관 전 임시)와 화면 판단이 같은 기준이 됐다 |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 번들 최종(`378d8a1c`) — 앱 탭이 `CrossZoneLink` 를 쓰며 0.1~0.2 KB 더: `/home` 224.3(+9.3) · `/settings` 221.0(+2.8) · `/onboarding` 223.9(+2.7) KB |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`c60f5bfb`): 저축 첫 숫자 서버 렌더(`FE-REQ-056` FR-13)가 이 REQ(토큰 → 쿠키)를 기다린다 — 저축 조회 훅이 같은 이유로 클라이언트 |
| 2026-11-03 | FR-80 **1단계 done** — 셸 Route Handler `/api/session`(같은 origin 만 · JWT 모양 · 수명 = exp, 최대 하루)이 httpOnly `salt_at` 을 쓰고 지운다. 로그인 · 갱신 · 로그아웃 · 탭 첫 진입이 같이 부른다. 서버 컴포넌트가 이 쿠키로 BFF 를 부른다(첫 소비처: 저축). **2단계 남음**: 브라우저 저장소 토큰 제거 · BFF 쿠키 → Authorization · WS · SSE(`0ef25f6b`) |
| 2026-11-03 | MONEY-S1b — 파일만 걸침(`6ad345fc` · `5171d03d`): 저축 조회 훅 파일(`useGoalQueries.ts`, 머리 주석에 이 REQ)에 저울 · 비상시 계산 훅 둘 추가 · 쓰기 요청을 `goalApi.ts` `savingsRequest` 한 곳으로. 토큰 경로(`authHeader` · 쿠키 서버 렌더)는 그대로 — FR-80 2단계 무관 |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 가계부 번들(Next 표 First Load JS): `/household` 148 · `/household/month/[ym]` 148 · `/household/new` 131 · `/household/budget` 127 kB · 공용 102 kB. 쿠키 서버 조회 소비처 둘째(가계부 월 화면 `serverMonth`)(`df45ae7d`) |
| 2026-11-04 | 가계부 S1a 리뷰 반영 `b147221e` — `serverMonth` import 경로만(엔티티 이름 변경). 번들 `/household` 148 → 149 kB(최종 HEAD) |
| 2026-11-04 | 가계부 S1c(`MONEY-S1c-household-mirror`, `f0c8793d`) — 번들(Next 표 First Load JS): `/household` 158 → 160 · `/household/month/[ym]` 160 · `/household/new` 131 → 133 · `/household/budget` 131 · `/household/templates` 132 kB · 공용 102 kB. 새 쿼리 훅 하나(`useWorkHours` — 예산 화면만) |
| 2026-11-04 | 가계부 S1d(`MONEY-S1d-household-challenge`, `23d44bb6`) — 번들(Next 표 First Load JS): `/household/challenges` 153 kB(새 — 첫 숫자는 클라이언트 조회, 서버 렌더 대상 아님: 쓰기 화면) · `/household` 160 → 161 · `/goals/[id]` 154 kB · 공용 102 kB. 새 쿼리 훅 하나(`useChallenges` — 챌린지 화면만) |
| 2026-11-04 | 가계부 S1e(`MONEY-S1e-household-fixed-cost`, `b1d14ed6`) — 번들(Next 표 First Load JS): `/household` 161 → 162 kB · 공용 103 kB. 새 조회 0(고정비 후보 · 보통 금액은 월 화면 응답 안 — 요청 수 그대로 하나) |
| 2026-11-05 | 가계부 S1f(`MONEY-S1f-household-categories-accounts`, `3269eef3`) — 번들(Next 표 First Load JS): `/household` 162 → 163 kB · `/household/budget` 134 kB · 공용 103 kB. 월 화면 새 조회 0(분류 표는 월 응답 안), 예산 · 적기 화면은 분류 표 조회 하나(5분 stale) |
| 2026-11-05 | 가계부 S1g(`MONEY-S1g-household-story`, `1c46db88`) — 번들(Next 표 First Load JS): `/household/story/[period]` 151 kB(새 — 첫 카드는 서버가 쿠키로 받아 HTML 에, 1.5초 넘으면 브라우저 조회) · `/household` 164 kB 그대로 · 공용 103 kB. 공유 이미지는 누를 때만 그린다(상시 캔버스 0) |
| 2026-11-05 | 가계부 S1h(`MONEY-S1h-household-revolving-people`, `38ed6518`) — 번들(Next 표 First Load JS): `/household` 164 → 165 kB · `/household/revolving` 154 kB · `/household/people` 156 kB(새) · 공용 103 kB |
| 2026-11-05 | FR-80 **2단계 done** — 토큰을 브라우저 저장소에서 뺐다. 액세스 · 리프레시 둘 다 httpOnly 쿠키(리프레시 경로 `/api/session` 으로 좁힘) · 표지 쿠키는 같은 응답에서. 셸 Route Handler 셋(`POST`·`DELETE /api/session` · `POST /api/session/refresh` — 리프레시 쿠키로 BFF 갱신, 401·403 이면 셋 다 지움 · 5xx 는 그대로). 브라우저는 BFF 를 같은 origin `/api/*` 로(셸 rewrites afterFiles · 운영 ADR-008) · 서버 코드는 `BFF_SERVER_URL`. 갱신 규칙 `withSessionRefresh`(보낼 때 표지 있었나 — 경계 표 테스트 9). 웹소켓은 연결 쿠키 · 인증 거부면 갱신 뒤 한 번 다시 연결(1분에 한 번). 옛 `localStorage` 세션 첫 진입 이관. `authHeader` 호출 50곳 제거(`721063fc`) · BFF `fb9c85b3`. 번들(Next 표 First Load JS): 셸 `/` 149 · `/home` 158 · `/onboarding` 152 · `/settings` 135 · `/goals` 152 · `/household` 165 kB — **main(`9214c271`) 워크트리 같은 빌드 대조: `/home` 159 → 158 · `/goals` 153 → 152 · 나머지 같음(증가 0)** — 헤더 만들기 50곳이 빠졌다. 루트 `requirements/specs/done/F000-cookie-session-slice.md` |
| 2026-11-05 | FR-81 · FR-82 추가 — FR-80 2단계로 가능해진 후속 둘(서버 조회 이관 목록 · 비공개 경로 보호)을 FR 로. 코드의 낡은 이유 주석 13곳("토큰이 `localStorage`")에 정정 문장(국내 주식 둘은 "약관상 클라이언트에 남는다") · 셸 미들웨어 주석 |
| 2026-11-05 | 확인 단계 2회차 — 투자 zone · 웹뷰 · 쓰기 실화면 통과 · 낡은 주석 정정(`95829941`). 체크리스트 §4 |
| 2026-11-05 | 금융 팁 S2b 확인 2회차(루트 `requirements/specs/done/MONEY-S2b-tips-quiz-diff-slice.md`) — 이 REQ 에 걸린 몫: FR-80 쿠키 세션의 갱신 실패 처리 — 공개 경로 판정을 `isPublicPath` 하나로(공개 금융 팁 글 제자리) (`cf93acb1`) |
