# F003 v2 순서 2 — 체크리스트

영역 체크리스트 `salt-server/requirements/reports/checklists/SRV-REQ-020.md` · `021` · `022` · `DB-REQ-013` · `014` · `DB-REQ-036` · `salt-forecast/requirements/reports/checklists/FC-REQ-029.md`.

| 항목 | 결과 |
|---|---|
| 서버 `npm run build` · `lint` · `test`(1,998 — plan 경계 표 51 · 유스케이스 7 포함) · `prisma generate` · 그림자 DB diff 내 표 차이 0 | pass |
| 레이어 훅 사후 실행(Bash 로 쓴 plan 전 파일 · 조립 넷) 위반 0 · 위반 변이 1 차단 확인 | pass |
| 시험 변이 4 — 셋 잡힘 · 같은 뜻 교체 1 삶 · 처음 산 관문 변이는 경계 줄 더해 잡힘 | pass |
| 예측 ruff · pyright · lint-imports · pytest 전부 · schema contract(실 DB) · 과거 as_of dry-run | pass |
| 실 DB · 실 토큰(임시 계정 · 브랜치 서버 4020): 다섯 경로 · 422 다섯 종 · 400 · 401 · 지난 주 마감 · 내 데이터 내보내기 · BFF 계정 삭제로 plan 행 0 | pass |
| 응답 p95(20회): weekly 2.7ms · settings 1.4ms · monthly 1.6ms(예산 250ms) · `EXPLAIN` Index Scan | pass |
| 정리: 임시 계정 · 초대 코드 · 4020 · 4011 · 진입 파일 지움 | pass |
| 미검증: 화면 · BFF | 순서 3 |
| 미검증: 실행 트리 예측 회차가 `bands` 를 채우는지 | 머지 뒤 sync 다음 매일 회차(2026-11-20) |
