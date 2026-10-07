# F009 슬라이스 8 체크리스트 — 성적 문구 4요소 (2026-10-07)

| 영역 | REQ | 체크리스트 | 상태 |
|---|---|---|---|
| 서버 | `SRV-REQ-039` | `salt-server/requirements/reports/checklists/SRV-REQ-039.md` | 완료 — `npm test` 605/0 · build · lint |
| DB | `DB-REQ-029` FR-25 | `salt-server/requirements/reports/checklists/DB-REQ-029.md` | 로컬 적용 |
| 예측 | `FC-REQ-019` | `salt-forecast/requirements/reports/checklists/FC-REQ-019.md` | 완료 — 실배치 3종 재실행 |
| BFF | `BFF-REQ-042` | `bff/requirements/reports/checklists/BFF-REQ-042.md` | 완료 — `npm test` 208/0 · build |
| 프론트 | `FE-REQ-045` | `salt-microFe/requirements/reports/checklists/FE-REQ-045.md` | 코드 완료 · 실스택 화면 확인(일부 route 주입) |

## validate — 돌린 것

| 영역 | 결과 |
|---|---|
| `salt-server` | `npm test` 605 / 0 · `npm run build` · `npm run lint` · `prisma migrate deploy`(로컬) · 스크래치 tsx 실 DB: 성적표 SQL 채점일 min/max · BTC 변동 범위 `claim`(1주 52주 중 7 · 2주 8) · CPI 반응(판정 58 중 4) · 쏠림 반응(판정 13 중 2) · 게이지 기준 쿼리 |
| `salt-forecast` | `ruff check` · `ruff format` · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 · 스키마 계약(`FORECAST_DATABASE_URL`) · `regate` 1168행 · `events` 390행 · `signals` 9531행 실행 |
| `bff` | `npm run build` · `npm test` 208 / 0(새 `performance-claim.viewmodel.test.ts` 4 · 목표 비중 2) |
| `salt-microFe` | `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` · web · web-tax `next build` |
| 화면 | Playwright 실스택(서버 4000 → BFF 4001 → 웹 3100, 로컬 소유자 계정 JWT) `/coach/report` · `/investments/BTC` 1280 · 360 — 가로 넘침 없음 · axe 새 줄 대비 위반 0. 로컬에서 막힌 판정 · 게이지만 route 로 `renderable` 주입 |

## 제품 공통 수용 기준 (`pr-convention.md` §6)

1. 3종 고지 — 게이트 무변경. 4요소 줄은 고지를 더할 뿐 여는 경로 0
2. 주문 실행 코드 0 — 새 외부 호출 없음
3. 금액 계산 서버 — 무관(비율 · 수만). 빗나간 수 · 기간도 서버(forecast) 값
4. 확신 · 목표가 · 명령형 0 — `performance_wording` 이 "AI 가 예측" · 합산 · 미실현 수익률을 더 막는다. 새 문구는 상태 설명

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 카드 4요소 줄 실데이터 | 로컬 사용자에 저장 추천이 없다(코드 · 타입 · 빌드만) | 다음 추천 생성 뒤 `/coach/report` 확인 |
| 판정 블록 · 게이지 줄 실데이터 | 로컬 판정 표본 < 20 · 게이지 구간 1개 — route 주입으로만 그렸다. 게이지 줄 잘라내기는 한 번 실패(텍스트는 확인) | 판정 표본 20 도달 · 심리 계산 재개 뒤 |
| 이전 forecast 행의 `not_recorded` | 열 추가 전 행은 `NULL` — 다음 배치가 채운다(로컬은 재실행으로 채움) | 운영 배포 뒤 첫 매일 배치 |
| `daily` 배치 경로의 게이트 새 열 | `regate` 로만 채웠다 — 같은 `gates()` 를 부르지만 매일 경로로는 안 돌렸다 | 다음 `daily.sh`(LaunchAgent) 실행 뒤 `forecast.gate.window_from` 확인 |
| 운영 DB 마이그레이션 | 로컬만 | 배포 시 |
| 요약 띠 판정 성적표 칸 | 비율 없는 링크 칸이라 줄을 붙이지 않음(판단) | 그 칸에 비율이 들어갈 때 |
| 기존 대비 위반(사건 카드 면책 3.03 · 상승/하락 색) | 이번 변경 밖 — 브랜드 색 결정 대기 | 대비 정리 REQ |
| 웹폰트 404(fonts.gstatic) | 이번 변경 밖 | 별도 |
