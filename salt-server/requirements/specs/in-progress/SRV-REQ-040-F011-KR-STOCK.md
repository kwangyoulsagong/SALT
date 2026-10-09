---
id: SRV-REQ-040
feature: F011
area: server
kind: FUNC
title: "F011 국내 주식 — KIS 조회 연동 · 마스터 · 달력 · 일봉 · 현재가 · 실시간 체결 · /api/market/kr"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md
---

## Summary

국내 주식을 코인처럼 보려면 서버 DB 에 시세 · 일봉 · 5분봉이 먼저 쌓여야 한다. 슬라이스 0 · 1 은 그 재료를 만든다 —
한국투자증권(KIS) Open API 를 **조회 TR 만** 부르는 클라이언트, 종목 마스터 · 개장일 달력 · 일봉 2년 · 1분 현재가 · WS 실시간 체결 ·
5분봉 집계, 그리고 저장값만 읽는 `/api/market/kr/*`. 화면은 없다(BFF 슬라이스 2 · 화면 슬라이스 3).

사용자 요구(2026-10-07): "국내 주식도 실시간 워커", "국내 주식이랑 비트코인 다 같은 기능", "최적화까지 다 해서 성능 개선".

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `market/infrastructure/KisClient`(REST) · `KisRealtimeClient`(WS). 키는 `salt-server` env 만 | 완료(`ee38042` · `7689823`) |
| FR-2 | 접근 토큰 DB 캐시(`external_api_tokens`) · 만료 10분 전 갱신 · `EGW00133` 이면 살아 있는 토큰 재사용 · 재시작이 발급을 늘리지 않음 | 완료(`ee38042`) |
| FR-3 | 조회 TR 허용 목록(`FHKST01010100` · `FHKST03010100` · `FHKST03010200` · `CTCA0903R` · `H0STCNT0`). `U` 로 끝나는 TR · 계좌 · 체결통보 거부. 레포 전체 주문 · 계좌 TR 문자열 0건 테스트(`git grep`) | 완료 |
| FR-4 | 페이서 3건/s(`KIS_REQUESTS_PER_SECOND`, 실측 처리량 상한 약 2건/s — `89ff9d9`) · 동시 6 · `EGW00201` 만 재시도(업무 오류는 HTTP 500 이어도 재시도 안 함) · 초과 시 프로세스 감속 1→8초 | 완료 |
| FR-5 | axios 원본 오류(요청 헤더에 시크릿)를 밖으로 내보내지 않고 `KisApiError` 로 정제 · 토큰 · 키 · 승인키 마스킹 | 완료 |
| FR-6 | 키 없으면(빈 값 포함) 워커 미등록 · `/api/market/kr/*` 503 `KR_STOCK_DISABLED`(Shared Kernel `ErrorKind.Unavailable` 신설, `d6f9ce6`). 빈 값이 기동을 막던 것 수정(`89ff9d9`) | 완료 · 실측 |
| FR-10 | 종목 마스터 `.mst` 매일 07:30 KST · 4,400종목 배치 upsert · 사라진 종목 `delisted_at`. 반쪽 마스터(< 500)면 중단 | 완료 |
| FR-11 | 유니버스 = **보유 → 관심 → 주권 시총 상위 N**(`KIS_UNIVERSE_TOP_N`=50, 우선주 제외) — 보유는 `portfolio` 공개 API `heldSymbols("kr_stock")` 를 조립 지점이 넣는다(`KrHeldCodesSource`, `market` 이 `portfolio` 표를 읽지 않는다) | 완료(`422bc14`, 슬라이스 3b) |
| FR-12 | WS 41 슬롯 — 보유 → 관심 → 시총 순(슬라이스 3b). 나머지는 1분 폴링. 42번째는 `OPSP0008 MAX SUBSCRIBE OVER`(실측) → 구독에서 빼고 폴링 | 완료(`7689823`) |
| FR-13 | `GET /api/market/kr/search?q=` 마스터 전체 · 코드 접두 · 이름 부분 일치 · 시총 순 20건 | 완료 |
| FR-14 | 개장일 달력 — KIS 휴장일 조회 1순위, **이 키로 거부(EGW02004)** 라 일봉 역산(지난날) + 평일 09:10 당일 봉 관측(오늘). 미래는 `calendarKnown=false` | 부분(미래 휴장) |
| FR-20 | 일봉 수정주가 2년 백필(140일 페이지) · 평일 15:45 확정 · 마지막 저장일부터 다시 받아 미확정 봉 덮어씀 | 완료 |
| FR-21 | 5분봉 — 정규장 체결 5분 집계(15:30 종가 체결은 15:25 봉) · 1초 배치 · 재시작 병합 · 평일 15:40 · 20:40 KIS 일별 1분봉으로 오늘 덮어쓰기 + 지난 30일 빈 날 백필(회차 1,200 호출). 보관은 코인과 같은 30일(기획의 1년 → 정정) | 완료(`89ff9d9`) |
| FR-23 | 현재가 필드(상하한 · 기준가 · 시총 원 · 상태 · 경고 · PER/PBR/EPS/BPS · 52주 · 외국인 소진율) — 빈 값으로 덮지 않음 | 완료 |
| FR-24 | 실시간 체결(정규장 09:00~15:30 것만) → 현재가 1초 반영 · SSE `GET /api/market/kr/stream`(사용자 JWT + 소유자, `event: status` · `tick` · 15초 하트비트) | 완료 |
| FR-25 | WS 08:30~**16:00** KST 개장일만(시간외 단일가 16:00~18:00 은 시간외 값이 현재가를 덮어 뺐다 — FR-27 과 함께 슬라이스 6) · 백오프 1→60초 · 재접속 2회째부터 승인키 재발급 | 완료(`2eb3f85`) |
| FR-26 | 장 상태 KST(pre_open · regular · closing_auction · after_hours_close · after_hours_single · closed · holiday) · `lastCloseAt` · `nextOpenAt` · `calendarKnown` | 완료 |
| FR-29 | 당일 시가 · 고가 · 저가 — `kr_stock_quotes.open/high/low_price`(nullable). KIS 현재가 `stck_oprc` · `stck_hgpr` · `stck_lwpr`(0 은 null) · 실시간 `H0STCNT0` 7 · 8 · 9 필드(틱은 null 로 덮지 않음). 응답 `openPrice` · `highPrice` · `lowPrice` | 완료(`f136b6d`, 슬라이스 3 — 화면이 코인과 같은 5열) |
| FR-30 | `GET /api/market/kr/assets` `sort`(`""`·`all`·`trade_value`·`change`·`price`·`name`) · `order`(`asc`·`desc`) · `period`(`""`·`realtime`·`1d`·`7d`·`1m`·`3m`·`6m`·`1y`) — **코인과 같은 값**. 정렬은 offset/limit 전 유니버스 전체. `periodChange` = 현재가 / N거래일 전 일봉 종가 −1(1 · 5 · 21 · 63 · 126 · 250), 실시간은 `changeRate`(코인과 같음), 없으면 null · `change` 정렬은 null 마지막 | 완료(`f136b6d`) |
| FR-31 | 관심 종목 `assetType: kr_stock` — 소유자만 · 마스터에 있는 코드만(이름은 마스터), 비소유자 · 없는 코드 같은 404 · 중복 409. 목록 가격은 `kr_stock_quotes`, 비소유자 목록엔 국내 주식 행 없음. 업비트 구독 심볼(`distinctSymbols("crypto")`)엔 안 들어감 | 완료(`f136b6d`) |
| FR-32 | 로고(F011 FR-47) — **종목마다 출처를 판정해 저장**(`ResolveKrStockLogos`, 매일 07:50 · 부팅): logo.dev 후보 도메인(DART 홈페이지 — 키 있을 때만) → 티커 → 둘 다 흐리면 `none`(화면 이니셜). 선명도 = 경계에서 1px 안에 바뀌는 몫의 중앙값, 기준 0.6. 출처만 저장(`kr_stock_master.logo_source` 등, 마이그레이션 `20261008120000_kr_stock_logo_source`)하고 주소는 읽을 때 지금 키(`KR_LOGO_DEV_TOKEN`, `pk_` 만)로 만든다. 크기 128px. FMP 제외(LS ELECTRIC 에 건물 사진). 국내 증권 · 포털 앱 이미지 서버 금지 | 완료(`aa9b1c3` · `0022da5` · `58f0c33`) — 50종목 티커 43 · 없음 7. DART(`DART_API_KEY`)는 코드만 있고 사용자가 쓰지 않기로(2026-10-08) |
| FR-40~46(서버 몫) | 상태 배지 · 상하한 도달 · 지연(`stale` = 시세 시간대 3분 초과) · 호가 단위 — 서버 판정, 원 정수 | 완료 |
| FR-90 | 연속 5회 실패면 회차 중단 · 실패 종목은 이전 값 유지 | 완료 |
| FR-92 · 94 | `session.provider { status, since, lastSuccessAt, realtime }` · 10분 TR 별 호출/실패/초과 · 오늘 토큰 발급 로그(3회 초과 경고) | 완료(`89ff9d9`) |
| FR-93 | WS 30초 무응답 재접속 · 3회 실패 `degraded` → 폴링이 받음. 실패 횟수는 첫 메시지에서 비운다(접속만 받고 끊는 연결 버그 수정) | 완료 · 가짜 서버 테스트 |
| FR-33 | 거래 입력 `POST /api/portfolio/transactions` `assetType`(`crypto` · `kr_stock`, 기본 `crypto` — 기존 호출 무변경). 국내 주식은 소유자 · 마스터에 있는 6자리 코드만(`market` 공개 API `krStockListing` — 관심 종목 추가와 같은 404 · 503). 단가가 호가 단위 배수가 아니어도 받는다(F011 FR-42). 매도 보유 확인 · 재계산은 그 자산군. `DEFAULT_ASSET_TYPE` 상수 삭제(`SRV-REQ-006` 체크리스트 §6 의 "주식이 들어오면" 조건) | 완료(`422bc14`) |
| FR-34 | 국내 주식 보유 평가 — 서버가 가진 `kr_stock_quotes` 로 **읽어서** 평가(`KrStockQuoteSource` ACL). 기록 · 수정 · 삭제 직후 그 보유 · 시세 회차(`kr-quote-poll`) 뒤 전체(`RevalueKrStockHoldings`, 쿼리 3) · 부팅. 시세 없는 보유는 건드리지 않음(FR-90). BFF 업비트 반영(`/internal/update-prices`)은 `crypto` 만 | 완료(`422bc14`) |
| FR-35 | `GET /api/market/kr/assets?codes=`(쉼표 · 최대 100 · 형식 검증) — 보유 요약 이름 · 로고. 유니버스가 100을 넘으면 첫 페이지에 보유가 없을 수 있다 | 완료(`13cde7e`) |
| FR-36 | 장 밖에도 **시세가 한 번도 없는 유니버스 종목**은 현재가를 받는다(시간외 단일가 중 제외) — 밤에 처음 기록한 보유가 아침까지 평가 0 으로 남던 것(통합 확인에서 발견) | 완료(`2449834`) |
| FR-60 | 지표 갱신이 국내 주식 시세 유니버스도 돈다(m5 · h1 · d1). 5분봉이 정규장 체결만 저장돼 h1 도 정규장만 묶이고 일봉은 거래일 봉만 있다 — 거를 것이 없다. 유니버스 실패는 코인 지표를 막지 않는다 | 완료(`f5bf406`) — 로컬 49 · 49 · 50종목, 342종목 3.1초 |
| FR-61 | `signalType = kr_stock.<mode>.<action>`. 코인 행 그대로 · 접두 없음 = 코인. 성적 · 게이트 · 성적표가 그룹 키로 갈려 국내 주식 표본만 센다. 판단 원장(`judgment_ledger`, rule-ic@1)은 코인만 그대로 | 완료(`c4580b8`) |
| FR-62 | 종목별 일봉 ≥ 120 거래일 + 일봉 지표 전엔 `blockedReason: insufficient_history` + `history { ready, dailyBars, requiredDailyBars, dailyIndicator }`. ③ 표본 20 은 기존 `insufficient_sample`(국내 주식 그룹). 코치 상세 `excluded` = `insufficient_history` \| `symbol_judgment_only` + `progress`(`no_realtime_data` 삭제). 이력이 모자란 종목은 표본도 남기지 않는다 | 완료(`c4580b8`) |
| FR-63 | 장기만. 단타는 스냅샷 없음 · 화면 `mode_not_open` · 기본 모드 장기 | 완료(`c4580b8`) |
| FR-64 | 채점 = 만기일(판단 + 30일, KST 날짜) **이전 마지막 거래일 종가**(`closeAtOrBefore`). 16시 KST 전엔 채점 안 함, 평일인데 그날 봉이 없으면 사흘 기다린 뒤 직전 거래일(평일 휴장). 왕복 비용 env `KR_STOCK_ROUND_TRIP_FEE_RATE`(기본 0.0023) — 적중 경계 · 기저율(성적표 SQL `CASE`) · 사이즈 수수료(절반씩) | 완료(`c4580b8` · `f410c42`) |
| FR-65 | 성적표 그룹 `assetClass` — 국내 주식 그룹은 소유자에게만 | 완료(`c4580b8`) |
| FR-66 | 신선도를 거래일로 — 종가 확정(16시) 기준 마지막 장보다 1 거래일 넘게 밀리면 `stale_inputs`(기획의 `stale_data` → 기존 사유 재사용) | 완료(`c4580b8`) |
| FR-37 | 소유자 전용 — 종목 코치 404 `COACH_KR_STOCK_NOT_AVAILABLE` · 해설 `facts_unavailable` · 성적표 국내 주식 그룹 숨김(시세 경로와 같은 `FORECAST_OWNER_EMAILS`) | 완료(`c4580b8`) |
| FR-38 | 리스크 예산 · 사이즈 · 계획 연결에 국내 주식 — 보유 · 거래(365일)를 코인 + 국내 주식으로(미국 주식 제외), 예산 % 분모도 둘의 합. 계획은 국내 주식 거래에 연결된다. 행동 분석은 코인 그대로 | 완료(`f410c42`) |
| FR-39 | 전망 읽기에 국내 주식 — `PrismaForecastReader` 가 `KRW-X` 와 `X` 두 키를 묻고 걸린 행 키로 자산군을 안다(6글자 코인 때문에 코드 모양으로 추측 안 함). 국내 주식 일봉 `open_time`(거래일 00:00 KST) → 그날 00:00 UTC(+9h) · 범위 필터는 9시간 넓게 읽고 보정 뒤 가른다. `GetSymbolForecast` 보유는 카드 행의 자산군으로. 효과: 사이즈 변동성 타깃 · 리스크 예산 · 익절 계획이 국내 주식 σ · 일봉을 받는다 | 완료(`e6b9983`, 슬라이스 5b). **국내 주식 변동 범위 화면은 열지 않는다** — 실력 검증 전(FC-REQ-020) |
| FR-40 | 전 종목 일봉 — 상장 보통주(`ST` · 우선주 제외 약 2,450) 일봉을 시세 유니버스와 따로 받는다. 1회 백필 2년(필요 시 5년) · 매 거래일 장 마감 뒤 증분 1호출/종목. 모의 키 약 2건/s → 밤 · 휴장일 실행, 시세 폴링 · 실시간을 굶기지 않는다(시간대 분리). 휴장일은 `market_holidays` 로 건너뛴다. 정규장(`J`)만 | Draft — `FC-REQ-020` FR-7 |
| FR-41 | 상장폐지 이력(오프라인 평가 전용) — 폐지 목록 · 폐지 전 종가 · 사유 · 승계 코드를 별도 표에. **화면 · API · BFF 경로 없음**(원천 약관). 원천 · 이용 조건 확인이 착수 조건 | Draft — `FC-REQ-020` FR-8 · DB-REQ 짝 |
| FR-42 | 수정주가 재작성 — 기업 행사(배당락 · 증자 · 감자 · 분할) 뒤 겹치는 구간 종가 비율이 다르면 그 종목 창을 다시 받는다 | Draft — `FC-REQ-020` FR-10 |
| FR-43 | 코치 판단 국내 파라미터 — 추세 · 모멘텀 규칙은 국내 채점 풀 재검증 전 렌더 금지(국내 개별 종목은 반전 우세), 평가 지평 ≥ 20거래일 | Draft — 리서치 권고 17 |
| FR-44 | 비용 — 연도별 거래세 표(2025 이전 · 2026~ 0.20%) + 수수료, 명시 왕복 0.207~0.237%. 암묵 비용은 "가정" 파라미터. 세금은 "세전" 명시 | Draft — 권고 18 |
| FR-45 | 사이즈 · 1회 최대 손실 — 손절 체결 가정 손실 · 일 −30% 갭 손실 · 과거 최악 갭 분위수를 나란히(VI · 정지 · 연속 하한가 때 손절 미체결 가능 문구) | Draft — 권고 19 |
| FR-46 | 코인 + 국내 주식 위험 합산 — 상관 1 상한과 최근 실현 상관 두 값을 범위로, 코인을 KRX 종가 시각에 정렬 · 365/252 환산 | Draft — 권고 20(근거 약) |
| FR-47 | 행동 미러 국내 — 거래일 창, 순위 회전율 → 처분효과 → 추격 매수(40거래일) → 복권형 비중 | Draft — 권고 22 |

