# F010 슬라이스 5 — 목표 비중 안내 — 체크리스트 (2026-09-29)

영역: `salt-forecast/.../FC-REQ-012.md` · `salt-server/.../SRV-REQ-024.md` §13 · `DB-REQ-031.md` · `bff/.../BFF-REQ-041.md` · `salt-microFe/.../FE-REQ-042.md`

| 확인 | 결과 |
|---|---|
| 사전등록 | `766e08d`(결과 전) 이후 파일 무변경 · DB `target-weight@1` 1행 |
| 결과 | core σ 15%: CAGR +11.5% · MDD −36.0% · 상승 포착 0.33 · 덜 빠짐 ✓ · 타이밍 ✗ · 목표 근처 ✓. core_alts 전 목표 CAGR ≈ 0. 드라이런 as_of 2026-06-30 판정 같음 |
| 예측 | ruff · pyright 0 · lint-imports 3 kept · pytest 149 / 1 skipped · 누수 18 |
| 서버 | `npm test` 550 / 0 · build · lint · 마이그레이션 로컬 적용 · diff(이 컬럼) 0 · 실 DB 유스케이스 28ms |
| BFF | build · `npm test` 195 / 0 |
| 프론트 | check-types · lint · test · build(web · web-tax) · Playwright 1280 · 360 · 카드 axe 0 · 가로 넘침 0 · 번들 132 → 132 kB |
| 규칙 일치 | Python · 서버 고정 벡터 4 같음 · 서버 상수 = 리포트 표(테스트) |
| 계약 | 새 경로 서버 `GET /api/coach/target-weights` · BFF `GET /api/app/coach/target-weights` · 리스크 예산 PUT/GET `investableCapital` · core 타입 동시 · 포트 `SymbolRisk.ewma` 추가 |
| 공통 수용 기준 | ① 근거 · 과거 성적 · 실패 사례 3종 없으면 비중 미렌더(서버 `renderable` + BFF 게이트) ② 주문 경로 0(`orderExecution: false` 검사) ③ 금액 · 비중 · 수량 서버 계산 ④ 명령형 · 확신 · 목표가 0(grep) · 확률 미표시 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP · 실제 계정 화면 · 폼 저장 왕복 | 로컬 토큰 없음 | `QA-001` 로그인 QA(사용자) |
| 안내 라이브 채점 · 알트 몫 결론 | 등록 범위 밖 | `target-weight@2` |
| 확률 · 기대 R | 자격 없음 | 2026-11-23~ 새 표본 |
| 리포트 게이지 합산 · 홈 한 줄 | 카드 먼저 · 홈은 사용자 결정 | 다음 화면 슬라이스 |
| 운영 DB | 로컬만 | 배포 시 |
| 생존 편향 | 원천 없음 | 리서치 §10 슬라이스 7 |
