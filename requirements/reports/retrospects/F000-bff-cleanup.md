# F000 슬라이스 — BFF 부채 정리 — 회고

영역 회고: `bff/requirements/reports/retrospects/BFF-REQ-036.md`

## 요약

- **메모에 적힌 부채보다 실제가 컸다** — 4xx 를 잡는 곳 3개를 찾으러 갔다가 삼키는 곳 5개를 더 찾았다. 그중 하나가
  토큰 만료를 "서버 오류"로 만드는 것이었다
- **규칙만 보고 구현하면 REQ 와 어긋난다** — 동면을 삭제로 구현했다가 `BFF-REQ-007` A절을 읽고 되돌렸다(push 전)

## Action

- 2026-09-29 동면 로그 확인
- `upbit-ws.service` 명시적 `start()` — BFF 실시간 REQ
