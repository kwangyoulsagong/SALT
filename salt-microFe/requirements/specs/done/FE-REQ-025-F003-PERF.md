---
id: FE-REQ-025
feature: F003
area: fe
kind: PERF
title: "F003 밸류에이션 밴드 적립 — 웹 성능 정의"
priority: high
labels: [fe, performance, streaming-ssr, plan]
created: 2026-09-09
---

## Summary

적립 숫자는 홈에서 **가장 먼저 보여야 하는 값**이다. 김프·실패 이력·밴드 표가 이 숫자를 기다리게 만들면 안 된다.

## 예산

| 지표 | 대상 | 목표 | 상한 |
|---|---|---|---|
| 홈 셸 TTFB | 홈 | 200ms | 400ms |
| 홈 ② 블록 도착 | 적립 숫자 | 700ms | 1.2s |
| 적립 상세 LCP | 상세 | 1.5s | 2.5s |
| 김프 게이지 도착 | 상세 | 1.2s | **차단 안 함** |
| 실패 이력 lazy fetch | 아코디언 | 400ms | 800ms |
| INP (체크 버튼) | 전역 | 100ms | 200ms |
| CLS | 홈·상세 | 0 | 0.1 |
| 라우트 JS (gzip) | 적립 상세 | 45KB | 70KB |
| 이번 달 적립 합계 도착 (2026-09-21 — B20) | 목표 화면 상단 | 600ms | **목표 카드 차단 안 함** |
| 설정 저장 응답 (2026-09-21 — D9 · B12) | 설정·온보딩 | 300ms | 600ms |

## Requirements

### A. 스트리밍 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 홈 셸(탭바·헤더·블록 골격)은 **데이터 없이** 즉시 flush된다 | Must |
| FR-2 | 홈 "이번 주 적립" 블록은 **독립 Suspense 경계**다. 다른 블록(총자산 · AI 추천 · 기존 목표 카드 등) 지연이 적립 블록을 막지 않는다. **개정 2026-09-21** — 홈이 3블록 + 기존 블록으로 바뀌었다(D6) | Must |
| FR-3 | 적립 상세에서 **적립 숫자 + 자산 분해**가 첫 경계다 | Must |
| FR-4 | **김프 게이지는 별도 경계**다. 1.5s upstream 타임아웃이 숫자를 막지 않는다 | Must |
| FR-5 | 밴드 표의 **축·라벨은 정적 셸**로 먼저 그리고 현재 위치만 스트리밍한다 | Must |
| FR-6 | 실패 이력은 초기 페이로드에 넣지 않는다. 펼침 시 fetch | Must |
| FR-7 | 각 경계의 fallback은 **최종 레이아웃과 같은 높이**다. CLS 0 | Must |

### B. 렌더 게이트와 성능의 충돌 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 게이트 판정은 **서버가 준 필드 읽기**뿐이다. 추가 fetch가 0건이다 | Must |
| FR-11 | `renderable: false`일 때 **실패 이력을 fetch하지 않는다** | Must |
| FR-12 | 게이트 때문에 스트리밍이 지연되면 안 된다. 게이트 판정은 O(1) | Must |

### C. 번들

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `BandTable`·`IndicatorTrackRecord`는 **클라이언트 번들에 없다**. RSC 또는 lazy | Must |
| FR-21 | 클라이언트 컴포넌트는 **체크 버튼·아코디언 토글·설정 폼**뿐이다 | Must |
| FR-22 | 차트 라이브러리를 적립 화면에 넣지 않는다. 게이지는 CSS/SVG | Must |
| FR-23 | 설정 폼은 상세 진입 시 로드하지 않는다. 편집 진입 시 lazy | Should |

### D. 캐시와 재검증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 주간 계획은 `no-store`. 사용자별 데이터다 | Must |
| FR-31 | 실패 이력은 **변경이 드물다**. `revalidate: 3600` 허용 | Should |
| FR-32 | 체크 성공 시 계획·연속주차 태그만 `revalidateTag`. 홈 전체 무효화 금지 | Must |
| FR-33 | 브라우저 `localStorage`에 적립 금액을 캐시하지 않는다(월 적립액 입력값 포함 — 2026-09-21) | Must |
| FR-34 | **2026-09-21 추가 — B20.** 이번 달 합계는 `no-store`. 체크 성공 시 `plan-monthly` 태그만 revalidate | Must |
| FR-35 | **2026-09-21 추가 — B20.** 목표 화면에서 합계 블록은 목표 카드와 **별도 Suspense 경계**다 | Must |

### E. 측정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 경계별 도착 시각을 RUM으로 남긴다 (`block=plan`, `block=kimchi`) | Must |
| FR-41 | `plan_multiplier_blocked` 발생률을 대시보드에 노출한다 | Must |
| FR-42 | CI에서 적립 상세 라우트 JS 크기를 회귀 검사한다 | Must |
| FR-43 | Lighthouse CI: 적립 상세 Performance ≥ 90 (모바일 프로파일) | Should |

