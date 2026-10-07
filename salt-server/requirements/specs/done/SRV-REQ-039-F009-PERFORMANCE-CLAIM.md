---
id: SRV-REQ-039
feature: F009
area: server
kind: FUNC
title: "F009 FR-33 — 성적 문구 4요소 claim(기간 · 표본 · 기준 · 빗나간 수) · 성적 금지어"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md FR-33 · requirements/reports/research/2026-09-24-fund-manager-coach.md E3
---

## Summary

서비스가 자기 판단 · 규칙의 과거 성적을 말하는 자리마다 **기간 · 표본 수 · 기준 대비 · 빗나간 사례 수**를 한 벌(`claim`)로 싣는다.
2026-10-07 전에는 성적 자리 10곳 중 넷을 다 갖춘 곳이 없었다 — 기간은 "판단 뒤 N일"뿐(데이터는 전체 기간), 빗나간 수는 사례 목록(최대 3)뿐.

사용자 결정(2026-10-07): 적용은 **서비스 성적만**(미러 · 월간 복기 · 보유 손익은 본인 기록이라 제외) · 기간은 **첫~마지막 채점일** ·
정의할 수 없는 칸은 **빈 칸 + 이유 코드**(`no_sample` · `no_direction` · `not_recorded`).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `domain/policy/performanceClaim.ts` — `PerformanceClaim { period, sample, baseline, misses }`, 칸마다 `{ present: true, … }` 또는 `{ present: false, reason }`. 기준 코드 5(`same_action_always` · `naive_range` · `ordinary_days` · `all_gauge_days` · `hold_btc`) — 값은 각 성적 객체의 기존 필드, claim 은 무엇과 비교했는지만. `misses.outOf` = 맞고 틀림을 판정한 수(기본 표본) | 완료(`c541503`) |
| FR-2 | 종목 판단 · 저장 추천 · 성적표: 저장소 집계에 `evaluated_at` MIN/MAX(`firstScoredAt` · `lastScoredAt`), 빗나간 수 = 표본 − 적중. 관망 · 보유 · 리밸런싱은 기저율이 없어 기준 `no_direction`. `summarizeJudgmentTrack` · `summarizeRecommendationTrack` 한 곳 — 판단 블록 · 성적표 · 해설 카드가 같은 값 | 완료(`c541503`) |
| FR-3 | 게이지 줄: `GaugeTrackStore.baselinePositiveRate` — 같은 종목 · 기간 **모든 구간**의 오른 비율(표본 수 가중) · 기간 = 저장된 창 · 빗나간 수 `no_direction`(분포) | 완료(`c541503`) |
| FR-4 | 목표 비중: `targetWeightClaim` — 백테스트는 등록 기간 · `mondaysBetween`(455주, 등록 기간 · 주기에서 센 달력 수) · BTC 보유 기준, 라이브는 첫 리밸런스 ~ 기준일 · `nWeeks`. **빗나간 수는 둘 다 `not_recorded`** — 등록 [claims] 에 정의가 없고 결과 뒤 새로 세지 않는다 | 완료(`c541503`) |
| FR-5 | 변동 범위 · 주요 사건 · 쏠림 신호: 뷰 새 열(`DB-REQ-029` FR-25 · `FC-REQ-019`)로 기간 · 범위 밖 수. 사건 반응은 `outOf = miss_judged`. 열이 생기기 전 행은 `not_recorded` | 완료(`a24e764`) |
| FR-6 | `languageGuard` `performance_wording` — "AI 가 예측 · 맞혔 · 적중" · 합산 수익률 · 미실현 수익률 · 영어(AI-predicted · unrealized gains · combined returns). 부정 · 면책("AI 가 예측한 것이 아닙니다")은 10자 안 `아니 · 아닙 · 아님 · 않` 이면 통과. 규칙 문장 전수 검사 테스트가 같은 금지어를 본다 | 완료(`c541503`) |
| FR-7 | 목표 비중 응답 DTO(`presentation/dto/targetWeightView.ts`)가 `claim` 을 옮긴다 — 필드를 골라 옮기는 DTO 라 빠져 있었다(실스택 화면 확인에서 발견) | 완료(`cd616e7`) |

## 계약

- 응답은 **필드 추가만**: 판단 `trackRecord.claim` · 게이지 `baselinePositiveRate` · `claim` · 추천 `signalTrackRecord.claim` · 성적표 그룹 `claim` · 변동 범위 `trackRecord.claim` · 사건 · 쏠림 기간 `claim` · 목표 비중 `claim`
- BFF 짝 `BFF-REQ-042`, 화면 `FE-REQ-045`. 게이트(`judgmentGate` · `recommendationGate`) 판정은 무변경

## 하지 않는 것

- 사용자 본인 기록(미러 · 월간 복기 · 보유 평가 손익)에 4요소 — 서비스 성적 주장이 아니다(사용자 결정)
- 백테스트 빗나간 수를 사후에 새로 정의 · 계산
- 기간을 최근 N일 창으로 자르기(값이 바뀐다 — 사용자 결정으로 전체 기간 + 날짜 표기)

## Changelog

- 2026-10-07: 초판 · FR-1~7 완료(`c541503` · `a24e764` · `cd616e7`)
