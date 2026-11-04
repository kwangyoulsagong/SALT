# BFF-REQ-048 — 체크리스트

## 2026-11-04 — 가계부 S1a · `b162ac6f`

- [x] parse 요청 본문이 BFF 로그 0 — 로그 캡처 테스트(서비스 · error middleware 깨진 JSON) + 실스택 로그 grep 0
- [x] 목표 시계 지연 시 저장 응답 지연 0 — 테스트(저축 600ms → 300ms 안에 `pending`) · 화면 다시 묻기 성공/실패 Playwright 실측
- [x] `npm run build` · `npm test` 360

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-3 리뷰 · 스티커 · FR-4 템플릿 · 챌린지 · 이야기 카드 | 서버가 없다 | 가계부 S1b |