## 부하 시나리오

| 시나리오 | 조건 | 기대 |
|---|---|---|
| 김프 upstream 타임아웃 | 1.5s 후 실패 | 적립 숫자 **정상 도착**, 게이지만 미표시 |
| 지표 전체 실패 | `indicators: []` | 기본액 렌더, LCP 예산 유지 |
| 실패 이력 없음 | `renderable:false` | 추가 fetch 0건, 오히려 더 빠름 |
| 자산 20종 | `items.length=20` | 상세 LCP 2.5s 이내, 가상화 불필요 확인 |
| 느린 3G | 400kbps | 홈 셸 1s 이내 표시 |

## Acceptance Criteria

- [ ] 홈 셸이 데이터 없이 즉시 flush된다
- [ ] **② 블록이 독립 경계고 다른 블록 지연에 영향받지 않는다**
- [ ] 적립 상세에서 숫자 + 분해가 첫 경계다
- [ ] **김프 타임아웃(1.5s)이 적립 숫자 도착을 막지 않는다**
- [ ] 밴드 표 축이 정적 셸로 먼저 그려진다
- [ ] 실패 이력이 초기 페이로드에 없다
- [ ] **모든 fallback 높이가 최종과 같고 CLS가 0.1 이하다**
- [ ] 게이트 판정에 추가 fetch가 0건이다
- [ ] `renderable:false`에서 실패 이력 fetch가 0건이다
- [ ] `BandTable`·`IndicatorTrackRecord`가 클라이언트 번들에 없다
- [ ] 적립 화면에 차트 라이브러리가 없다
- [ ] 주간 계획이 `no-store`다
- [ ] 체크 성공 시 홈 전체가 무효화되지 않는다
- [ ] `localStorage`에 적립 금액이 저장되지 않는다
- [ ] 경계별 도착 시각 RUM이 수집된다
- [ ] CI 번들 회귀 검사가 동작한다
- [ ] 느린 3G에서 홈 셸이 1s 이내 표시된다
- [ ] 이번 달 합계 지연·실패가 목표 카드를 막지 않는다 (B20)
- [ ] 체크 성공 시 `plan-monthly` 태그만 revalidate 된다

## Dependencies

- **선행:** `FE-REQ-008`(스트리밍 SSR) · `BFF-REQ-022`(BFF 예산)
- **짝:** `FE-REQ-022`(UI) · `023`(FUNC) · `024`(API)
- **규칙:** `performance-frontend.md` · `streaming-ssr.md`

## Open Questions

- 홈 ② 블록 700ms 목표는 BFF 300ms + 서버 계산 시간에 달려 있다. BFF 예산이 밀리면 FE 목표도 같이 밀린다 — 어디를 먼저 조일지.
- 실패 이력 `revalidate: 3600`은 사용자별이 아니라 지표별이므로 공유 캐시가 가능하다. BFF에서 캐시할지 Next 캐시에 둘지.

## 정리 2026-11-19 — FR 대조 (`WEB-perf-req-close-slice.md`)

