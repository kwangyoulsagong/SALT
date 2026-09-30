# F009 슬라이스 6 — 월간 복기 · Brier · 진입 전 체크 · IPS · 시나리오 — 체크리스트 (2026-09-27)

영역: `salt-server/requirements/reports/checklists/SRV-REQ-038.md` · `DB-REQ-031.md` · `bff/requirements/reports/checklists/BFF-REQ-038.md` · `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` §슬라이스 6

| 확인 | 결과 |
|---|---|
| DB | 마이그레이션 2(추가만) 로컬 적용 · 스키마 diff 0 · `prisma:generate` · CASCADE · 유니크 경합 확인 |
| 서버 | `npm test` 476 / 0(+27) · `tsc` · `npm run build` · `eslint .` · `test:layer-check` · 변경 파일 훅 사후 실행 · Swagger(`/review/monthly` 신설, risk-budget · plans · mirror · size-check 갱신) |
| 서버 실 DB | 임시 사용자로 판정 배치 → 복기 31ms · 재호출 저장본 · risk-budget 20ms(2022-11 실데이터 구간) · 미러 Brier · 현재 달 거부 · 체크리스트 저장 · 사용자 삭제로 정리 |
| BFF | `npm test` 163 / 0(+11) · `npm run build` |
| 프론트 | `pnpm check-types` · `pnpm lint` · `pnpm test`(core 26 · ui 43) · `test:layer-check` · 변경 파일 훅 사후 실행 · `web` · `web-tax` 빌드 · 번들 110 / 115 kB(변화 없음) |
| 화면 | Playwright 고정 응답 1280 · 375 — 복기(달 고르기 → `?month=`) · IPS(% · 상한 → PUT 본문) · 시나리오 · 진입 전 체크(키보드) → POST 본문 `invalidation` · `checklist` · 미러 채점 줄. 가로 스크롤 · 페이지 에러 0 |
| 접근성 | axe 새 스타일 위반 0(기존 공용 대비만) |
| 공통 수용 기준 | 주문 경로 0 · 금액 서버(`Money` · `Decimal`, 프론트는 % 입력을 비율로 옮기기만) · 확률 없는 시나리오 · 명령형 · 확신 · 목표가 0(`languageGuard` 테스트) · 막는 동작 0 · 3종 고지 고정 · LLM 호출 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰으로 서버 → BFF → 화면 | 로컬 토큰 발급 불가 | `QA-001` 로그인 QA(사용자) |
| 떠 있는 BFF · 서버에 새 경로 | 실행 중 프로세스가 이 브랜치 코드가 아니다 | 머지 뒤 재기동 |
| 달이 넘어가는 순간의 배치 | 매일 06:40 + 부팅이라 1일 아니어도 채운다. 실제 달 넘김은 못 봤다 | 2026-10-01 뒤 로그 |
| 운영 DB 마이그레이션 락 | 새 테이블 · nullable 컬럼 — 재지 않았다 | 배포 때 |
| 공용 `panelDescription` · `SegmentedControl` 대비 | 기존 · 전 화면 공통(새 카드도 같은 몫) | `@repo/ui` 대비 정리 REQ |
| 200% 확대 · 색맹 시뮬레이션 | 이번에 재지 않았다 | `QA-001` 로그인 QA 때 |
| 대화 질의 · 오를 확률 칸 · 설정 이력 · 과거 구간 추가 | 화면 없음 · 결정 · 이력 없음 · 일봉 2022-09 부터 | 각 영역 체크리스트 행의 조건 |
