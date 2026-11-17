# SRV-REQ-041 — 국내 주요 사건 읽기 · 다가오는 국내 일정(1단계) 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| `npm run build` · `lint` | 통과 |
| `npm test` | **922 / 0** — 새: 국내 종류 · 지역 · 범위 / 코인엔 국내 일정 없음 / 모르는 종류 · 계약 위반 행 버림 / 사건 종목별 묶음 · 일정 줄(지난 것 · 미국 · 종목 사건 · 기간 밖 제외, KST 자정 경계) · 유스케이스(뷰 1회 · 503 그대로) |
| `test:layer-check` | 차단 10 · 통과 6 · 바꾼 · 새 `.ts` 16개 훅 사후 실행 exit 0(위반 대조 exit 2) |
| 실서버 4000 | 소유자: `/api/coach/events?symbol=005930` 7건(국내 4 · 미국 3, `region` · `scope`) · `?symbol=BTC` 미국 3건 / 비소유자: 일정 200 · 카드 404 / `days=36` 400 / 기본 14일 |
| 성능 | 일정 경로 10회 최대 11ms(예산 100ms, FR-6) |
| Swagger | `/api/coach/events` 응답 스키마 · `/api/market/kr/schedule` 신규(JSDoc — `build` 통과) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 예상 창 | 2단계 | `FC-REQ-021` 2단계 |
| Kotlin 이전 | 투자(`coach` · `market`) 동결 · S5 · S6 단계 | `SRV-REQ-049` |

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 변경: 변경 없음 — 일정 읽기 재사용(요약 응답 `schedule`)
- 검증: `build` · `lint` · `test` 936 / 0 · `test:layer-check` · Swagger 생성 · 실서버 4000 소유자 200
- 미검증 · 범위 밖: 없음

## 2026-11-10 — F018 걸침

  - `salt-server/src/market/application/GetKrMarketSchedule.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/presentation/krStock.controller.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

이 REQ 몫: **FR-1 · 4(정정 — `earnings` 블록) · FR-8~10 신규 구현** — 실적 공시 수집(2016~) · IR · 예고 본문 일정 · export 뷰

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
