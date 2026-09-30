# F010 슬라이스 6 (1차) 체크리스트 — 색인 (2026-09-30)

영역 체크리스트가 진실이다. 이 문서는 가리키기만 한다.

| 영역 | 체크리스트 | 요약 |
|---|---|---|
| 예측 | `salt-forecast/requirements/reports/checklists/FC-REQ-014.md` | 사전등록 결과 전 · 수집 2 · `dvol-sigma@1` 채택 없음 · pytest 174 · leakage 20 · `lint-imports` 층 계약 복구 |
| DB | `salt-server/requirements/reports/checklists/DB-REQ-029.md` FR-22 | 마이그레이션 로컬 적용 · 스키마 계약 · EXPLAIN |
| 서버 | `salt-server/requirements/reports/checklists/SRV-REQ-024.md` §15 | npm test 559 · tsc · build · lint · 실 DB 어댑터 호출 |
| BFF | `bff/requirements/reports/checklists/BFF-REQ-039.md` FR-6 | npm test 202 · tsc · build |
| 프론트 | `salt-microFe/requirements/reports/checklists/FE-REQ-040.md` FR-14 | 12조합 axe serious 0 · web-tax · storybook 빌드 · 기존 대비 · 360 넘침 수정 |

## 미검증 · 범위 밖 (영역 표와 같다)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `market-warning@1` 라이브 통계 | 원천 이력 없음 · 8주 엿보기 금지 | 2026-11-25 |
| DVOL 재평가(`@2`) | 같은 과거 표본 재사용 금지 | 라이브 표본 뒤 |
| 인증된 HTTP 왕복 · 실제 계정 화면 | 로컬 토큰 발급 불가 | 로그인 QA(사용자) |
| 운영 DB 마이그레이션 · cron | 배포 없음 | 배포 시 |
| heading-order(moderate) · 앱 로컬 토큰 제거 | serious 아님 · 별도 정리 REQ | 표면 대비 정리 REQ |
| Coin Metrics · 도미넌스 · 데이터랩 · 뉴스 구조화 · LLM 가드 | 사용자 결정으로 다음 묶음 | 슬라이스 6 다음 |