## 계약

- 새 경로 `/api/market/kr/{session, assets, search, stream, :code, :code/chart}` — 전부 인증 · 소유자 전용, 비소유자 404 하나(존재도 알리지 않는다)
- 기존 응답 무변경. `MarketAsset` · 코인 경로 무변경(시세를 `kr_stock_quotes` 에 따로 둔 이유 — `DB-REQ-033`)
- `ErrorKind.Unavailable`(503) — Shared Kernel 값 추가. 기존 값 매핑 무변경
- BFF 짝 `BFF-REQ-040`(슬라이스 2) — 아직 소비처 없음
- 슬라이스 3b(2026-10-08): 거래 입력 `assetType`(선택 · 기본 crypto) · `assets?codes=` 추가. 기존 응답 무변경. 소비처 `BFF-REQ-040` FR-15 · 16. 마이그레이션 없음
- 슬라이스 3(2026-10-08): `assets` 쿼리 3개 · 시세 행 `openPrice` · `highPrice` · `lowPrice` · `periodChange` 추가(기존 필드 무변경) · 관심 종목 DTO `assetType` 에 `kr_stock`. 마이그레이션 `20261008100000_kr_stock_quote_ohlc`(`DB-REQ-033`). 소비처 `BFF-REQ-040` FR-11~13 · `FE-REQ-041`

