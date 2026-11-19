# DB-REQ-014 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: F004 3종 게이트가 `IndicatorTrackRecord` · `signalTypes` GIN 에 의존한다는 전제는 사실 아님 — F004 는 판단 · 추천

## 2026-11-19 F003 v2 순서 2

- CHECK 다섯(자산 · 월요일 · 배수 · 금액 · 상태 한 덩어리) · 유일 키 + `ON CONFLICT DO NOTHING` — 메모리 가짜와 실 DB 둘 다에서 두 번째 읽기 쓰기 0
- 미충족: 없음
