# F003 v2 순서 1 — 체크리스트

영역 체크리스트 `salt-forecast/requirements/reports/checklists/FC-REQ-029.md`(FR 별 · 시험 · 변이 · 실값 대조) · `salt-server/requirements/reports/checklists/DB-REQ-013.md`.

| 항목 | 결과 |
|---|---|
| 사전등록 커밋이 결과 계산보다 먼저(`0a055faf` → 첫 dry-run) | pass |
| 예측 검증 명령 전부 · 누수 · 변이 다섯 · 과거 as_of dry-run · 실 DB 저장 · 멱등 · `EXPLAIN` | pass |
| 마이그레이션 로컬 적용 · 롤백 문장 머리 주석 | pass |
| 미검증: 매일 배치 첫 회차 | 2026-11-20 |
