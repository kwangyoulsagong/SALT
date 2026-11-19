# F003 v2 순서 3 — 체크리스트

영역 체크리스트 `bff/requirements/reports/checklists/BFF-REQ-019.md` · `020` · `021` · `salt-microFe/requirements/reports/checklists/FE-REQ-022.md` · `023` · `024`.

| 항목 | 결과 |
|---|---|
| BFF `npm test`(585) · `tsc` · 계약 글자 대조 `PlanView` | pass |
| 프론트 `pnpm check-types` · `lint` · `test`(core 309 · ui 76 · web 10) · `test:layer-check` · 투자 · 셸 zone 빌드(`/plan` 876 B) | pass |
| 실 DB · 실 토큰(임시 계정): 422 둘(경계 숫자 전달) · 첫 저장 · 주간 계획 · 지난 주 422 · 월 합계 · 홈 한 줄 | pass |
| 실화면 1440 · 390 앱 웹뷰: axe 0 · 가로 넘침 0 · 로딩 · 실패 · 게이트 닫힘 · 0배 · 김프 없음 · 월 합계 실패 격리 · 머리 메뉴 | pass |
| 키보드만: Tab → 월 적립액 입력 → Enter 저장 → Tab → 체크 칸 → Enter 완료(요청 각 1회) | pass |
| 겹쳐 누름: 0ms 연속 클릭에서만 2회(10 · 30ms 는 1회 — 사람 조건에선 안 남) · ref 막기는 둠 · 다른 폼 해당 없음 | 확인 |
| 2회차: 변이 9(8 잡힘 · 1 삶 → 시험 더함) · main BFF 대조 10경로(의도한 차이뿐) · zone 다섯 운영 빌드 · 로그아웃 유리막 · §5 대조(중복 숫자 뺌 · 종목 아이콘) | pass |
| 정리: 임시 계정 · 초대 코드 · 셸 3001 · 남은 사람 행 0 | pass |
| 미검증: 관측성 계측 | 배포 환경 확정 시 |
| 미검증: 관문 통과 자산(배수 ≠ 1)의 실데이터 화면 | 예측 관문이 통과할 때 — 지금은 둘 다 실패라 route 로 0배만 봤다 |
