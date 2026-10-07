---
id: SLICE-F010-7-OPS
title: "F010 슬라이스 7 — 운영(재료 신선도 게이트 · LLM 비용 상한 · 운영 점검 ops_monitor)"
priority: high
labels: [F010, slice, server, forecast, bff, fe]
created: 2026-10-07
---

## Summary

리서치 §10 슬라이스 7(운영) 중 셋만 한다(사용자 결정 2026-10-07 — 서버 변경 승인). 판정 · 목표 비중이 멈춘 재료로 나가지 않게 막고,
해설 LLM 호출에 하루 상한을 두고, 배치가 멈춘 것을 표로 남긴다. **점수 계산 · 사전등록 채점 규칙은 바뀌지 않는다.**

| 묶음 | 결과 | 제품에 들어간 것 |
|---|---|---|
| 신선도 게이트 | 시세 30분 · 단타 1시간봉 지표 3시간 · 장기 일봉 지표 3일 | 종목 판단 · 해설 · 목표 비중 막힘 사유 `stale_inputs`(표시만 막는다) |
| LLM 비용 상한 | 24시간 rolling — 사용자 30 시도 · 전체 300 시도 · 전체 150만 토큰 | 상한 · 원장 못 읽음 → 템플릿 해설(응답 모양 무변화) · 시도 단위 원장 `public.llm_call_logs` |
| 운영 점검 | 정기 작업 11 · 주간 비중 원장 · 매일 판단 원장 | `forecast.ops_check` · WARN 로그. 막지 않는다 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-024-F004-FUNC.md` FR-194~196(신규) | 신선도 게이트 |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-025-F004-API.md` FR-62~64(신규) | 해설 비용 상한 · 시도 기록 · 재시도 버그 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-017-F004-SCHEMA.md` FR-65(신규) | `public.llm_call_logs` |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` FR-24(신규) | `forecast.ops_check` |
| 예측 | `salt-forecast/requirements/specs/in-progress/FC-REQ-018-F010-OPS-MONITOR.md`(신규) | 운영 점검 · rule_ic 주기 |
| BFF | `bff/requirements/specs/done/BFF-REQ-039-F010-JUDGMENT-SCREEN.md` FR-7 · `BFF-REQ-041-F010-TARGET-WEIGHT.md` FR-7 | `stale_inputs` 옮기기 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-040-F010-JUDGMENT-SCREEN.md` FR-15 · `FE-REQ-042-F010-TARGET-WEIGHT.md` FR-14 | 막힘 문구 · `@repo/core` 유니온 |

하지 않는 것(사용자 결정 2026-10-07):

- **Redis 캐시** — 초대제 10명 규모에 효과가 작고 인프라가 하나 는다
- **상폐 백필** — 상장폐지 종목은 수집하지 않는다(이전 사용자 결정, `FEATURE-010` OQ 5). 생존 편향은 고지로
- **재학습 트리거** — 채택된 확률 모델이 없어 재학습할 대상이 없다 → 운영 점검으로 대체

## 계약

- 판단 · 목표 비중 `blockedReason` 에 `stale_inputs` **추가 값** — 서버 · BFF · `@repo/core` 같은 브랜치. 목표 비중 BFF 는 모르는 서버 사유를 지금처럼 `no_volatility` 로
- 해설 응답 모양 무변화 — 상한에 닿으면 `source: "template"`(기존 "규칙 기반 설명" 배지)
- 새 표 2(추가만): `public.llm_call_logs`(`20261007015852_llm_call_logs`) · `forecast.ops_check`(`20261007100000_forecast_ops_check`, 뷰 없음)
- 새 env 3(선택, 비우면 기준값): `LLM_USER_DAILY_CALL_LIMIT` · `LLM_DAILY_CALL_LIMIT` · `LLM_DAILY_TOKEN_LIMIT`
- `.claude/rules` 변경: `salt-forecast/.claude/rules/db-contract.md` §3 표에 `ops_check` · §5 보존에 `ops_check` 90일 — 새 표의 쓰기 주인 · 보존을 규칙에 맞춘 것뿐이다

## 커밋 (되돌리기 지점)

| 커밋 | 무엇 | 되돌리려면 |
|---|---|---|
| `bc2fbf0` feat(server) | 판정 · 비중 재료 신선도 게이트 · LLM 비용 상한 · 시도 원장 · Gemini 재시도 버그 | 이 커밋 + `DROP TABLE "llm_call_logs"` |
| `1efb44d` feat(bff,fe) | `stale_inputs` 사유 옮기기 · 막힘 문구 | 이 커밋(서버를 되돌리면 같이) |
| `59c75db` feat(forecast) | 운영 점검 `ops_monitor` · `forecast.ops_check` · `daily.sh` 단계 | 이 커밋 + `DROP TABLE forecast.ops_check` |
| `42df20b` fix(forecast) | `rule_ic` 를 월요일이 아니라 마지막 성공 156시간(6.5일)으로 고른다 | 이 커밋 하나 |

## 판단 — 리뷰가 볼 곳

1. **점수는 그대로, 표시만 막는다** — 사전등록 `rule-ic@1` · `mode-decision@2` 라이브 채점이 화면과 같은 규칙이어야 한다. 신선도로 점수를 깎으면 채점 대상 규칙이 바뀐다. 판단 원장(`PublishJudgmentLedger`) 발행도 신선도와 무관하게 그대로 — 사전등록 표본 선택을 바꾸지 않는다
2. **시각을 모르는 재료는 오래됐다고 하지 않는다** — `null` 은 결측(`missingData`)의 일. 기준은 봉 시작 시각, 2026-10-07 로컬 실측(1시간봉 지표 ≤ 2시간 · 일봉 ≤ 48시간 · 시세 ≤ 1분)에 여유를 둔 값
3. **상한 도달은 에러가 아니라 템플릿 · fail-closed** — 원장을 못 읽으면 부르지 않는다. 비용이 새는 쪽보다 해설이 템플릿으로 나가는 쪽이 싸다. 응답 모양이 같아 BFF · 화면 무변경
4. **과금 단위는 시도** — Gemini SDK 오류는 `error.status` 인데 공용 `isRetryableHttpError` 가 axios 모양만 읽어 4xx 까지 재시도했다(요청 하나 = 과금 3회). 429 · 5xx · 응답 없음만 재시도, 스키마 불일치는 재시도 안 함. 재시도도 원장 한 행
5. **운영 점검은 막지 않는다** — 기록 + WARN 로그만. 점검이 배치를 막으면 점검 버그가 곧 데이터 공백이다
6. **`rule_ic` 요일 → 경과 시간** — 10-05 월요일에 배치가 돌지 않아 한 주를 건너뛴 것을 첫 점검이 잡았다. `rule-ic@1` 등록에 요일 조건이 없다
7. **시장 심리를 게이트에서 뺐다** — 심리는 워커가 아니라 사용자가 market-intelligence API 를 부를 때만 계산돼 로컬에서 2026-09-30 뒤로 멈춰 있었다. 넣으면 판정이 전부 막힌다. 계산을 워커로 옮기는 것은 별도 REQ(사용자 결정)
8. **서버를 커밋 하나로 묶었다** — 신선도와 비용 상한이 `ExplainCoachDecision` · `ports.ts` · 같은 테스트 파일을 같이 고친다. 나누면 중간 커밋이 빌드되지 않는다
9. **동시 요청 경합에 락을 두지 않았다** — 확인과 호출 사이에 한두 건 넘을 수 있다. 초대제 10명 규모에서 상한은 대략값이면 된다

## 검증 · 미검증

`requirements/reports/checklists/F010-slice7-ops.md` · 회고 `requirements/reports/retrospects/F010-slice7-ops.md`.
