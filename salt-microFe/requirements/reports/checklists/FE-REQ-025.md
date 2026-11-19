# FE-REQ-025 checklists

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

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
