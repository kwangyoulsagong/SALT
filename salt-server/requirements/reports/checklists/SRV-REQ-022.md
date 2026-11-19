# SRV-REQ-022 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: 김프 선행 조건이 깨졌다 — F006 은 `FxRate` 를 보류했고(`DB-REQ-021` FR-33) `fx` 컨텍스트도 없다. 반면 `forecast.mar / F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 2

- 워커 · 외부 클라이언트 0(grep). 예측 뷰 둘 실조회 · 주별 뷰 범위 UTC 고정(세션 시간대 무관) · 쓰기 한 문장씩(`noParallelRowWrites` 통과)
- 미충족: 없음(이 REQ 몫)
