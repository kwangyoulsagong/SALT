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
| FR-3 | `POST /api/app/savings/goals` · `POST .../:id/deposits` · `POST /api/app/savings/deposits/split` — 응답은 갱신된 뷰모델(장면 한 칸 이동을 화면이 그릴 수 있게 `sceneStepBefore/After`) |
| FR-4 | `POST /api/app/savings/simulate` — 목표별 구간 변화. 저장 안 함 |
| FR-5 | `GET /api/app/savings/templates` — 템플릿 · 기준선(`verified` 플래그) |
| FR-6 | 공동 목표 초대 · 반응 경로 |
| FR-7 | 기존 `/api/app/goals*` 는 FE 전환까지 유지, 그 뒤 삭제 |
| FR-8 | 문구 키만 중계 — BFF 에서 문장을 만들지 않는다 |

## Acceptance Criteria

- [ ] 모든 숫자 필드가 서버 응답 그대로(가공 0)
- [ ] 서버 구간 실패 시 `degraded` + 계획값

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
