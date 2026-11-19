# SRV-REQ-011 retrospects

## 2026-10-29 REQ 전수 조사

- 현재 상태를 말하는 문장이 뒤 슬라이스를 따라가지 못했다. Action: 슬라이스를 닫을 때 그 결과가 바꾸는 다른 REQ 의 본문 · 범위 밖 · 수용 기준을 grep 한다

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- 기대값(워커 1개 감소)이 틀린 전제 위에 있었다. Action: 측정 착수 때 현재 값 기록으로

## 2026-11-19 — FR 대조 · done (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- DB-REQ-004 와 같은 결론 — 전후 비교는 전 값을 먼저 남기지 않으면 닫을 길이 대체뿐이다. Action: DB-REQ-004 회고와 같음
