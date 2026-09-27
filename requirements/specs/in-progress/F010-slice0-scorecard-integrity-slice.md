---
id: SLICE-F010-0-SCORECARD-INTEGRITY
title: "F010 슬라이스 0 — 성적표 신뢰성: 지표 주기 · 추천 불변 원장 · 수수료 · 기저율 · 주 격자 채점"
priority: high
labels: [F010, F004, F008, F009, slice, forecast, db, server, bff, fe, contract]
created: 2026-09-28
---

## Summary

판정 AI 딥리서치(`requirements/reports/research/2026-09-27-ai-judgment-upgrade.md` §2 · §10)가 찾은 것 — **화면의 적중률이 프로토콜
없이 계산된다.** 저장 추천은 사용자당 한 행이 덮어써져 이력이 없고, 성적은 "판단 뒤 첫 종가 vs 최신 종가"라 관찰 기간이 없고, 표본 1건이어도
`active` 였다. 코치 판단은 5분봉 RSI 로 30일을 판단했고, 예측 서비스의 "라이브 52주" 게이트는 실제로 52일이었다. 판정 엔진 v2(메타 모델 · 보정)를
얹기 전에 **이 숫자들부터 믿을 수 있게** 만든다. 새 PM 기획서(`FEATURE-010`)는 슬라이스 4(메타 모델)에서 만들고, 여기서는 F004 · F008 · F009 기존 REQ 를 개정한다.

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 예측(Python) | `salt-forecast/requirements/specs/in-progress/FC-REQ-001-F008-BASELINE-FORECAST.md` FR-11 | 라이브 게이트 표본을 주 격자(월요일) as_of 로만 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` FR-18 · `DB-REQ-017-F004-SCHEMA.md` FR-61 | `v_forecast_card` 빗나간 사례 kind 필터 · `coach_recommendation_snapshots` |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-024-F004-FUNC.md` FR-173~176 · `SRV-REQ-025-F004-API.md` FR-59 | 지표 주기 · 종가 주기 · 수수료 · 기저율 · 추천 원장 · 게이트 |
| BFF | `bff/requirements/specs/in-progress/BFF-REQ-024-F004-API.md` FR-40 | 계약 통과(사유 · 필드) |
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-026-F004-UI.md` FR-165 | "기준 대비 +N%p" · 실패사례 종목 · 수익률 |

## 커밋 (되돌리기 지점)

| 커밋 | 무엇 | 되돌리려면 |
|---|---|---|
| `d407e7a` fix(server) | **지표가 한 번도 계산되지 않던 버그**(캔들 `5m` · `1d` 를 `m5` · `h1` 이름으로 조회) · 모드별 지표 주기(단타 1시간봉 · 장기 일봉) · 종가 조회 주기 필수 | 이 커밋 하나 |
| `008b3bd` fix(forecast) | 주 격자 게이트 · 뷰 kind 필터(마이그레이션 `20260928100000`, 롤백 = 이전 뷰 정의) | 이 커밋 + 뷰 재정의 |
| `267475d` feat(server) | 채점에 왕복 0.1% · 기저율(마이그레이션 `20260928100100` 은 기존 행 재판정 — 롤백 = 경계 0 으로 재실행) | |
| `dc6fea9` feat(server) | 추천 불변 원장(마이그레이션 `20260928101000`, 롤백 = DROP TABLE) · 성적표 · 게이트 `insufficient_sample` | |
| `77ae7a6` feat(bff,fe) | 계약 통과 · 화면 | 서버와 짝 |

## 판단 — 리뷰가 볼 곳

1. **지표 버그가 "AI 가 매수하라는 게 없다"의 직접 원인이었다.** `technical_indicators` 가 0행이라 모든 라이브 판단이 `technical_indicator` 결측 감점을 받았고, 로컬 DB 의 live 판단 25건이 전부 `avoid` 다. 고친 뒤 실 DB 에서 BTC RSI 가 5분봉 48.7 · 1시간봉 77.7 · 일봉 72.9 로 계산됐다. **기존 live 표본은 지표 없는 판단이라 성적표에서 의미가 없다** — 지우지 않고 남긴다(표본 출처는 그대로 `live`). 새 표본이 20건 쌓일 때까지 판단 블록은 막힌다(정상)
2. **1시간봉은 5분봉 12개를 묶어 만든다** — 1시간 캔들을 새로 수집하지 않는다. 마지막 버킷은 진행 중일 수 있다(원문 지표 계산도 진행 중 봉을 썼다)
3. **채점 경계를 0 에서 왕복 수수료 0.1% 로** — 후보 `r > 0.001` · 피하기 `r ≤ 0.001`. 기존 채점 행은 마이그레이션이 같은 규칙으로 재판정했다(로컬 live 18건: hit 5 · miss 13, 재판정 뒤 변화 없음 — 전부 `avoid` 라 경계 근처 값이 없었다)
4. **기저율은 같은 표본의 "비용 넘겨 오른 비율"** 하나로 만든다 — 후보는 그 값, 피하기는 1 − 그 값, 관망은 없다. BTC 베타 기저율은 표본에 BTC 수익률 짝이 없어 이번엔 뺐다(리서치 §6-3 9단계의 3종 중 1종)
5. **추천 원장의 지평은 30일 하나** — 저장 추천은 포트폴리오 단위 장기 조언이고, 붙어 있는 종목 판단의 `mode` 는 화면용이다. `mode` 열은 남겨 두었다
6. **FR-32 "표본 1건이면 통과"를 폐기했다** — 이력이 덮어써지던 시절의 임시안. 이제 종목 판단과 같은 20 게이트다. 사유 enum 에 `insufficient_sample` 이 추가돼 BFF · 프론트 계약이 같이 바뀌었다(BFF 는 모르는 사유를 계약 깨짐으로 보므로 같은 PR)
7. **주 격자 필터는 게이트 판정에만** — 매일 쌓이는 라이브 예측 · 채점은 그대로다(카드의 최신 예측은 매일 것). 게이트 표본 수만 월요일 as_of 를 센다
8. **`signal-performance` 응답 모양이 바뀌었다** — `samples[].latestPrice` → `exitPrice`(30일 뒤 채점가), `status` 는 표본 20 미만이면 `insufficient_data`. 이 경로의 화면 소비처는 없다(BFF 중계만)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 예측 원장 통합(코치 판단 · 추천 · 전망을 한 표로) · 발생/도착시각 분리 · 국면 태그 · 사전등록 | 리서치 §10 슬라이스 1 | 다음 슬라이스 |
| 규칙 점수 요인별 IC · 임계 재추정 · 공포탐욕 · 고래 탈락 판정 | 원장 8주 뒤 | 슬라이스 1~2 |
| 블록 부트스트랩 CI · BY-FDR · Kupiec | 슬라이스 4 | |
| 진입가를 채점 종가와 같은 원천으로(지금 진입가는 1분 시세, 청산가는 봉 종가) | 표본이 새로 쌓이는 지금 바꾸면 기존 행과 정의가 갈린다 | 원장 통합 때 |
| 판정 단위 `SymbolJudgmentSnapshot` 의 진입 시각 · 지표 스냅샷 저장 | 슬라이스 1(원장) | |
