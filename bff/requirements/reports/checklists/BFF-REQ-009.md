# BFF-REQ-009 checklists

## 2026-10-29 REQ 전수 조사

- FR-20 · 21 정정(BFF 가 422) · to-do → in-progress

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 호출 맵 `searchAssets` 구현 — 400ms · 재시도 1회 · FR-4 409 전달 · FR-50 검색 1회(overview 를 거르지 않는다)
- 확인: 실측 11~27ms

미검증: 없음 — 판단 무변경

## 2026-10-30 — F000 레거시 모델 drop · 중복 워커 정정 (루트 `F000-legacy-cleanup`)

- FR-33 정정 — 같은 전제. BFF 코드 무변경
