# F000 데스크톱 화면 틀 — 체크리스트

주인 `FE-REQ-047` — 화면 · 수치 확인 표는 `salt-microFe/requirements/reports/checklists/FE-REQ-047.md` "2026-11-19 구현" 절.

- [x] 영역 검증 — `pnpm check-types` · `lint` · `test` · `test:layer-check` · Bash 로 쓴 파일 레이어 훅 사후 실행
- [x] zone 다섯 운영 빌드
- [x] 실화면 — 1440(12경로) · 900 태블릿 · 390 앱 웹뷰 UA · 임시 계정(지움)
- [x] 실측 결함 둘(뒤로 판정 · 스크롤 복원) 고치고 재확인
- [x] `node scripts/check-done.mjs`
- [ ] FR-8 · FR-16 띠 합치기 — 범위 밖(사용자 결정, 계약 REQ)
- [ ] FR-6 — `FE-REQ-049` 로
