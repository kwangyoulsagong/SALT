# F003 v2 순서 3 — 체크리스트

영역 체크리스트 `bff/requirements/reports/checklists/BFF-REQ-019.md` · `020` · `021` · `salt-microFe/requirements/reports/checklists/FE-REQ-022.md` · `023` · `024`.

| 항목 | 결과 |
|---|---|
| BFF `npm test`(585) · `tsc` · 계약 글자 대조 `PlanView` | pass |
| 프론트 `pnpm check-types` · `lint` · `test`(core 309 · ui 76 · web 10) · `test:layer-check` · 투자 · 셸 zone 빌드(`/plan` 876 B) | pass |
| 실 DB · 실 토큰(임시 계정): 422 둘(경계 숫자 전달) · 첫 저장 · 주간 계획 · 지난 주 422 · 월 합계 · 홈 한 줄 | pass |
| 실화면 1440 · 390 앱 웹뷰: axe 0 · 가로 넘침 0 · 로딩 · 실패 · 게이트 닫힘 · 0배 · 김프 없음 · 월 합계 실패 격리 · 머리 메뉴 | pass |
| 결함: 더블 클릭 완료 2회 → ref 막기 뒤 1회(설정 폼 같은 원인 같이) | 고침 |
| 정리: 임시 계정 · 초대 코드 · 셸 3001 · 남은 사람 행 0 | pass |
| 미검증: 관측성 계측 | 배포 환경 확정 시 |
| 미검증: 관문 통과 자산(배수 ≠ 1)의 실데이터 화면 | 예측 관문이 통과할 때 — 지금은 둘 다 실패라 route 로 0배만 봤다 |