## 기획 정정

| 기획 | 정정 | 이유 |
|---|---|---|
| `MarketAsset` 확장 | `kr_stock_quotes` 별도 표 | 코인 경로가 자산군을 안 거른다(상폐 처리가 6시간마다 국내 주식을 끔 · 업비트에 6자리 코드 · 비소유자 시장표 노출) |
| SSE 내부 토큰 | 사용자 JWT + 소유자 판정 | 기존 SSE 와 같은 방식 · 새 비밀값 없음. 소유자 전용이라 BFF 가 소유자 연결에 붙어 받으면 된다 |
| 휴장일 = KIS 조회 | 일봉 역산 + 오늘 관측 + KIS 시도 | 이 앱 키로 `CTCA0903R` 가 `EGW02004` |
| 5분봉 1년 백필 | 30일 | 5분봉 정리가 자산군 구분 없이 30일을 지운다 — 코인과 같은 보관 |
| 유니버스에 보유 | 슬라이스 3b | `kr_stock` 보유 행이 생길 수 없었다(입력 DTO 미지원) — 3b 에서 입력과 함께 |
| 보유 평가는 BFF 가 밀어 넣는다(코인과 같게) | 서버가 저장 시세로 읽어서 평가 | 국내 주식 시세는 서버가 이미 갖는다 — BFF 를 거쳐 되돌려 받을 이유가 없다 |

