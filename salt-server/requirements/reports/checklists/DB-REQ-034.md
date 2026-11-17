# DB-REQ-034 — forecast 주요 사건 스키마(1단계) 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| 마이그레이션 | `20261102140000_forecast_kr_market_events` — `prisma migrate deploy` 로컬 적용 |
| 적용 전 스냅샷 | `scheduled_event` · `event_reaction` `pg_dump -Fc`(17KB, 세션 스크래치) |
| 행 보존 | 일정 198 · 반응 185 그대로 / 원장 3종(거래 2 · 보유 2 · 시세 3,970,678) 그대로 |
| 계약 | 예측 `test_schema_contract.py` 실 DB 통과 · 서버 `PrismaForecastReader.eventCards` · `PrismaMarketScheduleReader` 실서버 200 |
| 실행계획 | `v_upcoming_event` 0.10ms(Seq Scan — 행 수백, FR-6 그대로) · `v_event_card` 한 종목 0.19ms(`event_reaction_stats_latest` Bitmap Index) |
| 롤백 | SQL 머리 주석에 순서. 1단계엔 `symbol <> ''` 행 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 · FR-5(실적 종류 · 예상 창 표) | 2단계 | `FC-REQ-021` 2단계 |
| 롤백 SQL 실행 | 로컬 DB 가 상시 서버 · 예측의 DB 라 되돌리면 방금 쌓은 국내 일정이 지워진다 — 스냅샷으로 대신 | 운영 배포 전 리허설(`OPS-001`) |


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

이 REQ 몫: **FR-4 · 5 · 8 구현** — `kind` 둘 · `kr_earnings_window`(3종 · 확정 일정 열 확대) · `v_kr_earnings_reaction`(신규). 추가만

| 항목 | 상태 | 근거 |
|---|---|---|
| 빌드 · 린트 · 레이어 | 충족 | `npm run build` 0 · `npm run lint` 0 · `npm run test:layer-check` 차단 10 · 통과 6 |
| 단위 시험 | 충족 | `npm test` 1730/1730 — 새 시험 `dartEarnings`(실제 원문 픽스처 9건 · 분류 경계 표 19 · 결산 이름 8) · `collectDartEarnings` 6 · `refetchDartBodies` 2 · `dartDecode` 2 · `earningsOutlook` 11 · `macroEvents` 경계 |
| 마이그레이션 | 충족 | `20261117120000` · `120100` · `120200` 로컬 적용 — 추가만(표 · 뷰 · CHECK 넓히기 · 열 하나) |
| 실데이터 수집 | 충족 | DART 실호출: 유니버스 51종목 2016~ 실적 공시 5,245 · IR 4,006 · 예고 586 · 최근 1년 IR · 예고 본문 561건 전부 읽음(실패 0) — 실적 IR 174 · 결산 기간 158 |
| 분류 표본 눈 확인 | 충족 | IR 12건 무작위 — 첫 판 거짓 양성 2(기아 CLSA · 신한 MS: 내용 칸만 실적) → '개최목적' 칸만 · 결산 기간으로 고침 |
| EXPLAIN | 충족 | 새 쿼리 다섯 0.4~4.9ms — 대기 본문 부분 인덱스 · 종목 날짜 인덱스 · `event_reaction_stats_latest` |
| 응답(실DB · 프로세스 안) | 충족 | `GetSymbolEvents` 실DB 005930 · 000660 · 000270 · 035420 · BTC — 창 · 적중 · 빗나간 결산 · 반응 게이트, 코인 `null`, 1~24ms |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실토큰 응답(서버 · BFF 경로) | 로컬 옛 HS 창이 닫혀(11-16) 소유자 토큰을 만들 수 없다 — 서명 키 읽기는 권한 거부. 같은 유스케이스 · 리더 · 정책을 실DB 로 프로세스 안에서 돌렸다 | 사용자 로그인 화면 QA(`QA-001`) |
| DART 본문 다시 받기 실회차 | 서버 · 뉴스 워커가 새 코드로 같이 재기동해야 한다(옛 서버 추출은 옛 사실을 안 지운다) | 머지 · `ops/salt.sh restart server news` 뒤 첫 회차 — 634건 · 하루 안 |
