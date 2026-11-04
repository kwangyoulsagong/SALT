# BFF-REQ-048 — 체크리스트

## 2026-11-04 — 가계부 S1a · `b162ac6f`

- [x] parse 요청 본문이 BFF 로그 0 — 로그 캡처 테스트(서비스 · error middleware 깨진 JSON) + 실스택 로그 grep 0
- [x] 목표 시계 지연 시 저장 응답 지연 0 — 테스트(저축 600ms → 300ms 안에 `pending`) · 화면 다시 묻기 성공/실패 Playwright 실측
- [x] `npm run build` · `npm test` 360

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-3 리뷰 · 스티커 · FR-4 템플릿 · 챌린지 · 이야기 카드 | 서버가 없다 | 가계부 S1b |

## 2026-11-04 — 가계부 S1b

- [x] 경로 7 중계 · 확인 응답에 목표 시계(`record.savedTotal`) · 경로 값 인코딩(서비스 테스트 +2)
- [x] `npm test` 362 중 361 — 실패 1(`backend-switch` 추적 ID)은 **main 에서도 같은 실패**(별도 작업트리로 확인) · 이 변경과 무관
- [x] `npm run build` · `tsc --noEmit` 통과 · 4001 재기동 뒤 실스택 확인

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `backend-switch` 추적 ID 테스트 실패(기존) | main 에서도 실패 — 이 슬라이스 범위 밖 · 원인은 들어온 `traceparent` 대신 새 추적이 나감 | `BFF-REQ-045` 다음 작업 |
| 스티커 · 챌린지 · 이야기 카드 칸 | 범위 밖 | 가계부 S1c |