- 슬라이스 4(2026-10-08): **BREAKING(응답)** — 코치 상세 `excluded[].reasonCode` `no_realtime_data` 삭제 → `insufficient_history` · `symbol_judgment_only` + `progress` / 판단 `blockedReason` 에 `mode_not_open` · `insufficient_history`, `modes.*` 에 `assetClass` · `history` / 성적표 그룹 `assetClass` / 상세 `assetType` 에 `kr_stock`. 새 env `KR_STOCK_ROUND_TRIP_FEE_RATE`. 마이그레이션 없음(`signal_type` 문자열 접두). 소비처 `BFF-REQ-040` FR-17~19 · `FE-REQ-041` FR-19~22

## 하지 않는 것

주문 · 계좌 · 잔고 · 체결통보 TR. 미국 주식. 호가 · 투자자별 · 시간외 단일가(슬라이스 6).

## Changelog

- 2026-10-08: 슬라이스 4 — FR-60~66 · 37 · 38(코치 판단 · 채점 · 성적표 자산군 분리 · 리스크 예산 · 사이즈 · 계획 연결). 테스트 706/706. 로컬 DB 실측: 지표 · 종목 코치(삼성전자 `kr_stock.long_term.wait` · 단타 `mode_not_open` · 비소유자 404) · 토요일 만기 → 금요일 종가 · 코인 성적표 숫자 무변경. 기획 정정 3: `stale_data` → 기존 `stale_inputs` · 표본은 관심 · 보유가 아니라 시세 유니버스 · 해설도 같은 막음(구멍이었다)

