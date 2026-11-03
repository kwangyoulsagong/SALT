---
id: BFF-REQ-047
feature: F012
area: bff
kind: API
title: "저축 — /api/app/savings/* 뷰모델(목록 · 상세 · 적립 · 저울 · 공동 목표)"
priority: high
created: 2026-10-30
source: salt-server/requirements/specs/to-do/SRV-REQ-045-F012-SAVINGS.md
---

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/savings/goals` — 목표 목록 뷰모델(진척 · 이정표 · 장면 단계 · 프레임 · 실물 환산 한 줄) |
| FR-2 | `GET /api/app/savings/goals/:id` — 상세(도달 구간 · 적중 이력 또는 `reason` · 도장 · 놓친 달 · 오늘 돈) |
| FR-3 | `POST /api/app/savings/goals` · `POST .../:id/deposits` · `POST /api/app/savings/deposits/split` — 응답은 갱신된 뷰모델(장면 한 칸 이동을 화면이 그릴 수 있게 ~~`sceneStepBefore/After`~~ **정정 2026-11-03: 갱신된 상세의 `scene.step` + 화면 캐시의 이전 칸 — 필드를 만들지 않는다**) |
| FR-4 | `POST /api/app/savings/simulate` — 목표별 구간 변화. 저장 안 함 |
| FR-5 | `GET /api/app/savings/templates` — 템플릿 · 기준선(`verified` 플래그) |
| FR-6 | 공동 목표 초대 · 반응 경로 |
| FR-7 | 기존 `/api/app/goals*` 는 FE 전환까지 유지, 그 뒤 삭제 |
| FR-8 | 문구 키만 중계 — BFF 에서 문장을 만들지 않는다 |

## 진행 — S1a (2026-11-03, 슬라이스 `requirements/specs/done/MONEY-S1a-savings-calculator-slice.md`)

| FR | 상태 |
|---|---|
| FR-1 · 2 | done — 목록 · 상세(서버 응답 그대로). 장면 단계 · 도장 · 놓친 달 · 오늘 돈은 서버가 아직 안 준다(S1b) |
| FR-3 | 부분 — 만들기 · 적립 · 나눠 넣기(갱신 상세). `sceneStepBefore/After` 는 장면(S1b) 뒤 |
| FR-5 | done — 템플릿(기준선 null + 이유) |
| FR-7 | done — **같은 슬라이스에서 FE 전환** → 옛 `/api/goals*` 프록시 삭제 · 410 `ENDPOINT_RETIRED` + `replacement`(`RETIRED_PATHS`, 1주 뒤 목록째 삭제) |
| FR-8 | done — 문구 0(키 중계) |
| + | 홈 저축 카드 원천 `/goals/statistics` → `/savings/home-card`(`BFF-REQ-046`) · 계산 `POST /api/app/savings/calculate`(스펙 표 밖 — 서버 판단 4) · 라우팅 표 `/savings` → platform |
| FR-4 · 6 | S1b — 저울 · 공동 목표 |

## 진행 — S1b (2026-11-03, 슬라이스 `requirements/specs/in-progress/MONEY-S1b-savings-fun-slice.md`)

| FR | 상태 |
|---|---|
| FR-1 · 2 | done(이어서) — 서버가 새로 주는 칸(`scene` · `stampCount` · `postcard` · `unitLine` · `planMeetsDeadline` · 상세 `missedMonths` · `units` · `unitLimit`)을 타입에. 가공 0. 오늘 돈은 서버가 아직 안 준다(물가 원천) |
| FR-3 | done — ~~`sceneStepBefore/After`~~ **정정 2026-11-03**: 적립 응답의 갱신된 상세 `scene.step` 과 화면 캐시의 이전 칸으로 충분하다(비교는 계산이 아니다) — 필드를 만들지 않는다 |
| FR-4 | done — `POST /api/app/savings/simulate`(조회 예산 2초) + 확정 `PUT /api/app/savings/goals/plans`(쓰기 5초 · 재시도 없음) |
| (추가) | `POST /goals/:id/emergency-compare`(조회 예산) · `POST/DELETE /goals/:id/units[/:unitId]`(쓰기) — 스펙 FR 표 밖, 서버 `SRV-REQ-045` FR-12 · 16 의 중계 |
| FR-6 | 범위 밖 — 공동 목표(identity S3 뒤) |

## Acceptance Criteria

- [x] 모든 숫자 필드가 서버 응답 그대로(가공 0) — `app-savings.test.ts`
- [x] 서버 구간 실패 시 `degraded` + 계획값 — **닫힘 2026-11-03(`2c998117`)**: 서버가 구간 계산을 감싸 실패하면 `degraded: true` · `degradedReasons: ["projection"]` · 계획대로면 X월만, BFF 는 지우지 않고 전달. ~~미충족 2026-11-03: 구간은 서버 안 계산(외부 호출 없음)이라 따로 실패하지 않는다. 서버 전체가 죽으면 화면 오류(4xx/5xx 중계). 채점 사본(`FC-REQ-024`)이 붙을 때 그 칸만 `degraded` 로 — S1b~~

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | **in-progress** — S1a `3e5e0d42`(BREAKING `/api/goals*` 410) · `b1c8ad67`(`progressRatio`). FR-1 · 2 · 5 · 7 · 8 done, FR-3 부분. 수용 기준 1/2 |
| 2026-11-03 | 수용 기준 2 닫음(`2c998117` — 구간 실패 → `degraded` + 계획값). 2/2 |
| 2026-11-03 | `c82be47c` — 계약: `projection.issuedAt` 제거 · 이정표 상태 `reached` 추가(BFF 타입). 전달만 |
| 2026-11-03 | MONEY-S1a — `c60f5bfb` — 웹 `domain-savings` 의 조회 · 타입 파일이 이 계약(`/api/app/savings/*` 뷰모델)을 소비한다. BFF 무변경 |
| 2026-11-03 | MONEY-S1b — `f4deeee6` FR-3 · 4 done(경로 5 중계 · 테스트 +1) · `ca1fcb11` 기한 판정 · 단위 상한 칸 타입. FR-3 `sceneStepBefore/After` 정정(만들지 않음) |
| 2026-11-03 | MONEY-S1b 셸 경유 실측 — `73973f79` 비상시 `loan.lastPayment` 타입. 전달만 |
