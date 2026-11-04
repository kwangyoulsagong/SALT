# DB-REQ-038 — 체크리스트

## 2026-11-04 — 가계부 S1a · `63146ddf`

- [x] 결제 문자 원문 열 0 — 종단 테스트 `information_schema.columns` 정규식(raw · sms · message · original · text_body) 0
- [ ] `challenge` 상태 값에 실패 없음 — 표가 S1b
- [x] `landing_issued` UPDATE · DELETE 실패 — 종단 테스트(`append-only`)
- [x] 로컬 운영 DB 적용 — `svc_household` 로그인 · Flyway V1 표 4 · 임시 데이터 삭제 때 트리거 잠깐 끄고 다시 켬(`tgenabled O`)

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 · 4 · 5 · 6 · 7 · 9 · 10 · 11 | 범위 밖 | 가계부 S1b |
| `EXPLAIN` | 표가 비어 있어 의미 있는 계획이 안 나온다 — 인덱스는 FR-12 대로 | 실사용 행이 쌓인 뒤 S1b |
