---
id: FC-REQ-013
feature: F010
area: forecast
kind: FUNC
title: "F010 — 목표 비중 안내의 알트 위험 몫 판정(target-weight@2) · core 모델 포트폴리오 라이브 원장"
priority: high
created: 2026-09-29
source: pm/requirements/specs/in-progress/FEATURE-010-judgment-engine-v2.md OQ 5 · FC-REQ-012 회고
---

## Summary

`target-weight@1`(`FC-REQ-012`)에서 알트 10개를 core 와 같은 규칙으로 섞은 묶음은 모든 목표 σ 에서 평균 비중 고정보다 나빴다(CAGR ≈ 0).
그런데 서버는 보유 알트에도 같은 규칙으로 비중을 줬다(`FEATURE-010` OQ 5). 사용자 결정(2026-09-29): ① 알트 몫은 **결과 전 사전등록 → 통과한 것만,
없으면 알트 0% · 화면 "기록 없음"** ② **core 모델 포트폴리오 라이브 원장**을 같은 슬라이스에서 ③ 상장폐지 종목은 수집하지 않는다.

사전등록 `preregistration/2026-09-29-target-weight-v2.toml`(`2e28f15`, 결과 전). **이번 등록은 판정이 있다** — [alt_share.adopt] 가 서버 규칙을 정한다.

**결과: 채택 없음.** a = 0.10 · 0.20 모두 5개 목표 전부에서 ΔCalmar(a − core) 점추정이 음이고 0.15 에서 98.75% CI 가 0 아래다
([−0.11, −0.00] · [−0.22, −0.01]). 알트 평균 비중 1~12% 로도 CAGR 을 1~6%p 깎았다. 생존 편향(알트에 유리)에도 그랬다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 사전등록 `target-weight@2` 결과 전 커밋 · `forecast.preregistration` 1행(해시 대조) | 완료(`2e28f15`) |
| FR-2 | `domain/target_weight.py` — `sleeve_weights`(core 목표 σ × (1 − a) · 알트 × a 를 따로 역변동성, a = 0 이면 @1 core) · `paired_ci(alpha=)`(Bonferroni) · `week_outcome`(매주 리밸런스 주간 수익 = Σ w·R − 회전 비용) · `live_summary` | 완료(`95dea9b` · `558d496`) |
| FR-3 | `scoring/target_weight_v2.py` + `jobs/target_weight_v2` — 후보 2 × 목표 5 · a = 0 과 같은 부트스트랩 인덱스 · 판정 · 탐색 3(a 0.05 · 알트 상위 3 × 2) · 리포트 `reports/target-weight-target-weight-2-2026-09-29.md` | 완료(실행 코드 `95dea9b`, 4.8초, 리포트 `85dc938`) |
| FR-4 | 판정을 서버로 — 채택 없음 → `TARGET_WEIGHT_ALT_SHARE = null` · 판정 기록 상수(`SRV-REQ-024` FR-187 · 189) | 완료 |
| FR-5 | `scoring/target_weight_live.py` + `store/target_weight_live.py` + `jobs/target_weight_live` — 2026-10-05 부터 월요일 봉 · σ 가 둘 다 있으면 목표 5개 비중을 쓰고, t+7 봉 뒤 결과(ok · late(기록이 24h 넘게 늦음) · missing_bar)를 쓰고, 목표별 요약을 다시 계산. 저장값과 다시 계산한 값이 다르면 `LedgerMismatch` 로 멈춘다. `ops/daily.sh` 마지막 단계 | 완료(`558d496`) |
| FR-6 | DB 계약 `DB-REQ-029` FR-21(비중 · 결과 불변 표 · 요약 · `v_target_weight_live`) — DDL 은 `salt-server` 마이그레이션 | 완료(`6e9f651`) |

## 하지 않는 것

- 같은 8년 표본으로 알트 규칙을 다시 등록하지 않는다 — 알트는 라이브 표본(또는 새 원천)으로만 `@3`
- 상장폐지 종목 수집(사용자 결정) — 생존 편향은 리포트 · 화면에 적는다
- 라이브 30주 전에 라이브 숫자로 문장을 쓰지 않는다(등록 [live.display])

## Changelog

- 2026-09-29: 초판 · FR-1~6 완료. 판정 채택 없음
