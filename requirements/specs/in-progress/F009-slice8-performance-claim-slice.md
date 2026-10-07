---
id: SLICE-F009-8-PERFORMANCE-CLAIM
title: "F009 슬라이스 8 — 성적 문구 4요소(기간 · 표본 · 기준 · 빗나간 수) · 성적 금지어 (FR-33)"
priority: high
labels: [F009, slice, server, forecast, bff, fe]
created: 2026-10-07
---

## Summary

`FEATURE-009` FR-33(Must, Draft 였다) — 서비스가 자기 성적을 말하는 자리는 **기간 · 표본 수 · 기준 대비 · 빗나간 사례 수**를 한 벌로만
싣는다. 리서치 E3(`reports/research/2026-09-24-fund-manager-coach.md`) · SEC AI-washing · 한국 유사투자자문 금지 표현(미실현 수익률)에서 나왔다.

2026-10-07 조사: 성적 자리 10곳 중 넷을 다 갖춘 곳이 없었고, 라벨 둘이 틀렸다 — "틀렸던 때 N건"은 사례 목록 상한(3)을 셌고,
추천 "최근 N회"는 전체 기간 표본이었다.

사용자 결정(2026-10-07):

| 질문 | 결정 |
|---|---|
| 범위 | **서비스 성적만** — 판정 · 추천 · 성적표 · 게이지 · 변동 범위 · 주요 사건 · 쏠림 반응 · 목표 비중. 미러 · 월간 복기 · 보유 손익률은 본인 기록이라 제외. 금지어 검사는 전체 |
| 기간 | **첫 ~ 마지막 채점일**을 싣는다(창을 자르지 않는다 — 값 불변) |
| 정의 안 되는 칸 | **빈 칸 + 이유 코드**(`no_sample` · `no_direction` · `not_recorded`). 비율은 그대로 보인다 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/done/SRV-REQ-039-F009-PERFORMANCE-CLAIM.md`(신규) | `claim` 모양 · 성적 자리 8곳 · `performance_wording` 금지어 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` FR-25(신규) | `forecast.gate` · `event_reaction_stats` 열 · 뷰 3 |
| 예측 | `salt-forecast/requirements/specs/done/FC-REQ-019-F009-CLAIM-WINDOW.md`(신규) | 판정 창 · 빗나간 수 · 판정 대상 수 |
| BFF | `bff/requirements/specs/done/BFF-REQ-042-F009-PERFORMANCE-CLAIM.md`(신규) | `toPerformanceClaim` · 뷰모델 7 |
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-045-F009-PERFORMANCE-CLAIM.md`(신규) | `PerformanceClaimLine` · 라벨 정정 |

하지 않는 것:

- **본인 기록**(미러 "그냥 들고 있었으면" · 월간 복기 · 홈 보유 손익률) — 사용자 결정. 서비스가 주장하는 성적이 아니다
- **목표 비중 백테스트의 빗나간 수를 새로 세기** — 사전등록 [claims] 에 정의가 없다. 결과를 본 뒤 정의를 만들지 않는다 → `not_recorded`
- **투자 화면 요약 띠의 판정 성적표 칸**(`judgment-overview`) — 비율을 보이지 않고 본문으로 가는 링크라 줄을 붙이지 않았다
- 창 자르기(최근 N일) — 표본이 줄고 값이 바뀐다

## 계약

- 응답 **추가만**: 성적 객체마다 `claim: { period, sample, baseline, misses: { count, outOf } }`, 게이지 줄 `baselinePositiveRate`. 서버 · BFF · `@repo/core` 같은 브랜치
- 마이그레이션 `20261007120000_forecast_claim_window`(추가만) — 롤백 = 열 삭제 + 이전 뷰 정의(`20260928100000` · `20260924120000` · `20260927130000`). 이전 행은 `NULL` → `not_recorded`, 다음 배치가 채운다
- `languageGuard` 위반 코드 `performance_wording` 추가 — 규칙 문장 전수 테스트에 걸린다
- `.claude/rules` 변경: `salt-forecast/.claude/rules/db-contract.md` §3 `gate` · 반응 통계 설명에 새 열 — 쓰기 주인 · 계약 기록만

## 커밋 (되돌리기 지점)

| 커밋 | 무엇 | 되돌리려면 |
|---|---|---|
| `c541503` feat(server) | `claim` 모양 · 판정 · 추천 · 성적표 · 게이지 · 목표 비중 · 금지어 | 이 커밋(BFF · FE 를 먼저) |
| `a24e764` feat(forecast,server) | 게이트 · 반응 통계 창 열 · 뷰 · 서버 리더 · 변동 범위 · 사건 · 쏠림 `claim` | 이 커밋 + 열 삭제 · 이전 뷰 |
| `ef380b8` feat(bff) | 뷰모델 7곳 `claim` 옮기기 | 이 커밋 |
| `cd616e7` fix(server) | 목표 비중 응답 DTO 가 `claim` 을 옮긴다(실스택 확인에서 발견) | `c541503` 과 같이 |
| `2501453` feat(fe) | 4요소 한 줄 · 라벨 정정 · 키 중복 | 이 커밋 |

서버를 둘로 나눈 이유: 첫 커밋은 이미 있는 데이터(채점 시각 · 적중 수)로 되는 자리, 둘째는 forecast 스키마가 바뀌어야 되는 자리다.
스키마 변경을 한 커밋에 가둬 revert 지점을 하나로 둔다.

## 판단 — 리뷰가 볼 곳

1. **빗나간 수의 분모를 따로 둔다**(`outOf`) — 사건 반응은 앞 사건이 10건 이상일 때만 판정해 표본(68)과 판정 수(58)가 다르다. 표본으로 나누면 빗나감이 적어 보인다
2. **기준 칸은 "무엇과 비교했나"만** — 값(`excessWinRate` · `baselineWidth90` · 평소 분포 · BTC 보유)은 각 자리가 이미 그린다. 코드 5개
3. **게이지 기준 = 같은 종목 모든 구간의 오른 비율(표본 가중)** — 새로 저장하지 않고 읽을 때 계산. 구간이 하나뿐이면 기준과 같다(로컬이 그렇다)
4. **목표 비중 표본 = 등록 기간의 월요일 수(455)** — 리포트에 리밸런스 횟수가 없어 달력으로 셌다. 결과를 다시 계산한 것이 아니다
5. **BFF 가 라이브를 백테스트로 내리면 `claim` 을 비운다** — 서버 `claim` 은 서버 `recordSource` 의 기록이라, 화면 숫자와 다른 기록의 기간이 붙는다
6. **금지어 부정형** — "AI 가 예측한 것이 아닙니다"는 면책이다. 첫 판은 "아닙니다"를 못 잡았다(닙 ≠ 니) — 테스트로 고정
7. **사례 제목 정정** — "맞았던 때 · 틀렸던 때" 아래에 서버는 틀린 것만 보낸다. 맞은 사례를 더 보내는 것은 B2 원칙 재검토라 이번에 하지 않았다

## 검증 · 미검증

`requirements/reports/checklists/F009-slice8-performance-claim.md` · 회고 `requirements/reports/retrospects/F009-slice8-performance-claim.md`.
