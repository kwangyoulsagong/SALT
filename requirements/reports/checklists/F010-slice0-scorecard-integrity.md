# F010 슬라이스 0 — 성적표 신뢰성 — 체크리스트 (2026-09-28)

영역: `salt-server/requirements/reports/checklists/SRV-REQ-024.md` · `SRV-REQ-025.md` · `DB-REQ-017.md` §2026-09-28 · `salt-forecast/requirements/reports/checklists/FC-REQ-001.md` §2026-09-28 · `bff/requirements/reports/checklists/BFF-REQ-024.md` · `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` §2026-09-28

| 확인 | 결과 |
|---|---|
| 서버 단위 | `npm test` **507 / 0**(+12: 캔들 묶기 · 지표 주기 매핑 · 모드별 봉 · 기저율 · 추천 원장 채점 · 성적표 · 상세 게이트) · `tsc` · eslint |
| 서버 실 DB | 마이그레이션 3개 적용(`20260928100000` 뷰 · `100100` 재판정 · `101000` 원장). 지표 워커 1회 실행 → `technical_indicators` 0행 → m5 · h1 · d1 각 전 종목(BTC RSI 48.7 · 77.7 · 72.9). `v_forecast_card` 정의에 `s0.kind = g.score_kind` · `pr.kind = s.kind` 확인. live 채점 18건 재판정 결과 hit 5 · miss 13(변화 없음 — 전부 `avoid`) |
| 예측 | `uv run pytest` 79 passed · 1 skipped(DB 없음) · `tests/leakage` 14 · ruff · pyright 0 · lint-imports 3 kept |
| BFF | `npm test` 174 / 0(+1 사유 테스트) · `tsc` |
| 프론트 | `core` vitest 26 · eslint · `apps/web` `tsc` · eslint(coach 엔티티) |
| 공통 수용 기준 | 주문 경로 0 · 거래소 키 0(KIS 는 시세 조회 env 만) · 금액 서버 · 명령형 · 확신 0 · 3종 게이트 유지(추천 블록은 표본 20 미만이면 `insufficient_sample`) · 원장 3종 row 보존(새 표 추가만, 기존 행 `outcome` 만 재판정) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 원장에 실제 행이 쌓이는지 | 로컬 워커를 이 브랜치로 재기동하지 않았다 — 유스케이스 · 저장소는 단위 테스트, 표는 DDL 만 실측 | 머지 뒤 첫 워커 회차(`investment-insight` 10분) |
| 30일 뒤 채점 · 화면의 "기준 대비" 실값 | 표본이 30일 뒤에야 생긴다 | 2026-10-28 이후 |
| 라이브 게이트가 주 격자로 실제 전환 | live 는 2026-09-23 시작 — 월요일 as_of 1~2개, 52주는 2027-09 | 시간 |
| `apps/web` · `web-tax` `next build` · Playwright 화면 | 타입 · 린트만. 추천 카드는 표본 0 이라 어차피 막힌 상태 | `QA-001` 로그인 QA · 표본 20 이후 |
| 인증 HTTP 실측(`/signal-performance` 새 모양 · `/coach/detail` 사유) | 로컬 토큰 발급 불가(기존 제약) | `QA-001` 로그인 QA |
| 진입가 · 청산가 원천 통일 | 슬라이스 문서 범위 밖 표 | 원장 통합 |
| 마이그레이션 `20260928100100` 재판정을 운영 DB 에 | 로컬만 적용 | 배포 시 `prisma migrate deploy` |