- 2026-10-07: 초판 · 슬라이스 0 · 1(FR-1~27 · 40~46 · 90~94)
- 2026-10-08: FR-32 — 로고 주소를 서버가 정한다(`aa9b1c3`, 사용자 "베스트 케이스로"). 테스트 648/648(로고 2 · 관심 kr 로고 기대값 갱신)
- 2026-10-08: FR-29~31 — 화면을 코인과 같게(사용자 "똑같은 화면이고 데이터만 다른거지"): 당일 시가/고가/저가 · 정렬/순서/기간 · 관심 종목 `kr_stock`(`f136b6d`). 휴장일 TR 거부 문구가 "실전투자 도메인은 모의투자 앱키로 호출하실 수 없습니다"로 확인 — **앱 키는 모의투자용**(슬라이스 1 의 추정이 사실)
- 2026-10-08: FR-32 로고 크기 64 → 128px — 사용자 "화질 구린것도 있네". 64px 원본이 40px 미리보기 아이콘(레티나 80px)에서 흐렸다. 128 은 실제 고해상도 원본(파일 2.5~3배, 업스케일 아님). logo.dev 키 적용 후 유니버스 51/51 응답
- 2026-10-08: FR-32 판정형으로 개정 — 사용자 "lg 전자 ls electronic은 여전히 흐려". logo.dev 티커 원본이 작은 종목(16~32px 를 키운 것)이 있다. 51종목 실측: 흐린 7 = 선명도 0.27~0.44, 선명 44 = 0.70 이상(사이 빔) → 기준 0.6. 단순 축소 · 복원 오차는 효성중공업 "H" 오탐으로 버림. 받다가 실패하면 판정 미룸(일시 장애가 30일 동안 로고를 지우지 않게). FMP 제외. DART 도메인 조회(LG전자 `lg.com` 은 선명 확인)는 사용자가 하지 않기로 — 키 없으면 건너뛴다. 테스트 661/661(선명도 · PNG 디코더 · 판정 4). `58f0c33`
- 2026-10-08: 슬라이스 3b — FR-11 보유 · FR-33~36(거래 입력 국내 주식 · 저장 시세 평가 · `codes` 필터 · 시세 없는 종목 채우기). 테스트 676/676. 실제 유스케이스 · 로컬 DB 통합 확인 9단계(소유자 매수 → 평가 3×266,250 = 798,750 · 비소유자 · 없는 코드 · 형식 404 · 유니버스 첫 순위 · 초과 매도 · `codes` · 요약 · 정리 0건)
- 2026-10-09: FR-39 — 슬라이스 5b 전망 읽기(`e6b9983`). 테스트 712/712 · tsc · lint · build · 실 DB 리더 확인(005930 카드 4 · 거래일 날짜 · 일봉 10-06~08 · σ 0.578 · `PUNDIX` 코인 그대로) · BFF 경유 소유자 200 / 비소유자 404. 마이그레이션 `20261009100000_forecast_daily_close_kr_stock`(DB-REQ-029)
- 2026-10-09: FR-40~47 Draft — 국내 주식 정확도 리서치(`requirements/reports/research/reports/국내 주식 코치 전망 설계.md`) 권고를 서버 몫으로. 다음 세션 착수
