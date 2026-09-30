# F009 슬라이스 5 — 내 거래 미러 화면 — 체크리스트 (2026-09-27)

영역: `salt-server/requirements/reports/checklists/SRV-REQ-038.md` §슬라이스 5 · `bff/requirements/reports/checklists/BFF-REQ-038.md` §슬라이스 5 · `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` §슬라이스 5

| 확인 | 결과 |
|---|---|
| 서버 | `npm test` 449 / 0(+15) · `tsc` · `npm run build` · `eslint .` · Swagger 설명 갱신. 마이그레이션 없음 |
| BFF | `npm test` 152 / 0(+15) · `npm run build`(tsc) |
| 프론트 | `pnpm check-types` · `pnpm lint` · `pnpm test`(core 26 · ui 43) · `test:layer-check` · 변경 파일 전부 레이어 훅 사후 실행 · `web` · `web-tax` 빌드 · 번들 `/coach/report` 110 kB · `/investments/[symbol]` 115 kB(변화 없음) |
| 화면 | Playwright 고정 응답 1280 · 375 — 미러 다섯 줄 + 표본 배지 · 엣지 없음 · 태그 확정(PUT → 상태 문구) · 폼 매수 한 줄(`hasPlan: false` 요청) · 매도 프레이밍 |
| 접근성 | axe — 새 스타일 위반 0. 기존 공용 `panelDescription` · `SegmentedControl` 대비는 기록(아래) |
| 공통 수용 기준 | 주문 경로 0 · 금액 서버 Decimal(프론트는 부호 · 퍼센트 포맷만) · 명령형 · 평가 문구 0 · 막는 동작 0 · 3종 고지 고정 · 종목 자리 아이콘 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰으로 서버 → BFF → 화면(미러 · 태그 · 폼 한 줄) | 로컬 토큰 발급 불가 — 서버는 유스케이스, BFF 는 뷰모델 테스트, 화면은 고정 응답 | `QA-001` 로그인 QA(사용자) |
| size-check p95(미리보기 포함) | 실 토큰 없음 | `QA-001` 로그인 QA — 넘으면 미리보기를 별도 경로로 |
| 떠 있는 BFF · 서버에 새 경로 HTTP | 실행 중 프로세스가 이 브랜치 코드가 아니다 | 머지 뒤 재기동 |
| 공용 `panelDescription` · `SegmentedControl` 대비 | 기존 · 전 화면 공통 | `@repo/ui` 대비 정리 REQ |
| 매도 프레이밍 "보유 대비" 조각 · 사용자 정의 태그 새로 적기 · 준수 라벨 수정 화면 | 서버 값 없음 · 입력 2개 이내 · 범위 밖 | 각 영역 체크리스트 행의 조건 |
| 남은 `behavior_analysis` 행 | TTL 6시간으로 사라진다 | 배포 뒤 6시간 확인 |
