# F011 슬라이스 7f 체크리스트 — 월간 복기 국내판 (2026-10-26)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-040` FR-48 | 국내 복기 · 경로 · 배치. 테스트 776/776 · build · lint 0 · layer-check · Swagger(`failOnErrors`) | `salt-server/requirements/reports/checklists/SRV-REQ-040.md` §슬라이스 7f |
| `DB-REQ-031` FR-11 개정 | 마이그레이션 `20261026120000_monthly_review_asset_type` 로컬 적용 · 기존 코인 행 1건 `crypto` · `migrate diff` 에 이 테이블 차이 없음 | `salt-server/requirements/reports/checklists/DB-REQ-031.md` |
| `BFF-REQ-040` FR-26 | 경로 · `assetType` · `name`. 테스트 265/265 · build 0 | `bff/requirements/reports/checklists/BFF-REQ-040.md` §7f |
| `FE-REQ-041` FR-30 | 국내 복기 섹션 Playwright(소유자 실데이터 · 목 데이터 · 비소유자 섹션 없음) · 모노레포 check-types · lint · test · build · layer-check | `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §7f |
| 실 DB 쓰기 경로 | 임시 사용자에 국내 시험 거래 4건 → 판정 배치 → 국내 복기 저장 → 손계산 대조(보유 5.5거래일 · 기준 넘은 날 7 · 관찰 20거래일 · TWR −0.56% · Brier 기준가 8/31 → 결과 9/14) · 32ms → 사용자 삭제(5 → 5) | 서버 체크리스트 |
| 실경로 | 상시 서버 4000 새 코드 — 소유자 국내 200 `no_ledger` 107ms · 비소유자 404 `COACH_KR_STOCK_NOT_AVAILABLE` · 기존 코인 행 같은 `generatedAt` 으로 읽힘 | 서버 체크리스트 |
| 주인 REQ | `SRV-REQ-038` · `SRV-REQ-024` · `SRV-REQ-025` · `BFF-REQ-038` · `BFF-REQ-023` · `FE-REQ-039` · `FE-REQ-040` · `FE-REQ-027` · `FE-REQ-028` Changelog | 각 REQ |
| 공통 수용 기준(§6) | 숫자는 서버 · 문장 템플릿(LLM 없음) · 판정 · 지시 0 · 주문 경로 0 · 국내 숫자 소유자 전용 | — |
| 계약 | 서버 경로 신설 · 응답 `assetType` · `brier.recentMisses[].name` 추가만(기존 코인 경로 무변경). DDL 1건(롤백 가능). `.claude/rules` 무변경 | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~소유자 실거래로 본 국내 복기~~ | **닫힘 2026-10-26**(사용자 "확인 못한것 다 확인해") — 소유자 계정 시험 거래 8건(거래 폼 경로 BFF `POST /api/app/coach/trades`, 8 · 9월 · 그날 실제 종가 · 00:00 KST, 계획 2건) → 판정 배치(결과 4 · 계획 지킴 2) → BFF 국내 복기 9월 · 8월 저장(53 · 32ms) → 손계산 일치 → 거래 API 삭제 · 계획 2 · 시험 복기 2행 삭제 → 소유자 0/0/0/0/0(시작 전과 같음) | — |
| ~~월초 배치 실회차(두 자산군)~~ | **닫힘 2026-10-26** — 상시 서버 재시작 때 부팅 회차가 같은 함수를 돌았다: `{"users":5,"crypto.existing":1,"kr_stock.no_ledger":5,"crypto.no_ledger":4,"failed":0}`. 06:40 cron 트리거 자체는 기존 코드 그대로 | — |
| ~~IPS 이탈 자산군 합산~~ | **닫힘 2026-10-26**(사용자 "베스트 케이스로") — 합산으로 구현 · 실데이터 대조(아래 절) | — |
| ~~1024 · 800 폭 · axe~~ | **닫힘 2026-10-26** — 실데이터 1280 · 1024 · 800 가로 넘침 0 · 페이지 오류 0 · axe(wcag2a · 2aa · 21aa) 위반 0 · 달 고르기 9월 ↔ 8월 | — |
| 상시 서버가 브랜치 코드 | launchd 가 작업 트리를 돈다 | 머지(같은 코드) |