> v1 전제(홈 ② 블록 · RSC 스트리밍 상세 · 김프 별도 경계 · 실패 이력 lazy)가 v2 에서 바뀌었다 — `/plan` 은 클라이언트 잎 한 블록(`FE-REQ-022` 머리 블록), 김프 · 성적 · 실패 사례는 `weekly` 한 응답. 실측 — 임시 서버 4020(쿼리 줄 셈) · 임시 BFF 4011 · 예열 2회 뒤 10~20회 순차 · 웹은 투자 zone 운영 빌드 헤드리스 1440×900 3회(루트 `WEB-perf-req-close-slice.md` 실측 표)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 | 대체 | 홈 ② 블록이 없다 — 홈은 투자 카드 `note` 한 줄(`F003-v2-s3-plan-screen-slice.md` 판단 5). 홈 셸 flush 는 F003 몫이 아니다 |
| FR-2 | 충족 | 적립 줄은 BFF 가 600ms 로 잘라 카드(800ms)를 막지 않는다 — `bff/src/services/app-home.service.ts:26 · 98`(allSettled, 실패면 줄만 뺀다) |
| FR-3 | 대체 | 상세는 한 블록 — 금액 · 분해 · 근거가 한 응답(`packages/domain-invest/src/pages/plan/ui/PlanBody.tsx:10-13` ssr:false · `FE-REQ-022` 머리 블록) |
| FR-4 | 대체 | 요청 경로에 김프 upstream 호출이 없다 — 예측 배치 값이 `weekly` 에 같이 온다(`salt-server/src/plan/domain/policy/bandCard.ts:34`) |
| FR-5 | 대체 | 밴드 표는 응답과 함께 그린다(경계 분리 없음) — LCP 404~660ms |
| FR-6 · FR-11 | 대체 | 실패 이력 별도 fetch 가 없다 — 한 응답에 3건 + 전체 수(`salt-forecast/src/salt_forecast/domain/accumulation.py:34`). 추가 fetch 0 |
| FR-7 | 측정 충족 | CLS 0.0006(3회) — 경계 minHeight 360(`pages/plan/model/index.ts`). 스켈레톤 추가 불필요 |
| FR-10 · FR-12 | 충족 | 게이트는 `renderable` 필드 읽기 한 번 — `entities/plan/ui/PlanAssetCard.tsx:42` |
| FR-20 · FR-21 | 대체 | 클라이언트 잎 결정(`FE-REQ-022` 머리 블록) — 본문 전체가 dynamic 청크. 라우트 전용 JS 11.5 kB(예산 45 kB) |
| FR-22 | 충족 | plan 슬라이스에 차트 라이브러리 import 0(grep) — 진행 막대는 `@repo/ui` ProgressBar |
| FR-23 | 대체 | 설정 폼은 `/plan` 본문 안 칸이다(설정 화면 · 온보딩 없음 — `FE-REQ-022` 머리 블록). 라우트 전용 JS 11.5 kB 라 나눌 이득이 없다 |
| FR-30 | 충족 | BFF plan 다섯 경로 `Cache-Control: no-store` — `bff/src/rest/controllers/plan.controller.ts:41 · 50 · 57 · 66 · 75` · 시험 `__tests__/plan.controller.test.ts:151` |
| FR-31 | 대체 | 실패 이력 경로가 없다(FR-6) |
| FR-32 | 충족 | 체크 뒤 plan 키만 무효화 — `features/complete-weekly-plan/api/useCompleteWeeklyPlan.ts:36` |
| FR-33 | 충족 | plan 슬라이스 · `@repo/core/plan` 에 브라우저 저장소 사용 0(grep) · React Query 저장 persister 없음 |
| FR-34 | 충족 | 월 합계도 `no-store`(FR-30) + `planQueryKeys.all` 무효화 |
| FR-35 | 대체 | 목표 화면 합계가 없다 — `/plan` 안 블록(글로벌 플랜 판단 4). 월 합계 실패 격리는 `widgets/weekly-plan/ui/WeeklyPlanBoard.tsx:98-101` |
| FR-40 · FR-41 | 범위 이동 | 보낼 곳이 없다(배포 안 함) — `OPS-001` FR-9(관측) 착수 때 |
| FR-42 · FR-43 | 대체 | CI 를 두지 않는다(사용자 2026-11-04, `done-checklist.md` §1) — 대신 실측: 라우트 전용 11.5 kB · 첫 진입 241 kB · LCP 404~660ms |

| 예산 행 | 실측 | 판정 |
|---|---|---|
| 홈 셸 TTFB · 홈 ② 블록 도착 | — | 대체(FR-1) |
| 적립 상세 LCP 1.5s | 404~660ms | 측정 충족 |
| 김프 게이지 · 실패 이력 lazy | — | 대체(FR-4 · 6) |
| CLS 0 / 0.1 | 0.0006 | 측정 충족 |
| 라우트 JS 45 kB | 라우트 전용 11.5 kB · 첫 진입 241 kB | 측정 충족 |
| 이번 달 합계 600ms · 설정 저장 300ms | BFF monthly p95 1.3ms · PATCH p95 3.8ms | 측정 충족 |
| INP(체크 버튼) | 안 쟀다 | 예산 행(FR 아님) — 체크는 낙관적 갱신 한 번(`useCompleteWeeklyPlan.ts` onMutate) |

부하 시나리오 — 김프 타임아웃 · 지표 전체 실패는 v2 에 그 경로가 없다(대체). 실패 이력 없음 = 게이트 닫힘은 실화면 확인(`FE-REQ-022` 체크리스트). 자산 20종은 자산 2로 대체. 느린 3G 홈 셸은 F003 몫이 아니다.

| 남은 것 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-40 · 41 RUM · 차단 발생률 대시보드 | 배포 안 함 — 보낼 곳이 없다 | `OPS-001` FR-9 착수 시 |

판정: **done**

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. FR-2 개정(홈 D6 구성), 이번 달 합계·설정 저장 예산과 FR-34·35 추가(B20 · D9 · B12) |
| 2026-11-19 | FR 대조 정리(`WEB-perf-req-close-slice.md`) — v1 경계 FR 대체 · CLS 0.0006 · LCP 404~660ms · 라우트 전용 JS 11.5 kB 실측 · plan 응답 `no-store` · FR-40 · 41 은 `OPS-001` FR-9 로 범위 이동. to-do → done |
