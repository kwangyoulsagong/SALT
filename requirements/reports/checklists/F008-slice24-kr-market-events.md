# F008 슬라이스 24 1단계 — 국내 증시 일정 — 검증

범위: `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`. 영역: `salt-forecast/.../FC-REQ-021.md` · `salt-server/.../DB-REQ-034.md` · `SRV-REQ-041.md` ·
`bff/.../BFF-REQ-043.md` · `salt-microFe/.../FE-REQ-046.md` · 파일만 걸침 각 REQ §F008 슬라이스 24 국내 증시 일정

## 코드 검증

| 항목 | 결과 |
|---|---|
| 예측 | `ruff` · `pyright` 0 · `lint-imports` 3/0 · `pytest` 전체 통과 · 누수 36 · 스키마 계약(실 DB) |
| DB | 로컬 적용 · 전 스냅샷 · 원장 3종 행 수 동일 · `EXPLAIN` 0.10 / 0.19ms |
| 서버 | `build` · `lint` · `test` **922 / 0** · `test:layer-check` · 훅 사후 실행 16파일 exit 0 |
| BFF | `build` · `test` **309 / 0** |
| 프론트 | `check-types` · `lint` · `test`(core 55 · ui 43) · `test:layer-check` · 훅 사후 실행 · `web` 빌드(154 · 137 kB 그대로) · `web-tax` 빌드 |

## 실데이터 · 실화면

| 항목 | 결과 |
|---|---|
| 일정 수집(실 소스) | 금통위 48 · 소비자물가 72 · 수출입 75 · 동시만기 24 — 게시판 수정일 1건 거름 |
| 반응 통계 | 31종목 + KR-EW · 렌더 가능 636 — 005930 금통위 1일 SQL 독립 재계산과 소수점까지 같음 |
| 서버 · BFF 실스택 | 소유자: 일정 200 · 국내 카드 7건(국내 4 · 미국 3) · BTC 미국 3건 / 비소유자: 일정 200 · 카드 404 / `days=36` 400 / 일정 경로 최대 11ms |
| 실화면 3000 | 소유자 국내 탭 일정 줄 · 국내 상세 카드(지역 표시 · 빗나간 때 · 면책) / 비소유자 국내 탭 0 · 카드 0 / 일정 0건 · unavailable → 줄 0. 실화면에서 겹친 문구 · 명조 글꼴 · 날짜 띄어쓰기 고침 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 2단계(실적 공시 · 예상 창 — `FC-REQ-021` FR-11~15 · `DB-REQ-034` FR-4 · 5 · `SRV-REQ-041` FR-4 · `BFF-REQ-043` FR-2 창 · `FE-REQ-046` FR-3) | DART 공시 수집이 먼저 | `FC-REQ-026` 뒤 |
| 비소유자 화면의 일정 줄 | 국내 탭이 소유자에게만 보인다(F011 정책) | 국내 시세 공개 결정 시 |
| ~~위 지수 타일 명조 글꼴~~ | 고침 2026-11-02(사용자 "남은것 ㄱㄱ") — `KrIndexSummary` 띠에 본문 글꼴 지정, 실화면 계산값 `Inter, "Noto Sans KR"` 확인 | 닫힘 |
| DB 롤백 SQL 실행 | 로컬 DB 가 상시 서비스 DB — 스냅샷으로 대신 | 운영 배포 리허설(`OPS-001`) |
| 앱(RN) | 모바일 화면 없음 | F007 |


## 2단계 — 종목 실적 공시 · 예상 창 (2026-11-17, `feat/f008-slice24-s2-earnings-window`)

| 항목 | 결과 |
|---|---|
| 예측 | `ruff` · `format` · `pyright` 0 · `lint-imports` 3/0 · `pytest` 전체 · 누수 전체(새 무작위 as-of 300회) · `tests/store` 실DB(스키마 계약) |
| 예측 실행 | `events --skip-ingest` 34,290행 4.6초 · 두 번 같은 행 수 · 과거 as_of 2026-06-30 dry-run. 사건 1,108 · 확정 일정 104 · 창 27(렌더 24, `not_judged` 3) |
| DB | 마이그레이션 셋(추가만) 로컬 적용 · `EXPLAIN` 새 쿼리 다섯 0.4~4.9ms |
| 서버 | `build` · `lint` · `test` **1730 / 0** · `test:layer-check` |
| BFF | `build` · `test` **514 / 0** |
| 프론트 | `check-types` · `lint` 13/13 · `test`(core 298) · 운영 빌드 zone 다섯 5/5(worktree — 상세 153 kB 그대로) |
| 실데이터 | DART 실호출 51종목 — 실적 5,245 · IR 4,006 · 예고 586 · 최근 1년 IR · 예고 본문 561 전부 읽음. 응답은 실DB 로 `GetSymbolEvents` 프로세스 안(1~24ms) → BFF 뷰모델 |
| 실화면 | Playwright(설치된 Chrome) 국내 상세 1440 · 390 앱 웹뷰 — 실데이터 응답 + `route` 상태 일곱, pageerror 0 · 넘침 0 |
| 첫 판 결함(done 전 고침) | DART 디코딩(UTF-8 을 EUC-KR 로) · 월간 공시 · 건수 규칙 삼성 오판 · IR 내용 칸 거짓 양성 · CHECK 두 번(`--skip-ingest` FK · `announced_at <= event_at`) · 390 이름 칸 사라짐 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실토큰 응답 · 실로그인 화면 | 로컬 옛 HS 창이 닫혀 소유자 토큰을 만들 수 없고 서명 키 읽기는 권한 거부 — 같은 유스케이스를 실DB 로 · 화면은 사건 응답만 route | `QA-001` |
| DART 본문 다시 받기 실회차 | 서버 · 뉴스 워커가 새 코드로 같이 재기동해야 | 머지 · `ops/salt.sh restart server news` 뒤 하루 |
| 공시 뒤 반응 표본 | 국내 일봉 5년 백필 진행 중 — 2년치 종목은 `insufficient_sample` | 백필 끝(`SRV-REQ-040` FR-40) |
| 매시 예측 배치 | 실행 트리는 머지된 main | 머지 뒤(`OPS-005`) |
