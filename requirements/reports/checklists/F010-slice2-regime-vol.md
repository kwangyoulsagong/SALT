# F010 슬라이스 2 — 국면 · 변동성 — 체크리스트 (2026-09-29)

영역: `salt-forecast/requirements/reports/checklists/FC-REQ-010.md` · `salt-server/requirements/reports/checklists/SRV-REQ-024.md` §12 · `SRV-REQ-025.md` §F010 슬라이스 2 · `SRV-REQ-038.md` §F010 슬라이스 2 · `DB-REQ-029.md` §F010 슬라이스 2

| 확인 | 결과 |
|---|---|
| 사전등록 | `b9cc8d0`(결과 전) 이후 파일 무변경 · DB `regime-gate@1` 1행. 첫 실행은 결과 계산 전 안전장치에서 멈춤 → `472f50c` |
| 1차 판정 | 게이트 채택 없음(`both` BTC ΔMDD CI [+1.4%, +48.7%] · 상승 포착 0.47) · 이벤트일 σ 비율 1.09 [0.86, 1.32] → 계수 1. 리포트 `salt-forecast/reports/regime-gate-regime-gate-1-2026-09-29.md` |
| 예측 검증 | ruff · format · pyright 0 · lint-imports 3 kept · pytest 117 passed(DB 포함) · 누수 15 · 스키마 계약 · 드라이런 as_of 2026-06-30 둘 · 백테스트 168초 |
| 서버 검증 | `npm test` **528 / 0**(+14) · `tsc` · eslint · `npm run build` · 레이어 훅(바뀐 25파일) |
| 실 DB | 국면 1행 · 베타 271/290 · 서버 리더 두 쿼리 EXPLAIN 1.43ms · 0.11ms · XRP σ 계획 가격 · ETH 변동성 막힘 → 고정 |
| 계약 | 서버 응답 필드 추가만(`basis` · `gauges.btcBeta` · `market` · `lossAsymmetry`). BFF 무변경 — 스키마 검증 없이 매핑(코드 확인). 익절 **가격 값은 바뀐다** |
| 공통 수용 기준 | 주문 경로 0 · 거래소 키 0 · 금액 서버 · 명령형 · 확신 문구 0(새 문장 없음) · 게이트가 아무것도 막지 않음 · 3종 게이트 무변화 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 화면 표시(σ 근거 · 베타 합 · 국면 · 손실 비대칭) | BFF · 프론트 밖 | 슬라이스 3 |
| 인증된 HTTP 실측 | 로컬 토큰 발급 불가 — 유스케이스 · 리더 직접 호출 | 로그인 QA(사용자) |
| 원장 국면 재료 실제 행 | 다음 UTC 날 워커 발행 | 2026-09-30 |
| 실데이터 손실 비대칭 | 로컬 결정 결과 0건 | 청산 있는 계정 QA |
| `regime-gate@2` | 판정 밖 조정 금지 | 원장 국면 재료 축적 뒤 |
| 생존 편향 | 원천 없음 | 리서치 §10 슬라이스 7 |
| 운영 DB 마이그레이션 · 매일 작업 | 로컬만 | 배포 시 |
