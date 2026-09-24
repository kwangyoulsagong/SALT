---
id: SLICE-F009-2-REALIZED-VOL
title: "F009 슬라이스 2 — 종목 실현 변동성 (Python · DB · 서버 메서드 1)"
priority: high
labels: [F009, slice, forecast, db, contract]
created: 2026-09-24
---

## Summary

사이즈 계산의 변동성 타깃 참고 비중(FEATURE-009 FR-5) 분모를 채운다. `salt-forecast` 가 매일 289종목의 EWMA 변동성을
계산 · 채점해 `forecast.realized_vol` 에 쓰고, 서버는 뷰로 읽는다. **화면은 없다** — 슬라이스 3 이 붙인다.

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 예측(Python) | `salt-forecast/requirements/specs/in-progress/FC-REQ-006-F009-REALIZED-VOL.md` | FR-1~8 (GARCH 승격 FR-9 는 26주 라이브 뒤) |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-031-F009-SCHEMA.md` | FR-8 |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-038-F009-RISK.md` | FR-11 — `realizedVolatility` 메서드 하나. 응답 계약 변경 없음 |
| BFF · 프론트 | — | 변경 없음 |

## 판단 — 리뷰가 볼 곳

1. **값은 EWMA 로 고정, GARCH 는 도전자** — GARCH 가 채점 창에서 62% 종목을 이겼지만 그 창으로 고르면 검증이 사라진다
2. **기준(60일 이동 분산)에 지면 막는다** — ETH 포함 43종목이 값 없음(`insufficient_data`). 0 이나 대체값을 주지 않는다
3. **GARCH 를 scipy 없이 격자 최대우도로** — 의존성 0 · 결정적. 모의 모수 복원 테스트로 정확도를 고정
4. **서버의 신선도 3일** — 배치가 멈추면 오래된 변동성으로 사이즈를 권하지 않는다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 화면 · BFF | 슬라이스 3 | `BFF-REQ-038` · `FE-REQ-039` |
| GARCH 승격 | 26주 라이브 채점 뒤 | `FC-REQ-006` FR-9 |
| 인증 HTTP 응답 본문 | 로컬 토큰 발급 불가(자동 모드) | 슬라이스 3 연동 |
