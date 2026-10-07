---
id: BFF-REQ-042
feature: F009
area: bff
kind: API
title: "F009 FR-33 — 성적 4요소 claim 중계(7개 뷰모델)"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md FR-33 · salt-server/requirements/specs/done/SRV-REQ-039-F009-PERFORMANCE-CLAIM.md
---

## Summary

서버가 성적 자리마다 싣는 `claim`(기간 · 표본 · 기준 · 빗나간 수, `SRV-REQ-039`)을 화면 계약으로 옮긴다. **모양 검사만** — 깨진 칸은
지어내지 않고 `not_recorded`, `claim` 이 없으면(옛 서버) `null`. 칸이 조용히 사라지면 같은 숫자가 더 좋아 보인다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `services/performance-claim.viewmodel.ts` `toPerformanceClaim` — 순수 함수 · import 없음. 날짜 `YYYY-MM-DD` · 모르는 기준 코드 · 모르는 이유 · `count > outOf` · 음수/소수 표본을 거른다 | 완료(`ef380b8`) |
| FR-2 | 7개 뷰모델에 `claim`: 종목 코치(판단 `trackRecord` · 게이지 줄 + `baselinePositiveRate`) · 코치 리포트 추천 · 판정 성적표 그룹 · 변동 범위 · 주요 사건 · 쏠림(사건 `toHorizon` 공유) · 목표 비중 | 완료 |
| FR-3 | 종목 코치는 서버 `trackRecord` · 게이지 줄을 **통째로** 넘기고 있어 검사 안 된 claim 이 이미 흘렀다 — 정규화해 옮긴다 | 완료 |
| FR-4 | 목표 비중: BFF 가 라이브를 백테스트로 내렸으면(`liveComplete` 실패) 서버 claim 은 다른 기록을 말한다 → `null`. 숫자와 다른 기록의 기간을 붙이지 않는다 | 완료 |

## 계약

- 프론트 응답 **필드 추가만** — `@repo/core` `PerformanceClaim` 사본(`FE-REQ-045`) 같은 브랜치
- 순수 뷰모델끼리 import 1개(`performance-claim`) 를 허용한다 — "import 없음" 조건의 이유(부작용 모듈)는 그대로

## 하지 않는 것

- 빈 칸 채우기 · 기간 계산 · 빗나간 수 세기 — 서버 값만
- 성적표 요약 칸(투자 화면 띠)용 합계 claim — 서버가 합계를 주지 않는다

## Changelog

- 2026-10-07: 초판 · FR-1~4 완료(`ef380b8`)
