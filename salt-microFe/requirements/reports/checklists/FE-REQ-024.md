# FE-REQ-024 — 검증 체크리스트

이 REQ 는 to-do 다. 아래는 다른 슬라이스가 파일만 걸친 기록이다.

## 2026-10-28 — F000 웹 API 에러 정규화 (파일만 걸침)

| 항목 | 결과 |
|---|---|
| `entities/market/model/types.ts` | `ChartPeriod` enum 추가(파일 머리 REQ). FR-50 타입 공유 범위 밖 그대로 |
| 검증 | check-types · lint · web · web-tax build · layer-check pass. 재시도 실측은 루트 `requirements/reports/checklists/F000-api-error-normalize.md` §2 |

미검증: 없음 — 판단 · 화면 무변경

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-50 은 이 REQ 가 아니라 `FE-REQ-012` FR-50(뷰모델 타입 공유) — Changelog 의 "FR-50 범위 밖"은 그 뜻. 시세 · 관심
