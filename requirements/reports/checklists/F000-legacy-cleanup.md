# F000 슬라이스 — 레거시 모델 drop · 중복 워커 정정 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-legacy-cleanup-slice.md` · 2026-10-30
브랜치: `chore/f000-legacy-cleanup` (base `main` `e239f287`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-007.md` · `DB-REQ-001.md` · `DB-REQ-003.md` · `SRV-REQ-010.md` ·
`SRV-REQ-011.md` · `DB-REQ-004.md` · `SRV-REQ-008.md` · `bff/requirements/reports/checklists/BFF-REQ-010.md` · `BFF-REQ-009.md`

## 1. 확인

| 확인 | 결과 |
|---|---|
| 삭제 전 grep | `grep -rn "AIAnalysis\|AnalysisStatus\|PredictionType" salt-server/src bff/src salt-microFe/apps salt-microFe/packages salt-forecast/src` = 스키마 · 첫 마이그레이션만 |
| 행 · 의존 | `ai_analyses` 0 · `ai_analysis_sessions` 0 · 의존 뷰 0 |
| 스냅샷 | `pg_dump -Fc` 1.03GB(scratchpad `pre-legacy-drop.dump`, 세션 임시) |
| 복원 테스트 1회 | 새 DB 에 `pg_restore -j 4` 139초 · 오류 0 · 원장 `portfolio_transactions` 2 · `portfolio_holdings` 2 · `price_history` 3,820,090(덤프 시점) · 레거시 0 → 임시 DB 삭제 |
| 마이그레이션 | `prisma migrate deploy` 적용 · `migrate status` up to date · 테이블 0 · enum 0 |
| 원장 3종 전후 | `portfolio_transactions` 2 → 2 · `portfolio_holdings` 2 → 2 · `price_history`(적용 전 시각 기준) 3,817,510 → 3,817,510 |
| 상시 서버 | launchd 재시작 → `/health` 200 · `market_assets` 재시작 뒤 1초 안에 갱신 · Prisma 오류 로그 0 |
| FR-2 근거 실측 | 같은 시각 `market_assets` 최신 29초 · 관심 목록 · 보유 마지막 5시간 20분 · BFF 프로세스는 `dev:rest` · `dev:ws` 만 |
| 게이트 | 서버 `prisma:generate` · `build` · `lint` · `test` fail 0 · `test:layer-check` 통과(차단 10 · 통과 6) · BFF `build` |

## 2. 짝 영역 — 변경 없음

| REQ | 왜 안 바뀌나 |
|---|---|
| BFF 코드(`price-updater.worker`) | 서버 잡 유지 — 계약 · 동작 그대로. 문서(`BFF-REQ-010` FR-14 · `BFF-REQ-009` FR-33)만 정정 |
| 프론트 | 레거시 모델 · 시세 잡 소비 0 |
| `salt-forecast` | 레거시 테이블 참조 0 · `market_assets` 읽는 뷰 무변경 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| BFF 워커 상시 실행 | 운영 구성 | 배포 구성(`ADR-008` · `OPS-001`) |
| `investment_watchlist` 가격 사본 | 화면 계약 변경 필요 | S5 `market` 이전 |
| 인덱스 이름 드리프트 2건 | 별도 목적 | 다음 coach 마이그레이션 |
