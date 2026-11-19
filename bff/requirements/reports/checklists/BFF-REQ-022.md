# BFF-REQ-022 checklists

## 2026-11-19 FR 대조 정리(`WEB-perf-req-close-slice.md`)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 · 2 · 3 · 4 · 23 | 대체 | BFF 가 김프를 따로 부르지 않는다(`BFF-REQ-019` 머리 블록) — 나란히 부르는 것은 로고용 시세 목록뿐(`bff/src/services/app-plan.service.ts:44` allSettled · 400ms) |
| FR-5 | 대체 | 요청 경로에 외부 호출이 없다 — 김프 실패는 예측 배치 수집 결함이고, 없거나 오래되면 서버가 `null`(`salt-server/src/plan/domain/policy/bandCard.ts:40-41`) |
| FR-10 · 11 | 충족 | plan 서비스에 캐시 0(`app-plan.service.ts`) · 응답은 `no-store`(`rest/controllers/plan.controller.ts:41 · 50 · 57 · 66 · 75`) |
| FR-20 | 충족 | `Promise.allSettled` — `app-plan.service.ts:44` · `app-home.service.ts:98`. plan 경로 `Promise.all` 0 |
| FR-21 | 충족 | 읽기 1.5s · 쓰기 3s · 로고 400ms · 홈 줄 600ms — `app-plan.service.ts:25-29` · `app-home.service.ts:26` |
| FR-22 | 충족 | 쓰기 재시도 0 — `proxyAuthRequest` 는 재시도하지 않는다(`app-plan.service.ts` 주석) · 프론트 `retry: 0` |
| FR-30 · 31 · 32 | 충족 | 자산 2 · 밴드 5줄 · 실패 사례 3건(`salt-forecast/src/salt_forecast/domain/accumulation.py:34`) |
| FR-33 | 측정 충족 | weekly 3,356 B · settings 1,083 B · monthly-summary 167 B |
| FR-40 | 측정 충족 · 대체 · 범위 이동 | p95 — weekly 12.8ms · settings GET 1.0 · PATCH 3.8 · complete 5.2 · monthly 1.3ms. 김프 실패율 · `staleDays` 는 v2 에 그 경로가 없다(대체). 게이트 미렌더 · 완료 호출 수 카운터는 `OPS-001` FR-9 |
| FR-41 | 범위 이동 | `OPS-001` FR-9 — 재료는 응답의 `degradedReasons`(`services/plan.viewmodel.ts:282`) |
| FR-42 | 측정 충족 | BFF − 서버 p95: weekly 12.8 − 2.9ms(로고용 시세 목록 포함) · complete 5.2 − 5.0 · monthly 1.3 − 1.0 → 20ms 아래 |
| FR-43 | 충족 | plan 서비스 로그는 로고 실패 경고 하나(사유만) — 금액 · `monthlyBaseKrw` 0 |
| FR-44 | 충족 | 성능 수정 커밋이 없다(`no-store` 는 캐시 정책) — 수치는 루트 슬라이스 실측 표 |

예산 행 — `/kimchi-premium` · `/indicators` 경로는 없다(대체). 나머지 경로는 위 p95 가 전부 예산 안.

| 남은 것 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-40 일부 · FR-41 게이트 미렌더 · 완료 호출 수 카운터 | 배포 안 함 — 보낼 곳이 없다 | `OPS-001` FR-9 착수 시 |
