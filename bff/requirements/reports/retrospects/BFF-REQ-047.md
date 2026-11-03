# BFF-REQ-047 — 회고

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- **판단**: 본문 형식 검사를 BFF 에 두지 않았다 — 서버가 400 + `code` 를 주고 error middleware 가 그대로 옮긴다. 두 곳에 두면 갈라진다
- **문제**: 테스트용 토큰을 만들 때 dotenv 배너가 stdout 에 섞여 첫 실측이 전부 400 — `{quiet:true}`
- **Action**: 1주 뒤(2026-11-10) `RETIRED_PATHS` 로그 0건이면 목록째 삭제 — 옛 Express goals 삭제와 같은 날
