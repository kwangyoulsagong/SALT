---
id: FC-REQ-018
feature: F010
area: forecast
kind: FUNC
title: "F010 슬라이스 7 — 운영 점검 ops_monitor(정기 작업 · 주간 비중 원장 · 매일 판단 원장) · rule_ic 주기"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-010-judgment-engine-v2.md 기능 요구 8 · 리서치 §10 슬라이스 7
---

## Summary

리서치 §10 슬라이스 7 의 "재학습 트리거"는 대상이 없다 — 채택된 확률 모델이 없다(`FC-REQ-011`). 대신 **라이브 등록이 빈 날 없이
쌓이는지**를 매시 본다(사용자 결정 2026-10-07). 라이브 등록(`rule-ic@1` · `target-weight@2` · `news-sentiment@1` …)은 빈 날을
나중에 채울 수 없어서, 멈춘 것을 그날 알아야 한다.

- 막지 않는다 — `forecast.ops_check` 에 기록 + WARN 로그. 점검 버그가 배치를 멈추게 두지 않는다
- 판정은 `as_of` 까지만 읽는다 — 같은 시각으로 다시 돌리면 같은 결과(재현)
- 알림 · 서버 표시는 없다(아래 "하지 않는 것")

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `domain/ops_health.py` 기대표 — `news` 매시(3시간) · 매일 9단계 `ingest_prices` · `ingest_market` · `backfill_whale` · `daily` · `events` · `signals` · `volatility` · `market_regime` · `target_weight_live`(26시간 = 20시간 게이트 + 매시 트리거 + 여유) · `rule_ic` 주간(8일). 판정 `ok` · `overdue` · `failed` · `never` — 실패가 지연보다 먼저. 오류는 타입만(원문 없음) | 완료(`59c75db`) |
| FR-2 | 주간 비중 원장(`target_weight_live_weight`) — 월요일 00:00 UTC 리밸런스 + 24시간 마감 → `ok` · `due`(마감 전 아직 없음 — 지금 돌면 늦지 않다) · `late` · `missing` | 완료 |
| FR-3 | 매일 판단 원장(`public.judgment_ledger`, `sample_origin = live`) — 어제까지 7일 중 첫 발행일 이후 빈 날 → `missing`, 행이 하나도 없으면 `never` | 완료 |
| FR-4 | `store/ops.py`(`as_of` 까지만 읽는다) · `scoring/ops_monitor.py`(조립) · `jobs/ops_monitor.py`. `forecast.ops_check`((as_of 정시 내림, subject) PK) upsert — 같은 시각 재실행은 같은 행(멱등). 마이그레이션 `20261007100000_forecast_ops_check`(`DB-REQ-029` FR-24, 추가만, 뷰 없음) | 완료 |
| FR-5 | 보존 90일 — `job_run` · `ops_check` 정리(`db-contract.md` §5 의 `job_run` 90일과 같게). `--dry-run` 은 쓰지 않고 지울 개수만. `db-contract.md` §3 · §5 에 `ops_check` 를 같은 브랜치에서 넣었다 | 완료 |
| FR-6 | `ops/daily.sh` — 매시(`news` 다음, 20시간 게이트 앞, `due --hours 0.75`) + 일일 단계 끝에 한 번 | 완료 |
| FR-7 | `rule_ic` 를 월요일(UTC) 조건이 아니라 **마지막 성공 뒤 156시간(6.5일)**(`due --hours 156`)으로 고른다. `rule-ic@1` 사전등록에 요일 조건이 없다(라이브 부분은 서버 `judgment_ledger`) | 완료(`42df20b`) |

## 첫 실행 (2026-10-07 11:00 KST, 13 항목)

| 항목 | 판정 | 내용 |
|---|---|---|
| `job:rule_ic` | overdue | 217.8시간 — 마지막 성공 2026-09-28. 10-05 월요일에 배치가 돌지 않아 월요일 조건 때문에 한 주를 건너뛰었다 → FR-7 |
| `ledger:target_weight_live` | late | 2026-10-05 비중이 t+26.6시간에 기록 — 성적 제외(이미 알려진 사건, `FC-REQ-013`) |
| `ledger:judgment_ledger` | missing | 10-01~10-05 닷새 — 서버가 꺼져 있던 기간. 되살릴 수 없다 → 2026-11-23 라이브 IC 표본이 5일 적다 |
| 나머지 10 | ok | — |

## 하지 않는 것

- 알림(푸시 · 메일) — 운영 알림 경로가 아직 없다. 로그 · 표만
- 서버 화면 표시 — 뷰 없음, 서버가 읽지 않는다. 필요하면 뷰 + `SRV-REQ` 짝
- 배치를 멈추거나 재실행 — 기록만. `daily.sh` 는 여전히 `daily` 작업 성공만으로 20시간 게이트를 닫아, 다른 단계 실패는 다음 날까지 재시도되지 않는다(이제 `ops_check` 에 `failed` 로 남는다)
- 재학습 트리거(월별 Brier/ECE) — 채택된 확률 모델이 생기면 새 REQ

## Changelog

- 2026-10-07: 초판 · FR-1~7 완료(`59c75db` · `42df20b`). 번호 009 는 F011 예약이라 018
