---
id: SLICE-F010-6B-ONCHAIN-DOMINANCE
title: "F010 슬라이스 6 (2차) — Coin Metrics BTC 온체인(onchain-regime@1 채택 없음) · CoinGecko 도미넌스 스냅샷(dominance@1 라이브)"
priority: high
labels: [F010, slice, forecast]
created: 2026-10-06
---

## Summary

리서치 §10 슬라이스 6 다음 묶음 중 **온체인 · 도미넌스**만(사용자 결정 2026-10-06). 데이터랩 · 뉴스 구조화 · LLM 가드는 뒤 묶음.
`salt-forecast` 만 바뀐다 — 새 테이블 없이 `forecast.series_point` 에 쌓는다.

| 결과 | 제품에 들어간 것 |
|---|---|
| `onchain-regime@1` — BTC MVRV ≥ 확장 창 90% 분위면 목표 비중(core) × 0.5. ΔMDD +0.5% [−3.5, +1.1] · ΔCalmar −0.02 · 상한 16주(2021 상반기만) | **채택 없음** → 목표 비중 규칙 · 서버 · 화면 무변경. 온체인 5지표는 매일 수집만 |
| 도미넌스 — 무료 이력 원천 없음(CoinGecko 이력 PRO · Coin Metrics 무료 시가총액에 SOL · BNB 없음) | 매일 스냅샷 · `dominance@1` 라이브 통계 등록(첫 확인 2027-05-17) |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 예측 | `salt-forecast/requirements/specs/in-progress/FC-REQ-015-F010-ONCHAIN-DOMINANCE.md`(신규) FR-1~7 | 사전등록 2 · 수집 2 · 판정 실행 · 리포트 |
| DB · 서버 · BFF · 프론트 | — | 변경 없음(채택 없음 · 새 테이블 없음) |

## 커밋 (되돌리기 지점)

| 커밋 | 무엇 | 되돌리려면 |
|---|---|---|
| `9b13d91` docs(forecast) | 사전등록 `onchain-regime@1` · `dominance@1` — **결과 · 첫 수집 전** | 되돌리지 않는다(증거) |
| `ac33e24` feat(forecast) | Coin Metrics · CoinGecko 수집(`ingest_market` SOURCES) | 이 커밋. `series_point` 의 `cm:*` · `cg:*` 행은 남는다 — 지우려면 source 로 DELETE |
| `1d7334b` feat(forecast) | `onchain-regime@1` 실행 코드 — 결과 전 | 이 커밋 |
| `d8de4ea` docs(forecast) | 결과(채택 없음) | 되돌리지 않는다(증거) |

## 판단 — 리뷰가 볼 곳

1. **MVRV 를 방향이 아니라 비중 상한으로 쟀다** — 리서치 분류가 "국면 · 상한, 예측 변수 아님"이다. 방향 IC 는 탐색 표에만
2. **거래소 입출금을 판정에서 뺐다** — 원천이 주소 라벨을 소급 적용한다(라벨 빈티지 없음). 탐색에서 netflow_cap 이 4조건 중 3개를 통과했지만 이 이유로 근거가 아니다
3. **도미넌스 과거 대용치를 만들지 않았다** — 무료 시가총액 135종 합은 2021 뒤 알트 몫이 체계적으로 작다. 라이브로만 본다
4. **증분은 마지막 관측 다음 날부터만** — flash 값이 뒤에 고쳐져도 처음 본 값이 그 시점에 알던 값이다(누수 방지 쪽)
5. **조건 (4) 상한 주 ≥ 20 · 구간 ≥ 2** — 사이클 2~3번으로 정한 규칙을 막는 칸. 이번엔 16주로 걸렸다

## 하지 않는 것

- 같은 과거 표본으로 분위 · 배수를 바꾼 `onchain-regime@2`
- 온체인 · 도미넌스 화면 표시(CC BY-NC · 출처 표기 — 피처 · 채점 전용)
- 데이터랩 · 뉴스 구조화 · LLM 가드(다음 묶음)
