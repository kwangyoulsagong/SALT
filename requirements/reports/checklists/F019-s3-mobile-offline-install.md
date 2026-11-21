# F019 순서 3 체크리스트 — 휴대폰 오프라인 마지막 화면 · 설치 안내

영역 체크리스트가 진실이다: `salt-microFe/requirements/reports/checklists/FE-REQ-073.md`(FR 1:1 · 측정 · 범위 밖).

| 항목 | 결과 |
|---|---|
| 영역 | FE 만 — 서버 · BFF · DB 변경 0 |
| FR-1~4 | [x] 전부(`FE-REQ-073` 체크리스트 표) |
| 사용자 경계 | [x] 로그아웃 → IndexedDB 0 · 다른 계정 로그인 → 앞 계정 행 0 · 사용자 id 다르면 오프라인 한 장 원래대로 |
| 390 · 360 | [x] 넘침 0 · 13 미만 0 · 44 미만 0 · 페이지 오류 0 |
| 데스크톱 대조 | [x] 1280 실로그인 다섯 화면 회귀 0 · 매니페스트 · SW 0 |
| 번들 | [x] main 대비 `/m` 첫 로드 +2 ~ +5 kB |
| 검증 명령 | [x] `check-types` · `lint` · `test` · `test:layer-check` · `build-storybook` · zone 여섯 운영 빌드 · `check-done.mjs` |
| 실기기 | [ ] `QA-001` Q-7(사용자 휴대폰 — 설치 · 비행기 모드) |
