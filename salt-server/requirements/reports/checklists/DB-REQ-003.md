# DB-REQ-003 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: M3 실행됨(`20260918071852`) · M1 은 `kr_stock` 만(`20261007140000`) — Q2 관련 수용 기준 · Open Q 는 닫힘 / 서버 정리 선행은 `SRV-REQ-007`

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

- 파일만 걸침 — 웹 `entities/market/model/messages.ts` · `types.ts` 에 차트 기간 `1w` 이름 · `ChartPeriod.Week`. 스키마 무변경
- 미검증 · 범위 밖: 없음
