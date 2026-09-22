# FE-REQ-028 (F004 API) — 회고

- 날짜: 2026-09-22 · 슬라이스: `F004-fe-coach-panel` · 루트 회고: `requirements/reports/retrospects/F004-fe-coach-panel.md`

## 잘 된 것
- `mode` 를 BFF 에 한 번도 보내지 않는다 — 키에서 모드가 빠지니 전환이 캐시 읽기가 됐다
- 판단 쿼리에 `keepPreviousData` 를 **쓰지 않은** 이유를 코드에 남겼다(다른 종목 판단 노출)
- 4xx 재시도 0 · 5xx 1회 — 막힌 상태를 재시도로 늦게 보여주지 않는다

## 부채 · 다음 행동
- 인증이 `localStorage` 토큰(FR-80 쿠키는 `FE-REQ-013`)
- FR-73 enum 규칙 미충족 — BFF 원본 타입을 따르는 사본이라서. 계약 소유 쪽(BFF)에서 정할 일
- `CoachApiError` 는 슬라이스 로컬이다. `shared/api` 에 에러 정규화가 생기면(`FE-REQ-012`) 그리로
