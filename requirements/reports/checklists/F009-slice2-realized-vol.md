# F009 슬라이스 2 — 실현 변동성 — 체크리스트 (2026-09-24)

영역: `salt-forecast/requirements/reports/checklists/FC-REQ-006.md` · `salt-server/requirements/reports/checklists/DB-REQ-031.md` · `SRV-REQ-038.md`
채점 리포트: `salt-forecast/reports/realized-vol-2026-09-24.md`

| 확인 | 결과 |
|---|---|
| Python | `ruff` · `ruff format` · `pyright`(0) · `lint-imports`(3 kept) · `pytest` 전부(스키마 계약 포함, 실 DB) · `tests/leakage` 13건(변동성 미래 오염 · 재현 추가) |
| 작업 | `--dry-run --as-of 2026-06-30` 289종목 3.5초 · 실행 as_of 2026-09-24 289행 4.0초 · 재실행 289행 그대로 |
| 채점 | 통과 182 · 이력 부족 64 · 기준에 짐 43. EWMA 가 기준을 이긴 비율 80.9% |
| 마이그레이션 | `20260924170000` 로컬 적용 · 추가만 |
| 서버 | 리더 실 DB: BTC 0.4094 · ETH null · 없는 종목 null · `EXPLAIN` 0.027ms · `tsc` · `eslint` · `npm test` **410 / 0** |
| BFF · 프론트 | 계약 변경 없음 — 돌리지 않았다 |
| 공통 수용 기준 | 주문 경로 0 · 금액 없음(변동성은 비율) · 지시 문구 0 · 채점 안 된 값 노출 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `/api/coach/size-check` 응답의 변동성 타깃 실값 | 로컬 토큰 발급 불가(자동 모드) — 리더 메서드까지 실측 | 슬라이스 3 연동 · 로그인 QA |
| 매일 배치 실행 | 수동 실행만 — 서버 워커 매시 트리거로 돈다 | 머지 뒤 첫 `ops/daily.log` |
| GARCH 승격 | 26주 라이브 | `FC-REQ-006` FR-9 |
| ETH 등 43종목 값 없음 | 게이트대로 막음 | FR-9 또는 게이트 재결정 |
| DB 역할 분리 · 운영 적용 | 로컬 한 역할 · 운영 미접근 | 운영 배포 |
