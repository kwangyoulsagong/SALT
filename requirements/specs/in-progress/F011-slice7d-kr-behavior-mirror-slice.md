---
id: SLICE-F011-7D-KR-BEHAVIOR-MIRROR
title: "F011 슬라이스 7d — 국내 주식 행동 미러: 거래일 회전율 · 처분효과 · 40거래일 추격 · 복권형 비중 (FR-47)"
priority: medium
labels: [F011, slice, server, bff, fe]
created: 2026-10-26
---

## Summary

사용자 "새 브랜치 파고 다음꺼 진행"(2026-10-26) → 남은 슬라이스 7(FR-46 · 47) 중 **FR-47** — 선택지 질문에 "국내 미러 따로".
지금 미러는 코인 거래만 본다(슬라이스 4 FR-38 "행동 분석은 코인 그대로"). 리서치 권고 22: 국내 근거가 직접적인 순서로
회전율 → 처분효과 → 추격 매수(40거래일) → 복권형 비중, 창은 거래일.

코인 미러는 그대로 두고 국내 전용 경로 · 섹션을 붙였다 — 예측과 같은 "같은 엔진, 다른 데이터".

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-47 | `GetKrBehaviorMirror` · `domain/policy/krMirror` · `market` `krDailyReturnProfiles` · `GET /api/coach/mirror/kr-stock` |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-24 | 국내 미러 뷰모델 · 경로 · 8초 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-28 | `/coach/report` `KrMirrorPanel` |
| 주인 REQ(Changelog) | `SRV-REQ-038` · `BFF-REQ-038` · `FE-REQ-039` | 미러 규칙 · 뷰모델 · 표시 주인 |
| 짝(변경 없음) | 예측 · DB — DDL · 뷰 무변경(`price_history` · `forecast.v_daily_close` 읽기만) | — |

## 판단 — 리뷰가 볼 곳

1. **결과 배치를 국내로 넓히지 않았다** — `decision_outcomes` 에 자산군이 없어 넓히면 코인 미러 · 월간 복기 · F010 숫자가 같이 섞인다. FR-47 네 지표는 거래 · 일봉만으로 요청 때 나온다. 대가: 준수 · 태그 · 시간대 · 연승 · 손실 비대칭은 국내판이 없다
2. **거래 시각을 KST 벽시계로** — 화면이 지난 날짜를 00:00 KST(= 전날 15:00 UTC)로 저장하고 국내 일봉은 KST 날짜다. 평가금 흐름은 UTC 날짜로 붙이므로(코인은 일봉 경계 09:00 KST 라 맞았다) 국내는 9시간 옮겨 읽는다
3. **복권형 = Kumar(2009) 총변동판** — 고유변동성 · 고유왜도 대신 총변동(요인 모형 없음). 판정 규칙(중앙값 셋)은 코치 도메인, 단면 요약은 `market` 공개 API(SQL 0.58초) · 코치 어댑터가 구간 캐시. 비교 기준 = 같은 단면의 복권형 종목 비율
4. **KCMI 참고값은 "나란히 두기만"** — 2020 상승장 · 정의 원문 미확인(다음 날 매도율). 판정 · 지시 문구 없음
5. **계약** — 서버 · BFF 경로 신설(기존 `/mirror` 무변경) · 소유자 전용 404. BFF 타임아웃 8초(첫 요청 단면 계산)

## 검증 · 미검증

`requirements/reports/checklists/F011-slice7d-kr-behavior-mirror.md` · 회고 `requirements/reports/retrospects/F011-slice7d-kr-behavior-mirror.md`.
